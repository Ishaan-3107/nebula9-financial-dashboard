import { generateInsight } from "../services/aiAnalysis.js";

export async function runAnalysisAgent(ctx) {
  return generateInsight(ctx);
}