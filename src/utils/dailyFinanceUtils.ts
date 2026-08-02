import {
  Visit,
  SolariumSession,
  GiftCertificate,
  DebtRecord,
  SettingsRule,
  ExtraTransaction,
  DailyCashState,
  MasterTransaction,
} from "../types";
import { calculateAcquiring, getVisitCashAmount } from "./paymentUtils";
import {
  getActiveSettingsForDate,
  getSolariumSessionAcquiring,
  getSolariumSessionBase,
  getSolariumSessionTotal,
} from "./settingsUtils";

export function getExtraIncomeAcquiring(
  tx: Pick<ExtraTransaction, "type" | "amount" | "paymentMethod" | "acquiringCost" | "date">,
  settingsRules: SettingsRule[]
): number {
  if (tx.type !== "плюс" || tx.paymentMethod !== "дебетовая карта") return 0;
  if (tx.acquiringCost !== undefined) return tx.acquiringCost;
  const settings = getActiveSettingsForDate(settingsRules, tx.date);
  return calculateAcquiring(tx.amount, "дебетовая карта", settings.acquiringCommission);
}

/** Комиссия эквайринга за день: визиты, солярий, сертификаты, долги и доп. доходы картой. */
export function computeDayAcquiring(
  dateStr: string,
  visits: Visit[],
  solariumSessions: SolariumSession[],
  giftCertificates: GiftCertificate[],
  debtRecords: DebtRecord[],
  settingsRules: SettingsRule[],
  extraTransactions: ExtraTransaction[] = []
): number {
  const visitsAcq = visits
    .filter((v) => v.date === dateStr && !v.isDeleted && v.paymentMethod === "дебетовая карта")
    .reduce((sum, v) => sum + v.acquiringCost, 0);

  const solariumAcq = solariumSessions
    .filter((s) => s.date === dateStr && s.paymentMethod === "дебетовая карта")
    .reduce((sum, s) => sum + getSolariumSessionAcquiring(s, settingsRules), 0);

  const certAcq = giftCertificates
    .filter((c) => c.soldDate === dateStr && c.salePaymentMethod === "дебетовая карта")
    .reduce((sum, c) => {
      const settings = getActiveSettingsForDate(settingsRules, c.soldDate);
      return sum + calculateAcquiring(c.nominal, "дебетовая карта", settings.acquiringCommission);
    }, 0);

  const debtAcq = debtRecords
    .flatMap((d) => d.payments.filter((p) => p.date === dateStr))
    .filter((p) => p.paymentMethod === "дебетовая карта")
    .reduce((sum, p) => sum + getDebtPaymentAcquiringCost(p, settingsRules), 0);

  const extraAcq = extraTransactions
    .filter((t) => t.date === dateStr && !t.isDeleted && t.type === "плюс")
    .reduce((sum, t) => sum + getExtraIncomeAcquiring(t, settingsRules), 0);

  return Math.round((visitsAcq + solariumAcq + certAcq + debtAcq + extraAcq) * 100) / 100;
}

export function getDebtPaymentAcquiringCost(
  payment: { date: string; amount: number; paymentMethod: string; acquiringCost?: number },
  settingsRules: SettingsRule[]
): number {
  if (payment.paymentMethod !== "дебетовая карта") return 0;
  if (payment.acquiringCost !== undefined) return payment.acquiringCost;
  const settings = getActiveSettingsForDate(settingsRules, payment.date);
  return calculateAcquiring(payment.amount, "дебетовая карта", settings.acquiringCommission);
}

export function getDebtPaymentCardTotal(
  payment: { date: string; amount: number; paymentMethod: string; acquiringCost?: number },
  settingsRules: SettingsRule[]
): number {
  if (payment.paymentMethod !== "дебетовая карта") return 0;
  return payment.amount + getDebtPaymentAcquiringCost(payment, settingsRules);
}

/** Сумма эквайринга за список дат (визиты, солярий, сертификаты, долги, доп. доходы). */
export function computePeriodAcquiring(
  dateStrings: string[],
  visits: Visit[],
  solariumSessions: SolariumSession[],
  giftCertificates: GiftCertificate[],
  debtRecords: DebtRecord[],
  settingsRules: SettingsRule[],
  extraTransactions: ExtraTransaction[] = []
): number {
  const total = dateStrings.reduce(
    (sum, dateStr) =>
      sum +
      computeDayAcquiring(
        dateStr,
        visits,
        solariumSessions,
        giftCertificates,
        debtRecords,
        settingsRules,
        extraTransactions
      ),
    0
  );
  return Math.round(total * 100) / 100;
}

/** Брутто-поступления на карту/р/с за день (включая продажу сертификатов, погашение долгов и доп. доходы). */
export function computeDayCashlessGross(
  dateStr: string,
  visits: Visit[],
  solariumSessions: SolariumSession[],
  giftCertificates: GiftCertificate[],
  debtRecords: DebtRecord[],
  settingsRules: SettingsRule[],
  extraTransactions: ExtraTransaction[] = []
): number {
  const visitsCard = visits
    .filter((v) => v.date === dateStr && !v.isDeleted && v.paymentMethod === "дебетовая карта")
    .reduce((sum, v) => sum + v.workCost + v.materialsCost + v.acquiringCost, 0);

  const solariumCard = solariumSessions
    .filter((s) => s.date === dateStr && s.paymentMethod === "дебетовая карта")
    .reduce((sum, s) => sum + getSolariumSessionTotal(s, settingsRules), 0);

  const certCard = giftCertificates
    .filter((c) => c.soldDate === dateStr && c.salePaymentMethod === "дебетовая карта")
    .reduce((sum, c) => {
      const settings = getActiveSettingsForDate(settingsRules, c.soldDate);
      const acq = calculateAcquiring(c.nominal, "дебетовая карта", settings.acquiringCommission);
      return sum + c.nominal + acq;
    }, 0);

  const debtCard = debtRecords
    .flatMap((d) => d.payments.filter((p) => p.date === dateStr))
    .filter((p) => p.paymentMethod === "дебетовая карта")
    .reduce((sum, p) => sum + getDebtPaymentCardTotal(p, settingsRules), 0);

  const extraCard = extraTransactions
    .filter(
      (t) =>
        t.date === dateStr &&
        !t.isDeleted &&
        t.type === "плюс" &&
        t.paymentMethod === "дебетовая карта"
    )
    .reduce((sum, t) => sum + t.amount + getExtraIncomeAcquiring(t, settingsRules), 0);

  return Math.round((visitsCard + solariumCard + certCard + debtCard + extraCard) * 100) / 100;
}

export function computePeriodCashlessGross(
  dateStrings: string[],
  visits: Visit[],
  solariumSessions: SolariumSession[],
  giftCertificates: GiftCertificate[],
  debtRecords: DebtRecord[],
  settingsRules: SettingsRule[],
  extraTransactions: ExtraTransaction[] = []
): number {
  const total = dateStrings.reduce(
    (sum, dateStr) =>
      sum +
      computeDayCashlessGross(
        dateStr,
        visits,
        solariumSessions,
        giftCertificates,
        debtRecords,
        settingsRules,
        extraTransactions
      ),
    0
  );
  return Math.round(total * 100) / 100;
}

/** Предыдущий календарный день (локально), YYYY-MM-DD. */
export function previousIsoDate(iso: string): string {
  const parts = iso.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return iso;
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  dt.setDate(dt.getDate() - 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

/**
 * Прогноз кассы на конец дня (как в «Учёте за день»):
 * старт + наличные притоки − операционные расходы − выплаты/авансы мастерам.
 */
export function computeProjectedEndCash(
  dateStr: string,
  dailyCash: DailyCashState[],
  visits: Visit[],
  solariumSessions: SolariumSession[],
  extraTransactions: ExtraTransaction[],
  masterTransactions: MasterTransaction[],
  giftCertificates: GiftCertificate[],
  debtRecords: DebtRecord[],
  settingsRules: SettingsRule[]
): number {
  const startCash = dailyCash.find((c) => c.date === dateStr)?.startCash ?? 0;

  const dayVisits = visits.filter((v) => v.date === dateStr && !v.isDeleted);
  const visitsCash = dayVisits.reduce((sum, v) => sum + getVisitCashAmount(v), 0);

  const daySolarium = solariumSessions.filter((s) => s.date === dateStr);
  const solariumCash = daySolarium
    .filter((s) => s.paymentMethod === "наличные")
    .reduce((sum, s) => sum + getSolariumSessionBase(s, settingsRules), 0);

  const dayExtras = extraTransactions.filter((t) => t.date === dateStr && !t.isDeleted);
  const expenses = dayExtras
    .filter((t) => t.type === "минус")
    .reduce((sum, t) => sum + t.amount, 0);
  const additionsCash = dayExtras
    .filter(
      (t) =>
        t.type === "плюс" &&
        (!t.paymentMethod || t.paymentMethod === "наличные")
    )
    .reduce((sum, t) => sum + t.amount, 0);

  const certSalesCash = giftCertificates
    .filter((c) => c.soldDate === dateStr && c.salePaymentMethod === "наличные")
    .reduce((sum, c) => sum + c.nominal, 0);

  const debtPaymentsCash = debtRecords
    .flatMap((d) => d.payments.filter((p) => p.date === dateStr))
    .filter((p) => p.paymentMethod === "наличные")
    .reduce((sum, p) => sum + p.amount, 0);

  const masterPayouts = masterTransactions
    .filter((t) => t.date === dateStr && (t.type === "выплата" || t.type === "аванс"))
    .reduce((sum, t) => sum + t.amount, 0);

  const cashInflow = visitsCash + solariumCash + additionsCash + certSalesCash + debtPaymentsCash;
  return Math.max(0, startCash + cashInflow - expenses - masterPayouts);
}
