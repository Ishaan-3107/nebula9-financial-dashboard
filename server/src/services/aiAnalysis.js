import { forecastNextCloses, volatilityFromCloses } from "./forecast.js";

const DISCLAIMER =
  "Educational simulation only — not financial advice. Data may be synthetic or delayed.";

function mockInsight(ctx) {
  const { steps, slopePerStep } = forecastNextCloses(ctx.bars, 5);
  const closes = ctx.bars.map((b) => b.c);
  const vol = volatilityFromCloses(closes);
  const trend = slopePerStep > 0 ? "upward" : slopePerStep < 0 ? "downward" : "flat";
  const risk = vol > 0.02 ? "elevated" : vol > 0.01 ? "moderate" : "relatively low";
  const news = ctx.newsHeadlines.slice(0, 3).join("; ") || "No recent headlines in store.";

  return [
    `${ctx.symbol} @ ${ctx.livePrice} (${DISCLAIMER})`,
    ``,
    `Trend (simple linear fit): short-horizon direction looks ${trend}; next-step regression targets ~${steps.slice(0, 3).join(", ")}.`,
    `Volatility (log-returns): ${risk} (σ ≈ ${(vol * 100).toFixed(2)}% per bar).`,
    `News context: ${news}`,
    ctx.portfolioLine ? `Your portfolio: ${ctx.portfolioLine}` : "",
    ``,
    `Risk note: Use position sizing and stops appropriate to your goals; this dashboard does not execute trades.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateInsight(ctx) {
  return { text: mockInsight(ctx), model: "mock-grounded" };
}

export async function answerNaturalLanguageQuery(question, ctx) {
  const base = mockInsight(ctx);
  return {
    text:
      `Q: ${question}\n\n` +
      `A (offline grounded mode): ${base}\n\n` +
      `_This project is configured to run fully offline for AI responses._`,
    model: "mock-grounded",
  };
}