import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { authMiddleware } from "../auth/jwt.js";
import { runAnalysisAgent } from "../agents/analysisAgent.js";
import { answerNaturalLanguageQuery } from "../services/aiAnalysis.js";
import { assessRisk } from "../agents/riskAgent.js";

const router = Router();
router.use(authMiddleware);

async function loadContext(userId, symbol) {
  const sym = symbol.toUpperCase();

  const barsR = await pool.query(
    `SELECT bucket, close FROM market_bars WHERE symbol = $1 ORDER BY bucket DESC LIMIT 120`,
    [sym]
  );
  const bars = barsR.rows
    .map((r) => ({ t: new Date(r.bucket).toISOString(), c: Number(r.close) }))
    .reverse();

  const tickR = await pool.query(
    `SELECT price FROM market_ticks WHERE symbol = $1 ORDER BY ts DESC LIMIT 1`,
    [sym]
  );
  const livePrice = tickR.rows[0] ? Number(tickR.rows[0].price) : bars.at(-1)?.c ?? 100;

  const newsR = await pool.query(
    `SELECT headline FROM news_items WHERE symbol = $1 OR symbol IS NULL ORDER BY published_at DESC NULLS LAST LIMIT 8`,
    [sym]
  );
  const newsHeadlines = newsR.rows.map((x) => x.headline);

  const pf = await pool.query(
    `SELECT p.id FROM portfolios p WHERE p.user_id = $1 ORDER BY created_at LIMIT 1`,
    [userId]
  );
  const pid = pf.rows[0]?.id;
  let portfolioLine;
  if (pid) {
    const pos = await pool.query(
      `SELECT symbol, quantity, avg_cost FROM portfolio_positions WHERE portfolio_id = $1`,
      [pid]
    );
    if (pos.rows.length) {
      portfolioLine = pos.rows
        .map((r) => `${r.symbol}: ${r.quantity} @ ${r.avg_cost}`)
        .join("; ");
    }
  }

  return { symbol: sym, bars, livePrice, newsHeadlines, portfolioLine };
}

router.get("/:symbol", async (req, res) => {
  const u = req.user;
  const ctx = await loadContext(u.sub, req.params.symbol);
  const insight = await runAnalysisAgent(ctx);
  const risk = assessRisk(ctx.bars.map((b) => b.c));
  res.json({ ...insight, risk, context: { symbol: ctx.symbol, livePrice: ctx.livePrice } });
});

const querySchema = z.object({
  question: z.string().min(3).max(2000),
  symbol: z.string().min(1).max(12),
});

router.post("/query", async (req, res) => {
  const u = req.user;
  const parsed = querySchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  const ctx = await loadContext(u.sub, parsed.data.symbol);
  const result = await answerNaturalLanguageQuery(parsed.data.question, ctx);
  const risk = assessRisk(ctx.bars.map((b) => b.c));
  res.json({ ...result, risk });
});

export default router;