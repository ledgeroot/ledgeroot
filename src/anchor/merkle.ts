import { createHash } from "node:crypto";

/**
 * RFC 6962 Merkle Tree Hash over receipt hashes.
 *
 * Leaves and internal nodes are hashed with distinct domain-separation
 * prefixes, which is what gives the tree second-preimage resistance:
 *
 *   MTH({})      = SHA-256()
 *   MTH({d})     = SHA-256(0x00 || d)
 *   MTH(D[n])    = SHA-256(0x01 || MTH(D[0:k]) || MTH(D[k:n]))   for n > 1
 *
 * where k is the largest power of two smaller than n. Splitting on that
 * boundary — rather than duplicating an odd trailing node — makes the
 * tree shape a function of the leaf count alone, so a leaf can never be
 * reinterpreted as an internal node, or vice versa.
 *
 * Note this is a breaking change from the previous pairwise construction:
 * roots computed before it do not match roots computed after it.
 */

const LEAF_PREFIX = Buffer.from([0x00]);
const NODE_PREFIX = Buffer.from([0x01]);

function sha256(...chunks: Buffer[]): Buffer {
  const hash = createHash("sha256");
  for (const chunk of chunks) hash.update(chunk);
  return hash.digest();
}

/** The largest power of two strictly smaller than n, for n > 1. */
function splitPoint(n: number): number {
  let k = 1;
  while (k * 2 < n) k *= 2;
  return k;
}

/** MTH(D[lo:hi]) as defined in RFC 6962 §2.1. */
function mth(leaves: Buffer[], lo: number, hi: number): Buffer {
  const n = hi - lo;
  if (n === 0) return sha256();
  if (n === 1) return sha256(LEAF_PREFIX, leaves[lo]);
  const k = splitPoint(n);
  return sha256(NODE_PREFIX, mth(leaves, lo, lo + k), mth(leaves, lo + k, hi));
}

/**
 * Compute the Merkle Tree Hash of a list of 32-byte leaf hashes given as
 * 64-char hex strings. Returns the root as a 64-char hex string.
 */
export function merkleRoot(leaves: string[]): string {
  const decoded = leaves.map((leaf) => Buffer.from(leaf, "hex"));
  return mth(decoded, 0, decoded.length).toString("hex");
}
