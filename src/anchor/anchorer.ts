import {
  createPublicClient,
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
    type: "constructor",
    stateMutability: "nonpayable",
    inputs: [{ name: "initialOwner", type: "address" }],
  },
  {
    type: "function",
    name: "anchor",
    stateMutability: "nonpayable",
    inputs: [{ name: "root", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "lastEpoch",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
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

  /**
   * The contract's current epoch counter.
   *
   * The contract owns this sequence — it increments on every anchor — so this
   * value is the epoch of the most recent anchor, and the next one becomes this
   * plus one. A local counter cannot stand in for it: a fresh database would
   * label its first anchor "epoch 1" no matter how far along the contract is.
   */
  async currentEpoch(): Promise<number> {
    const client = createPublicClient({
      chain: this.config.chain,
      transport: http(this.config.rpcUrl),
    });
    const epoch = await client.readContract({
      address: this.config.contractAddress,
      abi: anchorAbi,
      functionName: "lastEpoch",
    });
    return Number(epoch);
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
    // `root` is produced by node:crypto as unprefixed hex ("888d..."); viem
    // requires a 0x-prefixed hex string to encode it as bytes32.
    const rootHex = (root.startsWith("0x") ? root : `0x${root}`) as Hex;
    const txHash = await wallet.writeContract({
      address: this.config.contractAddress,
      abi: anchorAbi,
      functionName: "anchor",
      args: [rootHex],
    });

    // Wait for inclusion. `writeContract` resolves when the transaction is
    // broadcast, not when it is mined, and the epoch counter only moves in the
    // mined transaction — so a caller that reads it straight back would get the
    // pre-anchor value. Waiting also turns a reverted write into an error
    // instead of an anchor that is recorded locally but never happened.
    const client = createPublicClient({
      chain: this.config.chain,
      transport: http(this.config.rpcUrl),
    });
    const receipt = await client.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") {
      throw new Error(`anchor transaction ${txHash} reverted`);
    }
    return txHash;
  }
}
