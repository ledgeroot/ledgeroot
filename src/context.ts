import type { LedgerootStore } from "./store/db.js";
import type { PolicyEngine } from "./policy/engine.js";
import type { Anchorer } from "./anchor/anchorer.js";
import type { PaymentProvider } from "./x402/facilitator.js";

/** The collaborators wired together by `bootstrap.ts` and used by every tool. */
export interface LedgerootServices {
  store: LedgerootStore;
  engine: PolicyEngine;
  payments: PaymentProvider;
  anchorer?: Anchorer;
}
