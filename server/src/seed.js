import { pool } from "./db/pool.js";
import { WATCHLIST, seedHistoricalBars } from "./services/marketData.js";
const SAMPLE_NEWS = [
    { symbol: "NVDA", headline: "Chip demand outlook debated by analysts in note", sentiment: 0.05 },
    { symbol: "AAPL", headline: "Supply chain checks suggest stable handset builds", sentiment: 0.12 },
    { symbol: "META", headline: "Ad market recovery remains uneven across regions", sentiment: -0.08 },
    { symbol: "AMZN", headline: "Cloud growth metrics in focus ahead of earnings season", sentiment: 0.03 },
    { symbol: null, headline: "Rates volatility keeps mega-cap tech correlations elevated", sentiment: -0.02 },
    { symbol: "SPY", headline: "Index flows show balanced risk-on tone in sample week", sentiment: 0.04 },
];
export async function runSeedIfNeeded() {
    const client = await pool.connect();
    try {
        const n = await client.query(`SELECT COUNT(*)::int AS c FROM news_items`);
        if (n.rows[0].c === 0) {
            for (const item of SAMPLE_NEWS) {
                await client.query(`INSERT INTO news_items (symbol, headline, source, sentiment_score, published_at)
           VALUES ($1, $2, 'simulated-wire', $3, NOW() - (random() * interval '2 days'))`, [item.symbol, item.headline, item.sentiment]);
            }
        }
        for (const sym of WATCHLIST) {
            const c = await client.query(`SELECT COUNT(*)::int AS c FROM market_bars WHERE symbol = $1`, [sym]);
            if (c.rows[0].c < 30) {
                await seedHistoricalBars(sym, 180);
            }
        }
    }
    finally {
        client.release();
    }
}
