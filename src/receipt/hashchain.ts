import { createHash } from "node:crypto";
import canonicalize from "canonicalize";

/**
 * Canonical JSON (RFC 8785) hash of a value, returned as lowercase hex.
 * This is the single hashing primitive the whole evidence chain is built on.
 */
export function canonicalHash(value: unknown): string {
  const json = canonicalize(value);
  if (json === undefined) {
    throw new Error("value is not canonicalizable per RFC 8785");
  }
  return createHash("sha256").update(json).digest("hex");
}

/**
 * SHA-256 over raw bytes, returned as lowercase hex. Use this for content that
 * is not canonical JSON — a response body as the agent received it — where
 * re-serialising would change the bytes being committed to.
 */
export function contentHash(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}
