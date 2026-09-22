import { existsSync } from "node:fs";
import type { Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

/**
 * Load `.env` from the current working directory into process.env.
 *
 * Called only by the standalone entry points (CLI, MCP server, deploy/demo
 * scripts). The library itself never loads `.env`, so consuming apps keep
 * full control over their own environment.
 */
export function loadEnv(path = ".env"): void {
  if (existsSync(path)) {
    process.loadEnvFile(path);
  }
}

/** Deterministic throwaway key for dry-run demos (no real credentials). */
export const DRY_RUN_PRIVATE_KEY = `0x${"1".repeat(64)}`;

/** True when LEDGEROOT_DRY_RUN is "true" or "1". */
export function isDryRun(): boolean {
  const value = process.env.LEDGEROOT_DRY_RUN;
  return value === "true" || value === "1";
}

/** The configured signer key, falling back to the throwaway key in dry-run. */
export function getPrivateKey(): string | undefined {
  return process.env.LEDGEROOT_PRIVATE_KEY ?? (isDryRun() ? DRY_RUN_PRIVATE_KEY : undefined);
}

/**
 * The receipt signing key. Deliberately separate from the payment key: the
 * payment key authorizes funds, this one attests to what happened, and neither
 * should be usable for the other's job. Falls back to the throwaway key in
 * dry-run so demos stay self-contained.
 */
export function getSigningKey(): string | undefined {
  return process.env.LEDGEROOT_SIGNING_KEY ?? (isDryRun() ? DRY_RUN_PRIVATE_KEY : undefined);
}

/**
 * The addresses whose mandate signatures this machine will accept on import.
 *
 * `LEDGEROOT_TRUSTED_ISSUERS` (comma-separated) takes precedence when set. With
 * it unset the local signer is trusted, because the key that issues a mandate is
 * also the one that authorizes the spend. Without any key and no configured
 * list the result is empty, which refuses every import — a missing trust anchor
 * has to fail closed, or "signed by anyone" reads the same as "signed by the
 * user".
 */
export function getTrustedIssuers(): string[] {
  const configured = process.env.LEDGEROOT_TRUSTED_ISSUERS;
  if (configured !== undefined && configured.trim() !== "") {
    return configured
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
  }
  const key = getPrivateKey();
  if (!key) return [];
  try {
    return [privateKeyToAccount(key as Hex).address.toLowerCase()];
  } catch {
    return [];
  }
}

/** True when `issuer` is one of the addresses `getTrustedIssuers` names. */
export function isTrustedIssuer(issuer: string): boolean {
  return getTrustedIssuers().includes(issuer.toLowerCase());
}

/**
 * Whether `buy` may fetch private, loopback or link-local addresses.
 *
 * Off by default: an agent that can be talked into a URL must not be able to
 * reach the machine's own services or a cloud metadata endpoint. Local demos
 * and tests opt in explicitly.
 */
export function allowPrivateHosts(): boolean {
  const value = process.env.LEDGEROOT_ALLOW_PRIVATE_HOSTS;
  return value === "true" || value === "1";
}
