const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("evaStyleDesktop", {
  platform: process.platform,
  isDesktop: true,
  version: "1.0.4",
});
