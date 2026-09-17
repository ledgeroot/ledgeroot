import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LedgerootServices } from "../context.js";
import { handlePay, payInput } from "./pay.js";
import {
  importMandate,
  mandateSign,
  listMandates,
  revokeMandate,
  mandateImportInput,
  mandateRevokeInput,
  mandateSignInput,
} from "./mandate.js";
import {
  listReceipts,
  getReceipt,
  verify,
  anchor,
  exportEvidence,
  receiptListInput,
  receiptGetInput,
} from "./receipts.js";

function text(payload: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
  };
}

/**
 * Tool Router — the ten `ledgeroot_*` tools exposed over MCP.
 */
export function createToolRouter(server: McpServer, services: LedgerootServices): void {
  server.registerTool(
    "ledgeroot_pay",
    {
      title: "Constrained x402 payment",
      description:
        "Execute an x402 payment after validating it against a mandate. Fail-closed: every attempt is recorded as an audit receipt.",
      inputSchema: payInput,
    },
    async (args) => text(await handlePay(services, args)),
  );

  server.registerTool(
    "ledgeroot_mandate_import",
    {
      title: "Import mandate",
      description: "Import a signed AP2-style mandate and intersect it with local policy.",
      inputSchema: mandateImportInput,
    },
    async (args) => text(await importMandate(services, args)),
  );

  server.registerTool(
    "ledgeroot_mandate_sign",
    {
      title: "Sign mandate",
      description:
        "Sign an authorization with the local key and store it. The natural-language summary is shown to the user before signing.",
      inputSchema: mandateSignInput,
    },
    async (args) => text(await mandateSign(services, args)),
  );

  server.registerTool(
    "ledgeroot_mandate_list",
    {
      title: "List mandates",
      description: "List active mandates.",
    },
    () => text(listMandates(services)),
  );

  server.registerTool(
    "ledgeroot_mandate_revoke",
    {
      title: "Revoke mandate",
      description: "Revoke a mandate (the one-click kill switch).",
      inputSchema: mandateRevokeInput,
    },
    (args) => text(revokeMandate(services, args)),
  );

  server.registerTool(
    "ledgeroot_receipt_list",
    {
      title: "List receipts",
      description: "List audit receipts, optionally filtered by mandate, status or endpoint.",
      inputSchema: receiptListInput,
    },
    (args) => text(listReceipts(services, args)),
  );

  server.registerTool(
    "ledgeroot_receipt_get",
    {
      title: "Get receipt",
      description: "Get a single audit receipt by id.",
      inputSchema: receiptGetInput,
    },
    (args) => text(getReceipt(services, args)),
  );

  server.registerTool(
    "ledgeroot_verify",
    {
      title: "Verify evidence",
      description:
        "Offline verification of the receipt chain and on-chain anchor. No server is involved.",
    },
    () => text(verify(services)),
  );

  server.registerTool(
    "ledgeroot_anchor",
    {
      title: "Anchor epoch",
      description: "Submit the epoch Merkle root of all receipts to the anchor contract.",
    },
    async () => text(await anchor(services)),
  );

  server.registerTool(
    "ledgeroot_export",
    {
      title: "Export evidence bundle",
      description: "Export receipts, Merkle proof and anchor reference as a portable bundle.",
    },
    () => text(exportEvidence(services)),
  );
}
