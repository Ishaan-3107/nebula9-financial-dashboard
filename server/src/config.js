import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
function requireEnv(name, fallback) {
    const v = process.env[name] ?? fallback;
    if (v === undefined || v === "") {
        throw new Error(`Missing env: ${name}`);
    }
    return v;
}
export const config = {
    port: Number(process.env.PORT ?? 4000),
    databaseUrl: requireEnv("DATABASE_URL", "postgresql://nebula9:nebula9_dev@localhost:5432/nebula9_finance"),
    jwtSecret: requireEnv("JWT_SECRET", "dev-only-change-in-production"),
    clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
    oauthCallbackBase: process.env.OAUTH_CALLBACK_BASE ?? "http://localhost:4000",
    googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    githubClientId: process.env.GITHUB_CLIENT_ID ?? "",
    githubClientSecret: process.env.GITHUB_CLIENT_SECRET ?? "",
    openaiApiKey: process.env.OPENAI_API_KEY ?? "",
    openaiModel: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    finnhubApiKey: process.env.FINNHUB_API_KEY ?? "",
};
