const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

const IPFS_GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://dweb.link/ipfs/",
  "https://w3s.link/ipfs/",
];

const CID_RE = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{50,})$/i;

function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("access-control-allow-origin", "*");
  res.end(JSON.stringify(body));
}

function sendOptions(res) {
  res.statusCode = 204;
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-methods", "GET, OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type");
  res.end();
}

function extractCid(value) {
  const text = String(value || "").trim();
  if (!text) return "";

  if (/^ipfs:\/\//i.test(text)) {
    const path = text.replace(/^ipfs:\/\//i, "").replace(/^ipfs\//i, "").replace(/^\/+/, "");
    const cid = path.split(/[/?#]/)[0] || "";
    return CID_RE.test(cid) ? cid : "";
  }

  try {
    const url = new URL(text);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";

    const host = url.hostname.toLowerCase();
    const ipfsIdx = url.pathname.toLowerCase().indexOf("/ipfs/");
    if (ipfsIdx >= 0) {
      const cid = url.pathname.slice(ipfsIdx + 6).split(/[/?#]/)[0] || "";
      return CID_RE.test(cid) ? cid : "";
    }

    const sub = host.match(/^(.+)\.ipfs\.[a-z0-9.-]+$/i);
    if (sub && CID_RE.test(sub[1])) return sub[1];
  } catch {
    // bare cid
  }

  const bare = text.split(/[/?#]/)[0] || "";
  return CID_RE.test(bare) ? bare : "";
}

function legacyIbbUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (url.protocol !== "https:") return "";
    if (url.hostname.toLowerCase() !== "i.ibb.co") return "";
    if (!/\.(png|jpe?g|gif|webp)$/i.test(url.pathname)) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function upstreamCandidates(req) {
  const cid = extractCid(req.query.cid || req.query.ipfs || "");
  const raw = typeof req.query.url === "string" ? req.query.url.trim() : "";
  const fromUrl = extractCid(raw);
  const resolvedCid = cid || fromUrl;
  if (resolvedCid) {
    return IPFS_GATEWAYS.map((base) => `${base}${resolvedCid}`);
  }
  const ibb = legacyIbbUrl(raw);
  return ibb ? [ibb] : [];
}

async function fetchImage(url) {
  const upstream = await fetch(url, {
    headers: {
      accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,*/*",
      "user-agent": "BaseB20/1.0 (+https://base.nurlab.xyz)",
    },
  });
  if (!upstream.ok) {
    throw new Error(`upstream ${upstream.status}`);
  }
  const contentType = String(upstream.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!contentType.startsWith("image/")) {
    throw new Error("not an image");
  }
  const contentLength = Number(upstream.headers.get("content-length") || 0);
  if (contentLength > MAX_IMAGE_BYTES) {
    throw new Error("too large");
  }
  const body = Buffer.from(await upstream.arrayBuffer());
  if (body.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("too large");
  }
  return { body, contentType: contentType || "image/png" };
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return sendOptions(res);
  if (req.method !== "GET") {
    res.setHeader("allow", "GET, OPTIONS");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const candidates = upstreamCandidates(req);
  if (!candidates.length) {
    return sendJson(res, 400, { error: "Use an IPFS CID, ipfs:// URI, or supported image URL." });
  }

  let lastError = "Image host is unreachable.";
  for (const url of candidates) {
    try {
      const image = await fetchImage(url);
      res.statusCode = 200;
      res.setHeader("content-type", image.contentType);
      res.setHeader("access-control-allow-origin", "*");
      res.setHeader("cache-control", "public, max-age=86400, s-maxage=604800, immutable");
      res.setHeader("x-content-type-options", "nosniff");
      res.end(image.body);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }

  return sendJson(res, 502, { error: `Could not load logo image (${lastError}).` });
};
