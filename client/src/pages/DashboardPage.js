import {
  jsx as _jsx,
  jsxs as _jsxs,
  Fragment as _Fragment,
} from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar as RechartsBar,
  Cell,
  PieChart,
  Pie,
  ReferenceLine,
  Legend,
} from "recharts";
import { api, wsUrl } from "../api";

const RANGE_LIMITS = {
  "1D": 390,
  "3D": 1170,
  "1W": 1950,
  "1M": 8400,
  "3M": 25200,
};

const PIE_FILLS = [
  "var(--accent)",
  "var(--accent2)",
  "var(--good)",
  "var(--warn)",
  "var(--bad)",
];

// Helper: format numbers cleanly (strip trailing zeros)
function fmtNum(v, decimals = 2) {
  const n = Number(v);
  if (!Number.isFinite(n)) return v;
  return n % 1 === 0 ? n.toString() : n.toFixed(decimals);
}

// Helper: format condition string nicely
function fmtCondition(c) {
  if (c === "price_above") return "Price ≥";
  if (c === "price_below") return "Price ≤";
  return c;
}

export function DashboardPage() {
  const [symbols, setSymbols] = useState([]);
  const [symbol, setSymbol] = useState("AAPL");
  const [bars, setBars] = useState([]);
  const [live, setLive] = useState({});
  const [timeRange, setTimeRange] = useState("1D");
  const [portfolioId, setPortfolioId] = useState(null);
  const [positions, setPositions] = useState([]);
  const [insight, setInsight] = useState(null);
  const [risk, setRisk] = useState(null);
  const [q, setQ] = useState("What should I watch in the next few sessions?");
  const [nl, setNl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotes, setShowNotes] = useState(false);
  const [posForm, setPosForm] = useState({
    symbol: "AAPL",
    quantity: "10",
    avg_cost: "170",
  });
  const [alertForm, setAlertForm] = useState({
    condition: "price_above",
    threshold: "200",
    sym: "AAPL",
  });

  const chartData = useMemo(
    () =>
      bars.map((b) => ({
        t: new Date(b.bucket).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        close: Number(b.close),
      })),
    [bars],
  );

  const deltaBars = useMemo(() => {
    if (chartData.length < 2) return [];
    const last = chartData.slice(-16);
    const out = [];
    for (let i = 1; i < last.length; i++) {
      out.push({ label: last[i].t, delta: last[i].close - last[i - 1].close });
    }
    return out;
  }, [chartData]);

  const watchlistBars = useMemo(
    () =>
      symbols
        .map((sym) => {
          const px = live[sym];
          return px != null && Number.isFinite(px) ? { sym, px } : null;
        })
        .filter((x) => x != null),
    [symbols, live],
  );

  const portfolioSlices = useMemo(() => {
    return positions
      .map((p) => {
        const qty = Number(p.quantity);
        const px = live[p.symbol] ?? Number(p.avg_cost);
        const value = qty * px;
        return {
          name: p.symbol,
          value: Number.isFinite(value) && value > 0 ? value : 0,
        };
      })
      .filter((s) => s.value > 0);
  }, [positions, live]);

  const refreshPortfolio = useCallback(async () => {
    const p = await api("/api/portfolios/");
    const id = p.portfolios[0]?.id ?? null;
    setPortfolioId(id);
    if (!id) return;
    const pos = await api(`/api/portfolios/${id}/positions`);
    setPositions(pos.positions);
  }, []);

  const refreshBars = useCallback(async () => {
    const limit = RANGE_LIMITS[timeRange] ?? 390;
    const r = await api(`/api/markets/bars/${symbol}?limit=${limit}`);
    setBars(r.bars);
  }, [symbol, timeRange]);

  const refreshAlerts = useCallback(async () => {
    const a = await api("/api/alerts/");
    setAlerts(a.alerts);
    const n = await api("/api/alerts/notifications/list");
    setNotifications(n.notifications);
  }, []);

  // Mark all notifications as read
  async function markAllRead() {
    const unread = notifications.filter((n) => !n.read_at);
    await Promise.all(
      unread.map((n) =>
        api(`/api/alerts/notifications/${n.id}/read`, { method: "POST" }),
      ),
    );
    await refreshAlerts();
  }

  // Delete alert
  async function deleteAlert(id) {
    await api(`/api/alerts/${id}`, { method: "DELETE" });
    await refreshAlerts();
  }

  useEffect(() => {
    api("/api/markets/watchlist").then((w) => {
      setSymbols(w.symbols);
      if (!w.symbols.includes(symbol) && w.symbols[0]) setSymbol(w.symbols[0]);
    });
  }, []);

  useEffect(() => {
    void refreshPortfolio();
  }, [refreshPortfolio]);
  useEffect(() => {
    void refreshBars();
  }, [refreshBars, symbol, timeRange]);
  useEffect(() => {
    void refreshAlerts();
  }, [refreshAlerts]);

  useEffect(() => {
    const ws = new WebSocket(wsUrl());
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "prices" && msg.payload) setLive(msg.payload);
      } catch {
        /* ignore */
      }
    };
    return () => ws.close();
  }, []);

  async function runInsight() {
    setLoading(true);
    setInsight(null);
    setRisk(null);
    try {
      const r = await api(`/api/insights/${encodeURIComponent(symbol)}`);
      setInsight(r.text);
      setRisk(r.risk);
    } catch (e) {
      setInsight(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function runNl() {
    setLoading(true);
    setNl(null);
    try {
      const r = await api("/api/insights/query", {
        method: "POST",
        body: JSON.stringify({ question: q, symbol }),
      });
      setNl(r.text);
      setRisk(r.risk);
    } catch (e) {
      setNl(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function addPosition(e) {
    e.preventDefault();
    if (!portfolioId) return;
    await api(`/api/portfolios/${portfolioId}/positions`, {
      method: "POST",
      body: JSON.stringify({
        symbol: posForm.symbol,
        quantity: Number(posForm.quantity),
        avg_cost: Number(posForm.avg_cost),
      }),
    });
    await refreshPortfolio();
  }

  async function addAlert(e) {
    e.preventDefault();
    await api("/api/alerts/", {
      method: "POST",
      body: JSON.stringify({
        symbol: alertForm.sym,
        condition: alertForm.condition,
        threshold: Number(alertForm.threshold),
      }),
    });
    await refreshAlerts();
  }

  const livePx = live[symbol] ?? chartData.at(-1)?.close ?? null;
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return _jsxs("div", {
    className: "grid grid-2",
    children: [
      // LEFT COLUMN
      _jsxs("div", {
        className: "grid",
        children: [
          // Live market chart
          _jsxs("div", {
            className: "card",
            children: [
              _jsxs("div", {
                className: "row",
                style: {
                  justifyContent: "space-between",
                  marginBottom: "0.75rem",
                },
                children: [
                  _jsx("h2", {
                    style: { margin: 0 },
                    children: "Live market chart",
                  }),
                  _jsxs("span", {
                    className: "row muted",
                    style: { gap: "0.35rem", fontSize: "0.85rem" },
                    children: [
                      _jsx("span", {
                        className: "live-dot",
                        title: "websocket stream",
                      }),
                      " stream",
                    ],
                  }),
                ],
              }),
              _jsxs("div", {
                className: "row",
                style: { marginBottom: "0.75rem" },
                children: [
                  _jsx("label", {
                    className: "muted",
                    htmlFor: "sym",
                    style: { margin: 0 },
                    children: "Symbol",
                  }),
                  _jsx("select", {
                    id: "sym",
                    value: symbol,
                    onChange: (e) => setSymbol(e.target.value),
                    children: symbols.map((s) =>
                      _jsx("option", { value: s, children: s }, s),
                    ),
                  }),
                  livePx != null &&
                    _jsxs("span", {
                      style: { fontFamily: "var(--mono)", fontSize: "0.95rem" },
                      children: [
                        symbol,
                        " ",
                        _jsx("strong", { children: livePx }),
                      ],
                    }),
                  _jsxs("div", {
                    className: "row",
                    style: { gap: "0.25rem" },
                    children: ["1D", "3D", "1W", "1M", "3M"].map((r) =>
                      _jsx(
                        "button",
                        {
                          type: "button",
                          className: `btn${timeRange === r ? " btn-primary" : ""}`,
                          style: {
                            padding: "0.2rem 0.6rem",
                            fontSize: "0.82rem",
                          },
                          onClick: () => setTimeRange(r),
                          children: r,
                        },
                        r,
                      ),
                    ),
                  }),
                  _jsx("button", {
                    type: "button",
                    className: "btn",
                    onClick: () => void refreshBars(),
                    children: "Refresh",
                  }),
                ],
              }),
              _jsx("div", {
                style: { width: "100%", height: 320 },
                children: _jsx(ResponsiveContainer, {
                  children: _jsxs(LineChart, {
                    data: chartData,
                    children: [
                      _jsx(CartesianGrid, {
                        strokeDasharray: "3 3",
                        stroke: "var(--chart-grid)",
                      }),
                      _jsx(XAxis, {
                        dataKey: "t",
                        stroke: "var(--chart-axis)",
                        tick: { fontSize: 11 },
                      }),
                      _jsx(YAxis, {
                        stroke: "var(--chart-axis)",
                        domain: ["auto", "auto"],
                        tick: { fontSize: 11 },
                      }),
                      _jsx(Tooltip, {
                        contentStyle: {
                          background: "var(--chart-tooltip-bg)",
                          border: "1px solid var(--chart-tooltip-border)",
                        },
                        labelStyle: { color: "var(--chart-tooltip-label)" },
                      }),
                      _jsx(Line, {
                        type: "monotone",
                        dataKey: "close",
                        stroke: "var(--chart-line)",
                        dot: false,
                        strokeWidth: 2,
                      }),
                    ],
                  }),
                }),
              }),
              _jsx("p", {
                className: "muted",
                style: { margin: "0.75rem 0 0", fontSize: "0.8rem" },
                children:
                  "Bars stored in TimescaleDB hypertable; ticks broadcast over WebSocket every ~3s (simulated or Finnhub).",
              }),
            ],
          }),

          // Mini charts
          _jsxs("div", {
            className: "mini-charts",
            children: [
              _jsxs("div", {
                className: "card",
                children: [
                  _jsxs("h3", {
                    className: "chart-block__title",
                    children: ["Bar-to-bar change (", symbol, ")"],
                  }),
                  _jsx("p", {
                    className: "muted",
                    style: { margin: "0 0 0.5rem", fontSize: "0.82rem" },
                    children: "Last buckets: gain vs prior close.",
                  }),
                  _jsx("div", {
                    className: "mini-chart",
                    children:
                      deltaBars.length > 0
                        ? _jsx(ResponsiveContainer, {
                            children: _jsxs(BarChart, {
                              data: deltaBars,
                              margin: { top: 8, right: 8, left: 0, bottom: 4 },
                              children: [
                                _jsx(CartesianGrid, {
                                  strokeDasharray: "3 3",
                                  stroke: "var(--chart-grid)",
                                  vertical: false,
                                }),
                                _jsx(ReferenceLine, {
                                  y: 0,
                                  stroke: "var(--chart-axis)",
                                  strokeDasharray: "4 4",
                                }),
                                _jsx(XAxis, {
                                  dataKey: "label",
                                  tick: { fontSize: 9 },
                                  interval: "preserveStartEnd",
                                  stroke: "var(--chart-axis)",
                                }),
                                _jsx(YAxis, {
                                  stroke: "var(--chart-axis)",
                                  tick: { fontSize: 10 },
                                  width: 40,
                                }),
                                _jsx(Tooltip, {
                                  contentStyle: {
                                    background: "var(--chart-tooltip-bg)",
                                    border:
                                      "1px solid var(--chart-tooltip-border)",
                                  },
                                  labelStyle: {
                                    color: "var(--chart-tooltip-label)",
                                  },
                                  formatter: (v) => [v.toFixed(4), "Δ close"],
                                }),
                                _jsx(RechartsBar, {
                                  dataKey: "delta",
                                  maxBarSize: 28,
                                  radius: [4, 4, 0, 0],
                                  children: deltaBars.map((e, i) =>
                                    _jsx(
                                      Cell,
                                      {
                                        fill:
                                          e.delta >= 0
                                            ? "var(--good)"
                                            : "var(--bad)",
                                      },
                                      i,
                                    ),
                                  ),
                                }),
                              ],
                            }),
                          })
                        : _jsx("p", {
                            className: "muted",
                            style: {
                              margin: 0,
                              padding: "2rem 0",
                              textAlign: "center",
                            },
                            children: "Load history to see changes.",
                          }),
                  }),
                ],
              }),
              _jsxs("div", {
                className: "card",
                children: [
                  _jsx("h3", {
                    className: "chart-block__title",
                    children: "Watchlist snapshot",
                  }),
                  _jsx("p", {
                    className: "muted",
                    style: { margin: "0 0 0.5rem", fontSize: "0.82rem" },
                    children: "Latest streamed prices across symbols.",
                  }),
                  _jsx("div", {
                    className: "mini-chart",
                    children:
                      watchlistBars.length > 0
                        ? _jsx(ResponsiveContainer, {
                            children: _jsxs(BarChart, {
                              layout: "vertical",
                              data: watchlistBars,
                              margin: { top: 4, right: 16, left: 4, bottom: 4 },
                              children: [
                                _jsx(CartesianGrid, {
                                  strokeDasharray: "3 3",
                                  stroke: "var(--chart-grid)",
                                  horizontal: false,
                                }),
                                _jsx(XAxis, {
                                  type: "number",
                                  stroke: "var(--chart-axis)",
                                  tick: { fontSize: 10 },
                                  domain: ["auto", "auto"],
                                }),
                                _jsx(YAxis, {
                                  type: "category",
                                  dataKey: "sym",
                                  width: 44,
                                  stroke: "var(--chart-axis)",
                                  tick: { fontSize: 11 },
                                }),
                                _jsx(Tooltip, {
                                  contentStyle: {
                                    background: "var(--chart-tooltip-bg)",
                                    border:
                                      "1px solid var(--chart-tooltip-border)",
                                  },
                                  labelStyle: {
                                    color: "var(--chart-tooltip-label)",
                                  },
                                  formatter: (v) => [v.toFixed(2), "Price"],
                                }),
                                _jsx(RechartsBar, {
                                  dataKey: "px",
                                  fill: "var(--chart-line)",
                                  radius: [0, 6, 6, 0],
                                  maxBarSize: 22,
                                }),
                              ],
                            }),
                          })
                        : _jsx("p", {
                            className: "muted",
                            style: {
                              margin: 0,
                              padding: "2rem 0",
                              textAlign: "center",
                            },
                            children: "Waiting for WebSocket prices…",
                          }),
                  }),
                ],
              }),
            ],
          }),

          // Insight card
          _jsxs("div", {
            className: "card",
            children: [
              _jsx("h2", { children: "Grounded insight & NL query" }),
              _jsx("p", {
                className: "muted",
                style: { marginTop: "-0.5rem" },
                children:
                  "Offline grounded mode: analysis is generated from stored OHLCV, live tick, simulated news sentiment, and portfolio snapshot.",
              }),
              _jsxs("div", {
                className: "row",
                style: { marginBottom: "0.5rem" },
                children: [
                  _jsx("button", {
                    type: "button",
                    className: "btn btn-primary",
                    disabled: loading,
                    onClick: () => void runInsight(),
                    children: "Generate grounded insight",
                  }),
                  _jsx("button", {
                    type: "button",
                    className: "btn",
                    disabled: loading,
                    onClick: () => void runNl(),
                    children: "Answer NL question",
                  }),
                ],
              }),
              _jsxs("div", {
                className: "form-group",
                children: [
                  _jsx("label", {
                    htmlFor: "q",
                    children: "Natural language question",
                  }),
                  _jsx("textarea", {
                    id: "q",
                    value: q,
                    onChange: (e) => setQ(e.target.value),
                  }),
                ],
              }),
              risk &&
                _jsxs("p", {
                  className: "row",
                  style: { gap: "0.5rem", alignItems: "center" },
                  children: [
                    _jsx("span", {
                      className: "muted",
                      children: "Risk agent:",
                    }),
                    _jsx("span", {
                      className: `badge badge-${risk.level === "high" ? "high" : risk.level === "moderate" ? "moderate" : "low"}`,
                      children: risk.level,
                    }),
                    _jsx("span", {
                      className: "muted",
                      style: { fontSize: "0.85rem" },
                      children: risk.summary,
                    }),
                  ],
                }),
              insight &&
                _jsxs("div", {
                  style: { marginTop: "0.75rem" },
                  children: [
                    _jsx("h3", {
                      style: { fontSize: "0.95rem", margin: "0 0 0.35rem" },
                      children: "Insight",
                    }),
                    _jsx("div", { className: "prose", children: insight }),
                  ],
                }),
              nl &&
                _jsxs("div", {
                  style: { marginTop: "0.75rem" },
                  children: [
                    _jsx("h3", {
                      style: { fontSize: "0.95rem", margin: "0 0 0.35rem" },
                      children: "Answer",
                    }),
                    _jsx("div", { className: "prose", children: nl }),
                  ],
                }),
            ],
          }),
        ],
      }),

      // RIGHT COLUMN
      _jsxs("div", {
        className: "grid",
        children: [
          // Portfolio card
          _jsxs("div", {
            className: "card",
            children: [
              _jsxs("div", {
                className: "row",
                style: { justifyContent: "space-between" },
                children: [
                  _jsx("h2", { style: { margin: 0 }, children: "Portfolio" }),
                  _jsx("button", {
                    type: "button",
                    className: "btn",
                    onClick: () => void refreshPortfolio(),
                    children: "Refresh",
                  }),
                ],
              }),
              !portfolioId &&
                _jsx("p", {
                  className: "muted",
                  children: "No portfolio row — complete registration.",
                }),
              portfolioId &&
                _jsxs(_Fragment, {
                  children: [
                    // Positions table — clean number formatting
                    _jsxs("table", {
                      className: "table",
                      children: [
                        _jsx("thead", {
                          children: _jsxs("tr", {
                            children: [
                              _jsx("th", { children: "Symbol" }),
                              _jsx("th", { children: "Qty" }),
                              _jsx("th", { children: "Avg cost" }),
                              _jsx("th", { children: "Est. value" }),
                            ],
                          }),
                        }),
                        _jsx("tbody", {
                          children: positions.map((p) => {
                            const qty = Number(p.quantity);
                            const cost = Number(p.avg_cost);
                            const px = live[p.symbol] ?? cost;
                            const val = qty * px;
                            return _jsxs(
                              "tr",
                              {
                                children: [
                                  _jsx("td", { children: p.symbol }),
                                  _jsx("td", { children: fmtNum(qty) }),
                                  _jsx("td", { children: `$${fmtNum(cost)}` }),
                                  _jsx("td", {
                                    children: `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                                  }),
                                ],
                              },
                              p.symbol,
                            );
                          }),
                        }),
                      ],
                    }),

                    // Add position form
                    _jsxs("form", {
                      onSubmit: (e) => void addPosition(e),
                      style: { marginTop: "0.75rem" },
                      children: [
                        _jsxs("div", {
                          className: "row",
                          children: [
                            _jsxs("div", {
                              style: { flex: 1 },
                              children: [
                                _jsx("label", { children: "Symbol" }),
                                _jsxs("select", {
                                  className: "input",
                                  value: posForm.symbol,
                                  onChange: (e) =>
                                    setPosForm({
                                      ...posForm,
                                      symbol: e.target.value,
                                    }),
                                  children: symbols.map((s) =>
                                    _jsx(
                                      "option",
                                      { value: s, children: s },
                                      s,
                                    ),
                                  ),
                                }),
                              ],
                            }),
                            _jsxs("div", {
                              style: { flex: 1 },
                              children: [
                                _jsx("label", { children: "Qty" }),
                                _jsx("input", {
                                  className: "input",
                                  value: posForm.quantity,
                                  onChange: (e) =>
                                    setPosForm({
                                      ...posForm,
                                      quantity: e.target.value,
                                    }),
                                }),
                              ],
                            }),
                            _jsxs("div", {
                              style: { flex: 1 },
                              children: [
                                _jsx("label", { children: "Avg cost" }),
                                _jsx("input", {
                                  className: "input",
                                  value: posForm.avg_cost,
                                  onChange: (e) =>
                                    setPosForm({
                                      ...posForm,
                                      avg_cost: e.target.value,
                                    }),
                                }),
                              ],
                            }),
                          ],
                        }),
                        _jsx("button", {
                          type: "submit",
                          className: "btn btn-primary",
                          style: { marginTop: "0.5rem" },
                          children: "Upsert position",
                        }),
                      ],
                    }),

                    // Pie chart
                    portfolioSlices.length > 0 &&
                      _jsxs("div", {
                        style: {
                          marginTop: "1.25rem",
                          paddingTop: "1rem",
                          borderTop: "1px solid var(--border)",
                        },
                        children: [
                          _jsx("h3", {
                            className: "chart-block__title",
                            children: "Holdings mix (est. value)",
                          }),
                          _jsx("p", {
                            className: "chart-block__note",
                            style: { marginTop: 0 },
                            children:
                              "Qty × (live price or avg cost). Updates as the stream ticks.",
                          }),
                          _jsx("div", {
                            className: "allocation-chart",
                            style: { height: 260 },
                            children: _jsx(ResponsiveContainer, {
                              children: _jsxs(PieChart, {
                                children: [
                                  _jsx(Pie, {
                                    data: portfolioSlices,
                                    dataKey: "value",
                                    nameKey: "name",
                                    cx: "50%",
                                    cy: "45%",
                                    innerRadius: 52,
                                    outerRadius: 84,
                                    paddingAngle: 2,
                                    children: portfolioSlices.map((_, i) =>
                                      _jsx(
                                        Cell,
                                        {
                                          fill: PIE_FILLS[i % PIE_FILLS.length],
                                          stroke: "var(--card)",
                                          strokeWidth: 2,
                                        },
                                        i,
                                      ),
                                    ),
                                  }),
                                  _jsx(Tooltip, {
                                    contentStyle: {
                                      background: "var(--chart-tooltip-bg)",
                                      border:
                                        "1px solid var(--chart-tooltip-border)",
                                    },
                                    formatter: (v, _name, props) => {
                                      try {
                                        return [
                                          `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                                          props?.payload?.name ?? "",
                                        ];
                                      } catch {
                                        return [v, ""];
                                      }
                                    },
                                  }),
                                  _jsx(Legend, {
                                    iconType: "circle",
                                    iconSize: 10,
                                    formatter: (value, entry) => {
                                      try {
                                        const val = entry?.payload?.value;
                                        return val != null
                                          ? `${value} ($${Number(val).toLocaleString(undefined, { maximumFractionDigits: 0 })})`
                                          : value;
                                      } catch {
                                        return value;
                                      }
                                    },
                                    wrapperStyle: {
                                      fontSize: "0.82rem",
                                      paddingTop: "0.5rem",
                                    },
                                  }),
                                ],
                              }),
                            }),
                          }),
                        ],
                      }),
                  ],
                }),
            ],
          }),

          // Alerts & notifications card
          _jsxs("div", {
            className: "card",
            children: [
              _jsxs("div", {
                className: "row",
                style: { justifyContent: "space-between" },
                children: [
                  _jsx("h2", {
                    style: { margin: 0 },
                    children: "Alerts & notifications",
                  }),
                  _jsxs("div", {
                    className: "row",
                    style: { gap: "0.5rem" },
                    children: [
                      unreadCount > 0 &&
                        _jsx("button", {
                          type: "button",
                          className: "btn",
                          onClick: () => void markAllRead(),
                          children: `Mark all read (${unreadCount})`,
                        }),
                      _jsxs("button", {
                        type: "button",
                        className: "btn",
                        onClick: () => setShowNotes((s) => !s),
                        children: [
                          showNotes ? "Hide" : "Show",
                          " inbox (",
                          unreadCount,
                          ")",
                        ],
                      }),
                    ],
                  }),
                ],
              }),

              // Notifications inbox
              showNotes &&
                _jsx("ul", {
                  style: {
                    listStyle: "none",
                    padding: 0,
                    margin: "0.5rem 0 0",
                  },
                  children: notifications.map((n) =>
                    _jsxs(
                      "li",
                      {
                        style: {
                          padding: "0.45rem 0",
                          borderBottom: "1px solid var(--border)",
                          opacity: n.read_at ? 0.55 : 1,
                        },
                        children: [
                          _jsx("strong", { children: n.title }),
                          _jsx("div", {
                            className: "muted",
                            style: { fontSize: "0.85rem" },
                            children: n.body,
                          }),
                          !n.read_at &&
                            _jsx("button", {
                              type: "button",
                              className: "btn",
                              style: { marginTop: "0.35rem" },
                              onClick: () =>
                                void api(
                                  `/api/alerts/notifications/${n.id}/read`,
                                  { method: "POST" },
                                ).then(refreshAlerts),
                              children: "Mark read",
                            }),
                        ],
                      },
                      n.id,
                    ),
                  ),
                }),

              // Alerts table — clean formatting + delete button
              _jsxs("table", {
                className: "table",
                style: { marginTop: "0.75rem" },
                children: [
                  _jsx("thead", {
                    children: _jsxs("tr", {
                      children: [
                        _jsx("th", { children: "Sym" }),
                        _jsx("th", { children: "Rule" }),
                        _jsx("th", { children: "Threshold" }),
                        _jsx("th", { children: "Status" }),
                        _jsx("th", {}),
                      ],
                    }),
                  }),
                  _jsx("tbody", {
                    children: alerts.map((a) =>
                      _jsxs(
                        "tr",
                        {
                          children: [
                            _jsx("td", { children: a.symbol ?? "*" }),
                            _jsx("td", { children: fmtCondition(a.condition) }),
                            _jsx("td", {
                              children: `$${fmtNum(Number(a.threshold))}`,
                            }),
                            _jsx("td", {
                              children: _jsx("span", {
                                className: `badge badge-${a.active ? "low" : "moderate"}`,
                                children: a.active ? "Active" : "Paused",
                              }),
                            }),
                            _jsxs("td", {
                              className: "row",
                              style: { gap: "0.35rem" },
                              children: [
                                _jsx("button", {
                                  type: "button",
                                  className: "btn",
                                  onClick: () =>
                                    void api(`/api/alerts/${a.id}`, {
                                      method: "PATCH",
                                      body: JSON.stringify({
                                        active: !a.active,
                                      }),
                                    }).then(refreshAlerts),
                                  children: a.active ? "Pause" : "Resume",
                                }),
                                _jsx("button", {
                                  type: "button",
                                  className: "btn",
                                  style: { color: "var(--bad)" },
                                  onClick: () => void deleteAlert(a.id),
                                  children: "Delete",
                                }),
                              ],
                            }),
                          ],
                        },
                        a.id,
                      ),
                    ),
                  }),
                ],
              }),

              // Add alert form
              _jsxs("form", {
                onSubmit: (e) => void addAlert(e),
                style: { marginTop: "0.75rem" },
                children: [
                  _jsxs("div", {
                    className: "row",
                    children: [
                      _jsxs("div", {
                        style: { flex: 1 },
                        children: [
                          _jsx("label", { children: "Symbol" }),
                          _jsxs("select", {
                            className: "input",
                            value: alertForm.sym,
                            onChange: (e) =>
                              setAlertForm({
                                ...alertForm,
                                sym: e.target.value,
                              }),
                            children: symbols.map((s) =>
                              _jsx("option", { value: s, children: s }, s),
                            ),
                          }),
                        ],
                      }),
                      _jsxs("div", {
                        style: { flex: 1 },
                        children: [
                          _jsx("label", { children: "Condition" }),
                          _jsxs("select", {
                            className: "input",
                            value: alertForm.condition,
                            onChange: (e) =>
                              setAlertForm({
                                ...alertForm,
                                condition: e.target.value,
                              }),
                            children: [
                              _jsx("option", {
                                value: "price_above",
                                children: "Price ≥",
                              }),
                              _jsx("option", {
                                value: "price_below",
                                children: "Price ≤",
                              }),
                            ],
                          }),
                        ],
                      }),
                      _jsxs("div", {
                        style: { flex: 1 },
                        children: [
                          _jsx("label", { children: "Threshold" }),
                          _jsx("input", {
                            className: "input",
                            value: alertForm.threshold,
                            onChange: (e) =>
                              setAlertForm({
                                ...alertForm,
                                threshold: e.target.value,
                              }),
                          }),
                        ],
                      }),
                    ],
                  }),
                  _jsx("button", {
                    type: "submit",
                    className: "btn btn-primary",
                    style: { marginTop: "0.5rem" },
                    children: "Add alert",
                  }),
                ],
              }),
            ],
          }),

          // Disclaimer
          _jsxs("div", {
            className: "card",
            children: [
              _jsx("h2", { children: "Disclaimer" }),
              _jsx("p", {
                className: "muted",
                style: { margin: 0, fontSize: "0.88rem", lineHeight: 1.5 },
                children:
                  "Nebula9 Financial Insights is an educational simulation. Prices may be synthetic; models are transparent baselines (linear regression volatility) plus optional LLM narrative when API keys are configured. No orders are placed; no fiduciary relationship is created.",
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
