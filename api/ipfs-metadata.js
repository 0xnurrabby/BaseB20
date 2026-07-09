const { readJson, send } = require("./_http");

const PIN_FILE_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const PIN_JSON_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS";
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

function assertPinataKey() {
  const token = process.env.PINATA_JWT?.trim();
  if (!token) throw new Error("IPFS upload is not configured. Add PINATA_JWT in Vercel env.");
  return token;
}

async function pinFile({ bytes, type, filename, name }) {
  const token = assertPinataKey();
  const form = new FormData();
  form.append("file", new Blob([bytes], { type }), filename);
  form.append("pinataMetadata", JSON.stringify({ name }));
  form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  const res = await fetch(PIN_FILE_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.IpfsHash) {
    throw new Error(json.error?.details || json.error || `IPFS image upload failed (${res.status}).`);
  }
  return String(json.IpfsHash);
}

async function pinJson(content, name) {
  const token = assertPinataKey();
  const res = await fetch(PIN_JSON_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      pinataContent: content,
      pinataMetadata: { name },
      pinataOptions: { cidVersion: 1 },
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.IpfsHash) {
    throw new Error(json.error?.details || json.error || `IPFS metadata upload failed (${res.status}).`);
  }
  return String(json.IpfsHash);
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
    assertPinataKey();
    const name = clean(payload.name, "B20 Token");
    const symbol = clean(payload.symbol, "B20", 24).toUpperCase();
    const image = await imageFromPayload(payload, safeName(name, "b20-token"));
    const imageCid = image ? await pinFile({ ...image, name: `${symbol}-logo` }) : "";
    const imageUri = imageCid ? `ipfs://${imageCid}` : clean(payload.imageUrl, "", 600);
    const metadata = {
      name,
      symbol,
      description: `${name} (${symbol}) is a native B20 token on Base.`,
      image: imageUri,
      logoURI: imageUri,
      external_url: "https://base.nurlab.xyz",
      properties: {
        chain: "Base",
        standard: "B20",
        type: "Asset",
      },
    };
    const metadataCid = await pinJson(metadata, `${symbol}-metadata.json`);

    return send(res, 200, {
      contractURI: `ipfs://${metadataCid}`,
      logoURI: imageUri,
      imageURI: imageUri,
      metadataGatewayUrl: `https://gateway.pinata.cloud/ipfs/${metadataCid}`,
      imageGatewayUrl: imageCid ? `https://gateway.pinata.cloud/ipfs/${imageCid}` : "",
    });
  } catch (error) {
    return send(res, 400, { error: error instanceof Error ? error.message : "IPFS metadata upload failed." });
  }
};
