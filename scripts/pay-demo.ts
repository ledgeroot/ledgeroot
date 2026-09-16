import { createServices } from "../src/bootstrap.js";
import { handlePay } from "../src/tools/pay.js";
import type { Mandate } from "../src/types.js";

const payTo = process.argv[2] ?? process.env.LEDGEROOT_DEMO_PAYTO;
const amount = process.argv[3] ?? "0.001";

if (!payTo) {
  console.error("usage: tsx scripts/pay-demo.ts <payTo-address> [amount-usdc]");
  console.error("  e.g. tsx scripts/pay-demo.ts 0x35DA... 0.001");
  process.exit(1);
}

const mandate: Mandate = {
  id: "demo-mandate-pay",
  summary: `Allow a single payment of up to 1 USDC to ${payTo}`,
  issuer: "0x0000000000000000000000000000000000000000",
  counterpartyAllowlist: ["xapi.to"],
  payTo: [payTo],
  maxAmountPerPayment: "1",
  maxTotalAmount: "20",
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
};

const services = createServices();
try {
  services.store.upsertMandate(mandate);

  const result = await handlePay(services, {
    intent: "demo: pay for a data API call",
    mandateId: mandate.id,
    counterparty: "xapi.to",
    payTo,
    amount,
    quoteAmount: amount,
    quoteHash: `0x${"0".repeat(64)}`,
    endpoint: "/search",
  });

  console.log("RESULT:");
  console.log(JSON.stringify(result, null, 2));

  const receipt = services.store.getReceipt(result.receiptId);
  console.log("RECEIPT:");
  console.log(JSON.stringify(receipt, null, 2));
} finally {
  services.store.close();
}
