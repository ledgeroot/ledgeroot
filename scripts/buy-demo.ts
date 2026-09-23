import { loadEnv } from "../src/env.js";
import { createServices } from "../src/bootstrap.js";
import { signMandate } from "../src/mandate.js";
import { handleBuy } from "../src/tools/buy.js";
import { MONAD_MAINNET_X402 } from "../src/x402/facilitator.js";
import type { Mandate } from "../src/types.js";

loadEnv();

/** The reference seller's recipient address, as its own 402 advertises. */
const AGENT402_PAY_TO = "0xaBF4FAbd7c416fB67202E5f9002389Fc75e2a9D0";

const url = process.argv[2] ?? process.env.LEDGEROOT_BUY_URL ?? "https://agent402.tools/api/hash";
const payTo = process.argv[3] ?? process.env.LEDGEROOT_BUY_PAYTO ?? AGENT402_PAY_TO;
const chainId = Number(process.argv[4] ?? process.env.LEDGEROOT_BUY_CHAIN ?? MONAD_MAINNET_X402.chainId);
const method = process.env.LEDGEROOT_BUY_METHOD ?? "POST";
const body =
  process.env.LEDGEROOT_BUY_BODY ?? JSON.stringify({ text: "hello world", algo: "sha256" });

const host = new URL(url).host;

/**
 * Buy a resource over x402 under a signed mandate — the flow `pay-demo` cannot
 * show, because there the caller already holds the quote. Here the engine runs
 * the 402 handshake itself: it fetches the URL, judges the requirements the
 * seller actually sent against the mandate *before* signing, pays, and records
 * the delivery bytes it received.
 *
 * The mandate has to name the seller and its recipient up front, because the
 * counterparty whitelist is enforced before the fetch and `payto-binding`
 * compares the quote's `payTo` against the mandate. A seller whose address
 * changes will be refused, not silently paid.
 */
async function main(): Promise<void> {
  const services = createServices();
  try {
    const privateKey = process.env.LEDGEROOT_PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("set LEDGEROOT_PRIVATE_KEY (a wallet funded with mainnet USDC)");
    }

    const unsigned: Mandate = {
      id: "demo-mandate-buy",
      summary: `Allow ${host} up to 1 USDC per call, 20 USDC in total, for an hour.`,
      issuer: "",
      counterpartyAllowlist: [host],
      payTo: [payTo],
      maxAmountPerPayment: "1",
      maxTotalAmount: "20",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    };

    const mandate = await signMandate(unsigned, privateKey);
    services.store.upsertMandate(mandate);

    const result = await handleBuy(services, {
      intent: `demo: buy ${url}`,
      mandateId: mandate.id,
      url,
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body,
      chainId,
    });

    console.log("MANDATE:");
    console.log(
      JSON.stringify(
        { id: mandate.id, issuer: mandate.issuer, counterpartyAllowlist: mandate.counterpartyAllowlist, payTo: mandate.payTo },
        null,
        2,
      ),
    );
    console.log("RESULT:");
    console.log(JSON.stringify(result, null, 2));

    if (result.receiptId) {
      console.log("RECEIPT:");
      console.log(JSON.stringify(services.store.getReceipt(result.receiptId), null, 2));
    }
    console.log(
      "\nConfirm the settlement on-chain with:  ledgeroot verify --check-chain",
    );
  } finally {
    services.store.close();
  }
}

await main();
