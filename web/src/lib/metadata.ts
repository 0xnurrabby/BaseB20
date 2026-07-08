const FALLBACK_ORIGIN = "https://base.nurlab.xyz";

export function buildTokenMetadataUri({
  name,
  symbol,
  image,
  origin,
}: {
  name: string;
  symbol: string;
  image: string;
  origin?: string;
}) {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : FALLBACK_ORIGIN);
  const url = new URL("/api/token-metadata", base);
  url.searchParams.set("name", name.trim() || "B20 Token");
  url.searchParams.set("symbol", symbol.trim() || "B20");
  if (image.trim()) url.searchParams.set("image", image.trim());
  return url.toString();
}
