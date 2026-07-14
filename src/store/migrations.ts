import {
  INITIAL_EMPLOYEES,
  INITIAL_VISITS,
  INITIAL_SOLARIUM_SESSIONS,
  INITIAL_EXTRA_TRANSACTIONS,
  INITIAL_MASTER_TRANSACTIONS,
  INITIAL_ADMIN_SHIFTS,
  INITIAL_DAILY_CASH,
  INITIAL_SETTINGS_RULES,
  INITIAL_RAW_MATERIAL_PRICES,
  INITIAL_ADMIN_DAYS_RATES,
  INITIAL_MATERIAL_PACKAGING,
  INITIAL_MATERIAL_CONSUMPTIONS,
  INITIAL_ADMIN_DAYS_RATES_RULES,
  DEFAULT_APP_PREFERENCES,
} from "../initialData";
import { SolariumSession, SettingsRule } from "../types";
import { getActiveSettingsForDate } from "../utils/settingsUtils";
import { normalizeAutoBackupInterval } from "../utils/backupData";
import {
  AppStoreState,
  AppPreferences,
  STORE_SCHEMA_VERSION,
} from "./schema";
import { deriveMaterialPricesFromPackaging } from "./materialPrices";

export function createDefaultPreferences(): AppPreferences {
  return { ...DEFAULT_APP_PREFERENCES };
}

export function createDefaultState(appInitialized: boolean): AppStoreState {
  return {
    schemaVersion: STORE_SCHEMA_VERSION,
    employees: appInitialized ? INITIAL_EMPLOYEES : [],
    visits: INITIAL_VISITS,
    solariumSessions: INITIAL_SOLARIUM_SESSIONS,
    extraTransactions: INITIAL_EXTRA_TRANSACTIONS,
    masterTransactions: INITIAL_MASTER_TRANSACTIONS,
    adminShifts: INITIAL_ADMIN_SHIFTS,
    dailyCash: INITIAL_DAILY_CASH,
    giftCertificates: [],
    debtRecords: [],
    settingsRules: INITIAL_SETTINGS_RULES,
    materialPackaging: INITIAL_MATERIAL_PACKAGING,
    materialPrices: INITIAL_RAW_MATERIAL_PRICES,
    materialConsumptions: INITIAL_MATERIAL_CONSUMPTIONS as Record<string, unknown>,
    adminDaysRates: INITIAL_ADMIN_DAYS_RATES,
    adminDaysRatesRules: INITIAL_ADMIN_DAYS_RATES_RULES,
    adminPaidWages: {},
    preferences: createDefaultPreferences(),
    meta: {
      appInitialized,
      ownerPassword: "",
      lastAutoBackupDate: null,
      seenAppVersion: null,
    },
  };
}

/** Однократно проставить minuteRate старым сеансам солярия. */
export function migrateSolariumMinuteRates(
  sessions: SolariumSession[],
  rules: SettingsRule[]
): SolariumSession[] {
  let changed = false;
  const migrated = sessions.map((s) => {
    if (s.minuteRate !== undefined) return s;
    changed = true;
    return {
      ...s,
      minuteRate: getActiveSettingsForDate(rules, s.date).solariumMinuteRate,
    };
  });
  return changed ? migrated : sessions;
}

/** Миграция materialConsumptions из старых localStorage-данных. */
export function migrateMaterialConsumptions(
  parsed: Record<string, unknown>
): Record<string, unknown> {
  const data = { ...parsed };
  let modified = false;

  const lam = data.lamination as Record<string, { baseCost?: number; constant?: number }> | undefined;
  if (lam?.короткие && (lam.короткие.baseCost === undefined || (lam.короткие.constant ?? 0) > 200)) {
    lam.короткие.baseCost = 1000;
    lam.короткие.constant = 105;
    lam.средние = { ...lam.средние, baseCost: 1300, constant: 125 };
    lam.удлиненные = { ...lam.удлиненные, baseCost: 1500, constant: 150 };
    lam.длинные = { ...lam.длинные, baseCost: 1800, constant: 150 };
    modified = true;
  }

  const bioc = data.biocurl as Record<string, { baseCost?: number; constant?: number }> | undefined;
  if (bioc?.короткие && (bioc.короткие.baseCost === undefined || (bioc.короткие.constant ?? 0) > 200)) {
    bioc.короткие.baseCost = 1000;
    bioc.короткие.constant = 100;
    bioc.средние = { ...bioc.средние, baseCost: 1200, constant: 120 };
    bioc.удлиненные = { ...bioc.удлиненные, baseCost: 1400, constant: 140 };
    bioc.длинные = { ...bioc.длинные, baseCost: 1600, constant: 150 };
    modified = true;
  }
  if (bioc && !bioc["частичная"]) {
    (bioc as Record<string, unknown>)["частичная"] = {
      shampoo: 5,
      base: 4,
      lotionOne: 10,
      lotionTwo: 10,
      cond: 10,
      serum: 8,
      constant: 80,
      baseCost: 800,
    };
    modified = true;
  }

  return modified ? data : parsed;
}

function readJson<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Сборка store из разрозненных ключей localStorage (до v2). */
export function migrateFromLegacyStorage(): AppStoreState {
  const appInitialized = localStorage.getItem("eva_style_app_initialized") === "1";
  const state = createDefaultState(appInitialized);

  state.employees = readJson("eva_style_employees", state.employees);
  state.visits = readJson("eva_style_visits", state.visits);
  state.solariumSessions = readJson("eva_style_solarium_sessions", state.solariumSessions);
  state.extraTransactions = readJson("eva_style_extra_transactions", state.extraTransactions);
  state.masterTransactions = readJson("eva_style_master_transactions", state.masterTransactions);
  state.adminShifts = readJson("eva_style_admin_shifts", state.adminShifts);
  state.dailyCash = readJson("eva_style_daily_cash", state.dailyCash);
  state.giftCertificates = readJson("eva_style_gift_certificates", []);
  state.debtRecords = readJson("eva_style_debt_records", []);
  state.settingsRules = readJson("eva_style_settings_rules", state.settingsRules);
  state.materialPrices = readJson("eva_style_material_prices", state.materialPrices);
  state.materialPackaging = readJson("eva_style_material_packaging", state.materialPackaging);
  state.materialConsumptions = migrateMaterialConsumptions(
    readJson("eva_style_material_consumptions", state.materialConsumptions as Record<string, unknown>)
  );
  state.adminDaysRates = readJson("eva_style_admin_days_rates", state.adminDaysRates);
  state.adminDaysRatesRules = readJson("eva_style_admin_days_rates_rules", state.adminDaysRatesRules);
  state.adminPaidWages = readJson("eva_style_admin_paid_wages", {});

  state.preferences = {
    ...state.preferences,
    showDeletedVisits: readJson("eva_style_show_deleted_visits", state.preferences.showDeletedVisits),
    allowDeleteVisits: readJson("eva_style_allow_delete_visits", state.preferences.allowDeleteVisits),
    allowDeleteCertificates: readJson(
      "eva_style_allow_delete_certificates",
      state.preferences.allowDeleteCertificates
    ),
    allowDeleteDebts: readJson(
      "eva_style_allow_delete_debts",
      state.preferences.allowDeleteDebts ?? DEFAULT_APP_PREFERENCES.allowDeleteDebts
    ),
    showVisitChangeHistory: readJson(
      "eva_style_show_visit_change_history",
      state.preferences.showVisitChangeHistory
    ),
    allowMasterPayouts: readJson("eva_style_allow_master_payouts", state.preferences.allowMasterPayouts),
    allowAdminShiftEdits: readJson(
      "eva_style_allow_admin_shift_edits",
      state.preferences.allowAdminShiftEdits
    ),
    hideFormulaCalculations: readJson(
      "eva_style_hide_formula_calculations",
      state.preferences.hideFormulaCalculations
    ),
    keepOwnerUnlocked: readJson("eva_style_keep_owner_unlocked", state.preferences.keepOwnerUnlocked),
    autoLockDuration: readJson("eva_style_auto_lock_duration", state.preferences.autoLockDuration),
    autoBackupEnabled: readJson("eva_style_auto_backup_enabled", state.preferences.autoBackupEnabled),
    autoBackupInterval: normalizeAutoBackupInterval(
      localStorage.getItem("eva_style_auto_backup_interval") || state.preferences.autoBackupInterval
    ),
  };

  state.meta.ownerPassword = localStorage.getItem("eva_style_owner_password") || "";
  state.meta.lastAutoBackupDate = localStorage.getItem("eva_style_last_auto_backup");
  state.meta.seenAppVersion = localStorage.getItem("eva_style_seen_version");
  state.meta.appInitialized = true;

  if (!localStorage.getItem("eva_style_material_prices") && state.materialPackaging) {
    state.materialPrices = deriveMaterialPricesFromPackaging(state.materialPackaging);
  }

  return applyStoreMigrations(state);
}

export function applyStoreMigrations(state: AppStoreState): AppStoreState {
  let next = { ...state, schemaVersion: STORE_SCHEMA_VERSION };

  next.preferences = {
    ...DEFAULT_APP_PREFERENCES,
    ...next.preferences,
  };

  next.materialConsumptions = migrateMaterialConsumptions(
    next.materialConsumptions as Record<string, unknown>
  );
  next.solariumSessions = migrateSolariumMinuteRates(next.solariumSessions, next.settingsRules);

  return next;
}
