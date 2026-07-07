const { verifyMessage } = require("viem");
const { db } = require("./_db");
const { readJson, send } = require("./_http");

function allowedAdmins() {
  return String(process.env.ADMIN_ADDRESSES || "")
    .split(/[,\s]+/)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

function parseAdminMessage(message) {
  const address = message.match(/^Address:\s*(0x[a-fA-F0-9]{40})$/m)?.[1]?.toLowerCase();
  const issuedAt = message.match(/^Issued At:\s*(.+)$/m)?.[1];
  const time = issuedAt ? Date.parse(issuedAt) : NaN;
  const age = Date.now() - time;
  if (!message.startsWith("B20 admin access\n") || !address || !Number.isFinite(time)) return null;
  if (age < -60_000 || age > 10 * 60_000) return null;
  return { address };
}

async function authenticate(req) {
  const body = await readJson(req);
  const address = typeof body.address === "string" ? body.address.toLowerCase() : "";
  const signature = typeof body.signature === "string" ? body.signature : "";
  const message = typeof body.message === "string" ? body.message : "";
  const parsed = parseAdminMessage(message);
  if (!address || !signature || !parsed || parsed.address !== address) return null;
  if (!allowedAdmins().includes(address)) return null;
  const ok = await verifyMessage({ address, message, signature });
  return ok ? address : null;
}

function toNumber(value) {
  return Number(value ?? 0);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("allow", "POST");
    return send(res, 405, { error: "Method not allowed." });
  }

  let admin;
  try {
    admin = await authenticate(req);
  } catch {
    return send(res, 401, { error: "Invalid admin signature." });
  }
  if (!admin) return send(res, 403, { error: "This wallet is not allowed." });

  try {
    const sql = await db();
    const [totals, daily, recentTokens, topPages, activeWallets] = await Promise.all([
      sql.query(`
        SELECT
          COUNT(*) FILTER (WHERE event_type = 'page_view') AS page_views,
          COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'page_view') AS visitors,
          COUNT(*) FILTER (WHERE event_type = 'token_created') AS tokens_created,
          COUNT(DISTINCT wallet) FILTER (WHERE wallet IS NOT NULL) AS wallets_seen,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS events_24h
        FROM analytics_events
      `),
      sql.query(`
        SELECT
          to_char(day, 'YYYY-MM-DD') AS day,
          COALESCE(page_views, 0) AS page_views,
          COALESCE(tokens_created, 0) AS tokens_created
        FROM generate_series(CURRENT_DATE - INTERVAL '13 days', CURRENT_DATE, INTERVAL '1 day') AS days(day)
        LEFT JOIN (
          SELECT date_trunc('day', created_at) AS d,
            COUNT(*) FILTER (WHERE event_type = 'page_view') AS page_views,
            COUNT(*) FILTER (WHERE event_type = 'token_created') AS tokens_created
          FROM analytics_events
          WHERE created_at >= CURRENT_DATE - INTERVAL '13 days'
          GROUP BY 1
        ) e ON e.d = day
        ORDER BY day
      `),
      sql.query(`
        SELECT token_address, token_name, token_symbol, wallet, tx_hash, chain_id, created_at
        FROM analytics_events
        WHERE event_type = 'token_created'
        ORDER BY created_at DESC
        LIMIT 12
      `),
      sql.query(`
        SELECT COALESCE(page_path, '/') AS page_path, COUNT(*) AS views
        FROM analytics_events
        WHERE event_type = 'page_view'
        GROUP BY 1
        ORDER BY views DESC
        LIMIT 8
      `),
      sql.query(`
        SELECT wallet, COUNT(*) FILTER (WHERE event_type = 'token_created') AS tokens_created, MAX(created_at) AS last_seen
        FROM analytics_events
        WHERE wallet IS NOT NULL
        GROUP BY wallet
        ORDER BY last_seen DESC
        LIMIT 8
      `),
    ]);

    return send(res, 200, {
      admin,
      totals: {
        pageViews: toNumber(totals[0]?.page_views),
        visitors: toNumber(totals[0]?.visitors),
        tokensCreated: toNumber(totals[0]?.tokens_created),
        walletsSeen: toNumber(totals[0]?.wallets_seen),
        events24h: toNumber(totals[0]?.events_24h),
      },
      daily: daily.map((r) => ({
        day: r.day,
        pageViews: toNumber(r.page_views),
        tokensCreated: toNumber(r.tokens_created),
      })),
      recentTokens,
      topPages: topPages.map((r) => ({ pagePath: r.page_path, views: toNumber(r.views) })),
      activeWallets: activeWallets.map((r) => ({
        wallet: r.wallet,
        tokensCreated: toNumber(r.tokens_created),
        lastSeen: r.last_seen,
      })),
    });
  } catch {
    return send(res, 500, { error: "Admin stats are not available." });
  }
};
