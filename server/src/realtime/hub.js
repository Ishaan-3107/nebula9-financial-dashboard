const clients = new Set();

export function registerClient(ws) {
  clients.add(ws);
  ws.on("close", () => clients.delete(ws));
}

export function broadcastPrices(prices) {
  const msg = JSON.stringify({ type: "prices", payload: prices, ts: Date.now() });
  for (const c of clients) {
    if (c.readyState === 1) c.send(msg);
  }
}