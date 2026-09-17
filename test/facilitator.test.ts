import { afterEach, describe, expect, it, vi } from "vitest";
import {
  FacilitatorClient,
  MONAD_TESTNET_X402,
} from "../src/x402/facilitator.js";

const TEST_KEY = `0x${"1".repeat(64)}`;
const PAY_TO = "0x35DA8C7a8d2253354925354b436A0422B9618dE4";

const quote = {
  gateway: "agent402.tools",
  payTo: PAY_TO,
  amount: "0.001",
  quoteHash: "0xquote",
  endpoint: "/search",
};

function client(privateKey?: string) {
  return new FacilitatorClient({
    url: "https://facilitator.test",
    network: MONAD_TESTNET_X402,
    privateKey,
  });
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FacilitatorClient", () => {
  it("verifies then settles and returns the tx hash", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ isValid: true }))
      .mockResolvedValueOnce(json({ success: true, transaction: { hash: "0xtxhash" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await client(TEST_KEY).pay(quote);

    expect(result).toEqual({ txHash: "0xtxhash", chainId: 10143 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("https://facilitator.test/verify");
    expect(fetchMock.mock.calls[1][0]).toBe("https://facilitator.test/settle");

    const settleBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(settleBody.x402Version).toBe(2);

    const { paymentPayload, paymentRequirements } = settleBody;
    expect(paymentPayload.x402Version).toBe(2);
    expect(paymentPayload.accepted.scheme).toBe("exact");
    expect(paymentPayload.accepted.network).toBe("eip155:10143");
    expect(paymentPayload.accepted.amount).toBe("1000"); // 0.001 USDC in 6-dec units
    expect(paymentPayload.accepted.asset).toBe(MONAD_TESTNET_X402.usdcAddress);
    expect(paymentPayload.accepted.payTo).toBe(PAY_TO);
    expect(paymentPayload.payload.authorization.from).toBeTruthy();
    expect(paymentPayload.payload.signature).toMatch(/^0x/);

    expect(paymentRequirements.scheme).toBe("exact");
    expect(paymentRequirements.network).toBe("eip155:10143");
    expect(paymentRequirements.amount).toBe("1000");
  });

  it("throws when /verify rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ isValid: false })));
    await expect(client(TEST_KEY).pay(quote)).rejects.toThrow("/verify rejected");
  });

  it("throws when /settle fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(json({ isValid: true }))
        .mockResolvedValueOnce(json({ success: false, errorReason: "insufficient_funds" })),
    );
    await expect(client(TEST_KEY).pay(quote)).rejects.toThrow("insufficient_funds");
  });

  it("throws without a private key", async () => {
    await expect(client().pay(quote)).rejects.toThrow("no payer private key");
  });
});
