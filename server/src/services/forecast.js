import { linearRegression, linearRegressionLine } from "simple-statistics";

/**
 * Simple linear regression forecast on close prices (educational baseline).
 * Not investment advice; complements GenAI narrative with a transparent model.
 */
export function forecastNextCloses(bars, horizon = 5) {
  if (bars.length < 5) {
    const last = bars.at(-1)?.c ?? 100;
    return { steps: Array(horizon).fill(last), slopePerStep: 0 };
  }
  const pairs = bars.map((b, i) => [i, b.c]);
  const { m, b } = linearRegression(pairs);
  const line = linearRegressionLine({ m, b });
  const start = bars.length;
  const steps = [];
  for (let h = 1; h <= horizon; h++) {
    steps.push(Math.round(line(start + h - 1) * 100) / 100);
  }
  return { steps, slopePerStep: Math.round(m * 10000) / 10000 };
}

export function volatilityFromCloses(closes) {
  if (closes.length < 2) return 0;
  const rets = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] !== 0) rets.push(Math.log(closes[i] / closes[i - 1]));
  }
  if (!rets.length) return 0;
  const mean = rets.reduce((a, x) => a + x, 0) / rets.length;
  const var_ = rets.reduce((a, x) => a + (x - mean) ** 2, 0) / (rets.length - 1 || 1);
  return Math.sqrt(var_);
}