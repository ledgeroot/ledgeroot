import { randomBytes } from "node:crypto";
import type { Hex } from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { toUnits } from "../decimal.js";

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
}

export interface PaymentProvider {
  pay(quote: X402Quote): Promise<PaymentResult>;
}

export interface FacilitatorNetworkConfig {
  chainId: number;
  /** x402 network identifier, e.g. "eip155:10143". */
  network: `eip155:${number}`;
  usdcAddress: `0x${string}`;
  usdcDomainName: string;
  usdcDomainVersion: string;
}

/** Monad testnet USDC (6 decimals). Mainnet is eip155:143. */
export const MONAD_TESTNET_X402: FacilitatorNetworkConfig = {
  chainId: 10143,
  network: "eip155:10143",
  usdcAddress: "0x534b2f3A21130d7a60830c2Df862319e593943A3",
  usdcDomainName: "USDC",
  usdcDomainVersion: "2",
};

/** Monad's official x402 facilitator (public, no API key). */
export const MONAD_FACILITATOR_URL = "https://x402-facilitator.molandak.org";

export interface FacilitatorConfig {
  url: string;
  network: FacilitatorNetworkConfig;
  /** Payer private key (LEDGEROOT_PRIVATE_KEY). Never leaves this machine. */
  privateKey?: string;
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

    const request = {
      x402Version: 2,
      payload: { authorization, signature },
      accepted: {
        scheme: "exact",
        network: this.config.network.network,
        amount: authorization.value,
        asset: this.config.network.usdcAddress,
        payTo: authorization.to,
        maxTimeoutSeconds: 300,
        extra: {
          name: this.config.network.usdcDomainName,
          version: this.config.network.usdcDomainVersion,
        },
      },
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

    return { txHash: extractTxHash(settled), chainId: this.config.network.chainId };
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
    const res = await fetch(`${this.config.url}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
