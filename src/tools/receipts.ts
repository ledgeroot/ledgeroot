import { z } from "zod";
import type { LedgerootServices } from "../context.js";
import type { Receipt } from "../types.js";
import { epochRoot } from "../anchor/anchorer.js";
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

export type ReceiptListInput = z.infer<typeof receiptListInputSchema>;
export type ReceiptGetInput = z.infer<typeof receiptGetInputSchema>;

export function listReceipts(services: LedgerootServices, input: ReceiptListInput) {
  return { receipts: services.store.listReceipts(input) };
}

export function getReceipt(services: LedgerootServices, input: ReceiptGetInput) {
  const receipt = services.store.getReceipt(input.id);
  if (!receipt) return { found: false, id: input.id };
  return { found: true, receipt };
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
  const issues = [...verifyReceiptChain(receipts).issues, ...(anchorResult?.issues ?? [])];
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

export async function anchor(services: LedgerootServices) {
  if (!services.anchorer) {
    return { anchored: false, reason: "no anchorer configured (set LEDGEROOT_ANCHOR_ADDRESS)" };
  }
  if (!services.anchorer.enabled) {
    return { anchored: false, reason: "anchoring disabled (LEDGEROOT_PRIVATE_KEY not set)" };
  }
  const receipts = services.store.listReceipts();
  const root = epochRoot(receipts);
  const txHash = await services.anchorer.anchor(root);
  const latest = services.store.latestAnchor();
  const epoch = latest ? latest.epoch + 1 : 1;
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
      receipts,
      verification: { status, issues },
    },
  };
}
