import { useEffect, useState } from "react";

/** Масштаб интерфейса (localStorage). Работает через CSS zoom на <html>. */

export const UI_ZOOM_STORAGE_KEY = "eva_style_ui_zoom";

export const UI_ZOOM_OPTIONS = [
  { value: 0.85, label: "85%" },
  { value: 1, label: "100%" },
  { value: 1.1, label: "110%" },
  { value: 1.25, label: "125%" },
  { value: 1.5, label: "150%" },
] as const;

export type UiZoomFactor = (typeof UI_ZOOM_OPTIONS)[number]["value"];

const ALLOWED = new Set<number>(UI_ZOOM_OPTIONS.map((o) => o.value));

export function getStoredUiZoom(): UiZoomFactor {
  try {
    const raw = localStorage.getItem(UI_ZOOM_STORAGE_KEY);
    const n = raw == null ? NaN : Number(raw);
    if (ALLOWED.has(n)) return n as UiZoomFactor;
  } catch {
    // ignore
  }
  return 1;
}

export function formatUiZoom(factor: number): string {
  return `${Math.round(factor * 100)}%`;
}

/** Применить масштаб к <html>. */
export function applyUiZoom(factor: number): UiZoomFactor {
  const next = (ALLOWED.has(factor) ? factor : 1) as UiZoomFactor;
  const root = document.documentElement;
  if (next === 1) {
    root.style.removeProperty("zoom");
  } else {
    root.style.zoom = String(next);
  }
  try {
    localStorage.setItem(UI_ZOOM_STORAGE_KEY, String(next));
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent("eva-ui-zoom-change", { detail: next }));
  return next;
}

export function subscribeUiZoom(listener: (factor: UiZoomFactor) => void): () => void {
  const handler = (event: Event) => {
    const factor = (event as CustomEvent<UiZoomFactor>).detail ?? getStoredUiZoom();
    listener(factor);
  };
  window.addEventListener("eva-ui-zoom-change", handler);
  return () => window.removeEventListener("eva-ui-zoom-change", handler);
}

export function useUiZoom(): UiZoomFactor {
  const [factor, setFactor] = useState<UiZoomFactor>(() => getStoredUiZoom());
  useEffect(() => subscribeUiZoom(setFactor), []);
  return factor;
}
