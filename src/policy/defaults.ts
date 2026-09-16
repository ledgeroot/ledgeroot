import type { Policy, PolicyContext } from "./engine.js";
import { add, gt, toUnits } from "../decimal.js";

function allow(): { allow: true } {
  return { allow: true };
}

function deny(reason: string): { allow: false; reason: string } {
  return { allow: false, reason };
}

function quoteDriftExceeds(amount: string, quote: string, maxDrift: number): boolean {
  const a = toUnits(amount);
  const q = toUnits(quote);
  if (q === 0n) return a !== 0n;
  const diff = a > q ? a - q : q - a;
  const maxDriftPpm = BigInt(Math.round(maxDrift * 1_000_000));
  return diff * 1_000_000n > maxDriftPpm * q;
}

/** 1. Counterparty whitelist — only pay gateways listed in the mandate. */
export const counterpartyWhitelist: Policy = {
  id: "counterparty-whitelist",
  name: "Counterparty whitelist",
  validate(ctx: PolicyContext) {
    const list = ctx.mandate.counterpartyAllowlist;
    if (list.length === 0 || list.includes(ctx.counterparty)) return allow();
    return deny(`counterparty "${ctx.counterparty}" is not in the mandate whitelist`);
  },
};

/** 2. payTo binding — the settlement destination must match the mandate. */
export const payToBinding: Policy = {
  id: "payto-binding",
  name: "payTo binding",
  validate(ctx: PolicyContext) {
    if (ctx.mandate.payTo.length === 0 || ctx.mandate.payTo.includes(ctx.payTo)) {
      return allow();
    }
    return deny(`payTo "${ctx.payTo}" is not bound by the mandate`);
  },
};

/** 3. Quote drift — the charged amount must not drift from the quoted amount. */
export const quoteDrift: Policy = {
  id: "quote-drift",
  name: "Quote drift",
  validate(ctx: PolicyContext) {
    const maxDrift = ctx.mandate.maxQuoteDrift ?? 0.1;
    if (quoteDriftExceeds(ctx.amount, ctx.quoteAmount, maxDrift)) {
      return deny(
        `charged amount ${ctx.amount} drifts from quote ${ctx.quoteAmount} beyond ${maxDrift}`,
      );
    }
    return allow();
  },
};

/** 4. Endpoint rate limit — cap the call frequency per endpoint. */
export const endpointRateLimit: Policy = {
  id: "endpoint-rate-limit",
  name: "Endpoint rate limit",
  validate(ctx: PolicyContext) {
    const limits = ctx.mandate.endpointRateLimit ?? [];
    for (const limit of limits) {
      if (limit.endpoint !== ctx.endpoint) continue;
      const since = ctx.now - limit.windowSeconds * 1000;
      const count = ctx.callTimestamps.filter((t) => t >= since).length;
      if (count >= limit.maxCalls) {
        return deny(
          `endpoint "${ctx.endpoint}" exceeded ${limit.maxCalls} calls per ${limit.windowSeconds}s`,
        );
      }
    }
    return allow();
  },
};

/** 5. Amount limits — per-payment ceiling and cumulative ceiling. */
export const amountLimit: Policy = {
  id: "amount-limit",
  name: "Amount limits",
  validate(ctx: PolicyContext) {
    if (gt(ctx.amount, ctx.mandate.maxAmountPerPayment)) {
      return deny(
        `amount ${ctx.amount} exceeds per-payment limit ${ctx.mandate.maxAmountPerPayment}`,
      );
    }
    const next = add(ctx.cumulativeSpent, ctx.amount);
    if (gt(next, ctx.mandate.maxTotalAmount)) {
      return deny(
        `cumulative spend would reach ${next}, exceeding limit ${ctx.mandate.maxTotalAmount}`,
      );
    }
    return allow();
  },
};

/** The five default policies, registered in evaluation order. */
export function defaultPolicies(): Policy[] {
  return [counterpartyWhitelist, payToBinding, quoteDrift, endpointRateLimit, amountLimit];
}
