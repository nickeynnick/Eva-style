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
  focusWindow: () => ipcRenderer.invoke("focus-window"),
});
