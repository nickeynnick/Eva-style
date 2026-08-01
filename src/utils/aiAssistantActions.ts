import type { AppStorePatch, AppStoreState } from "../store/schema";
import { deriveMaterialPricesFromPackaging } from "../store/materialPrices";
import type {
  AdminDayOfWeekRate,
  DebtRecord,
  Employee,
  ExtraTransaction,
  PaymentMethod,
  ReceivingPaymentMethod,
  SettingsRule,
  SolariumSession,
  Visit,
} from "../types";
import { Position } from "../types";
import { ALL_PAYMENT_METHODS, calculateVisitTotal, RECEIVING_PAYMENT_METHODS } from "./paymentUtils";
import { getActiveSettingsForDate } from "./settingsUtils";
import {
  isAppTabId,
  isOwnerSubTabId,
  OWNER_SUBTAB_LABELS_RU,
  TAB_LABELS_RU,
  type AppTabId,
  type OwnerSubTabId,
} from "./aiUiNavigation";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const PACKAGING_KEYS = new Set([
  "shampooProscenia",
  "lotionAcPretreatment",
  "laminatingGel",
  "maskProscenia",
  "shampooProeditCurlFit",
  "basePliaBase",
  "lotionPliaStep1",
  "lotionPliaStep2",
  "conditionerPearl",
  "serumAfterPerm",
]);

const ADMIN_DAY_KEYS: (keyof AdminDayOfWeekRate)[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function newId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isPaymentMethod(v: unknown): v is PaymentMethod {
  return typeof v === "string" && (ALL_PAYMENT_METHODS as string[]).includes(v);
}

function normalizePaymentMethod(v: unknown): PaymentMethod | null {
  if (isPaymentMethod(v)) return v;
  const s = String(v || "")
    .toLowerCase()
    .trim();
  if (!s) return null;
  if (s.includes("налич")) return "наличные";
  if (s.includes("карт") || s.includes("безнал") || s.includes("эквайр")) return "дебетовая карта";
  if (s.includes("перевод") || s.includes("сбп")) return "перевод";
  if (s.includes("сертиф")) return "сертификат";
  if (s.includes("долг")) return "в долг";
  return null;
}

function isReceivingMethod(v: unknown): v is ReceivingPaymentMethod {
  return typeof v === "string" && (RECEIVING_PAYMENT_METHODS as string[]).includes(v);
}

function resolveEmployeeId(
  employees: Employee[],
  opts: { masterId?: string; masterName?: string }
): Employee | null {
  if (opts.masterId) {
    const byId = employees.find((e) => e.id === opts.masterId);
    if (byId) return byId;
  }
  const name = (opts.masterName || "").trim().toLowerCase();
  if (!name) return null;
  const exact = employees.find((e) => e.name.toLowerCase() === name);
  if (exact) return exact;
  const partial = employees.find(
    (e) => e.name.toLowerCase().includes(name) || name.includes(e.name.toLowerCase())
  );
  return partial || null;
}

function canEmployeeTakeVisits(emp: Employee): boolean {
  return emp.position !== Position.Administrator;
}

export type AiAssistantAction =
  | {
      type: "add_extra_transaction";
      date: string;
      txType: "плюс" | "минус";
      amount: number;
      comment: string;
      category?: string;
    }
  | { type: "delete_extra_transaction"; id: string }
  | { type: "update_extra_transaction_comment"; id: string; comment: string }
  | {
      type: "add_visit";
      date: string;
      masterId?: string;
      masterName?: string;
      workCost: number;
      materialsCost?: number;
      salonMaterialsCost?: number;
      masterMaterialsCost?: number;
      paymentMethod: PaymentMethod;
      clientName?: string;
      clientPhone?: string;
      giftCertificateId?: string;
      manicureType?: "classical" | "apparatus";
    }
  | {
      type: "update_visit";
      visitId: string;
      masterId?: string;
      workCost?: number;
      materialsCost?: number;
      salonMaterialsCost?: number;
      masterMaterialsCost?: number;
      paymentMethod?: PaymentMethod;
      clientName?: string;
      clientPhone?: string;
    }
  | { type: "update_visit_client"; visitId: string; clientName: string }
  | { type: "delete_visit"; visitId: string }
  | {
      type: "add_solarium_session";
      date: string;
      minutes: number;
      creamPrice?: number;
      stickersPrice?: number;
      paymentMethod: ReceivingPaymentMethod | "в долг";
      clientName?: string;
    }
  | { type: "delete_solarium_session"; id: string }
  | {
      type: "add_settings_rule";
      effectiveDate: string;
      acquiringCommission: number;
      solariumMinuteRate: number;
      adminBaseRate?: number;
    }
  | {
      type: "update_settings_rule";
      id: string;
      effectiveDate?: string;
      acquiringCommission?: number;
      solariumMinuteRate?: number;
      adminBaseRate?: number;
    }
  | {
      type: "update_admin_days_rates";
      monday?: number;
      tuesday?: number;
      wednesday?: number;
      thursday?: number;
      friday?: number;
      saturday?: number;
      sunday?: number;
    }
  | {
      type: "update_material_packaging";
      key: string;
      price: number;
      volume: number;
    }
  | { type: "update_debt_comment"; id: string; comment: string }
  | { type: "log_note"; message: string }
  | { type: "open_tab"; tab: AppTabId }
  | { type: "open_owner_section"; section: OwnerSubTabId }
  | { type: "set_journal_date"; date: string }
  | { type: "open_crash_logs" };

const UI_ACTION_TYPES = new Set([
  "open_tab",
  "open_owner_section",
  "set_journal_date",
  "open_crash_logs",
]);

export function isUiAction(action: AiAssistantAction): boolean {
  return UI_ACTION_TYPES.has(action.type);
}

export function isDataAction(action: AiAssistantAction): boolean {
  return !isUiAction(action);
}

/** Извлекает JSON-блок actions из ответа модели. */
export function parseActionsFromAssistantText(text: string): {
  displayText: string;
  actions: AiAssistantAction[];
} {
  const tryParseActions = (raw: string): AiAssistantAction[] | null => {
    try {
      const parsed = JSON.parse(raw) as { actions?: unknown };
      if (!Array.isArray(parsed.actions)) return null;
      const valid = parsed.actions
        .map(normalizeAction)
        .filter((a): a is AiAssistantAction => a !== null);
      return valid.length ? valid : null;
    } catch {
      return null;
    }
  };

  const fence = /```(?:json)?\s*([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;
  let actions: AiAssistantAction[] = [];
  let cleaned = text;

  while ((match = fence.exec(text)) !== null) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    const valid = tryParseActions(raw);
    if (valid) {
      actions = valid;
      cleaned = cleaned.replace(match[0], "").trim();
    }
  }

  if (!actions.length) {
    const bare = text.match(/\{\s*"actions"\s*:\s*\[[\s\S]*?\]\s*\}/);
    if (bare?.[0]) {
      const valid = tryParseActions(bare[0]);
      if (valid) {
        actions = valid;
        cleaned = cleaned.replace(bare[0], "").trim();
      }
    }
  }

  return { displayText: cleaned || text, actions };
}

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeAction(raw: unknown): AiAssistantAction | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const type = String(o.type || "");

  if (type === "add_extra_transaction") {
    const date = String(o.date || "");
    const txType = o.txType === "плюс" || o.txType === "минус" ? o.txType : null;
    const amount = num(o.amount);
    const comment = String(o.comment || "").trim();
    if (!DATE_RE.test(date) || !txType || amount === null || !(amount > 0) || !comment) return null;
    const category = o.category != null ? String(o.category) : undefined;
    return { type, date, txType, amount, comment, category };
  }

  if (type === "delete_extra_transaction") {
    const id = String(o.id || "");
    if (!id) return null;
    return { type, id };
  }

  if (type === "update_extra_transaction_comment") {
    const id = String(o.id || "");
    const comment = String(o.comment || "").trim();
    if (!id || !comment) return null;
    return { type, id, comment };
  }

  if (type === "add_visit") {
    const date = String(o.date || "");
    const masterId = o.masterId != null ? String(o.masterId).trim() : undefined;
    const masterName = o.masterName != null ? String(o.masterName).trim() : undefined;
    const workCost = num(o.workCost);
    const paymentMethod = normalizePaymentMethod(o.paymentMethod);
    if (
      !DATE_RE.test(date) ||
      (!masterId && !masterName) ||
      workCost === null ||
      workCost < 0 ||
      !paymentMethod
    ) {
      return null;
    }
    const materialsCost = num(o.materialsCost) ?? 0;
    const salonMaterialsCost = num(o.salonMaterialsCost) ?? undefined;
    const masterMaterialsCost = num(o.masterMaterialsCost) ?? undefined;
    const clientName = o.clientName != null ? String(o.clientName).trim() : undefined;
    const clientPhone = o.clientPhone != null ? String(o.clientPhone).trim() : undefined;
    const giftCertificateId =
      o.giftCertificateId != null ? String(o.giftCertificateId).trim() : undefined;
    const manicureType =
      o.manicureType === "classical" || o.manicureType === "apparatus" ? o.manicureType : undefined;
    if (paymentMethod === "в долг" && !clientName) return null;
    if (paymentMethod === "сертификат" && !giftCertificateId) return null;
    return {
      type,
      date,
      masterId,
      masterName,
      workCost,
      materialsCost,
      salonMaterialsCost,
      masterMaterialsCost,
      paymentMethod,
      clientName,
      clientPhone,
      giftCertificateId,
      manicureType,
    };
  }

  if (type === "update_visit") {
    const visitId = String(o.visitId || "");
    if (!visitId) return null;
    const paymentMethod = o.paymentMethod;
    if (paymentMethod !== undefined && !isPaymentMethod(paymentMethod)) return null;
    return {
      type,
      visitId,
      masterId: o.masterId != null ? String(o.masterId) : undefined,
      workCost: num(o.workCost) ?? undefined,
      materialsCost: num(o.materialsCost) ?? undefined,
      salonMaterialsCost: num(o.salonMaterialsCost) ?? undefined,
      masterMaterialsCost: num(o.masterMaterialsCost) ?? undefined,
      paymentMethod: paymentMethod as PaymentMethod | undefined,
      clientName: o.clientName != null ? String(o.clientName).trim() : undefined,
      clientPhone: o.clientPhone != null ? String(o.clientPhone).trim() : undefined,
    };
  }

  if (type === "update_visit_client") {
    const visitId = String(o.visitId || "");
    const clientName = String(o.clientName || "").trim();
    if (!visitId || !clientName) return null;
    return { type, visitId, clientName };
  }

  if (type === "delete_visit") {
    const visitId = String(o.visitId || o.id || "");
    if (!visitId) return null;
    return { type, visitId };
  }

  if (type === "add_solarium_session") {
    const date = String(o.date || "");
    const minutes = num(o.minutes);
    const pm = o.paymentMethod;
    const paymentOk =
      pm === "в долг" || isReceivingMethod(pm);
    if (!DATE_RE.test(date) || minutes === null || !(minutes > 0) || !paymentOk) return null;
    return {
      type,
      date,
      minutes,
      creamPrice: num(o.creamPrice) ?? 0,
      stickersPrice: num(o.stickersPrice) ?? 0,
      paymentMethod: pm as ReceivingPaymentMethod | "в долг",
      clientName: o.clientName != null ? String(o.clientName).trim() : undefined,
    };
  }

  if (type === "delete_solarium_session") {
    const id = String(o.id || "");
    if (!id) return null;
    return { type, id };
  }

  if (type === "add_settings_rule") {
    const effectiveDate = String(o.effectiveDate || "");
    const acquiringCommission = num(o.acquiringCommission);
    const solariumMinuteRate = num(o.solariumMinuteRate);
    if (
      !DATE_RE.test(effectiveDate) ||
      acquiringCommission === null ||
      solariumMinuteRate === null ||
      acquiringCommission < 0 ||
      solariumMinuteRate < 0
    ) {
      return null;
    }
    return {
      type,
      effectiveDate,
      acquiringCommission,
      solariumMinuteRate,
      adminBaseRate: num(o.adminBaseRate) ?? undefined,
    };
  }

  if (type === "update_settings_rule") {
    const id = String(o.id || "");
    if (!id) return null;
    return {
      type,
      id,
      effectiveDate: o.effectiveDate != null ? String(o.effectiveDate) : undefined,
      acquiringCommission: num(o.acquiringCommission) ?? undefined,
      solariumMinuteRate: num(o.solariumMinuteRate) ?? undefined,
      adminBaseRate: num(o.adminBaseRate) ?? undefined,
    };
  }

  if (type === "update_admin_days_rates") {
    const rates: Partial<AdminDayOfWeekRate> = {};
    let any = false;
    for (const key of ADMIN_DAY_KEYS) {
      if (o[key] !== undefined) {
        const v = num(o[key]);
        if (v === null || v < 0) return null;
        rates[key] = v;
        any = true;
      }
    }
    if (!any) return null;
    return { type, ...rates };
  }

  if (type === "update_material_packaging") {
    const key = String(o.key || "");
    const price = num(o.price);
    const volume = num(o.volume);
    if (!PACKAGING_KEYS.has(key) || price === null || volume === null || !(price >= 0) || !(volume > 0)) {
      return null;
    }
    return { type, key, price, volume };
  }

  if (type === "update_debt_comment") {
    const id = String(o.id || "");
    const comment = String(o.comment || "").trim();
    if (!id || !comment) return null;
    return { type, id, comment };
  }

  if (type === "log_note") {
    const message = String(o.message || "").trim();
    if (!message) return null;
    return { type, message };
  }

  if (type === "open_tab") {
    const tab = String(o.tab || o.id || "");
    if (!isAppTabId(tab)) return null;
    return { type, tab };
  }

  if (type === "open_owner_section") {
    const section = String(o.section || o.subTab || o.id || "");
    if (!isOwnerSubTabId(section)) return null;
    return { type, section };
  }

  if (type === "set_journal_date") {
    const date = String(o.date || "");
    if (!DATE_RE.test(date)) return null;
    return { type, date };
  }

  if (type === "open_crash_logs") {
    return { type };
  }

  return null;
}

export function describeAction(action: AiAssistantAction, state?: AppStoreState): string {
  const empName = (id: string) =>
    state?.employees.find((e) => e.id === id)?.name || "мастер";
  const visitLabel = (id: string) => {
    const v = state?.visits.find((x) => x.id === id);
    if (!v) return "визит";
    const name = empName(v.masterId);
    return `визит ${v.date} (${name}${v.clientName ? `, ${v.clientName}` : ""})`;
  };
  const packagingLabel: Record<string, string> = {
    shampooProscenia: "шампунь Proscenia",
    lotionAcPretreatment: "лосьон AC Pretreatment",
    laminatingGel: "ламинирующий гель/крем",
    maskProscenia: "маска Proscenia",
    shampooProeditCurlFit: "шампунь CURL FIT",
    basePliaBase: "база PLIA BASE",
    lotionPliaStep1: "лосьон PLIA шаг 1",
    lotionPliaStep2: "лосьон PLIA шаг 2",
    conditionerPearl: "кондиционер Жемчужный",
    serumAfterPerm: "сыворотка AFTER PERM",
  };

  switch (action.type) {
    case "add_extra_transaction":
      return `Доп. операция: ${action.txType} ${action.amount} ₽ на ${action.date} — «${action.comment}»`;
    case "delete_extra_transaction":
      return `Удалить доп. операцию`;
    case "update_extra_transaction_comment":
      return `Изменить комментарий доп. операции → «${action.comment}»`;
    case "add_visit":
      return `Добавить визит на ${action.date}: ${action.masterName || empName(action.masterId || "")}, работа ${action.workCost} ₽, оплата «${action.paymentMethod}»`;
    case "update_visit":
      return `Изменить ${visitLabel(action.visitId)}`;
    case "update_visit_client":
      return `${visitLabel(action.visitId)}: клиент → «${action.clientName}»`;
    case "delete_visit":
      return `Удалить ${visitLabel(action.visitId)}`;
    case "add_solarium_session":
      return `Сеанс солярия на ${action.date}: ${action.minutes} мин, оплата «${action.paymentMethod}»`;
    case "delete_solarium_session":
      return `Удалить сеанс солярия`;
    case "add_settings_rule":
      return `Новое правило тарифов с ${action.effectiveDate}: эквайринг ${action.acquiringCommission}%, солярий ${action.solariumMinuteRate} ₽/мин`;
    case "update_settings_rule":
      return `Изменить правило тарифов`;
    case "update_admin_days_rates":
      return `Обновить ставки администраторов по дням недели`;
    case "update_material_packaging":
      return `Обновить прайс: ${packagingLabel[action.key] || "материал"} — ${action.price} ₽ / объём ${action.volume}`;
    case "update_debt_comment":
      return `Изменить комментарий к долгу → «${action.comment}»`;
    case "log_note":
      return `Заметка в журнал: ${action.message}`;
    case "open_tab":
      return `Открыть вкладку «${TAB_LABELS_RU[action.tab]}»`;
    case "open_owner_section":
      return `Открыть «Владелица → ${OWNER_SUBTAB_LABELS_RU[action.section]}»`;
    case "set_journal_date":
      return `Выбрать в журнале дату ${action.date}`;
    case "open_crash_logs":
      return `Открыть папку журналов CrashLogs`;
    default:
      return "Действие";
  }
}

/** Применяет whitelist-действия к снимку state → patch. */
export function applyAssistantActions(
  state: AppStoreState,
  actions: AiAssistantAction[]
): { patch: AppStorePatch; applied: string[]; errors: string[]; logNotes: string[] } {
  let visits: Visit[] | undefined;
  let extraTransactions: ExtraTransaction[] | undefined;
  let debtRecords: DebtRecord[] | undefined;
  let solariumSessions: SolariumSession[] | undefined;
  let settingsRules: SettingsRule[] | undefined;
  let adminDaysRates: AdminDayOfWeekRate | undefined;
  let materialPackaging: AppStoreState["materialPackaging"] | undefined;
  let materialPrices: AppStoreState["materialPrices"] | undefined;
  let giftCertificates = state.giftCertificates;

  const applied: string[] = [];
  const errors: string[] = [];
  const logNotes: string[] = [];

  const ensureVisits = () => {
    if (!visits) visits = [...state.visits];
    return visits;
  };
  const ensureExtras = () => {
    if (!extraTransactions) extraTransactions = [...state.extraTransactions];
    return extraTransactions;
  };
  const ensureDebts = () => {
    if (!debtRecords) debtRecords = [...state.debtRecords];
    return debtRecords;
  };
  const ensureSolarium = () => {
    if (!solariumSessions) solariumSessions = [...state.solariumSessions];
    return solariumSessions;
  };
  const ensureRules = () => {
    if (!settingsRules) settingsRules = [...state.settingsRules];
    return settingsRules;
  };

  for (const action of actions) {
    try {
      if (isUiAction(action)) {
        continue;
      }

      if (action.type === "log_note") {
        logNotes.push(action.message);
        applied.push(describeAction(action, state));
        continue;
      }

      if (action.type === "add_extra_transaction") {
        const list = ensureExtras();
        list.push({
          id: newId("ai-extra"),
          date: action.date,
          type: action.txType,
          amount: action.amount,
          comment: action.comment,
          category: action.category,
        });
        applied.push(describeAction(action, state));
        continue;
      }

      if (action.type === "delete_extra_transaction") {
        const list = ensureExtras();
        const idx = list.findIndex((t) => t.id === action.id);
        if (idx < 0) {
          errors.push(`Операция не найдена`);
          continue;
        }
        list[idx] = { ...list[idx], isDeleted: true };
        applied.push(describeAction(action, state));
        continue;
      }

      if (action.type === "update_extra_transaction_comment") {
        const list = ensureExtras();
        const idx = list.findIndex((t) => t.id === action.id);
        if (idx < 0) {
          errors.push(`Операция не найдена`);
          continue;
        }
        list[idx] = { ...list[idx], comment: action.comment };
        applied.push(describeAction(action, state));
        continue;
      }

      if (action.type === "add_visit") {
        const emp = resolveEmployeeId(state.employees, {
          masterId: action.masterId,
          masterName: action.masterName,
        });
        if (!emp) {
          errors.push(`Сотрудник не найден (${action.masterName || action.masterId || "—"})`);
          continue;
        }
        if (!canEmployeeTakeVisits(emp)) {
          errors.push(`${emp.name} — администратор, визиты мастера на неё не оформляются`);
          continue;
        }
        const mats = action.materialsCost ?? 0;
        const daySettings = getActiveSettingsForDate(state.settingsRules, action.date);
        const { acquiringCost, totalCost } = calculateVisitTotal(
          action.workCost,
          mats,
          action.paymentMethod,
          daySettings.acquiringCommission
        );
        const visitId = newId("ai-visit");
        let debtId: string | undefined;

        if (action.paymentMethod === "в долг") {
          debtId = newId("ai-debt");
          const debts = ensureDebts();
          debts.push({
            id: debtId,
            clientName: action.clientName || "Клиент",
            clientPhone: action.clientPhone,
            visitId,
            visitDate: action.date,
            originalAmount: action.workCost + mats,
            remainingAmount: action.workCost + mats,
            createdDate: action.date,
            payments: [],
            isClosed: false,
          });
        }

        if (action.paymentMethod === "сертификат" && action.giftCertificateId) {
          const certIdx = giftCertificates.findIndex((c) => c.id === action.giftCertificateId);
          if (certIdx < 0) {
            errors.push(`Сертификат не найден`);
            continue;
          }
          const cert = giftCertificates[certIdx];
          const base = action.workCost + mats;
          if (cert.balance < base) {
            errors.push(`Недостаточно средств на сертификате ${cert.code}`);
            continue;
          }
          giftCertificates = [...giftCertificates];
          giftCertificates[certIdx] = {
            ...cert,
            balance: cert.balance - base,
            usages: [
              ...cert.usages,
              { id: newId("ai-cert-use"), date: action.date, visitId, amount: base },
            ],
          };
        }

        const list = ensureVisits();
        list.push({
          id: visitId,
          date: action.date,
          masterId: emp.id,
          paymentMethod: action.paymentMethod,
          workCost: action.workCost,
          materialsCost: mats,
          salonMaterialsCost: action.salonMaterialsCost,
          masterMaterialsCost: action.masterMaterialsCost,
          manicureType: action.manicureType,
          acquiringCost,
          totalCost,
          giftCertificateId:
            action.paymentMethod === "сертификат" ? action.giftCertificateId : undefined,
          certificateAmountUsed:
            action.paymentMethod === "сертификат" ? action.workCost + mats : undefined,
          debtId,
          clientName: action.clientName,
          clientPhone: action.clientPhone,
          editLogs: [
            {
              timestamp: new Date().toISOString(),
              action: "создан",
              details: "Создан через AI-помощника",
            },
          ],
        });
        applied.push(
          describeAction({ ...action, masterId: emp.id, masterName: emp.name }, state)
        );
        continue;
      }

      if (action.type === "update_visit" || action.type === "update_visit_client") {
        const list = ensureVisits();
        const visitId = action.type === "update_visit" ? action.visitId : action.visitId;
        const idx = list.findIndex((v) => v.id === visitId);
        if (idx < 0) {
          errors.push(`Визит не найден`);
          continue;
        }
        const prev = list[idx];
        if (action.type === "update_visit_client") {
          list[idx] = { ...prev, clientName: action.clientName };
          applied.push(describeAction(action, state));
          continue;
        }
        if (action.masterId && !state.employees.some((e) => e.id === action.masterId)) {
          errors.push(`Мастер не найден`);
          continue;
        }
        const workCost = action.workCost ?? prev.workCost;
        const materialsCost = action.materialsCost ?? prev.materialsCost;
        const paymentMethod = action.paymentMethod ?? prev.paymentMethod;
        const daySettings = getActiveSettingsForDate(state.settingsRules, prev.date);
        const { acquiringCost, totalCost } = calculateVisitTotal(
          workCost,
          materialsCost,
          paymentMethod,
          daySettings.acquiringCommission
        );
        list[idx] = {
          ...prev,
          masterId: action.masterId ?? prev.masterId,
          workCost,
          materialsCost,
          salonMaterialsCost: action.salonMaterialsCost ?? prev.salonMaterialsCost,
          masterMaterialsCost: action.masterMaterialsCost ?? prev.masterMaterialsCost,
          paymentMethod,
          clientName: action.clientName ?? prev.clientName,
          clientPhone: action.clientPhone ?? prev.clientPhone,
          acquiringCost,
          totalCost,
          editLogs: [
            ...prev.editLogs,
            {
              timestamp: new Date().toISOString(),
              action: "отредактирован",
              details: "Изменён через AI-помощника",
            },
          ],
        };
        applied.push(describeAction(action, state));
        continue;
      }

      if (action.type === "delete_visit") {
        const list = ensureVisits();
        const idx = list.findIndex((v) => v.id === action.visitId);
        if (idx < 0) {
          errors.push(`Визит не найден`);
          continue;
        }
        const prev = list[idx];
        list[idx] = {
          ...prev,
          isDeleted: true,
          editLogs: [
            ...prev.editLogs,
            {
              timestamp: new Date().toISOString(),
              action: "удален",
              details: "Удалён через AI-помощника",
            },
          ],
        };
        applied.push(describeAction(action, state));
        continue;
      }

      if (action.type === "add_solarium_session") {
        const rate = getActiveSettingsForDate(state.settingsRules, action.date).solariumMinuteRate;
        const cream = action.creamPrice ?? 0;
        const stickers = action.stickersPrice ?? 0;
        const base = action.minutes * rate + cream + stickers;
        const commission = getActiveSettingsForDate(state.settingsRules, action.date).acquiringCommission;
        const acquiringCost =
          action.paymentMethod === "дебетовая карта"
            ? Math.round(base * (commission / 100) * 100) / 100
            : 0;
        const list = ensureSolarium();
        list.push({
          id: newId("ai-sol"),
          date: action.date,
          minutes: action.minutes,
          minuteRate: rate,
          creamPrice: cream,
          stickersPrice: stickers,
          paymentMethod: action.paymentMethod,
          acquiringCost,
          clientName: action.clientName,
        });
        applied.push(describeAction(action, state));
        continue;
      }

      if (action.type === "delete_solarium_session") {
        const list = ensureSolarium();
        const next = list.filter((s) => s.id !== action.id);
        if (next.length === list.length) {
          errors.push(`Сеанс солярия не найден`);
          continue;
        }
        solariumSessions = next;
        applied.push(describeAction(action, state));
        continue;
      }

      if (action.type === "add_settings_rule") {
        const list = ensureRules();
        const adminBaseRate =
          action.adminBaseRate ??
          getActiveSettingsForDate(list, action.effectiveDate).adminBaseRate ??
          1500;
        list.push({
          id: newId("ai-rule"),
          effectiveDate: action.effectiveDate,
          acquiringCommission: action.acquiringCommission,
          solariumMinuteRate: action.solariumMinuteRate,
          adminBaseRate,
        });
        applied.push(describeAction(action, state));
        continue;
      }

      if (action.type === "update_settings_rule") {
        const list = ensureRules();
        const idx = list.findIndex((r) => r.id === action.id);
        if (idx < 0) {
          errors.push(`Правило тарифов не найдено`);
          continue;
        }
        const prev = list[idx];
        if (action.effectiveDate && !DATE_RE.test(action.effectiveDate)) {
          errors.push("Некорректная дата правила");
          continue;
        }
        list[idx] = {
          ...prev,
          effectiveDate: action.effectiveDate ?? prev.effectiveDate,
          acquiringCommission: action.acquiringCommission ?? prev.acquiringCommission,
          solariumMinuteRate: action.solariumMinuteRate ?? prev.solariumMinuteRate,
          adminBaseRate: action.adminBaseRate ?? prev.adminBaseRate,
        };
        applied.push(describeAction(action, state));
        continue;
      }

      if (action.type === "update_admin_days_rates") {
        adminDaysRates = {
          ...(adminDaysRates ?? state.adminDaysRates),
          ...Object.fromEntries(
            ADMIN_DAY_KEYS.filter((k) => action[k] !== undefined).map((k) => [k, action[k] as number])
          ),
        } as AdminDayOfWeekRate;
        applied.push(describeAction(action, state));
        continue;
      }

      if (action.type === "update_material_packaging") {
        materialPackaging = {
          ...(materialPackaging ?? state.materialPackaging),
          [action.key]: { price: action.price, volume: action.volume },
        };
        materialPrices = deriveMaterialPricesFromPackaging(materialPackaging);
        applied.push(describeAction(action, state));
        continue;
      }

      if (action.type === "update_debt_comment") {
        const list = ensureDebts();
        const idx = list.findIndex((d) => d.id === action.id);
        if (idx < 0) {
          errors.push(`Долг не найден`);
          continue;
        }
        list[idx] = { ...list[idx], comment: action.comment };
        applied.push(describeAction(action, state));
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  const patch: AppStorePatch = {};
  if (visits) patch.visits = visits;
  if (extraTransactions) patch.extraTransactions = extraTransactions;
  if (debtRecords) patch.debtRecords = debtRecords;
  if (solariumSessions) patch.solariumSessions = solariumSessions;
  if (settingsRules) patch.settingsRules = settingsRules;
  if (adminDaysRates) patch.adminDaysRates = adminDaysRates;
  if (materialPackaging) patch.materialPackaging = materialPackaging;
  if (materialPrices) patch.materialPrices = materialPrices;
  if (giftCertificates !== state.giftCertificates) patch.giftCertificates = giftCertificates;

  return { patch, applied, errors, logNotes };
}
