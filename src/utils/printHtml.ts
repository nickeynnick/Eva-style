import { showAppAlert } from "./appDialog";
import { restoreAppFocus } from "./restoreAppFocus";

/**
 * Печать HTML через скрытый iframe.
 * Печать вызывается из родителя (не inline <script>) — так надёжнее в десктопном WebView при CSP.
 */
export function printHtmlDocument(html: string, options?: { cleanupMs?: number }): void {
  const cleanupMs = options?.cleanupMs ?? 120_000;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Печать отчёта");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:800px;height:600px;border:0;opacity:0;pointer-events:none;z-index:-1;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    showAppAlert("Не удалось подготовить документ для печати.");
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const win = iframe.contentWindow;
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    try {
      iframe.remove();
    } catch {
      // ignore
    }
    restoreAppFocus();
  };

  const runPrint = () => {
    try {
      win?.focus();
      win?.print();
    } catch {
      showAppAlert("Не удалось открыть диалог печати. Попробуйте ещё раз.");
      cleanup();
    }
  };

  win?.addEventListener?.("afterprint", cleanup);
  window.setTimeout(runPrint, 350);
  window.setTimeout(cleanup, cleanupMs);
}
