import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { LedgerootServices } from "../context.js";
import { handlePay, payInput } from "./pay.js";
import { buyInput, handleBuy } from "./buy.js";
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
  verifyOnChain,
  anchor,
  exportEvidence,
  receiptListInput,
  receiptGetInput,
  verifyInput,
  anchorInput,
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
    "ledgeroot_buy",
    {
      title: "Buy a resource under a mandate",
      description:
        "Fetch a URL, pay the 402 it answers with under a mandate, and record what came back. Every policy runs before the payment is signed, and the response body is hashed into segment 6.",
      inputSchema: buyInput,
    },
    async (args) => text(await handleBuy(services, args)),
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
        "Offline verification of the receipt chain and on-chain anchor. No server is involved. Set checkChain to also confirm each paid receipt's settlement against the chain via RPC.",
      inputSchema: verifyInput,
    },
    async (args) =>
      text(args.checkChain ? await verifyOnChain(services) : verify(services)),
  );

  server.registerTool(
    "ledgeroot_anchor",
    {
      title: "Anchor epoch",
      description:
        "Submit the epoch Merkle root of all receipts to the anchor contract. Skips when the ledger has not moved since the last anchor, so a redundant root is never re-submitted.",
      inputSchema: anchorInput,
    },
    async (args) => text(await anchor(services, args)),
  );

  server.registerTool(
    "ledgeroot_export",
    {
      title: "Export evidence bundle",
      description:
        "Export receipts, a Merkle inclusion proof for each receipt the latest anchor covers, and the anchor reference, as a portable bundle.",
    },
    () => text(exportEvidence(services)),
  );
}
