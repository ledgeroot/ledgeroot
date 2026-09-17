import Database from "better-sqlite3";
import type { Mandate, Receipt, ReceiptStatus } from "../types.js";

export interface LedgerootStoreOptions {
  /** Path to the SQLite database. Defaults to `ledgeroot.sqlite`. */
  path?: string;
}

export interface ReceiptFilter {
  mandateId?: string;
  status?: ReceiptStatus;
  endpoint?: string;
  taskId?: string;
}

/**
 * A payment attempt recorded before the money moves.
 *
 * This is deliberately not a receipt. A receipt's id is the hash of its
 * content, so its status cannot change after the fact without changing its
 * identity — and the next receipt's `prevHash` would then point at a hash that
 * no longer exists. The chain is append-only, so the pre-flight record lives
 * outside it, in its own table.
 *
 * Its only job is to make the window between settling and recording survivable:
 * if the process dies in there, the next attempt finds this row, and the row
 * means "we do not know whether that payment settled".
 */
export interface PaymentIntent {
  /** Unix ms when the attempt began. */
  startedAt: number;
  mandateId: string;
  counterparty: string;
  endpoint: string;
  payTo: string;
  amount: string;
  agentId?: string;
}

/**
 * Append-only local store for receipts and mandates. Runs entirely client-side;
 * there is no server. Anchors record the on-chain epoch roots after submission.
 */
export class LedgerootStore {
  private db: Database.Database;

  constructor(options: LedgerootStoreOptions = {}) {
    this.db = new Database(options.path ?? "ledgeroot.sqlite");
    this.db.pragma("journal_mode = WAL");
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS receipts (
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
      CREATE TABLE IF NOT EXISTS mandates (
        id TEXT PRIMARY KEY,
        mandate_json TEXT NOT NULL,
        revoked INTEGER NOT NULL DEFAULT 0,
        imported_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS anchors (
        epoch INTEGER PRIMARY KEY,
        root TEXT NOT NULL,
        tx_hash TEXT,
        receipt_count INTEGER,
        anchored_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS payment_intents (
        request_id TEXT PRIMARY KEY,
        intent_json TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);
    this.migrate();
  }

  /**
   * Bring a database written by an earlier version up to date.
   *
   * `receipts.seq`: receipts used to be ordered by `created_at` with `id` as
   * the tie-break. `id` is a content hash, so two receipts written in the same
   * millisecond could come back in an order that did not match the hash chain,
   * which made chain verification report `tampered` on an untouched ledger.
   * `seq` is the append order and is now the only ordering key.
   *
   * `anchors.receipt_count`: an epoch root covers the receipts that existed
   * when it was submitted. Without that boundary recorded, verification has to
   * recompute over the whole ledger and reports a mismatch as soon as one more
   * payment arrives. Rows written before this column existed keep NULL, which
   * verifies as `incomplete` rather than a false `tampered`.
   */
  private migrate(): void {
    if (!this.hasColumn("receipts", "seq")) {
      this.db.exec("ALTER TABLE receipts ADD COLUMN seq INTEGER NOT NULL DEFAULT 0");
      this.backfillReceiptSequence();
    }
    if (!this.hasColumn("anchors", "receipt_count")) {
      this.db.exec("ALTER TABLE anchors ADD COLUMN receipt_count INTEGER");
    }
  }

  private hasColumn(table: string, column: string): boolean {
    const columns = this.db.prepare(`PRAGMA table_info(${table})`).all() as Array<{
      name: string;
    }>;
    return columns.some((entry) => entry.name === column);
  }

  /** rowid is the only append-order signal for rows written before `seq`. */
  private backfillReceiptSequence(): void {
    const rows = this.db.prepare("SELECT rowid AS rid FROM receipts ORDER BY rowid").all() as Array<{
      rid: number;
    }>;
    const setSeq = this.db.prepare("UPDATE receipts SET seq = ? WHERE rowid = ?");
    this.db.transaction(() => {
      rows.forEach((row, index) => setSeq.run(index + 1, row.rid));
    })();
  }

  appendReceipt(receipt: Receipt): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO receipts
           (seq, id, prev_hash, status, agent_id, mandate_id, request_id, task_id, counterparty, endpoint, amount, reason, receipt_json, created_at)
         VALUES
           ((SELECT COALESCE(MAX(seq), 0) + 1 FROM receipts), @id, @prev_hash, @status, @agent_id, @mandate_id, @request_id, @task_id, @counterparty, @endpoint, @amount, @reason, @receipt_json, @created_at)`,
      )
      .run({
        id: receipt.id,
        prev_hash: receipt.prevHash ?? null,
        status: receipt.status,
        agent_id: receipt.agentId ?? null,
        mandate_id: receipt.mandateId ?? null,
        request_id: receipt.requestId ?? null,
        task_id: receipt.taskId ?? null,
        counterparty: receipt.counterparty ?? null,
        endpoint: receipt.endpoint ?? null,
        amount: receipt.amount ?? null,
        reason: receipt.reason ?? null,
        receipt_json: JSON.stringify(receipt),
        created_at: receipt.timestamp,
      });
  }

  lastReceipt(): Receipt | null {
    const row = this.db
      .prepare("SELECT receipt_json FROM receipts ORDER BY seq DESC LIMIT 1")
      .get() as { receipt_json: string } | undefined;
    return row ? (JSON.parse(row.receipt_json) as Receipt) : null;
  }

  getReceipt(id: string): Receipt | null {
    const row = this.db
      .prepare("SELECT receipt_json FROM receipts WHERE id = ?")
      .get(id) as { receipt_json: string } | undefined;
    return row ? (JSON.parse(row.receipt_json) as Receipt) : null;
  }

  /** Return the earliest receipt for an idempotency key, if any. */
  getReceiptByRequestId(requestId: string): Receipt | null {
    const row = this.db
      .prepare(
        "SELECT receipt_json FROM receipts WHERE request_id = ? ORDER BY seq ASC LIMIT 1",
      )
      .get(requestId) as { receipt_json: string } | undefined;
    return row ? (JSON.parse(row.receipt_json) as Receipt) : null;
  }

  /**
   * Claim a requestId before spending against it. Returns false when the id is
   * already claimed, which means an earlier attempt's outcome was never
   * recorded — the rail is not transactional with this database, so the honest
   * reading of that row is "we do not know whether that payment settled".
   */
  beginPaymentIntent(requestId: string, intent: PaymentIntent): boolean {
    const info = this.db
      .prepare(
        "INSERT OR IGNORE INTO payment_intents (request_id, intent_json, created_at) VALUES (?, ?, ?)",
      )
      .run(requestId, JSON.stringify(intent), Date.now());
    return info.changes > 0;
  }

  /** Release a requestId once its outcome has been written down. */
  clearPaymentIntent(requestId: string): void {
    this.db.prepare("DELETE FROM payment_intents WHERE request_id = ?").run(requestId);
  }

  getPaymentIntent(requestId: string): PaymentIntent | null {
    const row = this.db
      .prepare("SELECT intent_json FROM payment_intents WHERE request_id = ?")
      .get(requestId) as { intent_json: string } | undefined;
    return row ? (JSON.parse(row.intent_json) as PaymentIntent) : null;
  }

  listReceipts(filter: ReceiptFilter = {}): Receipt[] {
    const clauses: string[] = [];
    const params: Record<string, unknown> = {};
    if (filter.mandateId) {
      clauses.push("mandate_id = @mandateId");
      params.mandateId = filter.mandateId;
    }
    if (filter.status) {
      clauses.push("status = @status");
      params.status = filter.status;
    }
    if (filter.endpoint) {
      clauses.push("endpoint = @endpoint");
      params.endpoint = filter.endpoint;
    }
    if (filter.taskId) {
      clauses.push("task_id = @taskId");
      params.taskId = filter.taskId;
    }
    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = this.db
      .prepare(`SELECT receipt_json FROM receipts ${where} ORDER BY seq ASC`)
      .all(params) as Array<{ receipt_json: string }>;
    return rows.map((r) => JSON.parse(r.receipt_json) as Receipt);
  }

  upsertMandate(mandate: Mandate): void {
    this.db
      .prepare(
        `INSERT INTO mandates (id, mandate_json, imported_at)
         VALUES (@id, @json, @at)
         ON CONFLICT(id) DO UPDATE SET mandate_json = excluded.mandate_json, revoked = 0`,
      )
      .run({ id: mandate.id, json: JSON.stringify(mandate), at: Date.now() });
  }

  revokeMandate(id: string): boolean {
    const info = this.db.prepare("UPDATE mandates SET revoked = 1 WHERE id = ?").run(id);
    return info.changes > 0;
  }

  /** One-click kill switch: revoke every active mandate. */
  revokeAllMandates(): number {
    const info = this.db
      .prepare("UPDATE mandates SET revoked = 1 WHERE revoked = 0")
      .run();
    return info.changes;
  }

  listMandates(): Mandate[] {
    const rows = this.db
      .prepare("SELECT mandate_json FROM mandates WHERE revoked = 0")
      .all() as Array<{ mandate_json: string }>;
    return rows.map((r) => JSON.parse(r.mandate_json) as Mandate);
  }

  getMandate(id: string): Mandate | null {
    const row = this.db
      .prepare("SELECT mandate_json FROM mandates WHERE id = ? AND revoked = 0")
      .get(id) as { mandate_json: string } | undefined;
    return row ? (JSON.parse(row.mandate_json) as Mandate) : null;
  }

  /** Record an anchor along with how many receipts its root covers. */
  recordAnchor(epoch: number, root: string, txHash: string | undefined, receiptCount: number): void {
    this.db
      .prepare(
        "INSERT INTO anchors (epoch, root, tx_hash, receipt_count, anchored_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run(epoch, root, txHash ?? null, receiptCount, Date.now());
  }

  latestAnchor(): {
    epoch: number;
    root: string;
    txHash?: string;
    /** Receipts covered by this root; null for anchors predating boundaries. */
    receiptCount: number | null;
  } | null {
    const row = this.db
      .prepare("SELECT epoch, root, tx_hash, receipt_count FROM anchors ORDER BY epoch DESC LIMIT 1")
      .get() as
      | { epoch: number; root: string; tx_hash: string | null; receipt_count: number | null }
      | undefined;
    if (!row) return null;
    return {
      epoch: row.epoch,
      root: row.root,
      txHash: row.tx_hash ?? undefined,
      receiptCount: row.receipt_count,
    };
  }

  close(): void {
    this.db.close();
  }
}
