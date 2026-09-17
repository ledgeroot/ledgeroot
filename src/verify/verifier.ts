import type { PublicKey, Receipt } from "../types.js";
import { recomputeReceiptHash } from "../receipt/builder.js";
import { RECEIPT_ALG, verifyReceiptSignature } from "../receipt/signing.js";
import { merkleRoot } from "../anchor/merkle.js";

export type VerificationStatus = "verified" | "tampered" | "incomplete";

/**
 * Why a check failed. `tampered` means bytes were checked and do not match;
 * `incomplete` means evidence is missing or could not be obtained. Keeping the
 * two apart stops missing data from being reported as an attack, and stops an
 * attack from being excused as missing data.
 */
export type IssueKind = "tampered" | "incomplete";

export interface Issue {
  kind: IssueKind;
  message: string;
}

export interface VerificationResult {
  status: VerificationStatus;
  issues: Issue[];
}

export const tampered = (message: string): Issue => ({ kind: "tampered", message });
export const incomplete = (message: string): Issue => ({ kind: "incomplete", message });

/** A definite mismatch outranks missing evidence. */
export function classify(issues: Issue[]): VerificationStatus {
  if (issues.some((issue) => issue.kind === "tampered")) return "tampered";
  return issues.length > 0 ? "incomplete" : "verified";
}

function result(issues: Issue[]): VerificationResult {
  return { status: classify(issues), issues };
}

function verifyReceiptSelf(receipt: Receipt): Issue[] {
  if (recomputeReceiptHash(receipt) === receipt.receiptHash) return [];
  return [tampered(`receipt ${receipt.id}: self hash mismatch`)];
}

function verifySettlement(receipt: Receipt): Issue[] {
  if (receipt.status !== "paid" || receipt.segments.tx.txHash) return [];
  return [incomplete(`receipt ${receipt.id}: paid receipt missing transaction hash`)];
}

/**
 * Check who attested the receipt. An unsigned receipt, or one whose key the
 * verifier does not hold, is missing evidence rather than a mismatch; a
 * signature that was checked and failed is a mismatch.
 */
function verifyAttribution(receipt: Receipt, keys: PublicKey[]): Issue[] {
  const signature = receipt.signature;
  if (!signature) {
    return [incomplete(`receipt ${receipt.id}: unsigned`)];
  }
  const key = keys.find((candidate) => candidate.kid === signature.protected.kid);
  if (!key) {
    return [incomplete(`receipt ${receipt.id}: no public key for kid ${signature.protected.kid}`)];
  }
  if (signature.protected.alg !== RECEIPT_ALG) {
    return [tampered(`receipt ${receipt.id}: unsupported signature algorithm "${signature.protected.alg}"`)];
  }
  if (!verifyReceiptSignature(receipt.receiptHash, signature, key)) {
    return [tampered(`receipt ${receipt.id}: signature does not verify`)];
  }
  return [];
}

/**
 * Verify a single receipt's internal consistency. Does not require the
 * surrounding chain, so an individual exported receipt can be checked alone.
 * Pass the issuer's public keys to also check attribution.
 */
export function verifyReceipt(receipt: Receipt, keys: PublicKey[] = []): VerificationResult {
  return result([
    ...verifyReceiptSelf(receipt),
    ...verifySettlement(receipt),
    ...verifyAttribution(receipt, keys),
  ]);
}

/**
 * Verify a full append-only receipt chain:
 *  - every receipt's self hash matches its content (tampered otherwise)
 *  - each receipt's back-pointer names the previous one (tampered otherwise)
 *  - the first receipt points nowhere (tampered otherwise)
 *  - paid receipts carry a tx hash (incomplete otherwise)
 *  - every receipt is signed by a key the verifier holds (see verifyAttribution)
 */
export function verifyReceiptChain(
  receipts: Receipt[],
  keys: PublicKey[] = [],
): VerificationResult {
  const issues: Issue[] = [];
  receipts.forEach((receipt, index) => {
    issues.push(
      ...verifyReceiptSelf(receipt),
      ...verifySettlement(receipt),
      ...verifyAttribution(receipt, keys),
    );
    if (index === 0) {
      if (receipt.prevHash) {
        issues.push(tampered(`receipt ${receipt.id}: first receipt should not have a prevHash`));
      }
    } else if (receipt.prevHash !== receipts[index - 1].receiptHash) {
      issues.push(tampered(`receipt ${receipt.id}: prevHash does not match previous receipt`));
    }
  });
  return result(issues);
}

/**
 * Verify receipts against an on-chain epoch root.
 *
 * An epoch covers a prefix of the ledger: `receiptCount` is how many receipts
 * existed when the root was anchored. Recomputed against the whole ledger, the
 * root would stop matching the moment one more payment arrived, so the epoch is
 * sliced back to its boundary. Receipts appended after the anchor are expected
 * and are covered by the next epoch.
 *
 * Pass `null` for an anchor recorded before boundaries were tracked; its root
 * cannot be checked, which is incomplete rather than tampered.
 */
export function verifyAnchor(
  receipts: Receipt[],
  anchoredRoot: string,
  receiptCount: number | null,
): VerificationResult {
  const issues: Issue[] = receipts.flatMap(verifyReceiptSelf);

  if (receiptCount === null) {
    issues.push(incomplete("anchor records no receipt boundary; re-anchor to verify it"));
    return result(issues);
  }

  if (receipts.length < receiptCount) {
    issues.push(
      tampered(
        `anchored epoch covers ${receiptCount} receipts but only ${receipts.length} are present`,
      ),
    );
    return result(issues);
  }

  const epoch = receipts.slice(0, receiptCount);
  const recomputed = merkleRoot(epoch.map((receipt) => receipt.receiptHash));
  if (recomputed !== anchoredRoot) {
    issues.push(
      tampered(`recomputed epoch root ${recomputed} does not match anchored root ${anchoredRoot}`),
    );
  }
  return result(issues);
}
