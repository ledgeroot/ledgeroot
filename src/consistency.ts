import type { Mandate, Receipt } from "./types.js";
import { add, gt } from "./decimal.js";

export interface ReceiptConsistency {
  receipt: Receipt;
  /** True when a *paid* receipt deviates from its mandate's constraints. */
  violation: boolean;
  /** Human-readable deviations (present for both paid and denied receipts). */
  reasons: string[];
  /** Running paid total under this mandate, after this receipt. */
  cumulativeSpent?: string;
  /** The mandate's total spending ceiling, for progress display. */
  mandateTotalLimit?: string;
}

/**
 * Post-hoc authorization-execution consistency check: re-verifies every
 * receipt against its mandate and flags paid spending that exceeds the
 * authorization. A denial is the policy correctly blocking an out-of-mandate
 * attempt, so it is never flagged as a violation.
 */
export function analyzeConsistency(
  receipts: Receipt[],
  mandates: Mandate[],
): ReceiptConsistency[] {
  const byId = new Map(mandates.map((m) => [m.id, m]));
  const sorted = [...receipts].sort((a, b) => a.timestamp - b.timestamp);
  const cumulative = new Map<string, string>();

  return sorted.map((receipt) => {
    const mandate = receipt.mandateId ? byId.get(receipt.mandateId) : undefined;

    if (!mandate) {
      return {
        receipt,
        violation: receipt.status === "paid",
        reasons: [`unknown mandate "${receipt.mandateId ?? ""}"`],
      };
    }

    const amount = receipt.amount ?? "0";
    const quote = receipt.segments.plan.quote;
    const payTo = typeof quote.payTo === "string" ? quote.payTo : "";
    const reasons: string[] = [];

    if (receipt.timestamp > mandate.expiresAt * 1000) {
      reasons.push("paid after mandate expiry");
    }
    if (
      mandate.counterpartyAllowlist.length > 0 &&
      receipt.counterparty &&
      !mandate.counterpartyAllowlist.includes(receipt.counterparty)
    ) {
      reasons.push(`counterparty "${receipt.counterparty}" not whitelisted`);
    }
    if (mandate.payTo.length > 0 && payTo && !mandate.payTo.includes(payTo)) {
      reasons.push(`payTo "${payTo}" not bound by mandate`);
    }
    if (gt(amount, mandate.maxAmountPerPayment)) {
      reasons.push(
        `amount ${amount} exceeds per-payment limit ${mandate.maxAmountPerPayment}`,
      );
    }

    let cumulativeSpent: string | undefined;
    if (receipt.status === "paid") {
      cumulativeSpent = add(cumulative.get(mandate.id) ?? "0", amount);
      cumulative.set(mandate.id, cumulativeSpent);
      if (gt(cumulativeSpent, mandate.maxTotalAmount)) {
        reasons.push(
          `cumulative ${cumulativeSpent} exceeds total limit ${mandate.maxTotalAmount}`,
        );
      }
    }

    return {
      receipt,
      violation: receipt.status === "paid" && reasons.length > 0,
      reasons,
      cumulativeSpent,
      mandateTotalLimit: mandate.maxTotalAmount,
    };
  });
}
