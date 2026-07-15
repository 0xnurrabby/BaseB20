const FALLBACK_ORIGIN = "https://base.nurlab.xyz";
const CID_RE = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{50,})$/i;

export function logoUrlError(value: string) {
  const text = value.trim();
  if (!text) return "";
  if (/^ipfs:\/\//i.test(text)) return "";
  if (extractCid(text)) return "";

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

/** Extract a CIDv0/CIDv1 from ipfs://, gateway URLs, or bare CID strings. */
export function extractCid(value: string) {
  const text = value.trim();
  if (!text) return "";

  if (/^ipfs:\/\//i.test(text)) {
    const path = text.replace(/^ipfs:\/\//i, "").replace(/^ipfs\//i, "").replace(/^\/+/, "");
    const cid = path.split(/[/?#]/)[0] || "";
    return CID_RE.test(cid) ? cid : "";
  }

  try {
    const url = new URL(text);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";

    const ipfsIdx = url.pathname.toLowerCase().indexOf("/ipfs/");
    if (ipfsIdx >= 0) {
      const cid = url.pathname.slice(ipfsIdx + 6).split(/[/?#]/)[0] || "";
      return CID_RE.test(cid) ? cid : "";
    }

    const sub = url.hostname.match(/^(.+)\.ipfs\.[a-z0-9.-]+$/i);
    if (sub && CID_RE.test(sub[1])) return sub[1];
  } catch {
    // bare cid
  }

  const bare = text.split(/[/?#]/)[0] || "";
  return CID_RE.test(bare) ? bare : "";
}

export function ipfsCidPath(value: string) {
  return extractCid(value);
}

/** Public Pinata gateway URL for wallets/explorers. */
export function pinataGatewayUrl(value: string) {
  const cid = extractCid(value);
  return cid ? `https://gateway.pinata.cloud/ipfs/${cid}` : value.trim();
}

/**
 * Browser-safe logo URL. Always prefers same-origin /api/logo-image so the UI
 * does not depend on third-party IPFS gateways that block browsers.
 */
export function displayLogoUrl(value?: string, origin?: string) {
  const text = value?.trim() || "";
  if (!text) return "";
  if (text.startsWith("blob:") || text.startsWith("data:")) return text;

  const base = origin || (typeof window !== "undefined" ? window.location.origin : FALLBACK_ORIGIN);
  const cid = extractCid(text);
  if (cid) {
    const url = new URL("/api/logo-image", base);
    url.searchParams.set("cid", cid);
    return url.toString();
  }

  try {
    const parsed = new URL(text);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    if (parsed.hostname.toLowerCase() === "i.ibb.co") {
      const url = new URL("/api/logo-image", base);
      url.searchParams.set("url", text);
      return url.toString();
    }
    return text;
  } catch {
    return "";
  }
}

/** @deprecated use displayLogoUrl */
export function ipfsGatewayUrl(value: string) {
  return displayLogoUrl(value);
}

export function isLegacyDirectImageUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && url.hostname.toLowerCase() === "i.ibb.co" && /\.(png|jpe?g|gif|webp)$/i.test(url.pathname);
  } catch {
    return false;
  }
}
