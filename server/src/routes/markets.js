import { Router } from "express";
import { pool } from "../db/pool.js";
import { WATCHLIST } from "../services/marketData.js";

const router = Router();

router.get("/watchlist", (_req, res) => {
  res.json({ symbols: WATCHLIST });
});

router.get("/bars/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const limit = Math.min(Number(req.query.limit ?? 200), 2000);
  const r = await pool.query(
    `SELECT bucket, open, high, low, close, volume
     FROM market_bars WHERE symbol = $1 ORDER BY bucket DESC LIMIT $2`,
    [symbol, limit]
  );
  res.json({ symbol, bars: r.rows.reverse() });
});

router.get("/ticks/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const limit = Math.min(Number(req.query.limit ?? 100), 500);
  const r = await pool.query(
    `SELECT ts, price, volume FROM market_ticks WHERE symbol = $1 ORDER BY ts DESC LIMIT $2`,
    [symbol, limit]
  );
  res.json({ symbol, ticks: r.rows.reverse() });
});

export default router;