const { dialog } = require("electron");
const { autoUpdater } = require("electron-updater");

/**
 * Извлекает текст списка изменений из ответа electron-updater.
 * releaseNotes может быть строкой или массивом объектов [{note: "..."}].
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

function setupAutoUpdater(mainWindow, appVersion) {
  let manualCheck = false;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  // Если задан GH_TOKEN (приватный репо), передаём его апдейтеру
  if (process.env.GH_TOKEN) {
    autoUpdater.requestHeaders = {
      Authorization: `Bearer ${process.env.GH_TOKEN}`,
    };
  }

  autoUpdater.on("update-available", (info) => {
    manualCheck = false;
    const changelog = formatReleaseNotes(info);
    const detail = `Текущая версия: ${appVersion}` +
      (changelog ? `\n\nСписок изменений:\n${changelog}` : "") +
      `\n\nСкачать и установить обновление?`;

    dialog
      .showMessageBox(mainWindow, {
        type: "info",
        title: "Доступно обновление",
        message: `Доступна новая версия ${info.version}`,
        detail,
        buttons: ["Скачать", "Позже"],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.downloadUpdate();
        }
      });
  });

  autoUpdater.on("update-not-available", () => {
    if (!manualCheck) return;
    manualCheck = false;
    dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "Обновления",
      message: "У вас установлена последняя версия.",
      detail: `Версия ${appVersion}`,
      buttons: ["OK"],
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    const changelog = formatReleaseNotes(info);
    const detail = (changelog ? `Список изменений:\n${changelog}\n\n` : "") +
      "Перезапустить программу для установки обновления?";

    dialog
      .showMessageBox(mainWindow, {
        type: "info",
        title: "Обновление готово",
        message: `Версия ${info.version} скачана.`,
        detail,
        buttons: ["Перезапустить", "Позже"],
        defaultId: 0,
        cancelId: 1,
      })
      .then(({ response }) => {
        if (response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
  });

  autoUpdater.on("error", (error) => {
    if (!manualCheck) return;
    manualCheck = false;
    const hint = error?.message?.includes("404")
      ? "\n\nУбедитесь, что репозиторий публичный или задан GH_TOKEN."
      : "";
    dialog.showMessageBox(mainWindow, {
      type: "error",
      title: "Ошибка обновления",
      message: "Не удалось проверить обновления.",
      detail: (error?.message || "Проверьте подключение к интернету.") + hint,
      buttons: ["OK"],
    });
  });

  const checkForUpdates = (manual = false) => {
    manualCheck = manual;
    return autoUpdater.checkForUpdates().catch((error) => {
      if (manual) {
        manualCheck = false;
        const hint = error?.message?.includes("404")
          ? "\n\nУбедитесь, что репозиторий публичный или задан GH_TOKEN."
          : "";
        dialog.showMessageBox(mainWindow, {
          type: "error",
          title: "Ошибка обновления",
          message: "Не удалось проверить обновления.",
          detail: (error?.message || "Проверьте подключение к интернету.") + hint,
          buttons: ["OK"],
        });
      }
    });
  };

  // Проверка при запуске (через 5 секунд, без уведомления если версия актуальна)
  setTimeout(() => checkForUpdates(false), 5000);

  return { checkForUpdates };
}

module.exports = { setupAutoUpdater };
