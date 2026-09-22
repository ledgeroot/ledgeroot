import { randomBytes } from "node:crypto";
import type { Hex } from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { toUnits } from "../decimal.js";
import { DRY_RUN_PRIVATE_KEY } from "../env.js";

/**
 * x402 payment protocol integration against the Monad facilitator.
 *
 * The client signs an EIP-3009 `transferWithAuthorization` (USDC, EIP-712)
 * locally, then asks the facilitator to verify and settle the payment. The
 * facilitator sponsors gas, so the payer only needs testnet USDC.
 */

export interface X402Quote {
  /** x402 gateway / facilitator host that issued the 402 response. */
  gateway: string;
  /** payTo address from the payment request. */
  payTo: string;
  /** Quoted amount in USDC (decimal string). */
  amount: string;
  /** Canonical hash of the original 402 response body. */
  quoteHash: string;
  /** Endpoint the agent called. */
  endpoint: string;
  /** Raw payment request payload, forwarded to the facilitator. */
  raw?: unknown;
}

export interface PaymentResult {
  txHash: string;
  chainId: number;
  /** Address the funds were authorized from, so settlement can be checked. */
  payer?: string;
}

export interface PaymentProvider {
  pay(quote: X402Quote): Promise<PaymentResult>;
}

export interface FacilitatorNetworkConfig {
  chainId: number;
  /** x402 network identifier, e.g. "eip155:10143". */
  network: `eip155:${number}`;
  /** x402 scheme id advertised by the facilitator, e.g. "exact". */
  scheme: string;
  usdcAddress: `0x${string}`;
  usdcDomainName: string;
  usdcDomainVersion: string;
}

/** Monad testnet USDC (6 decimals). Mainnet is eip155:143. */
export const MONAD_TESTNET_X402: FacilitatorNetworkConfig = {
  chainId: 10143,
  network: "eip155:10143",
  scheme: "exact",
  usdcAddress: "0x534b2f3A21130d7a60830c2Df862319e593943A3",
  usdcDomainName: "USDC",
  usdcDomainVersion: "2",
};

/** Monad's official x402 facilitator (public, no API key). */
export const MONAD_FACILITATOR_URL = "https://x402-facilitator.molandak.org";

/**
 * Monad mainnet USDC (6 decimals).
 *
 * Same shape as testnet, which is what makes testnet → mainnet an instance
 * rather than a rewrite. It matters because the x402 sellers we buy from serve
 * mainnet only: agent402's live 402 offers `eip155:143` and nothing on `10143`.
 * The address and the EIP-712 domain below are taken from that live
 * requirement, because a buyer has to satisfy the seller's terms, not ours.
 */
export const MONAD_MAINNET_X402: FacilitatorNetworkConfig = {
  chainId: 143,
  network: "eip155:143",
  scheme: "exact",
  usdcAddress: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603",
  usdcDomainName: "USDC",
  usdcDomainVersion: "2",
};

/** The rails this build knows how to pay on, by chain id. */
export const X402_NETWORKS: Record<number, FacilitatorNetworkConfig> = {
  [MONAD_TESTNET_X402.chainId]: MONAD_TESTNET_X402,
  [MONAD_MAINNET_X402.chainId]: MONAD_MAINNET_X402,
};

/** Deterministic payment provider for dry-run demos — no network, no wallet. */
export class DryRunPaymentProvider implements PaymentProvider {
  private sequence = 0;
  /** The same throwaway key the demo signs with, so the run stays coherent. */
  private readonly payer = privateKeyToAccount(DRY_RUN_PRIVATE_KEY as Hex).address;

  async pay(_quote: X402Quote): Promise<PaymentResult> {
    this.sequence += 1;
    return {
      txHash: `0x${this.sequence.toString(16).padStart(64, "0")}`,
      chainId: MONAD_TESTNET_X402.chainId,
      payer: this.payer,
    };
  }
}

export interface FacilitatorConfig {
  url: string;
  network: FacilitatorNetworkConfig;
  /** Payer private key (LEDGEROOT_PRIVATE_KEY). Never leaves this machine. */
  privateKey?: string;
  /** HTTP timeout per facilitator request, in ms. Defaults to 30000. */
  timeoutMs?: number;
}

const transferWithAuthorizationTypes = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
};

interface Authorization {
  from: `0x${string}`;
  to: `0x${string}`;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: `0x${string}`;
}

export class FacilitatorClient implements PaymentProvider {
  constructor(private readonly config: FacilitatorConfig) {}

  async pay(quote: X402Quote): Promise<PaymentResult> {
    if (!this.config.privateKey) {
      throw new Error("no payer private key configured (LEDGEROOT_PRIVATE_KEY)");
    }
    const account = privateKeyToAccount(this.config.privateKey as Hex);
    const { authorization, signature } = await this.authorize(account, quote);

    const requirements = {
      scheme: this.config.network.scheme,
      network: this.config.network.network,
      amount: authorization.value,
      asset: this.config.network.usdcAddress,
      payTo: authorization.to,
      maxTimeoutSeconds: 300,
      extra: {
        name: this.config.network.usdcDomainName,
        version: this.config.network.usdcDomainVersion,
      },
    };

    const request = {
      x402Version: 2,
      paymentPayload: {
        x402Version: 2,
        accepted: requirements,
        payload: { signature, authorization },
      },
      paymentRequirements: requirements,
    };

    const verified = await this.post("/verify", request);
    if (verified.isValid !== true) {
      throw new Error(`facilitator /verify rejected payment: ${JSON.stringify(verified)}`);
    }

    const settled = await this.post("/settle", request);
    if (settled.success !== true) {
      const reason = settled.errorReason ?? JSON.stringify(settled);
      throw new Error(`facilitator /settle failed: ${reason}`);
    }

    return {
      txHash: extractTxHash(settled),
      chainId: this.config.network.chainId,
      payer: account.address,
    };
  }

  private async authorize(
    account: PrivateKeyAccount,
    quote: X402Quote,
  ): Promise<{ authorization: Authorization; signature: Hex }> {
    const value = toUnits(quote.amount);
    const now = Math.floor(Date.now() / 1000);
    const validAfter = BigInt(now - 60);
    const validBefore = BigInt(now + 900);
    const nonce = `0x${randomBytes(32).toString("hex")}` as `0x${string}`;
    const payTo = quote.payTo as `0x${string}`;

    const authorization: Authorization = {
      from: account.address,
      to: payTo,
      value: value.toString(),
      validAfter: validAfter.toString(),
      validBefore: validBefore.toString(),
      nonce,
    };

    const signature = await account.signTypedData({
      domain: {
        name: this.config.network.usdcDomainName,
        version: this.config.network.usdcDomainVersion,
        chainId: this.config.network.chainId,
        verifyingContract: this.config.network.usdcAddress,
      },
      types: transferWithAuthorizationTypes,
      primaryType: "TransferWithAuthorization",
      message: {
        from: account.address,
        to: payTo,
        value,
        validAfter,
        validBefore,
        nonce,
      },
    });

    return { authorization, signature };
  }

  private async post(path: string, body: unknown): Promise<Record<string, unknown>> {
    const timeoutMs = this.config.timeoutMs ?? 30_000;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${this.config.url}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      const text = await res.text();
      let data: unknown;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error(
          `facilitator ${path} returned non-JSON (HTTP ${res.status}): ${text.slice(0, 200)}`,
        );
      }
      if (!res.ok) {
        throw new Error(`facilitator ${path} HTTP ${res.status}: ${text.slice(0, 200)}`);
      }
      return (data ?? {}) as Record<string, unknown>;
    } catch (err) {
      if (controller.signal.aborted) {
        throw new Error(`facilitator ${path} timed out after ${timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

function extractTxHash(settled: Record<string, unknown>): string {
  const tx = settled.transaction;
  if (typeof tx === "string" && tx.startsWith("0x")) return tx;
  if (tx && typeof tx === "object") {
    const obj = tx as Record<string, unknown>;
    if (typeof obj.hash === "string") return obj.hash;
    if (typeof obj.transactionHash === "string") return obj.transactionHash;
  }
  if (typeof settled.txHash === "string") return settled.txHash;
  if (typeof settled.transactionHash === "string") return settled.transactionHash;
  throw new Error(`could not extract tx hash from /settle response: ${JSON.stringify(settled)}`);
}
