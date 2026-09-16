import type { Mandate, PolicyDecision } from "../types.js";

export interface PolicyContext {
  mandate: Mandate;
  counterparty: string;
  payTo: string;
  /** Requested amount in USDC (decimal string). */
  amount: string;
  /** Amount from the original 402 quote in USDC (decimal string). */
  quoteAmount: string;
  endpoint: string;
  /** Current time in ms. */
  now: number;
  /** Cumulative amount already spent under this mandate (USDC decimal string). */
  cumulativeSpent: string;
  /** Timestamps (ms) of prior attempts against this endpoint, for rate limits. */
  callTimestamps: number[];
}

export interface Policy {
  id: string;
  name: string;
  validate(ctx: PolicyContext): PolicyDecision;
}

export interface PolicyEvaluation {
  decision: PolicyDecision;
  results: Array<{ policyId: string; name: string; decision: PolicyDecision }>;
}

/**
 * Fail-closed policy engine. `validate` runs every registered policy and
 * returns the first denial (or allow when all policies pass).
 */
export class PolicyEngine {
  private _policies: Policy[] = [];

  register(policy: Policy): this {
    this._policies.push(policy);
    return this;
  }

  get policies(): readonly Policy[] {
    return this._policies;
  }

  validate(ctx: PolicyContext): PolicyEvaluation {
    const results = this._policies.map((policy) => ({
      policyId: policy.id,
      name: policy.name,
      decision: policy.validate(ctx),
    }));

    for (const result of results) {
      if (!result.decision.allow) {
        return { decision: result.decision, results };
      }
    }
    return { decision: { allow: true }, results };
  }
}
