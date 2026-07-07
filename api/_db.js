const { neon } = require("@neondatabase/serverless");

let sql;
let ready;

function getSql() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL is not configured.");
  if (!sql) sql = neon(url);
  return sql;
}

async function ensureSchema() {
  if (ready) return ready;
  const db = getSql();
  ready = (async () => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS analytics_events (
        id BIGSERIAL PRIMARY KEY,
        event_type TEXT NOT NULL,
        wallet TEXT,
        token_address TEXT,
        token_name TEXT,
        token_symbol TEXT,
        chain_id INTEGER,
        page_path TEXT,
        tx_hash TEXT,
        session_id TEXT,
        user_agent TEXT,
        ip_hash TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_analytics_events_type_created ON analytics_events (event_type, created_at DESC)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_analytics_events_token ON analytics_events (token_address)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_analytics_events_wallet ON analytics_events (wallet)`);
  })();
  return ready;
}

async function db() {
  await ensureSchema();
  return getSql();
}

module.exports = { db, ensureSchema };
