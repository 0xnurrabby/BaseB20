/** Client-side logo optimize: max 512px, small file, still sharp on screen. */

export const LOGO_MAX_EDGE = 512;
export const LOGO_TARGET_BYTES = 120 * 1024;
export const LOGO_HARD_MAX_BYTES = 250 * 1024;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read the image."));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Couldn't compress the image."))),
      type,
      quality
    );
  });
}

function drawCover(img: HTMLImageElement, edge: number) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) throw new Error("Invalid image dimensions.");

  const scale = Math.min(1, edge / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, tw, th);
  return canvas;
}

async function bestBlob(canvas: HTMLCanvasElement, baseName: string): Promise<File> {
  const candidates: Array<{ type: string; quality?: number; ext: string }> = [
    { type: "image/webp", quality: 0.84, ext: "webp" },
    { type: "image/webp", quality: 0.72, ext: "webp" },
    { type: "image/webp", quality: 0.6, ext: "webp" },
    { type: "image/webp", quality: 0.48, ext: "webp" },
    { type: "image/png", ext: "png" },
    { type: "image/jpeg", quality: 0.82, ext: "jpg" },
    { type: "image/jpeg", quality: 0.7, ext: "jpg" },
    { type: "image/jpeg", quality: 0.58, ext: "jpg" },
  ];

  let best: { blob: Blob; ext: string } | null = null;

  for (const c of candidates) {
    try {
      const blob = await canvasToBlob(canvas, c.type, c.quality);
      if (!best || blob.size < best.blob.size) best = { blob, ext: c.ext };
      if (blob.size <= LOGO_TARGET_BYTES) {
        best = { blob, ext: c.ext };
        break;
      }
    } catch {
      // browser may not support webp encode
    }
  }

  if (!best) throw new Error("Couldn't compress the image.");

  // If still huge, force smaller jpeg.
  if (best.blob.size > LOGO_HARD_MAX_BYTES) {
    for (const q of [0.5, 0.4, 0.3]) {
      try {
        const blob = await canvasToBlob(canvas, "image/jpeg", q);
        best = { blob, ext: "jpg" };
        if (blob.size <= LOGO_HARD_MAX_BYTES) break;
      } catch {
        // ignore
      }
    }
  }

  if (best.blob.size > LOGO_HARD_MAX_BYTES) {
    throw new Error("Image is still too large after compress. Try a simpler logo.");
  }

  const name = `${baseName.replace(/\.[^.]+$/, "") || "token-logo"}.${best.ext}`;
  return new File([best.blob], name, {
    type: best.blob.type || (best.ext === "png" ? "image/png" : best.ext === "webp" ? "image/webp" : "image/jpeg"),
    lastModified: Date.now(),
  });
}

/**
 * Resize + compress a logo File for token use.
 * Keeps visual quality for circular token avatars while minimizing bytes.
 */
export async function optimizeLogoFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Unsupported file type. Use PNG, JPG, GIF or WEBP.");
  }

  // Already tiny: skip work.
  if (file.size > 0 && file.size <= LOGO_TARGET_BYTES && file.type !== "image/gif") {
    // Still resize huge dimensions even if file is small (rare).
    try {
      const img = await loadImage(file);
      const maxSide = Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height);
      if (maxSide <= LOGO_MAX_EDGE) return file;
    } catch {
      return file;
    }
  }

  const img = await loadImage(file);
  const canvas = drawCover(img, LOGO_MAX_EDGE);
  return bestBlob(canvas, file.name || "token-logo");
}
