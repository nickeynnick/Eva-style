import { useEffect, useState } from "react";

/** Размер шрифта (localStorage). Увеличивает текст, в т.ч. мелкий (пояснения), без масштаба всей вёрстки. */

export const UI_FONT_SCALE_STORAGE_KEY = "eva_style_ui_font_scale";

export const UI_FONT_SCALE_OPTIONS = [
  { value: 1, label: "100%" },
  { value: 1.1, label: "110%" },
  { value: 1.25, label: "125%" },
  { value: 1.5, label: "150%" },
] as const;

export type UiFontScaleFactor = (typeof UI_FONT_SCALE_OPTIONS)[number]["value"];

const ALLOWED = new Set<number>(UI_FONT_SCALE_OPTIONS.map((o) => o.value));

export function getStoredUiFontScale(): UiFontScaleFactor {
  try {
    const raw = localStorage.getItem(UI_FONT_SCALE_STORAGE_KEY);
    const n = raw == null ? NaN : Number(raw);
    if (ALLOWED.has(n)) return n as UiFontScaleFactor;
  } catch {
    // ignore
  }
  return 1;
}

export function formatUiFontScale(factor: number): string {
  return `${Math.round(factor * 100)}%`;
}

/** Применить масштаб шрифта к <html> (CSS-переменная + data-атрибут). */
export function applyUiFontScale(factor: number): UiFontScaleFactor {
  const next = (ALLOWED.has(factor) ? factor : 1) as UiFontScaleFactor;
  const root = document.documentElement;
  root.style.setProperty("--eva-font-scale", String(next));
  if (next === 1) {
    root.removeAttribute("data-eva-font-scale");
  } else {
    root.setAttribute("data-eva-font-scale", String(next));
  }
  try {
    localStorage.setItem(UI_FONT_SCALE_STORAGE_KEY, String(next));
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent("eva-ui-font-scale-change", { detail: next }));
  return next;
}

export function subscribeUiFontScale(listener: (factor: UiFontScaleFactor) => void): () => void {
  const handler = (event: Event) => {
    const factor = (event as CustomEvent<UiFontScaleFactor>).detail ?? getStoredUiFontScale();
    listener(factor);
  };
  window.addEventListener("eva-ui-font-scale-change", handler);
  return () => window.removeEventListener("eva-ui-font-scale-change", handler);
}

export function useUiFontScale(): UiFontScaleFactor {
  const [factor, setFactor] = useState<UiFontScaleFactor>(() => getStoredUiFontScale());
  useEffect(() => subscribeUiFontScale(setFactor), []);
  return factor;
}
