import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { authMiddleware } from "../auth/jwt.js";

const router = Router();
router.use(authMiddleware);

router.get("/", async (req, res) => {
  const u = req.user;
  const pf = await pool.query(
    `SELECT * FROM portfolios WHERE user_id = $1 ORDER BY created_at`,
    [u.sub]
  );
  res.json({ portfolios: pf.rows });
});

router.get("/:portfolioId/positions", async (req, res) => {
  const u = req.user;
  const { portfolioId } = req.params;
  const own = await pool.query(
    `SELECT id FROM portfolios WHERE id = $1 AND user_id = $2`,
    [portfolioId, u.sub]
  );
  if (!own.rows[0]) return res.status(404).json({ error: "Portfolio not found" });

  const r = await pool.query(
    `SELECT id, symbol, quantity, avg_cost, updated_at FROM portfolio_positions WHERE portfolio_id = $1 ORDER BY symbol`,
    [portfolioId]
  );
  res.json({ positions: r.rows });
});

const upsertSchema = z.object({
  symbol: z.string().min(1).max(12),
  quantity: z.number().positive(),
  avg_cost: z.number().nonnegative(),
});

router.post("/:portfolioId/positions", async (req, res) => {
  const u = req.user;
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  const { portfolioId } = req.params;
  const own = await pool.query(
    `SELECT id FROM portfolios WHERE id = $1 AND user_id = $2`,
    [portfolioId, u.sub]
  );
  if (!own.rows[0]) return res.status(404).json({ error: "Portfolio not found" });

  const { symbol, quantity, avg_cost } = parsed.data;
  const sym = symbol.toUpperCase();
  await pool.query(
    `INSERT INTO portfolio_positions (portfolio_id, symbol, quantity, avg_cost)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (portfolio_id, symbol) DO UPDATE SET
       quantity = EXCLUDED.quantity,
       avg_cost = EXCLUDED.avg_cost,
       updated_at = NOW()`,
    [portfolioId, sym, quantity, avg_cost]
  );
  res.json({ ok: true });
});

router.delete("/:portfolioId/positions/:symbol", async (req, res) => {
  const u = req.user;
  const { portfolioId, symbol } = req.params;
  const own = await pool.query(
    `SELECT id FROM portfolios WHERE id = $1 AND user_id = $2`,
    [portfolioId, u.sub]
  );
  if (!own.rows[0]) return res.status(404).json({ error: "Portfolio not found" });

  await pool.query(
    `DELETE FROM portfolio_positions WHERE portfolio_id = $1 AND symbol = $2`,
    [portfolioId, symbol.toUpperCase()]
  );
  res.json({ ok: true });
});

export default router;