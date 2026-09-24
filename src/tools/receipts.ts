import { z } from "zod";
import type { LedgerootServices } from "../context.js";
import type { PublicKey, Receipt } from "../types.js";
import { epochRoot } from "../anchor/anchorer.js";
import { merkleProof } from "../anchor/merkle.js";
import { defaultRpcUrls } from "../chains.js";
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
export async function verifyOnChain(
  services: LedgerootServices,
  rpcUrls: Record<number, string> = defaultRpcUrls(),
) {
  const offline = verify(services);
  const chainIssues = await checkSettlements(
    services.store.listReceipts(),
    createSettlementReader(rpcUrls),
  );
  const issues = [...offline.issues, ...chainIssues];
  return { ...offline, status: classify(issues), issues };
}

export const anchorInput = {
  minNewReceipts: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe(
      "Anchor only when at least this many receipts arrived since the last anchor (default 1). A ledger with nothing new is never re-anchored.",
    ),
  force: z
    .boolean()
    .optional()
    .describe(
      "Anchor even when the ledger has not moved — for re-anchoring onto a new contract, where the local record still names the old one.",
    ),
};
export const anchorInputSchema = z.object(anchorInput);

export type AnchorInput = z.infer<typeof anchorInputSchema>;

/** What an anchor attempt did — or why it did nothing. */
export interface AnchorOutcome {
  anchored: boolean;
  /** The epoch the contract assigned; only set when an anchor was submitted. */
  epoch?: number;
  root?: string;
  txHash?: string;
  /** Receipts the root covers, or the ledger holds when nothing was submitted. */
  receiptCount?: number;
  /** Receipts appended since the last anchor. */
  newReceipts?: number;
  /** Why nothing was submitted, when `anchored` is false. */
  reason?: string;
}

/**
 * Submit the epoch root — unless the ledger has not moved.
 *
 * `minNewReceipts` defaults to 1, so a ledger with nothing new is left alone.
 * Re-submitting an unchanged root would mint an epoch the contract did not need,
 * pay gas for it, and leave the local anchor record and the chain's `latestRoot`
 * describing two different "latest" anchors.
 */
export async function anchor(
  services: LedgerootServices,
  input: AnchorInput = {},
): Promise<AnchorOutcome> {
  if (!services.anchorer) {
    return { anchored: false, reason: "no anchorer configured (set LEDGEROOT_ANCHOR_ADDRESS)" };
  }
  if (!services.anchorer.enabled) {
    return {
      anchored: false,
      reason: "anchoring disabled (set LEDGEROOT_PRIVATE_KEY or LEDGEROOT_ANCHOR_KEY)",
    };
  }

  const receipts = services.store.listReceipts();
  const last = services.store.latestAnchor();
  // An anchor predating the receipt boundary cannot say what it covered, so its
  // count reads as zero: a redundant anchor is the cheap mistake, a skipped one
  // is the expensive one.
  const alreadyCovered = last?.receiptCount ?? 0;
  const newReceipts = receipts.length - alreadyCovered;
  const minNewReceipts = input.minNewReceipts ?? 1;

  // Skipping is the point of the check, but a contract change makes the local
  // record stale rather than current: the receipts are unchanged and the root is
  // the same, yet the contract now configured holds nothing. `force` re-anchors
  // that state without inventing a payment to move the counter.
  if (!input.force && newReceipts < minNewReceipts) {
    return {
      anchored: false,
      receiptCount: receipts.length,
      newReceipts,
      reason:
        newReceipts === 0
          ? last
            ? `no receipts since epoch ${last.epoch}; nothing to anchor`
            : "no receipts to anchor"
          : `only ${newReceipts} new receipt(s) since the last anchor; minimum is ${minNewReceipts}`,
    };
  }

  const root = epochRoot(receipts);

  // The epoch comes from the contract, which owns the sequence. Read it before
  // the write so an unreachable chain fails here instead of after gas is spent,
  // then read it again afterwards and keep the contract's own answer — the
  // pending value is only a fallback for that second read failing.
  const before = await services.anchorer.currentEpoch();
  const txHash = await services.anchorer.anchor(root);
  const epoch = await services.anchorer.currentEpoch().catch(() => before + 1);

  services.store.recordAnchor(epoch, root, txHash, receipts.length);
  return {
    anchored: true,
    epoch,
    root,
    txHash,
    receiptCount: receipts.length,
    newReceipts,
  };
}

/**
 * An inclusion proof for every receipt the latest anchor covers.
 *
 * A root on its own can only be checked by whoever holds every leaf. A proof
 * lets the holder of one receipt show it belongs to the anchored epoch without
 * being handed the rest of the ledger — which is the point of exporting
 * evidence at all. Without an anchor there is no root to prove against, so the
 * list is empty rather than invented.
 */
function inclusionProofs(
  receipts: Receipt[],
  anchor: { root: string; receiptCount: number | null } | null,
): Array<{ receiptId: string; index: number; size: number; path: string[] }> {
  if (!anchor || anchor.receiptCount === null) return [];
  const epoch = receipts.slice(0, anchor.receiptCount);
  const hashes = epoch.map((receipt) => receipt.receiptHash);
  return epoch.map((receipt, index) => ({
    receiptId: receipt.id,
    ...merkleProof(hashes, index),
  }));
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
      proofs: inclusionProofs(receipts, anchor),
      // Carried so a third party can check attribution with no call home.
      keys: issuerKeys(),
      receipts,
      verification: { status, issues },
    },
  };
}
