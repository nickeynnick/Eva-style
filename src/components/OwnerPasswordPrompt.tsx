import React, { useState } from "react";
import { Lock, Unlock, KeyRound, Eye, EyeOff, ShieldAlert, CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";
import {
  hashPassword,
  needsPasswordRehash,
  verifyPassword,
} from "../utils/ownerPassword";

interface OwnerPasswordPromptProps {
  /** Сохранённый хеш (или legacy plaintext до миграции). */
  correctPasswordHash: string;
  onUnlock: () => void;
  onResetSuccess: () => void;
  /** Пересохранить хеш после входа со старым plaintext. */
  onPasswordRehash?: (hashed: string) => void;
}

export default function OwnerPasswordPrompt({
  correctPasswordHash,
  onUnlock,
  onResetSuccess,
  onPasswordRehash,
}: OwnerPasswordPromptProps) {
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [isResetMode, setIsResetMode] = useState(false);
  const [secretAnswerInput, setSecretAnswerInput] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSuccessMsg, setResetSuccessMsg] = useState("");

  const handleUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const ok = await verifyPassword(passwordInput, correctPasswordHash);
      if (!ok) {
        setError("Неверный пароль. Пожалуйста, попробуйте еще раз.");
        return;
      }
      if (needsPasswordRehash(correctPasswordHash) && onPasswordRehash) {
        onPasswordRehash(await hashPassword(passwordInput));
      }
      onUnlock();
    } catch {
      setError("Не удалось проверить пароль. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanedAnswer = secretAnswerInput.trim().toLowerCase();
    if (cleanedAnswer === "дымка") {
      setResetError("");
      setResetSuccessMsg("Кодовое слово совпало! Пароль успешно сброшен.");
      setTimeout(() => {
        onResetSuccess();
        setIsResetMode(false);
        setSecretAnswerInput("");
        setResetSuccessMsg("");
      }, 1500);
    } else {
      setResetError("Неверное кодовое слово. Попробуйте еще раз. Обратите внимание на написание.");
    }
  };

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-xl p-6 sm:p-8 space-y-6"
      >
        {!isResetMode ? (
          <form onSubmit={(e) => void handleUnlockSubmit(e)} className="space-y-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl border border-rose-100">
                <Lock className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Доступ ограничен</h2>
              <p className="text-xs text-slate-400 font-sans max-w-sm">
                Раздел «Владелица» заблокирован. Пожалуйста, введите пароль для подтверждения прав администратора.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5 relative">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Пароль доступа
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      if (error) setError("");
                    }}
                    placeholder="Введите пароль..."
                    className="w-full text-sm border border-slate-200 rounded-xl pl-10 pr-10 py-3 bg-slate-50/50 font-sans focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white transition-all"
                    required
                    autoFocus
                    disabled={busy}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="text-rose-500 text-xs font-bold font-sans mt-1 flex items-center gap-1"
                  >
                    <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                    {error}
                  </motion.p>
                )}
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-200 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Unlock className="h-4 w-4" />
                {busy ? "Проверка…" : "Разблокировать раздел"}
              </button>
            </div>

            <div className="border-t border-slate-100 pt-4 text-center">
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setIsResetMode(true);
                }}
                className="text-[11px] text-slate-400 hover:text-rose-500 font-bold underline underline-offset-4 decoration-slate-200 transition-colors"
              >
                Забыли пароль? Сбросить по кодовому слову
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetSubmit} className="space-y-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl border border-blue-100">
                <ShieldAlert className="h-6 w-6 animate-pulse" />
              </div>
              <h2 className="text-lg font-bold text-slate-800 tracking-tight">Сброс пароля</h2>
              <p className="text-xs text-slate-400 font-sans max-w-sm">
                Для сброса пароля ответьте на секретный вопрос, заданный владелицей.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-1 text-center select-none">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Подсказка вопроса</span>
              <p className="text-sm font-extrabold text-slate-700">кошка 🐈</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Кодовое слово
                </label>
                <input
                  type="text"
                  value={secretAnswerInput}
                  onChange={(e) => {
                    setSecretAnswerInput(e.target.value);
                    if (resetError) setResetError("");
                  }}
                  placeholder="Введите слово..."
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-3 bg-slate-50/50 font-sans focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-center font-bold"
                  required
                  autoFocus
                />

                {resetError && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="text-rose-500 text-xs font-bold font-sans mt-1 text-center"
                  >
                    {resetError}
                  </motion.p>
                )}

                {resetSuccessMsg && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-emerald-500 text-xs font-bold font-sans mt-1 text-center flex items-center justify-center gap-1"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    {resetSuccessMsg}
                  </motion.p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsResetMode(false);
                    setSecretAnswerInput("");
                    setResetError("");
                  }}
                  className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 px-4 rounded-xl text-xs font-bold transition-all"
                >
                  Назад
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-100"
                >
                  Проверить и сбросить
                </button>
              </div>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
