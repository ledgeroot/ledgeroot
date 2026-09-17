#!/usr/bin/env node
import { loadEnv } from "./env.js";
import { createServices } from "./bootstrap.js";
import { anchor, exportEvidence, verify, verifyOnChain } from "./tools/receipts.js";
import { serveMCP } from "./mcp.js";

loadEnv();

const [, , command, ...args] = process.argv;

function flag(name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

const USAGE = `ledgeroot — evidence engine for agent x402 payments

Usage:
  ledgeroot verify [--db <path>] [--check-chain]
                                   Offline verification of the receipt chain + anchor
                                   --check-chain also confirms each settlement via RPC
  ledgeroot export [--db <path>]   Export the evidence bundle as JSON
  ledgeroot anchor [--db <path>]   Submit the epoch Merkle root on-chain
  ledgeroot serve                  Start the MCP server over stdio
`;

async function main(): Promise<void> {
  if (command === "serve") {
    await serveMCP();
    return;
  }

  const services = createServices({ dbPath: flag("--db") });
  try {
    switch (command) {
      case "verify":
        console.log(
          JSON.stringify(
            args.includes("--check-chain") ? await verifyOnChain(services) : verify(services),
            null,
            2,
          ),
        );
        break;
      case "export":
        console.log(JSON.stringify(exportEvidence(services), null, 2));
        break;
      case "anchor":
        console.log(JSON.stringify(await anchor(services), null, 2));
        break;
      default:
        console.log(USAGE);
    }
  } finally {
    services.store.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
