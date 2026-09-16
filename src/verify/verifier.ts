import type { Receipt } from "../types.js";
import { recomputeReceiptHash } from "../receipt/builder.js";
import { merkleRoot } from "../anchor/merkle.js";

export type VerificationStatus = "verified" | "tampered" | "incomplete";

export interface VerificationResult {
  status: VerificationStatus;
  errors: string[];
}

/** Three-state verification: verified / tampered / incomplete. */
export function classify(errors: string[]): VerificationStatus {
  return errors.length === 0 ? "verified" : "tampered";
}

function verifyReceiptSelf(receipt: Receipt): string[] {
  const errors: string[] = [];
  if (recomputeReceiptHash(receipt) !== receipt.receiptHash) {
    errors.push(`receipt ${receipt.id}: self hash mismatch`);
  }
  return errors;
}

/**
 * Verify a single receipt's internal consistency. Does not require the
 * surrounding chain, so an individual exported receipt can be checked alone.
 */
export function verifyReceipt(receipt: Receipt): VerificationResult {
  const errors = verifyReceiptSelf(receipt);
  if (receipt.status === "paid" && !receipt.segments.tx.txHash) {
    errors.push(`receipt ${receipt.id}: paid receipt missing transaction hash`);
  }
  return { status: classify(errors), errors };
}

/**
 * Verify a full append-only receipt chain:
 *  - every receipt's self hash matches its content (tampered otherwise)
 *  - back-pointers link receipt N to receipt N-1 (tampered otherwise)
 *  - paid receipts carry a tx hash (incomplete otherwise)
 */
export function verifyReceiptChain(receipts: Receipt[]): VerificationResult {
  const errors: string[] = [];
  for (let i = 0; i < receipts.length; i++) {
    const receipt = receipts[i];
    errors.push(...verifyReceiptSelf(receipt));
    if (i === 0) {
      if (receipt.prevHash) {
        errors.push(`receipt ${receipt.id}: first receipt should not have a prevHash`);
      }
    } else {
      const prev = receipts[i - 1];
      if (receipt.prevHash !== prev.receiptHash) {
        errors.push(`receipt ${receipt.id}: prevHash does not match previous receipt`);
      }
    }
    if (receipt.status === "paid" && !receipt.segments.tx.txHash) {
      errors.push(`receipt ${receipt.id}: paid receipt missing transaction hash`);
    }
  }
  return { status: classify(errors), errors };
}

/**
 * Verify a set of receipts against an on-chain epoch Merkle root.
 * Returns "verified" when the locally recomputed root matches the anchor,
 * "tampered" when it differs, "incomplete" when receipts are missing hashes.
 */
export function verifyAnchor(receipts: Receipt[], anchoredRoot: string): VerificationResult {
  const errors: string[] = [];
  for (const receipt of receipts) {
    errors.push(...verifyReceiptSelf(receipt));
  }
  const recomputed = merkleRoot(receipts.map((r) => r.receiptHash));
  if (recomputed !== anchoredRoot) {
    errors.push(
      `recomputed epoch root ${recomputed} does not match anchored root ${anchoredRoot}`,
    );
  }
  return { status: classify(errors), errors };
}
