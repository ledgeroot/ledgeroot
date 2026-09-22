import { rmSync } from "node:fs";
import { afterEach, describe, it, expect, vi } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { LedgerootStore } from "../src/store/db.js";
import { importMandate } from "../src/tools/mandate.js";
import { signMandate } from "../src/mandate.js";
import type { LedgerootServices } from "../src/context.js";
import type { Mandate } from "../src/types.js";

const DB = "/tmp/cc-mandate-import-test.sqlite";
const LOCAL_KEY = `0x${"4".repeat(64)}`;
const FOREIGN_KEY = `0x${"5".repeat(64)}`;

function mandate(overrides: Partial<Mandate> = {}): Mandate {
  return {
    id: "m-1",
    summary: "allow 5 USDC on agent402.tools for 24h",
    issuer: "",
    counterpartyAllowlist: ["agent402.tools"],
    payTo: [],
    maxAmountPerPayment: "5",
    maxTotalAmount: "5",
    expiresAt: Math.floor(Date.now() / 1000) + 86400,
    ...overrides,
  };
}

function services() {
  const store = new LedgerootStore({ path: DB });
  return { store, services: { store } as unknown as LedgerootServices };
}

afterEach(() => {
  vi.unstubAllEnvs();
  for (const suffix of ["", "-wal", "-shm"]) {
    rmSync(DB + suffix, { force: true });
  }
});

describe("mandate import trust anchor", () => {
  it("accepts a mandate signed by the local signer", async () => {
    vi.stubEnv("LEDGEROOT_PRIVATE_KEY", LOCAL_KEY);
    const { store, services: svc } = services();
    const signed = await signMandate(mandate(), LOCAL_KEY);

    const result = await importMandate(svc, { mandate: signed });

    expect(result.imported).toBe(true);
    expect(store.getMandate("m-1")).toBeTruthy();
    store.close();
  });

  it("refuses a self-signed mandate whose issuer is not trusted", async () => {
    vi.stubEnv("LEDGEROOT_PRIVATE_KEY", LOCAL_KEY);
    const { store, services: svc } = services();
    // An attacker mints a permissive mandate with a key of its own. The
    // signature is internally valid; the issuer simply is not the user, so it
    // must not become an authorization the engine will spend against.
    const foreign = await signMandate(mandate({ id: "evil", payTo: [] }), FOREIGN_KEY);

    await expect(importMandate(svc, { mandate: foreign })).rejects.toThrow(/not a trusted issuer/);
    expect(store.getMandate("evil")).toBeNull();
    store.close();
  });

  it("accepts a foreign issuer only when it is explicitly trusted", async () => {
    vi.stubEnv("LEDGEROOT_PRIVATE_KEY", LOCAL_KEY);
    const foreignAddress = privateKeyToAccount(FOREIGN_KEY).address;
    vi.stubEnv("LEDGEROOT_TRUSTED_ISSUERS", foreignAddress.toLowerCase());
    const { store, services: svc } = services();
    const foreign = await signMandate(mandate({ id: "partner" }), FOREIGN_KEY);

    const result = await importMandate(svc, { mandate: foreign });

    expect(result.issuer.toLowerCase()).toBe(foreignAddress.toLowerCase());
    expect(store.getMandate("partner")).toBeTruthy();
    store.close();
  });

  it("refuses every import when no trust anchor is configured", async () => {
    vi.stubEnv("LEDGEROOT_PRIVATE_KEY", "");
    const { store, services: svc } = services();
    const signed = await signMandate(mandate(), LOCAL_KEY);

    await expect(importMandate(svc, { mandate: signed })).rejects.toThrow(/not a trusted issuer/);
    store.close();
  });
});
