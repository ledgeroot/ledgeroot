import { rmSync } from "node:fs";
import Database from "better-sqlite3";
import { afterEach, describe, it, expect, vi } from "vitest";
import { LedgerootStore } from "../src/store/db.js";
import { buildReceipt } from "../src/receipt/builder.js";
import { verifyAnchor, verifyReceiptChain } from "../src/verify/verifier.js";
import { TEST_PUBLIC_KEY, sign } from "./support.js";
import type { Receipt, ReceiptSegments } from "../src/types.js";

const DB = "/tmp/cc-store-test.sqlite";
const LEGACY_DB = "/tmp/cc-store-legacy.sqlite";

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

/** A signed, hash-chained run of receipts built within one millisecond. */
function chained(count: number, timestamp: number): Receipt[] {
  const clock = vi.spyOn(Date, "now").mockReturnValue(timestamp);
  try {
    const out: Receipt[] = [];
    for (let i = 0; i < count; i++) {
      out.push(
        sign(
          buildReceipt({
            status: "denied",
            reason: `receipt ${i}`,
            segments: segments(),
            prevHash: out.at(-1)?.receiptHash,
          }),
        ),
      );
    }
    return out;
  } finally {
    clock.mockRestore();
  }
}

afterEach(() => {
  for (const path of [DB, LEGACY_DB]) {
    for (const suffix of ["", "-wal", "-shm"]) {
      rmSync(path + suffix, { force: true });
    }
  }
});

describe("receipt ordering", () => {
  it("returns receipts in append order even when ids sort the other way", () => {
    const store = new LedgerootStore({ path: DB });
    const receipts = chained(5, 1_000);

    // Append in descending id order. `id` is a content hash, so with the old
    // `ORDER BY created_at, id` tie-break the store would hand the run back
    // reversed once every timestamp collided.
    const appendOrder = [...receipts].sort((a, b) => (a.id < b.id ? 1 : -1));
    for (const receipt of appendOrder) store.appendReceipt(receipt);

    expect(store.listReceipts().map((r) => r.id)).toEqual(appendOrder.map((r) => r.id));
    expect(store.lastReceipt()?.id).toBe(appendOrder.at(-1)?.id);
    store.close();
  });

  it("verifies a chain whose receipts all share one millisecond", () => {
    const store = new LedgerootStore({ path: DB });
    for (const receipt of chained(6, 1_000)) store.appendReceipt(receipt);

    expect(verifyReceiptChain(store.listReceipts(), [TEST_PUBLIC_KEY])).toMatchObject({
      status: "verified",
      issues: [],
    });
    store.close();
  });

  it("keeps the earliest receipt for an idempotency key", () => {
    const store = new LedgerootStore({ path: DB });
    const receipts = chained(4, 1_000).map((receipt) => ({ ...receipt, requestId: "same-key" }));
    for (const receipt of receipts) store.appendReceipt(receipt);

    expect(store.getReceiptByRequestId("same-key")?.id).toBe(receipts[0].id);
    store.close();
  });
});

describe("store migration", () => {
  it("backfills a sequence on a database written before seq existed", () => {
    // Recreate the pre-seq table and write two receipts in the same
    // millisecond, ordered so that the old id tie-break would reverse them.
    const legacy = new Database(LEGACY_DB);
    legacy.exec(`
      CREATE TABLE receipts (
        id TEXT PRIMARY KEY,
        prev_hash TEXT,
        status TEXT NOT NULL,
        agent_id TEXT,
        mandate_id TEXT,
        request_id TEXT,
        task_id TEXT,
        counterparty TEXT,
        endpoint TEXT,
        amount TEXT,
        reason TEXT,
        receipt_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);
    const insert = legacy.prepare(
      `INSERT INTO receipts (id, status, receipt_json, created_at)
       VALUES (?, 'denied', ?, 1000)`,
    );
    const older = { id: "ff", receiptHash: "ff", status: "denied", timestamp: 1000, segments: segments() };
    const newer = { id: "00", receiptHash: "00", status: "denied", timestamp: 1000, segments: segments() };
    insert.run(older.id, JSON.stringify(older));
    insert.run(newer.id, JSON.stringify(newer));
    legacy.close();

    // Opening the store migrates it; append order is recovered from rowid.
    const store = new LedgerootStore({ path: LEGACY_DB });
    expect(store.listReceipts().map((r) => r.id)).toEqual(["ff", "00"]);

    // New receipts continue the sequence rather than colliding with it.
    const next = buildReceipt({ status: "denied", reason: "after migration", segments: segments() });
    store.appendReceipt(next);
    expect(store.lastReceipt()?.id).toBe(next.id);
    store.close();
  });

  it("leaves an anchor written before boundaries existed unverifiable", () => {
    // A pre-boundary anchors table: the root is recorded, but not how many
    // receipts it covers, so it cannot be recomputed either way.
    const legacy = new Database(LEGACY_DB);
    legacy.exec(`
      CREATE TABLE anchors (
        epoch INTEGER PRIMARY KEY,
        root TEXT NOT NULL,
        tx_hash TEXT,
        anchored_at INTEGER NOT NULL
      );
      INSERT INTO anchors (epoch, root, anchored_at) VALUES (1, 'deadbeef', 1000);
    `);
    legacy.close();

    const store = new LedgerootStore({ path: LEGACY_DB });
    const anchor = store.latestAnchor();
    expect(anchor?.receiptCount).toBeNull();

    // Unverifiable, not a false verdict in either direction.
    const result = verifyAnchor([], anchor?.root ?? "", anchor?.receiptCount ?? null);
    expect(result.status).toBe("incomplete");
    store.close();
  });
});
