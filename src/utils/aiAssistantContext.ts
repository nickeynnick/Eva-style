import { APP_VERSION } from "../data/appVersion";
import { faqs } from "../data/helpContent";
import type { AppStoreState } from "../store/schema";

const CONTEXT_DAYS = 60;
const MAX_LIST_ITEMS = 200;

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function inRecentWindow(dateStr: string, since: string): boolean {
  return dateStr >= since;
}

function truncateList<T>(items: T[], max = MAX_LIST_ITEMS): { items: T[]; truncated: boolean } {
  if (items.length <= max) return { items, truncated: false };
  return { items: items.slice(-max), truncated: true };
}

/** Сжатый дамп store для системного контекста. */
export function buildStoreSnapshot(state: AppStoreState): Record<string, unknown> {
  const since = daysAgoIso(CONTEXT_DAYS);

  const visitsRecent = state.visits.filter((v) => inRecentWindow(v.date, since) && !v.isDeleted);
  const solariumRecent = state.solariumSessions.filter((s) => inRecentWindow(s.date, since));
  const extrasRecent = state.extraTransactions.filter(
    (t) => inRecentWindow(t.date, since) && !t.isDeleted
  );
  const shiftsRecent = state.adminShifts.filter((s) => inRecentWindow(s.date, since));
  const masterTxRecent = state.masterTransactions.filter((t) =>
    inRecentWindow(t.date, since)
  );
  const cashRecent = state.dailyCash.filter((c) => inRecentWindow(c.date, since));

  const visitsSlice = truncateList(visitsRecent);
  const solariumSlice = truncateList(solariumRecent);
  const extrasSlice = truncateList(extrasRecent);

  return {
    appVersion: APP_VERSION,
    now: getNowContext(),
    contextWindowDays: CONTEXT_DAYS,
    sinceDate: since,
    employees: state.employees.map((e) => ({
      id: e.id,
      name: e.name,
      position: e.position,
      percentage: e.percentage,
      dailyRent: e.dailyRent,
      manicuresPercentage: e.manicuresPercentage,
      /** Как в «Учёт за день»: визиты можно вешать на всех, кроме администраторов (владелица — можно). */
      canTakeVisits: e.position !== "Администратор",
    })),
    settingsRules: state.settingsRules,
    materialPrices: state.materialPrices,
    materialPackaging: state.materialPackaging,
    materialConsumptions: state.materialConsumptions,
    giftCertificates: state.giftCertificates
      .filter((c) => c.isActive)
      .map((c) => ({
        id: c.id,
        code: c.code,
        nominal: c.nominal,
        balance: c.balance,
        soldDate: c.soldDate,
        soldTo: c.soldTo,
        isActive: c.isActive,
      })),
    debtRecords: state.debtRecords
      .filter((d) => !d.isClosed)
      .map((d) => ({
        id: d.id,
        clientName: d.clientName,
        remainingAmount: d.remainingAmount,
        originalAmount: d.originalAmount,
        visitDate: d.visitDate,
        comment: d.comment,
        isClosed: d.isClosed,
      })),
    adminPaidWages: state.adminPaidWages,
    totals: {
      visitsAll: state.visits.length,
      visitsInWindow: visitsRecent.length,
      solariumInWindow: solariumRecent.length,
      extrasInWindow: extrasRecent.length,
      shiftsInWindow: shiftsRecent.length,
    },
    visits: visitsSlice.items.map((v) => ({
      id: v.id,
      date: v.date,
      masterId: v.masterId,
      paymentMethod: v.paymentMethod,
      workCost: v.workCost,
      materialsCost: v.materialsCost,
      acquiringCost: v.acquiringCost,
      totalCost: v.totalCost,
      clientName: v.clientName,
      clientPhone: v.clientPhone,
    })),
    visitsTruncated: visitsSlice.truncated,
    solariumSessions: solariumSlice.items,
    solariumTruncated: solariumSlice.truncated,
    extraTransactions: extrasSlice.items,
    extrasTruncated: extrasSlice.truncated,
    adminShifts: truncateList(shiftsRecent).items,
    masterTransactions: truncateList(masterTxRecent).items,
    dailyCash: truncateList(cashRecent).items,
  };
}

function buildFaqBlock(): string {
  return faqs
    .map((f, i) => `${i + 1}. [${f.category}] ${f.question}\n${f.answer}`)
    .join("\n\n");
}

/** Текущие дата/время локальной машины пользователя. */
export function getNowContext(selectedJournalDate?: string): {
  nowIso: string;
  todayDate: string;
  localDateTimeRu: string;
  weekdayRu: string;
  timeZone: string;
  selectedJournalDate?: string;
} {
  const now = new Date();
  const todayDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "local";
  const localDateTimeRu = now.toLocaleString("ru-RU", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const weekdayRu = now.toLocaleDateString("ru-RU", { weekday: "long" });
  return {
    nowIso: now.toISOString(),
    todayDate,
    localDateTimeRu,
    weekdayRu,
    timeZone,
    selectedJournalDate: selectedJournalDate || undefined,
  };
}

const UI_ACTIONS_SCHEMA = `
Действия интерфейса (выполняются программой сразу, без подтверждения). Можно использовать ВСЕГДА — даже если запись данных выключена:

\`\`\`json
{
  "actions": [
    { "type": "open_tab", "tab": "accounting"|"certificates"|"calculator"|"solarium"|"salaries"|"adminShifts"|"owner"|"help" },
    { "type": "open_owner_section", "section": "employees"|"finance"|"stats"|"settings"|"security" },
    { "type": "set_journal_date", "date": "YYYY-MM-DD" },
    { "type": "open_crash_logs" }
  ]
}
\`\`\`

Критично:
- НИКОГДА не пиши «открываю вкладку», «перешёл», «уже открыл», если не добавил соответствующий action в JSON.
- Не обещай «починить код программы» — ты не меняешь исходники. При сбоях: открой справку/CrashLogs, подскажи шаги пользователю; при включённой записи — исправь данные через data-actions.
- open_owner_section сам открывает вкладку «Владелица» и нужный подраздел.
`.trim();

const WRITE_ACTIONS_SCHEMA = `
Когда нужно изменить ДАННЫЕ, добавь в конец ответа блок JSON (после краткого пояснения). Можно комбинировать с UI-действиями в одном массиве actions.

\`\`\`json
{
  "actions": [
    { "type": "add_visit", "date": "YYYY-MM-DD", "masterId": string?, "masterName": string?, "workCost": number, "materialsCost": number?, "paymentMethod": "наличные"|"дебетовая карта"|"перевод"|"сертификат"|"в долг"|string, "clientName": string?, "clientPhone": string?, "giftCertificateId": string?, "manicureType": "classical"|"apparatus"? },
    { "type": "update_visit", "visitId": string, "masterId": string?, "workCost": number?, "materialsCost": number?, "paymentMethod": string?, "clientName": string?, "clientPhone": string? },
    { "type": "update_visit_client", "visitId": string, "clientName": string },
    { "type": "delete_visit", "visitId": string },
    { "type": "add_solarium_session", "date": "YYYY-MM-DD", "minutes": number, "creamPrice": number?, "stickersPrice": number?, "paymentMethod": "наличные"|"дебетовая карта"|"перевод"|"в долг", "clientName": string? },
    { "type": "delete_solarium_session", "id": string },
    { "type": "add_extra_transaction", "date": "YYYY-MM-DD", "txType": "плюс"|"минус", "amount": number, "comment": string, "category": string? },
    { "type": "delete_extra_transaction", "id": string },
    { "type": "update_extra_transaction_comment", "id": string, "comment": string },
    { "type": "add_settings_rule", "effectiveDate": "YYYY-MM-DD", "acquiringCommission": number, "solariumMinuteRate": number, "adminBaseRate": number? },
    { "type": "update_settings_rule", "id": string, "effectiveDate": string?, "acquiringCommission": number?, "solariumMinuteRate": number?, "adminBaseRate": number? },
    { "type": "upsert_admin_day_wage", "adminId": string?, "adminName": string?, "date": "YYYY-MM-DD", "amount": number },
    { "type": "delete_admin_day_wage", "adminId": string?, "adminName": string?, "date": "YYYY-MM-DD" },
    { "type": "update_material_packaging", "key": "shampooProscenia"|"lotionAcPretreatment"|"laminatingGel"|"maskProscenia"|"shampooProeditCurlFit"|"basePliaBase"|"lotionPliaStep1"|"lotionPliaStep2"|"conditionerPearl"|"serumAfterPerm", "price": number, "volume": number },
    { "type": "update_debt_comment", "id": string, "comment": string },
    { "type": "log_note", "message": string }
  ]
}
\`\`\`

Правила данных:
- Если пользователь просит ДОБАВИТЬ/ИЗМЕНИТЬ запись — обязательно выдай data-action (add_visit и т.п.). Не ограничивайся открытием вкладки.
- Владелица (должность «Владелица») МОЖЕТ быть мастером визита — как в форме «Добавить визит». Не отказывай из‑за должности «Владелица».
- Нельзя оформлять визит только на администратора (canTakeVisits=false).
- Для add_visit достаточно masterName (ФИО из списка) или masterId; предпочтительно оба.
- Для визита «в долг» обязателен clientName; для «сертификат» — giftCertificateId из снимка данных.
- delete_visit — мягкое удаление; delete_extra_transaction — мягкое; delete_solarium_session — полное удаление сеанса.
- update_material_packaging пересчитывает себестоимость ₽/мл(гр).
- upsert_admin_day_wage / delete_admin_day_wage — ЗП администратора за конкретный день (табель); adminName или adminId.
- log_note пишет заметку в журнал действий помощника.
- Для относительных дат используй блок «ТЕКУЩЕЕ ВРЕМЯ».
- ЗАПРЕЩЕНО: удаление сотрудников, сброс пароля, полный сброс данных, правка исходного кода.
- Изменения данных пользователь подтвердит вручную.
`.trim();

export function buildSystemPrompt(options: {
  state: AppStoreState;
  writeEnabled: boolean;
  selectedJournalDate?: string;
}): string {
  const { state, writeEnabled, selectedJournalDate } = options;
  const now = getNowContext(selectedJournalDate);
  const snapshot = buildStoreSnapshot(state);
  const snapshotJson = JSON.stringify({ ...snapshot, now });

  return [
    "Ты — AI-помощник программы учёта салона красоты «Ева-стиль» (версия " +
      APP_VERSION +
      ", режим БЕТА).",
    "Отвечай по-русски, кратко и по делу. Опирайся на справку и снимок данных ниже.",
    "Не выдумывай цифры, которых нет в данных. Если данных недостаточно — скажи об этом.",
    "Помогай пользоваться разделами: Учёт за день, Калькулятор, Солярий, Зарплаты, Табель, Сертификаты, Владелица.",
    "Стиль общения: как понятный консультант для администратора салона, НЕ как программист.",
    "В ответах пользователю НЕ показывай технические детали: id записей, masterId, JSON, названия полей API, имена ключей сырья (shampooProscenia и т.п.), схемы actions, UUID, сырые структуры данных.",
    "Говори обычными словами: имена мастеров, даты, суммы в рублях, «визит», «сеанс солярия», «комиссия эквайринга», «прайс шампуня» и т.д.",
    "Блок ```json с actions (если есть) оставляй в ответе для программы, но весь текст ДО и ПОСЛЕ него — без технички, только понятное пояснение.",
    "UI-действия (вкладки, CrashLogs) доступны всегда. Действия с данными — только при включённой записи.",
    writeEnabled
      ? "Режим записи данных ВКЛЮЧЁН: при просьбе добавить визит/операцию СРАЗУ формируй data-action и короткий текст; UI-вкладку открывай дополнительно, если полезно, но не вместо записи."
      : "Режим записи данных ВЫКЛЮЧЕН: только UI-actions и объяснения. НЕ генерируй data-actions (визиты/тарифы и т.п.). Скажи, что нужно включить запись в Безопасности.",
    UI_ACTIONS_SCHEMA,
    writeEnabled ? WRITE_ACTIONS_SCHEMA : "",
    "",
    "=== ТЕКУЩЕЕ ВРЕМЯ (локальные часы пользователя) ===",
    `Сейчас: ${now.localDateTimeRu}`,
    `Сегодня (YYYY-MM-DD): ${now.todayDate}`,
    `День недели: ${now.weekdayRu}`,
    `Часовой пояс: ${now.timeZone}`,
    `ISO UTC: ${now.nowIso}`,
    now.selectedJournalDate
      ? `Выбранная дата в журнале учёта: ${now.selectedJournalDate} (если пользователь говорит «сегодня» без уточнения — предпочитай ${now.todayDate}; если говорит про журнал/смену — можно опираться на выбранную дату журнала).`
      : "",
    "",
    "=== СПРАВКА FAQ ===",
    buildFaqBlock(),
    "",
    "=== СНИМОК ДАННЫХ САЛОНА (JSON) ===",
    snapshotJson,
  ]
    .filter(Boolean)
    .join("\n");
}
