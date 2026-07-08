const { encodeAbiParameters, isAddress } = require("viem");
const { readJson, safeString, send } = require("./_http");
const verifySource = require("./_verify-source.json");

const ETHERSCAN_V2_API = "https://api.etherscan.io/v2/api";
const BASE_SEPOLIA_CHAIN_ID = 84532;
const BASE_SEPOLIA_RPC = "https://sepolia.base.org";
const EXPLORER_URL = "https://sepolia.basescan.org";

const CONFIG_TUPLE = [
  {
    type: "tuple",
    components: [
      { name: "name_", type: "string" },
      { name: "symbol_", type: "string" },
      { name: "decimals_", type: "uint8" },
      { name: "initialSupply", type: "uint256" },
      { name: "cap", type: "uint256" },
      { name: "owner_", type: "address" },
      { name: "taxWallet_", type: "address" },
      { name: "buyTaxBps_", type: "uint16" },
      { name: "sellTaxBps_", type: "uint16" },
      { name: "burnTaxBps_", type: "uint16" },
      { name: "mintable", type: "bool" },
      { name: "maxTxTokens", type: "uint256" },
      { name: "maxWalletTokens", type: "uint256" },
      { name: "logoURI_", type: "string" },
    ],
  },
];

class PublicError extends Error {
  constructor(statusCode, status, message) {
    super(message);
    this.statusCode = statusCode;
    this.status = status;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    return send(res, 405, { error: "Method not allowed." });
  }

  let body;
  try {
    body = await readJson(req, 96 * 1024);
  } catch (error) {
    return send(res, 400, { status: "failed", error: error instanceof Error ? error.message : "Invalid payload." });
  }

  try {
    const action = safeString(body.action, 20) || "submit";
    const chainId = Number(body.chainId ?? BASE_SEPOLIA_CHAIN_ID);
    if (chainId !== BASE_SEPOLIA_CHAIN_ID) {
      throw new PublicError(400, "failed", "Base Sepolia is the only supported network right now.");
    }

    if (action === "status") {
      const guid = safeString(body.guid, 80);
      if (!guid || !/^[a-zA-Z0-9]+$/.test(guid)) {
        throw new PublicError(400, "failed", "Invalid verification id.");
      }
      const status = await checkVerificationStatus(guid);
      return send(res, 200, withExplorer(status, body.address));
    }

    const address = normalizeAddress(body.address);
    if (!address) throw new PublicError(400, "failed", "Invalid contract address.");

    if (action === "lookup") {
      const lookup = await lookupSource(address);
      return send(res, 200, withExplorer(lookup.verified ? verified("Already published on BaseScan.") : ready(), address));
    }

    if (action !== "submit") {
      throw new PublicError(400, "failed", "Invalid verification action.");
    }

    const lookup = await lookupSource(address);
    if (lookup.verified) {
      return send(res, 200, withExplorer(verified("Already published on BaseScan."), address));
    }

    const constructorArgs =
      cleanConstructorArgs(body.constructorArgs) ||
      encodeConfig(body.config) ||
      (await inferConstructorArgs(address, safeString(body.txHash, 80)));

    const submitted = await submitVerification(address, constructorArgs);
    return send(res, 200, withExplorer(submitted, address));
  } catch (error) {
    const statusCode = error instanceof PublicError ? error.statusCode : 500;
    const status = error instanceof PublicError ? error.status : "failed";
    const message =
      error instanceof PublicError
        ? error.message
        : "BaseScan verification is temporarily unavailable. Try again in a moment.";
    return send(res, statusCode, { status, error: message });
  }
};

function getApiKey() {
  return (process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY || "").trim();
}

function normalizeAddress(value) {
  const address = safeString(value, 80);
  return address && isAddress(address) ? address : null;
}

function cleanConstructorArgs(value) {
  if (typeof value !== "string") return "";
  const clean = value.trim().replace(/^0x/i, "").toLowerCase();
  return clean && /^[0-9a-f]*$/.test(clean) && clean.length % 2 === 0 ? clean : "";
}

function withExplorer(payload, address) {
  const contract = normalizeAddress(address);
  return {
    ...payload,
    explorerUrl: contract ? `${EXPLORER_URL}/address/${contract}#code` : EXPLORER_URL,
  };
}

function ready() {
  return { status: "ready", message: "Ready to publish on BaseScan." };
}

function verified(message) {
  return { status: "verified", message };
}

async function etherscan(params, options = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new PublicError(501, "not_configured", "BASESCAN_API_KEY is not configured on the server.");
  }

  const form = new URLSearchParams({
    chainid: String(BASE_SEPOLIA_CHAIN_ID),
    apikey: apiKey,
    ...params,
  });

  const method = options.method || "GET";
  const response =
    method === "POST"
      ? await fetch(ETHERSCAN_V2_API, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: form,
        })
      : await fetch(`${ETHERSCAN_V2_API}?${form.toString()}`);

  let json;
  try {
    json = await response.json();
  } catch {
    throw new PublicError(502, "failed", "BaseScan returned an unreadable response.");
  }

  if (!response.ok) {
    throw new PublicError(502, "failed", `BaseScan request failed with HTTP ${response.status}.`);
  }
  return json;
}

async function lookupSource(address) {
  const json = await etherscan({
    module: "contract",
    action: "getsourcecode",
    address,
  });
  const first = Array.isArray(json.result) ? json.result[0] : null;
  const source = typeof first?.SourceCode === "string" ? first.SourceCode.trim() : "";
  const abi = typeof first?.ABI === "string" ? first.ABI.trim() : "";
  return {
    verified: Boolean(source) && abi !== "Contract source code not verified",
  };
}

async function submitVerification(address, constructorArgs) {
  const json = await etherscan(
    {
      module: "contract",
      action: "verifysourcecode",
      contractaddress: address,
      sourceCode: JSON.stringify(verifySource.standardJsonInput),
      codeformat: "solidity-standard-json-input",
      contractname: verifySource.contractName,
      compilerversion: verifySource.compilerVersion,
      optimizationUsed: "1",
      runs: "200",
      constructorArguments: constructorArgs,
      evmVersion: verifySource.standardJsonInput?.settings?.evmVersion || "default",
      licenseType: verifySource.licenseType || "3",
    },
    { method: "POST" }
  );

  const result = String(json.result || "");
  const lower = `${json.message || ""} ${result}`.toLowerCase();
  if (json.status === "1" && result) {
    return { status: "pending", guid: result, message: "Submitted to BaseScan. Final check is running now." };
  }
  if (lower.includes("already verified")) {
    return verified("Already published on BaseScan.");
  }
  if (lower.includes("pending in queue")) {
    return { status: "ready", message: "BaseScan already has this request in queue. Try again in a moment." };
  }
  throw new PublicError(400, "failed", result || "BaseScan rejected the verification request.");
}

async function checkVerificationStatus(guid) {
  const json = await etherscan({
    module: "contract",
    action: "checkverifystatus",
    guid,
  });

  const result = String(json.result || "");
  const lower = `${json.message || ""} ${result}`.toLowerCase();
  if (lower.includes("pass - verified") || lower.includes("already verified")) {
    return verified("Verified and published on BaseScan.");
  }
  if (lower.includes("pending")) {
    return { status: "pending", guid, message: "BaseScan is still processing. This usually takes a short moment." };
  }
  if (json.status === "1") {
    return verified("Verified and published on BaseScan.");
  }
  throw new PublicError(400, "failed", result || "Verification did not pass.");
}

async function inferConstructorArgs(address, txHash) {
  const hash = cleanTxHash(txHash) || (await findCreationHash(address));
  if (!hash) {
    throw new PublicError(400, "failed", "Could not find the deployment transaction for this contract.");
  }

  const tx = await rpc("eth_getTransactionByHash", [hash]);
  const input = tx?.input || tx?.data;
  if (!input || typeof input !== "string") {
    throw new PublicError(400, "failed", "Could not read the deployment input from Base Sepolia.");
  }

  const deployed = input.toLowerCase();
  const bytecode = String(verifySource.bytecode || "").toLowerCase();
  if (!bytecode.startsWith("0x") || !deployed.startsWith(bytecode)) {
    throw new PublicError(400, "failed", "This contract was not deployed with the current B20 build.");
  }

  const args = deployed.slice(bytecode.length);
  if (!/^[0-9a-f]*$/.test(args) || args.length % 2 !== 0) {
    throw new PublicError(400, "failed", "Could not extract constructor arguments.");
  }
  return args;
}

async function findCreationHash(address) {
  const json = await etherscan({
    module: "contract",
    action: "getcontractcreation",
    contractaddresses: address,
  });
  const first = Array.isArray(json.result) ? json.result[0] : null;
  return cleanTxHash(first?.txHash || first?.hash || first?.transactionHash);
}

async function rpc(method, params) {
  const rpcUrl = (process.env.BASE_SEPOLIA_RPC_URL || BASE_SEPOLIA_RPC).trim();
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await response.json();
  if (!response.ok || json.error) {
    throw new PublicError(502, "failed", "Could not read Base Sepolia transaction data.");
  }
  return json.result;
}

function cleanTxHash(value) {
  if (typeof value !== "string") return "";
  const clean = value.trim();
  return /^0x[0-9a-fA-F]{64}$/.test(clean) ? clean : "";
}

function encodeConfig(raw) {
  if (!raw || typeof raw !== "object") return "";
  const cfg = {
    name_: stringValue(raw.name_, 120),
    symbol_: stringValue(raw.symbol_, 24),
    decimals_: numberValue(raw.decimals_, 0, 18),
    initialSupply: bigintValue(raw.initialSupply),
    cap: bigintValue(raw.cap),
    owner_: normalizeAddress(raw.owner_),
    taxWallet_: normalizeAddress(raw.taxWallet_),
    buyTaxBps_: numberValue(raw.buyTaxBps_, 0, 2500),
    sellTaxBps_: numberValue(raw.sellTaxBps_, 0, 2500),
    burnTaxBps_: numberValue(raw.burnTaxBps_, 0, 2500),
    mintable: Boolean(raw.mintable),
    maxTxTokens: bigintValue(raw.maxTxTokens),
    maxWalletTokens: bigintValue(raw.maxWalletTokens),
    logoURI_: stringValue(raw.logoURI_, 2048),
  };

  if (!cfg.name_ || !cfg.symbol_ || cfg.decimals_ === null || !cfg.owner_ || !cfg.taxWallet_) return "";
  if (
    cfg.initialSupply === null ||
    cfg.cap === null ||
    cfg.buyTaxBps_ === null ||
    cfg.sellTaxBps_ === null ||
    cfg.burnTaxBps_ === null ||
    cfg.maxTxTokens === null ||
    cfg.maxWalletTokens === null
  ) {
    return "";
  }

  return encodeAbiParameters(CONFIG_TUPLE, [cfg]).slice(2).toLowerCase();
}

function stringValue(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function numberValue(value, min, max) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

function bigintValue(value) {
  try {
    const n = BigInt(String(value ?? ""));
    return n >= 0n ? n : null;
  } catch {
    return null;
  }
}
