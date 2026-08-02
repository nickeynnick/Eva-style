import { useState, useEffect } from "react";
import { publicAsset } from "../utils/publicAsset";
import { getStoredUiLiteMode } from "../utils/uiLiteMode";

type Phase = "show" | "hide" | "gone";

/** Защита от двойного play() в React StrictMode. */
let startupSoundStarted = false;

function playStartupSound(): void {
  if (startupSoundStarted) return;
  startupSoundStarted = true;
  try {
    const audio = new Audio(publicAsset("startup.mp3"));
    audio.volume = 0.85;
    void audio.play().catch(() => {
      // В десктопном WebView автозапуск обычно разрешён.
    });
  } catch {
    // ignore
  }
}

/** Лёгкая заставка без motion: CSS fade + короче на слабых ПК. */
export default function WelcomeOverlay() {
  const [phase, setPhase] = useState<Phase>("show");
  const lite = getStoredUiLiteMode();

  useEffect(() => {
    if (!lite) playStartupSound();
    const hideMs = lite ? 900 : 1800;
    const goneMs = lite ? 1200 : 2300;
    const hideTimer = setTimeout(() => setPhase("hide"), hideMs);
    const goneTimer = setTimeout(() => setPhase("gone"), goneMs);
    return () => {
      clearTimeout(hideTimer);
      clearTimeout(goneTimer);
    };
  }, [lite]);

  if (phase === "gone") return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-slate-950 transition-opacity ease-out ${
        lite ? "duration-300" : "duration-500"
      } ${phase === "hide" ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      aria-hidden="true"
    >
      <div className="relative flex flex-col items-center gap-5">
        <div className="h-20 w-20 rounded-3xl overflow-hidden shadow-lg shadow-rose-100 border border-rose-100">
          <img
            src={publicAsset("icon-welcome.png")}
            alt="Ева-стиль"
            className="h-full w-full object-cover"
            width={80}
            height={80}
          />
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">
            Ева<span className="text-rose-500">-</span>стиль
          </h1>
          <p className="text-sm text-slate-400 font-mono tracking-[0.3em] uppercase mt-2">
            Учётный пульт
          </p>
        </div>
        {!lite && (
          <div className="h-0.5 w-36 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full w-full origin-left bg-gradient-to-r from-rose-400 to-rose-500 rounded-full animate-[evaSplashBar_1.4s_ease-in-out_forwards]" />
          </div>
        )}
      </div>
    </div>
  );
}
