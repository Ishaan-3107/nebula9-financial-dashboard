import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
/** API origin: Vite dev proxy uses same origin; Docker / monolith uses same port as UI. */
const oauthBase = import.meta.env.VITE_API_URL || window.location.origin;
export function LoginPage() {
    const nav = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [mode, setMode] = useState("login");
    const [err, setErr] = useState(null);
    async function submit(e) {
        e.preventDefault();
        setErr(null);
        try {
            if (mode === "register") {
                const r = await api("/api/auth/register", {
                    method: "POST",
                    body: JSON.stringify({ email, password, name: name || undefined }),
                });
                localStorage.setItem("token", r.token);
            }
            else {
                const r = await api("/api/auth/login", {
                    method: "POST",
                    body: JSON.stringify({ email, password }),
                });
                localStorage.setItem("token", r.token);
            }
            nav("/");
        }
        catch (e) {
            setErr(e instanceof Error ? e.message : "Request failed");
        }
    }
    return (_jsxs("div", { className: "grid", style: { maxWidth: 420, margin: "2rem auto" }, children: [_jsxs("div", { className: "card", children: [_jsx("h2", { children: mode === "login" ? "Sign in" : "Create account" }), _jsx("p", { className: "muted", style: { marginTop: "-0.5rem" }, children: "Educational simulation \u2014 not a brokerage. JWT sessions; OAuth optional when configured server-side." }), err && _jsx("div", { className: "flash", children: err }), _jsxs("form", { onSubmit: submit, children: [mode === "register" && (_jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "name", children: "Name" }), _jsx("input", { id: "name", className: "input", value: name, onChange: (e) => setName(e.target.value), autoComplete: "name" })] })), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "email", children: "Email" }), _jsx("input", { id: "email", className: "input", type: "email", required: true, value: email, onChange: (e) => setEmail(e.target.value), autoComplete: "email" })] }), _jsxs("div", { className: "form-group", children: [_jsx("label", { htmlFor: "password", children: "Password" }), _jsx("input", { id: "password", className: "input", type: "password", required: true, minLength: mode === "register" ? 8 : 1, value: password, onChange: (e) => setPassword(e.target.value), autoComplete: mode === "register" ? "new-password" : "current-password" })] }), _jsxs("div", { className: "row", style: { marginTop: "0.75rem" }, children: [_jsx("button", { type: "submit", className: "btn btn-primary", children: mode === "login" ? "Sign in" : "Register" }), _jsx("button", { type: "button", className: "btn", onClick: () => setMode(mode === "login" ? "register" : "login"), children: mode === "login" ? "Need an account?" : "Have an account?" })] })] }), _jsxs("div", { style: { marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid var(--border)" }, children: [_jsx("p", { className: "muted", style: { margin: "0 0 0.5rem" }, children: "OAuth (requires client IDs in server `.env`):" }), _jsxs("div", { className: "row", children: [_jsx("a", { className: "btn", href: `${oauthBase}/api/auth/google`, children: "Google" }), _jsx("a", { className: "btn", href: `${oauthBase}/api/auth/github`, children: "GitHub" })] })] }), _jsx("p", { className: "muted", style: { marginTop: "1rem", fontSize: "0.8rem" }, children: "By continuing you agree this is a demo for learning and hiring evaluation \u2014 not regulated financial advice." })] }), _jsx("p", { className: "muted", style: { textAlign: "center" }, children: _jsx(Link, { to: "/", children: "Back" }) })] }));
}
