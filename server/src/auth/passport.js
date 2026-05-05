import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import { config } from "../config.js";
import { pool } from "../db/pool.js";

async function upsertOAuthUser(p) {
  const client = await pool.connect();
  try {
    const existing = await client.query(
      `SELECT id, email FROM users WHERE provider = $1 AND provider_id = $2`,
      [p.provider, p.providerId]
    );
    if (existing.rows[0]) {
      await client.query(
        `UPDATE users SET name = COALESCE($2, name), avatar_url = COALESCE($3, avatar_url), updated_at = NOW() WHERE id = $1`,
        [existing.rows[0].id, p.name, p.avatarUrl ?? null]
      );
      return existing.rows[0];
    }
    const ins = await client.query(
      `INSERT INTO users (email, name, avatar_url, provider, provider_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET
         provider = EXCLUDED.provider,
         provider_id = EXCLUDED.provider_id,
         name = COALESCE(EXCLUDED.name, users.name),
         avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
         updated_at = NOW()
       RETURNING id, email`,
      [p.email, p.name, p.avatarUrl ?? null, p.provider, p.providerId]
    );
    const row = ins.rows[0];
    const hasPf = await client.query(
      `SELECT 1 FROM portfolios WHERE user_id = $1 LIMIT 1`,
      [row.id]
    );
    if (!hasPf.rows[0]) {
      await client.query(
        `INSERT INTO portfolios (user_id, name) VALUES ($1, 'Main')`,
        [row.id]
      );
    }
    return row;
  } finally {
    client.release();
  }
}

export function configurePassport() {
  if (config.googleClientId && config.googleClientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: config.googleClientId,
          clientSecret: config.googleClientSecret,
          callbackURL: `${config.oauthCallbackBase}/api/auth/google/callback`,
        },
        async (_access, _refresh, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) return done(new Error("No email from Google"));
            const user = await upsertOAuthUser({
              email,
              name: profile.displayName ?? email,
              avatarUrl: profile.photos?.[0]?.value,
              provider: "google",
              providerId: profile.id,
            });
            done(null, user);
          } catch (e) {
            done(e);
          }
        }
      )
    );
  }

  if (config.githubClientId && config.githubClientSecret) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: config.githubClientId,
          clientSecret: config.githubClientSecret,
          callbackURL: `${config.oauthCallbackBase}/api/auth/github/callback`,
        },
        async (_access, _refresh, profile, done) => {
          try {
            const email =
              profile.emails?.[0]?.value ??
              `${profile.username}@users.noreply.github.com`;
            const user = await upsertOAuthUser({
              email,
              name: profile.displayName ?? profile.username ?? email,
              avatarUrl: profile.photos?.[0]?.value,
              provider: "github",
              providerId: String(profile.id),
            });
            done(null, user);
          } catch (e) {
            done(e);
          }
        }
      )
    );
  }
}