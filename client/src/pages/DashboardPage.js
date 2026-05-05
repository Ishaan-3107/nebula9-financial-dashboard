import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar as RechartsBar, Cell, PieChart, Pie, ReferenceLine, } from "recharts";
import { api, wsUrl } from "../api";
const PIE_FILLS = ["var(--accent)", "var(--accent2)", "var(--good)", "var(--warn)", "var(--bad)"];
export function DashboardPage() {
    const [symbols, setSymbols] = useState([]);
    const [symbol, setSymbol] = useState("AAPL");
    const [bars, setBars] = useState([]);
    const [live, setLive] = useState({});
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
    const [posForm, setPosForm] = useState({ symbol: "AAPL", quantity: "10", avg_cost: "170" });
    const [alertForm, setAlertForm] = useState({ condition: "price_above", threshold: "200", sym: "AAPL" });
    const chartData = useMemo(() => bars.map((b) => ({
        t: new Date(b.bucket).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        close: Number(b.close),
    })), [bars]);
    const deltaBars = useMemo(() => {
        if (chartData.length < 2)
            return [];
        const last = chartData.slice(-16);
        const out = [];
        for (let i = 1; i < last.length; i++) {
            out.push({ label: last[i].t, delta: last[i].close - last[i - 1].close });
        }
        return out;
    }, [chartData]);
    const watchlistBars = useMemo(() => symbols
        .map((sym) => {
        const px = live[sym];
        return px != null && Number.isFinite(px) ? { sym, px } : null;
    })
        .filter((x) => x != null), [symbols, live]);
    const portfolioSlices = useMemo(() => {
        return positions
            .map((p) => {
            const q = Number(p.quantity);
            const px = live[p.symbol] ?? Number(p.avg_cost);
            const value = q * px;
            return { name: p.symbol, value: Number.isFinite(value) && value > 0 ? value : 0 };
        })
            .filter((s) => s.value > 0);
    }, [positions, live]);
    const refreshPortfolio = useCallback(async () => {
        const p = await api("/api/portfolios/");
        const id = p.portfolios[0]?.id ?? null;
        setPortfolioId(id);
        if (!id)
            return;
        const pos = await api(`/api/portfolios/${id}/positions`);
        setPositions(pos.positions);
    }, []);
    const refreshBars = useCallback(async () => {
        const r = await api(`/api/markets/bars/${symbol}?limit=200`);
        setBars(r.bars);
    }, [symbol]);
    const refreshAlerts = useCallback(async () => {
        const a = await api("/api/alerts/");
        setAlerts(a.alerts);
        const n = await api("/api/alerts/notifications/list");
        setNotifications(n.notifications);
    }, []);
    useEffect(() => {
        api("/api/markets/watchlist").then((w) => {
            setSymbols(w.symbols);
            if (!w.symbols.includes(symbol) && w.symbols[0])
                setSymbol(w.symbols[0]);
        });
    }, []);
    useEffect(() => {
        void refreshPortfolio();
    }, [refreshPortfolio]);
    useEffect(() => {
        void refreshBars();
    }, [refreshBars]);
    useEffect(() => {
        void refreshAlerts();
    }, [refreshAlerts]);
    useEffect(() => {
        const ws = new WebSocket(wsUrl());
        ws.onmessage = (ev) => {
            try {
                const msg = JSON.parse(ev.data);
                if (msg.type === "prices" && msg.payload)
                    setLive(msg.payload);
            }
            catch {
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
        }
        catch (e) {
            setInsight(e instanceof Error ? e.message : "Failed");
        }
        finally {
            setLoading(false);
        }
    }
    async function runNl() {
        setLoading(true);
        setNl(null);
        try {
            const r = await api("/api/insights/query", { method: "POST", body: JSON.stringify({ question: q, symbol }) });
            setNl(r.text);
            setRisk(r.risk);
        }
        catch (e) {
            setNl(e instanceof Error ? e.message : "Failed");
        }
        finally {
            setLoading(false);
        }
    }
    async function addPosition(e) {
        e.preventDefault();
        if (!portfolioId)
            return;
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
    const livePx = live[symbol] ?? (chartData.at(-1)?.close ?? null);
    return (_jsxs("div", { className: "grid grid-2", children: [_jsxs("div", { className: "grid", children: [_jsxs("div", { className: "card", children: [_jsxs("div", { className: "row", style: { justifyContent: "space-between", marginBottom: "0.75rem" }, children: [_jsx("h2", { style: { margin: 0 }, children: "Live market chart" }), _jsxs("span", { className: "row muted", style: { gap: "0.35rem", fontSize: "0.85rem" }, children: [_jsx("span", { className: "live-dot", title: "websocket stream" }), " stream"] })] }), _jsxs("div", { className: "row", style: { marginBottom: "0.75rem" }, children: [_jsx("label", { className: "muted", htmlFor: "sym", style: { margin: 0 }, children: "Symbol" }), _jsx("select", { id: "sym", value: symbol, onChange: (e) => setSymbol(e.target.value), children: symbols.map((s) => (_jsx("option", { value: s, children: s }, s))) }), livePx != null && (_jsxs("span", { style: { fontFamily: "var(--mono)", fontSize: "0.95rem" }, children: [symbol, " ", _jsx("strong", { children: livePx })] })), _jsx("button", { type: "button", className: "btn", onClick: () => void refreshBars(), children: "Refresh history" })] }), _jsx("div", { style: { width: "100%", height: 320 }, children: _jsx(ResponsiveContainer, { children: _jsxs(LineChart, { data: chartData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "var(--chart-grid)" }), _jsx(XAxis, { dataKey: "t", stroke: "var(--chart-axis)", tick: { fontSize: 11 } }), _jsx(YAxis, { stroke: "var(--chart-axis)", domain: ["auto", "auto"], tick: { fontSize: 11 } }), _jsx(Tooltip, { contentStyle: {
                                                    background: "var(--chart-tooltip-bg)",
                                                    border: "1px solid var(--chart-tooltip-border)",
                                                }, labelStyle: { color: "var(--chart-tooltip-label)" } }), _jsx(Line, { type: "monotone", dataKey: "close", stroke: "var(--chart-line)", dot: false, strokeWidth: 2 })] }) }) }), _jsx("p", { className: "muted", style: { margin: "0.75rem 0 0", fontSize: "0.8rem" }, children: "Bars stored in TimescaleDB hypertable; ticks broadcast over WebSocket every ~3s (simulated or Finnhub)." })] }), _jsxs("div", { className: "mini-charts", children: [_jsxs("div", { className: "card", children: [_jsxs("h3", { className: "chart-block__title", children: ["Bar-to-bar change (", symbol, ")"] }), _jsx("p", { className: "muted", style: { margin: "0 0 0.5rem", fontSize: "0.82rem" }, children: "Last buckets: gain vs prior close." }), _jsx("div", { className: "mini-chart", children: deltaBars.length > 0 ? (_jsx(ResponsiveContainer, { children: _jsxs(BarChart, { data: deltaBars, margin: { top: 8, right: 8, left: 0, bottom: 4 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "var(--chart-grid)", vertical: false }), _jsx(ReferenceLine, { y: 0, stroke: "var(--chart-axis)", strokeDasharray: "4 4" }), _jsx(XAxis, { dataKey: "label", tick: { fontSize: 9 }, interval: "preserveStartEnd", stroke: "var(--chart-axis)" }), _jsx(YAxis, { stroke: "var(--chart-axis)", tick: { fontSize: 10 }, width: 40 }), _jsx(Tooltip, { contentStyle: {
                                                            background: "var(--chart-tooltip-bg)",
                                                            border: "1px solid var(--chart-tooltip-border)",
                                                        }, labelStyle: { color: "var(--chart-tooltip-label)" }, formatter: (v) => [v.toFixed(4), "Δ close"] }), _jsx(RechartsBar, { dataKey: "delta", maxBarSize: 28, radius: [4, 4, 0, 0], children: deltaBars.map((e, i) => (_jsx(Cell, { fill: e.delta >= 0 ? "var(--good)" : "var(--bad)" }, i))) })] }) })) : (_jsx("p", { className: "muted", style: { margin: 0, padding: "2rem 0", textAlign: "center" }, children: "Load history to see changes." })) })] }), _jsxs("div", { className: "card", children: [_jsx("h3", { className: "chart-block__title", children: "Watchlist snapshot" }), _jsx("p", { className: "muted", style: { margin: "0 0 0.5rem", fontSize: "0.82rem" }, children: "Latest streamed prices across symbols." }), _jsx("div", { className: "mini-chart", children: watchlistBars.length > 0 ? (_jsx(ResponsiveContainer, { children: _jsxs(BarChart, { layout: "vertical", data: watchlistBars, margin: { top: 4, right: 16, left: 4, bottom: 4 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "var(--chart-grid)", horizontal: false }), _jsx(XAxis, { type: "number", stroke: "var(--chart-axis)", tick: { fontSize: 10 }, domain: ["auto", "auto"] }), _jsx(YAxis, { type: "category", dataKey: "sym", width: 44, stroke: "var(--chart-axis)", tick: { fontSize: 11 } }), _jsx(Tooltip, { contentStyle: {
                                                            background: "var(--chart-tooltip-bg)",
                                                            border: "1px solid var(--chart-tooltip-border)",
                                                        }, labelStyle: { color: "var(--chart-tooltip-label)" }, formatter: (v) => [v.toFixed(2), "Price"] }), _jsx(RechartsBar, { dataKey: "px", fill: "var(--chart-line)", radius: [0, 6, 6, 0], maxBarSize: 22 })] }) })) : (_jsx("p", { className: "muted", style: { margin: 0, padding: "2rem 0", textAlign: "center" }, children: "Waiting for WebSocket prices\u2026" })) })] })] }), _jsxs("div", { className: "card", children: [_jsx("h2", { children: "Grounded insight & NL query" }), _jsx("p", { className: "muted", style: { marginTop: "-0.5rem" }, children: "Offline grounded mode: analysis is generated from stored OHLCV, live tick, simulated news sentiment, and portfolio snapshot." }), _jsxs("div", { className: "row", style: { marginBottom: "0.5rem" }, children: [_jsx("button", { type: "button", className: "btn btn-primary", disabled: loading, onClick: () => void runInsight(), children: "Generate grounded insight" }), _jsx("button", { type: "button", className: "btn", disabled: loading, onClick: () => void runNl(), children: "Answer NL question" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "q", children: "Natural language question" }), _jsx("textarea", { id: "q", value: q, onChange: (e) => setQ(e.target.value) })] }), risk && (_jsxs("p", { className: "row", style: { gap: "0.5rem", alignItems: "center" }, children: [_jsx("span", { className: "muted", children: "Risk agent:" }), _jsx("span", { className: `badge badge-${risk.level === "high" ? "high" : risk.level === "moderate" ? "moderate" : "low"}`, children: risk.level }), _jsx("span", { className: "muted", style: { fontSize: "0.85rem" }, children: risk.summary })] })), insight && (_jsxs("div", { style: { marginTop: "0.75rem" }, children: [_jsx("h3", { style: { fontSize: "0.95rem", margin: "0 0 0.35rem" }, children: "Insight" }), _jsx("div", { className: "prose", children: insight })] })), nl && (_jsxs("div", { style: { marginTop: "0.75rem" }, children: [_jsx("h3", { style: { fontSize: "0.95rem", margin: "0 0 0.35rem" }, children: "Answer" }), _jsx("div", { className: "prose", children: nl })] }))] })] }), _jsxs("div", { className: "grid", children: [_jsxs("div", { className: "card", children: [_jsxs("div", { className: "row", style: { justifyContent: "space-between" }, children: [_jsx("h2", { style: { margin: 0 }, children: "Portfolio" }), _jsx("button", { type: "button", className: "btn", onClick: () => void refreshPortfolio(), children: "Refresh" })] }), !portfolioId && _jsx("p", { className: "muted", children: "No portfolio row \u2014 complete registration." }), portfolioId && (_jsxs(_Fragment, { children: [_jsxs("table", { className: "table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Symbol" }), _jsx("th", { children: "Qty" }), _jsx("th", { children: "Avg cost" })] }) }), _jsx("tbody", { children: positions.map((p) => (_jsxs("tr", { children: [_jsx("td", { children: p.symbol }), _jsx("td", { children: p.quantity }), _jsx("td", { children: p.avg_cost })] }, p.symbol))) })] }), _jsxs("form", { onSubmit: (e) => void addPosition(e), style: { marginTop: "0.75rem" }, children: [_jsxs("div", { className: "row", children: [_jsxs("div", { style: { flex: 1 }, children: [_jsx("label", { children: "Symbol" }), _jsx("input", { className: "input", value: posForm.symbol, onChange: (e) => setPosForm({ ...posForm, symbol: e.target.value }) })] }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("label", { children: "Qty" }), _jsx("input", { className: "input", value: posForm.quantity, onChange: (e) => setPosForm({ ...posForm, quantity: e.target.value }) })] }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("label", { children: "Avg cost" }), _jsx("input", { className: "input", value: posForm.avg_cost, onChange: (e) => setPosForm({ ...posForm, avg_cost: e.target.value }) })] })] }), _jsx("button", { type: "submit", className: "btn btn-primary", style: { marginTop: "0.5rem" }, children: "Upsert position" })] }), portfolioSlices.length > 0 && (_jsxs("div", { style: { marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }, children: [_jsx("h3", { className: "chart-block__title", children: "Holdings mix (est. value)" }), _jsx("p", { className: "chart-block__note", style: { marginTop: 0 }, children: "Qty \u00D7 (live price or avg cost). Updates as the stream ticks." }), _jsx("div", { className: "allocation-chart", children: _jsx(ResponsiveContainer, { children: _jsxs(PieChart, { children: [_jsx(Pie, { data: portfolioSlices, dataKey: "value", nameKey: "name", cx: "50%", cy: "50%", innerRadius: 48, outerRadius: 76, paddingAngle: 2, children: portfolioSlices.map((_, i) => (_jsx(Cell, { fill: PIE_FILLS[i % PIE_FILLS.length], stroke: "var(--card)", strokeWidth: 2 }, i))) }), _jsx(Tooltip, { contentStyle: {
                                                                    background: "var(--chart-tooltip-bg)",
                                                                    border: "1px solid var(--chart-tooltip-border)",
                                                                }, formatter: (v) => [v.toLocaleString(undefined, { maximumFractionDigits: 0 }), "Value"] })] }) }) })] }))] }))] }), _jsxs("div", { className: "card", children: [_jsxs("div", { className: "row", style: { justifyContent: "space-between" }, children: [_jsx("h2", { style: { margin: 0 }, children: "Alerts & notifications" }), _jsxs("button", { type: "button", className: "btn", onClick: () => {
                                            setShowNotes((s) => !s);
                                        }, children: [showNotes ? "Hide" : "Show", " inbox (", notifications.filter((n) => !n.read_at).length, ")"] })] }), showNotes && (_jsx("ul", { style: { listStyle: "none", padding: 0, margin: "0.5rem 0 0" }, children: notifications.map((n) => (_jsxs("li", { style: {
                                        padding: "0.45rem 0",
                                        borderBottom: "1px solid var(--border)",
                                        opacity: n.read_at ? 0.55 : 1,
                                    }, children: [_jsx("strong", { children: n.title }), _jsx("div", { className: "muted", style: { fontSize: "0.85rem" }, children: n.body }), !n.read_at && (_jsx("button", { type: "button", className: "btn", style: { marginTop: "0.35rem" }, onClick: () => void api(`/api/alerts/notifications/${n.id}/read`, { method: "POST" }).then(refreshAlerts), children: "Mark read" }))] }, n.id))) })), _jsxs("table", { className: "table", style: { marginTop: "0.75rem" }, children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Sym" }), _jsx("th", { children: "Rule" }), _jsx("th", { children: "Thr" }), _jsx("th", {})] }) }), _jsx("tbody", { children: alerts.map((a) => (_jsxs("tr", { children: [_jsx("td", { children: a.symbol ?? "*" }), _jsx("td", { children: a.condition }), _jsx("td", { children: a.threshold }), _jsx("td", { children: _jsx("button", { type: "button", className: "btn", onClick: () => void api(`/api/alerts/${a.id}`, {
                                                            method: "PATCH",
                                                            body: JSON.stringify({ active: !a.active }),
                                                        }).then(refreshAlerts), children: a.active ? "Pause" : "Resume" }) })] }, a.id))) })] }), _jsxs("form", { onSubmit: (e) => void addAlert(e), style: { marginTop: "0.75rem" }, children: [_jsxs("div", { className: "row", children: [_jsxs("div", { style: { flex: 1 }, children: [_jsx("label", { children: "Symbol" }), _jsx("input", { className: "input", value: alertForm.sym, onChange: (e) => setAlertForm({ ...alertForm, sym: e.target.value }) })] }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("label", { children: "Condition" }), _jsxs("select", { className: "input", value: alertForm.condition, onChange: (e) => setAlertForm({ ...alertForm, condition: e.target.value }), children: [_jsx("option", { value: "price_above", children: "Price \u2265" }), _jsx("option", { value: "price_below", children: "Price \u2264" })] })] }), _jsxs("div", { style: { flex: 1 }, children: [_jsx("label", { children: "Threshold" }), _jsx("input", { className: "input", value: alertForm.threshold, onChange: (e) => setAlertForm({ ...alertForm, threshold: e.target.value }) })] })] }), _jsx("button", { type: "submit", className: "btn btn-primary", style: { marginTop: "0.5rem" }, children: "Add alert" })] })] }), _jsxs("div", { className: "card", children: [_jsx("h2", { children: "Disclaimer" }), _jsx("p", { className: "muted", style: { margin: 0, fontSize: "0.88rem", lineHeight: 1.5 }, children: "Nebula9 Financial Insights is an educational simulation. Prices may be synthetic; models are transparent baselines (linear regression volatility) plus optional LLM narrative when API keys are configured. No orders are placed; no fiduciary relationship is created." })] })] })] }));
}
