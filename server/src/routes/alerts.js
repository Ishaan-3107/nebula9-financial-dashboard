import { Router } from "express";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { authMiddleware } from "../auth/jwt.js";

const router = Router();
router.use(authMiddleware);

const createSchema = z.object({
  symbol: z.string().min(1).max(12).optional(),
  condition: z.enum(["price_above", "price_below"]),
  threshold: z.number().positive(),
  channel: z.enum(["in_app"]).default("in_app"),
});

router.get("/", async (req, res) => {
  const u = req.user;
  const r = await pool.query(
    `SELECT id, symbol, condition, threshold, channel, active, triggered_at, created_at
     FROM user_alerts WHERE user_id = $1 ORDER BY created_at DESC`,
    [u.sub]
  );
  res.json({ alerts: r.rows });
});

router.get("/notifications/list", async (req, res) => {
  const u = req.user;
  const r = await pool.query(
    `SELECT id, title, body, severity, read_at, created_at FROM notifications
     WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [u.sub]
  );
  res.json({ notifications: r.rows });
});

router.post("/", async (req, res) => {
  const u = req.user;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  const { symbol, condition, threshold, channel } = parsed.data;
  const ins = await pool.query(
    `INSERT INTO user_alerts (user_id, symbol, condition, threshold, channel)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [u.sub, symbol?.toUpperCase() ?? null, condition, threshold, channel]
  );
  res.json(ins.rows[0]);
});

router.patch("/:id", async (req, res) => {
  const u = req.user;
  const active = z.object({ active: z.boolean() }).safeParse(req.body);
  if (!active.success)
    return res.status(400).json({ error: active.error.flatten() });

  const r = await pool.query(
    `UPDATE user_alerts SET active = $2 WHERE id = $1 AND user_id = $3 RETURNING *`,
    [req.params.id, active.data.active, u.sub]
  );
  if (!r.rows[0]) return res.status(404).json({ error: "Not found" });
  res.json(r.rows[0]);
});

router.delete("/:id", async (req, res) => {
  const u = req.user;
  await pool.query(
    `DELETE FROM user_alerts WHERE id = $1 AND user_id = $2`,
    [req.params.id, u.sub]
  );
  res.json({ ok: true });
});

router.post("/notifications/:id/read", async (req, res) => {
  const u = req.user;
  await pool.query(
    `UPDATE notifications SET read_at = NOW() WHERE id = $1 AND user_id = $2`,
    [req.params.id, u.sub]
  );
  res.json({ ok: true });
});

export default router;