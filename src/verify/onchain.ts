import { createPublicClient, decodeFunctionData, http, parseAbi, type Hex } from "viem";
import type { Receipt } from "../types.js";
import { SETTLEMENT_PROTOCOL_X402 } from "../types.js";
import { fromUnits, toUnits } from "../decimal.js";
import { MONAD_MAINNET_X402, MONAD_TESTNET_X402 } from "../x402/facilitator.js";
import { incomplete, tampered, type Issue } from "./verifier.js";

const transferWithAuthorizationAbi = parseAbi([
  "function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)",
]);

/**
 * The on-chain facts a settlement check needs, kept separate from how they are
 * fetched so the check itself can be exercised without a node.
 */
export interface OnChainSettlement {
  /** Contract the transaction called. */
  to: string | null;
  success: boolean;
  /** Decoded ERC-3009 authorization, or null if the call was something else. */
  authorization: { from: string; to: string; value: bigint } | null;
}

/**
 * Resolves a settlement transaction on the chain the receipt names. Returns null
 * when the chain has no such transaction; throws when the chain could not be
 * reached, so an unreachable node is reported as missing evidence rather than as
 * a missing transaction.
 */
export type SettlementReader = (
  txHash: string,
  chainId: number,
) => Promise<OnChainSettlement | null>;

/** USDC contracts Ledgeroot knows how to check settlements against, by chain. */
const USDC_BY_CHAIN: Record<number, string> = {
  [MONAD_TESTNET_X402.chainId]: MONAD_TESTNET_X402.usdcAddress,
  [MONAD_MAINNET_X402.chainId]: MONAD_MAINNET_X402.usdcAddress,
};

function decodeAuthorization(input: Hex): OnChainSettlement["authorization"] {
  try {
    const { args } = decodeFunctionData({ abi: transferWithAuthorizationAbi, data: input });
    const [from, to, value] = args as readonly [string, string, bigint, ...unknown[]];
    return { from, to, value };
  } catch {
    return null;
  }
}

/**
 * Read settlement transactions from an EVM node over JSON-RPC, one client per
 * chain, created on first use.
 *
 * The reader is keyed by chain because a ledger can hold receipts from more than
 * one: the same `txHash` on a different chain is a different transaction, so the
 * chain a receipt records has to choose the node rather than a single endpoint
 * fixed before the run.
 */
export function createSettlementReader(rpcUrls: Record<number, string>): SettlementReader {
  const clients = new Map<number, ReturnType<typeof createPublicClient>>();

  return async (txHash, chainId) => {
    const hash = txHash as Hex;
    try {
      const rpcUrl = rpcUrls[chainId];
      if (!rpcUrl) throw new Error(`no RPC configured for chain ${chainId}`);
      let client = clients.get(chainId);
      if (!client) {
        client = createPublicClient({ transport: http(rpcUrl) });
        clients.set(chainId, client);
      }
      const [tx, receipt] = await Promise.all([
        client.getTransaction({ hash }),
        client.getTransactionReceipt({ hash }),
      ]);
      return {
        to: tx.to,
        success: receipt.status === "success",
        authorization: decodeAuthorization(tx.input),
      };
    } catch (error) {
      if (error instanceof Error && error.name === "TransactionNotFoundError") return null;
      throw error;
    }
  };
}

/**
 * Check one receipt's recorded settlement against the chain: the transaction
 * exists, succeeded, called the USDC contract, and moved the amount the receipt
 * claims from the recorded payer to the recorded payee.
 */
export async function checkSettlement(
  receipt: Receipt,
  read: SettlementReader,
): Promise<Issue[]> {
  const { protocol, txHash, chainId, payer } = receipt.segments.tx;

  // This reader only knows how to resolve an EVM transaction. A receipt settled
  // by some other protocol is not thereby suspect — MPP batches many requests
  // into one on-chain settlement, and its card rail touches no chain at all —
  // it just is not something this check can confirm, which is missing evidence
  // rather than a mismatch.
  if (protocol !== undefined && protocol !== SETTLEMENT_PROTOCOL_X402) {
    return [
      incomplete(`receipt ${receipt.id}: no on-chain settlement check for protocol "${protocol}"`),
    ];
  }

  if (!txHash || chainId === undefined) {
    return [incomplete(`receipt ${receipt.id}: no settlement transaction recorded`)];
  }

  const usdc = USDC_BY_CHAIN[chainId];
  if (!usdc) {
    return [incomplete(`receipt ${receipt.id}: no known settlement contract for chain ${chainId}`)];
  }

  let settlement: OnChainSettlement | null;
  try {
    settlement = await read(txHash, chainId);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return [incomplete(`receipt ${receipt.id}: could not read ${txHash} (${reason})`)];
  }

  if (!settlement) {
    return [tampered(`receipt ${receipt.id}: transaction ${txHash} is not on chain ${chainId}`)];
  }

  const issues: Issue[] = [];
  if (!settlement.success) {
    issues.push(tampered(`receipt ${receipt.id}: settlement transaction reverted`));
  }
  if (settlement.to?.toLowerCase() !== usdc.toLowerCase()) {
    issues.push(tampered(`receipt ${receipt.id}: transaction did not call USDC (${usdc})`));
    return issues;
  }
  if (!settlement.authorization) {
    issues.push(tampered(`receipt ${receipt.id}: call is not a transferWithAuthorization`));
    return issues;
  }

  const { authorization } = settlement;
  const payTo = receipt.segments.plan.quote.payTo;
  if (typeof payTo === "string" && authorization.to.toLowerCase() !== payTo.toLowerCase()) {
    issues.push(tampered(`receipt ${receipt.id}: settled to ${authorization.to}, receipt says ${payTo}`));
  }
  if (receipt.amount && authorization.value !== toUnits(receipt.amount)) {
    issues.push(
      tampered(
        `receipt ${receipt.id}: settled ${fromUnits(authorization.value)} but receipt says ${receipt.amount}`,
      ),
    );
  }
  if (payer && authorization.from.toLowerCase() !== payer.toLowerCase()) {
    issues.push(tampered(`receipt ${receipt.id}: authorized from ${authorization.from}, receipt says ${payer}`));
  }

  return issues;
}

/** Check the settlement of every paid receipt in the ledger. */
export async function checkSettlements(
  receipts: Receipt[],
  read: SettlementReader,
): Promise<Issue[]> {
  const paid = receipts.filter((receipt) => receipt.status === "paid");
  const results = await Promise.all(paid.map((receipt) => checkSettlement(receipt, read)));
  return results.flat();
}
