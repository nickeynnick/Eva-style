import { describe, expect, it } from "vitest";
import { shouldRunAutoBackup, normalizeAutoBackupInterval } from "../utils/backupData";

describe("shouldRunAutoBackup", () => {
  it("runs when never backed up", () => {
    expect(shouldRunAutoBackup("daily", null, new Date("2026-07-14T12:00:00"))).toBe(true);
  });

  it("respects hourly interval", () => {
    const now = new Date("2026-07-14T12:00:00");
    expect(shouldRunAutoBackup("hourly", "2026-07-14T11:30:00", now)).toBe(false);
    expect(shouldRunAutoBackup("hourly", "2026-07-14T10:50:00", now)).toBe(true);
  });

  it("normalizes unknown interval to weekly", () => {
    expect(normalizeAutoBackupInterval("weird")).toBe("weekly");
    expect(normalizeAutoBackupInterval("every6h")).toBe("every6h");
  });
});
