const { readJson, send } = require("./_http");
const { pinataCredentials, pinMetadataWithFallback } = require("./_pinata");

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

function decodedBase64Bytes(value) {
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return Math.floor((value.length * 3) / 4) - padding;
}

function clean(value, fallback, max = 120) {
  const text = typeof value === "string" ? value.trim() : "";
  return (text || fallback).slice(0, max);
}

function safeName(value, fallback) {
  return clean(value, fallback, 80).replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "") || fallback;
}

function extensionFor(type) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/gif") return "gif";
  if (type === "image/webp") return "webp";
  return "png";
}

async function imageFromPayload(payload, tokenName) {
  const type = typeof payload.imageType === "string" ? payload.imageType : "";
  const base64 = typeof payload.imageBase64 === "string" ? payload.imageBase64 : "";
  const name = safeName(payload.imageName, `${tokenName}-logo`);

  if (base64) {
    if (!/^[A-Za-z0-9+/=]+$/.test(base64)) throw new Error("Invalid image data.");
    if (!ACCEPTED_IMAGE_TYPES.has(type)) throw new Error("Unsupported image type. Use PNG, JPG, GIF or WEBP.");
    if (decodedBase64Bytes(base64) > MAX_IMAGE_BYTES) throw new Error("Image is too large. Keep it under 3 MB.");
    return {
      bytes: Buffer.from(base64, "base64"),
      type,
      filename: `${name}.${extensionFor(type)}`,
    };
  }

  const imageUrl = typeof payload.imageUrl === "string" ? payload.imageUrl.trim() : "";
  if (!imageUrl || imageUrl.startsWith("ipfs://")) return null;
  let url;
  try {
    url = new URL(imageUrl);
  } catch {
    throw new Error("Invalid image URL.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Image URL must be https:// or ipfs://.");

  const upstream = await fetch(url, { headers: { accept: "image/png,image/jpeg,image/gif,image/webp,*/*" } });
  if (!upstream.ok) throw new Error(`Could not fetch image (${upstream.status}).`);
  const upstreamType = String(upstream.headers.get("content-type") || "").split(";")[0].toLowerCase();
  if (!ACCEPTED_IMAGE_TYPES.has(upstreamType)) throw new Error("Image URL did not return PNG, JPG, GIF or WEBP.");
  const bytes = Buffer.from(await upstream.arrayBuffer());
  if (bytes.byteLength > MAX_IMAGE_BYTES) throw new Error("Image is too large. Keep it under 3 MB.");

  return {
    bytes,
    type: upstreamType,
    filename: `${name}.${extensionFor(upstreamType)}`,
  };
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

  try {
    pinataCredentials();
    const name = clean(payload.name, "B20 Token");
    const symbol = clean(payload.symbol, "B20", 24).toUpperCase();
    const image = await imageFromPayload(payload, safeName(name, "b20-token"));
    const metadata = {
      name,
      symbol,
      description: `${name} (${symbol}) is a native B20 token on Base.`,
      image: clean(payload.imageUrl, "", 600),
      logoURI: clean(payload.imageUrl, "", 600),
      external_url: "https://base.nurlab.xyz",
      properties: {
        chain: "Base",
        standard: "B20",
        type: "Asset",
      },
    };
    const pinned = await pinMetadataWithFallback({
      image: image ? { ...image, name: `${symbol}-logo` } : null,
      metadata,
      metadataName: `${symbol}-metadata.json`,
    });

    const publicOrigin = (process.env.PUBLIC_APP_URL || "https://base.nurlab.xyz").replace(/\/$/, "");
    const imageGatewayUrl = pinned.imageCid ? `https://gateway.pinata.cloud/ipfs/${pinned.imageCid}` : "";
    // On-chain logoURI must be a direct HTTPS image browsers can load.
    const logoURI = pinned.imageCid
      ? `${publicOrigin}/api/logo-image?cid=${encodeURIComponent(pinned.imageCid)}`
      : pinned.imageUri || "";

    return send(res, 200, {
      contractURI: `ipfs://${pinned.metadataCid}`,
      logoURI,
      imageURI: logoURI,
      ipfsUri: pinned.imageUri,
      metadataGatewayUrl: `https://gateway.pinata.cloud/ipfs/${pinned.metadataCid}`,
      imageGatewayUrl,
      pinataKey: pinned.credentialLabel,
    });
  } catch (error) {
    return send(res, 400, { error: error instanceof Error ? error.message : "IPFS metadata upload failed." });
  }
};
