import { loadEnv } from "../src/env.js";
import { createServices } from "../src/bootstrap.js";
import { signMandate } from "../src/mandate.js";
import { handlePay } from "../src/tools/pay.js";
import { MONAD_TESTNET_X402 } from "../src/x402/facilitator.js";
import type { Mandate } from "../src/types.js";

loadEnv();

const payTo = process.argv[2] ?? process.env.LEDGEROOT_DEMO_PAYTO;
const amount = process.argv[3] ?? "0.001";

if (!payTo) {
  console.error("usage: tsx scripts/pay-demo.ts <payTo-address> [amount-usdc]");
  console.error("  e.g. tsx scripts/pay-demo.ts 0x35DA... 0.001");
  process.exit(1);
}

const services = createServices();
try {
  const privateKey = process.env.LEDGEROOT_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("LEDGEROOT_PRIVATE_KEY is not set");
  }

  const unsigned: Mandate = {
    id: "demo-mandate-pay",
    summary: `Allow a single payment of up to 1 USDC to ${payTo}`,
    issuer: "",
    counterpartyAllowlist: ["agent402.tools"],
    payTo: [payTo],
    maxAmountPerPayment: "1",
    maxTotalAmount: "20",
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
  };

  const mandate = await signMandate(unsigned, privateKey);
  services.store.upsertMandate(mandate);

  // The payment requirements as a seller would send them. The engine reads
  // payTo and the quoted amount from this object and records it whole, so the
  // receipt commits to the quote rather than to a summary of it.
  const quote = {
    scheme: MONAD_TESTNET_X402.scheme,
    network: MONAD_TESTNET_X402.network,
    asset: MONAD_TESTNET_X402.usdcAddress,
    payTo,
    amount,
    resource: "/search",
  };

  const result = await handlePay(services, {
    intent: "demo: pay for a data API call",
    mandateId: mandate.id,
    counterparty: "agent402.tools",
    quote,
    amount,
    endpoint: "/search",
  });

  console.log("MANDATE:");
  console.log(JSON.stringify({ id: mandate.id, issuer: mandate.issuer }, null, 2));
  console.log("RESULT:");
  console.log(JSON.stringify(result, null, 2));

  const receipt = services.store.getReceipt(result.receiptId);
  console.log("RECEIPT:");
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  services.store.close();
}
