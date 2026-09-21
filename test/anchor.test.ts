import { rmSync } from "node:fs";
import { afterEach, describe, it, expect, vi } from "vitest";
import { LedgerootStore } from "../src/store/db.js";
import { anchor, exportEvidence, verify } from "../src/tools/receipts.js";
import { buildReceipt } from "../src/receipt/builder.js";
import { epochRoot } from "../src/anchor/anchorer.js";
import { verifyMerkleProof } from "../src/anchor/merkle.js";
import { verifyAnchor } from "../src/verify/verifier.js";
import { TEST_KEY, sign } from "./support.js";
import type { LedgerootServices } from "../src/context.js";
import type { ReceiptSegments } from "../src/types.js";

const DB = "/tmp/cc-anchor-test.sqlite";

function segments(): ReceiptSegments {
  return {
    intent: { text: "buy search data", timestamp: 1 },
    mandate: { mandateId: "m-1", issuer: "0xissuer", policyIntersection: [] },
    plan: { quoteHash: "0xquote", quote: { amount: "0.1" } },
    call: { policyResults: [] },
    tx: {},
    delivery: {},
  };
}

/**
 * A contract stub. `chainEpoch` stands in for what `lastEpoch()` returns, which
 * on a real chain is the number of the anchor just submitted.
 */
function fakeAnchorer(txHash = "0xfaketx", chainEpoch = 1) {
  return {
    enabled: true,
    anchor: async (_root: string) => txHash,
    currentEpoch: async () => chainEpoch,
  };
}

/** A signed, denied receipt — no tx hash, so it never reads as incomplete. */
function denied(reason: string, prevHash?: string) {
  return sign(buildReceipt({ status: "denied", reason, segments: segments(), prevHash }));
}

afterEach(() => {
  vi.unstubAllEnvs();
  for (const suffix of ["", "-wal", "-shm"]) {
    rmSync(DB + suffix, { force: true });
  }
});

describe("anchor flow", () => {
  it("submits the epoch root and records the anchor", async () => {
    const store = new LedgerootStore({ path: DB });
    const a = denied("first");
    const b = denied("second", a.receiptHash);
    // No timestamp pinning: the store orders receipts by append sequence, so
    // the epoch root is reproducible even when both land in the same
    // millisecond (buildReceipt uses Date.now()).
    store.appendReceipt(a);
    store.appendReceipt(b);

    const services = {
      store,
      anchorer: fakeAnchorer(),
    } as unknown as LedgerootServices;

    const result = await anchor(services);

    expect(result).toMatchObject({
      anchored: true,
      epoch: 1,
      txHash: "0xfaketx",
      receiptCount: 2,
    });
    expect(result.root).toBe(epochRoot([a, b]));

    const latest = store.latestAnchor();
    expect(latest?.root).toBe(epochRoot([a, b]));
    expect(latest?.epoch).toBe(1);
    expect(latest?.txHash).toBe("0xfaketx");
    expect(latest?.receiptCount).toBe(2);

    store.close();
  });

  it("returns not-anchored when no anchorer is configured", async () => {
    const store = new LedgerootStore({ path: DB });
    const services = { store, anchorer: undefined } as unknown as LedgerootServices;
    const result = await anchor(services);
    expect(result.anchored).toBe(false);
    store.close();
  });

  it("takes the epoch from the contract rather than a local counter", async () => {
    const store = new LedgerootStore({ path: DB });
    store.appendReceipt(denied("anchored"));

    // A fresh local database has an empty anchors table, but this contract has
    // been anchored to before. Counting locally would call this "epoch 1"
    // while the chain calls it 7, and the dashboard reads the local row.
    const services = {
      store,
      anchorer: fakeAnchorer("0xfaketx", 7),
    } as unknown as LedgerootServices;

    const result = await anchor(services);

    expect(result.epoch).toBe(7);
    expect(store.latestAnchor()?.epoch).toBe(7);
    store.close();
  });

  it("exports an inclusion proof for each receipt the anchor covers", async () => {
    const store = new LedgerootStore({ path: DB });
    const a = denied("first");
    const b = denied("second", a.receiptHash);
    const later = denied("after the anchor", b.receiptHash);
    store.appendReceipt(a);
    store.appendReceipt(b);

    const services = {
      store,
      anchorer: fakeAnchorer("0xfaketx", 3),
    } as unknown as LedgerootServices;
    await anchor(services);
    store.appendReceipt(later);

    const { bundle } = exportEvidence(services);
    const root = bundle.anchor?.root ?? "";

    // The third receipt is outside the epoch, so it gets no proof.
    expect(root).toBe(epochRoot([a, b]));
    expect(bundle.proofs.map((entry) => entry.receiptId).sort()).toEqual([a.id, b.id].sort());

    for (const entry of bundle.proofs) {
      const receipt = entry.receiptId === a.id ? a : b;
      // The proof has to reach the anchored root, not merely fold to something.
      expect(verifyMerkleProof(receipt.receiptHash, entry, root)).toBe(true);
    }
    store.close();
  });

  it("exports no proofs when nothing is anchored", () => {
    const store = new LedgerootStore({ path: DB });
    store.appendReceipt(denied("unanchored"));
    const services = { store, anchorer: undefined } as unknown as LedgerootServices;
    // No anchor means no root to prove against, so the list is empty rather
    // than filled with proofs that would verify against nothing.
    expect(exportEvidence(services).bundle.proofs).toEqual([]);
    store.close();
  });

  it("stays verified when a receipt is appended after anchoring", async () => {
    // verify() checks attribution against the local signer's own key.
    vi.stubEnv("LEDGEROOT_SIGNING_KEY", TEST_KEY);
    const store = new LedgerootStore({ path: DB });
    const a = denied("anchored");
    store.appendReceipt(a);

    const services = {
      store,
      anchorer: fakeAnchorer(),
    } as unknown as LedgerootServices;
    await anchor(services);

    // The epoch root covers only `a`; `b` arrives afterwards. Verifying against
    // the whole ledger instead of the epoch would call this a mismatch.
    store.appendReceipt(denied("after the anchor", a.receiptHash));

    const result = verify(services);
    expect(result.status).toBe("verified");
    expect(result.issues).toEqual([]);
    expect(result.receiptCount).toBe(2);
    expect(result.anchor?.receiptCount).toBe(1);
    expect(result.anchor?.status).toBe("verified");
    store.close();
  });

  it("cannot check an anchor that records no receipt boundary", () => {
    const a = denied("anchored");
    // A root with no boundary might cover any prefix, so it is unverifiable —
    // incomplete rather than a false verdict either way.
    expect(verifyAnchor([a], epochRoot([a]), null).status).toBe("incomplete");
  });

  it("reports anchored receipts going missing as tampering", () => {
    const a = denied("anchored");
    expect(verifyAnchor([a], epochRoot([a, denied("second", a.receiptHash)]), 2).status).toBe(
      "tampered",
    );
  });
});
