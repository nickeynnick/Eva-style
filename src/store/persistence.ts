import { AppStoreState, STORE_SCHEMA_VERSION, STORE_STORAGE_KEY } from "./schema";
import {
  applyStoreMigrations,
  createDefaultState,
  migrateFromLegacyStorage,
} from "./migrations";

type DesktopStoreApi = {
  isDesktop?: boolean;
  loadStoreSync?: () => {
    success: boolean;
    payload?: string | null;
    error?: string;
    info?: Record<string, unknown>;
  };
  saveStoreSync?: (payload: { json: string; schemaVersion: number }) => {
    success: boolean;
    error?: string;
  };
  saveStore?: (payload: { json: string; schemaVersion: number }) => Promise<{
    success: boolean;
    error?: string;
  }>;
  getDataStoreInfo?: () => Promise<Record<string, unknown>>;
  openDataStoreFolder?: () => Promise<{ success: boolean; path?: string; error?: string }>;
};

function getDesktop(): DesktopStoreApi | undefined {
  return (window as { evaStyleDesktop?: DesktopStoreApi }).evaStyleDesktop;
}

export function isDesktopDurableStore(): boolean {
  const desktop = getDesktop();
  return Boolean(desktop?.isDesktop && desktop.loadStoreSync && desktop.saveStoreSync);
}

function parseStoreRaw(raw: string | null | undefined): AppStoreState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AppStoreState;
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.visits)) {
      return applyStoreMigrations({ ...parsed, schemaVersion: parsed.schemaVersion ?? 1 });
    }
  } catch {
    // ignore
  }
  return null;
}

function loadFromLocalStorage(): AppStoreState | null {
  return parseStoreRaw(localStorage.getItem(STORE_STORAGE_KEY));
}

function loadFromLegacyOrDefault(): AppStoreState {
  const hasLegacy = localStorage.getItem("eva_style_visits") !== null;
  if (hasLegacy) {
    return migrateFromLegacyStorage();
  }
  const initialized = localStorage.getItem("eva_style_app_initialized") === "1";
  return applyStoreMigrations(createDefaultState(initialized));
}

function writeLocalStorageMirror(state: AppStoreState): void {
  const payload: AppStoreState = {
    ...state,
    schemaVersion: STORE_SCHEMA_VERSION,
  };
  try {
    localStorage.setItem(STORE_STORAGE_KEY, JSON.stringify(payload));
    localStorage.setItem("eva_style_app_initialized", "1");
    localStorage.setItem("eva_style_owner_password", state.meta.ownerPassword);
    if (state.meta.lastAutoBackupDate) {
      localStorage.setItem("eva_style_last_auto_backup", state.meta.lastAutoBackupDate);
    }
    if (state.meta.seenAppVersion) {
      localStorage.setItem("eva_style_seen_version", state.meta.seenAppVersion);
    }
  } catch {
    // Квота localStorage при большом журнале — файл SQLite остаётся источником истины.
  }
}

function writeDesktopStore(state: AppStoreState, immediate: boolean): void {
  const desktop = getDesktop();
  if (!desktop?.isDesktop) return;

  const json = JSON.stringify({
    ...state,
    schemaVersion: STORE_SCHEMA_VERSION,
  });
  const payload = { json, schemaVersion: STORE_SCHEMA_VERSION };

  if (immediate && desktop.saveStoreSync) {
    const result = desktop.saveStoreSync(payload);
    if (!result?.success && typeof console !== "undefined") {
      console.error("[eva-style] Не удалось сохранить SQLite:", result?.error);
    }
    return;
  }

  if (desktop.saveStore) {
    void desktop.saveStore(payload).then((result) => {
      if (!result?.success && typeof console !== "undefined") {
        console.error("[eva-style] Не удалось сохранить SQLite:", result?.error);
      }
    });
    return;
  }

  if (desktop.saveStoreSync) {
    desktop.saveStoreSync(payload);
  }
}

export function loadAppStore(): AppStoreState {
  const desktop = getDesktop();

  // Windows-приложение: SQLite — основной источник; localStorage — зеркало / миграция.
  if (desktop?.isDesktop && desktop.loadStoreSync) {
    try {
      const disk = desktop.loadStoreSync();
      if (disk?.success && disk.payload) {
        const fromDisk = parseStoreRaw(disk.payload);
        if (fromDisk) {
          writeLocalStorageMirror(fromDisk);
          return fromDisk;
        }
      }
    } catch (error) {
      if (typeof console !== "undefined") {
        console.error("[eva-style] Ошибка чтения SQLite, пробуем localStorage:", error);
      }
    }

    const fromLs = loadFromLocalStorage();
    if (fromLs) {
      writeDesktopStore(fromLs, true);
      return fromLs;
    }

    const created = loadFromLegacyOrDefault();
    writeDesktopStore(created, true);
    writeLocalStorageMirror(created);
    return created;
  }

  const fromLs = loadFromLocalStorage();
  if (fromLs) return fromLs;
  return loadFromLegacyOrDefault();
}

let persistTimer: ReturnType<typeof setTimeout> | null = null;

export function persistAppStore(state: AppStoreState, immediate = false): void {
  const write = () => {
    writeLocalStorageMirror(state);
    writeDesktopStore(state, true);
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

export async function getDurableStoreInfo(): Promise<Record<string, unknown> | null> {
  const desktop = getDesktop();
  if (!desktop?.isDesktop || !desktop.getDataStoreInfo) return null;
  try {
    return await desktop.getDataStoreInfo();
  } catch {
    return null;
  }
}

export async function openDurableStoreFolder(): Promise<{
  success: boolean;
  path?: string;
  error?: string;
}> {
  const desktop = getDesktop();
  if (!desktop?.isDesktop || !desktop.openDataStoreFolder) {
    return { success: false, error: "Доступно только в Windows-приложении" };
  }
  return desktop.openDataStoreFolder();
}
