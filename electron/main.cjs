const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

const isDev = !app.isPackaged;

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
    mainWindow.loadURL("http://localhost:3000");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  return mainWindow;
}

function buildMenu(mainWindow) {
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
      submenu: [
        {
          label: "О программе",
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: "info",
              title: "Ева-стиль",
              message: "Ева-стиль — Учётный пульт",
              detail: "Программа для управления салоном красоты «Ева-стиль».\n\nВерсия 1.0.4\nДанные хранятся локально на вашем компьютере.",
              buttons: ["OK"],
            });
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

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

function setupIpc(mainWindow) {
  ipcMain.handle("save-backup", async (_event, { fileName, content }) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Сохранить резервную копию",
      defaultPath: path.join(app.getPath("documents"), fileName),
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, content, "utf-8");
      return { success: true, path: result.filePath };
    }
    return { success: false };
  });
}

  app.whenReady().then(() => {
    const mainWindow = createWindow();
    buildMenu(mainWindow);
    setupIpc(mainWindow);

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
