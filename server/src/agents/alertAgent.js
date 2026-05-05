import { pool } from "../db/pool.js";

export async function evaluateAlertsForSymbol(symbol, price) {
  const sym = symbol.toUpperCase();
  const alerts = await pool.query(
    `SELECT a.id, a.user_id, a.condition, a.threshold, a.triggered_at
     FROM user_alerts a
     WHERE a.active = TRUE AND (a.symbol IS NULL OR a.symbol = $1)`,
    [sym],
  );

  for (const row of alerts.rows) {
    const thr = row.threshold != null ? Number(row.threshold) : null;
    let fire = false;
    if (row.condition === "price_above" && thr != null && price >= thr)
      fire = true;
    if (row.condition === "price_below" && thr != null && price <= thr)
      fire = true;
    if (!fire) continue;

    const cooldownMs = 60_000;
    if (
      row.triggered_at &&
      Date.now() - new Date(row.triggered_at).getTime() < cooldownMs
    )
      continue;

    await pool.query(
      `UPDATE user_alerts SET triggered_at = NOW() WHERE id = $1`,
      [row.id],
    );
    await pool.query(
      `DELETE FROM notifications WHERE user_id = $1 AND id NOT IN (
          SELECT id FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20
        )`,
      [row.user_id],
    );
  }
}
