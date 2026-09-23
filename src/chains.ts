import { defineChain, type Chain } from "viem";

/**
 * Monad Testnet (chainId 10143).
 *
 * The RPC URL is the default used by the demo and is overridable at runtime
 * via `LEDGEROOT_RPC_URL`. Confirm the exact endpoint against monad.xyz
 * before a public demo.
 */
export const monadTestnet = defineChain({
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://testnet-rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "Monad Testnet Explorer",
      url: "https://testnet.monadexplorer.com",
    },
  },
  testnet: true,
});

export const DEFAULT_RPC_URL = "https://testnet-rpc.monad.xyz";

/**
 * Monad mainnet (chainId 143).
 *
 * The same rail as testnet with real money. The `buy` path already knew this
 * network, but nothing could read a mainnet settlement, so a mainnet receipt
 * verified as `incomplete` even when it was genuine.
 */
export const monadMainnet = defineChain({
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.monad.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "Monad Explorer",
      url: "https://monadexplorer.com",
    },
  },
});

export const DEFAULT_MAINNET_RPC_URL = "https://rpc.monad.xyz";

/** The chain the anchorer targets unless `LEDGEROOT_CHAIN_ID` overrides it. */
export const DEFAULT_CHAIN_ID = monadTestnet.id;

/**
 * The RPC to read each known chain from, honoring the per-chain environment
 * overrides.
 *
 * A receipt records its own `chainId`, so a verifier has to reach whichever
 * chain each receipt settled on rather than a single chain chosen before the
 * run. Testnet keeps `LEDGEROOT_RPC_URL`; mainnet is
 * `LEDGEROOT_MAINNET_RPC_URL`.
 */
export function defaultRpcUrls(): Record<number, string> {
  return {
    [monadTestnet.id]: process.env.LEDGEROOT_RPC_URL ?? DEFAULT_RPC_URL,
    [monadMainnet.id]: process.env.LEDGEROOT_MAINNET_RPC_URL ?? DEFAULT_MAINNET_RPC_URL,
  };
}

/** The chain to anchor on: testnet by default, mainnet when selected. */
export function anchorChain(): Chain {
  return Number(process.env.LEDGEROOT_CHAIN_ID ?? DEFAULT_CHAIN_ID) === monadMainnet.id
    ? monadMainnet
    : monadTestnet;
}
