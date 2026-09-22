import { z } from "zod";
import type { LedgerootServices } from "../context.js";
import { buildReceipt } from "../receipt/builder.js";
import { buildSegments as buildSegmentsFrom } from "../receipt/segments.js";
import { canonicalHash, contentHash } from "../receipt/hashchain.js";
import { signReceipt } from "../receipt/signing.js";
import { getSigningKey } from "../env.js";
import { add } from "../decimal.js";
import type { Receipt, ReceiptSegments } from "../types.js";
import { SETTLEMENT_PROTOCOL_X402 } from "../types.js";
import type { X402Quote } from "../x402/facilitator.js";
import { computePolicyIntersection } from "../mandate.js";

export const payInput = {
  intent: z.string().describe("Natural-language intent of the payment"),
  mandateId: z.string().describe("Mandate authorizing this payment"),
  requestId: z
    .string()
    .optional()
    .describe("Stable idempotency key; a retry with the same key returns the existing receipt instead of paying again"),
  taskId: z
    .string()
    .optional()
    .describe("Grouping key linking this payment to a user task"),
  counterparty: z.string().describe("x402 gateway host"),
  quote: z
    .record(z.string(), z.unknown())
    .describe(
      "The 402 payment requirements exactly as the seller sent them. Must carry payTo (address) and amount (USDC decimal string). The receipt records this whole object and commits to it by hash.",
    ),
  amount: z
    .string()
    .describe(
      "Amount actually charged in USDC (decimal string). May differ from the quote — that is what quote drift detects.",
    ),
  endpoint: z.string().describe("API endpoint being called"),
  responseBody: z
    .string()
    .optional()
    .describe(
      "Body the agent received for this payment. Recorded as a hash and a byte size so the receipt covers delivery; never stored verbatim.",
    ),
};

export const payInputSchema = z.object(payInput);

export type PayInput = z.infer<typeof payInputSchema>;

export interface PayResult {
  status: "paid" | "denied";
  receiptId: string;
  reason?: string;
  txHash?: string;
  /** True when the request was already paid and this result is a replay. */
  deduplicated?: boolean;
}

/**
 * Read the seller's payment requirements.
 *
 * `payTo` and the quoted amount come from the quote rather than from separate
 * arguments: policy has to judge what the seller actually asked for, and the
 * receipt has to record the object its hash commits to. A quote that cannot
 * answer either question is a malformed request, so it fails here instead of
 * becoming a receipt for a payment nothing could check.
 */
function readQuote(quote: Record<string, unknown>): { payTo: string; quoteAmount: string } {
  const payTo = quote.payTo;
  const amount = quote.amount;
  if (typeof payTo !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(payTo)) {
    throw new Error("quote.payTo must be a 0x-prefixed address");
  }
  if (typeof amount !== "string" || amount.trim() === "") {
    throw new Error("quote.amount must be a USDC decimal string");
  }
  return { payTo, quoteAmount: amount };
}

export function cumulativeSpent(services: LedgerootServices, mandateId: string): string {
  return services.store
    .listReceipts({ mandateId, status: "paid" })
    .reduce((sum, receipt) => add(sum, receipt.amount ?? "0"), "0");
}

export function callTimestamps(services: LedgerootServices, endpoint: string): number[] {
  return services.store.listReceipts({ endpoint }).map((receipt) => receipt.timestamp);
}

/** Segments 1–4 for a payment attempt, with the quote stored whole. */
function buildSegments(
  input: PayInput,
  quoteHash: string,
  policyResults: ReceiptSegments["call"]["policyResults"],
  issuer: string,
  policyIntersection: string[],
): ReceiptSegments {
  return buildSegmentsFrom({
    intent: input.intent,
    mandateId: input.mandateId,
    quote: input.quote,
    quoteHash,
    policyResults,
    issuer,
    policyIntersection,
  });
}

/**
 * Record a receipt, signed when a signing key is configured. The signature
 * covers the receipt hash rather than the receipt, so it can be attached after
 * the hash is computed without changing it — and so the hash chain, the epoch
 * Merkle root and the signature all commit to the same value.
 */
export function record(services: LedgerootServices, receipt: Receipt): void {
  const key = getSigningKey();
  const signed = key ? { ...receipt, signature: signReceipt(receipt.receiptHash, key) } : receipt;
  services.store.appendReceipt(signed);
}

/**
 * The core payment flow: resolve the mandate, evaluate every policy
 * (fail-closed), then either settle the x402 payment or record a denial.
 * Both outcomes produce a six-segment audit receipt.
 */
export async function handlePay(
  services: LedgerootServices,
  input: PayInput,
): Promise<PayResult> {
  const { payTo, quoteAmount } = readQuote(input.quote);
  const quoteHash = canonicalHash(input.quote);

  // Idempotency: the same requestId returns the existing receipt and never
  // re-pays — retries are resolved against the append-only ledger, not the rail.
  if (input.requestId) {
    const existing = services.store.getReceiptByRequestId(input.requestId);
    if (existing) {
      return {
        status: existing.status,
        receiptId: existing.id,
        reason: existing.reason,
        txHash: existing.segments.tx.txHash,
        deduplicated: true,
      };
    }
  }

  const prevHash = services.store.lastReceipt()?.receiptHash;
  const mandate = services.store.getMandate(input.mandateId);

  if (!mandate) {
    const reason = `unknown mandate "${input.mandateId}"`;
    const receipt = buildReceipt({
      mandateId: input.mandateId,
      requestId: input.requestId,
      taskId: input.taskId,
      counterparty: input.counterparty,
      endpoint: input.endpoint,
      amount: input.amount,
      status: "denied",
      reason,
      segments: buildSegments(input, quoteHash, [], "", []),
      prevHash,
    });
    record(services, receipt);
    return { status: "denied", receiptId: receipt.id, reason };
  }

  const policyIntersection = computePolicyIntersection(
    mandate,
    services.engine.policies.map((policy) => policy.id),
  );

  if (mandate.expiresAt <= Math.floor(Date.now() / 1000)) {
    const reason = `mandate "${mandate.id}" expired at ${mandate.expiresAt}`;
    const receipt = buildReceipt({
      agentId: mandate.agentId,
      mandateId: mandate.id,
      requestId: input.requestId,
      taskId: input.taskId,
      counterparty: input.counterparty,
      endpoint: input.endpoint,
      amount: input.amount,
      status: "denied",
      reason,
      segments: buildSegments(input, quoteHash, [], mandate.issuer, policyIntersection),
      prevHash,
    });
    record(services, receipt);
    return { status: "denied", receiptId: receipt.id, reason };
  }

  const evaluation = services.engine.validate({
    mandate,
    counterparty: input.counterparty,
    payTo,
    amount: input.amount,
    quoteAmount,
    endpoint: input.endpoint,
    now: Date.now(),
    cumulativeSpent: cumulativeSpent(services, mandate.id),
    callTimestamps: callTimestamps(services, input.endpoint),
  });

  const policyResults = evaluation.results.map((result) => ({
    policyId: result.policyId,
    decision: result.decision,
  }));

  if (!evaluation.decision.allow) {
    const reason = evaluation.decision.reason;
    const receipt = buildReceipt({
      agentId: mandate.agentId,
      mandateId: mandate.id,
      requestId: input.requestId,
      taskId: input.taskId,
      counterparty: input.counterparty,
      endpoint: input.endpoint,
      amount: input.amount,
      status: "denied",
      reason,
      segments: buildSegments(input, quoteHash, policyResults, mandate.issuer, policyIntersection),
      prevHash,
    });
    record(services, receipt);
    return { status: "denied", receiptId: receipt.id, reason };
  }

  const x402: X402Quote = {
    gateway: input.counterparty,
    payTo,
    amount: input.amount,
    quoteHash,
    endpoint: input.endpoint,
  };

  // The rail and this database are not one transaction, so the record has to
  // start before the money moves. Without this, a crash between settling and
  // recording leaves the money gone, the receipt unwritten, and — because the
  // idempotency key lived only in that receipt — a retry that pays a second
  // time. The claim is released only once the outcome is on disk, so a
  // requestId that is still claimed means an earlier attempt never got there.
  // The honest reading of that is "unknown", not "failed": refusing to spend is
  // recoverable, paying twice is not.
  //
  // A caller that passes no requestId gets no such protection, because there is
  // nothing to key the attempt on. Idempotency has to be asked for.
  if (
    input.requestId &&
    !services.store.beginPaymentIntent(input.requestId, {
      startedAt: Date.now(),
      agentId: mandate.agentId,
      mandateId: mandate.id,
      counterparty: input.counterparty,
      endpoint: input.endpoint,
      payTo,
      amount: input.amount,
    })
  ) {
    const reason = `request "${input.requestId}" has a payment attempt whose outcome was never recorded; refusing to pay again`;
    const receipt = buildReceipt({
      agentId: mandate.agentId,
      mandateId: mandate.id,
      requestId: input.requestId,
      taskId: input.taskId,
      counterparty: input.counterparty,
      endpoint: input.endpoint,
      amount: input.amount,
      status: "denied",
      reason,
      segments: buildSegments(input, quoteHash, policyResults, mandate.issuer, policyIntersection),
      prevHash,
    });
    record(services, receipt);
    return { status: "denied", receiptId: receipt.id, reason };
  }

  const payment = await services.payments.pay(x402);

  const segments = buildSegments(
    input,
    quoteHash,
    policyResults,
    mandate.issuer,
    policyIntersection,
  );
  segments.tx = {
    protocol: SETTLEMENT_PROTOCOL_X402,
    txHash: payment.txHash,
    chainId: payment.chainId,
    payer: payment.payer,
  };
  if (input.responseBody !== undefined) {
    segments.delivery = {
      payloadHash: contentHash(input.responseBody),
      payloadSize: Buffer.byteLength(input.responseBody, "utf8"),
    };
  }

  const receipt = buildReceipt({
    agentId: mandate.agentId,
    mandateId: mandate.id,
    requestId: input.requestId,
    taskId: input.taskId,
    counterparty: input.counterparty,
    endpoint: input.endpoint,
    amount: input.amount,
    status: "paid",
    segments,
    prevHash,
  });
  record(services, receipt);

  // The outcome is on disk, so the requestId is free again. Any later attempt
  // with this key replays the receipt rather than reaching the rail.
  if (input.requestId) services.store.clearPaymentIntent(input.requestId);

  return { status: "paid", receiptId: receipt.id, txHash: payment.txHash };
}
