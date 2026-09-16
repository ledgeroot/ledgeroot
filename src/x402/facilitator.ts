/**
 * x402 payment protocol integration point.
 *
 * The engine is protocol-agnostic: it only needs a `PaymentProvider` that can
 * settle a quote. The concrete transport talks to the Monad x402 facilitator
 * over HTTP. Wire the official x402 SDK (or the facilitator HTTP API) here;
 * the rest of the codebase does not change.
 */

export interface X402Quote {
  /** x402 gateway / facilitator host that issued the 402 response. */
  gateway: string;
  /** payTo address from the payment request. */
  payTo: string;
  /** Quoted amount in USDC (decimal string). */
  amount: string;
  /** Canonical hash of the original 402 response body. */
  quoteHash: string;
  /** Endpoint the agent called. */
  endpoint: string;
  /** Raw payment request payload, forwarded to the facilitator. */
  raw?: unknown;
}

export interface PaymentResult {
  txHash: string;
  chainId: number;
}

export interface PaymentProvider {
  pay(quote: X402Quote): Promise<PaymentResult>;
}

/**
 * Minimal facilitator HTTP client. The base URL and request schema are
 * configurable via `LEDGEROOT_FACILITATOR_URL`; the exact envelope is
 * finalized against the official facilitator SDK during W1.
 */
export class FacilitatorClient implements PaymentProvider {
  constructor(private readonly baseUrl?: string) {}

  async pay(quote: X402Quote): Promise<PaymentResult> {
    if (!this.baseUrl) {
      throw new Error(
        `FacilitatorClient is not configured: set LEDGEROOT_FACILITATOR_URL (gateway ${quote.gateway})`,
      );
    }
    throw new Error(`FacilitatorClient.pay is not wired yet (${this.baseUrl})`);
  }
}
