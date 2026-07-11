import React, { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import ModalOverlay from "./ModalOverlay";
import { registerAppDialogHost, AppDialogHostApi } from "../utils/appDialog";
import { restoreCapturedFocus } from "../utils/restoreAppFocus";

type DialogKind = "alert" | "confirm" | "prompt";

interface DialogRequest {
  id: number;
  kind: DialogKind;
  message: string;
  defaultValue?: string;
  resolve: (value: boolean | string | null | void) => void;
}

export default function AppDialogHost() {
  const [queue, setQueue] = useState<DialogRequest[]>([]);
  const [promptValue, setPromptValue] = useState("");
  const promptInputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(0);

  const current = queue[0] ?? null;

  useEffect(() => {
    const api: AppDialogHostApi = {
      alert: (message) =>
        new Promise<void>((resolve) => {
          setQueue((prev) => [
            ...prev,
            { id: ++nextId.current, kind: "alert", message, resolve: () => resolve() },
          ]);
        }),
      confirm: (message) =>
        new Promise<boolean>((resolve) => {
          setQueue((prev) => [
            ...prev,
            { id: ++nextId.current, kind: "confirm", message, resolve: (v) => resolve(!!v) },
          ]);
        }),
      prompt: (message, defaultValue = "") =>
        new Promise<string | null>((resolve) => {
          setQueue((prev) => [
            ...prev,
            {
              id: ++nextId.current,
              kind: "prompt",
              message,
              defaultValue,
              resolve: (v) => resolve(typeof v === "string" ? v : null),
            },
          ]);
        }),
    };

    registerAppDialogHost(api);
    return () => registerAppDialogHost(null);
  }, []);

  useEffect(() => {
    if (current?.kind === "prompt") {
      setPromptValue(current.defaultValue ?? "");
      setTimeout(() => promptInputRef.current?.focus(), 0);
    }
  }, [current?.id, current?.kind, current?.defaultValue]);

  const closeCurrent = (result: boolean | string | null | void) => {
    if (!current) return;
    current.resolve(result);
    setQueue((prev) => prev.slice(1));
    restoreCapturedFocus();
  };

  if (!current) return null;

  return (
    <ModalOverlay
      open
      zIndex={70}
      onClose={() => {
        if (current.kind === "alert") closeCurrent(undefined);
        else if (current.kind === "confirm") closeCurrent(false);
        else closeCurrent(null);
      }}
      closeOnBackdrop={current.kind !== "prompt"}
      aria-label={current.kind === "confirm" ? "Подтверждение" : "Сообщение"}
    >
      <div className="w-full max-w-sm bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden">
        <div className="px-4 py-4 flex gap-3">
          <div className="shrink-0 h-9 w-9 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center">
            <AlertCircle className="h-5 w-5 text-amber-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-800 leading-snug whitespace-pre-wrap">{current.message}</p>
            {current.kind === "prompt" && (
              <input
                ref={promptInputRef}
                type="text"
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") closeCurrent(promptValue);
                }}
                className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
              />
            )}
          </div>
        </div>

        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex gap-2 justify-end">
          {current.kind === "alert" && (
            <button
              type="button"
              autoFocus
              onClick={() => closeCurrent(undefined)}
              className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg"
            >
              OK
            </button>
          )}

          {current.kind === "confirm" && (
            <>
              <button
                type="button"
                onClick={() => closeCurrent(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Отмена
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => closeCurrent(true)}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                OK
              </button>
            </>
          )}

          {current.kind === "prompt" && (
            <>
              <button
                type="button"
                onClick={() => closeCurrent(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => closeCurrent(promptValue)}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                OK
              </button>
            </>
          )}
        </div>
      </div>
    </ModalOverlay>
  );
}
