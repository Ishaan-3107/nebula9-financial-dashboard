import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import passport from "passport";
import { WebSocketServer } from "ws";
import { config } from "./config.js";
import { pool } from "./db/pool.js";
import { configurePassport } from "./auth/passport.js";
import authRoutes from "./routes/auth.js";
import marketRoutes from "./routes/markets.js";
import portfolioRoutes from "./routes/portfolio.js";
import insightRoutes from "./routes/insights.js";
import alertRoutes from "./routes/alerts.js";
import { runIngestionTick } from "./agents/ingestionAgent.js";
import { evaluateAlertsForSymbol } from "./agents/alertAgent.js";
import { registerClient, broadcastPrices } from "./realtime/hub.js";
import { runSeedIfNeeded } from "./seed.js";
configurePassport();
const app = express();
app.use(helmet());
app.use(cors({
    origin: config.clientOrigin,
    credentials: true,
}));
app.use(express.json({ limit: "512kb" }));
app.use(cookieParser());
app.use(passport.initialize());
app.use(rateLimit({
    windowMs: 60_000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
}));
app.get("/api/health", async (_req, res) => {
    try {
        await pool.query("SELECT 1");
        res.json({ ok: true, service: "nebula9-finance-api" });
    }
    catch {
        res.status(503).json({ ok: false });
    }
});
app.get("/api/disclaimer", (_req, res) => {
    res.json({
        text: "Nebula9 Financial Insights is an educational simulation. Market data may be synthetic or delayed. Nothing here is investment advice, an offer, or a solicitation. Past performance does not guarantee future results.",
    });
});
app.use("/api/auth", authRoutes);
app.use("/api/markets", marketRoutes);
app.use("/api/portfolios", portfolioRoutes);
app.use("/api/insights", insightRoutes);
app.use("/api/alerts", alertRoutes);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
if (process.env.SERVE_STATIC === "1") {
    const clientDist = process.env.CLIENT_DIST ?? path.resolve(__dirname, "../../client/dist");
    app.use(express.static(clientDist, { fallthrough: true }));
    app.use((req, res, next) => {
        if (req.method !== "GET" && req.method !== "HEAD")
            return next();
        if (req.path.startsWith("/api") || req.path === "/ws")
            return next();
        res.sendFile(path.join(clientDist, "index.html"));
    });
}
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });
wss.on("connection", (ws) => {
    registerClient(ws);
    ws.send(JSON.stringify({ type: "hello", payload: { message: "stream connected" } }));
});
async function tickLoop() {
    try {
        const prices = await runIngestionTick();
        broadcastPrices(prices);
        for (const [sym, px] of Object.entries(prices)) {
            await evaluateAlertsForSymbol(sym, px);
        }
    }
    catch (e) {
        console.error("ingestion tick", e);
    }
}
async function main() {
    await runSeedIfNeeded();
    setInterval(tickLoop,3000);
    server.listen(config.port, () => {
        console.log(`API + WS on http://localhost:${config.port}`);
    });
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
