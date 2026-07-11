import { AppStoreState, STORE_SCHEMA_VERSION, STORE_STORAGE_KEY } from "./schema";
import {
  applyStoreMigrations,
  createDefaultState,
  migrateFromLegacyStorage,
} from "./migrations";

export function loadAppStore(): AppStoreState {
  const raw = localStorage.getItem(STORE_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as AppStoreState;
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.visits)) {
        return applyStoreMigrations({ ...parsed, schemaVersion: parsed.schemaVersion ?? 1 });
      }
    } catch {
      // fall through to legacy migration
    }
  }

  const hasLegacy = localStorage.getItem("eva_style_visits") !== null;
  if (hasLegacy) {
    return migrateFromLegacyStorage();
  }

  const initialized = localStorage.getItem("eva_style_app_initialized") === "1";
  return applyStoreMigrations(createDefaultState(initialized));
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

export function persistAppStore(state: AppStoreState, immediate = false): void {
  const write = () => {
    const payload: AppStoreState = {
      ...state,
      schemaVersion: STORE_SCHEMA_VERSION,
    };
    localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(payload));
    localStorage.setItem("eva_style_app_initialized", "1");

    // Совместимость: owner password и seen version остаются отдельными ключами для простоты
    localStorage.setItem("eva_style_owner_password", state.meta.ownerPassword);
    if (state.meta.lastAutoBackupDate) {
      localStorage.setItem("eva_style_last_auto_backup", state.meta.lastAutoBackupDate);
    }
    if (state.meta.seenAppVersion) {
      localStorage.setItem("eva_style_seen_version", state.meta.seenAppVersion);
    }
  };

  if (immediate) {
    if (persistTimer) clearTimeout(persistTimer);
    write();
    return;
  }

  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(write, 250);
}

export function flushAppStore(state: AppStoreState): void {
  persistAppStore(state, true);
}
