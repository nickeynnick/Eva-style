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

export type AutoBackupInterval = "daily" | "weekly";

export function shouldRunAutoBackup(
  interval: AutoBackupInterval,
  lastBackupDate: string | null,
  todayStr: string
): boolean {
  if (!lastBackupDate) return true;
  if (interval === "daily") return lastBackupDate !== todayStr;
  const last = new Date(lastBackupDate + "T12:00:00");
  const today = new Date(todayStr + "T12:00:00");
  const diffDays = Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 7;
}
