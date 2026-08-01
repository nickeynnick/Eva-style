import { writeCrashLog } from "./crashLog";
import type { AiAssistantAction } from "./aiAssistantActions";
import { describeAction } from "./aiAssistantActions";

const MEMORY_LOG_KEY = "eva_style_ai_assistant_log";
const MEMORY_LOG_MAX = 200;

export interface AiAssistantLogEntry {
  at: string;
  event: "applied" | "cancelled" | "error" | "note" | "chat";
  summary: string;
  actions?: string[];
  errors?: string[];
}

function readMemoryLog(): AiAssistantLogEntry[] {
  try {
    const raw = localStorage.getItem(MEMORY_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AiAssistantLogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeMemoryLog(entries: AiAssistantLogEntry[]): void {
  try {
    localStorage.setItem(MEMORY_LOG_KEY, JSON.stringify(entries.slice(-MEMORY_LOG_MAX)));
  } catch {
    /* quota */
  }
}

/** Добавляет запись в локальный журнал и (в десктопе) в CrashLogs. */
export async function appendAiAssistantLog(entry: Omit<AiAssistantLogEntry, "at"> & { at?: string }): Promise<void> {
  const full: AiAssistantLogEntry = {
    ...entry,
    at: entry.at || new Date().toISOString(),
  };
  const next = [...readMemoryLog(), full];
  writeMemoryLog(next);

  await writeCrashLog({
    kind: "ai-assistant",
    message: `[${full.event}] ${full.summary}`,
    extra: full,
  });
}

export function getAiAssistantMemoryLog(): AiAssistantLogEntry[] {
  return readMemoryLog();
}

export async function logAssistantActionsResult(options: {
  event: "applied" | "cancelled";
  actions: AiAssistantAction[];
  applied?: string[];
  errors?: string[];
  logNotes?: string[];
  labels?: string[];
}): Promise<void> {
  const labels = options.labels || options.actions.map((a) => describeAction(a));
  await appendAiAssistantLog({
    event: options.event,
    summary:
      options.event === "applied"
        ? `Применено действий: ${(options.applied || labels).length}`
        : `Отменено действий: ${labels.length}`,
    actions: options.applied || labels,
    errors: options.errors,
  });
  for (const note of options.logNotes || []) {
    await appendAiAssistantLog({ event: "note", summary: note });
  }
}
