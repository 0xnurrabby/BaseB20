export interface UploadTokenMetadataInput {
  name: string;
  symbol: string;
  imageFile?: File | null;
  imageUrl?: string;
}

export interface UploadTokenMetadataResult {
  contractURI: string;
  logoURI: string;
  imageURI: string;
  metadataGatewayUrl?: string;
  imageGatewayUrl?: string;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read the image file."));
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const comma = text.indexOf(",");
      resolve(comma >= 0 ? text.slice(comma + 1) : text);
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadTokenMetadata(input: UploadTokenMetadataInput): Promise<UploadTokenMetadataResult> {
  const body: Record<string, unknown> = {
    name: input.name,
    symbol: input.symbol,
    imageUrl: input.imageUrl || "",
  };

  if (input.imageFile) {
    body.imageBase64 = await fileToBase64(input.imageFile);
    body.imageType = input.imageFile.type;
    body.imageName = input.imageFile.name;
  }

  const res = await fetch("/api/ipfs-metadata", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as Partial<UploadTokenMetadataResult> & { error?: string };

  if (!res.ok) {
    throw new Error(json.error || `IPFS metadata upload failed (${res.status}).`);
  }
  if (!json.contractURI) {
    throw new Error("IPFS metadata upload failed.");
  }

  return {
    contractURI: json.contractURI,
    logoURI: json.logoURI || json.imageURI || "",
    imageURI: json.imageURI || json.logoURI || "",
    metadataGatewayUrl: json.metadataGatewayUrl,
    imageGatewayUrl: json.imageGatewayUrl,
  };
}
