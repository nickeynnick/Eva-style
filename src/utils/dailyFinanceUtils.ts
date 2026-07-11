import {
  Visit,
  SolariumSession,
  GiftCertificate,
  DebtRecord,
  SettingsRule,
} from "../types";
import { calculateAcquiring } from "./paymentUtils";
import { getActiveSettingsForDate, getSolariumSessionAcquiring } from "./settingsUtils";

/** Комиссия эквайринга за день: визиты, солярий, продажа сертификатов и погашение долгов картой. */
export function computeDayAcquiring(
  dateStr: string,
  visits: Visit[],
  solariumSessions: SolariumSession[],
  giftCertificates: GiftCertificate[],
  debtRecords: DebtRecord[],
  settingsRules: SettingsRule[]
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

  return Math.round((visitsAcq + solariumAcq + certAcq + debtAcq) * 100) / 100;
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
