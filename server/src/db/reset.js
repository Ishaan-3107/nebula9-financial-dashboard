import { pool } from "./pool.js";

const client = await pool.connect();
try {
  await client.query("TRUNCATE market_bars, market_ticks");
  console.log("Reset OK");
} finally {
  client.release();
  await pool.end();
}