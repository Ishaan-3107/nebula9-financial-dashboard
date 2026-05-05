import {
    WATCHLIST,
    fetchFinnhubQuote,
    getSimulatedPrice,
    persistTick,
    persistBar,
  } from "../services/marketData.js";
  
  const barState = {};
  
  function floorMinute(d = new Date()) {
    const x = new Date(d);
    x.setSeconds(0, 0);
    return x;
  }
  
  /**
   * Pulls quotes (Finnhub if configured, else simulation), persists ticks & 1m bars.
   */
  export async function runIngestionTick() {
    const prices = {};
    const bucket = floorMinute();
    const bucketMs = bucket.getTime();
  
    for (const symbol of WATCHLIST) {
      const ext = await fetchFinnhubQuote(symbol);
      const price = ext?.price ?? getSimulatedPrice(symbol);
      prices[symbol] = price;
  
      await persistTick(symbol, price, Math.floor(Math.random() * 10_000));
  
      const prev = barState[symbol];
      if (!prev || prev.bucket !== bucketMs) {
        barState[symbol] = { bucket: bucketMs, open: price, high: price, low: price, close: price, vol: 1 };
      } else {
        barState[symbol] = {
          bucket: bucketMs,
          open: prev.open,
          high: Math.max(prev.high, price),
          low: Math.min(prev.low, price),
          close: price,
          vol: prev.vol + 1,
        };
      }
  
      const b = barState[symbol];
      await persistBar(symbol, bucket, b.open, b.high, b.low, b.close, b.vol);
    }
  
    return prices;
  }