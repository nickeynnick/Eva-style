import { describe, it, expect } from "vitest";
import { getActiveSettingsForDate } from "../utils/settingsUtils";
import { SettingsRule } from "../types";

const rules: SettingsRule[] = [
  { id: "r1", effectiveDate: "2024-01-01", acquiringCommission: 2, adminBaseRate: 1000, solariumMinuteRate: 25 },
  { id: "r2", effectiveDate: "2025-06-01", acquiringCommission: 3.5, adminBaseRate: 1500, solariumMinuteRate: 30 },
  { id: "r3", effectiveDate: "2026-01-01", acquiringCommission: 4, adminBaseRate: 1800, solariumMinuteRate: 35 },
];

describe("getActiveSettingsForDate", () => {
  it("returns rule effective on or before the date", () => {
    expect(getActiveSettingsForDate(rules, "2025-05-31").acquiringCommission).toBe(2);
    expect(getActiveSettingsForDate(rules, "2025-06-01").acquiringCommission).toBe(3.5);
    expect(getActiveSettingsForDate(rules, "2026-07-01").solariumMinuteRate).toBe(35);
  });

  it("returns default for empty rules", () => {
    const s = getActiveSettingsForDate([], "2025-01-01");
    expect(s.acquiringCommission).toBe(3.5);
    expect(s.solariumMinuteRate).toBe(30);
  });

  it("picks latest matching rule, not first in array", () => {
    const shuffled = [...rules].reverse();
    expect(getActiveSettingsForDate(shuffled, "2026-03-15").id).toBe("r3");
  });
});
