import { useEffect, useState } from "react";

/** Лёгкий режим для слабых ПК (localStorage). Отключает анимации, размонтирует вкладки. */

export const UI_LITE_MODE_STORAGE_KEY = "eva_style_lite_mode";

export function getStoredUiLiteMode(): boolean {
  try {
    return localStorage.getItem(UI_LITE_MODE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Применить лёгкий режим к <html>. */
export function applyUiLiteMode(enabled: boolean): boolean {
  const root = document.documentElement;
  if (enabled) {
    root.setAttribute("data-eva-lite", "1");
  } else {
    root.removeAttribute("data-eva-lite");
  }
  try {
    if (enabled) {
      localStorage.setItem(UI_LITE_MODE_STORAGE_KEY, "1");
    } else {
      localStorage.removeItem(UI_LITE_MODE_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent("eva-ui-lite-mode-change", { detail: enabled }));
  return enabled;
}

export function subscribeUiLiteMode(listener: (enabled: boolean) => void): () => void {
  const handler = (event: Event) => {
    const enabled = (event as CustomEvent<boolean>).detail ?? getStoredUiLiteMode();
    listener(enabled);
  };
  window.addEventListener("eva-ui-lite-mode-change", handler);
  return () => window.removeEventListener("eva-ui-lite-mode-change", handler);
}

export function useUiLiteMode(): boolean {
  const [enabled, setEnabled] = useState(() => getStoredUiLiteMode());
  useEffect(() => subscribeUiLiteMode(setEnabled), []);
  return enabled;
}
