function send(res, status, body) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("cache-control", "public, max-age=3600, s-maxage=86400");
  res.end(JSON.stringify(body));
}

function clean(value, fallback, max = 120) {
  const text = typeof value === "string" ? value.trim() : "";
  return (text || fallback).slice(0, max);
}

function cleanImage(value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "";
  if (!/^(https?|ipfs):\/\//i.test(text)) return "";
  return text.slice(0, 600);
}

function publicImageUrl(value) {
  const text = cleanImage(value);
  if (!text) return "";
  if (/^ipfs:\/\//i.test(text)) {
    const path = text.replace(/^ipfs:\/\//i, "").replace(/^ipfs\//i, "").replace(/^\/+/, "");
    return path ? `https://gateway.pinata.cloud/ipfs/${path}` : "";
  }
  return text;
}

function cleanSource(value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "";
  if (!/^(https?|ipfs):\/\//i.test(text)) return "";
  return text.slice(0, 600);
}

module.exports = function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("access-control-allow-origin", "*");
    res.setHeader("access-control-allow-methods", "GET, OPTIONS");
    res.setHeader("access-control-allow-headers", "content-type");
    res.statusCode = 204;
    return res.end();
  }
  if (req.method !== "GET") {
    res.setHeader("allow", "GET, OPTIONS");
    return send(res, 405, { error: "Method not allowed." });
  }

  const name = clean(req.query.name, "B20 Token");
  const symbol = clean(req.query.symbol, "B20", 24).toUpperCase();
  const image = publicImageUrl(req.query.image);
  const source = cleanSource(req.query.source);
  const logo = publicImageUrl(source) || image;

  return send(res, 200, {
    name,
    symbol,
    description: `${name} (${symbol}) is a native B20 token on Base.`,
    image,
    image_url: image,
    logoURI: logo,
    external_url: "https://base.nurlab.xyz",
    properties: {
      chain: "Base",
      standard: "B20",
      type: "Asset",
    },
  });
};
