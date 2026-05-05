import pkg from "pg";
import { config } from "../config.js";

const { Pool } = pkg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30_000,
});