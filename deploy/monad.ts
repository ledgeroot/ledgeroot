import { readFileSync } from "node:fs";
import { createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { pathToFileURL } from "node:url";
import { DEFAULT_RPC_URL, monadTestnet } from "../src/chains.js";
import { anchorAbi } from "../src/anchor/anchorer.js";

/** Monad testnet deployment configuration. */
export const monad = {
  name: "monad",
  chain: monadTestnet,
  rpcUrl: process.env.LEDGEROOT_RPC_URL ?? DEFAULT_RPC_URL,
  anchorContract: (process.env.LEDGEROOT_ANCHOR_ADDRESS ?? "") as Hex,
  anchorAbi,
};

/** Deploy the LedgerootAnchor contract. Bytecode comes from `forge build`. */
export async function deployAnchor(bytecode: Hex): Promise<Hex> {
  const privateKey = process.env.LEDGEROOT_DEPLOYER_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("LEDGEROOT_DEPLOYER_PRIVATE_KEY is not set");
  }
  const account = privateKeyToAccount(privateKey as Hex);
  const wallet = createWalletClient({
    account,
    chain: monadTestnet,
    transport: http(monad.rpcUrl),
  });
  return wallet.deployContract({ abi: monad.anchorAbi, bytecode });
}

function readFoundryBytecode(): Hex | undefined {
  try {
    const artifact = JSON.parse(
      readFileSync("contracts/out/LedgerootAnchor.sol/LedgerootAnchor.json", "utf8"),
    ) as { bytecode?: { object?: string } };
    return artifact.bytecode?.object ? (`0x${artifact.bytecode.object}` as Hex) : undefined;
  } catch {
    return undefined;
  }
}

async function main(): Promise<void> {
  const bytecode = (process.env.LEDGEROOT_ANCHOR_BYTECODE ??
    readFoundryBytecode()) as Hex | undefined;
  if (!bytecode) {
    console.log(
      "Run `forge build` first (or set LEDGEROOT_ANCHOR_BYTECODE) and set LEDGEROOT_DEPLOYER_PRIVATE_KEY to deploy.",
    );
    return;
  }
  const address = await deployAnchor(bytecode);
  console.log(JSON.stringify({ network: monad.name, address }, null, 2));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
