import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

export type EvaStyleDesktopApi = {
  platform: string;
  isDesktop: true;
  version: string;
  isPortable: boolean;
  saveBackup: (payload: {
    fileName: string;
    content: string;
  }) => Promise<{ success: boolean; path?: string; error?: string }>;
  autoSaveBackup: (payload: {
    fileName: string;
    content: string;
    keepLast?: number;
  }) => Promise<{
    success: boolean;
    path?: string;
    pruned?: number;
    keepLast?: number;
    error?: string;
  }>;
  checkForUpdates: () => Promise<{ status: string }>;
  downloadUpdate: () => Promise<{ ok?: boolean; error?: string }>;
  installUpdate: () => Promise<{ ok?: boolean; error?: string }>;
  onUpdaterEvent: (callback: (payload: unknown) => void) => () => void;
  focusWindow: () => Promise<{ success: boolean }>;
  writeCrashLog: (payload: {
    kind?: string;
    message?: string;
    stack?: string;
    extra?: unknown;
  }) => Promise<{ success: boolean; path?: string; dir?: string; error?: string }>;
  openCrashLogs: () => Promise<{ success: boolean; path?: string; error?: string }>;
  getCrashLogsPath: () => Promise<{ success: boolean; path?: string; error?: string }>;
  loadStoreSync: () => {
    success: boolean;
    payload?: string | null;
    error?: string;
    info?: Record<string, unknown>;
  };
  saveStoreSync: (payload: { json: string; schemaVersion: number }) => {
    success: boolean;
    error?: string;
  };
  saveStore: (payload: {
    json: string;
    schemaVersion: number;
  }) => Promise<{ success: boolean; error?: string }>;
  getDataStoreInfo: () => Promise<Record<string, unknown>>;
  openDataStoreFolder: () => Promise<{ success: boolean; path?: string; error?: string }>;
};

declare global {
  interface Window {
    evaStyleDesktop?: EvaStyleDesktopApi;
  }
}

type StoreCache = {
  success: boolean;
  payload?: string | null;
  error?: string;
  info?: Record<string, unknown>;
};

function isTauriRuntime(): boolean {
  return (
    typeof window !== "undefined" &&
    // Tauri 2
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  );
}

export function isTauriDesktop(): boolean {
  return isTauriRuntime();
}

/**
 * Поднимает window.evaStyleDesktop — единый desktop API для UI.
 * loadStoreSync читает кэш, загруженный при старте; saveStoreSync пишет в SQLite через invoke.
 */
export async function installTauriDesktopBridge(): Promise<boolean> {
  if (!isTauriRuntime()) return false;

  const meta = await invoke<{
    platform: string;
    isDesktop: boolean;
    version: string;
    isPortable: boolean;
  }>("get_desktop_meta");

  let storeCache: StoreCache = await invoke("store_load");

  let updaterUnlisten: UnlistenFn | null = null;
  const updaterListeners = new Set<(payload: unknown) => void>();

  const ensureUpdaterListen = async () => {
    if (updaterUnlisten) return;
    updaterUnlisten = await listen("updater:event", (event) => {
      for (const cb of updaterListeners) {
        cb(event.payload);
      }
    });
  };

  let saveQueue: Promise<void> = Promise.resolve();
  const enqueueSave = (payload: { json: string; schemaVersion: number }) => {
    storeCache = {
      success: true,
      payload: payload.json,
      info: storeCache.info,
    };
    saveQueue = saveQueue
      .then(async () => {
        const result = await invoke<{ success: boolean; error?: string; info?: Record<string, unknown> }>(
          "store_save",
          { payload }
        );
        if (result?.info) {
          storeCache = { ...storeCache, info: result.info, success: result.success, error: result.error };
        }
        if (!result?.success && typeof console !== "undefined") {
          console.error("[eva-style] Не удалось сохранить SQLite:", result?.error);
        }
      })
      .catch((error) => {
        if (typeof console !== "undefined") {
          console.error("[eva-style] Ошибка сохранения SQLite:", error);
        }
      });
    return saveQueue;
  };

  const api: EvaStyleDesktopApi = {
    platform: meta.platform || "windows",
    isDesktop: true,
    version: meta.version || "0.0.0",
    isPortable: Boolean(meta.isPortable),
    saveBackup: (payload) =>
      invoke("save_backup", {
        payload: { fileName: payload.fileName, content: payload.content },
      }),
    autoSaveBackup: (payload) =>
      invoke("auto_save_backup_cmd", {
        payload: {
          fileName: payload.fileName,
          content: payload.content,
          keepLast: payload.keepLast ?? 10,
        },
      }),
    checkForUpdates: () => invoke("check_for_updates"),
    downloadUpdate: () => invoke("download_update"),
    installUpdate: () => invoke("install_update"),
    onUpdaterEvent: (callback) => {
      if (typeof callback !== "function") return () => {};
      updaterListeners.add(callback);
      void ensureUpdaterListen();
      return () => {
        updaterListeners.delete(callback);
      };
    },
    focusWindow: async () => {
      try {
        await getCurrentWindow().setFocus();
      } catch {
        // fallback на команду Rust
      }
      return invoke("focus_window");
    },
    writeCrashLog: (payload) => invoke("write_crash_log_cmd", { payload }),
    openCrashLogs: () => invoke("open_crash_logs"),
    getCrashLogsPath: () => invoke("get_crash_logs_path"),
    loadStoreSync: () => storeCache,
    saveStoreSync: (payload) => {
      void enqueueSave(payload);
      return { success: true };
    },
    saveStore: async (payload) => {
      await enqueueSave(payload);
      return { success: storeCache.success !== false, error: storeCache.error };
    },
    getDataStoreInfo: () => invoke("get_data_store_info"),
    openDataStoreFolder: () => invoke("open_data_store_folder"),
  };

  window.evaStyleDesktop = api;

  // Дождаться очереди сохранений при закрытии/обновлении страницы.
  window.addEventListener("pagehide", () => {
    void saveQueue;
  });

  return true;
}
