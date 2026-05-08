import { pool } from "../db/pool.js";
import { config } from "../config.js";

/** Simulated baseline prices for demo / educational use */
const BASE = {
  AAPL: 178,
  MSFT: 415,
  GOOGL: 165,
  AMZN: 185,
  META: 520,
  NVDA: 125,
  SPY: 520,
  QQQ: 450,
};

const DRIFT = {
  AAPL: 0.00002,
  MSFT: 0.000015,
  GOOGL: -0.00001,
  AMZN: 0.00003,
  META: 0.00001,
  NVDA: 0.00004,
  SPY: 0.000005,
  QQQ: 0.000008,
};

const state = { ...BASE };
const finnhubCache = new Map();
const CACHE_MS = 15000;

export const WATCHLIST = Object.keys(BASE);

export function getSimulatedPrice(symbol) {
  const sym = symbol.toUpperCase();
  if (!state[sym]) state[sym] = 100 + Math.random() * 50;
  const vol = 0.002 + Math.random() * 0.004;
  const drift = DRIFT[sym] ?? 0.00001;
  const shock = (Math.random() - 0.5) * vol;
  const ret = drift + shock;
  state[sym] = Math.max(0.01, state[sym] * (1 + ret));
  return Math.round(state[sym] * 100) / 100;
}

export async function fetchFinnhubQuote(symbol) {
  const sym = symbol.toUpperCase();

  // cache hit
  const cached = finnhubCache.get(sym);

  if (
    cached &&
    Date.now() - cached.ts < CACHE_MS
  ) {
    return cached.data;
  }

  if (!config.finnhubApiKey) {
    return {
      price: getSimulatedPrice(sym),
      source: "simulated",
    };
  }

  try {
    const u = new URL(
      "https://finnhub.io/api/v1/quote"
    );

    u.searchParams.set("symbol", sym);
    u.searchParams.set(
      "token",
      config.finnhubApiKey
    );

    const r = await fetch(u);

    // rate limit fallback
    if (r.status === 429) {
      console.warn(
        `Finnhub rate limit for ${sym}`
      );

      return {
        price: getSimulatedPrice(sym),
        source: "simulated-fallback",
      };
    }

    if (!r.ok) {
      console.warn(
        `Finnhub request failed for ${sym}: ${r.status}`
      );

      return {
        price: getSimulatedPrice(sym),
        source: "simulated-fallback",
      };
    }

    const j = await r.json();

    if (
      typeof j.c === "number" &&
      j.c > 0
    ) {
      const result = {
        price: j.c,
        source: "finnhub",
      };

      finnhubCache.set(sym, {
        data: result,
        ts: Date.now(),
      });

      return result;
    }
  } catch (err) {
    console.warn(
      "Finnhub fetch error for",
      sym,
      err.message || err
    );
  }

  return {
    price: getSimulatedPrice(sym),
    source: "simulated-fallback",
  };
}

export async function persistTick(symbol, price, volume = 0) {
  await pool.query(
    `INSERT INTO market_ticks (symbol, ts, price, volume) VALUES ($1, NOW(), $2, $3)`,
    [symbol.toUpperCase(), price, volume]
  );
}

export async function persistBar(symbol, bucket, o, h, l, c, v) {
  await pool.query(
    `INSERT INTO market_bars (symbol, bucket, open, high, low, close, volume)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (symbol, bucket) DO UPDATE SET
       high = GREATEST(market_bars.high, EXCLUDED.high),
       low = LEAST(market_bars.low, EXCLUDED.low),
       close = EXCLUDED.close,
       volume = market_bars.volume + EXCLUDED.volume`,
    [symbol.toUpperCase(), bucket, o, h, l, c, v]
  );
}

export async function seedHistoricalBars(symbol, points = 120) {
  const sym = symbol.toUpperCase();
  const base = BASE[sym] ?? 100;
  let price = base;
  const now = Date.now();
  const intervalMs = 60_000;
  const client = await pool.connect();
  try {
    for (let i = points; i >= 0; i--) {
      const bucket = new Date(now - i * intervalMs);
      const o = price;
      const change = (Math.random() - 0.48) * 0.008 * price;
      const c = Math.max(0.01, o + change);
      const h = Math.max(o, c) * (1 + Math.random() * 0.002);
      const l = Math.min(o, c) * (1 - Math.random() * 0.002);
      const v = Math.floor(Math.random() * 1_000_000);
      await client.query(
        `INSERT INTO market_bars (symbol, bucket, open, high, low, close, volume)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (symbol, bucket) DO NOTHING`,
        [sym, bucket, o, h, l, c, v]
      );
      price = c;
    }
  } finally {
    client.release();
  }
}