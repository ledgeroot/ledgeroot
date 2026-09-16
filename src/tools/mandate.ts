import { z } from "zod";
import type { LedgerootServices } from "../context.js";
import { mandateSchema } from "../policy/schema.js";
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

export function importMandate(
  services: LedgerootServices,
  input: MandateImportInput,
): { imported: true; mandateId: string } {
  const mandate = input.mandate as Mandate;
  services.store.upsertMandate(mandate);
  return { imported: true, mandateId: mandate.id };
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
