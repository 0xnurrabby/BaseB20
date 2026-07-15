const FALLBACK_ORIGIN = "https://base.nurlab.xyz";
const CID_RE = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{50,})$/i;

export function appOrigin(origin?: string) {
  return origin || (typeof window !== "undefined" ? window.location.origin : FALLBACK_ORIGIN);
}

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

/** Extract a CIDv0/CIDv1 from ipfs://, gateway URLs, proxy URLs, or bare CID strings. */
export function extractCid(value: string) {
  const text = value.trim();
  if (!text) return "";

  if (/^ipfs:\/\//i.test(text)) {
    const path = text.replace(/^ipfs:\/\//i, "").replace(/^ipfs\//i, "").replace(/^\/+/, "");
    const cid = path.split(/[/?#]/)[0] || "";
    return CID_RE.test(cid) ? cid : "";
  }

  try {
    const url = new URL(text, FALLBACK_ORIGIN);
    const cidParam = url.searchParams.get("cid") || url.searchParams.get("ipfs") || "";
    if (CID_RE.test(cidParam)) return cidParam;

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

export function logoProxyUrl(cidOrUri: string, origin?: string) {
  const cid = extractCid(cidOrUri);
  if (!cid) return "";
  const url = new URL("/api/logo-image", appOrigin(origin));
  url.searchParams.set("cid", cid);
  return url.toString();
}

export function pinataGatewayUrl(value: string) {
  const cid = extractCid(value);
  return cid ? `https://gateway.pinata.cloud/ipfs/${cid}` : value.trim();
}

/**
 * Browser-safe logo URL for <img src>.
 * Converts ipfs:// to same-origin /api/logo-image proxy (BaseScan uses contractURI JSON instead).
 */
export function displayLogoUrl(value?: string, origin?: string) {
  const text = value?.trim() || "";
  if (!text) return "";
  if (text.startsWith("blob:") || text.startsWith("data:")) return text;

  const proxied = logoProxyUrl(text, origin);
  if (proxied) return proxied;

  try {
    const parsed = new URL(text, appOrigin(origin));
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "";
    if (parsed.hostname.toLowerCase() === "i.ibb.co") {
      const url = new URL("/api/logo-image", appOrigin(origin));
      url.searchParams.set("url", text);
      return url.toString();
    }
    return parsed.toString();
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
