const { ipcMain } = require("electron");
const { autoUpdater } = require("electron-updater");
const { fetchGitHubStatus } = require("./githubStatus.cjs");

/**
 * Извлекает текст списка изменений из ответа electron-updater.
 */
function formatReleaseNotes(info) {
  const notes = info?.releaseNotes;
  if (!notes) return "";
  if (typeof notes === "string") return notes;
  if (Array.isArray(notes)) {
    return notes.map((item) => (typeof item === "string" ? item : item?.note || "")).join("\n");
  }
  return "";
}

function sendUpdateEvent(mainWindow, payload) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    mainWindow.webContents.send("updater:event", payload);
  } catch {
    // окно уже закрыто
  }
}

/**
 * @param {Electron.BrowserWindow} mainWindow
 * @param {string} appVersion
 * @param {{ writeCrashLog?: (payload: object) => void }} [options]
 */
function setupAutoUpdater(mainWindow, appVersion, options = {}) {
  let manualCheck = false;
  let downloadStarted = false;
  let statusRequestId = 0;
  const writeCrashLog =
    typeof options.writeCrashLog === "function" ? options.writeCrashLog : null;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;

  if (process.env.GH_TOKEN) {
    autoUpdater.requestHeaders = {
      Authorization: `Bearer ${process.env.GH_TOKEN}`,
    };
  }

  const logUpdaterFailure = (phase, error, extra = {}) => {
    if (!writeCrashLog) return;
    try {
      writeCrashLog({
        kind: phase === "download" ? "updater-download-error" : "updater-check-error",
        message: error?.message || String(error || "unknown updater error"),
        stack: error?.stack,
        extra: {
          phase,
          appVersion,
          ...extra,
        },
      });
    } catch {
      // ignore secondary failures
    }
  };

  const pushGitHubStatus = () => {
    const requestId = ++statusRequestId;
    fetchGitHubStatus().then((status) => {
      if (requestId !== statusRequestId) return;
      sendUpdateEvent(mainWindow, { type: "github-status", ...status });
    });
  };

  autoUpdater.on("checking-for-update", () => {
    if (manualCheck) {
      sendUpdateEvent(mainWindow, { type: "checking", currentVersion: appVersion });
      pushGitHubStatus();
    }
  });

  autoUpdater.on("update-available", (info) => {
    downloadStarted = false;
    mainWindow.setProgressBar(-1);
    sendUpdateEvent(mainWindow, {
      type: "available",
      version: info.version,
      currentVersion: appVersion,
      releaseNotes: formatReleaseNotes(info),
      manual: manualCheck,
    });
    manualCheck = false;
  });

  autoUpdater.on("download-progress", (progress) => {
    if (!downloadStarted) return;
    const fraction = Math.min(1, Math.max(0, progress.percent / 100));
    mainWindow.setProgressBar(fraction);
    const pct = Math.round(progress.percent);
    mainWindow.setTitle(`Ева-стиль — Учётный пульт (загрузка: ${pct}%)`);
    sendUpdateEvent(mainWindow, {
      type: "progress",
      percent: progress.percent,
      transferred: progress.transferred,
      total: progress.total,
      bytesPerSecond: progress.bytesPerSecond,
    });
  });

  autoUpdater.on("update-not-available", () => {
    mainWindow.setProgressBar(-1);
    if (!manualCheck) return;
    manualCheck = false;
    sendUpdateEvent(mainWindow, {
      type: "not-available",
      currentVersion: appVersion,
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    downloadStarted = false;
    mainWindow.setProgressBar(-1);
    mainWindow.setTitle("Ева-стиль — Учётный пульт");
    sendUpdateEvent(mainWindow, {
      type: "downloaded",
      version: info.version,
      releaseNotes: formatReleaseNotes(info),
    });
  });

  autoUpdater.on("error", (error) => {
    const wasDownloading = downloadStarted;
    const wasManual = manualCheck;
    const phase = wasDownloading ? "download" : "check";
    logUpdaterFailure(phase, error, { manual: wasManual, source: "autoUpdater.error" });

    if (!manualCheck && !downloadStarted) return;

    manualCheck = false;
    downloadStarted = false;
    mainWindow.setProgressBar(-1);
    mainWindow.setTitle("Ева-стиль — Учётный пульт");
    const hint = error?.message?.includes("404")
      ? "\n\nУбедитесь, что репозиторий публичный или задан GH_TOKEN."
      : "";
    sendUpdateEvent(mainWindow, {
      type: "error",
      phase,
      message: (error?.message || "Проверьте подключение к интернету.") + hint,
    });
    if (wasManual || wasDownloading) pushGitHubStatus();
  });

  const downloadUpdate = () => {
    if (downloadStarted) return { ok: true, already: true };
    downloadStarted = true;
    sendUpdateEvent(mainWindow, { type: "download-started" });
    autoUpdater.downloadUpdate().catch((error) => {
      downloadStarted = false;
      mainWindow.setProgressBar(-1);
      mainWindow.setTitle("Ева-стиль — Учётный пульт");
      const hint = error?.message?.includes("404")
        ? "\n\nУбедитесь, что репозиторий публичный или задан GH_TOKEN."
        : "";
      logUpdaterFailure("download", error, { manual: true, source: "downloadUpdate.catch" });
      sendUpdateEvent(mainWindow, {
        type: "error",
        phase: "download",
        message: (error?.message || "Не удалось начать загрузку.") + hint,
      });
      pushGitHubStatus();
    });
    return { ok: true };
  };

  const installUpdate = () => {
    autoUpdater.quitAndInstall();
    return { ok: true };
  };

  ipcMain.removeHandler("updater:download");
  ipcMain.removeHandler("updater:install");
  ipcMain.handle("updater:download", () => downloadUpdate());
  ipcMain.handle("updater:install", () => installUpdate());

  const checkForUpdates = (manual = false) => {
    manualCheck = manual;
    return autoUpdater.checkForUpdates().catch((error) => {
      logUpdaterFailure("check", error, { manual, source: "checkForUpdates.catch" });
      if (manual) {
        manualCheck = false;
        mainWindow.setProgressBar(-1);
        const hint = error?.message?.includes("404")
          ? "\n\nУбедитесь, что репозиторий публичный или задан GH_TOKEN."
          : "";
        sendUpdateEvent(mainWindow, {
          type: "error",
          phase: "check",
          message: (error?.message || "Проверьте подключение к интернету.") + hint,
        });
        pushGitHubStatus();
      }
    });
  };

  setTimeout(() => checkForUpdates(false), 5000);

  return { checkForUpdates, downloadUpdate, installUpdate };
}

module.exports = { setupAutoUpdater };
