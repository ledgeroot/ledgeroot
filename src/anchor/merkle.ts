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

/** A Merkle inclusion proof for one leaf of a tree of a known size. */
export interface MerkleProof {
  /** Zero-based position of the leaf in the tree. */
  index: number;
  /** How many leaves the tree had, which fixes its shape. */
  size: number;
  /** Sibling hashes from the leaf up to the root, as 64-char hex strings. */
  path: string[];
}

/**
 * The audit path for one leaf (RFC 6962 §2.1.3).
 *
 * The recursion mirrors `mth`: the path for the subtree holding the leaf comes
 * first, then the hash of the sibling subtree it is folded with. Keeping that
 * order is what lets a verifier walk the path knowing only the index and the
 * size — it never needs the other leaves.
 */
function auditPath(leaves: Buffer[], lo: number, hi: number, index: number): Buffer[] {
  const n = hi - lo;
  if (n === 1) return [];
  const k = splitPoint(n);
  if (index < k) {
    return [...auditPath(leaves, lo, lo + k, index), mth(leaves, lo + k, hi)];
  }
  return [...auditPath(leaves, lo + k, hi, index - k), mth(leaves, lo, lo + k)];
}

/**
 * Prove that the leaf at `index` is in the tree with that leaf list.
 *
 * A root alone can only be checked by whoever holds every leaf. A proof lets a
 * holder of one receipt show it belongs to the anchored epoch without handing
 * over the rest of the ledger.
 */
export function merkleProof(leaves: string[], index: number): MerkleProof {
  if (!Number.isInteger(index) || index < 0 || index >= leaves.length) {
    throw new Error(`leaf index ${index} is outside a tree of ${leaves.length} leaves`);
  }
  const decoded = leaves.map((leaf) => Buffer.from(leaf, "hex"));
  return {
    index,
    size: decoded.length,
    path: auditPath(decoded, 0, decoded.length, index).map((node) => node.toString("hex")),
  };
}

/**
 * Fold a leaf and its path back into a candidate root, consuming path entries
 * as it descends. Returns null when the path does not fit the tree shape the
 * index and size describe, so a malformed proof is rejected rather than
 * silently producing some other hash.
 */
function foldPath(
  leaf: Buffer,
  index: number,
  size: number,
  path: Buffer[],
  cursor: { at: number },
): Buffer | null {
  // The base case is the leaf hash, not the leaf: MTH of a single leaf is the
  // domain-separated hash of it, and every ancestor is built on that.
  if (size === 1) return sha256(LEAF_PREFIX, leaf);
  const k = splitPoint(size);
  if (index < k) {
    const left = foldPath(leaf, index, k, path, cursor);
    if (!left || cursor.at >= path.length) return null;
    return sha256(NODE_PREFIX, left, path[cursor.at++]);
  }
  const right = foldPath(leaf, index - k, size - k, path, cursor);
  if (!right || cursor.at >= path.length) return null;
  return sha256(NODE_PREFIX, path[cursor.at++], right);
}

/**
 * Check that `leaf` belongs to the tree whose root is `root`, using a proof
 * from `merkleProof`. Returns false for anything that does not hold — the
 * caller passes the root it already trusts (an anchored one), never one taken
 * from the proof itself.
 */
export function verifyMerkleProof(leaf: string, proof: MerkleProof, root: string): boolean {
  if (!Number.isInteger(proof.size) || proof.size <= 0) return false;
  if (!Number.isInteger(proof.index) || proof.index < 0 || proof.index >= proof.size) return false;

  const leafHash = Buffer.from(leaf, "hex");
  if (leafHash.length !== 32) return false;
  const path = proof.path.map((node) => Buffer.from(node, "hex"));
  if (path.some((node) => node.length !== 32)) return false;

  const cursor = { at: 0 };
  const computed = foldPath(leafHash, proof.index, proof.size, path, cursor);
  if (!computed || cursor.at !== path.length) return false;
  return computed.toString("hex") === root;
}
