import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import {
  getStoredTheme,
  subscribeTheme,
  ThemeMode,
  toggleTheme,
} from "../utils/theme";

export default function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>(() => getStoredTheme());

  useEffect(() => subscribeTheme(setMode), []);

  const isDark = mode === "dark";

  return (
    <button
      type="button"
      onClick={() => setMode(toggleTheme())}
      className={`inline-flex items-center justify-center border p-1.5 rounded transition-colors shrink-0 ${
        isDark
          ? "bg-slate-800 border-slate-600 text-amber-300 hover:bg-slate-700"
          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
      title={isDark ? "Светлая тема" : "Тёмная тема"}
      aria-label={isDark ? "Включить светлую тему" : "Включить тёмную тему"}
      id="theme-toggle-btn"
    >
      {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
    </button>
  );
}
