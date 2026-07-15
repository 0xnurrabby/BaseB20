const IPFS_GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://dweb.link/ipfs/",
  "https://w3s.link/ipfs/",
] as const;

export function logoUrlError(value: string) {
  const text = value.trim();
  if (!text) return "";
  if (/^ipfs:\/\//i.test(text)) return "";

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return "Use an https:// or ipfs:// image link.";
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return "Use an https:// or ipfs:// image link.";
  }

  const host = url.hostname.toLowerCase();
  if (host === "ibb.co" || host === "www.ibb.co") {
    return "Use a direct image link, not a viewer page link.";
  }

  return "";
}

export function ipfsCidPath(value: string) {
  const text = value.trim();
  if (!/^ipfs:\/\//i.test(text)) return "";
  return text.replace(/^ipfs:\/\//i, "").replace(/^ipfs\//i, "").replace(/^\/+/, "");
}

export function ipfsGatewayUrl(value: string, gatewayIndex = 0) {
  const text = value.trim();
  const path = ipfsCidPath(text);
  if (!path) return text;
  const base = IPFS_GATEWAYS[Math.max(0, Math.min(gatewayIndex, IPFS_GATEWAYS.length - 1))];
  return `${base}${path}`;
}

export function nextIpfsGatewayUrl(value: string, gatewayIndex: number) {
  const path = ipfsCidPath(value);
  if (!path) return "";
  const next = gatewayIndex + 1;
  if (next >= IPFS_GATEWAYS.length) return "";
  return ipfsGatewayUrl(value, next);
}

export function isLegacyDirectImageUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && url.hostname.toLowerCase() === "i.ibb.co" && /\.(png|jpe?g|gif|webp)$/i.test(url.pathname);
  } catch {
    return false;
  }
}
