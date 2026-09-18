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
 * A mandate as stored locally: the signed credential plus the revocation state
 * the credential itself cannot carry.
 */
export interface MandateRecord extends Mandate {
  revoked: boolean;
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
        seq INTEGER PRIMARY KEY AUTOINCREMENT,
        id TEXT NOT NULL UNIQUE,
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
   * `receipts.seq`: it used to be a plain column filled in on every insert by
   * `SELECT COALESCE(MAX(seq), 0) + 1`. That is correct — a single INSERT holds
   * the write lock, so concurrent writers cannot take the same value — but it
   * scans the table on every payment, and the table holds the full JSON of
   * every receipt. Measured cost per insert went from 84 µs at 5k rows to
   * 5,576 µs at 50k, so it is a cliff, not a slope. Making `seq` the rowid
   * alias lets SQLite assign it with no scan and guarantees it is unique and
   * never reused, which also matters once a retention policy starts deleting.
   *
   * `anchors.receipt_count`: an epoch root covers the receipts that existed
   * when it was submitted. Without that boundary recorded, verification has to
   * recompute over the whole ledger and reports a mismatch as soon as one more
   * payment arrives. Rows written before this column existed keep NULL, which
   * verifies as `incomplete` rather than a false `tampered`.
   */
  private migrate(): void {
    if (this.receiptsNeedSeqKey()) this.rebuildReceipts();
    if (!this.hasColumn("anchors", "receipt_count")) {
      this.db.exec("ALTER TABLE anchors ADD COLUMN receipt_count INTEGER");
    }
  }

  private hasColumn(table: string, column: string): boolean {
    const columns = this.db.prepare(`PRAGMA table_info(${table})`).all() as Array<{
      name: string;
      pk: number;
    }>;
    return columns.some((entry) => entry.name === column);
  }

  /** True when `seq` is not the rowid alias, including when it is absent. */
  private receiptsNeedSeqKey(): boolean {
    const columns = this.db.prepare("PRAGMA table_info(receipts)").all() as Array<{
      name: string;
      pk: number;
    }>;
    const seq = columns.find((column) => column.name === "seq");
    return !seq || seq.pk !== 1;
  }

  /**
   * Rebuild `receipts` around the new key. SQLite cannot retype a primary key
   * in place, so the table is copied and swapped inside one transaction.
   *
   * `seq` values are not copied. They are reassigned in the order the old rows
   * were appended, which is what the chain actually depends on — `prevHash`
   * links the receipts, `seq` only orders them — and it repairs any row that
   * predates the column or carries a duplicated value.
   */
  private rebuildReceipts(): void {
    const order = this.hasColumn("receipts", "seq") ? "ORDER BY seq, rowid" : "ORDER BY rowid";
    const columns =
      "id, prev_hash, status, agent_id, mandate_id, request_id, task_id, " +
      "counterparty, endpoint, amount, reason, receipt_json, created_at";

    this.db.transaction(() => {
      this.db.exec(`
        CREATE TABLE receipts_migrated (
          seq INTEGER PRIMARY KEY AUTOINCREMENT,
          id TEXT NOT NULL UNIQUE,
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
      this.db.exec(
        `INSERT INTO receipts_migrated (${columns}) SELECT ${columns} FROM receipts ${order}`,
      );
      this.db.exec("DROP TABLE receipts");
      this.db.exec("ALTER TABLE receipts_migrated RENAME TO receipts");
    })();
  }

  /**
   * Append one receipt. `seq` is left to SQLite — it is the rowid alias, so it
   * is assigned without a scan and is unique and monotonic by construction.
   * `id` carries the uniqueness check, so a re-append of the same content is
   * ignored rather than duplicated.
   */
  appendReceipt(receipt: Receipt): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO receipts
           (id, prev_hash, status, agent_id, mandate_id, request_id, task_id, counterparty, endpoint, amount, reason, receipt_json, created_at)
         VALUES
           (@id, @prev_hash, @status, @agent_id, @mandate_id, @request_id, @task_id, @counterparty, @endpoint, @amount, @reason, @receipt_json, @created_at)`,
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

  /** Mandates still in force. See `listMandateRecords` to include revoked ones. */
  listMandates(): Mandate[] {
    const rows = this.db
      .prepare("SELECT mandate_json FROM mandates WHERE revoked = 0")
      .all() as Array<{ mandate_json: string }>;
    return rows.map((r) => JSON.parse(r.mandate_json) as Mandate);
  }

  /**
   * Every mandate with its revocation state.
   *
   * Revocation is not a field on `Mandate` on purpose: a mandate is a signed
   * credential, and its bytes are what the issuer signed. Whether it has since
   * been revoked is local state about that credential, so it is kept beside it
   * rather than inside it. Without this view a revoked authorization can only
   * vanish from the list, which is exactly the wrong signal at the moment a
   * user needs to see that their kill switch worked.
   */
  listMandateRecords(): MandateRecord[] {
    const rows = this.db
      .prepare("SELECT mandate_json, revoked FROM mandates ORDER BY imported_at ASC")
      .all() as Array<{ mandate_json: string; revoked: number }>;
    return rows.map((row) => ({
      ...(JSON.parse(row.mandate_json) as Mandate),
      revoked: row.revoked === 1,
    }));
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
