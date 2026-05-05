import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
export function OAuthPage() {
    const [params] = useSearchParams();
    const nav = useNavigate();
    useEffect(() => {
        const token = params.get("token");
        const error = params.get("error");
        if (error) {
            nav(`/login?error=${encodeURIComponent(error)}`);
            return;
        }
        if (token) {
            localStorage.setItem("token", token);
            nav("/");
        }
        else {
            nav("/login");
        }
    }, [params, nav]);
    return (_jsx("div", { className: "card", style: { maxWidth: 420, margin: "3rem auto", textAlign: "center" }, children: _jsx("p", { className: "muted", children: "Completing sign-in\u2026" }) }));
}
