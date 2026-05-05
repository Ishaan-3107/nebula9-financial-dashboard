# Nebula9 — Real-Time Financial Insights Dashboard

Educational hiring project: a **simulated** market stack with **React** charts, **Node.js** API, **TimescaleDB** for time-series, **JWT + OAuth**, **WebSocket** streaming, and **GenAI**-style analysis grounded on stored OHLCV, ticks, news sentiment, and the user’s portfolio.

> **Not financial advice.** No real trading, no brokerage relationship. Data may be synthetic or delayed.

## Architecture

| Layer | Choice |
|--------|--------|
| UI | Vite + React + Recharts |
| API | Express 4, TypeScript, `ws` |
| Auth | JWT (`Authorization: Bearer`), optional Google/GitHub OAuth |
| Relational + time-series | PostgreSQL **TimescaleDB** (`market_bars`, `market_ticks` hypertables) |
| Real-time | Ingestion loop + WebSocket broadcast (`/ws`) |
| AI | OpenAI-compatible chat when `OPENAI_API_KEY` is set; otherwise deterministic “mock-grounded” copy using the same numbers |
| Forecast / risk | `simple-statistics` linear regression + log-return volatility; separate **risk agent** tiering |

**Agents (modular):** `ingestionAgent` (quotes → DB + WS), `analysisAgent` (LLM/mock insight), `riskAgent` (volatility regime), `alertAgent` (threshold → in-app notifications).

## Quick start (local dev)

1. **Start TimescaleDB**

   ```bash
   docker compose up -d db
   ```

2. **Configure environment** — copy `.env.example` to `server/.env` (or project root). Minimum:

   - `DATABASE_URL=postgresql://nebula9:nebula9_dev@localhost:5432/nebula9_finance`
   - `JWT_SECRET=<long random string>`
   - `CLIENT_ORIGIN=http://localhost:5173`

3. **Migrate & seed**

   ```bash
   cd server
   npm install
   npm run db:migrate
   ```

4. **API**

   ```bash
   npm run dev
   ```

5. **UI** (new terminal)

   ```bash
   cd client
   npm install
   npm run dev
   ```

   Open `http://localhost:5173`. Register a user, open the dashboard, watch the live dot and chart updates.

**Optional:** set `OPENAI_API_KEY` for full NL + insight generation; `FINNHUB_API_KEY` for live quotes (otherwise prices are simulated).

**OAuth:** set `GOOGLE_*` / `GITHUB_*` and `OAUTH_CALLBACK_BASE=http://localhost:4000`. In dev, the SPA proxies `/api` to the API; OAuth callbacks still hit port **4000** directly, so register that redirect URI with the provider.

## Docker (monolith: API + static SPA + WS)

```bash
docker compose up --build
```

Then open `http://localhost:4000`. Set `CLIENT_ORIGIN` / `OAUTH_CALLBACK_BASE` to your public URL when deploying (e.g. Railway, Fly.io, a small VPS).

## API sketch

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET /api/auth/google`, `GET /api/auth/github` (if configured)
- `GET /api/markets/watchlist`, `GET /api/markets/bars/:symbol`, `GET /api/markets/ticks/:symbol`
- `GET|POST /api/portfolios/...` (JWT)
- `GET /api/insights/:symbol`, `POST /api/insights/query` (JWT, NL)
- `GET|POST|PATCH|DELETE /api/alerts/...`, `GET /api/alerts/notifications/list`
- WebSocket: `WS /ws` — messages `{ type: "prices", payload: { AAPL: 178.2, ... } }`

## Compliance / security notes

- Passwords: **bcrypt** hashes only.
- Rate limiting on the API; **helmet** headers.
- Simulated / third-party market data; educational disclaimer in UI and `GET /api/disclaimer`.

## Success metrics (how you could extend this)

Track prediction error vs. realized moves, alert latency, WS fan-out, and weekly active users — store in a `metrics` table or ship to your observability stack.

---

Built as a Nebula9-style take-home: clear boundaries, honest grounding for AI, and a path from laptop Docker to a small cloud deploy.
