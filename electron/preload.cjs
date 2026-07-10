const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("evaStyleDesktop", {
  platform: process.platform,
  isDesktop: true,
  version: "1.0.5",
  saveBackup: (payload) => ipcRenderer.invoke("save-backup", payload),
});
