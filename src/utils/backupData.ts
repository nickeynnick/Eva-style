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

export const DEFAULT_AUTO_BACKUP_PREFERRED_TIME = "18:00";

const INTERVAL_MS: Record<"hourly" | "every6h", number> = {
  hourly: 60 * 60 * 1000,
  every6h: 6 * 60 * 60 * 1000,
};

function parseBackupTimestamp(lastBackupAt: string): Date {
  if (lastBackupAt.includes("T")) return new Date(lastBackupAt);
  return new Date(lastBackupAt + "T12:00:00");
}

/** Нормализация «ЧЧ:ММ» → валидная строка или значение по умолчанию. */
export function normalizeAutoBackupPreferredTime(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_AUTO_BACKUP_PREFERRED_TIME;
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
  if (!match) return DEFAULT_AUTO_BACKUP_PREFERRED_TIME;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return DEFAULT_AUTO_BACKUP_PREFERRED_TIME;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return DEFAULT_AUTO_BACKUP_PREFERRED_TIME;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function parsePreferredParts(preferredTime: string): { hours: number; minutes: number } {
  const normalized = normalizeAutoBackupPreferredTime(preferredTime);
  const [h, m] = normalized.split(":").map(Number);
  return { hours: h, minutes: m };
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/** Понедельник 00:00 локальной недели (Пн–Вс). */
function startOfLocalWeekMonday(d: Date): Date {
  const day = startOfLocalDay(d);
  const weekday = day.getDay(); // 0=Sun … 6=Sat
  const offset = weekday === 0 ? 6 : weekday - 1;
  day.setDate(day.getDate() - offset);
  return day;
}

function startOfLocalMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function withPreferredTime(dayStart: Date, preferredTime: string): Date {
  const { hours, minutes } = parsePreferredParts(preferredTime);
  return new Date(
    dayStart.getFullYear(),
    dayStart.getMonth(),
    dayStart.getDate(),
    hours,
    minutes,
    0,
    0
  );
}

function periodStart(
  interval: "daily" | "weekly" | "monthly",
  now: Date
): Date {
  if (interval === "daily") return startOfLocalDay(now);
  if (interval === "weekly") return startOfLocalWeekMonday(now);
  return startOfLocalMonth(now);
}

function preferredDueAt(
  interval: "daily" | "weekly" | "monthly",
  now: Date,
  preferredTime: string
): Date {
  return withPreferredTime(periodStart(interval, now), preferredTime);
}

function isInCurrentPeriod(
  interval: "daily" | "weekly" | "monthly",
  last: Date,
  now: Date
): boolean {
  return last.getTime() >= periodStart(interval, now).getTime();
}

/**
 * Нужен ли автобэкап.
 * @param lastBackupAt — ISO-дата/время или YYYY-MM-DD (legacy)
 * @param now — момент проверки (для тестов)
 * @param preferredTime — «ЧЧ:ММ» для daily/weekly/monthly (по умолчанию 18:00)
 */
export function shouldRunAutoBackup(
  interval: AutoBackupInterval,
  lastBackupAt: string | null,
  now: Date | string = new Date(),
  preferredTime: string = DEFAULT_AUTO_BACKUP_PREFERRED_TIME
): boolean {
  const nowDate = typeof now === "string" ? parseBackupTimestamp(now) : now;
  if (Number.isNaN(nowDate.getTime())) return true;

  if (interval === "hourly" || interval === "every6h") {
    if (!lastBackupAt) return true;
    const last = parseBackupTimestamp(lastBackupAt);
    if (Number.isNaN(last.getTime())) return true;
    return nowDate.getTime() - last.getTime() >= INTERVAL_MS[interval];
  }

  // daily / weekly / monthly — календарный период + предпочтительное время суток
  const due = preferredDueAt(interval, nowDate, preferredTime);
  if (nowDate.getTime() < due.getTime()) return false;

  if (!lastBackupAt) return true;

  // Совместимость со старым daily по календарным дням (только даты без T)
  if (
    interval === "daily" &&
    !lastBackupAt.includes("T") &&
    typeof now === "string" &&
    !now.includes("T")
  ) {
    return lastBackupAt !== now;
  }

  const last = parseBackupTimestamp(lastBackupAt);
  if (Number.isNaN(last.getTime())) return true;

  if (interval === "weekly" && !lastBackupAt.includes("T")) {
    // legacy weekly по дням: после due всё ещё требуем ≥7 суток
    const diffDays = Math.floor((nowDate.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 7) return false;
  }

  return !isInCurrentPeriod(interval, last, nowDate);
}

export function normalizeAutoBackupInterval(raw: unknown): AutoBackupInterval {
  if (raw === "hourly" || raw === "every6h" || raw === "daily" || raw === "weekly" || raw === "monthly") {
    return raw;
  }
  return "weekly";
}

export function usesPreferredBackupTime(interval: AutoBackupInterval): boolean {
  return interval === "daily" || interval === "weekly" || interval === "monthly";
}
