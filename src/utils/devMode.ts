import { APP_VERSION } from "../data/appVersion";

/** Скрытый режим разработчика: флаг + постоянная история логов в localStorage. */

export const DEV_MODE_STORAGE_KEY = "eva_style_dev_mode";
export const DEV_LOGS_STORAGE_KEY = "eva_style_dev_logs";

export type DevLogLevel = "debug" | "info" | "warn" | "error";

export interface DevLogEntry {
  id: number;
  ts: number;
  level: DevLogLevel;
  message: string;
  source?: string;
  data?: unknown;
}

const MAX_LOGS = 5000;
const MAX_DATA_CHARS = 4000;
const CLICKS_TO_ENABLE = 7;
const CLICK_WINDOW_MS = 2500;

let enabled = localStorage.getItem(DEV_MODE_STORAGE_KEY) === "1";
let nextId = 1;
let logs: DevLogEntry[] = loadPersistedLogs();
let listeners = new Set<() => void>();
let consolePatched = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

const originalConsole = {
  log: console.log.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console),
};

function truncateData(data: unknown): unknown {
  if (data === undefined) return undefined;
  try {
    const raw = typeof data === "string" ? data : JSON.stringify(data);
    if (raw.length <= MAX_DATA_CHARS) return data;
    return raw.slice(0, MAX_DATA_CHARS) + `… (+${raw.length - MAX_DATA_CHARS} символов)`;
  } catch {
    return String(data).slice(0, MAX_DATA_CHARS);
  }
}

function loadPersistedLogs(): DevLogEntry[] {
  try {
    let raw = localStorage.getItem(DEV_LOGS_STORAGE_KEY);
    if (!raw) {
      // Миграция со старого sessionStorage
      raw = sessionStorage.getItem(DEV_LOGS_STORAGE_KEY);
      if (raw) {
        localStorage.setItem(DEV_LOGS_STORAGE_KEY, raw);
        sessionStorage.removeItem(DEV_LOGS_STORAGE_KEY);
      }
    }
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DevLogEntry[];
    if (!Array.isArray(parsed)) return [];
    const maxId = parsed.reduce((m, e) => Math.max(m, e.id ?? 0), 0);
    nextId = maxId + 1;
    return parsed.slice(-MAX_LOGS);
  } catch {
    return [];
  }
}

function writeLogsToStorage(entries: DevLogEntry[]): boolean {
  try {
    localStorage.setItem(DEV_LOGS_STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}

function persistLogs(immediate = false): void {
  const write = () => {
    persistTimer = null;
    let entries = logs.slice(-MAX_LOGS);
    if (writeLogsToStorage(entries)) {
      logs = entries;
      return;
    }
    // Quota: выкидываем половину старых записей и повторяем
    while (entries.length > 100) {
      entries = entries.slice(Math.floor(entries.length / 2));
      if (writeLogsToStorage(entries)) {
        logs = entries;
        return;
      }
    }
  };

  if (immediate) {
    if (persistTimer) clearTimeout(persistTimer);
    write();
    return;
  }

  if (persistTimer) return;
  persistTimer = setTimeout(write, 200);
}

function notify(): void {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore subscriber errors
    }
  });
}

function stringifyArg(arg: unknown): string {
  if (typeof arg === "string") return arg;
  if (arg instanceof Error) return arg.stack || arg.message;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

function formatConsoleArgs(args: unknown[]): string {
  return args.map(stringifyArg).join(" ");
}

function pushEntry(entry: DevLogEntry, flushNow = false): void {
  logs = [...logs.slice(-(MAX_LOGS - 1)), entry];
  persistLogs(flushNow);
  notify();
}

export function isDevModeEnabled(): boolean {
  return enabled;
}

export function setDevModeEnabled(value: boolean): void {
  enabled = value;
  if (value) {
    localStorage.setItem(DEV_MODE_STORAGE_KEY, "1");
    installConsoleCapture();
    devLog("info", "Режим разработчика включён — запись истории изменений активна", "devMode");
  } else {
    persistLogs(true);
    localStorage.removeItem(DEV_MODE_STORAGE_KEY);
    uninstallConsoleCapture();
    originalConsole.info("[Ева-стиль] Режим разработчика выключен");
  }
  notify();
}

export function subscribeDevMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDevLogs(): readonly DevLogEntry[] {
  return logs;
}

export function clearDevLogs(): void {
  logs = [];
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = null;
  localStorage.removeItem(DEV_LOGS_STORAGE_KEY);
  sessionStorage.removeItem(DEV_LOGS_STORAGE_KEY);
  notify();
}

export function exportDevLogsText(): string {
  return logs
    .map((e) => {
      const time = new Date(e.ts).toISOString();
      const src = e.source ? ` [${e.source}]` : "";
      const extra =
        e.data !== undefined
          ? `\n  ${typeof e.data === "string" ? e.data : stringifyArg(e.data)}`
          : "";
      return `${time} ${e.level.toUpperCase()}${src}: ${e.message}${extra}`;
    })
    .join("\n");
}

export function devLog(
  level: DevLogLevel,
  message: string,
  source?: string,
  data?: unknown,
  options?: { flush?: boolean }
): void {
  // История изменений store пишется всегда; остальное — только в режиме разработчика.
  const always = source === "history";
  if (!enabled && !always) return;

  const entry: DevLogEntry = {
    id: nextId++,
    ts: Date.now(),
    level,
    message,
    source,
    data: truncateData(data),
  };
  pushEntry(entry, options?.flush === true);

  if (!consolePatched && enabled) {
    const fn =
      level === "error"
        ? originalConsole.error
        : level === "warn"
          ? originalConsole.warn
          : level === "debug"
            ? originalConsole.debug
            : originalConsole.info;
    fn(`[dev:${source ?? "app"}]`, message, data !== undefined ? data : "");
  }
}

/** Явная запись в историю изменений (всегда, независимо от режима разработчика). */
export function logStoreHistory(
  message: string,
  data?: unknown,
  options?: { flush?: boolean; level?: DevLogLevel }
): void {
  devLog(options?.level ?? "info", message, "history", data, options);
}

/** Краткое описание изменения — см. devHistory.ts */
export {
  summarizeStoreChange,
  summarizeImportBackup,
  summarizeReset,
  summarizeMaterialPackaging,
} from "./devHistory";

function installConsoleCapture(): void {
  if (consolePatched) return;
  consolePatched = true;

  console.log = (...args: unknown[]) => {
    originalConsole.log(...args);
    appendFromConsole("info", args, "console");
  };
  console.info = (...args: unknown[]) => {
    originalConsole.info(...args);
    appendFromConsole("info", args, "console");
  };
  console.warn = (...args: unknown[]) => {
    originalConsole.warn(...args);
    appendFromConsole("warn", args, "console");
  };
  console.error = (...args: unknown[]) => {
    originalConsole.error(...args);
    appendFromConsole("error", args, "console");
  };
  console.debug = (...args: unknown[]) => {
    originalConsole.debug(...args);
    appendFromConsole("debug", args, "console");
  };
}

function uninstallConsoleCapture(): void {
  if (!consolePatched) return;
  console.log = originalConsole.log;
  console.info = originalConsole.info;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
  console.debug = originalConsole.debug;
  consolePatched = false;
}

function appendFromConsole(level: DevLogLevel, args: unknown[], source: string): void {
  const message = formatConsoleArgs(args);
  if (message.startsWith("[dev:")) return;

  pushEntry({
    id: nextId++,
    ts: Date.now(),
    level,
    message: message.slice(0, MAX_DATA_CHARS),
    source,
  });
}

/** Секретное включение: N быстрых кликов (например по бейджу Store). */
export function createDevModeClickGate(onTriggered: (newlyEnabled: boolean) => void): () => void {
  let clicks = 0;
  let windowStarted = 0;

  return () => {
    const now = Date.now();
    if (now - windowStarted > CLICK_WINDOW_MS) {
      clicks = 0;
      windowStarted = now;
    }
    clicks += 1;
    if (clicks >= CLICKS_TO_ENABLE) {
      clicks = 0;
      const newlyEnabled = !enabled;
      if (newlyEnabled) setDevModeEnabled(true);
      onTriggered(newlyEnabled);
    }
  };
}

export const DEV_MODE_CLICKS_REQUIRED = CLICKS_TO_ENABLE;

/** Диагностика store без паролей и полного дампа данных. */
export function buildStoreDiagnostics(state: {
  schemaVersion: number;
  employees: unknown[];
  visits: unknown[];
  solariumSessions: unknown[];
  extraTransactions: unknown[];
  masterTransactions: unknown[];
  adminShifts: unknown[];
  dailyCash: unknown[];
  giftCertificates: unknown[];
  debtRecords: unknown[];
  settingsRules: unknown[];
  preferences: object;
  meta: {
    appInitialized: boolean;
    ownerPassword: string;
    lastAutoBackupDate: string | null;
    seenAppVersion: string | null;
  };
}): Record<string, unknown> {
  let storeBytes = 0;
  let logsBytes = 0;
  try {
    storeBytes = (localStorage.getItem("eva_style_store") ?? "").length;
    logsBytes = (localStorage.getItem(DEV_LOGS_STORAGE_KEY) ?? "").length;
  } catch {
    storeBytes = -1;
  }

  return {
    appVersion: APP_VERSION,
    schemaVersion: state.schemaVersion,
    counts: {
      employees: state.employees.length,
      visits: state.visits.length,
      solariumSessions: state.solariumSessions.length,
      extraTransactions: state.extraTransactions.length,
      masterTransactions: state.masterTransactions.length,
      adminShifts: state.adminShifts.length,
      dailyCash: state.dailyCash.length,
      giftCertificates: state.giftCertificates.length,
      debtRecords: state.debtRecords.length,
      settingsRules: state.settingsRules.length,
    },
    preferences: { ...state.preferences },
    meta: {
      appInitialized: state.meta.appInitialized,
      hasOwnerPassword: Boolean(state.meta.ownerPassword),
      lastAutoBackupDate: state.meta.lastAutoBackupDate,
      seenAppVersion: state.meta.seenAppVersion,
    },
    storage: {
      primary: Boolean(
        (window as { evaStyleDesktop?: { isDesktop?: boolean } }).evaStyleDesktop?.isDesktop
      )
        ? "sqlite-file"
        : "localStorage",
      storeChars: storeBytes,
      logsChars: logsBytes,
      approxKb: storeBytes > 0 ? Math.round((storeBytes * 2) / 1024) : 0,
      logsApproxKb: logsBytes > 0 ? Math.round((logsBytes * 2) / 1024) : 0,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      isDesktop: Boolean(
        (window as { evaStyleDesktop?: { isDesktop?: boolean } }).evaStyleDesktop?.isDesktop
      ),
    },
    logsCount: logs.length,
    logsMax: MAX_LOGS,
    logsPersistedIn: "localStorage",
    devModeEnabled: enabled,
  };
}

// Если уже был включён — перехватываем console сразу
if (enabled) {
  installConsoleCapture();
  devLog("info", `Программа запущена. Восстановлено записей истории: ${logs.length}`, "devMode", {
    restoredLogs: logs.length,
  });
}

window.addEventListener("error", (event) => {
  if (!enabled) return;
  devLog(
    "error",
    event.message || "window.error",
    "window",
    {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    },
    { flush: true }
  );
});

window.addEventListener("unhandledrejection", (event) => {
  if (!enabled) return;
  const reason = event.reason;
  devLog(
    "error",
    reason instanceof Error ? reason.message : stringifyArg(reason),
    "unhandledrejection",
    reason instanceof Error ? reason.stack : reason,
    { flush: true }
  );
});

const flushOnLeave = () => persistLogs(true);
window.addEventListener("pagehide", flushOnLeave);
window.addEventListener("beforeunload", flushOnLeave);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") flushOnLeave();
});
