import type { ReceiptSegments } from "../types.js";

export interface SegmentInput {
  /** Why the agent is paying, in the caller's words. */
  intent: string;
  mandateId: string;
  /**
   * The 402 quote exactly as the seller sent it. Stored whole so the hash beside
   * it can be recomputed from the receipt.
   */
  quote: Record<string, unknown>;
  /** Canonical hash of `quote`. */
  quoteHash: string;
  policyResults: ReceiptSegments["call"]["policyResults"];
  /** Issuer of the covering mandate, or empty when none was found. */
  issuer: string;
  policyIntersection: string[];
}

/**
 * Build segments 1–4. Segments 5 and 6 are filled in by whoever knows how the
 * money moved and what came back, so they start empty.
 */
export function buildSegments(input: SegmentInput): ReceiptSegments {
  return {
    intent: { text: input.intent, timestamp: Date.now() },
    mandate: {
      mandateId: input.mandateId,
      issuer: input.issuer,
      policyIntersection: input.policyIntersection,
    },
    plan: { quoteHash: input.quoteHash, quote: input.quote },
    call: { policyResults: input.policyResults },
    tx: {},
    delivery: {},
  };
}
