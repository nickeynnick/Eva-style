import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { AppBackupPayload } from "../utils/backupData";
import { ResetAppMode } from "../utils/resetAppData";
import { AppStorePatch, AppStoreState, STORE_STORAGE_KEY } from "./schema";
import { loadAppStore, persistAppStore, flushAppStore } from "./persistence";
import { appStoreReducer } from "./reducer";
import {
  logStoreHistory,
  summarizeStoreChange,
  summarizeImportBackup,
  summarizeReset,
  summarizeMaterialPackaging,
} from "../utils/devMode";

interface AppStoreContextValue {
  state: AppStoreState;
  /** Актуальный state без устаревшего замыкания (для функ. апдейтеров). */
  getState: () => AppStoreState;
  patch: (payload: AppStorePatch) => void;
  setMaterialPackaging: (packaging: AppStoreState["materialPackaging"]) => void;
  importBackup: (payload: AppBackupPayload) => void;
  resetApp: (mode: ResetAppMode) => void;
  buildBackupPayload: () => AppBackupPayload;
}

const AppStoreContext = createContext<AppStoreContextValue | null>(null);

function emitHistoryLines(lines: string[], flush = false): void {
  for (const line of lines) {
    if (!line) continue;
    logStoreHistory(line, undefined, { flush });
  }
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appStoreReducer, undefined, () => {
    const loaded = loadAppStore();
    if (!localStorage.getItem(STORE_STORAGE_KEY)) {
      persistAppStore(loaded, true);
    }
    return loaded;
  });
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    persistAppStore(state);
  }, [state]);

  useEffect(() => {
    const onUnload = () => flushAppStore(stateRef.current);
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, []);

  const getState = useCallback(() => stateRef.current, []);

  const patch = useCallback((payload: AppStorePatch) => {
    const prev = stateRef.current as unknown as Record<string, unknown>;
    const { lines } = summarizeStoreChange(
      prev,
      payload as unknown as Record<string, unknown>
    );
    const destructive = lines.some(
      (l) =>
        /Удалён|удалено|Сброс|Восстановлена резервная/i.test(l) ||
        l.startsWith("Удалён ")
    );
    emitHistoryLines(lines, destructive);
    dispatch({ type: "PATCH", payload });
  }, []);

  const setMaterialPackaging = useCallback((packaging: AppStoreState["materialPackaging"]) => {
    const prevCount = Object.keys(stateRef.current.materialPackaging).length;
    const nextCount = Object.keys(packaging).length;
    logStoreHistory(summarizeMaterialPackaging(prevCount, nextCount));
    dispatch({ type: "SET_MATERIAL_PACKAGING", payload: packaging });
  }, []);

  const importBackup = useCallback((payload: AppBackupPayload) => {
    const s = stateRef.current;
    logStoreHistory(
      summarizeImportBackup(
        {
          visits: s.visits.length,
          employees: s.employees.length,
          certificates: s.giftCertificates.length,
        },
        {
          visits: Array.isArray(payload.visits) ? payload.visits.length : null,
          employees: Array.isArray(payload.employees) ? payload.employees.length : null,
          certificates: Array.isArray(payload.giftCertificates)
            ? payload.giftCertificates.length
            : null,
        }
      ),
      undefined,
      { flush: true, level: "warn" }
    );
    dispatch({ type: "IMPORT_BACKUP", payload });
  }, []);

  const resetApp = useCallback((mode: ResetAppMode) => {
    const s = stateRef.current;
    logStoreHistory(
      summarizeReset(mode, {
        visits: s.visits.length,
        employees: s.employees.length,
        certificates: s.giftCertificates.length,
        debts: s.debtRecords.length,
      }),
      undefined,
      { flush: true, level: "warn" }
    );
    dispatch({ type: "RESET", mode });
  }, []);

  const buildBackupPayload = useCallback((): AppBackupPayload => {
    const s = stateRef.current;
    return {
      schemaVersion: s.schemaVersion,
      employees: s.employees,
      visits: s.visits,
      solariumSessions: s.solariumSessions,
      extraTransactions: s.extraTransactions,
      masterTransactions: s.masterTransactions,
      adminShifts: s.adminShifts,
      dailyCash: s.dailyCash,
      settingsRules: s.settingsRules,
      materialPrices: s.materialPrices,
      materialPackaging: s.materialPackaging,
      materialConsumptions: s.materialConsumptions,
      adminDaysRates: s.adminDaysRates,
      adminDaysRatesRules: s.adminDaysRatesRules,
      giftCertificates: s.giftCertificates,
      debtRecords: s.debtRecords,
      adminPaidWages: s.adminPaidWages,
      preferences: { ...s.preferences },
    };
  }, []);

  const value = useMemo(
    () => ({
      state,
      getState,
      patch,
      setMaterialPackaging,
      importBackup,
      resetApp,
      buildBackupPayload,
    }),
    [state, getState, patch, setMaterialPackaging, importBackup, resetApp, buildBackupPayload]
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

export function useAppStore(): AppStoreContextValue {
  const ctx = useContext(AppStoreContext);
  if (!ctx) throw new Error("useAppStore must be used within AppStoreProvider");
  return ctx;
}

/** Удобные сеттеры для полей store (совместимость с useState API). */
export function useStoreField<K extends keyof AppStoreState>(
  key: K
): [AppStoreState[K], (value: AppStoreState[K] | ((prev: AppStoreState[K]) => AppStoreState[K])) => void] {
  const { state, patch, getState } = useAppStore();

  const setValue = useCallback(
    (value: AppStoreState[K] | ((prev: AppStoreState[K]) => AppStoreState[K])) => {
      const current = getState();
      const next =
        typeof value === "function"
          ? (value as (prev: AppStoreState[K]) => AppStoreState[K])(current[key])
          : value;
      patch({ [key]: next } as AppStorePatch);
    },
    [key, patch, getState]
  );

  return [state[key], setValue];
}

export function useStorePreferences() {
  const { state, patch } = useAppStore();
  const setPreference = useCallback(
    <K extends keyof AppStoreState["preferences"]>(key: K, value: AppStoreState["preferences"][K]) => {
      patch({ preferences: { [key]: value } });
    },
    [patch]
  );
  return { preferences: state.preferences, setPreference, patchPreferences: (p: Partial<AppStoreState["preferences"]>) => patch({ preferences: p }) };
}

export function useStoreMeta() {
  const { state, patch } = useAppStore();
  const setMeta = useCallback(
    (meta: Partial<AppStoreState["meta"]>) => patch({ meta }),
    [patch]
  );
  return { meta: state.meta, setMeta };
}
