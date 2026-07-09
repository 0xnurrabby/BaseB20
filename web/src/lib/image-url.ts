export function logoUrlError(value: string) {
  const text = value.trim();
  if (!text) return "";
  if (/^ipfs:\/\//i.test(text)) return "";

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return "Use an https:// or ipfs:// image link.";
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return "Use an https:// or ipfs:// image link.";
  }

  const host = url.hostname.toLowerCase();
  if (host === "ibb.co" || host === "www.ibb.co") {
    return "Use ImgBB Direct link (i.ibb.co/...png), not Viewer link (ibb.co/...).";
  }

  return "";
}

export function isDirectImgBBImageUrl(value: string) {
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" && url.hostname.toLowerCase() === "i.ibb.co" && /\.(png|jpe?g|gif|webp)$/i.test(url.pathname);
  } catch {
    return false;
  }
}
