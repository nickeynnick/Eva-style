import {
  Employee,
  Visit,
  SolariumSession,
  ExtraTransaction,
  MasterTransaction,
  AdminShift,
  DailyCashState,
  SettingsRule,
  RawMaterialPrices,
  AdminDayOfWeekRate,
  AdminDaysRateRule,
  GiftCertificate,
  DebtRecord,
} from "../types";
import { AutoBackupInterval } from "../utils/backupData";

/** Версия схемы локального store (миграции между версиями). */
export const STORE_SCHEMA_VERSION = 2;

export const STORE_STORAGE_KEY = "eva_style_store";

export interface AppPreferences {
  showDeletedVisits: boolean;
  allowDeleteVisits: boolean;
  allowDeleteCertificates: boolean;
  allowDeleteDebts: boolean;
  showVisitChangeHistory: boolean;
  allowMasterPayouts: boolean;
  allowAdminShiftEdits: boolean;
  hideFormulaCalculations: boolean;
  keepOwnerUnlocked: boolean;
  autoLockDuration: number;
  autoBackupEnabled: boolean;
  autoBackupInterval: AutoBackupInterval;
  /** Предпочтительное локальное время «ЧЧ:ММ» для daily/weekly/monthly. */
  autoBackupPreferredTime: string;
  /** Бета: разрешить AI-помощнику предлагать изменения данных (с подтверждением). */
  deepSeekWriteEnabled: boolean;
  /** Модель DeepSeek API. */
  deepSeekModel: string;
}

export interface AppStoreMeta {
  appInitialized: boolean;
  ownerPassword: string;
  lastAutoBackupDate: string | null;
  seenAppVersion: string | null;
  /** Ключ DeepSeek API (не попадает в JSON-бэкап вместе с meta). */
  deepSeekApiKey: string;
}

export interface AppStoreState {
  schemaVersion: number;
  employees: Employee[];
  visits: Visit[];
  solariumSessions: SolariumSession[];
  extraTransactions: ExtraTransaction[];
  masterTransactions: MasterTransaction[];
  adminShifts: AdminShift[];
  dailyCash: DailyCashState[];
  giftCertificates: GiftCertificate[];
  debtRecords: DebtRecord[];
  settingsRules: SettingsRule[];
  materialPrices: RawMaterialPrices;
  materialPackaging: Record<string, { price: number; volume: number }>;
  materialConsumptions: Record<string, unknown>;
  adminDaysRates: AdminDayOfWeekRate;
  adminDaysRatesRules: AdminDaysRateRule[];
  adminPaidWages: Record<string, number>;
  preferences: AppPreferences;
  meta: AppStoreMeta;
}

export type AppStorePatch = Partial<
  Omit<AppStoreState, "schemaVersion" | "preferences" | "meta">
> & {
  preferences?: Partial<AppPreferences>;
  meta?: Partial<AppStoreMeta>;
};
