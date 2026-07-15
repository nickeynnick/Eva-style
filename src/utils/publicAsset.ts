/**
 * URL файла из public/dist — корректно и для Vite-dev, и для десктопной сборки (asset/file).
 * Абсолютные пути вида "/icon.png" в file:// ломаются (ищут C:\icon.png).
 */
export function publicAsset(file: string): string {
  const name = file.replace(/^\//, "");
  try {
    if (typeof document !== "undefined" && document.baseURI) {
      return new URL(name, document.baseURI).href;
    }
    if (typeof window !== "undefined" && window.location?.href) {
      return new URL(name, window.location.href).href;
    }
  } catch {
    // fall through
  }
  return `./${name}`;
}
