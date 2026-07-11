import { SettingsRule, SolariumSession } from "../types";

export const DEFAULT_SETTINGS_RULE: SettingsRule = {
  id: "default-rule",
  effectiveDate: "2020-01-01",
  acquiringCommission: 3.5,
  adminBaseRate: 1500,
  solariumMinuteRate: 30,
};

/** Последнее правило с effectiveDate ≤ dateStr (как в табеле администраторов). */
export function getActiveSettingsForDate(
  rules: SettingsRule[],
  dateStr: string
): SettingsRule {
  if (!rules.length) return DEFAULT_SETTINGS_RULE;
  const sorted = [...rules].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
  const active = sorted.find((r) => r.effectiveDate <= dateStr);
  return active || sorted[sorted.length - 1] || DEFAULT_SETTINGS_RULE;
}

export function getSolariumMinuteRate(session: SolariumSession, rules: SettingsRule[]): number {
  if (session.minuteRate !== undefined) return session.minuteRate;
  return getActiveSettingsForDate(rules, session.date).solariumMinuteRate;
}

export function getSolariumSessionBase(session: SolariumSession, rules: SettingsRule[]): number {
  const rate = getSolariumMinuteRate(session, rules);
  return session.minutes * rate + session.creamPrice + session.stickersPrice;
}

export function getSolariumSessionAcquiring(session: SolariumSession, rules: SettingsRule[]): number {
  if (session.paymentMethod !== "дебетовая карта") return 0;
  if (session.acquiringCost !== undefined) return session.acquiringCost;
  const base = getSolariumSessionBase(session, rules);
  const commission = getActiveSettingsForDate(rules, session.date).acquiringCommission;
  return Math.round(base * (commission / 100) * 100) / 100;
}

export function getSolariumSessionTotal(session: SolariumSession, rules: SettingsRule[]): number {
  return getSolariumSessionBase(session, rules) + getSolariumSessionAcquiring(session, rules);
}
