import { createServer } from "node:http";
import { rmSync } from "node:fs";
import { afterEach, describe, it, expect, vi } from "vitest";
import { privateKeyToAccount } from "viem/accounts";
import { buy } from "../src/x402/buyer.js";
import { handleBuy } from "../src/tools/buy.js";
import { LedgerootStore } from "../src/store/db.js";
import { PolicyEngine } from "../src/policy/engine.js";
import { defaultPolicies } from "../src/policy/defaults.js";
import { verifyReceiptChain } from "../src/verify/verifier.js";
import { contentHash } from "../src/receipt/hashchain.js";
import { TEST_KEY, TEST_PUBLIC_KEY } from "./support.js";
import type { LedgerootServices } from "../src/context.js";
import type { Mandate } from "../src/types.js";

const DB = "/tmp/cc-buy-test.sqlite";

/**
 * One accepted rail, copied verbatim from a live 402 that agent402.tools
 * answered with — including the mainnet USDC address and the EIP-712 domain it
 * expects. A fixture invented by hand would not prove the parser reads what a
 * seller actually sends.
 */
const REQUIREMENTS = {
  scheme: "exact",
  network: "eip155:143",
  amount: "1000",
  asset: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603",
  payTo: "0xaBF4FAbd7c416fB67202E5f9002389Fc75e2a9D0",
  maxTimeoutSeconds: 300,
  extra: { name: "USDC", version: "2" },
};

const TX = `0x${"cd".repeat(32)}`;
const BODY = JSON.stringify({ algo: "sha256", hex: "2cf24dba" });
const SIGNER = privateKeyToAccount(TEST_KEY as `0x${string}`);

interface SellerOptions {
  /** Answer 200 without asking for payment — a free tier, or a trial. */
  free?: boolean;
  /** Keep answering 402 even once a payment header arrives. */
  neverSettle?: boolean;
  /** Override the payment requirements the seller advertises. */
  requirements?: Record<string, unknown>;
  /** Answer 302 pointing here, to exercise redirect handling. */
  redirectTo?: string;
}

/** A seller that speaks the x402 v2 shape: 402 with requirements, then 200. */
async function startSeller(options: SellerOptions = {}) {
  const signatures: string[] = [];
  let hits = 0;
  const requirements = options.requirements ?? REQUIREMENTS;
  const server = createServer((req, res) => {
    hits += 1;
    if (options.redirectTo) {
      res.writeHead(302, { location: options.redirectTo });
      res.end();
      return;
    }
    const url = `http://${req.headers.host}${req.url}`;
    const signature = (req.headers["payment-signature"] ?? req.headers["x-payment"]) as
      | string
      | undefined;
    if (signature) signatures.push(signature);

    if (!options.free && (!signature || options.neverSettle)) {
      const required = {
        x402Version: 2,
        error: "Payment required",
        resource: { url, description: "Hash a text string", mimeType: "application/json" },
        accepts: [requirements],
      };
      res.writeHead(402, {
        "content-type": "application/json",
        "payment-required": Buffer.from(JSON.stringify(required)).toString("base64"),
      });
      res.end(JSON.stringify({ error: "Payment required" }));
      return;
    }

    // A settlement header only ever accompanies a payment. A free 200 carries
    // none, which is how the caller can tell the two apart.
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (signature) {
      headers["payment-response"] = Buffer.from(
        JSON.stringify({
          success: true,
          transaction: TX,
          network: "eip155:143",
          payer: SIGNER.address,
        }),
      ).toString("base64");
    }
    res.writeHead(200, headers);
    res.end(BODY);
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    url: `http://127.0.0.1:${port}/api/hash`,
    signatures,
    hits: () => hits,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

function mandate(overrides: Partial<Mandate> = {}): Mandate {
  return {
    id: "m-1",
    summary: "allow up to 0.5 USDC per call to agent402.tools",
    issuer: "0xissuer",
    counterpartyAllowlist: ["127.0.0.1"],
    payTo: [REQUIREMENTS.payTo],
    maxAmountPerPayment: "0.5",
    maxTotalAmount: "2.0",
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    ...overrides,
  };
}

function makeServices(store: LedgerootStore) {
  const engine = new PolicyEngine();
  for (const policy of defaultPolicies()) engine.register(policy);
  return { store, engine } as unknown as LedgerootServices;
}

afterEach(() => {
  vi.unstubAllEnvs();
  for (const suffix of ["", "-wal", "-shm"]) {
    rmSync(DB + suffix, { force: true });
  }
});

describe("buy (the x402 handshake)", () => {
  it("runs the gate before signing, and refuses there", async () => {
    const seller = await startSeller();
    const signer = { address: SIGNER.address, signTypedData: vi.fn(async () => "0x") };
    try {
      const result = await buy({
        url: seller.url,
        network: "eip155:143",
        signer,
        allowPrivateHosts: true,
        authorize: () => ({ allow: false, reason: "not bound by the mandate" }),
      });

      expect(result.kind).toBe("denied");
      expect(result.reason).toBe("not bound by the mandate");
      // The requirements the gate judged are the seller's own.
      expect(result.requirements).toMatchObject({ network: "eip155:143", amount: "1000" });
      // And nothing was signed, so nothing can have moved.
      expect(signer.signTypedData).not.toHaveBeenCalled();
      expect(seller.signatures).toHaveLength(0);
    } finally {
      await seller.close();
    }
  });

  it("pays when the gate allows, and reads the settlement back", async () => {
    const seller = await startSeller();
    try {
      const result = await buy({
        url: seller.url,
        network: "eip155:143",
        signer: SIGNER,
        allowPrivateHosts: true,
        authorize: () => ({ allow: true }),
      });

      expect(result.kind).toBe("paid");
      expect(result.status).toBe(200);
      expect(result.body).toBe(BODY);
      expect(result.settlement).toEqual({ txHash: TX, chainId: 143 });
      // The signature reached the seller as a payment header.
      expect(seller.signatures).toHaveLength(1);
    } finally {
      await seller.close();
    }
  });

  it("reports a resource that came back without a payment as unpaid", async () => {
    const seller = await startSeller({ free: true });
    const signer = { address: SIGNER.address, signTypedData: vi.fn(async () => "0x") };
    try {
      const result = await buy({
        url: seller.url,
        network: "eip155:143",
        signer,
        allowPrivateHosts: true,
        authorize: () => ({ allow: true }),
      });

      expect(result.kind).toBe("unpaid");
      expect(result.body).toBe(BODY);
      expect(signer.signTypedData).not.toHaveBeenCalled();
    } finally {
      await seller.close();
    }
  });

  it("separates 'no rail we can pay' from 'paid, and still asked'", async () => {
    // A seller that only offers a rail we do not register.
    const other = await startSeller({ neverSettle: true });
    try {
      const unmatched = await buy({
        url: other.url,
        network: "eip155:999999",
        signer: SIGNER,
        allowPrivateHosts: true,
        authorize: () => ({ allow: true }),
      });
      expect(unmatched.kind).toBe("denied");
      expect(unmatched.reason).toMatch(/no rail this build can pay on/);

      // Here the rail does match, so a payload is created — and the seller still
      // asks for payment. That outcome is unknown, not a refusal, so it throws.
      await expect(
        buy({
          url: other.url,
          network: "eip155:143",
          signer: SIGNER,
          allowPrivateHosts: true,
          authorize: () => ({ allow: true }),
        }),
      ).rejects.toThrow(/whether it settled is unknown/);
    } finally {
      await other.close();
    }
  });
});

describe("ledgeroot_buy", () => {
  /**
   * The mandate names the host it will pay, which is what the counterparty check
   * compares — and against a local server that host carries a port.
   */
  async function servicesWithMandate(counterparty: string, overrides: Partial<Mandate> = {}) {
    vi.stubEnv("LEDGEROOT_PRIVATE_KEY", TEST_KEY);
    vi.stubEnv("LEDGEROOT_SIGNING_KEY", TEST_KEY);
    // The seller under test is a local server, which the SSRF guard refuses by
    // default. Real deployments leave this unset.
    vi.stubEnv("LEDGEROOT_ALLOW_PRIVATE_HOSTS", "true");
    const store = new LedgerootStore({ path: DB });
    store.upsertMandate(mandate({ counterpartyAllowlist: [counterparty], ...overrides }));
    return { store, services: makeServices(store) };
  }

  it("denies a purchase the mandate does not cover, and records what ran", async () => {
    const seller = await startSeller();
    // The counterparty is allowed and the payTo is not bound, which isolates the
    // check under test rather than tripping the whitelist first.
    const { store, services } = await servicesWithMandate(new URL(seller.url).host, {
      payTo: [`0x${"9".repeat(40)}`],
    });
    try {
      const result = await handleBuy(services, { mandateId: "m-1", url: seller.url });

      expect(result.status).toBe("denied");
      expect(result.reason).toMatch(/not bound by the mandate/);
      // Nothing was offered to the seller.
      expect(seller.signatures).toHaveLength(0);

      const receipt = store.getReceipt(result.receiptId!);
      expect(receipt?.status).toBe("denied");
      // The quote on the receipt is the seller's own requirement.
      expect(receipt?.segments.plan.quote).toMatchObject({ network: "eip155:143" });
      // And the policies that ran are on the record, not just the one that refused.
      expect(receipt?.segments.call.policyResults.map((v) => v.policyId)).toEqual(
        expect.arrayContaining(["counterparty-whitelist", "payto-binding", "amount-limit"]),
      );
      expect(
        receipt?.segments.call.policyResults.find((v) => v.policyId === "payto-binding")?.decision,
      ).toMatchObject({ allow: false });
    } finally {
      await seller.close();
      store.close();
    }
  });

  it("records a paid purchase with the settlement and the delivery it received", async () => {
    const seller = await startSeller();
    const { store, services } = await servicesWithMandate(new URL(seller.url).host);
    try {
      const result = await handleBuy(services, {
        mandateId: "m-1",
        url: seller.url,
        intent: "hash a string",
      });

      expect(result.status).toBe("paid");
      expect(result.txHash).toBe(TX);
      expect(result.body).toBe(BODY);

      const receipt = store.getReceipt(result.receiptId!);
      expect(receipt?.status).toBe("paid");
      expect(receipt?.amount).toBe("0.001");
      expect(receipt?.segments.tx).toEqual({
        protocol: "x402",
        txHash: TX,
        chainId: 143,
        payer: SIGNER.address,
      });
      // Segment 6 is now first-hand: the engine fetched this body itself.
      expect(receipt?.segments.delivery).toEqual({
        payloadHash: contentHash(BODY),
        payloadSize: Buffer.byteLength(BODY, "utf8"),
      });

      // And the whole thing verifies, including the plan commitment.
      expect(verifyReceiptChain(store.listReceipts(), [TEST_PUBLIC_KEY])).toMatchObject({
        status: "verified",
        issues: [],
      });
    } finally {
      await seller.close();
      store.close();
    }
  });

  it("writes no receipt when nothing was paid", async () => {
    const seller = await startSeller({ free: true });
    const { store, services } = await servicesWithMandate(new URL(seller.url).host);
    try {
      const result = await handleBuy(services, { mandateId: "m-1", url: seller.url });

      expect(result.status).toBe("unpaid");
      expect(result.receiptId).toBeUndefined();
      // A receipt would attest a payment the ledger never saw.
      expect(store.listReceipts()).toHaveLength(0);
    } finally {
      await seller.close();
      store.close();
    }
  });

  it("refuses a requestId whose earlier purchase was never recorded", async () => {
    const seller = await startSeller();
    const { store, services } = await servicesWithMandate(new URL(seller.url).host);
    try {
      store.beginPaymentIntent("req-crash", {
        startedAt: Date.now(),
        mandateId: "m-1",
        counterparty: new URL(seller.url).host,
        endpoint: "/api/hash",
        payTo: "",
        amount: "",
      });

      const result = await handleBuy(services, {
        mandateId: "m-1",
        url: seller.url,
        requestId: "req-crash",
      });

      expect(result.status).toBe("denied");
      expect(result.reason).toMatch(/never recorded/);
      expect(seller.signatures).toHaveLength(0);
    } finally {
      await seller.close();
      store.close();
    }
  });

  it("refuses a host outside the mandate whitelist before contacting it", async () => {
    const seller = await startSeller();
    const { store, services } = await servicesWithMandate("some-other.example");
    try {
      const result = await handleBuy(services, { mandateId: "m-1", url: seller.url });

      expect(result.status).toBe("denied");
      expect(result.reason).toMatch(/not in the mandate whitelist/);
      // The point of the guard is that the seller is never reached at all: the
      // whitelist has to bound who is *fetched*, not only who is paid.
      expect(seller.hits()).toBe(0);
    } finally {
      await seller.close();
      store.close();
    }
  });

  it("refuses an expired mandate before reaching the seller", async () => {
    const seller = await startSeller();
    const { store, services } = await servicesWithMandate(new URL(seller.url).host, {
      expiresAt: Math.floor(Date.now() / 1000) - 60,
    });
    try {
      const result = await handleBuy(services, { mandateId: "m-1", url: seller.url });

      expect(result.status).toBe("denied");
      expect(result.reason).toMatch(/expired at/);
      expect(seller.hits()).toBe(0);
    } finally {
      await seller.close();
      store.close();
    }
  });

  it("refuses a quote amount it cannot read instead of signing it", async () => {
    const seller = await startSeller({
      requirements: { ...REQUIREMENTS, amount: "0.1" },
    });
    const { store, services } = await servicesWithMandate(new URL(seller.url).host);
    try {
      const result = await handleBuy(services, { mandateId: "m-1", url: seller.url });

      expect(result.status).toBe("denied");
      expect(result.reason).toMatch(/not a USDC atomic amount/);
      // Nothing was signed, so an unreadable amount cannot become a payment.
      expect(seller.signatures).toHaveLength(0);
    } finally {
      await seller.close();
      store.close();
    }
  });

  it("refuses to fetch a private address even when the mandate is unconstrained", async () => {
    vi.stubEnv("LEDGEROOT_PRIVATE_KEY", TEST_KEY);
    vi.stubEnv("LEDGEROOT_SIGNING_KEY", TEST_KEY);
    // No opt-in: this is the default a real deployment runs with.
    vi.stubEnv("LEDGEROOT_ALLOW_PRIVATE_HOSTS", "false");
    const store = new LedgerootStore({ path: DB });
    store.upsertMandate(mandate({ counterpartyAllowlist: [] }));
    try {
      const result = await handleBuy(makeServices(store), {
        mandateId: "m-1",
        url: "http://169.254.169.254/latest/meta-data/iam/security-credentials/",
      });

      expect(result.status).toBe("denied");
      expect(result.reason).toMatch(/private address/);
      // The refusal is on the record too, like every other denial.
      expect(store.getReceipt(result.receiptId!)?.status).toBe("denied");
    } finally {
      store.close();
    }
  });

  it("refuses to follow a redirect the SSRF guard never saw", async () => {
    const seller = await startSeller({ redirectTo: "http://169.254.169.254/latest/meta-data/" });
    const { store, services } = await servicesWithMandate(new URL(seller.url).host);
    try {
      const result = await handleBuy(services, { mandateId: "m-1", url: seller.url });

      expect(result.status).toBe("denied");
      expect(result.reason).toMatch(/redirect/);
      // The seller was contacted once and the redirect was not chased, so the
      // metadata endpoint the seller pointed at was never reached.
      expect(seller.hits()).toBe(1);
    } finally {
      await seller.close();
      store.close();
    }
  });
});
