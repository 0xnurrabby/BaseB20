import { formatUnits } from "viem";

/** Shorten an address: 0x1234...abcd */
export function shortAddress(addr?: string, size = 4): string {
  if (!addr) return "";
  return `${addr.slice(0, 2 + size)}...${addr.slice(-size)}`;
}

/** basis points -> percent number (250 -> 2.5) */
export function bpsToPct(bps: number | bigint): number {
  return Number(bps) / 100;
}

/** percent number -> basis points (2.5 -> 250) */
export function pctToBps(pct: number): number {
  return Math.round(pct * 100);
}

/** Format a bigint token amount with decimals into a readable string. */
export function formatAmount(
  value: bigint | undefined,
  decimals: number,
  maxFrac = 4
): string {
  if (value === undefined) return "-";
  const raw = formatUnits(value, decimals);
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  if (n === 0) return "0";
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })}M`;
  if (n >= 1_000) return `${(n / 1_000).toLocaleString(undefined, { maximumFractionDigits: 2 })}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: maxFrac });
}

/** Full precision formatting (no compaction). */
export function formatFull(value: bigint | undefined, decimals: number): string {
  if (value === undefined) return "-";
  const raw = formatUnits(value, decimals);
  const n = Number(raw);
  if (!Number.isFinite(n)) return raw;
  return n.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

/** Compact a plain number string with thousands separators. */
export function commafy(value: string | number | bigint): string {
  if (typeof value === "bigint") return value.toLocaleString();
  if (typeof value === "string" && /^\d+$/.test(value.replace(/,/g, ""))) {
    return BigInt(value.replace(/,/g, "")).toLocaleString();
  }
  const n = typeof value === "string" ? Number(value.replace(/,/g, "")) : value;
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString();
}

export function parseWholeNumber(value: string): bigint | null {
  const clean = value.replace(/,/g, "").trim();
  if (!/^\d+$/.test(clean)) return null;
  try {
    return BigInt(clean);
  } catch {
    return null;
  }
}

export function isAddressLike(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim());
}
