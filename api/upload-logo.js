const ENDPOINT = "https://api.imgbb.com/1/upload";
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > MAX_IMAGE_BYTES * 2) {
        reject(new Error("Payload is too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(raw || "{}"));
      } catch {
        reject(new Error("Invalid JSON payload."));
      }
    });
    req.on("error", reject);
  });
}

function decodedBase64Bytes(value) {
  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return Math.floor((value.length * 3) / 4) - padding;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    return send(res, 405, { error: "Method not allowed." });
  }

  const key = process.env.IMGBB_API_KEY?.trim();
  if (!key) {
    return send(res, 500, { error: "Image upload is not configured." });
  }

  let payload;
  try {
    payload = await readJson(req);
  } catch (error) {
    return send(res, 400, { error: error instanceof Error ? error.message : "Invalid upload payload." });
  }

  const image = typeof payload.image === "string" ? payload.image : "";
  const name = typeof payload.name === "string" ? payload.name : "token-logo";
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

  const body = new FormData();
  body.append("image", image);
  body.append("name", name.replace(/\.[^.]+$/, "").slice(0, 60) || "token-logo");

  let uploadRes;
  try {
    uploadRes = await fetch(`${ENDPOINT}?key=${encodeURIComponent(key)}`, { method: "POST", body });
  } catch {
    return send(res, 502, { error: "Upload failed. Check your connection and try again." });
  }

  if (!uploadRes.ok) {
    return send(res, uploadRes.status >= 500 ? 502 : 400, {
      error: `Upload failed (${uploadRes.status}). Try a different image.`,
    });
  }

  const json = await uploadRes.json();
  if (!json?.success || !json?.data?.url) {
    return send(res, 400, { error: json?.error?.message ?? "Upload failed. Try a different image." });
  }

  return send(res, 200, {
    url: json.data.url,
    displayUrl: json.data.display_url ?? json.data.url,
    deleteUrl: json.data.delete_url,
  });
};
