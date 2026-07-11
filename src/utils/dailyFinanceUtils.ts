import {
  Visit,
  SolariumSession,
  GiftCertificate,
  DebtRecord,
  SettingsRule,
} from "../types";
import { calculateAcquiring } from "./paymentUtils";
import { getActiveSettingsForDate, getSolariumSessionAcquiring, getSolariumSessionTotal } from "./settingsUtils";

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

/** Сумма эквайринга за список дат (визиты, солярий, продажа сертификатов, погашение долгов). */
export function computePeriodAcquiring(
  dateStrings: string[],
  visits: Visit[],
  solariumSessions: SolariumSession[],
  giftCertificates: GiftCertificate[],
  debtRecords: DebtRecord[],
  settingsRules: SettingsRule[]
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
        settingsRules
      ),
    0
  );
  return Math.round(total * 100) / 100;
}

/** Брутто-поступления на карту/р/с за день (включая продажу сертификатов и погашение долгов). */
export function computeDayCashlessGross(
  dateStr: string,
  visits: Visit[],
  solariumSessions: SolariumSession[],
  giftCertificates: GiftCertificate[],
  debtRecords: DebtRecord[],
  settingsRules: SettingsRule[]
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

  return Math.round((visitsCard + solariumCard + certCard + debtCard) * 100) / 100;
}

export function computePeriodCashlessGross(
  dateStrings: string[],
  visits: Visit[],
  solariumSessions: SolariumSession[],
  giftCertificates: GiftCertificate[],
  debtRecords: DebtRecord[],
  settingsRules: SettingsRule[]
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
        settingsRules
      ),
    0
  );
  return Math.round(total * 100) / 100;
}
