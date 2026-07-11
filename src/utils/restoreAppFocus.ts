type EvaStyleDesktop = {
  focusWindow?: () => Promise<void> | void;
};

let capturedFocusElement: HTMLElement | null = null;
let lastFieldElement: HTMLElement | null = null;

/** Запоминает последнее активное поле ввода (не кнопку) — для возврата фокуса после диалогов. */
export function installFocusTracker(): void {
  document.addEventListener("focusin", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || target.closest('[role="dialog"]')) return;

    const isField =
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLInputElement &&
        !["submit", "button", "checkbox", "radio", "file", "hidden"].includes(target.type));

    if (isField) {
      lastFieldElement = target;
    }
  });
}

/** Запомнить поле, из которого открыли диалог — вернём фокус после закрытия. */
export function captureAppFocus(): void {
  const active = document.activeElement;
  capturedFocusElement =
    active instanceof HTMLElement &&
    active !== document.body &&
    active.id !== "eva_style_root" &&
    !active.closest('[role="dialog"]')
      ? active
      : null;
}
export function restoreAppFocus(): void {
  const run = () => {
    window.focus();
    const desktop = (window as Window & { evaStyleDesktop?: EvaStyleDesktop }).evaStyleDesktop;
    void desktop?.focusWindow?.();

    const root = document.getElementById("eva_style_root");
    if (root && document.activeElement === document.body) {
      if (!root.hasAttribute("tabindex")) {
        root.setAttribute("tabindex", "-1");
      }
      root.focus({ preventScroll: true });
    }
  };

  run();
  requestAnimationFrame(run);
  for (const delay of [0, 50, 150, 300]) {
    setTimeout(run, delay);
  }
}

/** Восстановить фокус в поле, где пользователь работал до диалога. */
export function restoreCapturedFocus(): void {
  restoreAppFocus();

  const target = capturedFocusElement ?? lastFieldElement;
  capturedFocusElement = null;

  if (!target || !document.contains(target)) return;

  const refocus = () => {
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement
    ) {
      if (target.disabled) return;
    }
    if (target.getAttribute("aria-hidden") === "true") return;
    try {
      target.focus({ preventScroll: true });
    } catch {
      // ignore
    }
  };

  refocus();
  requestAnimationFrame(refocus);
  setTimeout(refocus, 0);
  setTimeout(refocus, 50);
}
