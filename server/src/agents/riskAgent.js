import { volatilityFromCloses } from "../services/forecast.js";

export function assessRisk(closes) {
  const vol = volatilityFromCloses(closes);
  let level = "low";
  if (vol > 0.025) level = "high";
  else if (vol > 0.012) level = "moderate";

  const summary =
    level === "high"
      ? "Recent swings are wide vs. history in this window — size positions conservatively in simulators."
      : level === "moderate"
      ? "Typical tech-equity noise regime for this sample; monitor gap risk."
      : "Calm window in this sample — still subject to tail events.";

  return { level, vol, summary };
}