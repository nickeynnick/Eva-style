import { describe, expect, it } from "vitest";
import { buildPeriodFinanceCsvContent, type PeriodFinanceCsvSummary } from "../utils/csvExport";

describe("buildPeriodFinanceCsvContent", () => {
  it("includes period title, P&L rows and masters", () => {
    const summary: PeriodFinanceCsvSummary = {
      periodTitle: "Июль 2026",
      grossRevenueExcludingMaterials: 1000,
      totalVisitsWorkRevenues: 800,
      totalSolariumMinsRevenues: 200,
      totalSalonMaterialsRevenue: 50,
      totalSolariumMaterialsRevenue: 10,
      materialsPurchaseExpenses: 20,
      adminsMonthlyWages: 100,
      mastersPortionsWages: 200,
      totalAcquiringCommissionPaid: 30,
      otherBillExpenses: 40,
      totalExpensesExcludingMaterials: 370,
      netEarnings: 630,
      cashlessGrossRevenue: 500,
      cashlessAcquiringCommissions: 30,
      cashlessNetRevenue: 470,
    };

    const csv = buildPeriodFinanceCsvContent(summary, [
      { name: "Анна", position: "Парикмахер", count: 2, work: 800, materials: 50, total: 850 },
    ]);

    expect(csv).toContain("Июль 2026");
    expect(csv).toContain("Чистый результат");
    expect(csv).toContain("630");
    expect(csv).toContain("Анна");
    expect(csv.startsWith("\uFEFF")).toBe(true);
  });
});
