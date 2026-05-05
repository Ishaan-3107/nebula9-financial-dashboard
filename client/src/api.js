const API_BASE = import.meta.env.VITE_API_URL ?? "";
function authHeader() {
    const t = localStorage.getItem("token");
    return t ? { Authorization: `Bearer ${t}` } : {};
}
export async function api(path, init) {
    const r = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...authHeader(),
            ...(init?.headers ?? {}),
        },
    });
    if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error ?? r.statusText);
    }
    return r.json();
}
export function wsUrl() {
    if (import.meta.env.VITE_WS_URL)
        return import.meta.env.VITE_WS_URL;
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${window.location.host}/ws`;
}
