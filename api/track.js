const { db } = require("./_db");
const { ipHash, readJson, safeString, send } = require("./_http");

const EVENTS = new Set(["page_view", "token_created"]);

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    return send(res, 405, { error: "Method not allowed." });
  }

  let body;
  try {
    body = await readJson(req);
  } catch (error) {
    return send(res, 400, { error: error instanceof Error ? error.message : "Invalid payload." });
  }

  const eventType = safeString(body.eventType, 40);
  if (!eventType || !EVENTS.has(eventType)) return send(res, 400, { error: "Invalid event type." });

  const wallet = safeString(body.wallet, 80)?.toLowerCase() ?? null;
  const tokenAddress = safeString(body.tokenAddress, 80)?.toLowerCase() ?? null;
  const tokenName = safeString(body.tokenName, 120);
  const tokenSymbol = safeString(body.tokenSymbol, 24);
  const pagePath = safeString(body.pagePath, 240);
  const txHash = safeString(body.txHash, 90);
  const sessionId = safeString(body.sessionId, 90);
  const chainId = Number.isFinite(Number(body.chainId)) ? Number(body.chainId) : null;
  const userAgent = safeString(req.headers["user-agent"], 300);

  try {
    const sql = await db();
    await sql.query(
      `INSERT INTO analytics_events
        (event_type, wallet, token_address, token_name, token_symbol, chain_id, page_path, tx_hash, session_id, user_agent, ip_hash, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)`,
      [
        eventType,
        wallet,
        tokenAddress,
        tokenName,
        tokenSymbol,
        chainId,
        pagePath,
        txHash,
        sessionId,
        userAgent,
        ipHash(req),
        JSON.stringify(typeof body.metadata === "object" && body.metadata ? body.metadata : {}),
      ]
    );
    return send(res, 200, { ok: true });
  } catch {
    return send(res, 500, { error: "Analytics is not available." });
  }
};
