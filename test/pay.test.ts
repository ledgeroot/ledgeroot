import { rmSync } from "node:fs";
import { afterEach, describe, it, expect, vi } from "vitest";
import { LedgerootStore } from "../src/store/db.js";
import { handlePay } from "../src/tools/pay.js";
import { contentHash } from "../src/receipt/hashchain.js";
import { PolicyEngine } from "../src/policy/engine.js";
import { defaultPolicies } from "../src/policy/defaults.js";
import type { Mandate } from "../src/types.js";
import type { LedgerootServices } from "../src/context.js";

const DB = "/tmp/cc-pay-test.sqlite";

function mandate(overrides: Partial<Mandate> = {}): Mandate {
  return {
    id: "m-1",
    summary: "allow up to 1 USDC per call to agent402.tools",
    issuer: "0xissuer",
    counterpartyAllowlist: ["agent402.tools"],
    payTo: ["0x35DA8C7a8d2253354925354b436A0422B9618dE4"],
    maxAmountPerPayment: "1",
    maxTotalAmount: "10",
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
}

function makeServices(store: LedgerootStore) {
  const engine = new PolicyEngine();
  for (const policy of defaultPolicies()) engine.register(policy);
  const pay = vi.fn(async () => ({
    txHash: "0xsettlementtx",
    chainId: 10143,
    payer: "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A",
  }));
  return {
    store,
    engine,
    payments: { pay },
    pay,
  } as unknown as LedgerootServices & { pay: typeof pay };
}

function payInput(overrides: Record<string, unknown> = {}) {
  return {
    intent: "buy data",
    mandateId: "m-1",
    counterparty: "agent402.tools",
    payTo: "0x35DA8C7a8d2253354925354b436A0422B9618dE4",
    amount: "0.1",
    quoteAmount: "0.1",
    quoteHash: "0x",
    endpoint: "/search",
    ...overrides,
  };
}

afterEach(() => {
  for (const suffix of ["", "-wal", "-shm"]) {
    rmSync(DB + suffix, { force: true });
  }
});

describe("handlePay idempotency and taskId", () => {
  it("replays the existing receipt for the same requestId instead of re-paying", async () => {
    const store = new LedgerootStore({ path: DB });
    store.upsertMandate(mandate());
    const svc = makeServices(store);

    const first = await handlePay(svc, payInput({ requestId: "req-1" }));
    const second = await handlePay(svc, payInput({ requestId: "req-1" }));

    expect(first.status).toBe("paid");
    expect(second).toMatchObject({
      status: "paid",
      receiptId: first.receiptId,
      deduplicated: true,
    });
    expect(svc.pay).toHaveBeenCalledTimes(1);
    expect(store.listReceipts()).toHaveLength(1);

    store.close();
  });

  it("stores taskId and filters receipts by it", async () => {
    const store = new LedgerootStore({ path: DB });
    store.upsertMandate(mandate());
    const svc = makeServices(store);

    const result = await handlePay(svc, payInput({ taskId: "task-a" }));
    const receipt = store.getReceipt(result.receiptId);
    expect(receipt?.taskId).toBe("task-a");

    const byTask = store.listReceipts({ taskId: "task-a" });
    expect(byTask).toHaveLength(1);
    expect(byTask[0].id).toBe(result.receiptId);

    store.close();
  });
});

describe("receipt segments", () => {
  async function payWith(input: Record<string, unknown>) {
    const store = new LedgerootStore({ path: DB });
    store.upsertMandate(mandate());
    const result = await handlePay(makeServices(store), payInput(input));
    const receipt = store.getReceipt(result.receiptId);
    store.close();
    return receipt;
  }

  it("records the settlement transaction and its payer", async () => {
    const receipt = await payWith({});
    expect(receipt?.segments.tx).toEqual({
      txHash: "0xsettlementtx",
      chainId: 10143,
      payer: "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A",
    });
  });

  it("records the hash and size of the reported response body", async () => {
    const body = JSON.stringify({ result: "42" });
    const receipt = await payWith({ responseBody: body });

    expect(receipt?.segments.delivery).toEqual({
      payloadHash: contentHash(body),
      payloadSize: Buffer.byteLength(body, "utf8"),
    });
    // Segment 6 describes the payload, not the payment. The transaction hash
    // belongs to segment 5.
    expect(receipt?.segments.delivery.payloadHash).not.toBe(receipt?.segments.tx.txHash);
  });

  it("leaves delivery empty when the caller reports no response body", async () => {
    const receipt = await payWith({});
    expect(receipt?.segments.delivery).toEqual({});
  });

  it("changes the delivery hash when the body changes", async () => {
    const first = await payWith({ responseBody: "{}" });
    const second = await payWith({ responseBody: '{"a":1}' });
    expect(first?.segments.delivery.payloadHash).not.toBe(
      second?.segments.delivery.payloadHash,
    );
  });
});
