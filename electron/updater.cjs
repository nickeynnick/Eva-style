const { dialog } = require("electron");
const { autoUpdater } = require("electron-updater");

function setupAutoUpdater(mainWindow, appVersion) {
  let manualCheck = false;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    manualCheck = false;
    dialog
      .showMessageBox(mainWindow, {
        type: "info",
        title: "Доступно обновление",
        message: `Доступна новая версия ${info.version}`,
        detail: `Текущая версия: ${appVersion}\n\nСкачать и установить обновление?`,
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
    dialog
      .showMessageBox(mainWindow, {
        type: "info",
        title: "Обновление готово",
        message: `Версия ${info.version} скачана.`,
        detail: "Перезапустить программу для установки обновления?",
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
    dialog.showMessageBox(mainWindow, {
      type: "error",
      title: "Ошибка обновления",
      message: "Не удалось проверить обновления.",
      detail: error?.message || "Проверьте подключение к интернету.",
      buttons: ["OK"],
    });
  });

  const checkForUpdates = (manual = false) => {
    manualCheck = manual;
    return autoUpdater.checkForUpdates().catch((error) => {
      if (manual) {
        manualCheck = false;
        dialog.showMessageBox(mainWindow, {
          type: "error",
          title: "Ошибка обновления",
          message: "Не удалось проверить обновления.",
          detail: error?.message || "Проверьте подключение к интернету.",
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
