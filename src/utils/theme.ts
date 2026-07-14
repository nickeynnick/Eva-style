import { useEffect, useState } from "react";

/** Тема интерфейса: светлая / тёмная. Хранится отдельно от бизнес-store. */

export const THEME_STORAGE_KEY = "eva_style_theme";

export type ThemeMode = "light" | "dark";

export function getStoredTheme(): ThemeMode {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === "dark" || raw === "light") return raw;
  } catch {
    // ignore
  }
  return "light";
}

export function isDarkTheme(): boolean {
  return document.documentElement.classList.contains("dark");
}

/** Применить тему к <html> (color-scheme + класс .dark). */
export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  if (mode === "dark") {
    root.classList.add("dark");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.style.colorScheme = "light";
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent("eva-theme-change", { detail: mode }));
}

export function toggleTheme(): ThemeMode {
  const next: ThemeMode = isDarkTheme() ? "light" : "dark";
  applyTheme(next);
  return next;
}

export function subscribeTheme(listener: (mode: ThemeMode) => void): () => void {
  const handler = (event: Event) => {
    const mode = (event as CustomEvent<ThemeMode>).detail ?? getStoredTheme();
    listener(mode);
  };
  window.addEventListener("eva-theme-change", handler);
  return () => window.removeEventListener("eva-theme-change", handler);
}

/** Хук для компонентов, которым нужна перерисовка при смене темы (графики и т.п.). */
export function useThemeMode(): ThemeMode {
  const [mode, setMode] = useState<ThemeMode>(() => getStoredTheme());
  useEffect(() => subscribeTheme(setMode), []);
  return mode;
}

/** Цвета для Recharts и прочего JS, зависящего от темы. */
export function getThemeChartColors() {
  const dark = isDarkTheme();
  return {
    grid: dark ? "#334155" : "#f1f5f9",
    tick: dark ? "#94a3b8" : "#64748b",
    tooltipBg: dark ? "#0f172a" : "#ffffff",
    tooltipBorder: dark ? "#334155" : "#e2e8f0",
    tooltipText: dark ? "#f1f5f9" : "#0f172a",
    cursor: dark ? "#475569" : "#e2e8f0",
    axis: dark ? "#64748b" : "#94a3b8",
    dotFill: dark ? "#0f172a" : "#ffffff",
  };
}
