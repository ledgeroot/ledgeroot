import { z } from "zod";
import type { LedgerootServices } from "../context.js";
import { mandateSchema } from "../policy/schema.js";
import { signMandate, verifyMandateSignature } from "../mandate.js";
import { getPrivateKey } from "../env.js";
import type { Mandate } from "../types.js";

export const mandateImportInput = {
  mandate: mandateSchema,
};
export const mandateImportInputSchema = z.object(mandateImportInput);

export const mandateRevokeInput = {
  mandateId: z.string(),
};
export const mandateRevokeInputSchema = z.object(mandateRevokeInput);

export type MandateImportInput = z.infer<typeof mandateImportInputSchema>;
export type MandateRevokeInput = z.infer<typeof mandateRevokeInputSchema>;

export async function importMandate(
  services: LedgerootServices,
  input: MandateImportInput,
): Promise<{ imported: true; mandateId: string; issuer: string }> {
  const mandate = input.mandate as Mandate;
  const verification = await verifyMandateSignature(mandate);
  if (!verification.valid) {
    throw new Error(`mandate "${mandate.id}" has an invalid or missing signature`);
  }
  services.store.upsertMandate(mandate);
  return { imported: true, mandateId: mandate.id, issuer: verification.issuer };
}

export const mandateSignInput = {
  id: z.string().optional().describe("Stable identifier (auto-generated when omitted)"),
  summary: z.string().describe("A natural-language sentence describing the authorization"),
  agentId: z.string().optional().describe("ERC-8004 agentId to bind, if known"),
  counterpartyAllowlist: z.array(z.string()).describe("Allowed x402 gateway hosts; empty = any"),
  payTo: z.array(z.string()).describe("Bound recipient addresses; empty = any"),
  maxAmountPerPayment: z.string().describe("Single-payment ceiling in USDC (decimal string)"),
  maxTotalAmount: z.string().describe("Cumulative ceiling in USDC (decimal string)"),
  expiresAt: z.number().describe("Unix timestamp (seconds) when the mandate expires"),
  endpointRateLimit: z
    .array(
      z.object({
        endpoint: z.string(),
        windowSeconds: z.number(),
        maxCalls: z.number(),
      }),
    )
    .optional()
    .describe("Optional per-endpoint rate limits"),
  maxQuoteDrift: z.number().optional().describe("Maximum quote drift as a fraction (0.1 = 10%)"),
};
export const mandateSignInputSchema = z.object(mandateSignInput);

export type MandateSignInput = z.infer<typeof mandateSignInputSchema>;

/** Sign a mandate with the local key and store it (the one-click issuance). */
export async function mandateSign(
  services: LedgerootServices,
  input: MandateSignInput,
): Promise<{ mandateId: string; issuer: string; summary: string }> {
  const privateKey = getPrivateKey();
  if (!privateKey) {
    throw new Error("no signer configured (set LEDGEROOT_PRIVATE_KEY or LEDGEROOT_DRY_RUN=true)");
  }
  const unsigned: Mandate = {
    id: input.id ?? `mandate-${Date.now()}`,
    summary: input.summary,
    issuer: "",
    agentId: input.agentId,
    counterpartyAllowlist: input.counterpartyAllowlist,
    payTo: input.payTo,
    maxAmountPerPayment: input.maxAmountPerPayment,
    maxTotalAmount: input.maxTotalAmount,
    expiresAt: input.expiresAt,
    endpointRateLimit: input.endpointRateLimit,
    maxQuoteDrift: input.maxQuoteDrift,
  };
  const signed = await signMandate(unsigned, privateKey);
  services.store.upsertMandate(signed);
  return { mandateId: signed.id, issuer: signed.issuer, summary: signed.summary };
}

export function listMandates(services: LedgerootServices): { mandates: Mandate[] } {
  return { mandates: services.store.listMandates() };
}

export function revokeMandate(
  services: LedgerootServices,
  input: MandateRevokeInput,
): { revoked: boolean; mandateId: string } {
  const revoked = services.store.revokeMandate(input.mandateId);
  return { revoked, mandateId: input.mandateId };
}
