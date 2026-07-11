import { Employee, Visit, Position } from "../types";

/** Процент мастера за визит с учётом типа маникюра. */
export function getMasterCommissionPercent(employee: Employee, visit: Visit): number {
  if (employee.position === Position.Manicurist && employee.manicuresPercentage) {
    if (visit.manicureType === "classical") return employee.manicuresPercentage.classical;
    if (visit.manicureType === "apparatus") return employee.manicuresPercentage.apparatus;
  }
  return employee.percentage;
}

/** Начисление мастеру за один визит (доля от работы). */
export function calculateMasterShareForVisit(employee: Employee, visit: Visit): number {
  const pct = getMasterCommissionPercent(employee, visit) / 100;
  return Math.round(visit.workCost * pct * 100) / 100;
}

/** Сумма долей мастера по списку визитов. */
export function calculateMasterShareAmount(employee: Employee, visits: Visit[]): number {
  return Math.round(
    visits.reduce((sum, v) => sum + calculateMasterShareForVisit(employee, v), 0) * 100
  ) / 100;
}
