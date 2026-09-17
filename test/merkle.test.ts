import { createHash } from "node:crypto";
import { describe, it, expect } from "vitest";
import { merkleRoot } from "../src/anchor/merkle.js";
import { canonicalHash } from "../src/receipt/hashchain.js";

function h(...chunks: Buffer[]): Buffer {
  const hash = createHash("sha256");
  for (const chunk of chunks) hash.update(chunk);
  return hash.digest();
}

const prefix = (byte: number) => Buffer.from([byte]);

/** Deterministic leaf hashes, so every case below is reproducible. */
function leaves(count: number): string[] {
  const out: string[] = [];
  let current = Buffer.alloc(32, 0);
  for (let i = 0; i < count; i++) {
    current = h(current, Buffer.from([i]));
    out.push(current.toString("hex"));
  }
  return out;
}

/**
 * Tree head from the stack algorithm of RFC 9162 §2.1.2. That algorithm is
 * specified separately from the recursive MTH definition in §2.1.1, so
 * agreement between the two is a genuine cross-check rather than a
 * restatement of the same logic.
 */
function stackTreeHead(leafHashes: string[]): string {
  const stack: Buffer[] = [];

  const merge = () => {
    const right = stack.pop()!;
    const left = stack.pop()!;
    stack.push(h(prefix(0x01), left, right));
  };

  leafHashes.forEach((leaf, index) => {
    stack.push(h(prefix(0x00), Buffer.from(leaf, "hex")));
    let merges = 0;
    for (let bits = index; (bits & 1) === 1; bits >>= 1) merges++;
    for (let m = 0; m < merges; m++) merge();
  });

  while (stack.length > 1) merge();
  return stack.length === 0 ? h().toString("hex") : stack[0].toString("hex");
}

describe("merkleRoot (RFC 6962)", () => {
  it("hashes an empty tree as SHA-256 of the empty string", () => {
    expect(merkleRoot([])).toBe(h().toString("hex"));
    expect(merkleRoot([])).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("hashes a single leaf with the 0x00 domain prefix", () => {
    const [leaf] = leaves(1);
    expect(merkleRoot([leaf])).toBe(h(prefix(0x00), Buffer.from(leaf, "hex")).toString("hex"));
    // The root of a one-leaf tree is not the leaf itself: the leaf hash is
    // the domain-separated hash of it.
    expect(merkleRoot([leaf])).not.toBe(leaf);
  });

  it("hashes an internal node with the 0x01 domain prefix", () => {
    const [a, b] = leaves(2);
    expect(merkleRoot([a, b])).toBe(
      h(
        prefix(0x01),
        h(prefix(0x00), Buffer.from(a, "hex")),
        h(prefix(0x00), Buffer.from(b, "hex")),
      ).toString("hex"),
    );
  });

  it("does not alias a 3-leaf tree with a 4-leaf tree", () => {
    const [a, b, c] = leaves(3);
    // The previous pairwise construction duplicated an odd trailing node, so
    // [a,b,c] and [a,b,c,c] produced identical roots. RFC 6962 splits at the
    // largest power of two below the leaf count instead, keeping the tree
    // shapes — and therefore the roots — distinct.
    expect(merkleRoot([a, b, c])).not.toBe(merkleRoot([a, b, c, c]));
  });

  it("matches the RFC 9162 stack algorithm at every size from 0 to 33", () => {
    for (let size = 0; size <= 33; size++) {
      const list = leaves(size);
      expect(merkleRoot(list), `size ${size}`).toBe(stackTreeHead(list));
    }
  });

  it("matches the incremental trees in the RFC 6962 example", () => {
    const list = leaves(7);
    // The example's hash0 / hash1 / hash2 are the MTHs of the first 3, 4
    // and 6 leaves of the 7-leaf tree.
    for (const size of [3, 4, 6, 7]) {
      expect(merkleRoot(list.slice(0, size))).toBe(stackTreeHead(list.slice(0, size)));
    }
  });

  it("is order-sensitive", () => {
    const list = leaves(5);
    const swapped = [list[1], list[0], list[2], list[3], list[4]];
    expect(merkleRoot(list)).not.toBe(merkleRoot(swapped));
  });

  it("accepts canonical receipt hashes", () => {
    const list = ["a", "b", "c"].map(canonicalHash);
    expect(merkleRoot(list)).toBe(merkleRoot(list));
    expect(merkleRoot(list)).toHaveLength(64);
  });
});
