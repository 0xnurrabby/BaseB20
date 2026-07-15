import { displayLogoUrl, logoProxyUrl } from "./image-url";

const FALLBACK_ORIGIN = "https://base.nurlab.xyz";

/**
 * Dynamic metadata API fallback (legacy). Prefer IPFS contractURI from /api/ipfs-metadata.
 */
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
  const metadataImage = logoProxyUrl(image, base) || displayLogoUrl(image, base);
  if (metadataImage) url.searchParams.set("image", metadataImage);
  if (image.trim()) url.searchParams.set("source", image.trim());
  return url.toString();
}
