import { rmSync } from "node:fs";
import Database from "better-sqlite3";
import { afterEach, describe, it, expect, vi } from "vitest";
import { LedgerootStore } from "../src/store/db.js";
import { buildReceipt } from "../src/receipt/builder.js";
import { verifyAnchor, verifyReceiptChain } from "../src/verify/verifier.js";
import { TEST_PUBLIC_KEY, sign } from "./support.js";
import type { Mandate, Receipt, ReceiptSegments } from "../src/types.js";

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

  it("rebuilds a table whose seq was a plain column, keeping append order", () => {
    // The shape written between the seq fix and this one: seq existed, but as an
    // ordinary column filled in by MAX(seq) + 1 on every insert.
    const legacy = new Database(LEGACY_DB);
    legacy.exec(`
      CREATE TABLE receipts (
        seq INTEGER NOT NULL,
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
      `INSERT INTO receipts (seq, id, status, receipt_json, created_at)
       VALUES (?, ?, 'denied', ?, 1000)`,
    );
    const first = { id: "ff", receiptHash: "ff", status: "denied", timestamp: 1000, segments: segments() };
    const second = { id: "00", receiptHash: "00", status: "denied", timestamp: 1000, segments: segments() };
    // Out of id order, and both carrying seq 1: the rebuild renumbers in append
    // order rather than trusting a value the old scheme could get wrong.
    insert.run(1, first.id, JSON.stringify(first));
    insert.run(1, second.id, JSON.stringify(second));
    legacy.close();

    const store = new LedgerootStore({ path: LEGACY_DB });
    expect(store.listReceipts().map((r) => r.id)).toEqual(["ff", "00"]);
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

describe("receipt sequence assignment", () => {
  it("makes seq the rowid alias so an append does not scan the table", () => {
    const store = new LedgerootStore({ path: DB });
    store.close();

    const probe = new Database(DB);
    const columns = probe.prepare("PRAGMA table_info(receipts)").all() as Array<{
      name: string;
      pk: number;
    }>;
    probe.close();

    // Not a style preference. While seq was a plain column, every append read
    // MAX(seq) across a table holding each receipt's full JSON: 84 µs per
    // insert after 5k rows, 5,576 µs after 50k.
    expect(columns.find((column) => column.name === "seq")?.pk).toBe(1);
  });

  it("numbers appends monotonically from one", () => {
    const store = new LedgerootStore({ path: DB });
    for (const receipt of chained(4, 1_000)) store.appendReceipt(receipt);
    store.close();

    const probe = new Database(DB);
    const seqs = (
      probe.prepare("SELECT seq FROM receipts ORDER BY seq").all() as Array<{ seq: number }>
    ).map((row) => row.seq);
    probe.close();

    expect(seqs).toEqual([1, 2, 3, 4]);
  });
});

describe("mandate records", () => {
  const mandate = (id: string): Mandate => ({
    id,
    summary: `mandate ${id}`,
    issuer: "0xissuer",
    counterpartyAllowlist: [],
    payTo: [],
    maxAmountPerPayment: "0.5",
    maxTotalAmount: "2.0",
    expiresAt: 2_000_000_000,
  });

  it("keeps a revoked mandate visible, with its state", () => {
    const store = new LedgerootStore({ path: DB });
    store.upsertMandate(mandate("m-1"));
    store.upsertMandate(mandate("m-2"));
    store.revokeMandate("m-2");

    // The policing view still hides it, which is what a payment path wants.
    expect(store.listMandates().map((m) => m.id)).toEqual(["m-1"]);

    // The record view is what a dashboard needs: once the kill switch fires,
    // an authorization has to read as revoked rather than simply vanish.
    expect(store.listMandateRecords().map((m) => [m.id, m.revoked])).toEqual([
      ["m-1", false],
      ["m-2", true],
    ]);
    store.close();
  });

  it("clears revocation when the same mandate is imported again", () => {
    const store = new LedgerootStore({ path: DB });
    store.upsertMandate(mandate("m-1"));
    expect(store.revokeAllMandates()).toBe(1);
    expect(store.listMandateRecords()[0].revoked).toBe(true);

    store.upsertMandate(mandate("m-1"));
    expect(store.listMandateRecords()[0].revoked).toBe(false);
    store.close();
  });
});
