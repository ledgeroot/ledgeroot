import { z } from "zod";
import { privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import type { LedgerootServices } from "../context.js";
import type { Receipt, ReceiptSegments } from "../types.js";
import { SETTLEMENT_PROTOCOL_X402 } from "../types.js";
import { buildReceipt } from "../receipt/builder.js";
import { buildSegments } from "../receipt/segments.js";
import { canonicalHash, contentHash } from "../receipt/hashchain.js";
import { fromUnits } from "../decimal.js";
import { allowPrivateHosts, getPrivateKey } from "../env.js";
import { computePolicyIntersection } from "../mandate.js";
import { MONAD_MAINNET_X402, X402_NETWORKS } from "../x402/facilitator.js";
import { buy, type GateVerdict, type PaymentRequirements } from "../x402/buyer.js";
import { callTimestamps, cumulativeSpent, record } from "./pay.js";

export const buyInput = {
  intent: z
    .string()
    .optional()
    .describe("Why the agent is buying this, in its own words; defaults to the URL"),
  mandateId: z.string().describe("Mandate authorizing this purchase"),
  url: z.string().describe("The resource to buy, e.g. https://agent402.tools/api/hash"),
  method: z.string().optional().describe("HTTP method; defaults to GET"),
  headers: z.record(z.string(), z.string()).optional().describe("Extra request headers"),
  body: z.string().optional().describe("Request body for POST-style endpoints"),
  chainId: z
    .number()
    .optional()
    .describe("Which accepted rail to pay on; defaults to Monad mainnet (143)"),
  requestId: z
    .string()
    .optional()
    .describe("Stable idempotency key; a retry with the same key refuses rather than buying twice"),
  taskId: z.string().optional().describe("Grouping key linking this purchase to a user task"),
};

export const buyInputSchema = z.object(buyInput);

export type BuyInput = z.infer<typeof buyInputSchema>;

export interface BuyOutcome {
  status: "paid" | "denied" | "unpaid";
  receiptId?: string;
  reason?: string;
  txHash?: string;
  /** The resource, when it came back. */
  body?: string;
}

/**
 * Buy a resource over x402, under a mandate.
 *
 * This is the flow `ledgeroot_pay` cannot express: there the caller already
 * holds the quote, because the host did the 402 handshake somewhere else — and
 * whatever happened there is invisible to the audit trail. Here the engine does
 * the buying, so the requirements it judges are the ones it received, and the
 * delivery it records is the one it actually got.
 */
export async function handleBuy(
  services: LedgerootServices,
  input: BuyInput,
): Promise<BuyOutcome> {
  const network = X402_NETWORKS[input.chainId ?? MONAD_MAINNET_X402.chainId];
  if (!network) {
    throw new Error(
      `chain ${input.chainId} is not a rail this build can pay on (${Object.keys(X402_NETWORKS).join(", ")})`,
    );
  }

  const privateKey = getPrivateKey();
  if (!privateKey) {
    throw new Error("no signer configured (set LEDGEROOT_PRIVATE_KEY)");
  }
  const signer = privateKeyToAccount(privateKey as Hex);

  const intent = input.intent ?? `buy ${input.url}`;
  const prevHash = services.store.lastReceipt()?.receiptHash;

  const recordDenial = (
    reason: string,
    quote: PaymentRequirements,
    covering: {
      issuer?: string;
      policyResults?: ReceiptSegments["call"]["policyResults"];
      policyIntersection?: string[];
    } = {},
  ): BuyOutcome => {
    const receipt = buildReceipt({
      mandateId: input.mandateId,
      requestId: input.requestId,
      taskId: input.taskId,
      counterparty: new URL(input.url).host,
      endpoint: new URL(input.url).pathname,
      amount: recordableAmount(quote),
      status: "denied",
      reason,
      segments: buildSegments({
        intent,
        mandateId: input.mandateId,
        quote,
        quoteHash: canonicalHash(quote),
        policyResults: covering.policyResults ?? [],
        issuer: covering.issuer ?? "",
        policyIntersection: covering.policyIntersection ?? [],
      }),
      prevHash,
    });
    record(services, receipt);
    return { status: "denied", receiptId: receipt.id, reason };
  };

  // Idempotency, claimed before the money can move — the same discipline as the
  // pay path, and for the same reason: a crash mid-purchase must not turn a
  // retry into a second purchase.
  if (
    input.requestId &&
    !services.store.beginPaymentIntent(input.requestId, {
      startedAt: Date.now(),
      mandateId: input.mandateId,
      counterparty: new URL(input.url).host,
      endpoint: new URL(input.url).pathname,
      payTo: "",
      amount: "",
    })
  ) {
    const reason = `request "${input.requestId}" has a purchase whose outcome was never recorded; refusing to buy again`;
    return recordDenial(reason, {});
  }

  const mandate = services.store.getMandate(input.mandateId);
  if (!mandate) {
    const reason = `unknown mandate "${input.mandateId}"`;
    if (input.requestId) services.store.clearPaymentIntent(input.requestId);
    return recordDenial(reason, {});
  }

  // The mandate's expiry is checked here, not only inside the policy engine
  // (which does not model time): an expired authorization must not be able to
  // reach the signing boundary at all.
  if (mandate.expiresAt <= Math.floor(Date.now() / 1000)) {
    const reason = `mandate "${mandate.id}" expired at ${mandate.expiresAt}`;
    if (input.requestId) services.store.clearPaymentIntent(input.requestId);
    return recordDenial(reason, {}, { issuer: mandate.issuer });
  }

  // The counterparty whitelist is enforced here, before the fetch. Inside the
  // gate it would only run once the seller has already answered with a 402, so a
  // free or non-402 response would be fetched from any host the caller names —
  // the whitelist would constrain who gets *paid* but not who gets *contacted*.
  const counterparty = new URL(input.url).host;
  if (
    mandate.counterpartyAllowlist.length > 0 &&
    !mandate.counterpartyAllowlist.includes(counterparty)
  ) {
    const reason = `counterparty "${counterparty}" is not in the mandate whitelist`;
    if (input.requestId) services.store.clearPaymentIntent(input.requestId);
    return recordDenial(reason, {}, { issuer: mandate.issuer });
  }

  const policyIntersection = computePolicyIntersection(
    mandate,
    services.engine.policies.map((policy) => policy.id),
  );

  // The gate closes over the policy verdict so the receipt can record every
  // policy that ran, not just the one that refused.
  let policyResults: ReceiptSegments["call"]["policyResults"] = [];
  const authorize = (requirements: PaymentRequirements): GateVerdict => {
    // An amount the policies cannot read is refused, not coerced. Treating an
    // unparsable amount as zero would let the limits pass trivially while the
    // SDK signs whatever value the seller actually sent — a parser difference
    // turned into a bypass.
    const amount = parseQuotedAmount(requirements);
    if (amount === null) {
      policyResults = [];
      return {
        allow: false,
        reason: `quote amount ${JSON.stringify(requirements.amount)} is not a USDC atomic amount; refusing to sign`,
      };
    }
    const evaluation = services.engine.validate({
      mandate,
      counterparty,
      payTo: typeof requirements.payTo === "string" ? requirements.payTo : "",
      amount,
      quoteAmount: amount,
      endpoint: new URL(input.url).pathname,
      now: Date.now(),
      cumulativeSpent: cumulativeSpent(services, mandate.id),
      callTimestamps: callTimestamps(services, new URL(input.url).pathname),
    });
    policyResults = evaluation.results.map((result) => ({
      policyId: result.policyId,
      decision: result.decision,
    }));
    return evaluation.decision.allow
      ? { allow: true }
      : { allow: false, reason: evaluation.decision.reason };
  };

  const result = await buy({
    url: input.url,
    method: input.method,
    headers: input.headers,
    body: input.body,
    network: network.network,
    signer,
    allowPrivateHosts: allowPrivateHosts(),
    authorize,
  });

  // The money is on the record (or never moved), so the key is free again.
  if (input.requestId) services.store.clearPaymentIntent(input.requestId);

  if (result.kind === "denied") {
    return recordDenial(result.reason ?? "denied", result.requirements ?? {}, {
      issuer: mandate.issuer,
      policyResults,
      policyIntersection,
    });
  }

  if (result.kind === "unpaid") {
    // No payment happened, so there is nothing to attest. Returning a receipt
    // here would claim a payment the ledger never saw.
    return {
      status: "unpaid",
      reason: `the seller returned ${result.status} without a payment`,
      body: result.body,
    };
  }

  const quote = result.requirements ?? {};
  const amount = parseQuotedAmount(quote) ?? recordableAmount(quote);
  const segments = buildSegments({
    intent,
    mandateId: mandate.id,
    quote,
    quoteHash: canonicalHash(quote),
    policyResults,
    issuer: mandate.issuer,
    policyIntersection,
  });
  segments.tx = {
    protocol: SETTLEMENT_PROTOCOL_X402,
    txHash: result.settlement?.txHash,
    chainId: result.settlement?.chainId ?? network.chainId,
    payer: signer.address,
  };
  // We fetched the resource, so the delivery segment is no longer second-hand:
  // it is the hash of the bytes this engine received.
  if (result.body !== undefined) {
    segments.delivery = {
      payloadHash: contentHash(result.body),
      payloadSize: Buffer.byteLength(result.body, "utf8"),
    };
  }

  const receipt: Receipt = buildReceipt({
    agentId: mandate.agentId,
    mandateId: mandate.id,
    requestId: input.requestId,
    taskId: input.taskId,
    counterparty: new URL(input.url).host,
    endpoint: new URL(input.url).pathname,
    amount,
    status: "paid",
    segments,
    prevHash,
  });
  record(services, receipt);

  return {
    status: "paid",
    receiptId: receipt.id,
    txHash: result.settlement?.txHash,
    body: result.body,
  };
}

/**
 * The amount a requirement asks for, as a USDC decimal string, or `null` when
 * the field is not an atomic-unit integer.
 *
 * Under the `exact` scheme the amount charged is the amount quoted, so one value
 * serves for both. `upto` is a ceiling rather than a price and would need the
 * settled figure, which is not wired up.
 */
function parseQuotedAmount(requirements: PaymentRequirements): string | null {
  const atomic = requirements.amount;
  if (typeof atomic !== "string" || !/^\d+$/.test(atomic)) return null;
  return fromUnits(BigInt(atomic));
}

/**
 * A best-effort amount for recording only. A denial has to be written down even
 * when the quote could not be read, so this never refuses; it is never used to
 * decide whether a payment may proceed.
 */
function recordableAmount(requirements: PaymentRequirements): string {
  const parsed = parseQuotedAmount(requirements);
  if (parsed !== null) return parsed;
  return typeof requirements.amount === "string" ? requirements.amount : "0";
}
