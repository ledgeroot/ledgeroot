import { decodePaymentResponseHeader, wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";

/**
 * Buying a resource over x402.
 *
 * The protocol half — read the 402, create a payment payload, retry the request
 * with it, let the seller settle — is what `@x402/fetch` does. Re-implementing
 * it would only produce a second, worse copy. What this module adds is the part
 * that belongs to us: **a gate that runs before the payload is created**, so a
 * payment the mandate does not allow is never signed, plus a result shaped for
 * the receipt.
 */

/** The seller's payment requirements, exactly as they arrived in the 402. */
export type PaymentRequirements = Record<string, unknown>;

/**
 * What signing an EIP-3009 authorization needs. The `exact` flow touches no
 * chain — no RPC, no reads. Anything more (permit2 approvals and similar
 * extensions) is not wired up.
 */
export interface EvmSigner {
  address: string;
  signTypedData: (parameters: never) => Promise<string>;
}

export type GateVerdict = { allow: true } | { allow: false; reason: string };

export interface BuyRequest {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  /**
   * The one rail to pay on, as an x402 network id (`eip155:143`). Registering a
   * single network is deliberate: requirement selection would otherwise be free
   * to pick whichever network the seller happens to list first, and the rail a
   * receipt records should be the rail we chose.
   */
  network: `${string}:${string}`;
  signer: EvmSigner;
  /**
   * The gate. Called once the seller's requirements are known and **before any
   * payload is created**; returning a reason refuses the purchase, and no
   * signature is produced after that.
   */
  authorize: (requirements: PaymentRequirements) => GateVerdict;
}

export interface BuyResult {
  /**
   * `paid` — the seller accepted a payment.
   * `denied` — the gate refused, or the seller offers no rail we can pay on.
   * `unpaid` — the resource came back without a payment (free tier, or trial).
   */
  kind: "paid" | "denied" | "unpaid";
  status?: number;
  /** The requirements the gate judged, when the flow got that far. */
  requirements?: PaymentRequirements;
  reason?: string;
  body?: string;
  settlement?: { txHash?: string; chainId?: number };
}

/** The x402 v2 settlement header, with the v1 name as a fallback. */
const SETTLEMENT_HEADERS = ["PAYMENT-RESPONSE", "X-PAYMENT-RESPONSE"];

/**
 * The SDK's own wording for "nothing I can sign matches what this seller
 * offers". Matching a message is not lovely, but it is the only signal the SDK
 * gives, and it fails in the safe direction: if the wording ever changes, the
 * error is rethrown and the outcome is reported as unknown rather than as a
 * refusal that might not have been one.
 */
function isNoMatchingRail(error: unknown): boolean {
  return (
    error instanceof Error && /no network\/scheme registered for x402 version/i.test(error.message)
  );
}

function readSettlement(headers: Headers): BuyResult["settlement"] | undefined {
  const header = SETTLEMENT_HEADERS.map((name) => headers.get(name)).find(Boolean);
  if (!header) return undefined;
  try {
    const decoded = decodePaymentResponseHeader(header as string) as Record<string, unknown>;
    const transaction = decoded.transaction ?? decoded.txHash ?? decoded.transactionHash;
    const network = typeof decoded.network === "string" ? decoded.network : "";
    return {
      txHash: typeof transaction === "string" ? transaction : undefined,
      chainId: /^eip155:\d+$/.test(network)
        ? Number(network.slice("eip155:".length))
        : undefined,
    };
  } catch {
    // The header is present, so a payment did happen — we simply cannot read the
    // settlement out of it. Returning an empty settlement keeps that
    // distinction: the receipt records no transaction hash, and verification
    // says `incomplete`, which is the truth rather than a guess.
    return {};
  }
}

export async function buy(input: BuyRequest): Promise<BuyResult> {
  const client = new x402Client();
  registerExactEvmScheme(client, {
    // A structural cast: the SDK types this as a full viem account, but the
    // `exact` flow only ever calls `address` and `signTypedData`.
    signer: input.signer as never,
    networks: [input.network],
  });
  // The SDK carries its own per-payment ceiling and pegged-asset list. Ours is
  // the mandate, and a second, invisible limit that can refuse a payment the
  // mandate allows is worse than no limit — so theirs is off.
  client.setSpendControls(false);

  // Written from inside the hook, read after the fetch.
  const seen: { requirements?: PaymentRequirements; denial?: string } = {};
  client.onBeforePaymentCreation(async (context: { selectedRequirements: unknown }) => {
    const requirements = context.selectedRequirements as PaymentRequirements;
    seen.requirements = requirements;
    const verdict = input.authorize(requirements);
    if (!verdict.allow) {
      seen.denial = verdict.reason;
      return { abort: true as const, reason: verdict.reason };
    }
    return undefined;
  });

  const payingFetch = wrapFetchWithPayment(fetch, client);

  let response: Response;
  try {
    response = await payingFetch(input.url, {
      method: input.method ?? "GET",
      headers: input.headers,
      body: input.body,
    });
  } catch (error) {
    if (seen.denial !== undefined) {
      return { kind: "denied", requirements: seen.requirements, reason: seen.denial };
    }
    if (seen.requirements === undefined && isNoMatchingRail(error)) {
      // The gate never ran because the SDK found no requirement it could sign
      // for: nothing was signed, nothing moved, and a refusal is the honest
      // reading. An unreachable seller lands in the branch below instead, so
      // "we could not pay this rail" is never confused with "we do not know".
      return {
        kind: "denied",
        reason: `the seller offers no rail this build can pay on (${input.network})`,
      };
    }
    // Not our refusal: the request failed somewhere after the gate, so whether
    // it was paid cannot be known from here. The caller has to treat that as
    // unknown rather than unpaid.
    throw error;
  }

  const settlement = readSettlement(response.headers);
  const body = await response.text();
  const common = { status: response.status, requirements: seen.requirements };

  if (settlement) return { kind: "paid", ...common, body, settlement };

  // A 402 that survives, with the gate never having run, means no registered
  // rail matched what the seller offers. Nothing was signed and nothing moved,
  // so this is a refusal — and saying "no rail" would be wrong if the gate had
  // run, which is why the two cases are separated.
  if (response.status === 402 && seen.requirements === undefined) {
    return {
      kind: "denied",
      ...common,
      reason: `the seller offers no rail this build can pay on (${input.network})`,
    };
  }

  if (response.status === 402) {
    // The gate approved and a payload was created, yet the seller still asks for
    // payment. Whether that authorization settled cannot be known from here, so
    // this is thrown rather than reported: the caller has to treat it as unknown
    // rather than as a refusal.
    throw new Error(
      `the seller returned 402 after a payment was offered (${input.network}); whether it settled is unknown`,
    );
  }

  return { kind: "unpaid", ...common, body };
}
