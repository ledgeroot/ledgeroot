import { describe, it, expect } from "vitest";
import {
  checkSettlement,
  checkSettlements,
  type OnChainSettlement,
  type SettlementReader,
} from "../src/verify/onchain.js";
import { buildReceipt } from "../src/receipt/builder.js";
import { toUnits } from "../src/decimal.js";
import { MONAD_TESTNET_X402 } from "../src/x402/facilitator.js";
import type { Receipt, ReceiptSegments } from "../src/types.js";

const USDC = MONAD_TESTNET_X402.usdcAddress;
const CHAIN = MONAD_TESTNET_X402.chainId;
const PAY_TO = "0x35DA8C7a8d2253354925354b436A0422B9618dE4";
const PAYER = "0x19E7E376E7C213B7E7e7e46cc70A5dD086DAff2A";
const TX = `0x${"a".repeat(64)}`;

function paidReceipt(
  overrides: {
    amount?: string;
    payTo?: string;
    tx?: ReceiptSegments["tx"];
  } = {},
): Receipt {
  const segments: ReceiptSegments = {
    intent: { text: "buy data", timestamp: 1 },
    mandate: { mandateId: "m-1", issuer: "0xissuer", policyIntersection: [] },
    plan: {
      quoteHash: "0xquote",
      quote: { amount: "0.1", payTo: overrides.payTo ?? PAY_TO, endpoint: "/search" },
    },
    call: { policyResults: [] },
    tx: overrides.tx ?? { txHash: TX, chainId: CHAIN, payer: PAYER },
    delivery: {},
  };
  return buildReceipt({ status: "paid", amount: overrides.amount ?? "0.1", segments });
}

function authorized(
  overrides: Partial<{ from: string; to: string; value: bigint }> = {},
): OnChainSettlement {
  return {
    to: USDC,
    success: true,
    authorization: {
      from: overrides.from ?? PAYER,
      to: overrides.to ?? PAY_TO,
      value: overrides.value ?? toUnits("0.1"),
    },
  };
}

const reader = (settlement: OnChainSettlement | null): SettlementReader => async () => settlement;

const has = (issues: { kind: string; message: string }[], pattern: RegExp) =>
  issues.some((issue) => pattern.test(issue.message));

describe("checkSettlement", () => {
  it("accepts a settlement the chain agrees with", async () => {
    expect(await checkSettlement(paidReceipt(), reader(authorized()))).toEqual([]);
  });

  it("rejects a transaction the chain does not have", async () => {
    const issues = await checkSettlement(paidReceipt(), reader(null));
    expect(issues[0]).toMatchObject({ kind: "tampered" });
    expect(has(issues, /is not on chain/)).toBe(true);
  });

  it("rejects a reverted transaction", async () => {
    const issues = await checkSettlement(paidReceipt(), reader({ ...authorized(), success: false }));
    expect(has(issues, /reverted/)).toBe(true);
  });

  it("rejects a transaction that did not call the USDC contract", async () => {
    const issues = await checkSettlement(paidReceipt(), reader({ ...authorized(), to: PAY_TO }));
    expect(has(issues, /did not call USDC/)).toBe(true);
  });

  it("rejects a call that is not a transferWithAuthorization", async () => {
    const issues = await checkSettlement(
      paidReceipt(),
      reader({ ...authorized(), authorization: null }),
    );
    expect(has(issues, /not a transferWithAuthorization/)).toBe(true);
  });

  it("rejects a settlement to an address the receipt does not name", async () => {
    const issues = await checkSettlement(
      paidReceipt(),
      reader(authorized({ to: `0x${"b".repeat(40)}` })),
    );
    expect(has(issues, /settled to/)).toBe(true);
  });

  it("rejects a settlement for an amount the receipt does not claim", async () => {
    const issues = await checkSettlement(paidReceipt(), reader(authorized({ value: toUnits("9") })));
    expect(has(issues, /settled 9 but receipt says 0.1/)).toBe(true);
  });

  it("rejects a settlement authorized from another address", async () => {
    const issues = await checkSettlement(
      paidReceipt(),
      reader(authorized({ from: `0x${"c".repeat(40)}` })),
    );
    expect(has(issues, /authorized from/)).toBe(true);
  });

  it("treats an unreachable node as missing evidence, not tampering", async () => {
    const unreachable: SettlementReader = async () => {
      throw new Error("ECONNREFUSED");
    };
    const issues = await checkSettlement(paidReceipt(), unreachable);
    expect(issues[0]).toMatchObject({ kind: "incomplete" });
    expect(has(issues, /could not read/)).toBe(true);
  });

  it("reports a paid receipt with no transaction as incomplete", async () => {
    const issues = await checkSettlement(paidReceipt({ tx: {} }), reader(authorized()));
    expect(issues).toEqual([expect.objectContaining({ kind: "incomplete" })]);
  });

  it("does not claim to check a settlement protocol it has no reader for", async () => {
    const receipt = paidReceipt({
      tx: { protocol: "mpp", txHash: TX, chainId: CHAIN, payer: PAYER },
    });
    // The reader would happily confirm this transaction. The check is skipped on
    // protocol grounds, not because the chain disagreed — and a protocol we
    // cannot read is missing evidence, never a pass.
    const issues = await checkSettlement(receipt, reader(authorized()));
    expect(issues).toEqual([expect.objectContaining({ kind: "incomplete" })]);
    expect(has(issues, /no on-chain settlement check for protocol "mpp"/)).toBe(true);
  });

  it("cannot check a chain it has no settlement contract for", async () => {
    const receipt = paidReceipt({ tx: { txHash: TX, chainId: 999, payer: PAYER } });
    const issues = await checkSettlement(receipt, reader(authorized()));
    expect(issues[0]).toMatchObject({ kind: "incomplete" });
    expect(has(issues, /no known settlement contract/)).toBe(true);
  });
});

describe("checkSettlements", () => {
  it("checks paid receipts and skips denied ones", async () => {
    const paid = paidReceipt();
    const denied = buildReceipt({
      status: "denied",
      reason: "blocked by policy",
      segments: paid.segments,
    });
    const seen: string[] = [];
    const tracking: SettlementReader = async (hash) => {
      seen.push(hash);
      return authorized();
    };

    expect(await checkSettlements([paid, denied], tracking)).toEqual([]);
    expect(seen).toEqual([TX]);
  });
});
