import { openCrashLogsFolder } from "./crashLog";

export const APP_TAB_IDS = [
  "accounting",
  "certificates",
  "calculator",
  "solarium",
  "salaries",
  "adminShifts",
  "owner",
  "help",
] as const;

export type AppTabId = (typeof APP_TAB_IDS)[number];

export const OWNER_SUBTAB_IDS = [
  "employees",
  "finance",
  "stats",
  "settings",
  "security",
] as const;

export type OwnerSubTabId = (typeof OWNER_SUBTAB_IDS)[number];

export const TAB_LABELS_RU: Record<AppTabId, string> = {
  accounting: "Учёт за день",
  certificates: "Сертификаты",
  calculator: "Калькулятор услуг",
  solarium: "Солярий",
  salaries: "Зарплаты",
  adminShifts: "Табель администраторов",
  owner: "Владелица",
  help: "Справка",
};

export const OWNER_SUBTAB_LABELS_RU: Record<OwnerSubTabId, string> = {
  employees: "Сотрудники",
  finance: "Финансы",
  stats: "Статистика",
  settings: "Настройки и тарифы",
  security: "Безопасность",
};

export const OWNER_NAV_EVENT = "eva-style-owner-nav";

export type AiUiCommand =
  | { type: "open_tab"; tab: AppTabId }
  | { type: "open_owner_section"; section: OwnerSubTabId }
  | { type: "set_journal_date"; date: string }
  | { type: "open_crash_logs" };

export function isAppTabId(v: string): v is AppTabId {
  return (APP_TAB_IDS as readonly string[]).includes(v);
}

export function isOwnerSubTabId(v: string): v is OwnerSubTabId {
  return (OWNER_SUBTAB_IDS as readonly string[]).includes(v);
}

export type AiUiCommandHandler = (cmd: AiUiCommand) => void | Promise<void>;

/**
 * Выполнить UI-команду в приложении.
 * onNavigate — переключение вкладки / даты журнала из App.
 */
export async function executeUiCommand(
  cmd: AiUiCommand,
  onNavigate: (opts: {
    tab?: AppTabId;
    journalDate?: string;
    ownerSection?: OwnerSubTabId;
  }) => void
): Promise<string> {
  switch (cmd.type) {
    case "open_tab": {
      onNavigate({ tab: cmd.tab });
      return `Открыта вкладка «${TAB_LABELS_RU[cmd.tab]}»`;
    }
    case "open_owner_section": {
      onNavigate({ tab: "owner", ownerSection: cmd.section });
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(OWNER_NAV_EVENT, { detail: { subTab: cmd.section } })
        );
      }
      return `Открыт раздел владелицы «${OWNER_SUBTAB_LABELS_RU[cmd.section]}»`;
    }
    case "set_journal_date": {
      onNavigate({ tab: "accounting", journalDate: cmd.date });
      return `В журнале выбрана дата ${cmd.date}`;
    }
    case "open_crash_logs": {
      const res = await openCrashLogsFolder();
      if (!res.success) {
        return res.error || "Не удалось открыть папку журналов (нужно Windows-приложение).";
      }
      return "Открыта папка CrashLogs — там логи программы и действия помощника.";
    }
    default:
      return "Команда интерфейса не распознана";
  }
}
