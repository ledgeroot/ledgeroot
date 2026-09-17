import { rmSync } from "node:fs";
import { afterEach, describe, it, expect, vi } from "vitest";
import { LedgerootStore } from "../src/store/db.js";
import { mandateSign, type MandateSignInput } from "../src/tools/mandate.js";
import { verifyMandateSignature } from "../src/mandate.js";
import type { LedgerootServices } from "../src/context.js";

const DB = "/tmp/cc-mandate-sign-test.sqlite";
const KEY = `0x${"3".repeat(64)}`;

function input(overrides: Partial<MandateSignInput> = {}): MandateSignInput {
  return {
    summary: "allow 5 USDC on xapi.to for 24h",
    counterpartyAllowlist: ["xapi.to"],
    payTo: [],
    maxAmountPerPayment: "5",
    maxTotalAmount: "5",
    expiresAt: Math.floor(Date.now() / 1000) + 86400,
    ...overrides,
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
  for (const suffix of ["", "-wal", "-shm"]) {
    rmSync(DB + suffix, { force: true });
  }
});

describe("mandateSign tool", () => {
  it("signs and stores a mandate with the local key", async () => {
    vi.stubEnv("LEDGEROOT_PRIVATE_KEY", KEY);
    const store = new LedgerootStore({ path: DB });
    const services = { store } as unknown as LedgerootServices;

    const result = await mandateSign(services, input());

    expect(result.mandateId).toBeTruthy();
    expect(result.issuer).not.toBe("");
    expect(result.summary).toBe("allow 5 USDC on xapi.to for 24h");

    const stored = store.getMandate(result.mandateId);
    expect(stored).toBeTruthy();
    expect((await verifyMandateSignature(stored!)).valid).toBe(true);

    store.close();
  });

  it("throws without a signer key", async () => {
    vi.stubEnv("LEDGEROOT_PRIVATE_KEY", "");
    const store = new LedgerootStore({ path: DB });
    const services = { store } as unknown as LedgerootServices;

    await expect(mandateSign(services, input())).rejects.toThrow("LEDGEROOT_PRIVATE_KEY");
    store.close();
  });
});
