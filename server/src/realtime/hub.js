const clients = new Set();

export function registerClient(ws) {
  clients.add(ws);

  ws.on("close", () => {
    clients.delete(ws);
  });

  ws.on("error", () => {
    clients.delete(ws);
  });
}

export function broadcastPrices(prices) {
  const payload = JSON.stringify({
    type: "prices",
    payload: prices,
  });

  for (const ws of clients) {
    try {
      if (ws.readyState === 1) {
        ws.send(payload);
      } else {
        clients.delete(ws);
      }
    } catch (err) {
      console.error(
        "WebSocket send failed:",
        err
      );

      clients.delete(ws);

      try {
        ws.close();
      } catch {}
    }
  }
}