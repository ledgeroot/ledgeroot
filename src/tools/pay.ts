import { z } from "zod";
import type { LedgerootServices } from "../context.js";
import { buildReceipt } from "../receipt/builder.js";
import { contentHash } from "../receipt/hashchain.js";
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
  payTo: z.string().describe("payTo address from the 402 response"),
  amount: z.string().describe("Requested amount in USDC (decimal string)"),
  quoteAmount: z.string().describe("Quoted amount in USDC from the 402 response"),
  quoteHash: z.string().describe("Canonical hash of the original 402 response"),
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

function cumulativeSpent(services: LedgerootServices, mandateId: string): string {
  return services.store
    .listReceipts({ mandateId, status: "paid" })
    .reduce((sum, receipt) => add(sum, receipt.amount ?? "0"), "0");
}

function callTimestamps(services: LedgerootServices, endpoint: string): number[] {
  return services.store.listReceipts({ endpoint }).map((receipt) => receipt.timestamp);
}

function buildSegments(
  input: PayInput,
  policyResults: ReceiptSegments["call"]["policyResults"],
  issuer: string,
  policyIntersection: string[],
): ReceiptSegments {
  const now = Date.now();
  return {
    intent: { text: input.intent, timestamp: now },
    mandate: { mandateId: input.mandateId, issuer, policyIntersection },
    plan: {
      quoteHash: input.quoteHash,
      quote: { amount: input.quoteAmount, payTo: input.payTo, endpoint: input.endpoint },
    },
    call: { policyResults },
    tx: {},
    delivery: {},
  };
}

/**
 * Record a receipt, signed when a signing key is configured. The signature
 * covers the receipt hash rather than the receipt, so it can be attached after
 * the hash is computed without changing it — and so the hash chain, the epoch
 * Merkle root and the signature all commit to the same value.
 */
function record(services: LedgerootServices, receipt: Receipt): void {
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
      segments: buildSegments(input, [], "", []),
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
      segments: buildSegments(input, [], mandate.issuer, policyIntersection),
      prevHash,
    });
    record(services, receipt);
    return { status: "denied", receiptId: receipt.id, reason };
  }

  const evaluation = services.engine.validate({
    mandate,
    counterparty: input.counterparty,
    payTo: input.payTo,
    amount: input.amount,
    quoteAmount: input.quoteAmount,
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
      segments: buildSegments(input, policyResults, mandate.issuer, policyIntersection),
      prevHash,
    });
    record(services, receipt);
    return { status: "denied", receiptId: receipt.id, reason };
  }

  const quote: X402Quote = {
    gateway: input.counterparty,
    payTo: input.payTo,
    amount: input.amount,
    quoteHash: input.quoteHash,
    endpoint: input.endpoint,
  };
  const payment = await services.payments.pay(quote);

  const segments = buildSegments(input, policyResults, mandate.issuer, policyIntersection);
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
  return { status: "paid", receiptId: receipt.id, txHash: payment.txHash };
}
