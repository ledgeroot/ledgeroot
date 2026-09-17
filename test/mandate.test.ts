import { describe, it, expect } from "vitest";
import {
  computePolicyIntersection,
  signMandate,
  verifyMandateSignature,
} from "../src/mandate.js";
import type { Mandate } from "../src/types.js";

const KEY = `0x${"2".repeat(64)}`;

function mandate(overrides: Partial<Mandate> = {}): Mandate {
  return {
    id: "m-1",
    summary: "allow up to 0.5 USDC per call to agent402.tools",
    issuer: "",
    counterpartyAllowlist: ["agent402.tools"],
    payTo: ["0x35DA8C7a8d2253354925354b436A0422B9618dE4"],
    maxAmountPerPayment: "0.5",
    maxTotalAmount: "2.0",
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
}

const ALL_POLICIES = [
  "counterparty-whitelist",
  "payto-binding",
  "quote-drift",
  "endpoint-rate-limit",
  "amount-limit",
];

describe("mandate credential", () => {
  it("signs and verifies a mandate", async () => {
    const signed = await signMandate(mandate(), KEY);
    expect(signed.issuer).not.toBe("");
    expect(signed.signature).toMatch(/^0x/);
    expect((await verifyMandateSignature(signed)).valid).toBe(true);
  });

  it("detects tampering", async () => {
    const signed = await signMandate(mandate(), KEY);
    const tampered = { ...signed, maxAmountPerPayment: "100" };
    expect((await verifyMandateSignature(tampered)).valid).toBe(false);
  });

  it("rejects an unsigned mandate", async () => {
    const result = await verifyMandateSignature(mandate());
    expect(result.valid).toBe(false);
  });

  it("rejects a mismatched issuer", async () => {
    const signed = await signMandate(mandate(), KEY);
    const tampered = {
      ...signed,
      issuer: "0x0000000000000000000000000000000000000001",
    };
    expect((await verifyMandateSignature(tampered)).valid).toBe(false);
  });

  it("computes the policy intersection", () => {
    const intersection = computePolicyIntersection(mandate(), ALL_POLICIES);
    expect(intersection).toEqual([
      "counterparty-whitelist",
      "payto-binding",
      "amount-limit",
    ]);
  });

  it("includes quote-drift and rate-limit when constrained", () => {
    const constrained = mandate({
      maxQuoteDrift: 0.05,
      endpointRateLimit: [{ endpoint: "/search", windowSeconds: 60, maxCalls: 10 }],
    });
    const intersection = computePolicyIntersection(constrained, ALL_POLICIES);
    expect(intersection).toEqual(ALL_POLICIES);
  });
});
