/** Сериализуемый снимок данных приложения для экспорта и автобэкапа. */
export interface AppBackupPayload {
  backupFormatVersion?: number;
  schemaVersion?: number;
  employees: unknown;
  visits: unknown;
  solariumSessions: unknown;
  extraTransactions: unknown;
  masterTransactions: unknown;
  adminShifts: unknown;
  dailyCash: unknown;
  settingsRules: unknown;
  materialPrices: unknown;
  materialPackaging: unknown;
  materialConsumptions: unknown;
  adminDaysRates: unknown;
  adminDaysRatesRules: unknown;
  giftCertificates: unknown;
  debtRecords: unknown;
  adminPaidWages: unknown;
  preferences: Record<string, unknown>;
  exportedAt?: string;
  appVersion?: string;
}

export function serializeBackup(data: AppBackupPayload): string {
  return JSON.stringify(
    {
      backupFormatVersion: 2,
      ...data,
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  );
}

export type AutoBackupInterval = "hourly" | "every6h" | "daily" | "weekly" | "monthly";

/** Сколько файлов автобэкапа хранить в папке Backups. */
export const AUTO_BACKUP_KEEP_LAST = 10;

const INTERVAL_MS: Record<AutoBackupInterval, number> = {
  hourly: 60 * 60 * 1000,
  every6h: 6 * 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

function parseBackupTimestamp(lastBackupAt: string): Date {
  if (lastBackupAt.includes("T")) return new Date(lastBackupAt);
  return new Date(lastBackupAt + "T12:00:00");
}

/**
 * Нужен ли автобэкап.
 * @param lastBackupAt — ISO-дата/время или YYYY-MM-DD (legacy)
 * @param now — момент проверки (для тестов)
 */
export function shouldRunAutoBackup(
  interval: AutoBackupInterval,
  lastBackupAt: string | null,
  now: Date | string = new Date()
): boolean {
  if (!lastBackupAt) return true;
  const nowDate = typeof now === "string" ? parseBackupTimestamp(now) : now;
  const last = parseBackupTimestamp(lastBackupAt);
  if (Number.isNaN(last.getTime()) || Number.isNaN(nowDate.getTime())) return true;

  // Совместимость со старым daily/weekly по календарным дням
  if (interval === "daily" && !lastBackupAt.includes("T") && typeof now === "string" && !now.includes("T")) {
    return lastBackupAt !== now;
  }
  if (interval === "weekly" && !lastBackupAt.includes("T")) {
    const diffDays = Math.floor((nowDate.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 7;
  }

  const ms = INTERVAL_MS[interval] ?? INTERVAL_MS.daily;
  return nowDate.getTime() - last.getTime() >= ms;
}

export function normalizeAutoBackupInterval(raw: unknown): AutoBackupInterval {
  if (raw === "hourly" || raw === "every6h" || raw === "daily" || raw === "weekly" || raw === "monthly") {
    return raw;
  }
  return "weekly";
}
