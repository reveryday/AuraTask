import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const KEY = "auratask.theme";

function readInitial(): Theme {
  const saved = localStorage.getItem(KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => readInitial());

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(KEY, theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return (
    <button
      className="theme-toggle"
      onClick={toggle}
      title={theme === "dark" ? "切换到日间模式" : "切换到夜间模式"}
    >
      <span className="theme-toggle-icon">{theme === "dark" ? "☀️" : "🌙"}</span>
      <span>{theme === "dark" ? "日间" : "夜间"}</span>
    </button>
  );
}
