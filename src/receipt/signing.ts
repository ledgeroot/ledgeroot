import {
  createHash,
  createPrivateKey,
  createPublicKey,
  sign as ed25519Sign,
  verify as ed25519Verify,
  type KeyObject,
} from "node:crypto";
import { canonicalJson } from "./hashchain.js";
import type { PublicKey, ReceiptSignature } from "../types.js";

/**
 * Detached Ed25519 signature over a receipt hash.
 *
 * The hash chain already proves a receipt's content has not changed. A
 * signature is what makes it attributable: without one a receipt says "these
 * bytes are consistent with each other", not "the issuer said this".
 *
 * The signature covers the canonical bytes of `{ payload, protected }`, so the
 * algorithm and the key id sit *inside* the signed input and cannot be swapped
 * after the fact.
 */

/** DER wrappers for a raw 32-byte Ed25519 key (RFC 8410). */
const PKCS8_PREFIX = Buffer.from("302e020100300506032b657004220420", "hex");
const SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export const RECEIPT_ALG = "EdDSA";
export const RECEIPT_TYP = "ledgeroot-receipt+json";

function privateKeyFromSeed(seed: string): KeyObject {
  const bytes = Buffer.from(seed.replace(/^0x/, ""), "hex");
  if (bytes.length !== 32) {
    throw new Error(`signing key must be a 32-byte hex seed, got ${bytes.length} bytes`);
  }
  return createPrivateKey({
    key: Buffer.concat([PKCS8_PREFIX, bytes]),
    format: "der",
    type: "pkcs8",
  });
}

function publicKeyObject(key: PublicKey): KeyObject {
  return createPublicKey({
    key: Buffer.concat([SPKI_PREFIX, Buffer.from(key.x, "base64url")]),
    format: "der",
    type: "spki",
  });
}

/**
 * JWK thumbprint of the public key (RFC 7638). Using the key itself as the key
 * id means identifiers need no registry and cannot drift away from the key.
 */
function thumbprint(x: string): string {
  const members = JSON.stringify({ crv: "Ed25519", kty: "OKP", x });
  return createHash("sha256").update(members).digest("base64url");
}

/** The public identity of a signing key: enough to verify, never to sign. */
export function publicKeyOf(seed: string): PublicKey {
  const der = createPublicKey(privateKeyFromSeed(seed)).export({ format: "der", type: "spki" });
  const x = der.subarray(SPKI_PREFIX.length).toString("base64url");
  return { kid: thumbprint(x), x };
}

/** A JWKS document for this key, in the shape verifiers expect. */
export function jwksOf(seed: string): { keys: Array<Record<string, string>> } {
  const { kid, x } = publicKeyOf(seed);
  return { keys: [{ kty: "OKP", crv: "Ed25519", x, kid, use: "sig", alg: RECEIPT_ALG }] };
}

/** The exact bytes committed to — a verifier reconstructs the same ones. */
function signingInput(receiptHash: string, header: ReceiptSignature["protected"]): Buffer {
  return Buffer.from(canonicalJson({ payload: { receiptHash }, protected: header }), "utf8");
}

/** Sign a receipt hash with the issuer's key. */
export function signReceipt(receiptHash: string, seed: string): ReceiptSignature {
  const header: ReceiptSignature["protected"] = {
    alg: RECEIPT_ALG,
    kid: publicKeyOf(seed).kid,
    typ: RECEIPT_TYP,
  };
  const value = ed25519Sign(null, signingInput(receiptHash, header), privateKeyFromSeed(seed));
  return { protected: header, value: value.toString("base64url") };
}

/**
 * Check a receipt signature against a public key. Returns false for anything
 * that does not verify — including an algorithm this build does not implement,
 * since accepting an unknown `alg` is where signature confusion begins.
 */
export function verifyReceiptSignature(
  receiptHash: string,
  signature: ReceiptSignature,
  key: PublicKey,
): boolean {
  if (signature.protected.alg !== RECEIPT_ALG) return false;
  if (signature.protected.kid !== key.kid) return false;
  return ed25519Verify(
    null,
    signingInput(receiptHash, signature.protected),
    publicKeyObject(key),
    Buffer.from(signature.value, "base64url"),
  );
}
