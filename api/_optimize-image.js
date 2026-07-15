/**
 * Compress token logos for wallets:
 * - max 512px edge
 * - prefer JPEG (best wallet support, same as o1 LUNA logos)
 * - PNG only when transparency is needed
 * - target ~80-120 KB
 */

const MAX_EDGE = 512;
const TARGET_BYTES = 100 * 1024;
const HARD_MAX_BYTES = 200 * 1024;

function loadSharp() {
  try {
    return require("sharp");
  } catch {
    return null;
  }
}

async function optimizeWithSharp(bytes) {
  const sharp = loadSharp();
  if (!sharp) return null;

  const image = sharp(bytes, {
    animated: false,
    limitInputPixels: 40_000_000,
    failOn: "none",
  }).rotate();

  const meta = await image.metadata();
  const hasAlpha = Boolean(meta.hasAlpha);

  const base = image.resize(MAX_EDGE, MAX_EDGE, {
    fit: "inside",
    withoutEnlargement: true,
    kernel: "lanczos3",
  });

  // JPEG first — MetaMask / Coinbase / most wallets handle it best.
  if (!hasAlpha) {
    for (const quality of [86, 78, 70, 60, 50, 42]) {
      const out = await base
        .clone()
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .jpeg({ quality, mozjpeg: true, chromaSubsampling: "4:2:0" })
        .toBuffer();
      if (out.byteLength <= TARGET_BYTES || quality <= 50) {
        if (out.byteLength <= HARD_MAX_BYTES || quality === 42) {
          return { bytes: out, type: "image/jpeg", ext: "jpg" };
        }
      }
    }
  }

  // Transparent logos: PNG palette.
  for (const quality of [90, 80, 70]) {
    const png = await base
      .clone()
      .png({ compressionLevel: 9, palette: true, quality, effort: 8 })
      .toBuffer();
    if (png.byteLength <= TARGET_BYTES || quality === 70) {
      if (png.byteLength <= HARD_MAX_BYTES) {
        return { bytes: png, type: "image/png", ext: "png" };
      }
    }
  }

  // Last resort JPEG even with alpha (white background).
  const tiny = await base
    .clone()
    .flatten({ background: { r: 255, g: 255, b: 255 } })
    .jpeg({ quality: 40, mozjpeg: true })
    .toBuffer();
  return { bytes: tiny, type: "image/jpeg", ext: "jpg" };
}

/**
 * @param {Buffer} bytes
 * @param {string} [inputType]
 * @returns {Promise<{ bytes: Buffer, type: string, ext: string, optimized: boolean }>}
 */
async function optimizeLogoImage(bytes, inputType = "") {
  if (!Buffer.isBuffer(bytes) || bytes.byteLength === 0) {
    throw new Error("Invalid image data.");
  }

  try {
    const optimized = await optimizeWithSharp(bytes);
    if (optimized && optimized.bytes.byteLength > 0) {
      const type = String(inputType || "").toLowerCase();
      const alreadyGood =
        bytes.byteLength <= TARGET_BYTES &&
        bytes.byteLength <= optimized.bytes.byteLength &&
        (type === "image/jpeg" || type === "image/png");
      if (alreadyGood) {
        const ext = type === "image/jpeg" ? "jpg" : "png";
        return { bytes, type, ext, optimized: false };
      }
      return { ...optimized, optimized: true };
    }
  } catch {
    // fall through
  }

  if (bytes.byteLength > HARD_MAX_BYTES) {
    throw new Error("Image is too large after processing. Use a simpler logo under 3 MB.");
  }
  const type = String(inputType || "image/png").toLowerCase();
  const ext = type === "image/jpeg" ? "jpg" : type === "image/webp" ? "webp" : type === "image/gif" ? "gif" : "png";
  return { bytes, type: type.startsWith("image/") ? type : "image/png", ext, optimized: false };
}

module.exports = { optimizeLogoImage, TARGET_BYTES, MAX_EDGE };
