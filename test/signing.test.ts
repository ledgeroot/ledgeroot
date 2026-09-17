import { describe, it, expect } from "vitest";
import {
  RECEIPT_ALG,
  RECEIPT_TYP,
  jwksOf,
  publicKeyOf,
  signReceipt,
  verifyReceiptSignature,
} from "../src/receipt/signing.js";
import type { ReceiptSignature } from "../src/types.js";

const SEED = `0x${"ab".repeat(32)}`;
const OTHER_SEED = `0x${"cd".repeat(32)}`;
const HASH = "f".repeat(64);

const key = publicKeyOf(SEED);
const otherKey = publicKeyOf(OTHER_SEED);

describe("signing keys", () => {
  it("derives a stable key id from the key itself", () => {
    expect(publicKeyOf(SEED)).toEqual(key);
    expect(key.kid).not.toBe(otherKey.kid);
    // base64url of a 32-byte digest, unpadded.
    expect(key.kid).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(key.x, "base64url")).toHaveLength(32);
  });

  it("publishes a JWKS a verifier can use", () => {
    expect(jwksOf(SEED)).toEqual({
      keys: [{ kty: "OKP", crv: "Ed25519", x: key.x, kid: key.kid, use: "sig", alg: RECEIPT_ALG }],
    });
  });

  it("rejects a seed that is not 32 bytes", () => {
    expect(() => publicKeyOf("0x1234")).toThrow(/32-byte hex seed/);
  });
});

describe("receipt signatures", () => {
  it("signs and verifies a receipt hash", () => {
    const signature = signReceipt(HASH, SEED);
    expect(signature.protected).toEqual({ alg: RECEIPT_ALG, kid: key.kid, typ: RECEIPT_TYP });
    expect(verifyReceiptSignature(HASH, signature, key)).toBe(true);
  });

  it("rejects a signature made over a different hash", () => {
    const signature = signReceipt(HASH, SEED);
    expect(verifyReceiptSignature("0".repeat(64), signature, key)).toBe(false);
  });

  it("rejects a signature checked against another key", () => {
    const signature = signReceipt(HASH, SEED);
    expect(verifyReceiptSignature(HASH, signature, otherKey)).toBe(false);
  });

  it("rejects a swapped algorithm", () => {
    const signature = signReceipt(HASH, SEED);
    const swapped: ReceiptSignature = {
      ...signature,
      protected: { ...signature.protected, alg: "ES256K" as ReceiptSignature["protected"]["alg"] },
    };
    expect(verifyReceiptSignature(HASH, swapped, key)).toBe(false);
  });

  it("rejects a swapped key id", () => {
    const signature = signReceipt(HASH, SEED);
    const swapped: ReceiptSignature = {
      ...signature,
      protected: { ...signature.protected, kid: otherKey.kid },
    };
    expect(verifyReceiptSignature(HASH, swapped, key)).toBe(false);
  });

  it("rejects a tampered signature value", () => {
    const signature = signReceipt(HASH, SEED);
    const flipped = Buffer.from(signature.value, "base64url");
    flipped[0] ^= 0xff;
    expect(
      verifyReceiptSignature(HASH, { ...signature, value: flipped.toString("base64url") }, key),
    ).toBe(false);
  });
});
