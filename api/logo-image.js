const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const ALLOWED_HOST = "i.ibb.co";

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

function validateImageUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return null;
    if (url.hostname.toLowerCase() !== ALLOWED_HOST) return null;
    if (!/\.(png|jpe?g|gif|webp)$/i.test(url.pathname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return sendOptions(res);
  if (req.method !== "GET") {
    res.setHeader("allow", "GET, OPTIONS");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const imageUrl = validateImageUrl(req.query.url);
  if (!imageUrl) {
    return sendJson(res, 400, { error: "Use a direct i.ibb.co image URL." });
  }

  let upstream;
  try {
    upstream = await fetch(imageUrl, {
      headers: {
        accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,*/*",
        "user-agent": "BaseB20/1.0 (+https://base.nurlab.xyz)",
      },
    });
  } catch {
    return sendJson(res, 502, { error: "Image host is unreachable." });
  }

  if (!upstream.ok) {
    return sendJson(res, upstream.status >= 500 ? 502 : 400, { error: "Image host rejected the request." });
  }

  const contentType = upstream.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("image/")) {
    return sendJson(res, 400, { error: "URL did not return an image." });
  }

  const contentLength = Number(upstream.headers.get("content-length") || 0);
  if (contentLength > MAX_IMAGE_BYTES) {
    return sendJson(res, 400, { error: "Image is too large." });
  }

  const body = Buffer.from(await upstream.arrayBuffer());
  if (body.byteLength > MAX_IMAGE_BYTES) {
    return sendJson(res, 400, { error: "Image is too large." });
  }

  res.statusCode = 200;
  res.setHeader("content-type", contentType);
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("cache-control", "public, max-age=86400, s-maxage=604800, immutable");
  res.setHeader("x-content-type-options", "nosniff");
  res.end(body);
};
