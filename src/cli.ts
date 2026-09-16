#!/usr/bin/env node
import { createServices } from "./bootstrap.js";
import { exportEvidence, verify } from "./tools/receipts.js";

const [, , command, ...args] = process.argv;

function flag(name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

const USAGE = `ledgeroot — evidence engine for agent x402 payments

Usage:
  ledgeroot verify [--db <path>]   Offline verification of the receipt chain + anchor
  ledgeroot export [--db <path>]   Export the evidence bundle as JSON
`;

async function main(): Promise<void> {
  const services = createServices({ dbPath: flag("--db") });
  try {
    switch (command) {
      case "verify":
        console.log(JSON.stringify(verify(services), null, 2));
        break;
      case "export":
        console.log(JSON.stringify(exportEvidence(services), null, 2));
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
