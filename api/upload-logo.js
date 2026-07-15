const { pinFileWithFallback } = require("./_pinata");
const { readJson, send } = require("./_http");

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

function decodedBase64Bytes(value) {
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return Math.floor((value.length * 3) / 4) - padding;
}

function extensionFor(type) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/gif") return "gif";
  if (type === "image/webp") return "webp";
  return "png";
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
  if (!ACCEPTED_IMAGE_TYPES.has(type)) {
    return send(res, 400, { error: "Unsupported file type. Use PNG, JPG, GIF or WEBP." });
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_IMAGE_BYTES) {
    return send(res, 400, { error: "Image is too large. Keep it under 3 MB." });
  }

  try {
    const pinned = await pinFileWithFallback({
      bytes: Buffer.from(image, "base64"),
      type,
      filename: `${name}.${extensionFor(type)}`,
      name,
    });
    return send(res, 200, {
      url: `ipfs://${pinned.cid}`,
      gatewayUrl: `https://gateway.pinata.cloud/ipfs/${pinned.cid}`,
      displayUrl: `/api/logo-image?cid=${encodeURIComponent(pinned.cid)}`,
      pinataKey: pinned.credentialLabel,
    });
  } catch (error) {
    return send(res, 400, { error: error instanceof Error ? error.message : "IPFS image upload failed." });
  }
};
