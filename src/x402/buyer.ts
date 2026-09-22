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
   * Whether the target may be a private, loopback or link-local address.
   * Defaults to false: an agent that can be steered toward an arbitrary URL must
   * not be able to read this machine's own services or a cloud metadata
   * endpoint. Local demos and tests opt in explicitly.
   */
  allowPrivateHosts?: boolean;
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

/**
 * Refuse targets that let a caller reach past the seller and into the host's own
 * network. This is the SSRF boundary: the URL here is chosen by whoever calls
 * the tool, and that caller is exactly the agent the mandate exists to constrain.
 *
 * Private, loopback, link-local and CGNAT ranges are blocked, along with the
 * usual internal hostname suffixes. A hostname that resolves to a private
 * address is not caught here — that would need a DNS lookup in the same window
 * as the fetch — so the check is a floor, not a proof.
 */
function privateHostReason(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return `"${rawUrl}" is not a valid URL`;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return `scheme "${url.protocol}" is not fetchable`;
  }

  const host = url.hostname.replace(/^\[/, "").replace(/\]$/, "").toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "metadata.google.internal"
  ) {
    return `host "${host}" is a private address`;
  }

  // IPv6 loopback, unspecified, unique-local (fc00::/7) and link-local (fe80::/10).
  if (host === "::1" || host === "::" || /^f[cd][0-9a-f]{2}:/.test(host) || /^fe[89ab][0-9a-f]:/.test(host)) {
    return `host "${host}" is a private address`;
  }
  if (host.startsWith("::ffff:")) {
    const embedded = host.slice("::ffff:".length);
    return isPrivateV4(embedded) ? `host "${host}" is a private address` : null;
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return isPrivateV4(host) ? `host "${host}" is a private address` : null;
  }
  return null;
}

function isPrivateV4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  if (a === undefined || b === undefined) return true;
  if (a === 0 || a === 127 || a === 10) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

export async function buy(input: BuyRequest): Promise<BuyResult> {
  if (!input.allowPrivateHosts) {
    const blocked = privateHostReason(input.url);
    if (blocked) return { kind: "denied", reason: blocked };
  }

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
      // Redirects are not followed. The SSRF guard above judged the URL we were
      // handed; a 3xx would carry the request to a host that guard never saw and
      // cannot vet. A payment client has no business chasing redirects anyway.
      redirect: "manual",
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

  // A redirect that survives the manual mode. Before a payload exists nothing
  // was signed, so it is a refusal; after one was offered we cannot know whether
  // it settled, so it is thrown rather than classified — the same discipline as
  // a 402 that arrives after payment.
  if (response.status >= 300 && response.status < 400) {
    if (seen.requirements !== undefined) {
      throw new Error(
        `the seller answered with a redirect (HTTP ${response.status}) after a payment was offered (${input.network}); whether it settled is unknown`,
      );
    }
    return {
      kind: "denied",
      status: response.status,
      reason: `the seller answered with a redirect (HTTP ${response.status}); refusing to follow it`,
    };
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
