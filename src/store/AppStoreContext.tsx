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

interface AppStoreContextValue {
  state: AppStoreState;
  patch: (payload: AppStorePatch) => void;
  setMaterialPackaging: (packaging: AppStoreState["materialPackaging"]) => void;
  importBackup: (payload: AppBackupPayload) => void;
  resetApp: (mode: ResetAppMode) => void;
  buildBackupPayload: () => AppBackupPayload;
}

const AppStoreContext = createContext<AppStoreContextValue | null>(null);

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

  const patch = useCallback((payload: AppStorePatch) => {
    dispatch({ type: "PATCH", payload });
  }, []);

  const setMaterialPackaging = useCallback((packaging: AppStoreState["materialPackaging"]) => {
    dispatch({ type: "SET_MATERIAL_PACKAGING", payload: packaging });
  }, []);

  const importBackup = useCallback((payload: AppBackupPayload) => {
    dispatch({ type: "IMPORT_BACKUP", payload });
  }, []);

  const resetApp = useCallback((mode: ResetAppMode) => {
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
      patch,
      setMaterialPackaging,
      importBackup,
      resetApp,
      buildBackupPayload,
    }),
    [state, patch, setMaterialPackaging, importBackup, resetApp, buildBackupPayload]
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
  const { state, patch } = useAppStore();

  const setValue = useCallback(
    (value: AppStoreState[K] | ((prev: AppStoreState[K]) => AppStoreState[K])) => {
      const next = typeof value === "function"
        ? (value as (prev: AppStoreState[K]) => AppStoreState[K])(state[key])
        : value;
      patch({ [key]: next } as AppStorePatch);
    },
    [key, patch, state]
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
