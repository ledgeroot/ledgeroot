// Decimal-string arithmetic for USDC amounts, without floating point.

export const USDC_DECIMALS = 6;
const SCALE = 10n ** BigInt(USDC_DECIMALS);

/** Convert a decimal string ("0.5") to the smallest-unit integer (500000). */
export function toUnits(value: string): bigint {
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const [int = "0", frac = ""] = unsigned.split(".");
  if (!/^\d+$/.test(int) || !/^\d*$/.test(frac)) {
    throw new Error(`invalid decimal amount: "${value}"`);
  }
  const fracPadded = (frac + "0".repeat(USDC_DECIMALS)).slice(0, USDC_DECIMALS);
  const units = BigInt(int) * SCALE + BigInt(fracPadded || "0");
  return negative ? -units : units;
}

/** Convert a smallest-unit integer back to a decimal string. */
export function fromUnits(value: bigint): string {
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const int = abs / SCALE;
  const frac = (abs % SCALE)
    .toString()
    .padStart(USDC_DECIMALS, "0")
    .replace(/0+$/, "");
  return `${negative ? "-" : ""}${int}${frac ? "." + frac : ""}`;
}

export function gt(a: string, b: string): boolean {
  return toUnits(a) > toUnits(b);
}

export function gte(a: string, b: string): boolean {
  return toUnits(a) >= toUnits(b);
}

export function add(a: string, b: string): string {
  return fromUnits(toUnits(a) + toUnits(b));
}

export function sub(a: string, b: string): string {
  return fromUnits(toUnits(a) - toUnits(b));
}
