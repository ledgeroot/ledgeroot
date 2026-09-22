#!/usr/bin/env node
import { loadEnv } from "./env.js";
import { createServices } from "./bootstrap.js";
import { anchor, exportEvidence, keySet, verify, verifyOnChain } from "./tools/receipts.js";
import { handleBuy } from "./tools/buy.js";
import { serveMCP } from "./mcp.js";

loadEnv();

const [, , command, ...args] = process.argv;

function flag(name: string): string | undefined {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

/**
 * Split `--flag value` pairs from bare arguments. `--header` is collected into a
 * list because a request may carry several, and a flag with nothing after it (or
 * followed by another flag) is treated as having no value rather than swallowing
 * the next flag.
 */
function parseArgs(argv: string[]): { positionals: string[]; flags: Map<string, string[]> } {
  const positionals: string[] = [];
  const flags = new Map<string, string[]>();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith("--")) {
      flags.set(arg, flags.get(arg) ?? []);
      continue;
    }
    flags.set(arg, [...(flags.get(arg) ?? []), value]);
    i += 1;
  }
  return { positionals, flags };
}

const USAGE = `ledgeroot — evidence engine for agent x402 payments

Usage:
  ledgeroot verify [--db <path>] [--check-chain]
                                   Offline verification of the receipt chain + anchor
                                   --check-chain also confirms each settlement via RPC
  ledgeroot export [--db <path>]   Export the evidence bundle as JSON
  ledgeroot anchor [--db <path>]   Submit the epoch Merkle root on-chain
  ledgeroot buy <url> --mandate <id> [--method GET|POST] [--body <text>]
                                   [--header "name: value"] [--chain <id>] [--intent <text>]
                                   [--task <id>] [--request <id>] [--db <path>]
                                   Fetch a URL, pay the 402 it answers with under a mandate,
                                   and record the receipt. The mandate has to exist already —
                                   it is signed and imported through the MCP surface.
                                   Exit: 0 paid · 2 denied (nothing signed) · 3 unpaid · 1 error
  ledgeroot jwks                   Print the JWKS a third party needs to verify receipts
  ledgeroot serve                  Start the MCP server over stdio
`;

async function main(): Promise<void> {
  if (command === "serve") {
    await serveMCP();
    return;
  }

  if (command === "jwks") {
    console.log(JSON.stringify(keySet(), null, 2));
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
      case "buy": {
        const { positionals, flags } = parseArgs(args);
        const url = positionals[0];
        const mandateId = flag("--mandate");
        if (!url || !mandateId) {
          console.error(USAGE);
          process.exitCode = 1;
          break;
        }

        const headers: Record<string, string> = {};
        for (const raw of flags.get("--header") ?? []) {
          const separator = raw.indexOf(":");
          if (separator === -1) {
            console.error(`ignoring malformed --header "${raw}" (expected "name: value")`);
            continue;
          }
          headers[raw.slice(0, separator).trim()] = raw.slice(separator + 1).trim();
        }
        const body = flag("--body");
        // A JSON body is the common case, and a seller will 400 without the
        // header, so it is filled in rather than left for the caller to forget.
        if (
          body !== undefined &&
          !Object.keys(headers).some((name) => name.toLowerCase() === "content-type")
        ) {
          headers["content-type"] = "application/json";
        }

        const chain = flag("--chain");
        const result = await handleBuy(services, {
          mandateId,
          url,
          method: flag("--method"),
          headers: Object.keys(headers).length > 0 ? headers : undefined,
          body,
          intent: flag("--intent"),
          taskId: flag("--task"),
          requestId: flag("--request"),
          chainId: chain ? Number(chain) : undefined,
        });

        console.log(JSON.stringify(result, null, 2));
        // Distinct exit codes, so a shell script can tell the three outcomes
        // apart without parsing the output.
        process.exitCode = result.status === "paid" ? 0 : result.status === "denied" ? 2 : 3;
        break;
      }
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
