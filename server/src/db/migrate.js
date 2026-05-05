import { pool } from "./pool.js";

const sql = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  password_hash TEXT,
  avatar_url TEXT,
  provider TEXT DEFAULT 'local',
  provider_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (provider, provider_id)
);

CREATE TABLE IF NOT EXISTS portfolios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Main',
  base_currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portfolio_positions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_id UUID NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  quantity NUMERIC(24, 8) NOT NULL DEFAULT 0,
  avg_cost NUMERIC(24, 8) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (portfolio_id, symbol)
);

CREATE TABLE IF NOT EXISTS market_bars (
  symbol TEXT NOT NULL,
  bucket TIMESTAMPTZ NOT NULL,
  open NUMERIC(24, 8) NOT NULL,
  high NUMERIC(24, 8) NOT NULL,
  low NUMERIC(24, 8) NOT NULL,
  close NUMERIC(24, 8) NOT NULL,
  volume NUMERIC(24, 4) NOT NULL DEFAULT 0,
  PRIMARY KEY (symbol, bucket)
);

SELECT create_hypertable('market_bars', 'bucket', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_market_bars_symbol_bucket ON market_bars (symbol, bucket DESC);

CREATE TABLE IF NOT EXISTS market_ticks (
  symbol TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  price NUMERIC(24, 8) NOT NULL,
  volume NUMERIC(24, 4) DEFAULT 0,
  PRIMARY KEY (symbol, ts)
);

SELECT create_hypertable('market_ticks', 'ts', if_not_exists => TRUE);

CREATE TABLE IF NOT EXISTS user_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol TEXT,
  condition TEXT NOT NULL,
  threshold NUMERIC(24, 8),
  channel TEXT NOT NULL DEFAULT 'in_app',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS news_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  symbol TEXT,
  headline TEXT NOT NULL,
  source TEXT,
  url TEXT,
  published_at TIMESTAMPTZ,
  sentiment_score NUMERIC(5, 4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_news_symbol ON news_items (symbol, published_at DESC);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(sql);
    console.log("Migration OK");
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});