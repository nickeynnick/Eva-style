import {
  INITIAL_VISITS,
  INITIAL_SOLARIUM_SESSIONS,
  INITIAL_EXTRA_TRANSACTIONS,
  INITIAL_MASTER_TRANSACTIONS,
  INITIAL_ADMIN_SHIFTS,
  INITIAL_DAILY_CASH,
  INITIAL_SETTINGS_RULES,
  INITIAL_MATERIAL_PACKAGING,
  INITIAL_MATERIAL_CONSUMPTIONS,
  INITIAL_ADMIN_DAYS_RATES,
  INITIAL_ADMIN_DAYS_RATES_RULES,
  INITIAL_EMPLOYEES,
  INITIAL_RAW_MATERIAL_PRICES,
  DEFAULT_APP_PREFERENCES,
} from "../initialData";
import { ResetAppMode } from "../utils/resetAppData";
import { AppStorePatch, AppStoreState } from "./schema";
import { deriveMaterialPricesFromPackaging } from "./materialPrices";
import { applyStoreMigrations } from "./migrations";
import { AppBackupPayload } from "../utils/backupData";

export type AppStoreAction =
  | { type: "PATCH"; payload: AppStorePatch }
  | { type: "SET_MATERIAL_PACKAGING"; payload: AppStoreState["materialPackaging"] }
  | { type: "IMPORT_BACKUP"; payload: AppBackupPayload }
  | { type: "RESET"; mode: ResetAppMode };

export function appStoreReducer(state: AppStoreState, action: AppStoreAction): AppStoreState {
  switch (action.type) {
    case "PATCH": {
      const { preferences, meta, ...rest } = action.payload;
      return applyStoreMigrations({
        ...state,
        ...rest,
        preferences: preferences ? { ...state.preferences, ...preferences } : state.preferences,
        meta: meta ? { ...state.meta, ...meta } : state.meta,
      });
    }
    case "SET_MATERIAL_PACKAGING":
      return {
        ...state,
        materialPackaging: action.payload,
        materialPrices: deriveMaterialPricesFromPackaging(action.payload),
      };
    case "IMPORT_BACKUP": {
      const p = action.payload;
      const prefs = p.preferences ?? {};
      return applyStoreMigrations({
        ...state,
        employees: (p.employees as AppStoreState["employees"]) ?? state.employees,
        visits: (p.visits as AppStoreState["visits"]) ?? state.visits,
        solariumSessions: (p.solariumSessions as AppStoreState["solariumSessions"]) ?? state.solariumSessions,
        extraTransactions: (p.extraTransactions as AppStoreState["extraTransactions"]) ?? state.extraTransactions,
        masterTransactions: (p.masterTransactions as AppStoreState["masterTransactions"]) ?? state.masterTransactions,
        adminShifts: (p.adminShifts as AppStoreState["adminShifts"]) ?? state.adminShifts,
        dailyCash: (p.dailyCash as AppStoreState["dailyCash"]) ?? state.dailyCash,
        settingsRules: (p.settingsRules as AppStoreState["settingsRules"]) ?? state.settingsRules,
        materialPrices: (p.materialPrices as AppStoreState["materialPrices"]) ?? state.materialPrices,
        materialPackaging: (p.materialPackaging as AppStoreState["materialPackaging"]) ?? state.materialPackaging,
        materialConsumptions:
          (p.materialConsumptions as AppStoreState["materialConsumptions"]) ?? state.materialConsumptions,
        adminDaysRates: (p.adminDaysRates as AppStoreState["adminDaysRates"]) ?? state.adminDaysRates,
        adminDaysRatesRules:
          (p.adminDaysRatesRules as AppStoreState["adminDaysRatesRules"]) ?? state.adminDaysRatesRules,
        giftCertificates: (p.giftCertificates as AppStoreState["giftCertificates"]) ?? state.giftCertificates,
        debtRecords: (p.debtRecords as AppStoreState["debtRecords"]) ?? state.debtRecords,
        adminPaidWages: (p.adminPaidWages as AppStoreState["adminPaidWages"]) ?? state.adminPaidWages,
        preferences: {
          ...state.preferences,
          ...(prefs as Partial<AppStoreState["preferences"]>),
        },
      });
    }
    case "RESET": {
      const preserveTariffs = action.mode === "preserveTariffs";
      const next: AppStoreState = {
        ...state,
        visits: INITIAL_VISITS,
        solariumSessions: INITIAL_SOLARIUM_SESSIONS,
        extraTransactions: INITIAL_EXTRA_TRANSACTIONS,
        masterTransactions: INITIAL_MASTER_TRANSACTIONS,
        adminShifts: INITIAL_ADMIN_SHIFTS,
        dailyCash: INITIAL_DAILY_CASH,
        giftCertificates: [],
        debtRecords: [],
        adminPaidWages: {},
        preferences: { ...DEFAULT_APP_PREFERENCES },
      };
      if (!preserveTariffs) {
        next.employees = INITIAL_EMPLOYEES;
        next.settingsRules = INITIAL_SETTINGS_RULES;
        next.materialPackaging = INITIAL_MATERIAL_PACKAGING;
        next.materialConsumptions = INITIAL_MATERIAL_CONSUMPTIONS as Record<string, unknown>;
        next.adminDaysRates = INITIAL_ADMIN_DAYS_RATES;
        next.adminDaysRatesRules = INITIAL_ADMIN_DAYS_RATES_RULES;
        next.materialPrices = INITIAL_RAW_MATERIAL_PRICES;
      }
      return applyStoreMigrations(next);
    }
    default:
      return state;
  }
}
