import type { Hex } from "viem";
import { recoverTypedDataAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { Mandate } from "./types.js";

/**
 * Chain-agnostic EIP-712 credential for a mandate. No chainId or
 * verifyingContract: a mandate is a W3C-VC-style authorization that travels
 * with the agent and is enforced by the local policy engine.
 */
export const MANDATE_DOMAIN = {
  name: "Ledgeroot Mandate",
  version: "1",
};

export const MANDATE_TYPES = {
  Mandate: [
    { name: "id", type: "string" },
    { name: "summary", type: "string" },
    { name: "agentId", type: "string" },
    { name: "counterpartyAllowlist", type: "string[]" },
    { name: "payTo", type: "address[]" },
    { name: "maxAmountPerPayment", type: "string" },
    { name: "maxTotalAmount", type: "string" },
    { name: "expiresAt", type: "uint256" },
    { name: "maxQuoteDriftBps", type: "uint256" },
    { name: "rateLimits", type: "RateLimit[]" },
  ],
  RateLimit: [
    { name: "endpoint", type: "string" },
    { name: "windowSeconds", type: "uint256" },
    { name: "maxCalls", type: "uint256" },
  ],
};

function toEip712Message(mandate: Mandate) {
  return {
    id: mandate.id,
    summary: mandate.summary,
    agentId: mandate.agentId ?? "",
    counterpartyAllowlist: mandate.counterpartyAllowlist,
    payTo: mandate.payTo as `0x${string}`[],
    maxAmountPerPayment: mandate.maxAmountPerPayment,
    maxTotalAmount: mandate.maxTotalAmount,
    expiresAt: BigInt(mandate.expiresAt),
    maxQuoteDriftBps: BigInt(Math.round((mandate.maxQuoteDrift ?? 0.1) * 10_000)),
    rateLimits: (mandate.endpointRateLimit ?? []).map((rateLimit) => ({
      endpoint: rateLimit.endpoint,
      windowSeconds: BigInt(rateLimit.windowSeconds),
      maxCalls: BigInt(rateLimit.maxCalls),
    })),
  };
}

/** Sign a mandate, binding its constraints to the signer's address. */
export async function signMandate(mandate: Mandate, privateKey: string): Promise<Mandate> {
  const account = privateKeyToAccount(privateKey as Hex);
  const signature = await account.signTypedData({
    domain: MANDATE_DOMAIN,
    types: MANDATE_TYPES,
    primaryType: "Mandate",
    message: toEip712Message(mandate),
  });
  return { ...mandate, issuer: account.address, signature };
}

/** Recover the issuer and check the mandate payload has not been tampered. */
export async function verifyMandateSignature(
  mandate: Mandate,
): Promise<{ valid: boolean; issuer: string }> {
  if (!mandate.signature) {
    return { valid: false, issuer: mandate.issuer };
  }
  try {
    const issuer = await recoverTypedDataAddress({
      domain: MANDATE_DOMAIN,
      types: MANDATE_TYPES,
      primaryType: "Mandate",
      message: toEip712Message(mandate),
      signature: mandate.signature as Hex,
    });
    return {
      valid: issuer.toLowerCase() === mandate.issuer.toLowerCase(),
      issuer,
    };
  } catch {
    return { valid: false, issuer: mandate.issuer };
  }
}

/**
 * The subset of local policies this mandate actually constrains — the
 * intersection between the mandate's constraints and the registered policies.
 */
export function computePolicyIntersection(
  mandate: Mandate,
  policyIds: readonly string[],
): string[] {
  const constrained: Record<string, boolean> = {
    "counterparty-whitelist": mandate.counterpartyAllowlist.length > 0,
    "payto-binding": mandate.payTo.length > 0,
    "quote-drift": mandate.maxQuoteDrift !== undefined,
    "endpoint-rate-limit": (mandate.endpointRateLimit?.length ?? 0) > 0,
    "amount-limit": true,
  };
  return policyIds.filter((id) => constrained[id] === true);
}
