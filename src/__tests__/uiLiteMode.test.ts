import { afterEach, describe, expect, it, vi } from "vitest";
import {
  UI_LITE_MODE_STORAGE_KEY,
  applyUiLiteMode,
  getStoredUiLiteMode,
} from "../utils/uiLiteMode";

function installDomStubs() {
  const store = new Map<string, string>();
  const attrs = new Map<string, string>();

  vi.stubGlobal("localStorage", {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  });
  vi.stubGlobal("document", {
    documentElement: {
      setAttribute: (name: string, value: string) => {
        attrs.set(name, value);
      },
      removeAttribute: (name: string) => {
        attrs.delete(name);
      },
      getAttribute: (name: string) => (attrs.has(name) ? attrs.get(name)! : null),
      hasAttribute: (name: string) => attrs.has(name),
    },
  });
  vi.stubGlobal("window", {
    dispatchEvent: () => true,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  });

  return { store, attrs };
}

describe("uiLiteMode", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to off", () => {
    installDomStubs();
    expect(getStoredUiLiteMode()).toBe(false);
  });

  it("enables and persists", () => {
    const { attrs } = installDomStubs();
    expect(applyUiLiteMode(true)).toBe(true);
    expect(attrs.get("data-eva-lite")).toBe("1");
    expect(localStorage.getItem(UI_LITE_MODE_STORAGE_KEY)).toBe("1");
    expect(getStoredUiLiteMode()).toBe(true);
  });

  it("disables and clears storage", () => {
    const { attrs } = installDomStubs();
    applyUiLiteMode(true);
    applyUiLiteMode(false);
    expect(attrs.has("data-eva-lite")).toBe(false);
    expect(localStorage.getItem(UI_LITE_MODE_STORAGE_KEY)).toBe(null);
  });
});
