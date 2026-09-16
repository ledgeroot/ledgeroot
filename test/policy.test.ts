import { describe, it, expect } from "vitest";
import { PolicyEngine } from "../src/policy/engine.js";
import { defaultPolicies } from "../src/policy/defaults.js";
import type { Mandate } from "../src/types.js";
import type { PolicyContext } from "../src/policy/engine.js";

const engine = new PolicyEngine();
for (const policy of defaultPolicies()) engine.register(policy);

function mandate(overrides: Partial<Mandate> = {}): Mandate {
  return {
    id: "m-1",
    summary: "allow up to 0.5 USDC per call to xapi.to",
    issuer: "0xissuer",
    counterpartyAllowlist: ["xapi.to"],
    payTo: ["0xpayto"],
    maxAmountPerPayment: "0.5",
    maxTotalAmount: "1.0",
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
}

function ctx(overrides: Partial<PolicyContext> = {}): PolicyContext {
  return {
    mandate: mandate(),
    counterparty: "xapi.to",
    payTo: "0xpayto",
    amount: "0.1",
    quoteAmount: "0.1",
    endpoint: "/api/search",
    now: Date.now(),
    cumulativeSpent: "0",
    callTimestamps: [],
    ...overrides,
  };
}

describe("default policies", () => {
  it("allows a compliant payment", () => {
    expect(engine.validate(ctx()).decision.allow).toBe(true);
  });

  it("denies a counterparty not in the whitelist", () => {
    const result = engine.validate(ctx({ counterparty: "evil.example" }));
    expect(result.decision.allow).toBe(false);
  });

  it("denies an unbound payTo", () => {
    const result = engine.validate(ctx({ payTo: "0xevil" }));
    expect(result.decision.allow).toBe(false);
  });

  it("denies an amount above the per-payment limit", () => {
    const result = engine.validate(ctx({ amount: "1.5" }));
    expect(result.decision.allow).toBe(false);
  });

  it("denies when cumulative spend exceeds the total limit", () => {
    const result = engine.validate(ctx({ amount: "0.4", cumulativeSpent: "0.8" }));
    expect(result.decision.allow).toBe(false);
  });

  it("denies quote drift beyond the threshold", () => {
    const result = engine.validate(
      ctx({ amount: "0.2", quoteAmount: "0.1", mandate: mandate({ maxQuoteDrift: 0.1 }) }),
    );
    expect(result.decision.allow).toBe(false);
  });
});
