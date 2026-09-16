import {
  createWalletClient,
  http,
  type Account,
  type Chain,
  type Hex,
  type Transport,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { Receipt } from "../types.js";
import { merkleRoot } from "./merkle.js";

/** Compute the epoch Merkle root over a set of receipt hashes. */
export function epochRoot(receipts: Receipt[]): string {
  return merkleRoot(receipts.map((r) => r.receiptHash));
}

export const anchorAbi = [
  {
    type: "function",
    name: "anchor",
    stateMutability: "nonpayable",
    inputs: [{ name: "root", type: "bytes32" }],
    outputs: [],
  },
] as const;

export interface AnchorConfig {
  chain: Chain;
  rpcUrl: string;
  contractAddress: Hex;
  /** Signing key for the anchoring wallet. Never leaves this machine. */
  privateKey?: string;
}

/**
 * Submits epoch Merkle roots to the LedgerootAnchor contract.
 * When no private key is configured, anchoring is offline-only.
 */
export class Anchorer {
  constructor(private readonly config: AnchorConfig) {}

  get enabled(): boolean {
    return Boolean(this.config.privateKey);
  }

  async anchor(root: string): Promise<Hex> {
    if (!this.config.privateKey) {
      throw new Error("no private key configured; anchoring is offline-only");
    }
    const account: Account = privateKeyToAccount(this.config.privateKey as Hex);
    const wallet = createWalletClient<Transport, Chain, Account>({
      account,
      chain: this.config.chain,
      transport: http(this.config.rpcUrl),
    });
    return wallet.writeContract({
      address: this.config.contractAddress,
      abi: anchorAbi,
      functionName: "anchor",
      args: [root as Hex],
    });
  }
}
