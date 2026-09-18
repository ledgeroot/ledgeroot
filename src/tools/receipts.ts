import { z } from "zod";
import type { LedgerootServices } from "../context.js";
import type { PublicKey, Receipt } from "../types.js";
import { epochRoot } from "../anchor/anchorer.js";
import { DEFAULT_RPC_URL } from "../chains.js";
import { getSigningKey } from "../env.js";
import { jwksOf, publicKeyOf } from "../receipt/signing.js";
import { checkSettlements, createSettlementReader } from "../verify/onchain.js";
import { classify, verifyAnchor, verifyReceiptChain } from "../verify/verifier.js";

export const receiptListInput = {
  mandateId: z.string().optional(),
  status: z.enum(["paid", "denied"]).optional(),
  endpoint: z.string().optional(),
};
export const receiptListInputSchema = z.object(receiptListInput);

export const receiptGetInput = {
  id: z.string(),
};
export const receiptGetInputSchema = z.object(receiptGetInput);

export const verifyInput = {
  checkChain: z
    .boolean()
    .optional()
    .describe("Also confirm each paid receipt's settlement against the chain (requires RPC access)"),
};
export const verifyInputSchema = z.object(verifyInput);

export type ReceiptListInput = z.infer<typeof receiptListInputSchema>;
export type ReceiptGetInput = z.infer<typeof receiptGetInputSchema>;
export type VerifyInput = z.infer<typeof verifyInputSchema>;

export function listReceipts(services: LedgerootServices, input: ReceiptListInput) {
  return { receipts: services.store.listReceipts(input) };
}

export function getReceipt(services: LedgerootServices, input: ReceiptGetInput) {
  const receipt = services.store.getReceipt(input.id);
  if (!receipt) return { found: false, id: input.id };
  return { found: true, receipt };
}

/**
 * The public identities this machine can check receipts against. The local
 * verifier trusts the key it signs with; a third party gets the same keys in
 * the exported bundle.
 */
export function issuerKeys(): PublicKey[] {
  const key = getSigningKey();
  return key ? [publicKeyOf(key)] : [];
}

/** The JWKS a third party needs to verify this operator's receipts offline. */
export function keySet(): { keys: Array<Record<string, string>> } {
  const key = getSigningKey();
  return key ? jwksOf(key) : { keys: [] };
}

/**
 * Verify the whole ledger: the receipt chain, plus the anchor it commits to
 * when one exists. The anchor is checked against the epoch it actually covers
 * rather than the whole ledger, so receipts appended afterwards do not read as
 * a mismatch. The overall status is the worst of the two.
 */
function verifyLedger(services: LedgerootServices, receipts: Receipt[]) {
  const anchor = services.store.latestAnchor();
  const anchorResult = anchor
    ? verifyAnchor(receipts, anchor.root, anchor.receiptCount)
    : null;
  const issues = [
    ...verifyReceiptChain(receipts, issuerKeys()).issues,
    ...(anchorResult?.issues ?? []),
  ];
  return { anchor, anchorResult, status: classify(issues), issues };
}

export function verify(services: LedgerootServices) {
  const receipts = services.store.listReceipts();
  const { anchor, anchorResult, status, issues } = verifyLedger(services, receipts);
  return {
    status,
    issues,
    receiptCount: receipts.length,
    anchor: anchor
      ? {
          epoch: anchor.epoch,
          root: anchor.root,
          txHash: anchor.txHash,
          receiptCount: anchor.receiptCount,
          status: anchorResult?.status,
          issues: anchorResult?.issues ?? [],
        }
      : null,
  };
}

/**
 * Verify the ledger offline, then confirm each paid receipt's settlement
 * against an EVM node. The chain pass is opt-in: the offline verification is
 * the guarantee, and it must keep working with no network at all.
 */
export async function verifyOnChain(services: LedgerootServices, rpcUrl?: string) {
  const offline = verify(services);
  const chainIssues = await checkSettlements(
    services.store.listReceipts(),
    createSettlementReader(rpcUrl ?? process.env.LEDGEROOT_RPC_URL ?? DEFAULT_RPC_URL),
  );
  const issues = [...offline.issues, ...chainIssues];
  return { ...offline, status: classify(issues), issues };
}

export async function anchor(services: LedgerootServices) {
  if (!services.anchorer) {
    return { anchored: false, reason: "no anchorer configured (set LEDGEROOT_ANCHOR_ADDRESS)" };
  }
  if (!services.anchorer.enabled) {
    return { anchored: false, reason: "anchoring disabled (LEDGEROOT_PRIVATE_KEY not set)" };
  }
  const receipts = services.store.listReceipts();
  const root = epochRoot(receipts);

  // The epoch comes from the contract, which owns the sequence. Read it before
  // the write so an unreachable chain fails here instead of after gas is spent,
  // then read it again afterwards and keep the contract's own answer — the
  // pending value is only a fallback for that second read failing.
  const before = await services.anchorer.currentEpoch();
  const txHash = await services.anchorer.anchor(root);
  const epoch = await services.anchorer.currentEpoch().catch(() => before + 1);

  services.store.recordAnchor(epoch, root, txHash, receipts.length);
  return { anchored: true, epoch, root, txHash, receiptCount: receipts.length };
}

export function exportEvidence(services: LedgerootServices) {
  const receipts = services.store.listReceipts();
  const root = epochRoot(receipts);
  const anchor = services.store.latestAnchor();
  const { status, issues } = verifyLedger(services, receipts);
  return {
    bundle: {
      schema: "ledgeroot.evidence.v1",
      exportedAt: new Date().toISOString(),
      root,
      anchor,
      // Carried so a third party can check attribution with no call home.
      keys: issuerKeys(),
      receipts,
      verification: { status, issues },
    },
  };
}
