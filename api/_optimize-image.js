/**
 * Compress token logos for IPFS: small file, sharp square look.
 * Target ~120 KB, max edge 512px. Prefers WebP, keeps PNG when needed.
 */

const MAX_EDGE = 512;
const TARGET_BYTES = 120 * 1024;
const HARD_MAX_BYTES = 250 * 1024;

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

  const base = sharp(bytes, {
    animated: false,
    limitInputPixels: 40_000_000,
    failOn: "none",
  })
    .rotate()
    .resize(MAX_EDGE, MAX_EDGE, {
      fit: "inside",
      withoutEnlargement: true,
      kernel: "lanczos3",
    });

  // Prefer WebP ladder for smallest clear logos.
  for (const quality of [82, 72, 62, 52, 42]) {
    const out = await base.clone().webp({ quality, effort: 4, alphaQuality: 90 }).toBuffer();
    if (out.byteLength <= TARGET_BYTES || quality === 42) {
      if (out.byteLength <= HARD_MAX_BYTES || quality === 42) {
        return { bytes: out, type: "image/webp", ext: "webp" };
      }
    }
  }

  // PNG fallback (good for flat logos / transparency).
  const png = await base
    .clone()
    .png({ compressionLevel: 9, palette: true, quality: 80, effort: 8 })
    .toBuffer();
  if (png.byteLength <= HARD_MAX_BYTES) {
    return { bytes: png, type: "image/png", ext: "png" };
  }

  // Last resort: smaller WebP.
  const tiny = await base.clone().webp({ quality: 35, effort: 6 }).toBuffer();
  return { bytes: tiny, type: "image/webp", ext: "webp" };
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
      // Keep original only if already smaller and acceptable type.
      const type = String(inputType || "").toLowerCase();
      const alreadySmall =
        bytes.byteLength <= TARGET_BYTES &&
        bytes.byteLength <= optimized.bytes.byteLength &&
        (type === "image/png" || type === "image/jpeg" || type === "image/webp");
      if (alreadySmall) {
        const ext = type === "image/jpeg" ? "jpg" : type === "image/webp" ? "webp" : "png";
        return { bytes, type, ext, optimized: false };
      }
      return { ...optimized, optimized: true };
    }
  } catch {
    // fall through
  }

  // No sharp / failed: pass through if under hard max.
  if (bytes.byteLength > HARD_MAX_BYTES) {
    throw new Error("Image is too large after processing. Use a simpler logo under 3 MB.");
  }
  const type = String(inputType || "image/png").toLowerCase();
  const ext = type === "image/jpeg" ? "jpg" : type === "image/webp" ? "webp" : type === "image/gif" ? "gif" : "png";
  return { bytes, type: type.startsWith("image/") ? type : "image/png", ext, optimized: false };
}

module.exports = { optimizeLogoImage, TARGET_BYTES, MAX_EDGE };
