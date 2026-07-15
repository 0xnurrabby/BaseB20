const PIN_FILE_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const PIN_JSON_URL = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

function splitEnv(value) {
  return String(value || "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function pinataCredentials() {
  const jwtTokens = [
    ...splitEnv(process.env.PINATA_JWT),
    ...splitEnv(process.env.PINATA_JWTS),
    ...splitEnv(process.env.PINATA_API_JWT),
    ...splitEnv(process.env.PINATA_API_JWTS),
  ];
  const apiKeys = [
    ...splitEnv(process.env.PINATA_API_KEY),
    ...splitEnv(process.env.PINATA_API_KEYS),
  ];
  const apiSecrets = [
    ...splitEnv(process.env.PINATA_SECRET_API_KEY),
    ...splitEnv(process.env.PINATA_SECRET_API_KEYS),
    ...splitEnv(process.env.PINATA_API_SECRET_KEY),
    ...splitEnv(process.env.PINATA_API_SECRET_KEYS),
    ...splitEnv(process.env.PINATA_SECRET_KEY),
    ...splitEnv(process.env.PINATA_SECRET_KEYS),
  ];
  const apiPairs = [
    ...splitEnv(process.env.PINATA_API),
    ...splitEnv(process.env.PINATA_APIS),
    ...splitEnv(process.env.PINATA_API_PAIR),
    ...splitEnv(process.env.PINATA_API_PAIRS),
  ];

  const credentials = jwtTokens.map((token, index) => ({
    label: `PINATA_JWT #${index + 1}`,
    headers: { Authorization: `Bearer ${token}` },
  }));

  if ((apiKeys.length || apiSecrets.length) && apiKeys.length !== apiSecrets.length) {
    throw new Error("PINATA_API_KEY and PINATA_API_SECRET_KEY must have the same number of comma-separated values.");
  }

  for (let i = 0; i < Math.min(apiKeys.length, apiSecrets.length); i += 1) {
    credentials.push({
      label: `PINATA_API_KEY #${i + 1}`,
      headers: {
        pinata_api_key: apiKeys[i],
        pinata_secret_api_key: apiSecrets[i],
        pinata_api_secret_key: apiSecrets[i],
      },
    });
  }

  apiPairs.forEach((pair, index) => {
    const [apiKey, apiSecret, extra] = pair.split(/[:|]/).map((item) => item.trim());
    if (!apiKey || !apiSecret || extra) {
      throw new Error("PINATA_API pairs must look like apiKey:secretApiKey,apiKey2:secretApiKey2.");
    }
    credentials.push({
      label: `PINATA_API #${index + 1}`,
      headers: {
        pinata_api_key: apiKey,
        pinata_secret_api_key: apiSecret,
        pinata_api_secret_key: apiSecret,
      },
    });
  });

  if (credentials.length === 0) {
    throw new Error("IPFS upload is not configured. Add PINATA_JWT or PINATA_API_KEY with PINATA_API_SECRET_KEY in Vercel env. Use commas for multiple keys.");
  }

  return credentials;
}

function pinataErrorDetail(json, fallback) {
  if (json?.error?.details) return String(json.error.details);
  if (json?.error) return typeof json.error === "string" ? json.error : JSON.stringify(json.error);
  if (json?.message) return String(json.message);
  return fallback;
}

async function pinFileWithCredential({ bytes, type, filename, name }, credential) {
  const form = new FormData();
  form.append("file", new Blob([bytes], { type }), filename);
  form.append("pinataMetadata", JSON.stringify({ name }));
  form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  const res = await fetch(PIN_FILE_URL, {
    method: "POST",
    headers: credential.headers,
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.IpfsHash) {
    const detail = pinataErrorDetail(json, `Pinata file upload failed (${res.status}).`);
    throw new Error(`${credential.label}: ${detail}`);
  }
  return String(json.IpfsHash);
}

async function pinJsonWithCredential(content, name, credential) {
  const res = await fetch(PIN_JSON_URL, {
    method: "POST",
    headers: {
      ...credential.headers,
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
    const detail = pinataErrorDetail(json, `Pinata metadata upload failed (${res.status}).`);
    throw new Error(`${credential.label}: ${detail}`);
  }
  return String(json.IpfsHash);
}

async function pinFileWithFallback(file) {
  const credentials = pinataCredentials();
  const errors = [];
  for (const credential of credentials) {
    try {
      return {
        cid: await pinFileWithCredential(file, credential),
        credentialLabel: credential.label,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new Error(`All Pinata keys failed. ${errors[errors.length - 1] || "Try another key."}`);
}

/**
 * Pin image + metadata like o1 Launchpad:
 * - image file -> ipfs://imageCid
 * - metadata JSON image field = pure ipfs:// (BaseScan / Base app require this)
 * - contractURI = ipfs://metadataCid
 */
async function pinMetadataWithFallback({ image, metadata, metadataName }) {
  const credentials = pinataCredentials();
  const errors = [];
  for (const credential of credentials) {
    try {
      const imageCid = image ? await pinFileWithCredential(image, credential) : "";
      // ipfs:// for explorers that resolve IPFS; HTTPS for MetaMask / Coinbase watchAsset.
      let imageUri = "";
      if (imageCid) imageUri = `ipfs://${imageCid}`;
      else if (typeof metadata.image === "string" && metadata.image.startsWith("ipfs://")) imageUri = metadata.image;

      const imageHttps = imageCid
        ? `https://gateway.pinata.cloud/ipfs/${imageCid}`
        : imageUri.startsWith("ipfs://")
          ? `https://gateway.pinata.cloud/ipfs/${imageUri.replace(/^ipfs:\/\//i, "")}`
          : imageUri;

      const pinBody = {
        name: metadata.name,
        symbol: metadata.symbol,
        description: metadata.description || `${metadata.name} (${metadata.symbol}) is a native B20 token on Base.`,
        standard: "B20",
        launchpad: "B20",
        launchpadUrl: "https://base.nurlab.xyz",
        // Primary NFT-style field (Base app / IPFS-aware clients)
        image: imageUri,
        // Wallet-friendly HTTPS mirrors (MetaMask, Coinbase, Trust, etc.)
        image_url: imageHttps,
        logoURI: imageHttps,
      };

      const metadataCid = await pinJsonWithCredential(pinBody, metadataName, credential);
      return {
        imageCid,
        imageUri,
        imageHttps,
        metadataCid,
        credentialLabel: credential.label,
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }
  throw new Error(`All Pinata keys failed. ${errors[errors.length - 1] || "Try another key."}`);
}

module.exports = {
  pinataCredentials,
  pinFileWithFallback,
  pinMetadataWithFallback,
};
