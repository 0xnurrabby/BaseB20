const { createPublicClient, http, parseAbi } = require("viem");
const { base } = require("viem/chains");

const abi = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function contractURI() view returns (string)",
  "function extraMetadata(string key) view returns (string)",
  "function totalSupply() view returns (uint256)",
]);

const client = createPublicClient({
  chain: base,
  transport: http("https://1rpc.io/base"),
});

function stripIpfs(uri) {
  return String(uri || "")
    .replace(/^ipfs:\/\//i, "")
    .replace(/^ipfs\//i, "")
    .split(/[/?#]/)[0];
}

async function dump(address) {
  const [name, symbol, decimals, contractURI, logoURI, totalSupply] = await Promise.all([
    client.readContract({ address, abi, functionName: "name" }),
    client.readContract({ address, abi, functionName: "symbol" }),
    client.readContract({ address, abi, functionName: "decimals" }),
    client.readContract({ address, abi, functionName: "contractURI" }),
    client.readContract({ address, abi, functionName: "extraMetadata", args: ["logoURI"] }),
    client.readContract({ address, abi, functionName: "totalSupply" }),
  ]);

  let meta = null;
  let imageCheck = null;
  let metaErr = null;

  if (contractURI) {
    const cid = stripIpfs(contractURI);
    try {
      const r = await fetch(`https://gateway.pinata.cloud/ipfs/${cid}`);
      if (!r.ok) metaErr = `meta ${r.status}`;
      else meta = await r.json();
    } catch (e) {
      metaErr = String(e.message || e);
    }
    if (meta?.image) {
      const imgCid = stripIpfs(meta.image);
      try {
        const ir = await fetch(`https://gateway.pinata.cloud/ipfs/${imgCid}`, { method: "HEAD" });
        imageCheck = {
          image: meta.image,
          status: ir.status,
          type: ir.headers.get("content-type"),
          len: ir.headers.get("content-length"),
        };
      } catch (e) {
        imageCheck = { error: String(e.message || e) };
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        address,
        name,
        symbol,
        decimals,
        contractURI,
        logoURI,
        totalSupply: totalSupply.toString(),
        meta,
        metaErr,
        imageCheck,
      },
      null,
      2
    )
  );
}

dump("0xB200000000000000000000A91b2107BE4Aac6cE2").catch((e) => {
  console.error(e);
  process.exit(1);
});
