import { defineChain } from "viem";

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
