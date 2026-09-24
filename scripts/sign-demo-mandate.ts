import { loadEnv } from "../src/env.js";
import { LedgerootStore } from "../src/store/db.js";
import { signMandate } from "../src/mandate.js";

/**
 * Sign the authorization the demo agent spends under.
 *
 * This is the user's act, not the agent's, which is why it is a separate script
 * rather than something the buying loop does for itself: the agent may spend
 * inside the box, and only the user draws the box. Mandates expire, so a demo
 * run needs a fresh one; `npm run mandate:demo` is that step.
 *
 * The payTo binding is the seller's own recipient address, which is the reason
 * the value is spelled out here: binding it is what makes an injected
 * "pay 0xevil instead" fail the payto-binding policy rather than merely look
 * unusual.
 */
loadEnv();

const AGENT402_PAY_TO = "0xaBF4FAbd7c416fB67202E5f9002389Fc75e2a9D0";

async function main(): Promise<void> {
  const privateKey = process.env.LEDGEROOT_PRIVATE_KEY;
  if (!privateKey) throw new Error("set LEDGEROOT_PRIVATE_KEY (the user's key, which signs)");

  const mandate = await signMandate(
    {
      id: process.env.MANDATE_ID ?? "demo-mandate-agent",
      summary:
        "Allow the buying agent to spend up to 0.01 USDC per call and 0.05 USDC in total " +
        "on agent402.tools data, for one hour.",
      issuer: "",
      counterpartyAllowlist: ["agent402.tools"],
      payTo: [AGENT402_PAY_TO],
      maxAmountPerPayment: "0.01",
      maxTotalAmount: "0.05",
      expiresAt: Math.floor(Date.now() / 1000) + Number(process.env.MANDATE_MINUTES ?? 60) * 60,
    },
    privateKey,
  );

  const store = new LedgerootStore({ path: process.env.LEDGEROOT_DB });
  try {
    store.upsertMandate(mandate);
    console.log(
      JSON.stringify(
        {
          id: mandate.id,
          issuer: mandate.issuer,
          counterpartyAllowlist: mandate.counterpartyAllowlist,
          payTo: mandate.payTo,
          maxAmountPerPayment: mandate.maxAmountPerPayment,
          maxTotalAmount: mandate.maxTotalAmount,
          expiresAt: mandate.expiresAt,
          spentSoFar: store
            .listReceipts()
            .filter((receipt) => receipt.mandateId === mandate.id && receipt.status === "paid")
            .reduce((sum, receipt) => sum + Number(receipt.amount ?? 0), 0),
          receiptsInLedger: store.listReceipts().length,
        },
        null,
        2,
      ),
    );
  } finally {
    store.close();
  }
}

await main();
