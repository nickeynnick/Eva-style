import React, { useEffect, useState } from "react";
import { Download, X, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import ModalOverlay from "./ModalOverlay";
import { APP_VERSION } from "../data/appVersion";

type UpdaterEvent =
  | { type: "checking"; currentVersion: string }
  | {
      type: "available";
      version: string;
      currentVersion: string;
      releaseNotes: string;
      manual?: boolean;
    }
  | { type: "not-available"; currentVersion: string }
  | { type: "download-started" }
  | {
      type: "progress";
      percent: number;
      transferred: number;
      total: number;
      bytesPerSecond: number;
    }
  | { type: "downloaded"; version: string; releaseNotes: string }
  | { type: "error"; phase: "check" | "download"; message: string }
  | {
      type: "github-status";
      reachable: boolean;
      indicator: string;
      description: string;
      descriptionRu: string;
    };

export type GitHubStatusInfo = {
  reachable: boolean;
  indicator: string;
  description: string;
  descriptionRu: string;
};

export type UpdateModalPhase =
  | { kind: "checking"; currentVersion: string }
  | {
      kind: "available";
      version: string;
      currentVersion: string;
      releaseNotes: string;
    }
  | { kind: "not-available"; currentVersion: string }
  | {
      kind: "downloading";
      version: string;
      releaseNotes: string;
      percent: number;
      transferred: number;
      total: number;
      bytesPerSecond: number;
    }
  | { kind: "downloaded"; version: string; releaseNotes: string }
  | { kind: "error"; phase: "check" | "download"; message: string };

type ModalPhase = UpdateModalPhase;

type DesktopUpdaterApi = {
  isDesktop?: boolean;
  onUpdaterEvent?: (callback: (payload: UpdaterEvent) => void) => () => void;
  downloadUpdate?: () => Promise<{ ok?: boolean }>;
  installUpdate?: () => Promise<{ ok?: boolean }>;
};

type PreviewListener = (phase: ModalPhase | null, preview: boolean) => void;

let previewListener: PreviewListener | null = null;

export function registerUpdateModalPreview(listener: PreviewListener | null): void {
  previewListener = listener;
}

const DEMO_RELEASE_NOTES = [
  "• Стилизованное окно обновления вместо системного диалога Windows",
  "• Прогресс загрузки прямо в окне приложения",
  "• Прокрутка длинного списка изменений",
  "• Исправление путей к логотипу и звуку запуска в Electron (file://)",
  "• Мелкие правки учёта и интерфейса",
  "",
  "Дополнительно (для проверки прокрутки):",
  "Длинный текст, чтобы убедиться, что changelog не обрезается",
  "и спокойно прокручивается внутри модального окна.",
  "Ещё одна строка. И ещё. И ещё одна для высоты блока.",
  "Финальная строка предпросмотра.",
].join("\n");

function bumpPatch(version: string): string {
  const parts = version.split(".").map((p) => Number(p));
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n))) {
    return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
  }
  return `${version}-next`;
}

export type UpdatePreviewKind =
  | "available"
  | "downloading"
  | "downloaded"
  | "checking"
  | "not-available"
  | "error";

/** Предпросмотр UI обновления из режима разработчика (без реального апдейтера). */
export function previewUpdateModal(kind: UpdatePreviewKind = "available"): void {
  if (!previewListener) return;
  const currentVersion = APP_VERSION;
  const nextVersion = bumpPatch(currentVersion);
  const releaseNotes = DEMO_RELEASE_NOTES;

  const phases: Record<UpdatePreviewKind, ModalPhase> = {
    checking: { kind: "checking", currentVersion },
    available: {
      kind: "available",
      version: nextVersion,
      currentVersion,
      releaseNotes,
    },
    "not-available": { kind: "not-available", currentVersion },
    downloading: {
      kind: "downloading",
      version: nextVersion,
      releaseNotes,
      percent: 42,
      transferred: 42 * 1024 * 1024,
      total: 100 * 1024 * 1024,
      bytesPerSecond: 3.2 * 1024 * 1024,
    },
    downloaded: { kind: "downloaded", version: nextVersion, releaseNotes },
    error: {
      kind: "error",
      phase: "check",
      message: "Это тестовая ошибка предпросмотра.\nПроверка UI окна обновления.",
    },
  };

  previewListener(phases[kind], true);
}

function getDesktopApi(): DesktopUpdaterApi | undefined {
  return (window as Window & { evaStyleDesktop?: DesktopUpdaterApi }).evaStyleDesktop;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 Б";
  const units = ["Б", "КБ", "МБ", "ГБ"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value < 10 && unit > 0 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`;
}

function ReleaseNotes({ notes }: { notes: string }) {
  if (!notes.trim()) return null;
  return (
    <div className="mt-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
        Список изменений
      </h3>
      <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-words">
        {notes.trim()}
      </div>
    </div>
  );
}

function GitHubStatusBadge({ status }: { status: GitHubStatusInfo | null }) {
  if (!status) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
        <span>Проверяем статус GitHub…</span>
      </div>
    );
  }

  const tone =
    !status.reachable || status.indicator === "unknown"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : status.indicator === "none"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : status.indicator === "minor"
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-rose-200 bg-rose-50 text-rose-900";

  const Icon =
    !status.reachable || status.indicator === "unknown"
      ? AlertCircle
      : status.indicator === "none"
        ? CheckCircle2
        : AlertCircle;

  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-snug ${tone}`}>
      <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="font-semibold">{status.descriptionRu}</p>
        {!status.reachable && (
          <p className="mt-0.5 opacity-80">
            Если обновление не находится — подождите, пока GitHub восстановится, и проверьте снова.
          </p>
        )}
        {status.reachable && status.indicator !== "none" && status.indicator !== "unknown" && (
          <p className="mt-0.5 opacity-80">
            Автообновление может временно не работать. Подробнее: githubstatus.com
          </p>
        )}
      </div>
    </div>
  );
}

export default function UpdateModal() {
  const [phase, setPhase] = useState<ModalPhase | null>(null);
  const [busy, setBusy] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [githubStatus, setGithubStatus] = useState<GitHubStatusInfo | null>(null);
  const showGithubStatus = phase?.kind === "checking" || phase?.kind === "error";

  useEffect(() => {
    registerUpdateModalPreview((next, preview) => {
      setIsPreview(preview);
      setBusy(false);
      setPhase(next);
      if (preview && next?.kind === "checking") {
        setGithubStatus({
          reachable: true,
          indicator: "none",
          description: "All Systems Operational",
          descriptionRu: "GitHub: всё работает",
        });
      } else if (preview && next?.kind === "error") {
        setGithubStatus({
          reachable: false,
          indicator: "unknown",
          description: "Unable to reach GitHub Status",
          descriptionRu: "Не удалось получить статус GitHub",
        });
      } else if (!preview) {
        setGithubStatus(null);
      }
    });
    return () => registerUpdateModalPreview(null);
  }, []);

  useEffect(() => {
    const api = getDesktopApi();
    if (!api?.isDesktop || !api.onUpdaterEvent) return;

    let pendingVersion = "";
    let pendingNotes = "";

    const unsubscribe = api.onUpdaterEvent((event) => {
      setIsPreview(false);
      switch (event.type) {
        case "checking":
          setGithubStatus(null);
          setPhase({ kind: "checking", currentVersion: event.currentVersion });
          break;
        case "github-status":
          setGithubStatus({
            reachable: event.reachable,
            indicator: event.indicator,
            description: event.description,
            descriptionRu: event.descriptionRu,
          });
          break;
        case "available":
          pendingVersion = event.version;
          pendingNotes = event.releaseNotes || "";
          setPhase({
            kind: "available",
            version: event.version,
            currentVersion: event.currentVersion,
            releaseNotes: event.releaseNotes || "",
          });
          break;
        case "not-available":
          setPhase({ kind: "not-available", currentVersion: event.currentVersion });
          break;
        case "download-started":
          setPhase((prev) => {
            const version =
              prev && "version" in prev && prev.version ? prev.version : pendingVersion || "…";
            const releaseNotes =
              prev && "releaseNotes" in prev ? prev.releaseNotes : pendingNotes;
            return {
              kind: "downloading",
              version,
              releaseNotes: releaseNotes || "",
              percent: 0,
              transferred: 0,
              total: 0,
              bytesPerSecond: 0,
            };
          });
          break;
        case "progress":
          setPhase((prev) => {
            if (!prev || prev.kind !== "downloading") {
              return {
                kind: "downloading",
                version: pendingVersion || "…",
                releaseNotes: pendingNotes,
                percent: event.percent,
                transferred: event.transferred,
                total: event.total,
                bytesPerSecond: event.bytesPerSecond,
              };
            }
            return {
              ...prev,
              percent: event.percent,
              transferred: event.transferred,
              total: event.total,
              bytesPerSecond: event.bytesPerSecond,
            };
          });
          break;
        case "downloaded":
          pendingVersion = event.version;
          pendingNotes = event.releaseNotes || pendingNotes;
          setPhase({
            kind: "downloaded",
            version: event.version,
            releaseNotes: event.releaseNotes || pendingNotes,
          });
          setBusy(false);
          break;
        case "error":
          setPhase({ kind: "error", phase: event.phase, message: event.message });
          setBusy(false);
          break;
        default:
          break;
      }
    });

    return unsubscribe;
  }, []);

  if (!phase) return null;

  const close = () => {
    if (phase.kind === "downloading" && !isPreview) return;
    setPhase(null);
    setBusy(false);
    setIsPreview(false);
    setGithubStatus(null);
  };

  const onDownload = async () => {
    if (busy) return;
    if (isPreview) {
      previewUpdateModal("downloading");
      return;
    }
    const api = getDesktopApi();
    if (!api?.downloadUpdate) return;
    setBusy(true);
    try {
      await api.downloadUpdate();
    } catch {
      setBusy(false);
      setPhase({
        kind: "error",
        phase: "download",
        message: "Не удалось начать загрузку обновления.",
      });
    }
  };

  const onInstall = async () => {
    if (busy) return;
    if (isPreview) {
      close();
      return;
    }
    const api = getDesktopApi();
    if (!api?.installUpdate) return;
    setBusy(true);
    try {
      await api.installUpdate();
    } catch {
      setBusy(false);
      setPhase({
        kind: "error",
        phase: "download",
        message: "Не удалось запустить установку обновления.",
      });
    }
  };

  const title =
    phase.kind === "checking"
      ? "Проверка обновлений"
      : phase.kind === "available"
        ? "Доступно обновление"
        : phase.kind === "not-available"
          ? "Обновления"
          : phase.kind === "downloading"
            ? "Загрузка обновления"
            : phase.kind === "downloaded"
              ? "Обновление готово"
              : "Ошибка обновления";

  const subtitle =
    phase.kind === "available"
      ? `Версия ${phase.version}`
      : phase.kind === "downloading"
        ? `Версия ${phase.version}`
        : phase.kind === "downloaded"
          ? `Версия ${phase.version} скачана`
          : phase.kind === "not-available"
            ? `Версия ${phase.currentVersion}`
            : phase.kind === "checking"
              ? `Текущая версия ${phase.currentVersion}`
              : null;

  const pct = phase.kind === "downloading" ? Math.min(100, Math.max(0, Math.round(phase.percent))) : 0;

  return (
    <ModalOverlay
      open
      zIndex={80}
      onClose={close}
      closeOnBackdrop={phase.kind !== "downloading" || isPreview}
      aria-label={title}
    >
      <div className="w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[min(80vh,640px)]">
        <div className="bg-gradient-to-r from-rose-500 to-rose-600 px-5 py-4 text-white shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-rose-100 text-[10px] font-bold uppercase tracking-wider mb-1">
                <Download className="h-3.5 w-3.5" />
                Автообновление
              </div>
              <h2 className="text-lg font-bold">{title}</h2>
              {subtitle && <p className="text-sm text-rose-100 mt-0.5">{subtitle}</p>}
            </div>
            {(phase.kind !== "downloading" || isPreview) && (
              <button type="button" onClick={close} className="p-1 text-white/80 hover:text-white" aria-label="Закрыть">
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto flex-1 min-h-0">
          {phase.kind === "checking" && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Loader2 className="h-5 w-5 text-rose-500 animate-spin shrink-0" />
                <span>Ищем новые версии…</span>
              </div>
              <GitHubStatusBadge status={githubStatus} />
            </div>
          )}

          {phase.kind === "available" && (
            <>
              <p className="text-sm text-slate-700 leading-relaxed">
                Доступна новая версия <span className="font-semibold">{phase.version}</span>.
                Сейчас установлена {phase.currentVersion}.
              </p>
              <ReleaseNotes notes={phase.releaseNotes} />
              <p className="text-sm text-slate-600">Скачать и установить обновление?</p>
            </>
          )}

          {phase.kind === "not-available" && (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-sm text-slate-700 leading-relaxed">
                У вас установлена последняя версия ({phase.currentVersion}).
              </p>
            </div>
          )}

          {phase.kind === "downloading" && (
            <>
              <p className="text-sm text-slate-700">Идёт загрузка обновления…</p>
              <div className="space-y-2">
                <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-600 transition-[width] duration-200 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 text-xs font-mono text-slate-500">
                  <span>{pct}%</span>
                  <span>
                    {formatBytes(phase.transferred)}
                    {phase.total > 0 ? ` / ${formatBytes(phase.total)}` : ""}
                    {phase.bytesPerSecond > 0 ? ` · ${formatBytes(phase.bytesPerSecond)}/с` : ""}
                  </span>
                </div>
              </div>
              <ReleaseNotes notes={phase.releaseNotes} />
            </>
          )}

          {phase.kind === "downloaded" && (
            <>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-sm text-slate-700 leading-relaxed">
                  Версия {phase.version} скачана. Перезапустить программу для установки?
                </p>
              </div>
              <ReleaseNotes notes={phase.releaseNotes} />
            </>
          )}

          {phase.kind === "error" && (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 mb-1">
                    {phase.phase === "download"
                      ? "Ошибка при скачивании обновления"
                      : "Не удалось проверить обновления"}
                  </p>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap break-words">{phase.message}</p>
                </div>
              </div>
              {showGithubStatus && <GitHubStatusBadge status={githubStatus} />}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex gap-2 justify-end shrink-0">
          {phase.kind === "checking" && (
            <button
              type="button"
              disabled
              className="px-4 py-2 text-xs font-bold text-slate-400 bg-slate-100 rounded-lg cursor-wait"
            >
              Проверка…
            </button>
          )}

          {phase.kind === "available" && (
            <>
              <button
                type="button"
                onClick={close}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Позже
              </button>
              <button
                type="button"
                autoFocus
                disabled={busy}
                onClick={onDownload}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-60"
              >
                <Download className="h-3.5 w-3.5" />
                Скачать
              </button>
            </>
          )}

          {phase.kind === "downloading" && (
            isPreview ? (
              <button
                type="button"
                onClick={() => previewUpdateModal("downloaded")}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Далее (предпросмотр)
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 rounded-lg cursor-wait"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Загрузка {pct}%
              </button>
            )
          )}

          {phase.kind === "downloaded" && (
            <>
              <button
                type="button"
                onClick={close}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Позже
              </button>
              <button
                type="button"
                autoFocus
                disabled={busy}
                onClick={onInstall}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-60"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Перезапустить
              </button>
            </>
          )}

          {(phase.kind === "not-available" || phase.kind === "error") && (
            <button
              type="button"
              autoFocus
              onClick={close}
              className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
            >
              OK
            </button>
          )}
        </div>
      </div>
    </ModalOverlay>
  );
}
