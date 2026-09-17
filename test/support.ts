import { publicKeyOf, signReceipt } from "../src/receipt/signing.js";
import type { PublicKey, Receipt } from "../src/types.js";

/**
 * A fixed signing key so tests stay deterministic. Tests only — a real
 * deployment sets LEDGEROOT_SIGNING_KEY.
 */
export const TEST_KEY = `0x${"ab".repeat(32)}`;

/** The public half of TEST_KEY, as a verifier would hold it. */
export const TEST_PUBLIC_KEY: PublicKey = publicKeyOf(TEST_KEY);

/** Attach the signature a receipt recorded by a configured signer carries. */
export function sign(receipt: Receipt): Receipt {
  return { ...receipt, signature: signReceipt(receipt.receiptHash, TEST_KEY) };
}
