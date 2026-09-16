import { z } from "zod";
import type { LedgerootServices } from "../context.js";
import { epochRoot } from "../anchor/anchorer.js";
import { verifyAnchor, verifyReceiptChain } from "../verify/verifier.js";

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

export function verify(services: LedgerootServices) {
  const receipts = services.store.listReceipts();
  const chain = verifyReceiptChain(receipts);
  const anchor = services.store.latestAnchor();
  const anchorResult = anchor ? verifyAnchor(receipts, anchor.root) : null;
  return {
    status: chain.status,
    errors: chain.errors,
    receiptCount: receipts.length,
    anchor: anchor
      ? {
          epoch: anchor.epoch,
          root: anchor.root,
          txHash: anchor.txHash,
          status: anchorResult?.status,
          errors: anchorResult?.errors,
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
  services.store.recordAnchor(epoch, root, txHash);
  return { anchored: true, epoch, root, txHash, receiptCount: receipts.length };
}

export function exportEvidence(services: LedgerootServices) {
  const receipts = services.store.listReceipts();
  const root = epochRoot(receipts);
  const anchor = services.store.latestAnchor();
  const verification = verifyReceiptChain(receipts);
  return {
    bundle: {
      schema: "ledgeroot.evidence.v1",
      exportedAt: new Date().toISOString(),
      root,
      anchor,
      receipts,
      verification,
    },
  };
}
