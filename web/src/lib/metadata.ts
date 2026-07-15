import { displayLogoUrl, pinataGatewayUrl } from "./image-url";

const FALLBACK_ORIGIN = "https://base.nurlab.xyz";

function buildMetadataImageUrl(image: string, base: string) {
  const clean = image.trim();
  if (!clean) return "";
  // Prefer HTTPS Pinata for wallets/explorers; fall back to same-origin proxy.
  const gateway = pinataGatewayUrl(clean);
  if (gateway.startsWith("https://")) return gateway;
  return displayLogoUrl(clean, base);
}

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
  const metadataImage = buildMetadataImageUrl(image, base);
  if (metadataImage) url.searchParams.set("image", metadataImage);
  if (image.trim()) url.searchParams.set("source", image.trim());
  return url.toString();
}
