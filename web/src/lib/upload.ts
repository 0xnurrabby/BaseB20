/**
 * Image upload via imgbb. Used by the token-logo picker: the user selects an
 * image from their device, we host it on imgbb and get back a stable URL that
 * gets stored on-chain as the token's logoURI.
 */

const IMGBB_KEY = import.meta.env.VITE_IMGBB_API_KEY?.trim();
const ENDPOINT = "https://api.imgbb.com/1/upload";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // imgbb free tier caps at 32MB; we keep logos small.
export const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml"];

export function isUploadConfigured(): boolean {
  return !!IMGBB_KEY;
}

/** Read a File as a base64 string (without the data: prefix), which imgbb expects. */
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
  url: string; // direct image URL
  displayUrl: string; // imgbb-optimized display URL
  deleteUrl?: string;
}

/** Validate + upload an image file to imgbb. Throws with a friendly message on failure. */
export async function uploadImage(file: File): Promise<UploadResult> {
  if (!IMGBB_KEY) throw new Error("Image upload isn't configured. Paste a logo URL instead.");
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Unsupported file type. Use PNG, JPG, GIF, WEBP or SVG.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("Image is too large. Keep it under 5 MB.");
  }

  const base64 = await fileToBase64(file);
  const body = new FormData();
  body.append("image", base64);
  body.append("name", file.name.replace(/\.[^.]+$/, "").slice(0, 60) || "token-logo");

  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(IMGBB_KEY)}`, { method: "POST", body });
  } catch {
    throw new Error("Upload failed — check your connection and try again.");
  }

  if (!res.ok) {
    throw new Error(`Upload failed (${res.status}). Try a different image.`);
  }

  const json = (await res.json()) as {
    success?: boolean;
    data?: { url?: string; display_url?: string; delete_url?: string };
    error?: { message?: string };
  };

  if (!json.success || !json.data?.url) {
    throw new Error(json.error?.message ?? "Upload failed. Try a different image.");
  }

  return {
    url: json.data.url,
    displayUrl: json.data.display_url ?? json.data.url,
    deleteUrl: json.data.delete_url,
  };
}
