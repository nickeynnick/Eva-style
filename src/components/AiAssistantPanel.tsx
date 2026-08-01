import React, { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles, X } from "lucide-react";
import ModalOverlay from "./ModalOverlay";
import { useAppStore, useStoreMeta, useStorePreferences } from "../store";
import { buildSystemPrompt } from "../utils/aiAssistantContext";
import { deepseekChat, DeepSeekApiError } from "../utils/deepseekClient";
import {
  applyAssistantActions,
  describeAction,
  isDataAction,
  isUiAction,
  parseActionsFromAssistantText,
  type AiAssistantAction,
} from "../utils/aiAssistantActions";
import { logAssistantActionsResult, appendAiAssistantLog } from "../utils/aiAssistantLog";
import { executeUiCommand, type AppTabId, type OwnerSubTabId } from "../utils/aiUiNavigation";
import { showAppAlert, showAppConfirmAsync } from "../utils/appDialog";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface AiAssistantPanelProps {
  open: boolean;
  onClose: () => void;
  selectedJournalDate?: string;
  onNavigate?: (opts: {
    tab?: AppTabId;
    journalDate?: string;
    ownerSection?: OwnerSubTabId;
  }) => void;
}

export default function AiAssistantPanel({
  open,
  onClose,
  selectedJournalDate,
  onNavigate,
}: AiAssistantPanelProps) {
  const { getState, patch } = useAppStore();
  const { meta } = useStoreMeta();
  const { preferences } = useStorePreferences();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const apiKey = meta.deepSeekApiKey || "";
  const writeEnabled = !!preferences.deepSeekWriteEnabled;
  const model = preferences.deepSeekModel || "deepseek-chat";

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      abortRef.current = null;
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, loading, open]);

  const handleConfirmActions = async (actions: AiAssistantAction[]) => {
    const dataActions = actions.filter(isDataAction);
    if (!dataActions.length || !writeEnabled) return;
    const summary = dataActions.map((a) => "• " + describeAction(a, getState())).join("\n");
    const ok = await showAppConfirmAsync(
      "Помощник предлагает изменить данные:\n\n" +
        summary +
        "\n\nПрименить эти изменения?"
    );
    if (!ok) {
      void logAssistantActionsResult({
        event: "cancelled",
        actions: dataActions,
        labels: dataActions.map((a) => describeAction(a, getState())),
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          role: "assistant",
          content: "Изменения данных не применены (отменено).",
        },
      ]);
      return;
    }
    const { patch: storePatch, applied, errors, logNotes } = applyAssistantActions(
      getState(),
      dataActions
    );
    if (Object.keys(storePatch).length) {
      patch(storePatch);
    }
    void logAssistantActionsResult({
      event: "applied",
      actions: dataActions,
      applied,
      errors,
      logNotes,
    });
    const parts: string[] = [];
    if (applied.length) parts.push("Применено:\n" + applied.map((a) => "• " + a).join("\n"));
    if (errors.length) parts.push("Ошибки:\n" + errors.map((e) => "• " + e).join("\n"));
    setMessages((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}`,
        role: "assistant",
        content: parts.join("\n\n") || "Нечего применять.",
      },
    ]);
  };

  const runUiActions = async (actions: AiAssistantAction[]) => {
    const uiActions = actions.filter(isUiAction);
    if (!uiActions.length) return;
    const results: string[] = [];
    for (const action of uiActions) {
      if (
        action.type === "open_tab" ||
        action.type === "open_owner_section" ||
        action.type === "set_journal_date" ||
        action.type === "open_crash_logs"
      ) {
        const msg = await executeUiCommand(action, (opts) => {
          onNavigate?.(opts);
        });
        results.push(msg);
        void appendAiAssistantLog({
          event: "applied",
          summary: msg,
          actions: [describeAction(action)],
        });
      }
    }
    if (results.length) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ui-${Date.now()}`,
          role: "assistant",
          content: results.map((r) => "✓ " + r).join("\n"),
        },
      ]);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    if (!apiKey.trim()) {
      setError("Укажите API-ключ DeepSeek во «Владелица → Безопасность».");
      return;
    }

    setError(null);
    setInput("");
    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const state = getState();
      const system = buildSystemPrompt({ state, writeEnabled, selectedJournalDate });
      const history = [...messages, userMsg].slice(-12).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const reply = await deepseekChat({
        apiKey,
        model,
        messages: [{ role: "system", content: system }, ...history],
        signal: controller.signal,
      });

      const { displayText, actions } = parseActionsFromAssistantText(reply);
      setMessages((prev) => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: displayText },
      ]);

      await runUiActions(actions);

      const dataActions = actions.filter(isDataAction);
      if (dataActions.length) {
        if (writeEnabled) {
          await handleConfirmActions(dataActions);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: `sys-${Date.now()}`,
              role: "assistant",
              content:
                "Чтобы изменять данные (визиты, тарифы и т.п.), включите запись во «Владелица → Безопасность».",
            },
          ]);
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const msg =
        err instanceof DeepSeekApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Неизвестная ошибка";
      setError(msg);
      showAppAlert(msg);
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  return (
    <ModalOverlay
      open={open}
      onClose={onClose}
      zIndex={65}
      aria-label="AI-помощник DeepSeek"
      className="flex items-end sm:items-center justify-center sm:justify-end px-0 sm:px-4 pb-0 sm:pb-4 pt-12 sm:pt-4"
      backdropClassName="bg-slate-900/35"
    >
      <div className="w-full sm:w-[420px] md:w-[460px] h-[min(720px,100%)] sm:h-[min(680px,90vh)] bg-white rounded-t-2xl sm:rounded-2xl border border-slate-200 shadow-xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-violet-50 to-slate-50">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-8 w-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-800 truncate">AI-помощник</h2>
                <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                  бета
                </span>
              </div>
              <p className="text-[10px] text-slate-500 truncate">
                DeepSeek · {writeEnabled ? "чтение + запись (с подтверждением)" : "только чтение"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            aria-label="Закрыть"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {!apiKey.trim() && (
          <div className="mx-3 mt-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100 text-[11px] text-amber-900 font-sans">
            Укажите API-ключ DeepSeek во вкладке «Владелица → Безопасность». Без ключа чат не
            отправит запросы.
          </div>
        )}

        <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-slate-50/60">
          {messages.length === 0 && (
            <div className="text-center py-10 px-4 space-y-2">
              <Sparkles className="h-6 w-6 text-violet-400 mx-auto" />
              <p className="text-xs text-slate-500 font-sans leading-relaxed">
                Спросите, как пользоваться программой, или уточните данные салона (визиты, тарифы,
                сертификаты).
              </p>
            </div>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] rounded-2xl px-3 py-2 text-xs font-sans whitespace-pre-wrap leading-relaxed ${
                  m.role === "user"
                    ? "bg-violet-600 text-white rounded-br-md"
                    : "bg-white border border-slate-100 text-slate-800 rounded-bl-md shadow-sm"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-2 text-[11px] text-slate-400 px-1">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Думаю…
            </div>
          )}
        </div>

        {error && (
          <div className="px-3 pb-1">
            <p className="text-[11px] text-rose-600 font-sans">{error}</p>
          </div>
        )}

        <div className="border-t border-slate-100 p-3 bg-white">
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage();
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
              rows={2}
              placeholder="Напишите вопрос…"
              disabled={loading}
              className="flex-1 resize-none text-xs font-sans border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="shrink-0 h-10 w-10 rounded-xl bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Отправить"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      </div>
    </ModalOverlay>
  );
}
