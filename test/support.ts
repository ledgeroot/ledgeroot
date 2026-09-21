import { publicKeyOf, signReceipt } from "../src/receipt/signing.js";
import { canonicalHash } from "../src/receipt/hashchain.js";
import type { PublicKey, Receipt, ReceiptSegments } from "../src/types.js";

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

/** Payment requirements in the shape a seller sends them. */
export function testQuote(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    amount: "0.1",
    payTo: "0x0000000000000000000000000000000000000002",
    endpoint: "/search",
    ...overrides,
  };
}

/**
 * A six-segment fixture whose plan segment satisfies the check the verifier
 * applies: `quoteHash` is derived from `quote`, so editing one without the
 * other is what the plan check is meant to catch.
 */
export function testSegments(quote: Record<string, unknown> = testQuote()): ReceiptSegments {
  return {
    intent: { text: "buy search data", timestamp: 1 },
    mandate: { mandateId: "m-1", issuer: "0xissuer", policyIntersection: [] },
    plan: { quoteHash: canonicalHash(quote), quote },
    call: { policyResults: [] },
    tx: {},
    delivery: {},
  };
}
