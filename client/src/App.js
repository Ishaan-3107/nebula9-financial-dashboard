import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { OAuthPage } from "./pages/OAuthPage";
import { DashboardPage } from "./pages/DashboardPage";
import { Footer, Navbar } from "./components/SiteChrome";
function authed() {
    return Boolean(localStorage.getItem("token"));
}
function Protected({ children }) {
    if (!authed())
        return _jsx(Navigate, { to: "/login", replace: true });
    return _jsx(_Fragment, { children: children });
}
export default function App() {
    return (_jsxs("div", { className: "site-shell", children: [_jsx(Navbar, {}), _jsx("main", { className: "layout main-content", id: "main-content", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/oauth", element: _jsx(OAuthPage, {}) }), _jsx(Route, { path: "/", element: _jsx(Protected, { children: _jsx(DashboardPage, {}) }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) }), _jsx(Footer, {})] }));
}
