import { describe, expect, it } from "vitest";
import {
  shouldRunAutoBackup,
  normalizeAutoBackupInterval,
  normalizeAutoBackupPreferredTime,
} from "../utils/backupData";

describe("normalizeAutoBackupPreferredTime", () => {
  it("keeps valid HH:mm", () => {
    expect(normalizeAutoBackupPreferredTime("09:30")).toBe("09:30");
    expect(normalizeAutoBackupPreferredTime("18:00")).toBe("18:00");
  });

  it("pads single-digit hours", () => {
    expect(normalizeAutoBackupPreferredTime("9:05")).toBe("09:05");
  });

  it("falls back on invalid", () => {
    expect(normalizeAutoBackupPreferredTime("25:00")).toBe("18:00");
    expect(normalizeAutoBackupPreferredTime("abc")).toBe("18:00");
    expect(normalizeAutoBackupPreferredTime(null)).toBe("18:00");
  });
});

describe("shouldRunAutoBackup", () => {
  it("runs when never backed up and preferred time reached (daily)", () => {
    expect(shouldRunAutoBackup("daily", null, new Date("2026-07-14T18:00:00"), "18:00")).toBe(true);
    expect(shouldRunAutoBackup("daily", null, new Date("2026-07-14T12:00:00"), "18:00")).toBe(false);
  });

  it("respects custom preferred time", () => {
    expect(shouldRunAutoBackup("daily", null, new Date("2026-07-14T12:00:00"), "12:00")).toBe(true);
    expect(shouldRunAutoBackup("daily", null, new Date("2026-07-14T11:59:00"), "12:00")).toBe(false);
  });

  it("does not run twice in the same day", () => {
    const now = new Date("2026-07-14T20:00:00");
    expect(shouldRunAutoBackup("daily", "2026-07-14T18:05:00", now, "18:00")).toBe(false);
  });

  it("runs next day after preferred time", () => {
    expect(
      shouldRunAutoBackup("daily", "2026-07-14T18:05:00", new Date("2026-07-15T18:00:00"), "18:00")
    ).toBe(true);
    expect(
      shouldRunAutoBackup("daily", "2026-07-14T18:05:00", new Date("2026-07-15T10:00:00"), "18:00")
    ).toBe(false);
  });

  it("weekly: due from Monday preferred time, once per Mon–Sun week", () => {
    // 2026-07-13 is Monday
    expect(shouldRunAutoBackup("weekly", null, new Date("2026-07-13T17:59:00"), "18:00")).toBe(false);
    expect(shouldRunAutoBackup("weekly", null, new Date("2026-07-13T18:00:00"), "18:00")).toBe(true);
    // Friday after Monday backup — same week
    expect(
      shouldRunAutoBackup("weekly", "2026-07-13T18:10:00", new Date("2026-07-17T20:00:00"), "18:00")
    ).toBe(false);
    // Next Monday
    expect(
      shouldRunAutoBackup("weekly", "2026-07-13T18:10:00", new Date("2026-07-20T18:00:00"), "18:00")
    ).toBe(true);
    // Opened mid-week after missing Monday — still due (≥ Monday 18:00)
    expect(shouldRunAutoBackup("weekly", null, new Date("2026-07-16T10:00:00"), "18:00")).toBe(true);
  });

  it("monthly: due from 1st at preferred time", () => {
    expect(shouldRunAutoBackup("monthly", null, new Date("2026-07-01T17:00:00"), "18:00")).toBe(false);
    expect(shouldRunAutoBackup("monthly", null, new Date("2026-07-01T18:00:00"), "18:00")).toBe(true);
    expect(
      shouldRunAutoBackup("monthly", "2026-07-01T18:05:00", new Date("2026-07-20T12:00:00"), "18:00")
    ).toBe(false);
    expect(
      shouldRunAutoBackup("monthly", "2026-07-01T18:05:00", new Date("2026-08-01T18:00:00"), "18:00")
    ).toBe(true);
  });

  it("respects hourly interval (preferred time ignored)", () => {
    const now = new Date("2026-07-14T12:00:00");
    expect(shouldRunAutoBackup("hourly", "2026-07-14T11:30:00", now, "18:00")).toBe(false);
    expect(shouldRunAutoBackup("hourly", "2026-07-14T10:50:00", now, "18:00")).toBe(true);
  });

  it("normalizes unknown interval to weekly", () => {
    expect(normalizeAutoBackupInterval("weird")).toBe("weekly");
    expect(normalizeAutoBackupInterval("every6h")).toBe("every6h");
  });
});
