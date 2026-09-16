import { describe, it, expect } from "vitest";
import { merkleRoot } from "../src/anchor/merkle.js";
import { canonicalHash } from "../src/receipt/hashchain.js";

describe("merkleRoot", () => {
  it("is deterministic", () => {
    const leaves = ["a", "b", "c"].map(canonicalHash);
    expect(merkleRoot(leaves)).toBe(merkleRoot(leaves));
  });

  it("returns the zero root for no leaves", () => {
    expect(merkleRoot([])).toBe("0".repeat(64));
  });

  it("returns the leaf itself for a single leaf", () => {
    const leaf = canonicalHash("only");
    expect(merkleRoot([leaf])).toBe(leaf);
  });
});
