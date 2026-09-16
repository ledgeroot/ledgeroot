import { createHash } from "node:crypto";

function sha256Hex(hex: string): string {
  return createHash("sha256").update(Buffer.from(hex, "hex")).digest("hex");
}

/**
 * Minimal binary Merkle tree (no external dependencies). Leaves are 32-byte
 * hashes expressed as 64-char hex strings; the root is returned as hex.
 */
export function merkleRoot(leaves: string[]): string {
  if (leaves.length === 0) return "0".repeat(64);
  let level = leaves.slice();
  while (level.length > 1) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += 2) {
      const right = i + 1 < level.length ? level[i + 1] : level[i];
      next.push(sha256Hex(level[i] + right));
    }
    level = next;
  }
  return level[0];
}
