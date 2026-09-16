import type { Hex } from "viem";
import { LedgerootStore } from "./store/db.js";
import { PolicyEngine } from "./policy/engine.js";
import { defaultPolicies } from "./policy/defaults.js";
import { FacilitatorClient } from "./x402/facilitator.js";
import { Anchorer } from "./anchor/anchorer.js";
import { DEFAULT_RPC_URL, monadTestnet } from "./chains.js";
import type { LedgerootServices } from "./context.js";

export interface BootstrapOptions {
  dbPath?: string;
}

/** Build the full service graph from environment configuration. */
export function createServices(options: BootstrapOptions = {}): LedgerootServices {
  const store = new LedgerootStore({
    path: options.dbPath ?? process.env.LEDGEROOT_DB ?? "ledgeroot.sqlite",
  });

  const engine = new PolicyEngine();
  for (const policy of defaultPolicies()) {
    engine.register(policy);
  }

  const payments = new FacilitatorClient(process.env.LEDGEROOT_FACILITATOR_URL);

  const anchorAddress = process.env.LEDGEROOT_ANCHOR_ADDRESS;
  const anchorer = anchorAddress
    ? new Anchorer({
        chain: monadTestnet,
        rpcUrl: process.env.LEDGEROOT_RPC_URL ?? DEFAULT_RPC_URL,
        contractAddress: anchorAddress as Hex,
        privateKey: process.env.LEDGEROOT_PRIVATE_KEY,
      })
    : undefined;

  return { store, engine, payments, anchorer };
}
