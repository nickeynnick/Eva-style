import {
  Employee,
  Visit,
  AdminShift,
  SolariumSession,
  MasterTransaction,
  Position,
} from "../types";
import { calculateMasterShareForVisit } from "./salaryUtils";
import { getSolariumSessionBase } from "./settingsUtils";
import { SettingsRule } from "../types";

const BOM = "\uFEFF";

function escapeCsv(value: string | number): string {
  const s = String(value);
  if (/[",;\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(rows: (string | number)[][]): string {
  return BOM + rows.map((row) => row.map(escapeCsv).join(";")).join("\r\n");
}

function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportMasterPayrollCsv(
  employees: Employee[],
  visits: Visit[],
  masterTransactions: MasterTransaction[],
  monthPrefix: string,
  filename?: string
): void {
  const masters = employees.filter((e) => e.position !== Position.Administrator);
  const rows: (string | number)[][] = [
    ["Мастер", "Визитов", "Объём работ (₽)", "Начислено (₽)", "Выплачено (₽)", "Остаток (₽)"],
  ];

  for (const master of masters) {
    const masterVisits = visits.filter(
      (v) => v.masterId === master.id && !v.isDeleted && v.date.startsWith(monthPrefix)
    );
    const workTotal = masterVisits.reduce((s, v) => s + v.workCost, 0);
    const share = masterVisits.reduce((s, v) => s + calculateMasterShareForVisit(master, v), 0);
    const txs = masterTransactions.filter(
      (t) => t.masterId === master.id && t.date.startsWith(monthPrefix)
    );
    const paid = txs
      .filter((t) => t.type === "выплата" || t.type === "аванс")
      .reduce((s, t) => s + t.amount, 0);
    rows.push([master.name, masterVisits.length, workTotal, share, paid, Math.round((share - paid) * 100) / 100]);
  }

  downloadCsv(filename ?? `eva_style_masters_${monthPrefix}.csv`, rowsToCsv(rows));
}

export function exportAdminShiftsCsv(
  employees: Employee[],
  adminShifts: AdminShift[],
  monthPrefix: string,
  filename?: string
): void {
  const admins = employees.filter((e) => e.position === Position.Administrator);
  const adminName = (id: string) => admins.find((a) => a.id === id)?.name ?? id;

  const rows: (string | number)[][] = [["Дата", "Администратор", "Ставка (₽)", "Примечание"]];
  const shifts = adminShifts
    .filter((s) => s.date.startsWith(monthPrefix))
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const s of shifts) {
    rows.push([s.date, adminName(s.adminId), s.rate, ""]);
  }

  const total = shifts.reduce((sum, s) => sum + s.rate, 0);
  rows.push(["", "ИТОГО", total, ""]);

  downloadCsv(filename ?? `eva_style_admins_${monthPrefix}.csv`, rowsToCsv(rows));
}

export function exportMonthlyRevenueCsv(
  year: number,
  visits: Visit[],
  solariumSessions: SolariumSession[],
  settingsRules: SettingsRule[],
  filename?: string
): void {
  const months = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
  ];
  const rows: (string | number)[][] = [
    ["Месяц", "Работа визитов (₽)", "Материалы визитов (₽)", "Солярий минуты (₽)", "Итого (₽)"],
  ];

  for (let m = 0; m < 12; m++) {
    const prefix = `${year}-${(m + 1).toString().padStart(2, "0")}-`;
    const monthVisits = visits.filter((v) => v.date.startsWith(prefix) && !v.isDeleted);
    const monthSol = solariumSessions.filter((s) => s.date.startsWith(prefix));
    const work = monthVisits.reduce((s, v) => s + v.workCost, 0);
    const mats = monthVisits.reduce((s, v) => s + v.materialsCost, 0);
    const sol = monthSol.reduce((s, sess) => s + getSolariumSessionBase(sess, settingsRules), 0);
    rows.push([months[m], work, mats, sol, work + mats + sol]);
  }

  downloadCsv(filename ?? `eva_style_revenue_${year}.csv`, rowsToCsv(rows));
}
