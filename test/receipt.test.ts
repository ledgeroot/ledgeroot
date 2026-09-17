import { describe, it, expect } from "vitest";
import { buildReceipt, recomputeReceiptHash } from "../src/receipt/builder.js";
import { verifyReceipt, verifyReceiptChain } from "../src/verify/verifier.js";
import { TEST_PUBLIC_KEY, sign } from "./support.js";
import type { Receipt, ReceiptSegments } from "../src/types.js";

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

function denied(reason: string, prevHash?: string): Receipt {
  return buildReceipt({ status: "denied", reason, segments: segments(), prevHash });
}

describe("receipt chain", () => {
  it("builds a self-consistent receipt", () => {
    expect(verifyReceipt(sign(denied("test")), [TEST_PUBLIC_KEY]).status).toBe("verified");
  });

  it("detects tampering", () => {
    const receipt = sign(denied("test"));
    const tampered = {
      ...receipt,
      segments: { ...receipt.segments, intent: { text: "changed", timestamp: 1 } },
    };
    expect(verifyReceipt(tampered, [TEST_PUBLIC_KEY]).status).toBe("tampered");
  });

  it("verifies a linked chain and detects a broken back-pointer", () => {
    const a = sign(denied("first"));
    const b = sign(denied("second", a.receiptHash));
    expect(verifyReceiptChain([a, b], [TEST_PUBLIC_KEY]).status).toBe("verified");

    const broken = { ...b, prevHash: "0".repeat(64) };
    expect(verifyReceiptChain([a, broken], [TEST_PUBLIC_KEY]).status).toBe("tampered");
  });

  it("reports a paid receipt with no tx hash as incomplete, not tampered", () => {
    const receipt = sign(buildReceipt({ status: "paid", segments: segments() }));
    const result = verifyReceipt(receipt, [TEST_PUBLIC_KEY]);
    expect(result.status).toBe("incomplete");
    expect(result.issues).toEqual([
      { kind: "incomplete", message: expect.stringContaining("missing transaction hash") },
    ]);
  });

  it("lets a definite mismatch outrank missing evidence", () => {
    // Same receipt, now both tampered (content no longer matches its hash) and
    // incomplete (still no tx hash). The status must not soften to incomplete.
    const receipt = sign(buildReceipt({ status: "paid", segments: segments() }));
    const result = verifyReceipt({ ...receipt, reason: "edited" }, [TEST_PUBLIC_KEY]);
    expect(result.status).toBe("tampered");
    expect(result.issues.map((issue) => issue.kind).sort()).toEqual(["incomplete", "tampered"]);
  });
});

describe("receipt attribution", () => {
  it("reports an unsigned receipt as incomplete", () => {
    const result = verifyReceipt(denied("unsigned"), [TEST_PUBLIC_KEY]);
    expect(result.status).toBe("incomplete");
    expect(result.issues[0]?.message).toMatch(/unsigned/);
  });

  it("reports a signature whose key the verifier does not hold as incomplete", () => {
    const result = verifyReceipt(sign(denied("test")), []);
    expect(result.status).toBe("incomplete");
    expect(result.issues[0]?.message).toMatch(/no public key for kid/);
  });

  it("catches content edited and re-hashed, which the chain alone cannot", () => {
    const receipt = sign(denied("original"));
    const edited = { ...receipt, reason: "edited" };
    // Re-hash so the content matches its own hash: the chain check now passes
    // and only the signature still disagrees.
    const forged = { ...edited, id: recomputeReceiptHash(edited), receiptHash: recomputeReceiptHash(edited) };

    expect(recomputeReceiptHash(edited)).not.toBe(receipt.receiptHash);
    const result = verifyReceipt(forged, [TEST_PUBLIC_KEY]);
    expect(result.status).toBe("tampered");
    expect(result.issues[0]?.message).toMatch(/signature does not verify/);
  });

  it("rejects a signature whose algorithm was swapped", () => {
    const receipt = sign(denied("test"));
    const swapped = {
      ...receipt,
      signature: {
        ...receipt.signature!,
        protected: { ...receipt.signature!.protected, alg: "none" },
      },
    };
    const result = verifyReceipt(swapped, [TEST_PUBLIC_KEY]);
    expect(result.status).toBe("tampered");
    expect(result.issues[0]?.message).toMatch(/unsupported signature algorithm/);
  });
});
