import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";
import { publicAsset } from "../utils/publicAsset";

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

export default function WelcomeOverlay() {
  const [phase, setPhase] = useState<Phase>("show");

  useEffect(() => {
    playStartupSound();
    const hideTimer = setTimeout(() => setPhase("hide"), 2500);
    const goneTimer = setTimeout(() => setPhase("gone"), 3100);
    return () => {
      clearTimeout(hideTimer);
      clearTimeout(goneTimer);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <motion.div
      key="welcome-overlay"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-slate-950 transition-[opacity,visibility] duration-600 ease-in-out ${
        phase === "hide" ? "opacity-0 pointer-events-none invisible" : "opacity-100"
      }`}
      initial={false}
      aria-hidden="true"
    >
      <motion.div
        className="absolute inset-0 opacity-[0.03]"
        initial={{ backgroundPosition: "0% 50%" }}
        animate={{
          backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          backgroundImage: "radial-gradient(circle at 50% 50%, #f43f5e 0%, transparent 70%)",
          backgroundSize: "200% 200%",
        }}
      />

      <motion.div
        className="relative flex flex-col items-center gap-6"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <motion.div
          className="relative"
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            className="h-20 w-20 rounded-3xl overflow-hidden shadow-2xl shadow-rose-200 border border-rose-100"
            initial={{ rotate: -10, scale: 0 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <img src={publicAsset("icon-welcome.png")} alt="Ева-стиль" className="h-full w-full object-cover" width={80} height={80} />
          </motion.div>

          <motion.div
            className="absolute -top-2 -right-1"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0] }}
            transition={{ duration: 1.4, delay: 1, repeat: Infinity, ease: "easeOut" }}
          >
            <Sparkles className="h-5 w-5 text-rose-300" />
          </motion.div>
          <motion.div
            className="absolute -bottom-1 -left-2"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0] }}
            transition={{ duration: 1.4, delay: 1.7, repeat: Infinity, ease: "easeOut" }}
          >
            <Sparkles className="h-4 w-4 text-rose-300" />
          </motion.div>
        </motion.div>

        <div className="text-center">
          <motion.h1
            className="text-4xl font-extrabold tracking-tight text-slate-900"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}
          >
            Ева
            <motion.span
              className="text-rose-500"
              animate={{ color: ["#f43f5e", "#e11d48", "#f43f5e"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              -
            </motion.span>
            стиль
          </motion.h1>
          <motion.p
            className="text-sm text-slate-400 font-mono tracking-[0.3em] uppercase mt-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            Учётный пульт
          </motion.p>
        </div>

        <motion.div
          className="h-0.5 w-40 bg-slate-100 rounded-full overflow-hidden mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full"
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: 1.5, delay: 1, ease: "easeInOut" }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
