import { AppBackupPayload } from "./backupData";
import { AppStoreState } from "../store/schema";

/** Версия формата JSON-резервной копии (не путать с schemaVersion store). */
export const BACKUP_FORMAT_VERSION = 2;

export interface BackupImportPreview {
  employees: number;
  visits: number;
  solariumSessions: number;
  giftCertificates: number;
  debtRecords: number;
  adminShifts: number;
  exportedAt: string | null;
  appVersion: string | null;
  backupFormatVersion: number | null;
  hasPreferences: boolean;
}

export interface BackupImportValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  preview: BackupImportPreview | null;
  payload: AppBackupPayload | null;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function countArray(v: unknown): number {
  return Array.isArray(v) ? v.length : 0;
}

export function validateBackupImport(raw: unknown): BackupImportValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isObject(raw)) {
    return { valid: false, errors: ["Файл не является JSON-объектом"], warnings, preview: null, payload: null };
  }

  try {
    JSON.stringify(raw);
  } catch {
    return { valid: false, errors: ["Некорректная структура JSON"], warnings, preview: null, payload: null };
  }

  const hasCore =
    "visits" in raw || "employees" in raw || "solariumSessions" in raw;
  if (!hasCore) {
    errors.push("Не похоже на резервную копию «Ева-стиль»: нет visits/employees/solariumSessions");
  }

  const formatVersion =
    typeof raw.backupFormatVersion === "number"
      ? raw.backupFormatVersion
      : typeof raw.schemaVersion === "number"
        ? raw.schemaVersion
        : null;

  if (formatVersion !== null && formatVersion > BACKUP_FORMAT_VERSION) {
    warnings.push(
      `Версия файла (${formatVersion}) новее программы (${BACKUP_FORMAT_VERSION}). Часть данных может не импортироваться.`
    );
  } else if (formatVersion === null) {
    warnings.push("В файле не указана версия формата — будет выполнен импорт в режиме совместимости.");
  }

  if (raw.visits !== undefined && !Array.isArray(raw.visits)) errors.push("Поле visits должно быть массивом");
  if (raw.employees !== undefined && !Array.isArray(raw.employees)) errors.push("Поле employees должно быть массивом");

  const preview: BackupImportPreview = {
    employees: countArray(raw.employees),
    visits: countArray(raw.visits),
    solariumSessions: countArray(raw.solariumSessions),
    giftCertificates: countArray(raw.giftCertificates),
    debtRecords: countArray(raw.debtRecords),
    adminShifts: countArray(raw.adminShifts),
    exportedAt: typeof raw.exportedAt === "string" ? raw.exportedAt : null,
    appVersion: typeof raw.appVersion === "string" ? raw.appVersion : null,
    backupFormatVersion: formatVersion,
    hasPreferences: isObject(raw.preferences),
  };

  if (preview.visits === 0 && preview.employees === 0) {
    warnings.push("Файл не содержит визитов и сотрудников — возможно, пустая копия.");
  }

  const payload = raw as unknown as AppBackupPayload;
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    preview,
    payload: errors.length === 0 ? payload : null,
  };
}

export function stateToBackupPayload(state: AppStoreState): AppBackupPayload {
  return {
    backupFormatVersion: BACKUP_FORMAT_VERSION,
    schemaVersion: state.schemaVersion,
    employees: state.employees,
    visits: state.visits,
    solariumSessions: state.solariumSessions,
    extraTransactions: state.extraTransactions,
    masterTransactions: state.masterTransactions,
    adminShifts: state.adminShifts,
    dailyCash: state.dailyCash,
    settingsRules: state.settingsRules,
    materialPrices: state.materialPrices,
    materialPackaging: state.materialPackaging,
    materialConsumptions: state.materialConsumptions,
    adminDaysRates: state.adminDaysRates,
    adminDaysRatesRules: state.adminDaysRatesRules,
    giftCertificates: state.giftCertificates,
    debtRecords: state.debtRecords,
    adminPaidWages: state.adminPaidWages,
    preferences: { ...state.preferences },
  };
}
