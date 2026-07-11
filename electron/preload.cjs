const { contextBridge, ipcRenderer } = require("electron");
const { version } = require("../package.json");

contextBridge.exposeInMainWorld("evaStyleDesktop", {
  platform: process.platform,
  isDesktop: true,
  version,
  isPortable: !!process.env.PORTABLE_EXECUTABLE_DIR,
  saveBackup: (payload) => ipcRenderer.invoke("save-backup", payload),
  autoSaveBackup: (payload) => ipcRenderer.invoke("auto-save-backup", payload),
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
});
