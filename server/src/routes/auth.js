import { Router } from "express";
import bcrypt from "bcryptjs";
import passport from "passport";
import { z } from "zod";
import { pool } from "../db/pool.js";
import { signToken, authMiddleware } from "../auth/jwt.js";
import { config } from "../config.js";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password, name } = parsed.data;
  const hash = await bcrypt.hash(password, 10);
  const client = await pool.connect();
  try {
    const u = await client.query(
      `INSERT INTO users (email, name, password_hash, provider) VALUES ($1, $2, $3, 'local')
       RETURNING id, email, name`,
      [email.toLowerCase(), name ?? email.split("@")[0], hash]
    );
    const row = u.rows[0];
    await client.query(
      `INSERT INTO portfolios (user_id, name) VALUES ($1, 'Main')`,
      [row.id]
    );
    const token = signToken({ sub: row.id, email: row.email });
    return res.json({ token, user: { id: row.id, email: row.email, name: row.name } });
  } catch (e) {
    if (e.code === "23505")
      return res.status(409).json({ error: "Email already registered" });
    throw e;
  } finally {
    client.release();
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: parsed.error.flatten() });

  const { email, password } = parsed.data;
  const r = await pool.query(
    `SELECT id, email, name, password_hash FROM users WHERE email = $1`,
    [email.toLowerCase()]
  );
  const row = r.rows[0];
  if (!row?.password_hash)
    return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const token = signToken({ sub: row.id, email: row.email });
  return res.json({ token, user: { id: row.id, email: row.email, name: row.name } });
});

router.get("/me", authMiddleware, async (req, res) => {
  const u = req.user;
  const r = await pool.query(
    `SELECT id, email, name, avatar_url, provider FROM users WHERE id = $1`,
    [u.sub]
  );
  const row = r.rows[0];
  if (!row) return res.status(404).json({ error: "Not found" });
  return res.json(row);
});

function oauthCallback(req, res) {
  const user = req.user;
  if (!user) return res.redirect(`${config.clientOrigin}/login?error=oauth`);
  const token = signToken({ sub: user.id, email: user.email });
  res.redirect(`${config.clientOrigin}/oauth?token=${encodeURIComponent(token)}`);
}

if (config.googleClientId && config.googleClientSecret) {
  router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
  router.get(
    "/google/callback",
    passport.authenticate("google", { session: false }),
    oauthCallback
  );
}

if (config.githubClientId && config.githubClientSecret) {
  router.get("/github", passport.authenticate("github", { scope: ["user:email"] }));
  router.get(
    "/github/callback",
    passport.authenticate("github", { session: false }),
    oauthCallback
  );
}

export default router;