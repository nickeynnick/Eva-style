const { app, BrowserWindow, Menu, shell, dialog, ipcMain, session } = require("electron");
const path = require("path");
const fs = require("fs");
const { setupAutoUpdater } = require("./updater.cjs");
const {
  initDataStore,
  loadStorePayload,
  saveStorePayload,
  getDataStoreInfo,
} = require("./dataStore.cjs");

const isDev = !app.isPackaged;
const isPortable = !!process.env.PORTABLE_EXECUTABLE_DIR;
const APP_VERSION = app.getVersion();

// В dev Vite нужен unsafe-eval (HMR) — без этого CSP Electron всё равно ругается.
if (isDev) {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";
}

// Разрешить звук запуска/кликов без предварительного жеста (desktop-приложение).
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

let updaterControls = null;

/** CSP для окна: в сборке без unsafe-eval; в dev — с послаблениями под Vite. */
function installContentSecurityPolicy() {
  const csp = isDev
    ? [
        "default-src 'self' http://localhost:3000 http://127.0.0.1:3000",
        "script-src 'self' 'unsafe-eval' 'unsafe-inline' http://localhost:3000 http://127.0.0.1:3000",
        "style-src 'self' 'unsafe-inline' http://localhost:3000 http://127.0.0.1:3000",
        "img-src 'self' data: blob: http://localhost:3000 http://127.0.0.1:3000",
        "media-src 'self' blob: data: http://localhost:3000 http://127.0.0.1:3000",
        "font-src 'self' data:",
        "connect-src 'self' http://localhost:3000 http://127.0.0.1:3000 ws://localhost:3000 ws://127.0.0.1:3000",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; ")
    : [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "media-src 'self' blob: data:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ].join("; ");

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [csp],
      },
    });
  });
}

function getAppRootDir() {
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    return process.env.PORTABLE_EXECUTABLE_DIR;
  }
  if (app.isPackaged) {
    return path.dirname(process.execPath);
  }
  return path.join(__dirname, "..");
}

function ensureWritableDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const probe = path.join(dir, ".write-test");
  fs.writeFileSync(probe, "ok", "utf-8");
  fs.unlinkSync(probe);
  return dir;
}

/** Папка CrashLogs рядом с программой; если нет прав — Документы/Ева-стиль/CrashLogs. */
function getCrashLogsDir() {
  const primary = path.join(getAppRootDir(), "CrashLogs");
  try {
    return ensureWritableDir(primary);
  } catch {
    const fallback = path.join(app.getPath("documents"), "Ева-стиль", "CrashLogs");
    return ensureWritableDir(fallback);
  }
}

function writeCrashLogFile(payload = {}) {
  const dir = getCrashLogsDir();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const kind = String(payload.kind || "crash").replace(/[^\w.-]+/g, "_").slice(0, 40);
  const filePath = path.join(dir, `crash_${stamp}_${kind}.txt`);
  const lines = [
    `Ева-стиль crash log`,
    `version: ${APP_VERSION}`,
    `when: ${new Date().toISOString()}`,
    `kind: ${payload.kind || "crash"}`,
    `platform: ${process.platform}`,
    `packaged: ${app.isPackaged}`,
    `portable: ${isPortable}`,
    `dir: ${dir}`,
    "",
    String(payload.message || ""),
    "",
    payload.stack ? String(payload.stack) : "",
    "",
    payload.extra ? (typeof payload.extra === "string" ? payload.extra : JSON.stringify(payload.extra, null, 2)) : "",
  ];
  fs.writeFileSync(filePath, lines.filter((l, i, a) => !(l === "" && a[i - 1] === "")).join("\n"), "utf-8");
  return { success: true, path: filePath, dir };
}

function installMainCrashHandlers() {
  const save = (kind, error) => {
    try {
      writeCrashLogFile({
        kind,
        message: error && error.message ? error.message : String(error),
        stack: error && error.stack ? error.stack : String(error),
      });
    } catch {
      // ignore secondary failures
    }
  };

  process.on("uncaughtException", (error) => save("main-uncaughtException", error));
  process.on("unhandledRejection", (reason) => {
    save("main-unhandledRejection", reason instanceof Error ? reason : new Error(String(reason)));
  });
}

function refocusMainWindow(mainWindow) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.focus();
  mainWindow.webContents.focus();
}

function showMessageBox(mainWindow, options) {
  return dialog.showMessageBox(mainWindow, options).then((result) => {
    refocusMainWindow(mainWindow);
    return result;
  });
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: "Ева-стиль — Учётный пульт",
    show: false,
    autoHideMenuBar: false,
    icon: path.join(__dirname, "../build/icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      additionalArguments: [`--eva-version=${APP_VERSION}`],
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    mainWindow.loadURL("http://127.0.0.1:3000");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  return mainWindow;
}

function buildMenu(mainWindow) {
  const helpSubmenu = [
    {
      label: "О программе",
      click: () => {
        const updateNote = isPortable
          ? "\n\nАвтообновление доступно только в установленной версии."
          : "\n\nОбновления проверяются автоматически при запуске.";
        showMessageBox(mainWindow, {
          type: "info",
          title: "Ева-стиль",
          message: "Ева-стиль — Учётный пульт",
          detail: `Программа для управления салоном красоты «Ева-стиль».\n\nВерсия ${APP_VERSION}\nДанные хранятся локально на вашем компьютере.${updateNote}`,
          buttons: ["OK"],
        });
      },
    },
  ];

  if (!isDev && !isPortable && updaterControls) {
    helpSubmenu.unshift({
      label: "Проверить обновления",
      click: () => updaterControls.checkForUpdates(true),
    });
  }

  const template = [
    {
      label: "Файл",
      submenu: [
        {
          label: "Перезагрузить",
          accelerator: "CmdOrCtrl+R",
          click: () => mainWindow.webContents.reload(),
        },
        { type: "separator" },
        {
          label: "Выход",
          accelerator: "Alt+F4",
          click: () => app.quit(),
        },
      ],
    },
    {
      label: "Вид",
      submenu: [
        {
          label: "Увеличить",
          accelerator: "CmdOrCtrl+Plus",
          click: () => {
            const zoom = mainWindow.webContents.getZoomFactor();
            mainWindow.webContents.setZoomFactor(Math.min(zoom + 0.1, 2));
          },
        },
        {
          label: "Уменьшить",
          accelerator: "CmdOrCtrl+-",
          click: () => {
            const zoom = mainWindow.webContents.getZoomFactor();
            mainWindow.webContents.setZoomFactor(Math.max(zoom - 0.1, 0.5));
          },
        },
        {
          label: "Сбросить масштаб",
          accelerator: "CmdOrCtrl+0",
          click: () => mainWindow.webContents.setZoomFactor(1),
        },
        { type: "separator" },
        {
          label: "Полный экран",
          accelerator: "F11",
          click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen()),
        },
      ],
    },
    {
      label: "Справка",
      submenu: helpSubmenu,
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function setupIpc(mainWindow) {
  ipcMain.handle("save-backup", async (_event, { fileName, content }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Сохранить резервную копию",
      defaultPath: path.join(app.getPath("documents"), fileName),
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    refocusMainWindow(mainWindow);
    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, content, "utf-8");
      return { success: true, path: result.filePath };
    }
    return { success: false };
  });

  ipcMain.handle("auto-save-backup", async (_event, { fileName, content, keepLast = 10 }) => {
    const backupDir = path.join(app.getPath("documents"), "Ева-стиль", "Backups");
    fs.mkdirSync(backupDir, { recursive: true });
    const filePath = path.join(backupDir, fileName);
    fs.writeFileSync(filePath, content, "utf-8");

    const keep = Math.max(1, Number(keepLast) || 10);
    let pruned = 0;
    try {
      const autoFiles = fs
        .readdirSync(backupDir)
        .filter((name) => /^eva_style_auto_.*\.json$/i.test(name))
        .map((name) => {
          const full = path.join(backupDir, name);
          return { name, full, mtime: fs.statSync(full).mtimeMs };
        })
        .sort((a, b) => b.mtime - a.mtime);

      for (const old of autoFiles.slice(keep)) {
        try {
          fs.unlinkSync(old.full);
          pruned += 1;
        } catch {
          // ignore locked/missing
        }
      }
    } catch {
      // rotation failed — backup file itself is still written
    }

    return { success: true, path: filePath, pruned, keepLast: keep };
  });

  ipcMain.handle("check-for-updates", async () => {
    if (isDev) return { status: "dev" };
    if (isPortable) return { status: "portable" };
    if (!updaterControls) return { status: "unavailable" };
    await updaterControls.checkForUpdates(true);
    return { status: "checking" };
  });

  ipcMain.handle("focus-window", () => {
    refocusMainWindow(mainWindow);
    return { success: true };
  });

  ipcMain.handle("write-crash-log", (_event, payload) => {
    try {
      return writeCrashLogFile(payload || {});
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle("open-crash-logs", async () => {
    try {
      const dir = getCrashLogsDir();
      const err = await shell.openPath(dir);
      if (err) return { success: false, path: dir, error: err };
      return { success: true, path: dir };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle("get-crash-logs-path", () => {
    try {
      const dir = getCrashLogsDir();
      return { success: true, path: dir };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.on("store-load-sync", (event) => {
    try {
      const loaded = loadStorePayload();
      event.returnValue = {
        success: true,
        payload: loaded.payload,
        updatedAt: loaded.updatedAt,
        info: getDataStoreInfo(),
      };
    } catch (error) {
      event.returnValue = {
        success: false,
        payload: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.on("store-save-sync", (event, payload) => {
    try {
      const result = saveStorePayload(
        typeof payload === "string" ? payload : payload?.json,
        typeof payload === "object" && payload ? payload.schemaVersion : undefined
      );
      event.returnValue = { ...result, info: getDataStoreInfo() };
    } catch (error) {
      event.returnValue = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle("store-save", (_event, payload) => {
    try {
      const result = saveStorePayload(
        typeof payload === "string" ? payload : payload?.json,
        typeof payload === "object" && payload ? payload.schemaVersion : undefined
      );
      return { ...result, info: getDataStoreInfo() };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle("get-data-store-info", () => {
    try {
      return { success: true, ...getDataStoreInfo() };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

  ipcMain.handle("open-data-store-folder", async () => {
    try {
      const info = getDataStoreInfo();
      const dir = info.dir;
      if (!dir) return { success: false, error: "Папка данных ещё не готова" };
      fs.mkdirSync(dir, { recursive: true });
      const err = await shell.openPath(dir);
      if (err) return { success: false, path: dir, error: err };
      return { success: true, path: dir };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
}

installMainCrashHandlers();

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const win = windows[0];
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      await initDataStore(app);
    } catch (error) {
      writeCrashLogFile({
        kind: "data-store-init",
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    }

    installContentSecurityPolicy();
    const mainWindow = createWindow();
    setupIpc(mainWindow);

    mainWindow.webContents.on("render-process-gone", (_event, details) => {
      writeCrashLogFile({
        kind: "render-process-gone",
        message: `reason=${details.reason} exitCode=${details.exitCode}`,
        extra: details,
      });
    });

    if (!isDev && !isPortable) {
      updaterControls = setupAutoUpdater(mainWindow, APP_VERSION, {
        writeCrashLog: writeCrashLogFile,
      });
    }

    buildMenu(mainWindow);

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
