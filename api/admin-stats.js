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
    const [totals, windows, daily, hourly, recentTokens, topPages, activeWallets, topWallets, recentEvents] = await Promise.all([
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
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') AS events_24h,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS events_7d,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS events_30d,
          COUNT(*) FILTER (WHERE event_type = 'page_view' AND created_at >= NOW() - INTERVAL '24 hours') AS views_24h,
          COUNT(*) FILTER (WHERE event_type = 'page_view' AND created_at >= NOW() - INTERVAL '7 days') AS views_7d,
          COUNT(*) FILTER (WHERE event_type = 'page_view' AND created_at >= NOW() - INTERVAL '30 days') AS views_30d,
          COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'page_view' AND created_at >= NOW() - INTERVAL '24 hours') AS visitors_24h,
          COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'page_view' AND created_at >= NOW() - INTERVAL '7 days') AS visitors_7d,
          COUNT(DISTINCT session_id) FILTER (WHERE event_type = 'page_view' AND created_at >= NOW() - INTERVAL '30 days') AS visitors_30d,
          COUNT(*) FILTER (WHERE event_type = 'token_created' AND created_at >= NOW() - INTERVAL '24 hours') AS tokens_24h,
          COUNT(*) FILTER (WHERE event_type = 'token_created' AND created_at >= NOW() - INTERVAL '7 days') AS tokens_7d,
          COUNT(*) FILTER (WHERE event_type = 'token_created' AND created_at >= NOW() - INTERVAL '30 days') AS tokens_30d,
          COUNT(DISTINCT wallet) FILTER (WHERE wallet IS NOT NULL AND created_at >= NOW() - INTERVAL '24 hours') AS wallets_24h,
          COUNT(DISTINCT wallet) FILTER (WHERE wallet IS NOT NULL AND created_at >= NOW() - INTERVAL '7 days') AS wallets_7d,
          COUNT(DISTINCT wallet) FILTER (WHERE wallet IS NOT NULL AND created_at >= NOW() - INTERVAL '30 days') AS wallets_30d
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
        WITH hours AS (
          SELECT generate_series(
            date_trunc('hour', NOW()) - INTERVAL '23 hours',
            date_trunc('hour', NOW()),
            INTERVAL '1 hour'
          ) AS hour
        )
        SELECT
          to_char(hours.hour, 'HH24:00') AS hour,
          COALESCE(e.page_views, 0) AS page_views,
          COALESCE(e.tokens_created, 0) AS tokens_created
        FROM hours
        LEFT JOIN (
          SELECT date_trunc('hour', created_at) AS h,
            COUNT(*) FILTER (WHERE event_type = 'page_view') AS page_views,
            COUNT(*) FILTER (WHERE event_type = 'token_created') AS tokens_created
          FROM analytics_events
          WHERE created_at >= NOW() - INTERVAL '24 hours'
          GROUP BY 1
        ) e ON e.h = hours.hour
        ORDER BY hours.hour
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
      sql.query(`
        SELECT wallet,
          COUNT(*) FILTER (WHERE event_type = 'page_view') AS page_views,
          COUNT(*) FILTER (WHERE event_type = 'token_created') AS tokens_created,
          MAX(created_at) AS last_seen
        FROM analytics_events
        WHERE wallet IS NOT NULL
        GROUP BY wallet
        ORDER BY tokens_created DESC, last_seen DESC
        LIMIT 8
      `),
      sql.query(`
        SELECT event_type, wallet, token_address, token_name, token_symbol, chain_id, page_path, tx_hash, created_at
        FROM analytics_events
        ORDER BY created_at DESC
        LIMIT 20
      `),
    ]);

    return send(res, 200, {
      admin,
      generatedAt: new Date().toISOString(),
      totals: {
        pageViews: toNumber(totals[0]?.page_views),
        visitors: toNumber(totals[0]?.visitors),
        tokensCreated: toNumber(totals[0]?.tokens_created),
        walletsSeen: toNumber(totals[0]?.wallets_seen),
        events24h: toNumber(totals[0]?.events_24h),
      },
      windows: {
        day: {
          events: toNumber(windows[0]?.events_24h),
          pageViews: toNumber(windows[0]?.views_24h),
          visitors: toNumber(windows[0]?.visitors_24h),
          tokensCreated: toNumber(windows[0]?.tokens_24h),
          walletsSeen: toNumber(windows[0]?.wallets_24h),
        },
        week: {
          events: toNumber(windows[0]?.events_7d),
          pageViews: toNumber(windows[0]?.views_7d),
          visitors: toNumber(windows[0]?.visitors_7d),
          tokensCreated: toNumber(windows[0]?.tokens_7d),
          walletsSeen: toNumber(windows[0]?.wallets_7d),
        },
        month: {
          events: toNumber(windows[0]?.events_30d),
          pageViews: toNumber(windows[0]?.views_30d),
          visitors: toNumber(windows[0]?.visitors_30d),
          tokensCreated: toNumber(windows[0]?.tokens_30d),
          walletsSeen: toNumber(windows[0]?.wallets_30d),
        },
      },
      daily: daily.map((r) => ({
        day: r.day,
        pageViews: toNumber(r.page_views),
        tokensCreated: toNumber(r.tokens_created),
      })),
      hourly: hourly.map((r) => ({
        hour: r.hour,
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
      topWallets: topWallets.map((r) => ({
        wallet: r.wallet,
        pageViews: toNumber(r.page_views),
        tokensCreated: toNumber(r.tokens_created),
        lastSeen: r.last_seen,
      })),
      recentEvents: recentEvents.map((r) => ({
        eventType: r.event_type,
        wallet: r.wallet,
        tokenAddress: r.token_address,
        tokenName: r.token_name,
        tokenSymbol: r.token_symbol,
        chainId: r.chain_id,
        pagePath: r.page_path,
        txHash: r.tx_hash,
        createdAt: r.created_at,
      })),
    });
  } catch {
    return send(res, 500, { error: "Admin stats are not available." });
  }
};
