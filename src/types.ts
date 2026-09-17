// Core domain types shared across the Ledgeroot evidence engine.

/** The outcome of a single policy evaluation. */
export type PolicyDecision =
  | { allow: true }
  | { allow: false; reason: string };

/** A signed authorization that constrains what an agent may spend. */
export interface Mandate {
  /** Stable identifier for the mandate. */
  id: string;
  /** Human-readable sentence shown at signing time ("allow spending ..."). */
  summary: string;
  /** EIP-712 signer that issued the mandate. */
  issuer: string;
  /** ERC-8004 agentId this mandate binds to (when known). */
  agentId?: string;
  /** x402 gateway hosts/addresses the agent is allowed to pay. Empty = unconstrained. */
  counterpartyAllowlist: string[];
  /** Bound payTo addresses. Empty = unconstrained. */
  payTo: string[];
  /** Single payment ceiling in USDC (decimal string). */
  maxAmountPerPayment: string;
  /** Cumulative ceiling in USDC (decimal string). */
  maxTotalAmount: string;
  /** Unix timestamp (seconds) after which the mandate is void. */
  expiresAt: number;
  /** Per-endpoint rate limits. */
  endpointRateLimit?: Array<{
    endpoint: string;
    windowSeconds: number;
    maxCalls: number;
  }>;
  /** Maximum allowed quote drift as a fraction (0.05 = 5%). */
  maxQuoteDrift?: number;
  /** EIP-712 signature over the canonical mandate payload. */
  signature?: string;
}

/** The six audit segments that make up one receipt. */
export interface ReceiptSegments {
  /** 1. Intent — why the agent wanted to pay. */
  intent: { text: string; timestamp: number };
  /** 2. Mandate — which authorization covered the payment. */
  mandate: { mandateId: string; issuer: string; policyIntersection: string[] };
  /** 3. Plan — hash of the original 402 quote plus the quote itself. */
  plan: { quoteHash: string; quote: Record<string, unknown> };
  /** 4. Call — per-policy evaluation results. */
  call: { policyResults: Array<{ policyId: string; decision: PolicyDecision }> };
  /** 5. Transaction — on-chain settlement. */
  tx: { txHash?: string; chainId?: number };
  /** 6. Delivery — proof the purchased resource was delivered. */
  delivery: { proof?: string; payloadHash?: string };
}

export type ReceiptStatus = "paid" | "denied";

export interface Receipt {
  schema: "ledgeroot.receipt.v1";
  /** Stable receipt id — canonical hash of the receipt content. */
  id: string;
  /** Unix timestamp (ms) when the receipt was recorded. */
  timestamp: number;
  agentId?: string;
  mandateId?: string;
  /** Idempotency key — retries with the same key return the existing receipt. */
  requestId?: string;
  /** Grouping key linking this payment to a user task. */
  taskId?: string;
  counterparty?: string;
  endpoint?: string;
  /** Requested amount in USDC (decimal string). */
  amount?: string;
  status: ReceiptStatus;
  /** Denial reason for rejected attempts (kept on the record too). */
  reason?: string;
  segments: ReceiptSegments;
  /** Back-pointer to the previous receipt's hash (append-only hash chain). */
  prevHash?: string;
  /** Canonical RFC-8785 hash of this receipt (self hash). */
  receiptHash: string;
}
