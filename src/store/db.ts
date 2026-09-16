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
        id TEXT PRIMARY KEY,
        prev_hash TEXT,
        status TEXT NOT NULL,
        agent_id TEXT,
        mandate_id TEXT,
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
        anchored_at INTEGER NOT NULL
      );
    `);
  }

  appendReceipt(receipt: Receipt): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO receipts
           (id, prev_hash, status, agent_id, mandate_id, counterparty, endpoint, amount, reason, receipt_json, created_at)
         VALUES
           (@id, @prev_hash, @status, @agent_id, @mandate_id, @counterparty, @endpoint, @amount, @reason, @receipt_json, @created_at)`,
      )
      .run({
        id: receipt.id,
        prev_hash: receipt.prevHash ?? null,
        status: receipt.status,
        agent_id: receipt.agentId ?? null,
        mandate_id: receipt.mandateId ?? null,
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
      .prepare("SELECT receipt_json FROM receipts ORDER BY created_at DESC, id DESC LIMIT 1")
      .get() as { receipt_json: string } | undefined;
    return row ? (JSON.parse(row.receipt_json) as Receipt) : null;
  }

  getReceipt(id: string): Receipt | null {
    const row = this.db
      .prepare("SELECT receipt_json FROM receipts WHERE id = ?")
      .get(id) as { receipt_json: string } | undefined;
    return row ? (JSON.parse(row.receipt_json) as Receipt) : null;
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
    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
    const rows = this.db
      .prepare(`SELECT receipt_json FROM receipts ${where} ORDER BY created_at ASC, id ASC`)
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

  recordAnchor(epoch: number, root: string, txHash?: string): void {
    this.db
      .prepare("INSERT INTO anchors (epoch, root, tx_hash, anchored_at) VALUES (?, ?, ?, ?)")
      .run(epoch, root, txHash ?? null, Date.now());
  }

  latestAnchor(): { epoch: number; root: string; txHash?: string } | null {
    const row = this.db
      .prepare("SELECT epoch, root, tx_hash FROM anchors ORDER BY epoch DESC LIMIT 1")
      .get() as { epoch: number; root: string; tx_hash: string | null } | undefined;
    if (!row) return null;
    return { epoch: row.epoch, root: row.root, txHash: row.tx_hash ?? undefined };
  }

  close(): void {
    this.db.close();
  }
}
