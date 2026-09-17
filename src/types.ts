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

/** The settlement protocol a receipt's transaction segment describes. */
export const SETTLEMENT_PROTOCOL_X402 = "x402";

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
  /**
   * 5. Transaction — how the money moved.
   *
   * `protocol` names the settlement protocol. It is absent on receipts written
   * before the field existed, which are all x402.
   *
   * Do not read this segment as "a paid receipt always carries a chain
   * transaction". x402 settles one payment with one EVM transaction, but other
   * protocols do not: MPP batches many requests into a single settlement, and
   * its card rail has no chain at all. Those protocols record their own
   * settlement reference here, and a verifier that does not understand them
   * reports the record as incomplete rather than passing it.
   */
  tx: {
    protocol?: string;
    txHash?: string;
    chainId?: number;
    payer?: string;
  };
  /**
   * 6. Delivery — what the agent actually received for the payment, recorded
   * only when the caller reports the response body. Ledgeroot settles the
   * payment; it does not fetch the resource itself.
   */
  delivery: { payloadHash?: string; payloadSize?: number };
}

export type ReceiptStatus = "paid" | "denied";

/** A detached Ed25519 signature over a receipt hash. */
export interface ReceiptSignature {
  protected: {
    alg: "EdDSA";
    /** Key id — the public key's RFC 7638 thumbprint. */
    kid: string;
    typ: string;
  };
  /** base64url signature over the canonical `{ payload, protected }` bytes. */
  value: string;
}

/** A verifier's view of a signing key. Carries no secret material. */
export interface PublicKey {
  kid: string;
  /** Raw 32-byte Ed25519 public key, base64url. */
  x: string;
}

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
  /**
   * Detached signature over `receiptHash` by the issuer's signing key. Absent
   * on receipts recorded before a signing key was configured, and excluded
   * from `receiptHash` itself.
   */
  signature?: ReceiptSignature;
}
