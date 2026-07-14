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
      className={`flex items-center gap-1.5 border text-[10px] py-1 px-2.5 rounded font-mono font-bold uppercase tracking-wider transition-colors ${
        isDark
          ? "bg-slate-800 border-slate-600 text-amber-300 hover:bg-slate-700"
          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      }`}
      title={isDark ? "Светлая тема" : "Тёмная тема"}
      aria-label={isDark ? "Включить светлую тему" : "Включить тёмную тему"}
      id="theme-toggle-btn"
    >
      {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{isDark ? "Светлая" : "Тёмная"}</span>
    </button>
  );
}
