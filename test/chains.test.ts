import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_MAINNET_RPC_URL,
  DEFAULT_RPC_URL,
  anchorChain,
  defaultRpcUrls,
  monadMainnet,
  monadTestnet,
} from "../src/chains.js";

const ENV = ["LEDGEROOT_RPC_URL", "LEDGEROOT_MAINNET_RPC_URL", "LEDGEROOT_CHAIN_ID"];

afterEach(() => {
  for (const key of ENV) delete process.env[key];
});

describe("defaultRpcUrls", () => {
  it("gives each known chain its own default RPC", () => {
    for (const key of ENV) delete process.env[key];
    expect(defaultRpcUrls()).toEqual({
      [monadTestnet.id]: DEFAULT_RPC_URL,
      [monadMainnet.id]: DEFAULT_MAINNET_RPC_URL,
    });
  });

  it("honors the per-chain overrides", () => {
    process.env.LEDGEROOT_RPC_URL = "https://testnet.example";
    process.env.LEDGEROOT_MAINNET_RPC_URL = "https://mainnet.example";
    expect(defaultRpcUrls()).toEqual({
      [monadTestnet.id]: "https://testnet.example",
      [monadMainnet.id]: "https://mainnet.example",
    });
  });
});

describe("anchorChain", () => {
  it("defaults to testnet", () => {
    delete process.env.LEDGEROOT_CHAIN_ID;
    expect(anchorChain().id).toBe(monadTestnet.id);
  });

  it("selects mainnet when LEDGEROOT_CHAIN_ID names it", () => {
    process.env.LEDGEROOT_CHAIN_ID = String(monadMainnet.id);
    expect(anchorChain().id).toBe(monadMainnet.id);
  });
});
