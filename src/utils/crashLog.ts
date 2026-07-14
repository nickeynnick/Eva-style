/** Запись crash-логов в Electron (папка CrashLogs рядом с программой). */

type CrashLogPayload = {
  kind?: string;
  message?: string;
  stack?: string;
  extra?: unknown;
};

type CrashLogResult = {
  success: boolean;
  path?: string;
  dir?: string;
  error?: string;
};

type EvaDesktopCrashApi = {
  isDesktop?: boolean;
  writeCrashLog?: (payload: CrashLogPayload) => Promise<CrashLogResult>;
  openCrashLogs?: () => Promise<CrashLogResult>;
  getCrashLogsPath?: () => Promise<CrashLogResult>;
};

function getDesktop(): EvaDesktopCrashApi | undefined {
  return (window as { evaStyleDesktop?: EvaDesktopCrashApi }).evaStyleDesktop;
}

export async function writeCrashLog(payload: CrashLogPayload): Promise<CrashLogResult> {
  const desktop = getDesktop();
  if (!desktop?.isDesktop || !desktop.writeCrashLog) {
    return { success: false, error: "CrashLogs доступны только в Windows-приложении" };
  }
  try {
    return await desktop.writeCrashLog(payload);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function openCrashLogsFolder(): Promise<CrashLogResult> {
  const desktop = getDesktop();
  if (!desktop?.isDesktop || !desktop.openCrashLogs) {
    return { success: false, error: "Открытие папки доступно только в Windows-приложении" };
  }
  try {
    return await desktop.openCrashLogs();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getCrashLogsPath(): Promise<CrashLogResult> {
  const desktop = getDesktop();
  if (!desktop?.isDesktop || !desktop.getCrashLogsPath) {
    return { success: false, error: "Путь CrashLogs доступен только в Windows-приложении" };
  }
  try {
    return await desktop.getCrashLogsPath();
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/** Подписка на ошибки окна — всегда пишет файл в Electron (даже без режима разработчика). */
export function installCrashLogCapture(): void {
  window.addEventListener("error", (event) => {
    void writeCrashLog({
      kind: "renderer-error",
      message: event.message || "window.error",
      stack: event.error instanceof Error ? event.error.stack : undefined,
      extra: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    void writeCrashLog({
      kind: "renderer-unhandledrejection",
      message: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
      extra: reason,
    });
  });
}
