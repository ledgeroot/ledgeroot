import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { pathToFileURL } from "node:url";
import { getAnchorKey, loadEnv } from "../src/env.js";
import { anchorChain, defaultRpcUrls } from "../src/chains.js";
import { anchorAbi } from "../src/anchor/anchorer.js";

loadEnv();

const chain = anchorChain();

/**
 * Deployment configuration for the chain `LEDGEROOT_CHAIN_ID` selects — Monad
 * testnet by default, mainnet when set to 143 — with its matching RPC.
 */
export const monad = {
  name: chain.name,
  chain,
  rpcUrl: defaultRpcUrls()[chain.id],
  anchorContract: (process.env.LEDGEROOT_ANCHOR_ADDRESS ?? "") as Hex,
  anchorAbi,
};

/**
 * A private key is a 32-byte hex string. `.env.example` ships `0x...` as a
 * placeholder for both of the keys used here, and viem's own complaint about it
 * ("invalid private key, expected hex or 32 bytes") does not say which variable
 * to go and fix.
 */
function privateKeyFromEnv(name: string): Hex {
  return requireHexKey(process.env[name], name);
}

function requireHexKey(value: string | undefined, name: string): Hex {
  const body = value?.startsWith("0x") ? value.slice(2) : (value ?? "");
  if (!/^[0-9a-fA-F]{64}$/.test(body)) {
    throw new Error(
      `${name} is not a 32-byte hex key (is it still the placeholder from .env.example?)`,
    );
  }
  return value as Hex;
}

/**
 * The contract owner is the wallet that anchors, so it has to be derived the
 * same way the Anchorer is configured — `getAnchorKey()`, which prefers
 * `LEDGEROOT_ANCHOR_KEY` and falls back to the payment key.
 *
 * Deriving it from `LEDGEROOT_PRIVATE_KEY` unconditionally (as this did) would
 * deploy a contract the configured anchoring key cannot write to, and the first
 * anchor would revert `NotOwner`. The owner is not the deployer because that is
 * the point of the split — the two keys are separate variables.
 */
function resolveOwner(): Hex {
  return privateKeyToAccount(
    requireHexKey(getAnchorKey(), "LEDGEROOT_ANCHOR_KEY (or LEDGEROOT_PRIVATE_KEY)"),
  ).address;
}

/** Deploy the LedgerootAnchor contract. Bytecode comes from `forge build`. */
export async function deployAnchor(bytecode: Hex, owner: Hex): Promise<Hex> {
  const account = privateKeyToAccount(privateKeyFromEnv("LEDGEROOT_DEPLOYER_PRIVATE_KEY"));
  const wallet = createWalletClient({
    account,
    chain: monad.chain,
    transport: http(monad.rpcUrl),
  });
  const hash = await wallet.deployContract({ abi: monad.anchorAbi, bytecode, args: [owner] });
  // deployContract resolves to the transaction hash, so the address only exists
  // once the receipt lands. Returning the hash here printed a 32-byte value
  // where the caller expects a contract address.
  const receipt = await createPublicClient({
    chain: monad.chain,
    transport: http(monad.rpcUrl),
  }).waitForTransactionReceipt({ hash });
  if (!receipt.contractAddress) {
    throw new Error(`deployment ${hash} produced no contract address (status ${receipt.status})`);
  }
  return receipt.contractAddress;
}

function readFoundryBytecode(): Hex | undefined {
  try {
    const artifact = JSON.parse(
      readFileSync("contracts/out/LedgerootAnchor.sol/LedgerootAnchor.json", "utf8"),
    ) as { bytecode?: { object?: string } };
    const object = artifact.bytecode?.object;
    if (!object) return undefined;
    // forge ships `object` already 0x-prefixed here, so prefixing unconditionally
    // produced "0x0x..." and the node rejected the gas estimate.
    return (object.startsWith("0x") ? object : `0x${object}`) as Hex;
  } catch {
    return undefined;
  }
}

/**
 * `.env.example` ships `LEDGEROOT_ANCHOR_BYTECODE=0x...` as a placeholder, and
 * the old `??` read took it as set -- the deploy would have sent the literal
 * string "0x..." instead of the artifact from `forge build`. Anything that is
 * not actually hex counts as absent.
 */
function configuredBytecode(): Hex | undefined {
  const value = process.env.LEDGEROOT_ANCHOR_BYTECODE;
  return value && /^0x[0-9a-fA-F]+$/.test(value) ? (value as Hex) : undefined;
}

async function main(): Promise<void> {
  const bytecode = configuredBytecode() ?? readFoundryBytecode();
  if (!bytecode) {
    console.log(
      "Run `forge build` first (or set LEDGEROOT_ANCHOR_BYTECODE) and set LEDGEROOT_DEPLOYER_PRIVATE_KEY to deploy.",
    );
    return;
  }
  const owner = resolveOwner();
  const address = await deployAnchor(bytecode, owner);
  console.log(JSON.stringify({ network: monad.name, address, owner }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
