import { describe, it, expect } from "vitest";
import {
  getMasterCommissionPercent,
  calculateMasterShareForVisit,
  calculateMasterShareAmount,
} from "../utils/salaryUtils";
import { Employee, Visit, Position } from "../types";

const manicurist: Employee = {
  id: "m1",
  name: "Маникюр",
  position: Position.Manicurist,
  percentage: 50,
  manicuresPercentage: { classical: 80, apparatus: 75 },
  dailyRent: 0,
  phone: "",
};

const hairdresser: Employee = {
  id: "h1",
  name: "Парикмахер",
  position: Position.Hairdresser,
  percentage: 50,
  dailyRent: 0,
  phone: "",
};

describe("salaryUtils", () => {
  it("uses manicure type percentages", () => {
    const classical = { workCost: 1000, manicureType: "classical" } as Visit;
    const apparatus = { workCost: 1000, manicureType: "apparatus" } as Visit;
    expect(getMasterCommissionPercent(manicurist, classical)).toBe(80);
    expect(calculateMasterShareForVisit(manicurist, classical)).toBe(800);
    expect(calculateMasterShareForVisit(manicurist, apparatus)).toBe(750);
  });

  it("uses default percentage for non-manicurists", () => {
    const visit = { workCost: 2000 } as Visit;
    expect(calculateMasterShareForVisit(hairdresser, visit)).toBe(1000);
  });

  it("sums shares across visits", () => {
    const visits = [
      { workCost: 1000, manicureType: "classical" },
      { workCost: 500, manicureType: "apparatus" },
    ] as Visit[];
    expect(calculateMasterShareAmount(manicurist, visits)).toBe(800 + 375);
  });
});
