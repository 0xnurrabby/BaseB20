const { isAddress } = require("viem");
const { readJson, send } = require("./_http");

const API_URL = "https://api.etherscan.io/v2/api";
const BASESCAN = "https://basescan.org";
const CHAIN_ID = "8453";

function clean(value, max = 300) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function link(path) {
  return `${BASESCAN}${path}`;
}

async function basescan(params, method = "GET") {
  const key = process.env.BASESCAN_API_KEY?.trim();
  if (!key) throw new Error("BASESCAN_API_KEY is not configured.");
  const body = new URLSearchParams();
  body.set("chainid", CHAIN_ID);
  body.set("apikey", key);
  Object.entries(params).forEach(([name, value]) => body.set(name, String(value)));

  const url = `${API_URL}?${body.toString()}`;
  const res = await fetch(url, method === "POST"
    ? {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      }
    : undefined);
  const json = await res.json().catch(() => null);
  if (!json) throw new Error(`BaseScan API returned ${res.status}.`);
  return json;
}

function sourceIsVerified(sourceResult) {
  const row = Array.isArray(sourceResult) ? sourceResult[0] : null;
  if (!row || typeof row !== "object") return false;
  const source = String(row.SourceCode || "").trim();
  const abi = String(row.ABI || "").trim();
  return !!source || (!!abi && !/not verified/i.test(abi));
}

async function tryProxyVerification(address) {
  const submit = await basescan({
    module: "contract",
    action: "verifyproxycontract",
    address,
  }, "POST");

  if (submit.status !== "1") {
    return {
      status: "blocked",
      message: String(submit.result || submit.message || "BaseScan did not accept automatic proxy verification."),
      raw: submit,
    };
  }

  const guid = String(submit.result || "");
  let latest = submit;
  for (let i = 0; i < 3; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    latest = await basescan({
      module: "contract",
      action: "checkproxyverification",
      guid,
    });
    if (latest.status === "1") break;
  }

  return {
    status: latest.status === "1" ? "verified" : "pending",
    guid,
    message: String(latest.result || latest.message || "Proxy verification submitted."),
    raw: latest,
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    return send(res, 405, { error: "Method not allowed." });
  }

  let body;
  try {
    body = await readJson(req, 32 * 1024);
  } catch (error) {
    return send(res, 400, { error: error instanceof Error ? error.message : "Invalid request." });
  }

  const address = clean(body.address, 64);
  if (!isAddress(address)) return send(res, 400, { error: "Invalid token address." });

  const name = clean(body.name, 120);
  const symbol = clean(body.symbol, 32).toUpperCase();
  const decimals = Number(body.decimals ?? 18);
  const logoURI = clean(body.logoURI, 600);
  const metadataURI = clean(body.metadataURI, 900);

  const links = {
    token: link(`/token/${address}`),
    verify: link(`/verifyContract?a=${address}`),
    crossChainVerify: link(`/address/${address}#code`),
    verifyAddress: link("/verifyaddress/"),
    tokenUpdate: link(`/tokenupdate/?a=${address}`),
  };

  const publishPack = [
    `Token name: ${name || "B20 Token"}`,
    `Token symbol: ${symbol || "B20"}`,
    `Token contract: ${address}`,
    `Decimals: ${Number.isFinite(decimals) ? decimals : 18}`,
    "Chain: Base mainnet",
    `BaseScan: ${links.token}`,
    logoURI ? `Logo direct link: ${logoURI}` : "Logo direct link: not saved yet",
    metadataURI ? `Metadata JSON: ${metadataURI}` : "Metadata JSON: not saved yet",
  ].join("\n");

  const steps = [];
  try {
    const source = await basescan({
      module: "contract",
      action: "getsourcecode",
      address,
    });
    const verified = source.status === "1" && sourceIsVerified(source.result);

    if (verified) {
      steps.push({
        key: "source",
        status: "done",
        title: "Source already verified",
        detail: "BaseScan API reports this contract source is verified.",
      });
    } else {
      const proxy = await tryProxyVerification(address);
      steps.push({
        key: "source",
        status: proxy.status === "verified" ? "done" : proxy.status === "pending" ? "pending" : "blocked",
        title: proxy.status === "verified" ? "Proxy verification accepted" : "Auto source verification blocked by BaseScan",
        detail: proxy.message,
      });
    }
  } catch (error) {
    steps.push({
      key: "source",
      status: "blocked",
      title: "BaseScan API check failed",
      detail: error instanceof Error ? error.message : "Could not reach BaseScan API.",
    });
  }

  steps.push({
    key: "metadata",
    status: metadataURI && logoURI ? "done" : "blocked",
    title: metadataURI && logoURI ? "Metadata ready" : "Save logo + JSON first",
    detail: metadataURI && logoURI
      ? "The publish pack includes logo and metadata JSON."
      : "Go to Metadata and use Save logo + JSON before publishing.",
  });

  steps.push({
    key: "token-info",
    status: "manual",
    title: "BaseScan logo submission requires review",
    detail: "BaseScan does not provide a public write API for Token Info / Logo. Their official flow requires a logged-in account, verified address ownership and manual review.",
  });

  return send(res, 200, {
    ok: steps.every((step) => step.status === "done" || step.status === "manual"),
    steps,
    links,
    publishPack,
  });
};
