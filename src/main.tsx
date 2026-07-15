import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppStoreProvider } from "./store";
import { installDisableNumberInputWheel } from "./utils/disableNumberInputWheel";
import { applyTheme, getStoredTheme } from "./utils/theme";
import { applyUiZoom, getStoredUiZoom } from "./utils/uiZoom";
import { installCrashLogCapture } from "./utils/crashLog";
import { installTauriDesktopBridge } from "./desktop/tauriBridge";
import App from "./App.tsx";
import "./index.css";

async function bootstrap() {
  applyTheme(getStoredTheme());
  applyUiZoom(getStoredUiZoom());
  installDisableNumberInputWheel();

  try {
    await installTauriDesktopBridge();
  } catch (error) {
    console.error("[eva-style] Не удалось инициализировать Tauri bridge:", error);
  }

  installCrashLogCapture();

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <AppStoreProvider>
        <App />
      </AppStoreProvider>
    </StrictMode>
  );
}

void bootstrap();
