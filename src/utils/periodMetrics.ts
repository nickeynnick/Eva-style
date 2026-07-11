import {
  Employee,
  Visit,
  SolariumSession,
  AdminShift,
  ExtraTransaction,
  SettingsRule,
  GiftCertificate,
  DebtRecord,
} from "../types";
import { computeDayAcquiring } from "./dailyFinanceUtils";
import { getSolariumMinuteRate } from "./settingsUtils";
import { calculateMasterShareForVisit } from "./salaryUtils";

export interface MonthMetrics {
  monthPrefix: string;
  visitCount: number;
  grossRevenueExcludingMaterials: number;
  netEarnings: number;
  totalAcquiring: number;
  adminsWages: number;
  mastersWages: number;
}

export function computeMonthMetrics(
  monthPrefix: string,
  visits: Visit[],
  solariumSessions: SolariumSession[],
  adminShifts: AdminShift[],
  extraTransactions: ExtraTransaction[],
  employees: Employee[],
  settingsRules: SettingsRule[],
  giftCertificates: GiftCertificate[],
  debtRecords: DebtRecord[]
): MonthMetrics {
  const monthVisits = visits.filter((v) => v.date.startsWith(monthPrefix) && !v.isDeleted);
  const monthSolarium = solariumSessions.filter((s) => s.date.startsWith(monthPrefix));
  const monthShifts = adminShifts.filter((s) => s.date.startsWith(monthPrefix));
  const monthTxs = extraTransactions.filter((t) => t.date.startsWith(monthPrefix) && !t.isDeleted);

  const workRevenue = monthVisits.reduce((s, v) => s + v.workCost, 0);
  const solMins = monthSolarium.reduce(
    (s, sess) => s + sess.minutes * getSolariumMinuteRate(sess, settingsRules),
    0
  );
  const grossRevenueExcludingMaterials = workRevenue + solMins;

  const adminsWages = monthShifts.reduce((s, sh) => s + sh.rate, 0);
  const mastersWages = monthVisits.reduce((s, v) => {
    const emp = employees.find((e) => e.id === v.masterId);
    if (!emp) return s;
    return s + calculateMasterShareForVisit(emp, v);
  }, 0);

  const otherBillExpenses = monthTxs
    .filter(
      (t) =>
        t.type === "минус" &&
        !(
          t.category === "Закупка товара" ||
          t.category === "Закупка материалов" ||
          t.comment?.toLowerCase().includes("материал") ||
          t.comment?.toLowerCase().includes("закупка")
        )
    )
    .reduce((s, t) => s + t.amount, 0);

  let totalAcquiring = 0;
  const daysInMonth = new Date(
    Number(monthPrefix.slice(0, 4)),
    Number(monthPrefix.slice(5, 7)),
    0
  ).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${monthPrefix}${d.toString().padStart(2, "0")}`;
    totalAcquiring += computeDayAcquiring(
      dateStr,
      visits,
      solariumSessions,
      giftCertificates,
      debtRecords,
      settingsRules
    );
  }

  const netEarnings =
    grossRevenueExcludingMaterials - (adminsWages + mastersWages + totalAcquiring + otherBillExpenses);

  return {
    monthPrefix,
    visitCount: monthVisits.length,
    grossRevenueExcludingMaterials: Math.round(grossRevenueExcludingMaterials * 100) / 100,
    netEarnings: Math.round(netEarnings * 100) / 100,
    totalAcquiring: Math.round(totalAcquiring * 100) / 100,
    adminsWages,
    mastersWages,
  };
}

export function formatDelta(current: number, previous: number): { text: string; positive: boolean } {
  const diff = current - previous;
  const pct = previous !== 0 ? Math.round((diff / previous) * 1000) / 10 : null;
  const sign = diff >= 0 ? "+" : "";
  const text =
    pct !== null
      ? `${sign}${diff.toLocaleString("ru-RU")} ₽ (${sign}${pct}%)`
      : `${sign}${diff.toLocaleString("ru-RU")} ₽`;
  return { text, positive: diff >= 0 };
}
