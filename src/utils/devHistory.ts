/** Человекочитаемые описания изменений store для истории режима разработчика. */

type IdItem = { id: string; [key: string]: unknown };

const PREFERENCE_LABELS: Record<string, string> = {
  showDeletedVisits: "Показывать удалённые визиты",
  allowDeleteVisits: "Разрешить удаление визитов",
  allowDeleteCertificates: "Разрешить удаление сертификатов",
  allowDeleteDebts: "Разрешить удаление долгов",
  showVisitChangeHistory: "Показывать историю правок визита",
  allowMasterPayouts: "Разрешить выплаты мастерам",
  allowAdminShiftEdits: "Разрешить правки смен администраторов",
  hideFormulaCalculations: "Скрывать формулы калькулятора",
  keepOwnerUnlocked: "Держать раздел владелицы разблокированным",
  autoLockDuration: "Автоблокировка (мин)",
  autoBackupEnabled: "Авторезервное копирование",
  autoBackupInterval: "Интервал авторезерва",
  autoBackupPreferredTime: "Время авторезерва",
};

const COLLECTION_LABELS: Record<
  string,
  { one: string; few: string; many: string; added: string; changed: string; removed: string }
> = {
  employees: {
    one: "сотрудник",
    few: "сотрудника",
    many: "сотрудников",
    added: "Добавлен сотрудник",
    changed: "Изменён сотрудник",
    removed: "Удалён сотрудник",
  },
  visits: {
    one: "визит",
    few: "визита",
    many: "визитов",
    added: "Добавлен визит",
    changed: "Изменён визит",
    removed: "Удалён визит",
  },
  solariumSessions: {
    one: "сеанс солярия",
    few: "сеанса солярия",
    many: "сеансов солярия",
    added: "Добавлен сеанс солярия",
    changed: "Изменён сеанс солярия",
    removed: "Удалён сеанс солярия",
  },
  extraTransactions: {
    one: "доп. операция",
    few: "доп. операции",
    many: "доп. операций",
    added: "Добавлена доп. операция",
    changed: "Изменена доп. операция",
    removed: "Удалена доп. операция",
  },
  masterTransactions: {
    one: "операция по мастеру",
    few: "операции по мастеру",
    many: "операций по мастеру",
    added: "Добавлена операция по мастеру",
    changed: "Изменена операция по мастеру",
    removed: "Удалена операция по мастеру",
  },
  adminShifts: {
    one: "смена администратора",
    few: "смены администратора",
    many: "смен администратора",
    added: "Добавлена смена администратора",
    changed: "Изменена смена администратора",
    removed: "Удалена смена администратора",
  },
  dailyCash: {
    one: "запись кассы",
    few: "записи кассы",
    many: "записей кассы",
    added: "Задана стартовая касса",
    changed: "Изменена стартовая касса",
    removed: "Удалена запись кассы",
  },
  giftCertificates: {
    one: "сертификат",
    few: "сертификата",
    many: "сертификатов",
    added: "Добавлен сертификат",
    changed: "Изменён сертификат",
    removed: "Удалён сертификат",
  },
  debtRecords: {
    one: "долг",
    few: "долга",
    many: "долгов",
    added: "Добавлен долг",
    changed: "Изменён долг",
    removed: "Удалён долг",
  },
  settingsRules: {
    one: "правило настроек",
    few: "правила настроек",
    many: "правил настроек",
    added: "Добавлено правило настроек",
    changed: "Изменено правило настроек",
    removed: "Удалено правило настроек",
  },
  adminDaysRatesRules: {
    one: "правило ставок админов",
    few: "правила ставок админов",
    many: "правил ставок админов",
    added: "Добавлено правило ставок админов",
    changed: "Изменено правило ставок админов",
    removed: "Удалено правило ставок админов",
  },
};

function plural(n: number, forms: { one: string; few: string; many: string }): string {
  const abs = Math.abs(n) % 100;
  const n1 = abs % 10;
  if (abs > 10 && abs < 20) return forms.many;
  if (n1 > 1 && n1 < 5) return forms.few;
  if (n1 === 1) return forms.one;
  return forms.many;
}

function money(n: unknown): string {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return "—";
  return `${v.toLocaleString("ru-RU")} ₽`;
}

function formatDate(iso: unknown): string {
  if (typeof iso !== "string" || !iso) return "без даты";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}

function boolWord(v: unknown): string {
  return v ? "включено" : "выключено";
}

function paymentLabel(method: unknown): string {
  switch (method) {
    case "наличные":
      return "наличными";
    case "дебетовая карта":
      return "картой";
    case "перевод":
      return "переводом";
    case "сертификат":
      return "сертификатом";
    case "в долг":
      return "в долг";
    default:
      return String(method ?? "—");
  }
}

function employeeName(employees: unknown, id: unknown): string | null {
  if (!Array.isArray(employees) || typeof id !== "string") return null;
  const found = employees.find((e) => e && typeof e === "object" && (e as IdItem).id === id) as
    | { name?: string }
    | undefined;
  return found?.name ?? null;
}

function describeVisit(item: Record<string, unknown>, employees: unknown): string {
  const date = formatDate(item.date);
  const master = employeeName(employees, item.masterId);
  const client = typeof item.clientName === "string" && item.clientName ? item.clientName : null;
  const parts = [`за ${date}`];
  if (master) parts.push(`мастер ${master}`);
  if (client) parts.push(`клиент ${client}`);
  parts.push(`сумма ${money(item.totalCost ?? (Number(item.workCost) || 0) + (Number(item.materialsCost) || 0))}`);
  parts.push(`оплата ${paymentLabel(item.paymentMethod)}`);
  if (item.isDeleted) parts.push("помечен удалённым");
  return parts.join(", ");
}

function describeCertificate(item: Record<string, unknown>): string {
  const code = item.code != null ? `№ ${item.code}` : "без номера";
  const parts = [code, `номинал ${money(item.nominal)}`, `остаток ${money(item.balance)}`];
  if (item.soldTo) parts.push(`покупатель ${item.soldTo}`);
  if (item.isActive === false) parts.push("неактивен");
  return parts.join(", ");
}

function describeDebt(item: Record<string, unknown>): string {
  const name = (item.clientName as string) || "без имени";
  return `${name}, остаток ${money(item.remainingAmount)} из ${money(item.originalAmount)}, визит ${formatDate(item.visitDate)}`;
}

function describeSolarium(item: Record<string, unknown>): string {
  const parts = [
    `за ${formatDate(item.date)}`,
    `${item.minutes ?? "?"} мин`,
    `оплата ${paymentLabel(item.paymentMethod)}`,
  ];
  if (item.clientName) parts.push(`клиент ${item.clientName}`);
  return parts.join(", ");
}

function describeExtra(item: Record<string, unknown>): string {
  const sign = item.type === "плюс" ? "+" : "−";
  const parts = [`${sign}${money(item.amount)}`, `за ${formatDate(item.date)}`];
  if (item.category) parts.push(String(item.category));
  if (item.comment) parts.push(`«${item.comment}»`);
  return parts.join(", ");
}

function describeMasterTx(item: Record<string, unknown>, employees: unknown): string {
  const master = employeeName(employees, item.masterId) ?? "мастер";
  return `${item.type ?? "операция"} ${money(item.amount)} — ${master}, ${formatDate(item.date)}${item.comment ? `, «${item.comment}»` : ""}`;
}

function describeAdminShift(item: Record<string, unknown>, employees: unknown): string {
  const admin = employeeName(employees, item.adminId) ?? "администратор";
  return `${admin}, ${formatDate(item.date)}, ставка ${money(item.rate)}`;
}

function describeEmployee(item: Record<string, unknown>): string {
  return `${item.name ?? "без имени"} (${item.position ?? "должность не указана"})`;
}

function describeSettingsRule(item: Record<string, unknown>): string {
  return `с ${formatDate(item.effectiveDate)}: эквайринг ${item.acquiringCommission}%, солярий ${money(item.solariumMinuteRate)}/мин`;
}

function describeDailyCash(item: Record<string, unknown>): string {
  return `${formatDate(item.date)}: стартовая касса ${money(item.startCash)}`;
}

function describeItem(key: string, item: Record<string, unknown>, employees: unknown): string {
  switch (key) {
    case "visits":
      return describeVisit(item, employees);
    case "giftCertificates":
      return describeCertificate(item);
    case "debtRecords":
      return describeDebt(item);
    case "solariumSessions":
      return describeSolarium(item);
    case "extraTransactions":
      return describeExtra(item);
    case "masterTransactions":
      return describeMasterTx(item, employees);
    case "adminShifts":
      return describeAdminShift(item, employees);
    case "employees":
      return describeEmployee(item);
    case "settingsRules":
    case "adminDaysRatesRules":
      return describeSettingsRule(item);
    case "dailyCash":
      return describeDailyCash(item);
    default:
      return item.id ? `id ${item.id}` : "запись";
  }
}

function getItemKey(key: string, item: Record<string, unknown>): string {
  if (typeof item.id === "string") return item.id;
  if (key === "dailyCash" && typeof item.date === "string") return item.date;
  return JSON.stringify(item).slice(0, 80);
}

function changedFields(before: Record<string, unknown>, after: Record<string, unknown>): string[] {
  const skip = new Set(["editLogs", "usages"]);
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const out: string[] = [];
  for (const k of keys) {
    if (skip.has(k)) continue;
    const a = before[k];
    const b = after[k];
    if (JSON.stringify(a) === JSON.stringify(b)) continue;
    if (k === "payments") {
      const beforePays = Array.isArray(a) ? a : [];
      const afterPays = Array.isArray(b) ? b : [];
      if (afterPays.length > beforePays.length) {
        const added = afterPays.slice(beforePays.length) as Record<string, unknown>[];
        for (const pay of added) {
          out.push(
            `платёж +${money(pay.amount)} (${paymentLabel(pay.paymentMethod)}, ${formatDate(pay.date)})`
          );
        }
      } else if (afterPays.length < beforePays.length) {
        out.push(`платежей: ${beforePays.length} → ${afterPays.length}`);
      } else {
        out.push("изменены платежи");
      }
      continue;
    }
    if (k === "isDeleted" && b === true) {
      out.push("удалён");
      continue;
    }
    if (k === "isDeleted" && b === false) {
      out.push("восстановлен");
      continue;
    }
    if (k === "isClosed" && b === true) {
      out.push("закрыт");
      continue;
    }
    if (k === "paymentMethod") {
      out.push(`paymentMethod: ${paymentLabel(a)} → ${paymentLabel(b)}`);
      continue;
    }
    if (typeof a === "number" || typeof b === "number") {
      const isMoney = /cost|amount|price|balance|nominal|cash|rate|rent|wage/i.test(k);
      out.push(`${k}: ${isMoney ? money(a) : a ?? "—"} → ${isMoney ? money(b) : b ?? "—"}`);
    } else if (typeof a === "boolean" || typeof b === "boolean") {
      out.push(`${k}: ${boolWord(a)} → ${boolWord(b)}`);
    } else if (typeof b === "string" || typeof a === "string") {
      out.push(`${k}: «${a ?? ""}» → «${b ?? ""}»`);
    } else {
      out.push(k);
    }
  }
  return out;
}

function fieldLabelRu(key: string): string {
  const map: Record<string, string> = {
    workCost: "работа",
    materialsCost: "материалы",
    totalCost: "итого",
    acquiringCost: "эквайринг",
    paymentMethod: "способ оплаты",
    clientName: "клиент",
    clientPhone: "телефон",
    balance: "остаток",
    nominal: "номинал",
    remainingAmount: "остаток долга",
    originalAmount: "сумма долга",
    startCash: "стартовая касса",
    minutes: "минуты",
    creamPrice: "крем",
    stickersPrice: "наклейки",
    amount: "сумма",
    comment: "комментарий",
    name: "имя",
    phone: "телефон",
    percentage: "процент",
    dailyRent: "аренда",
    rate: "ставка",
    code: "номер",
    isActive: "активность",
    soldTo: "покупатель",
  };
  return map[key] ?? key;
}

function humanizeFieldChanges(changes: string[]): string {
  return changes
    .map((c) => {
      if (c === "удалён" || c === "восстановлен" || c === "закрыт") return c;
      const m = /^([^:]+):\s*(.+)$/.exec(c);
      if (!m) return c;
      return `${fieldLabelRu(m[1])}: ${m[2]}`;
    })
    .join("; ");
}

function describeArrayChange(
  key: string,
  prevArr: unknown[],
  nextArr: unknown[],
  employees: unknown
): string[] {
  const forms = COLLECTION_LABELS[key] ?? {
    one: "запись",
    few: "записи",
    many: "записей",
    added: "Добавлена запись",
    changed: "Изменена запись",
    removed: "Удалена запись",
  };
  const prevItems = prevArr.filter((x): x is Record<string, unknown> => !!x && typeof x === "object");
  const nextItems = nextArr.filter((x): x is Record<string, unknown> => !!x && typeof x === "object");

  const prevMap = new Map(prevItems.map((i) => [getItemKey(key, i), i]));
  const nextMap = new Map(nextItems.map((i) => [getItemKey(key, i), i]));

  const added = nextItems.filter((i) => !prevMap.has(getItemKey(key, i)));
  const removed = prevItems.filter((i) => !nextMap.has(getItemKey(key, i)));
  const modified = nextItems.filter((i) => {
    const id = getItemKey(key, i);
    const before = prevMap.get(id);
    return before && JSON.stringify(before) !== JSON.stringify(i);
  });

  const lines: string[] = [];
  const maxList = 8;

  for (const item of added.slice(0, maxList)) {
    lines.push(`${forms.added}: ${describeItem(key, item, employees)}`);
  }
  if (added.length > maxList) {
    lines.push(`… и ещё добавлено ${added.length - maxList} ${plural(added.length - maxList, forms)}`);
  }

  for (const item of modified.slice(0, maxList)) {
    const before = prevMap.get(getItemKey(key, item))!;
    const diffs = changedFields(before, item);
    const detail = humanizeFieldChanges(diffs);
    lines.push(
      `${forms.changed}: ${describeItem(key, item, employees)}${detail ? ` — ${detail}` : ""}`
    );
  }
  if (modified.length > maxList) {
    lines.push(`… и ещё изменено ${modified.length - maxList} ${plural(modified.length - maxList, forms)}`);
  }

  for (const item of removed.slice(0, maxList)) {
    lines.push(`${forms.removed}: ${describeItem(key, item, employees)}`);
  }
  if (removed.length > maxList) {
    lines.push(`… и ещё удалено ${removed.length - maxList} ${plural(removed.length - maxList, forms)}`);
  }

  if (!lines.length) {
    lines.push(`Обновлены ${forms.many} (состав тот же, ${nextItems.length} шт.)`);
  }

  return lines;
}

function describePreferences(prefs: Record<string, unknown>): string[] {
  return Object.entries(prefs).map(([key, value]) => {
    const label = PREFERENCE_LABELS[key] ?? key;
    if (typeof value === "boolean") return `${label}: ${boolWord(value)}`;
    if (key === "autoBackupInterval") {
      const intervalLabel =
        value === "hourly"
          ? "каждый час"
          : value === "every6h"
            ? "каждые 6 часов"
            : value === "daily"
              ? "ежедневно"
              : value === "weekly"
                ? "еженедельно"
                : value === "monthly"
                  ? "ежемесячно"
                  : String(value);
      return `${label}: ${intervalLabel}`;
    }
    return `${label}: ${String(value)}`;
  });
}

function describeMeta(meta: Record<string, unknown>): string[] {
  const lines: string[] = [];
  if (meta.ownerPassword !== undefined) lines.push("Изменён пароль раздела «Владелица»");
  if (meta.appInitialized !== undefined) {
    lines.push(meta.appInitialized ? "Программа отмечена как настроенная" : "Сброшен флаг первоначальной настройки");
  }
  if (meta.lastAutoBackupDate !== undefined) {
    lines.push(`Дата авторезерва: ${meta.lastAutoBackupDate ? formatDate(meta.lastAutoBackupDate) : "нет"}`);
  }
  if (meta.seenAppVersion !== undefined) {
    lines.push(`Просмотрена версия обновлений: ${meta.seenAppVersion ?? "нет"}`);
  }
  return lines;
}

export function summarizeStoreChange(
  prev: Record<string, unknown>,
  patch: Record<string, unknown>
): { summary: string; lines: string[] } {
  const lines: string[] = [];
  const employees = (patch.employees as unknown[]) ?? (prev.employees as unknown[]) ?? [];

  for (const key of Object.keys(patch)) {
    if (patch[key] === undefined) continue;

    if (key === "preferences") {
      const prefs = patch.preferences as Record<string, unknown> | undefined;
      if (prefs) lines.push(...describePreferences(prefs).map((l) => `Настройка — ${l}`));
      continue;
    }

    if (key === "meta") {
      const meta = patch.meta as Record<string, unknown> | undefined;
      if (meta) lines.push(...describeMeta(meta));
      continue;
    }

    const nextVal = patch[key];
    const prevVal = prev[key];

    if (Array.isArray(nextVal)) {
      const prevArr = Array.isArray(prevVal) ? prevVal : [];
      lines.push(...describeArrayChange(key, prevArr, nextVal, employees));
      continue;
    }

    if (key === "materialPackaging" || key === "materialPrices" || key === "materialConsumptions") {
      lines.push("Обновлены цены / фасовки материалов");
      continue;
    }

    if (key === "adminDaysRates") {
      lines.push("Обновлены ставки администраторов по дням недели");
      continue;
    }

    if (key === "adminPaidWages") {
      lines.push("Обновлены данные о выплатах администраторам");
      continue;
    }

    lines.push(`Обновлено: ${COLLECTION_LABELS[key]?.many ?? key}`);
  }

  const unique = [...new Set(lines.filter(Boolean))];
  return {
    summary: unique.join("\n") || "Данные обновлены",
    lines: unique,
  };
}

export function summarizeImportBackup(before: {
  visits: number;
  employees: number;
  certificates: number;
}, after: {
  visits: number | null;
  employees: number | null;
  certificates: number | null;
}): string {
  return [
    "Восстановлена резервная копия",
    `визитов: было ${before.visits}, стало ${after.visits ?? "—"}`,
    `сотрудников: было ${before.employees}, стало ${after.employees ?? "—"}`,
    `сертификатов: было ${before.certificates}, стало ${after.certificates ?? "—"}`,
  ].join(". ");
}

export function summarizeReset(mode: string, before: {
  visits: number;
  employees: number;
  certificates: number;
  debts: number;
}): string {
  const modeLabel =
    mode === "preserveTariffs" ? "с сохранением тарифов и сотрудников" : "полный сброс всех данных";
  return `Сброс данных приложения (${modeLabel}). До сброса: визитов ${before.visits}, сотрудников ${before.employees}, сертификатов ${before.certificates}, долгов ${before.debts}`;
}

export function summarizeMaterialPackaging(before: number, after: number): string {
  return `Обновлены фасовки материалов (позиций: было ${before}, стало ${after})`;
}
