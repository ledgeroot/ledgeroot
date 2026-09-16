import { z } from "zod";
import type { LedgerootServices } from "../context.js";
import { mandateSchema } from "../policy/schema.js";
import { verifyMandateSignature } from "../mandate.js";
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
