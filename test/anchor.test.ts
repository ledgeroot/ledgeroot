import { rmSync } from "node:fs";
import { afterEach, describe, it, expect } from "vitest";
import { LedgerootStore } from "../src/store/db.js";
import { anchor } from "../src/tools/receipts.js";
import { buildReceipt } from "../src/receipt/builder.js";
import { epochRoot } from "../src/anchor/anchorer.js";
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

function fakeAnchorer(txHash = "0xfaketx") {
  return {
    enabled: true,
    anchor: async (_root: string) => txHash,
  };
}

afterEach(() => {
  for (const suffix of ["", "-wal", "-shm"]) {
    rmSync(DB + suffix, { force: true });
  }
});

describe("anchor flow", () => {
  it("submits the epoch root and records the anchor", async () => {
    const store = new LedgerootStore({ path: DB });
    const a = buildReceipt({ status: "denied", reason: "first", segments: segments() });
    const b = buildReceipt({
      status: "denied",
      reason: "second",
      segments: segments(),
      prevHash: a.receiptHash,
    });
    // Pin distinct timestamps so the store's ordering is deterministic — the
    // epoch root is order-sensitive and buildReceipt uses Date.now().
    a.timestamp = 1000;
    b.timestamp = 2000;
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

    store.close();
  });

  it("returns not-anchored when no anchorer is configured", async () => {
    const store = new LedgerootStore({ path: DB });
    const services = { store, anchorer: undefined } as unknown as LedgerootServices;
    const result = await anchor(services);
    expect(result.anchored).toBe(false);
    store.close();
  });
});
