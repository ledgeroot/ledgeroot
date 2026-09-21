import { rmSync } from "node:fs";
import { afterEach, describe, it, expect, vi } from "vitest";
import { LedgerootStore } from "../src/store/db.js";
import { handlePay } from "../src/tools/pay.js";
import { contentHash, canonicalHash } from "../src/receipt/hashchain.js";
import { PolicyEngine } from "../src/policy/engine.js";
import { defaultPolicies } from "../src/policy/defaults.js";
import { testQuote } from "./support.js";
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
    quote: testQuote({ payTo: "0x35DA8C7a8d2253354925354b436A0422B9618dE4", amount: "0.1" }),
    amount: "0.1",
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

describe("unrecorded payment attempts", () => {
  const intent = {
    startedAt: 1,
    mandateId: "m-1",
    counterparty: "agent402.tools",
    endpoint: "/search",
    payTo: "0x35DA8C7a8d2253354925354b436A0422B9618dE4",
    amount: "0.1",
  };

  it("refuses to spend against a requestId whose earlier attempt was never recorded", async () => {
    const store = new LedgerootStore({ path: DB });
    store.upsertMandate(mandate());
    const svc = makeServices(store);

    // What a crash between settling and recording leaves behind: the claim, and
    // no receipt. Whether that payment settled cannot be known from here, so
    // the only safe move is to not pay a second time.
    store.beginPaymentIntent("req-crash", intent);

    const result = await handlePay(svc, payInput({ requestId: "req-crash" }));

    expect(result.status).toBe("denied");
    expect(result.reason).toContain("never recorded");
    expect(svc.pay).not.toHaveBeenCalled();
    // The refusal is itself on the record.
    expect(store.getReceipt(result.receiptId)?.status).toBe("denied");

    store.close();
  });

  it("releases the claim once the outcome is recorded", async () => {
    const store = new LedgerootStore({ path: DB });
    store.upsertMandate(mandate());
    const svc = makeServices(store);

    const first = await handlePay(svc, payInput({ requestId: "req-ok" }));
    expect(first.status).toBe("paid");
    expect(store.getPaymentIntent("req-ok")).toBeNull();

    // Claim released and receipt written, so a retry replays rather than
    // refuses: a successful attempt does not burn the requestId.
    const second = await handlePay(svc, payInput({ requestId: "req-ok" }));
    expect(second).toMatchObject({ status: "paid", deduplicated: true });
    expect(svc.pay).toHaveBeenCalledTimes(1);

    store.close();
  });

  it("keeps the claim when the rail throws, because the outcome is unknown", async () => {
    const store = new LedgerootStore({ path: DB });
    store.upsertMandate(mandate());
    const svc = makeServices(store);
    svc.pay.mockRejectedValueOnce(new Error("facilitator /settle timed out after 30000ms"));

    await expect(handlePay(svc, payInput({ requestId: "req-threw" }))).rejects.toThrow(/timed out/);

    // A failed call is not the same as a payment that did not happen: the
    // settle response may simply have been lost. Keeping the claim is the
    // conservative side of that, and it means a retry refuses rather than
    // risking a second payment. The cost is a requestId that needs a human to
    // clear when the rail genuinely rejected, which is the cheaper mistake.
    expect(store.getPaymentIntent("req-threw")).not.toBeNull();

    const retry = await handlePay(svc, payInput({ requestId: "req-threw" }));
    expect(retry).toMatchObject({ status: "denied" });
    expect(svc.pay).toHaveBeenCalledTimes(1);

    store.close();
  });

  it("claims nothing when the caller passes no requestId", async () => {
    const store = new LedgerootStore({ path: DB });
    store.upsertMandate(mandate());
    const svc = makeServices(store);

    const result = await handlePay(svc, payInput({}));
    expect(result.status).toBe("paid");
    expect(store.listReceipts()).toHaveLength(1);

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
      protocol: "x402",
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

  it("records the quote whole and commits to it by hash", async () => {
    const receipt = await payWith({});
    const { quote, quoteHash } = receipt!.segments.plan;
    // The quote is stored as the seller sent it, and the hash is recomputable
    // from the receipt — which is what lets a verifier notice a swapped quote
    // instead of taking the hash's word for it.
    expect(quote).toMatchObject({
      payTo: "0x35DA8C7a8d2253354925354b436A0422B9618dE4",
      amount: "0.1",
    });
    expect(quoteHash).toBe(canonicalHash(quote));
  });

  it("enforces policy against the quote, not against a caller-supplied payTo", async () => {
    const store = new LedgerootStore({ path: DB });
    store.upsertMandate(mandate());
    const svc = makeServices(store);

    // The mandate binds 0x35DA…; the quote asks for somewhere else. Nothing
    // else in the call says so, because the quote is the only source of payTo.
    const result = await handlePay(
      svc,
      payInput({
        quote: testQuote({ payTo: `0x${"9".repeat(40)}`, amount: "0.1" }),
      }),
    );

    expect(result.status).toBe("denied");
    expect(result.reason).toMatch(/not bound by the mandate/);
    expect(svc.pay).not.toHaveBeenCalled();
    store.close();
  });

  it("refuses a quote it cannot read rather than recording a payment nobody can check", async () => {
    const store = new LedgerootStore({ path: DB });
    store.upsertMandate(mandate());
    const svc = makeServices(store);

    await expect(handlePay(svc, payInput({ quote: { amount: "0.1" } }))).rejects.toThrow(
      /quote\.payTo/,
    );
    await expect(handlePay(svc, payInput({ quote: { payTo: `0x${"1".repeat(40)}` } }))).rejects.toThrow(
      /quote\.amount/,
    );
    expect(store.listReceipts()).toHaveLength(0);
    store.close();
  });
});
