import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";

/** Minimal EIP-1193-style request interface for external signers. */
export interface ExternalSigner {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

export interface WalletAdapterOptions {
  /** Private key (LEDGEROOT_PRIVATE_KEY). Never leaves this machine. */
  privateKey?: string;
  /** External wallet provider, when the key is held by a browser wallet. */
  external?: ExternalSigner;
}

/**
 * Wallet adapter for the local key store or an external wallet. The private
 * key is only ever held in memory and never transmitted or logged.
 */
export class WalletAdapter {
  private account?: PrivateKeyAccount;
  private external?: ExternalSigner;

  constructor(options: WalletAdapterOptions = {}) {
    if (options.privateKey) {
      this.account = privateKeyToAccount(options.privateKey as `0x${string}`);
    } else if (options.external) {
      this.external = options.external;
    }
  }

  get address(): string | undefined {
    return this.account?.address;
  }

  get hasSigner(): boolean {
    return Boolean(this.account || this.external);
  }
}
