import { describe, it, expect } from "vitest";
import { analyzeConsistency } from "../src/consistency.js";
import { buildReceipt } from "../src/receipt/builder.js";
import type { Mandate, Receipt, ReceiptSegments } from "../src/types.js";

function mandate(overrides: Partial<Mandate> = {}): Mandate {
  return {
    id: "m-1",
    summary: "allow up to 0.5 USDC per call to agent402.tools",
    issuer: "0xissuer",
    counterpartyAllowlist: ["agent402.tools"],
    payTo: ["0x35DA8C7a8d2253354925354b436A0422B9618dE4"],
    maxAmountPerPayment: "0.5",
    maxTotalAmount: "1.0",
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
}

function receipt(overrides: Partial<Receipt> = {}): Receipt {
  const segments: ReceiptSegments = {
    intent: { text: "pay", timestamp: 1 },
    mandate: { mandateId: "m-1", issuer: "0xissuer", policyIntersection: [] },
    plan: {
      quoteHash: "0x",
      quote: {
        amount: "0.1",
        payTo: "0x35DA8C7a8d2253354925354b436A0422B9618dE4",
      },
    },
    call: { policyResults: [] },
    tx: {},
    delivery: {},
  };
  return {
    ...buildReceipt({
      mandateId: "m-1",
      counterparty: "agent402.tools",
      amount: "0.1",
      status: "paid",
      segments,
    }),
    ...overrides,
  };
}

describe("analyzeConsistency", () => {
  it("passes a compliant paid receipt", () => {
    const result = analyzeConsistency([receipt()], [mandate()])[0];
    expect(result.violation).toBe(false);
    expect(result.reasons).toEqual([]);
    expect(result.cumulativeSpent).toBe("0.1");
  });

  it("flags a paid receipt exceeding the per-payment limit", () => {
    const result = analyzeConsistency([receipt({ amount: "0.6" })], [mandate()])[0];
    expect(result.violation).toBe(true);
    expect(result.reasons).toContain("amount 0.6 exceeds per-payment limit 0.5");
  });

  it("does not flag a denied over-limit attempt (correct block)", () => {
    const result = analyzeConsistency(
      [receipt({ amount: "100", status: "denied" })],
      [mandate()],
    )[0];
    expect(result.violation).toBe(false);
    expect(result.reasons).toContain("amount 100 exceeds per-payment limit 0.5");
  });

  it("flags a non-whitelisted counterparty", () => {
    const result = analyzeConsistency(
      [receipt({ counterparty: "evil.example" })],
      [mandate()],
    )[0];
    expect(result.violation).toBe(true);
    expect(result.reasons).toContain('counterparty "evil.example" not whitelisted');
  });

  it("flags cumulative spend over the total limit", () => {
    const receipts = [
      receipt({ amount: "0.4", timestamp: 1000 }),
      receipt({ amount: "0.4", timestamp: 2000 }),
      receipt({ amount: "0.4", timestamp: 3000 }),
    ];
    const results = analyzeConsistency(receipts, [mandate()]);
    expect(results[0].violation).toBe(false);
    expect(results[1].violation).toBe(false);
    expect(results[2].violation).toBe(true);
    expect(results[2].reasons).toContain("cumulative 1.2 exceeds total limit 1.0");
  });

  it("flags a paid receipt with an unknown mandate", () => {
    const result = analyzeConsistency([receipt({ mandateId: "ghost" })], [mandate()])[0];
    expect(result.violation).toBe(true);
    expect(result.reasons).toEqual(['unknown mandate "ghost"']);
  });
});
