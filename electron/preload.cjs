const { contextBridge, ipcRenderer } = require("electron");

function readAppVersion() {
  const prefix = "--eva-version=";
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : "0.0.0";
}

const version = readAppVersion();

contextBridge.exposeInMainWorld("evaStyleDesktop", {
  platform: process.platform,
  isDesktop: true,
  version,
  isPortable: !!process.env.PORTABLE_EXECUTABLE_DIR,
  saveBackup: (payload) => ipcRenderer.invoke("save-backup", payload),
  autoSaveBackup: (payload) => ipcRenderer.invoke("auto-save-backup", payload),
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  downloadUpdate: () => ipcRenderer.invoke("updater:download"),
  installUpdate: () => ipcRenderer.invoke("updater:install"),
  onUpdaterEvent: (callback) => {
    if (typeof callback !== "function") return () => {};
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on("updater:event", listener);
    return () => ipcRenderer.removeListener("updater:event", listener);
  },
  focusWindow: () => ipcRenderer.invoke("focus-window"),
  writeCrashLog: (payload) => ipcRenderer.invoke("write-crash-log", payload),
  openCrashLogs: () => ipcRenderer.invoke("open-crash-logs"),
  getCrashLogsPath: () => ipcRenderer.invoke("get-crash-logs-path"),
  loadStoreSync: () => ipcRenderer.sendSync("store-load-sync"),
  saveStoreSync: (payload) => ipcRenderer.sendSync("store-save-sync", payload),
  saveStore: (payload) => ipcRenderer.invoke("store-save", payload),
  getDataStoreInfo: () => ipcRenderer.invoke("get-data-store-info"),
  openDataStoreFolder: () => ipcRenderer.invoke("open-data-store-folder"),
});
