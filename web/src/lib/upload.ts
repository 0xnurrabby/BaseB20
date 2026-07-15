/**
 * Image upload via the server-side IPFS pinning route. Used by the token-logo
 * picker: the user selects an image from their device, we compress it, pin it,
 * and store the resulting ipfs:// URI on-chain as the token's logoURI.
 */

import { optimizeLogoFile } from "./optimize-image";

export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp"];

/** Read a File as a base64 string without the data: prefix. */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read the file."));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

export interface UploadResult {
  url: string;
  gatewayUrl?: string;
  pinataKey?: string;
  deleteUrl?: string;
}

/** Validate, compress and upload an image file. Throws with a friendly message on failure. */
export async function uploadImage(file: File): Promise<UploadResult> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type) && !file.type.startsWith("image/")) {
    throw new Error("Unsupported file type. Use PNG, JPG, GIF or WEBP.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image is too large. Keep it under 3 MB.");
  }

  const optimized = await optimizeLogoFile(file);
  const base64 = await fileToBase64(optimized);
  let res: Response;
  try {
    res = await fetch("/api/upload-logo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        image: base64,
        name: optimized.name,
        type: optimized.type,
        size: optimized.size,
      }),
    });
  } catch {
    throw new Error("Upload failed - check your connection and try again.");
  }

  const json = (await res.json().catch(() => ({}))) as {
    url?: string;
    gatewayUrl?: string;
    pinataKey?: string;
    deleteUrl?: string;
    error?: string;
  };

  if (!res.ok) {
    throw new Error(json.error ?? `Upload failed (${res.status}). Try a different image.`);
  }
  if (!json.url) {
    throw new Error("Upload failed. Try a different image.");
  }

  return {
    url: json.url,
    gatewayUrl: json.gatewayUrl,
    pinataKey: json.pinataKey,
    deleteUrl: json.deleteUrl,
  };
}
