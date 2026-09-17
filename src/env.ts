import { existsSync } from "node:fs";

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
