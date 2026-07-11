import { captureAppFocus, restoreAppFocus } from "./restoreAppFocus";

export interface AppDialogHostApi {
  alert: (message: string) => Promise<void>;
  confirm: (message: string) => Promise<boolean>;
  prompt: (message: string, defaultValue?: string) => Promise<string | null>;
}

let host: AppDialogHostApi | null = null;

export function registerAppDialogHost(api: AppDialogHostApi | null): void {
  host = api;
}

function fallbackAlert(message: string): void {
  window.alert(message);
  restoreAppFocus();
}

function fallbackConfirm(message: string): boolean {
  const result = window.confirm(message);
  restoreAppFocus();
  return result;
}

function fallbackPrompt(message: string, defaultValue = ""): string | null {
  const result = window.prompt(message, defaultValue);
  restoreAppFocus();
  return result;
}

/** Показать сообщение (в приложении, без нативного alert). */
export function showAppAlert(message: string): void {
  if (host) {
    captureAppFocus();
    void host.alert(message);
    return;
  }
  fallbackAlert(message);
}

export function showAppConfirm(message: string): boolean {
  if (host) {
    console.warn("showAppConfirm: используйте showAppConfirmAsync в React-компонентах");
  }
  return fallbackConfirm(message);
}

export async function showAppConfirmAsync(message: string): Promise<boolean> {
  if (host) {
    captureAppFocus();
    return host.confirm(message);
  }
  return fallbackConfirm(message);
}

export function showAppPrompt(message: string, defaultValue = ""): string | null {
  if (host) {
    console.warn("showAppPrompt: используйте showAppPromptAsync");
  }
  return fallbackPrompt(message, defaultValue);
}

export async function showAppPromptAsync(message: string, defaultValue = ""): Promise<string | null> {
  if (host) {
    captureAppFocus();
    return host.prompt(message, defaultValue);
  }
  return fallbackPrompt(message, defaultValue);
}

export function isAppDialogHostReady(): boolean {
  return host !== null;
}
