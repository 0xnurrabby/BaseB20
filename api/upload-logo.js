const { pinFileWithFallback } = require("./_pinata");
const { readJson, send } = require("./_http");
const { optimizeLogoImage } = require("./_optimize-image");

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

function decodedBase64Bytes(value) {
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return Math.floor((value.length * 3) / 4) - padding;
}

function safeName(value) {
  return String(value || "token-logo")
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "token-logo";
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    return send(res, 405, { error: "Method not allowed." });
  }

  let payload;
  try {
    payload = await readJson(req, MAX_IMAGE_BYTES * 2);
  } catch (error) {
    return send(res, 400, { error: error instanceof Error ? error.message : "Invalid upload payload." });
  }

  const image = typeof payload.image === "string" ? payload.image : "";
  const name = safeName(payload.name);
  const type = typeof payload.type === "string" ? payload.type : "";
  const size = Number(payload.size ?? 0);

  if (!image || !/^[A-Za-z0-9+/=]+$/.test(image)) {
    return send(res, 400, { error: "Invalid image data." });
  }
  if (decodedBase64Bytes(image) > MAX_IMAGE_BYTES) {
    return send(res, 400, { error: "Image is too large. Keep it under 3 MB." });
  }
  if (type && !ACCEPTED_IMAGE_TYPES.has(type) && !String(type).startsWith("image/")) {
    return send(res, 400, { error: "Unsupported file type. Use PNG, JPG, GIF or WEBP." });
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_IMAGE_BYTES) {
    return send(res, 400, { error: "Image is too large. Keep it under 3 MB." });
  }

  try {
    const optimized = await optimizeLogoImage(Buffer.from(image, "base64"), type || "image/png");
    const pinned = await pinFileWithFallback({
      bytes: optimized.bytes,
      type: optimized.type,
      filename: `${name}.${optimized.ext}`,
      name,
    });
    const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${pinned.cid}`;
    return send(res, 200, {
      // HTTPS for wallet import; IPFS still available as ipfsUri.
      url: gatewayUrl,
      ipfsUri: `ipfs://${pinned.cid}`,
      gatewayUrl,
      displayUrl: `https://base.nurlab.xyz/api/logo-image?cid=${encodeURIComponent(pinned.cid)}`,
      pinataKey: pinned.credentialLabel,
      bytes: optimized.bytes.byteLength,
      optimized: optimized.optimized,
      contentType: optimized.type,
    });
  } catch (error) {
    return send(res, 400, { error: error instanceof Error ? error.message : "IPFS image upload failed." });
  }
};
