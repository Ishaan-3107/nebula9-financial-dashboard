import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from "react";
const STORAGE_KEY = "nebula9-theme";
const ThemeContext = createContext(null);
function readStoredTheme() {
    if (typeof localStorage === "undefined")
        return "dark";
    return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
}
export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(readStoredTheme);
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        localStorage.setItem(STORAGE_KEY, theme);
    }, [theme]);
    const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
    return _jsx(ThemeContext.Provider, { value: { theme, toggleTheme }, children: children });
}
export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx)
        throw new Error("useTheme must be used within ThemeProvider");
    return ctx;
}
function IconSun() {
    return (_jsxs("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", "aria-hidden": true, children: [_jsx("circle", { cx: "12", cy: "12", r: "4" }), _jsx("path", { d: "M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" })] }));
}
function IconMoon() {
    return (_jsx("svg", { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", "aria-hidden": true, children: _jsx("path", { d: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" }) }));
}
export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === "dark";
    return (_jsx("button", { type: "button", className: "theme-toggle", onClick: toggleTheme, "aria-label": isDark ? "Switch to light theme" : "Switch to dark theme", title: isDark ? "Light mode" : "Dark mode", children: isDark ? _jsx(IconSun, {}) : _jsx(IconMoon, {}) }));
}
