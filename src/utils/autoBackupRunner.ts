import { AUTO_BACKUP_KEEP_LAST, AutoBackupInterval, serializeBackup } from "./backupData";
import { APP_VERSION } from "../data/appVersion";
import type { AppBackupPayload } from "./backupData";

export type AutoBackupResult = {
  success: boolean;
  path?: string;
  pruned?: number;
  skipped?: boolean;
  reason?: string;
};

type DesktopApi = {
  isDesktop?: boolean;
  autoSaveBackup?: (p: {
    fileName: string;
    content: string;
    keepLast?: number;
  }) => Promise<{ success: boolean; path?: string; pruned?: number }>;
};

function getDesktop(): DesktopApi | undefined {
  return (window as { evaStyleDesktop?: DesktopApi }).evaStyleDesktop;
}

/** Имя файла автокопии: с временем для частых интервалов. */
export function buildAutoBackupFileName(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `eva_style_auto_${y}-${m}-${d}_${hh}-${mm}.json`;
}

export async function runAutoBackupNow(
  buildPayload: () => AppBackupPayload,
  options?: { force?: boolean }
): Promise<AutoBackupResult> {
  const desktop = getDesktop();
  if (!desktop?.isDesktop || !desktop.autoSaveBackup) {
    return {
      success: false,
      reason: "Автосохранение доступно только в Windows-приложении Ева-стиль.",
    };
  }

  const now = new Date();
  const content = serializeBackup({
    ...buildPayload(),
    appVersion: APP_VERSION,
  });

  try {
    const result = await desktop.autoSaveBackup({
      fileName: buildAutoBackupFileName(now),
      content,
      keepLast: AUTO_BACKUP_KEEP_LAST,
    });
    if (!result.success) {
      return { success: false, reason: "Не удалось записать файл." };
    }
    return {
      success: true,
      path: result.path,
      pruned: result.pruned,
    };
  } catch (e) {
    return {
      success: false,
      reason: e instanceof Error ? e.message : "Ошибка автосохранения",
    };
  }
}

export function formatAutoBackupInterval(interval: AutoBackupInterval): string {
  switch (interval) {
    case "hourly":
      return "Каждый час";
    case "every6h":
      return "Каждые 6 часов";
    case "daily":
      return "Раз в день";
    case "weekly":
      return "Раз в неделю";
    case "monthly":
      return "Раз в месяц";
    default:
      return String(interval);
  }
}

export const AUTO_BACKUP_INTERVAL_OPTIONS: { value: AutoBackupInterval; label: string }[] = [
  { value: "hourly", label: "Каждый час" },
  { value: "every6h", label: "Каждые 6 часов" },
  { value: "daily", label: "Раз в день" },
  { value: "weekly", label: "Раз в неделю" },
  { value: "monthly", label: "Раз в месяц" },
];
