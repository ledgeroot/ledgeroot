import { loadEnv } from "../src/env.js";
import { createServices } from "../src/bootstrap.js";
import { signMandate } from "../src/mandate.js";
import { handlePay } from "../src/tools/pay.js";
import { canonicalHash } from "../src/receipt/hashchain.js";
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

  // The hash commits to the quote summary the receipt records, so it can be
  // recomputed from the receipt rather than being a placeholder.
  const quote = { amount, payTo, endpoint: "/search" };

  const result = await handlePay(services, {
    intent: "demo: pay for a data API call",
    mandateId: mandate.id,
    counterparty: "agent402.tools",
    payTo: quote.payTo,
    amount: quote.amount,
    quoteAmount: quote.amount,
    quoteHash: `0x${canonicalHash(quote)}`,
    endpoint: quote.endpoint,
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
