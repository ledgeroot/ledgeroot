import type { Receipt, ReceiptSegments, ReceiptStatus } from "../types.js";
import { canonicalHash } from "./hashchain.js";

export interface ReceiptInput {
  agentId?: string;
  mandateId?: string;
  requestId?: string;
  taskId?: string;
  counterparty?: string;
  endpoint?: string;
  amount?: string;
  status: ReceiptStatus;
  reason?: string;
  segments: ReceiptSegments;
  prevHash?: string;
}

/**
 * Builds a receipt and derives its self hash from the canonical content.
 * `id` and `receiptHash` are excluded from the hashed content, so the hash
 * can be recomputed from the stored record during offline verification.
 */
export function buildReceipt(input: ReceiptInput): Receipt {
  const content = {
    schema: "ledgeroot.receipt.v1" as const,
    timestamp: Date.now(),
    agentId: input.agentId,
    mandateId: input.mandateId,
    requestId: input.requestId,
    taskId: input.taskId,
    counterparty: input.counterparty,
    endpoint: input.endpoint,
    amount: input.amount,
    status: input.status,
    reason: input.reason,
    segments: input.segments,
    prevHash: input.prevHash,
  };
  const id = canonicalHash(content);
  return { ...content, id, receiptHash: id };
}

/** Recompute a receipt's canonical hash, ignoring its stored id/hash/signature. */
export function recomputeReceiptHash(receipt: Receipt): string {
  const { id: _id, receiptHash: _receiptHash, signature: _signature, ...content } = receipt;
  return canonicalHash(content);
}
