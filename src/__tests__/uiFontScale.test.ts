import { afterEach, describe, expect, it, vi } from "vitest";
import {
  UI_FONT_SCALE_STORAGE_KEY,
  applyUiFontScale,
  formatUiFontScale,
  getStoredUiFontScale,
} from "../utils/uiFontScale";

function installDomStubs() {
  const store = new Map<string, string>();
  const attrs = new Map<string, string>();
  const styleProps = new Map<string, string>();

  const localStorageMock = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
  };

  const root = {
    style: {
      setProperty: (name: string, value: string) => {
        styleProps.set(name, value);
      },
      removeProperty: (name: string) => {
        styleProps.delete(name);
      },
      getPropertyValue: (name: string) => styleProps.get(name) ?? "",
    },
    setAttribute: (name: string, value: string) => {
      attrs.set(name, value);
    },
    removeAttribute: (name: string) => {
      attrs.delete(name);
    },
    getAttribute: (name: string) => (attrs.has(name) ? attrs.get(name)! : null),
    hasAttribute: (name: string) => attrs.has(name),
  };

  vi.stubGlobal("localStorage", localStorageMock);
  vi.stubGlobal("document", { documentElement: root });
  vi.stubGlobal("window", {
    dispatchEvent: () => true,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  });

  return { store, attrs, styleProps, root };
}

describe("uiFontScale", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to 100%", () => {
    installDomStubs();
    expect(getStoredUiFontScale()).toBe(1);
    expect(formatUiFontScale(1.25)).toBe("125%");
  });

  it("applies scale to html and persists", () => {
    const { attrs, styleProps } = installDomStubs();
    expect(applyUiFontScale(1.25)).toBe(1.25);
    expect(attrs.get("data-eva-font-scale")).toBe("1.25");
    expect(styleProps.get("--eva-font-scale")).toBe("1.25");
    expect(localStorage.getItem(UI_FONT_SCALE_STORAGE_KEY)).toBe("1.25");
    expect(getStoredUiFontScale()).toBe(1.25);
  });

  it("clears data attribute at 100% and rejects unknown values", () => {
    const { attrs } = installDomStubs();
    applyUiFontScale(1.5);
    applyUiFontScale(1);
    expect(attrs.has("data-eva-font-scale")).toBe(false);
    expect(applyUiFontScale(1.33)).toBe(1);
  });
});
