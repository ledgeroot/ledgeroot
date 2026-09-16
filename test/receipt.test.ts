import { describe, it, expect } from "vitest";
import { buildReceipt } from "../src/receipt/builder.js";
import { verifyReceipt, verifyReceiptChain } from "../src/verify/verifier.js";
import type { ReceiptSegments } from "../src/types.js";

function segments(): ReceiptSegments {
  return {
    intent: { text: "buy search data", timestamp: 1 },
    mandate: { mandateId: "m-1", issuer: "0xissuer", policyIntersection: [] },
    plan: { quoteHash: "0xquote", quote: { amount: "0.1" } },
    call: { policyResults: [] },
    tx: {},
    delivery: {},
  };
}

describe("receipt chain", () => {
  it("builds a self-consistent receipt", () => {
    const receipt = buildReceipt({ status: "denied", reason: "test", segments: segments() });
    expect(verifyReceipt(receipt).status).toBe("verified");
  });

  it("detects tampering", () => {
    const receipt = buildReceipt({ status: "denied", reason: "test", segments: segments() });
    const tampered = {
      ...receipt,
      segments: { ...receipt.segments, intent: { text: "changed", timestamp: 1 } },
    };
    expect(verifyReceipt(tampered).status).toBe("tampered");
  });

  it("verifies a linked chain and detects a broken back-pointer", () => {
    const a = buildReceipt({ status: "denied", reason: "first", segments: segments() });
    const b = buildReceipt({
      status: "denied",
      reason: "second",
      segments: segments(),
      prevHash: a.receiptHash,
    });
    expect(verifyReceiptChain([a, b]).status).toBe("verified");

    const broken = { ...b, prevHash: "0".repeat(64) };
    expect(verifyReceiptChain([a, broken]).status).toBe("tampered");
  });
});
