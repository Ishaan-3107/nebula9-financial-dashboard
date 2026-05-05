import { pool } from "../db/pool.js";

export async function evaluateAlertsForSymbol(symbol, price) {
  const sym = symbol.toUpperCase();
  const alerts = await pool.query(
    `SELECT a.id, a.user_id, a.condition, a.threshold, a.triggered_at
     FROM user_alerts a
     WHERE a.active = TRUE AND (a.symbol IS NULL OR a.symbol = $1)`,
    [sym]
  );

  for (const row of alerts.rows) {
    const thr = row.threshold != null ? Number(row.threshold) : null;
    let fire = false;
    if (row.condition === "price_above" && thr != null && price >= thr) fire = true;
    if (row.condition === "price_below" && thr != null && price <= thr) fire = true;
    if (!fire) continue;

    const cooldownMs = 60_000;
    if (row.triggered_at && Date.now() - new Date(row.triggered_at).getTime() < cooldownMs)
      continue;

    await pool.query(`UPDATE user_alerts SET triggered_at = NOW() WHERE id = $1`, [row.id]);
    await pool.query(
      `INSERT INTO notifications (user_id, title, body, severity)
       VALUES ($1, $2, $3, 'warning')`,
      [
        row.user_id,
        `Alert: ${sym}`,
        `${row.condition} triggered at ${price}${thr != null ? ` (threshold ${thr})` : ""}.`,
      ]
    );
  }
}