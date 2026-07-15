import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bug,
  Copy,
  Download,
  Trash2,
  X,
  Power,
  RefreshCw,
  Wrench,
  Save,
  Database,
  Eye,
  Eraser,
  FolderOpen,
} from "lucide-react";
import ModalOverlay from "./ModalOverlay";
import {
  clearDevLogs,
  DevLogEntry,
  DevLogLevel,
  exportDevLogsText,
  getDevLogs,
  isDevModeEnabled,
  setDevModeEnabled,
  subscribeDevMode,
  buildStoreDiagnostics,
  devLog,
} from "../utils/devMode";
import { showAppAlert, showAppConfirmAsync } from "../utils/appDialog";
import { useAppStore, useStoreMeta, useStorePreferences } from "../store";
import { runAutoBackupNow, formatAutoBackupInterval } from "../utils/autoBackupRunner";
import { shouldRunAutoBackup, AUTO_BACKUP_KEEP_LAST } from "../utils/backupData";
import { applyTheme, getStoredTheme, ThemeMode } from "../utils/theme";
import { openCrashLogsFolder, getCrashLogsPath, writeCrashLog } from "../utils/crashLog";
import { getDurableStoreInfo, openDurableStoreFolder, isDesktopDurableStore } from "../store/persistence";
import { APP_VERSION } from "../data/appVersion";
import { STORE_STORAGE_KEY } from "../store/schema";
import { previewUpdateModal } from "./UpdateModal";

type PanelTab = "history" | "logs" | "diagnostics" | "debug";
type SourceFilter = "all" | "history" | "console" | "other";

const LEVEL_STYLES: Record<DevLogLevel, string> = {
  debug: "text-slate-500",
  info: "text-slate-200",
  warn: "text-amber-300",
  error: "text-rose-300",
};

const LEVEL_BADGE: Record<DevLogLevel, string> = {
  debug: "bg-slate-100 text-slate-500",
  info: "bg-sky-50 text-sky-700",
  warn: "bg-amber-50 text-amber-800",
  error: "bg-rose-50 text-rose-700",
};

interface DevModePanelProps {
  open: boolean;
  onClose: () => void;
}

function formatEntryTime(ts: number): string {
  return new Date(ts).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function matchesSource(entry: DevLogEntry, filter: SourceFilter): boolean {
  if (filter === "all") return true;
  if (filter === "history") return entry.source === "history";
  if (filter === "console") return entry.source === "console";
  return entry.source !== "history" && entry.source !== "console";
}

function DebugActionButton({
  icon: Icon,
  label,
  hint,
  onClick,
  tone = "slate",
  busy,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint?: string;
  onClick: () => void;
  tone?: "slate" | "emerald" | "rose" | "amber";
  busy?: boolean;
}) {
  const tones = {
    slate: "border-slate-200 hover:bg-slate-50 text-slate-800",
    emerald: "border-emerald-200 hover:bg-emerald-50 text-emerald-800",
    rose: "border-rose-200 hover:bg-rose-50 text-rose-800",
    amber: "border-amber-200 hover:bg-amber-50 text-amber-900",
  };
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-colors disabled:opacity-50 ${tones[tone]}`}
    >
      <div className="flex items-center gap-2 text-xs font-bold">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        {label}
      </div>
      {hint && <p className="text-[10px] text-slate-500 mt-1 leading-snug">{hint}</p>}
    </button>
  );
}

export default function DevModePanel({ open, onClose }: DevModePanelProps) {
  const { state, buildBackupPayload } = useAppStore();
  const { meta, setMeta } = useStoreMeta();
  const { preferences, setPreference } = useStorePreferences();
  const [tab, setTab] = useState<PanelTab>("history");
  const [logs, setLogs] = useState<readonly DevLogEntry[]>(() => getDevLogs());
  const [levelFilter, setLevelFilter] = useState<DevLogLevel | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const [busyAction, setBusyAction] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return subscribeDevMode(() => {
      setLogs(getDevLogs());
      if (!isDevModeEnabled()) onClose();
    });
  }, [onClose]);

  useEffect(() => {
    if (!open || !autoScroll || (tab !== "logs" && tab !== "history")) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs, open, autoScroll, tab]);

  const historyEntries = useMemo(
    () => logs.filter((e) => e.source === "history"),
    [logs]
  );

  const filteredLogs = useMemo(() => {
    return logs.filter((e) => {
      if (levelFilter !== "all" && e.level !== levelFilter) return false;
      return matchesSource(e, sourceFilter);
    });
  }, [logs, levelFilter, sourceFilter]);

  const listEntries = tab === "history" ? historyEntries : filteredLogs;
  const diagnostics = useMemo(() => buildStoreDiagnostics(state), [state]);
  const [durableInfo, setDurableInfo] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (tab !== "debug" && tab !== "diagnostics") return;
    void getDurableStoreInfo().then((info) => setDurableInfo(info));
  }, [tab]);

  const desktopInfo = useMemo(() => {
    const d = (window as { evaStyleDesktop?: { isDesktop?: boolean } }).evaStyleDesktop;
    return {
      isDesktop: Boolean(d?.isDesktop),
      keys: d ? Object.keys(d) : [],
      durableStore: isDesktopDurableStore(),
    };
  }, []);

  const copyText = async (text: string, okMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showAppAlert(okMessage);
    } catch {
      showAppAlert("Не удалось скопировать в буфер обмена");
    }
  };

  const downloadLogs = () => {
    const text = exportDevLogsText();
    const a = document.createElement("a");
    a.href = `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
    a.download = `eva_style_dev_logs_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.txt`;
    a.click();
  };

  const handleDisable = () => {
    setDevModeEnabled(false);
    onClose();
  };

  const handleClear = async () => {
    const ok = await showAppConfirmAsync(
      "Удалить всю сохранённую историю логов? Это действие нельзя отменить."
    );
    if (!ok) return;
    clearDevLogs();
    setLogs([]);
  };

  const forceAutoBackup = async () => {
    setBusyAction(true);
    try {
      const result = await runAutoBackupNow(buildBackupPayload);
      if (result.success) {
        setMeta({ lastAutoBackupDate: new Date().toISOString() });
        devLog("info", "Принудительное автосохранение выполнено", "debug", {
          path: result.path,
          pruned: result.pruned,
        });
        showAppAlert(
          `Автокопия сохранена принудительно.${result.path ? `\n\n${result.path}` : ""}${
            result.pruned ? `\nУдалено старых: ${result.pruned}` : ""
          }`
        );
      } else {
        showAppAlert(result.reason || "Не удалось сохранить автокопию");
      }
    } finally {
      setBusyAction(false);
    }
  };

  const clearLastBackupMark = () => {
    setMeta({ lastAutoBackupDate: null });
    devLog("warn", "Сброшена отметка последнего автобэкапа", "debug");
    showAppAlert("Отметка последней автокопии сброшена. При включённом автосохранении копия создастся при следующей проверке.");
  };

  const resetWhatsNew = () => {
    setMeta({ seenAppVersion: null });
    showAppAlert(`Флаг «Что нового» сброшен. После перезагрузки/обновления страницы снова покажется окно для v${APP_VERSION}.`);
  };

  const toggleThemeDebug = () => {
    const next: ThemeMode = getStoredTheme() === "dark" ? "light" : "dark";
    applyTheme(next);
    showAppAlert(`Тема переключена: ${next === "dark" ? "тёмная" : "светлая"}`);
  };

  const dumpStoreJson = async () => {
    const raw = localStorage.getItem(STORE_STORAGE_KEY) ?? "";
    const payload = raw.length > 0 ? raw : "{}";
    await copyText(payload, raw.length > 0 ? `Store скопирован (${raw.length} символов)` : "Store пуст");
  };

  const clearDashboardLayout = async () => {
    const ok = await showAppConfirmAsync("Сбросить персонализацию финансового дашборда?");
    if (!ok) return;
    localStorage.removeItem("eva_style_dashboard_blocks_v2");
    showAppAlert("Макет дашборда сброшен. Обновите страницу, чтобы увидеть блоки по умолчанию.");
  };

  const dueHint = shouldRunAutoBackup(
    preferences.autoBackupInterval,
    meta.lastAutoBackupDate,
    new Date(),
    preferences.autoBackupPreferredTime
  );

  return (
    <ModalOverlay open={open} onClose={onClose} zIndex={70} aria-label="Режим разработчика">
      <div className="w-full max-w-3xl bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="bg-slate-900 px-4 py-3 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Bug className="h-4 w-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-sm font-bold tracking-tight">Режим разработчика</h2>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider truncate">
                История · логи · отладка · Ctrl+Shift+D
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
          {(
            [
              { id: "history" as const, label: `История (${historyEntries.length})` },
              { id: "logs" as const, label: `Логи (${logs.length})` },
              { id: "debug" as const, label: "Отладка" },
              { id: "diagnostics" as const, label: "Диагностика" },
            ]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${
                tab === t.id
                  ? "text-slate-900 border-b-2 border-emerald-500 bg-white"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {(tab === "history" || tab === "logs") && (
          <>
            <div className="px-3 py-2 border-b border-slate-100 flex flex-wrap items-center gap-2 bg-white">
              {tab === "logs" && (
                <>
                  <select
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value as DevLogLevel | "all")}
                    className="text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                  >
                    <option value="all">Все уровни</option>
                    <option value="debug">debug</option>
                    <option value="info">info</option>
                    <option value="warn">warn</option>
                    <option value="error">error</option>
                  </select>
                  <select
                    value={sourceFilter}
                    onChange={(e) => setSourceFilter(e.target.value as SourceFilter)}
                    className="text-xs border border-slate-200 rounded px-2 py-1 bg-white"
                  >
                    <option value="all">Все источники</option>
                    <option value="history">Только изменения</option>
                    <option value="console">console</option>
                    <option value="other">Прочее</option>
                  </select>
                </>
              )}
              <label className="flex items-center gap-1.5 text-[11px] text-slate-600 font-mono">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Автопрокрутка
              </label>
              <div className="flex-1" />
              <button type="button" onClick={() => setLogs(getDevLogs())} className="p-1 text-slate-500 hover:bg-slate-50 rounded">
                <RefreshCw className="h-3 w-3" />
              </button>
              <button type="button" onClick={() => copyText(exportDevLogsText(), "История скопирована")} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase text-slate-500 hover:bg-slate-50 rounded">
                <Copy className="h-3 w-3" /> Копировать
              </button>
              <button type="button" onClick={downloadLogs} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase text-slate-500 hover:bg-slate-50 rounded">
                <Download className="h-3 w-3" /> Файл
              </button>
              <button type="button" onClick={() => void handleClear()} className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase text-rose-600 hover:bg-rose-50 rounded">
                <Trash2 className="h-3 w-3" /> Очистить
              </button>
            </div>

            <div ref={listRef} className="flex-1 overflow-y-auto min-h-[280px] max-h-[50vh] bg-slate-950 font-mono text-[11px]">
              {listEntries.length === 0 ? (
                <div className="p-6 text-slate-500 text-center">
                  {tab === "history" ? "Истории изменений пока нет" : "Логов пока нет"}
                </div>
              ) : (
                <ul className="divide-y divide-slate-900/80">
                  {listEntries.map((entry) => (
                    <li key={entry.id} className="px-3 py-2 hover:bg-slate-900/80">
                      {tab === "history" ? (
                        <div className="space-y-0.5">
                          <div className="text-slate-500 text-[10px]">{formatEntryTime(entry.ts)}</div>
                          <div className={`text-[12px] leading-snug ${LEVEL_STYLES[entry.level]}`}>{entry.message}</div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-slate-500 shrink-0">{formatEntryTime(entry.ts)}</span>
                            <span className={`shrink-0 px-1 rounded text-[9px] font-bold uppercase ${LEVEL_BADGE[entry.level]}`}>
                              {entry.level}
                            </span>
                            {entry.source && <span className="text-emerald-500/80 shrink-0">{entry.source}</span>}
                            <span className={`break-all ${LEVEL_STYLES[entry.level]}`}>{entry.message}</span>
                          </div>
                          {entry.data !== undefined && (
                            <pre className="mt-1 text-slate-500 whitespace-pre-wrap break-all max-h-32 overflow-y-auto">
                              {typeof entry.data === "string" ? entry.data : JSON.stringify(entry.data, null, 2)}
                            </pre>
                          )}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}

        {tab === "debug" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[280px]">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] space-y-1 font-mono text-slate-600">
              <div>Версия UI: {APP_VERSION}</div>
              <div>Desktop API: {desktopInfo.isDesktop ? "да" : "нет (браузер)"} {desktopInfo.keys.length ? `(${desktopInfo.keys.join(", ")})` : ""}</div>
              <div>
                Автобэкап: {preferences.autoBackupEnabled ? "вкл" : "выкл"} ·{" "}
                {formatAutoBackupInterval(preferences.autoBackupInterval)}
                {preferences.autoBackupInterval === "daily" ||
                preferences.autoBackupInterval === "weekly" ||
                preferences.autoBackupInterval === "monthly"
                  ? ` · с ${preferences.autoBackupPreferredTime || "18:00"}`
                  : ""}{" "}
                · храним {AUTO_BACKUP_KEEP_LAST}
              </div>
              <div>
                Последняя автокопия:{" "}
                {meta.lastAutoBackupDate
                  ? new Date(
                      meta.lastAutoBackupDate.includes("T")
                        ? meta.lastAutoBackupDate
                        : meta.lastAutoBackupDate + "T12:00:00"
                    ).toLocaleString("ru-RU")
                  : "нет"}
              </div>
              <div className={dueHint ? "text-emerald-700 font-bold" : ""}>
                Сейчас положено создавать копию: {dueHint ? "да" : "нет"}
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5" /> Хранилище данных (SQLite)
              </h3>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-[10px] text-slate-600 font-mono space-y-1 mb-2">
                <div>Режим: {desktopInfo.durableStore ? "SQLite + зеркало localStorage" : "только localStorage"}</div>
                {durableInfo ? (
                  <>
                    <div className="break-all">Файл: {String(durableInfo.path || "—")}</div>
                    <div>
                      Размер:{" "}
                      {typeof durableInfo.fileBytes === "number" && durableInfo.fileBytes >= 0
                        ? `${Math.round(Number(durableInfo.fileBytes) / 1024)} КБ`
                        : "—"}
                      {" · "}
                      обновлён: {String(durableInfo.updatedAt || "—")}
                    </div>
                  </>
                ) : (
                  <div>Сведения о файле недоступны (нужно Windows-приложение)</div>
                )}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <DebugActionButton
                  icon={FolderOpen}
                  label="Открыть папку Data"
                  hint="Документы → Ева-стиль → Data (eva_style_store.sqlite)"
                  tone="emerald"
                  onClick={() => {
                    void (async () => {
                      const result = await openDurableStoreFolder();
                      if (!result.success) {
                        showAppAlert(result.error || "Не удалось открыть папку данных");
                        return;
                      }
                      if (result.path) showAppAlert(`Открыта папка:\n${result.path}`);
                    })();
                  }}
                />
                <DebugActionButton
                  icon={Copy}
                  label="Скопировать путь SQLite"
                  hint="Путь к eva_style_store.sqlite"
                  onClick={() => {
                    void (async () => {
                      const info = durableInfo || (await getDurableStoreInfo());
                      const p = info && typeof info.path === "string" ? info.path : "";
                      if (!p) {
                        showAppAlert("Путь недоступен");
                        return;
                      }
                      await copyText(p, `Путь скопирован:\n${p}`);
                    })();
                  }}
                />
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Bug className="h-3.5 w-3.5" /> CrashLogs
              </h3>
              <p className="text-[10px] text-slate-500 mb-2 font-sans">
                Сюда же пишутся ошибки автообновления (`updater-check-error`, `updater-download-error`).
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <DebugActionButton
                  icon={FolderOpen}
                  label="Открыть CrashLogs"
                  hint="Папка рядом с программой (или Документы → Ева-стиль → CrashLogs)"
                  tone="emerald"
                  onClick={() => {
                    void (async () => {
                      const result = await openCrashLogsFolder();
                      if (!result.success) {
                        showAppAlert(result.error || "Не удалось открыть папку CrashLogs");
                        return;
                      }
                      if (result.path) {
                        showAppAlert(`Открыта папка:\n${result.path}`);
                      }
                    })();
                  }}
                />
                <DebugActionButton
                  icon={Bug}
                  label="Записать тестовый crash-лог"
                  hint="Проверка записи файла в CrashLogs"
                  onClick={() => {
                    void (async () => {
                      const result = await writeCrashLog({
                        kind: "debug-test",
                        message: "Тестовая запись из режима разработчика",
                        extra: { at: new Date().toISOString(), version: APP_VERSION },
                      });
                      if (result.success) {
                        showAppAlert(`Crash-лог записан:\n${result.path || result.dir}`);
                      } else {
                        showAppAlert(result.error || "Не удалось записать crash-лог");
                      }
                    })();
                  }}
                />
                <DebugActionButton
                  icon={Bug}
                  label="Записать тестовый updater-лог"
                  hint="Имитация ошибки проверки обновлений в CrashLogs"
                  onClick={() => {
                    void (async () => {
                      const result = await writeCrashLog({
                        kind: "updater-check-error",
                        message: "Тестовая ошибка автообновления из режима разработчика",
                        extra: {
                          phase: "check",
                          manual: true,
                          source: "dev-panel",
                          at: new Date().toISOString(),
                          version: APP_VERSION,
                        },
                      });
                      if (result.success) {
                        showAppAlert(`Updater-лог записан:\n${result.path || result.dir}`);
                      } else {
                        showAppAlert(result.error || "Не удалось записать updater-лог");
                      }
                    })();
                  }}
                />
                <DebugActionButton
                  icon={Copy}
                  label="Показать путь CrashLogs"
                  hint="Скопировать путь папки"
                  onClick={() => {
                    void (async () => {
                      const result = await getCrashLogsPath();
                      if (!result.success || !result.path) {
                        showAppAlert(result.error || "Путь недоступен");
                        return;
                      }
                      await copyText(result.path, `Путь скопирован:\n${result.path}`);
                    })();
                  }}
                />
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Save className="h-3.5 w-3.5" /> Резервные копии
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <DebugActionButton
                  icon={Save}
                  label="Принудительное автосохранение"
                  hint="Сразу пишет файл в Документы → Ева-стиль → Backups (только Windows-приложение)"
                  tone="emerald"
                  busy={busyAction}
                  onClick={() => void forceAutoBackup()}
                />
                <DebugActionButton
                  icon={Eraser}
                  label="Сбросить отметку автокопии"
                  hint="lastAutoBackupDate → null, следующая проверка сможет снова сохранить"
                  tone="amber"
                  onClick={clearLastBackupMark}
                />
                <DebugActionButton
                  icon={RefreshCw}
                  label={preferences.autoBackupEnabled ? "Выключить автосохранение" : "Включить автосохранение"}
                  hint="То же, что в Безопасность → автосохранение"
                  onClick={() => setPreference("autoBackupEnabled", !preferences.autoBackupEnabled)}
                />
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5" /> Состояние UI
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <DebugActionButton
                  icon={Eye}
                  label="Показать «Что нового» снова"
                  hint={`Сбросит seenAppVersion (текущая ${APP_VERSION})`}
                  onClick={resetWhatsNew}
                />
                <DebugActionButton
                  icon={Download}
                  label="Окно обновления"
                  hint="Предпросмотр UI: доступно → скачать → прогресс → готово"
                  tone="emerald"
                  onClick={() => {
                    onClose();
                    previewUpdateModal("available");
                  }}
                />
                <DebugActionButton
                  icon={RefreshCw}
                  label="Окно: прогресс загрузки"
                  hint="Предпросмотр состояния скачивания обновления"
                  onClick={() => {
                    onClose();
                    previewUpdateModal("downloading");
                  }}
                />
                <DebugActionButton
                  icon={RefreshCw}
                  label="Переключить тему"
                  hint={`Сейчас: ${getStoredTheme() === "dark" ? "тёмная" : "светлая"}`}
                  onClick={toggleThemeDebug}
                />
                <DebugActionButton
                  icon={Eraser}
                  label="Сбросить макет дашборда"
                  hint="Удалит eva_style_dashboard_blocks_v2 — нужен refresh"
                  tone="rose"
                  onClick={() => void clearDashboardLayout()}
                />
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5" /> Данные
              </h3>
              <div className="grid gap-2 sm:grid-cols-2">
                <DebugActionButton
                  icon={Copy}
                  label="Копировать сырой store JSON"
                  hint={`Ключ ${STORE_STORAGE_KEY}`}
                  onClick={() => void dumpStoreJson()}
                />
                <DebugActionButton
                  icon={Bug}
                  label="Записать тестовый лог"
                  hint="Проверка буфера истории"
                  onClick={() => {
                    devLog("debug", "Тестовая запись из вкладки Отладка", "debug", { at: Date.now() });
                    showAppAlert("Тестовая запись добавлена в логи");
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {tab === "diagnostics" && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[280px]">
            <pre className="text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-x-auto text-slate-700 max-h-[45vh]">
              {JSON.stringify({ ...diagnostics, durableStore: durableInfo }, null, 2)}
            </pre>
            <button
              type="button"
              onClick={() =>
                copyText(
                  JSON.stringify({ ...diagnostics, durableStore: durableInfo }, null, 2),
                  "Диагностика скопирована"
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider bg-slate-900 text-white rounded-lg hover:bg-slate-800"
            >
              <Copy className="h-3.5 w-3.5" />
              Копировать диагностику
            </button>
          </div>
        )}

        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
          <p className="text-[10px] text-slate-400 font-mono">
            Сохранено в localStorage · история изменений пишется всегда · до{" "}
            {diagnostics.logsMax as number} записей
          </p>
          <button
            type="button"
            onClick={handleDisable}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-rose-700 border border-rose-200 rounded-lg hover:bg-rose-50"
          >
            <Power className="h-3 w-3" />
            Выключить режим
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
