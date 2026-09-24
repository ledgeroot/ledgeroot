import type { Hex } from "viem";
import { LedgerootStore } from "./store/db.js";
import { PolicyEngine } from "./policy/engine.js";
import { defaultPolicies } from "./policy/defaults.js";
import {
  DryRunPaymentProvider,
  FacilitatorClient,
  MONAD_FACILITATOR_URL,
  MONAD_TESTNET_X402,
} from "./x402/facilitator.js";
import { getAnchorKey, getPrivateKey, isDryRun } from "./env.js";
import { Anchorer } from "./anchor/anchorer.js";
import { anchorChain, defaultRpcUrls } from "./chains.js";
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

  const privateKey = getPrivateKey();
  const payments = isDryRun()
    ? new DryRunPaymentProvider()
    : new FacilitatorClient({
        url: process.env.LEDGEROOT_FACILITATOR_URL ?? MONAD_FACILITATOR_URL,
        network: MONAD_TESTNET_X402,
        privateKey,
      });

  const anchorAddress = process.env.LEDGEROOT_ANCHOR_ADDRESS;
  const chain = anchorChain();
  const anchorer = anchorAddress
    ? new Anchorer({
        chain,
        rpcUrl: defaultRpcUrls()[chain.id],
        contractAddress: anchorAddress as Hex,
        // Deliberately not the payment key when LEDGEROOT_ANCHOR_KEY is set:
        // anchoring can run unattended, and the loop that submits roots should
        // not be able to move funds.
        privateKey: getAnchorKey(),
      })
    : undefined;

  return { store, engine, payments, anchorer };
}
