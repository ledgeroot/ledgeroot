import { z } from "zod";

/** Zod schema for an AP2-style mandate (EIP-712 signed, chain-agnostic). */
export const mandateSchema = z.object({
  id: z.string(),
  summary: z.string(),
  issuer: z.string(),
  agentId: z.string().optional(),
  counterpartyAllowlist: z.array(z.string()),
  payTo: z.array(z.string()),
  maxAmountPerPayment: z.string(),
  maxTotalAmount: z.string(),
  expiresAt: z.number(),
  endpointRateLimit: z
    .array(
      z.object({
        endpoint: z.string(),
        windowSeconds: z.number(),
        maxCalls: z.number(),
      }),
    )
    .optional(),
  maxQuoteDrift: z.number().optional(),
  signature: z.string().optional(),
});

export type MandateInput = z.input<typeof mandateSchema>;
