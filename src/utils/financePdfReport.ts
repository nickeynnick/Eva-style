/** Сборка HTML сводного финансового PDF с выбором секций. */

export type FinancePdfSections = {
  summary: boolean;
  services: boolean;
  materials: boolean;
  expenses: boolean;
  masters: boolean;
  cashless: boolean;
};

export const DEFAULT_FINANCE_PDF_SECTIONS: FinancePdfSections = {
  summary: true,
  services: true,
  materials: true,
  expenses: true,
  masters: true,
  cashless: true,
};

export const FINANCE_PDF_SECTION_LABELS: { key: keyof FinancePdfSections; label: string }[] = [
  { key: "summary", label: "Сводка (выручка и материалы)" },
  { key: "services", label: "Доходность услуг и солярия" },
  { key: "materials", label: "Движение материалов" },
  { key: "expenses", label: "Расходы и чистый результат" },
  { key: "masters", label: "Таблица по мастерам" },
  { key: "cashless", label: "Безнал / эквайринг" },
];

export function countSelectedFinancePdfSections(sections: FinancePdfSections): number {
  return FINANCE_PDF_SECTION_LABELS.reduce((n, { key }) => n + (sections[key] ? 1 : 0), 0);
}

export type FinancePdfMasterRow = {
  name: string;
  position: string;
  count: number;
  work: number;
  materials: number;
  total: number;
};

export type FinancePdfReportData = {
  periodTitle: string;
  appVersion: string;
  grossRevenue: number;
  totalMaterialsRevenue: number;
  materialsPurchaseExpenses: number;
  totalVisitsWorkRevenues: number;
  totalSolariumMinutes: number;
  totalSolariumMinsRevenues: number;
  totalSolariumMaterialsRevenue: number;
  totalSalonMaterialsRevenue: number;
  adminsMonthlyWages: number;
  mastersPortionsWages: number;
  totalAcquiringCommissionPaid: number;
  otherBillExpenses: number;
  netEarnings: number;
  cashlessGrossRevenue: number;
  cashlessAcquiringCommissions: number;
  cashlessNetRevenue: number;
  masters: FinancePdfMasterRow[];
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(n: number): string {
  return `${n.toLocaleString("ru-RU")} ₽`;
}

export function buildFinancePdfHtml(
  data: FinancePdfReportData,
  sections: FinancePdfSections
): string {
  const materialsBalance = data.totalMaterialsRevenue - data.materialsPurchaseExpenses;
  const isPositive = materialsBalance >= 0;
  const balanceSign = isPositive ? "+" : "";
  const balanceColor = isPositive ? "#10b981" : "#ef4444";

  const masterRows =
    data.masters.length === 0
      ? '<tr><td colspan="6" style="text-align: center; color: #94a3b8;">Нет данных по мастерам за выбранный период</td></tr>'
      : data.masters
          .map(
            (m) => `
        <tr>
          <td><strong style="color: #0f172a;">${escapeHtml(m.name)}</strong></td>
          <td><span style="font-size: 11px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: #fee2e2; color: #991b1b;">${escapeHtml(m.position)}</span></td>
          <td style="text-align: right; font-family: monospace; font-weight: 600;">${m.count}</td>
          <td style="text-align: right; font-family: monospace; font-weight: 600;">${money(m.work)}</td>
          <td style="text-align: right; font-family: monospace; font-weight: 600; color: #4f46e5;">${money(m.materials)}</td>
          <td style="text-align: right; font-family: monospace; font-weight: 700; color: #1e293b;">${money(m.total)}</td>
        </tr>
      `
          )
          .join("");

  let sectionNo = 0;
  const nextTitle = (label: string) => {
    sectionNo += 1;
    return `${sectionNo}. ${label}`;
  };

  const summaryHtml = sections.summary
    ? `
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-label">Общая выручка за период (услуги + солярий)</div>
            <div class="stat-val primary">+${money(data.grossRevenue)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Финансовый результат по материалам</div>
            <div class="stat-val" style="color: ${balanceColor};">
              ${balanceSign}${money(materialsBalance)}
            </div>
          </div>
        </div>`
    : "";

  const servicesHtml = sections.services
    ? `
        <div class="section-title">${nextTitle("Анализ доходности услуг и оборудования")}</div>
        <table>
          <thead>
            <tr>
              <th>Источник выручки</th>
              <th>Характеристика показателя</th>
              <th class="number-cell">Сумма (₽)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Салонные услуги красоты</strong></td>
              <td>Оплаты за парикмахерские работы, маникюр, макияж</td>
              <td class="number-cell">+${money(data.totalVisitsWorkRevenues)}</td>
            </tr>
            <tr>
              <td><strong>Поминутные сеансы солярия</strong></td>
              <td>Общее время: ${data.totalSolariumMinutes} минут работы ламп</td>
              <td class="number-cell">+${money(data.totalSolariumMinsRevenues)}</td>
            </tr>
            <tr>
              <td><strong>Косметические средства солярия</strong></td>
              <td>Продажи кремов, стикини, шапочек и комплектов</td>
              <td class="number-cell">+${money(data.totalSolariumMaterialsRevenue)}</td>
            </tr>
            <tr class="totals-row">
              <td><strong>СУММАРНАЯ ВЫРУЧКА</strong></td>
              <td>Все услуги и солярий (без учета расходных материалов визитов)</td>
              <td class="number-cell"><strong>+${money(data.grossRevenue)}</strong></td>
            </tr>
          </tbody>
        </table>`
    : "";

  const materialsHtml = sections.materials
    ? `
        <div class="section-title">${nextTitle("Движение и расход материалов по складу")}</div>
        <table>
          <thead>
            <tr>
              <th>Категория учета расхода</th>
              <th>Описание операции учета</th>
              <th class="number-cell">Стоимость (₽)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Расходные материалы визитов (Салон)</strong></td>
              <td>Списание себестоимости материалов на оказание услуг клиентам</td>
              <td class="number-cell" style="color: #4f46e5;">+${money(data.totalSalonMaterialsRevenue)}</td>
            </tr>
            <tr>
              <td><strong>Материалы солярия (крема, стикини)</strong></td>
              <td>Косметические средства солярия, выданные в сессиях</td>
              <td class="number-cell" style="color: #4f46e5;">+${money(data.totalSolariumMaterialsRevenue)}</td>
            </tr>
            <tr>
              <td><strong>Инвестиции в закупки расходников</strong></td>
              <td>Регистрация накладных расходов по закупке товаров/материалов</td>
              <td class="number-cell" style="color: #ef4444;">-${money(data.materialsPurchaseExpenses)}</td>
            </tr>
            <tr class="totals-row">
              <td><strong>РЕЗУЛЬТАТ ПО МАТЕРИАЛАМ (Профицит / Дефицит склада)</strong></td>
              <td>Потребление за вычетом прямых складских закупок за период</td>
              <td class="number-cell" style="color: ${balanceColor};">
                <strong>${balanceSign}${money(materialsBalance)}</strong>
              </td>
            </tr>
          </tbody>
        </table>`
    : "";

  const expensesHtml = sections.expenses
    ? `
        <div class="section-title">${nextTitle("Расходы и чистый результат")}</div>
        <table>
          <thead>
            <tr>
              <th>Статья</th>
              <th>Описание</th>
              <th class="number-cell">Сумма (₽)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Зарплаты администраторов</strong></td>
              <td>Смены за период</td>
              <td class="number-cell" style="color: #ef4444;">-${money(data.adminsMonthlyWages)}</td>
            </tr>
            <tr>
              <td><strong>Доли мастеров</strong></td>
              <td>Начисленные проценты от работы</td>
              <td class="number-cell" style="color: #ef4444;">-${money(Math.round(data.mastersPortionsWages))}</td>
            </tr>
            <tr>
              <td><strong>Эквайринг</strong></td>
              <td>Комиссия банка по безналу</td>
              <td class="number-cell" style="color: #ef4444;">-${money(data.totalAcquiringCommissionPaid)}</td>
            </tr>
            <tr>
              <td><strong>Прочие расходы</strong></td>
              <td>Операционные минусы без закупки материалов</td>
              <td class="number-cell" style="color: #ef4444;">-${money(data.otherBillExpenses)}</td>
            </tr>
            <tr class="totals-row">
              <td><strong>ЧИСТЫЙ РЕЗУЛЬТАТ</strong></td>
              <td>Выручка услуг − расходы (материалы отдельно)</td>
              <td class="number-cell"><strong>${money(data.netEarnings)}</strong></td>
            </tr>
          </tbody>
        </table>`
    : "";

  const mastersHtml = sections.masters
    ? `
        <div class="section-title">${nextTitle("Информация по мастерам и их потреблению")}</div>
        <table>
          <thead>
            <tr>
              <th>ФИО Сотрудника</th>
              <th>Специализация</th>
              <th class="number-cell">Количество визитов</th>
              <th class="number-cell">Выручка за работу</th>
              <th class="number-cell">Расход материалов (салон)</th>
              <th class="number-cell">Всего с визитов</th>
            </tr>
          </thead>
          <tbody>
            ${masterRows}
          </tbody>
        </table>`
    : "";

  const cashlessHtml = sections.cashless
    ? `
        <div class="section-title">${nextTitle("Безнал и эквайринг")}</div>
        <table>
          <thead>
            <tr>
              <th>Показатель</th>
              <th>Описание</th>
              <th class="number-cell">Сумма (₽)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Безналичный оборот</strong></td>
              <td>Оплаты картой / переводом за период</td>
              <td class="number-cell">+${money(data.cashlessGrossRevenue)}</td>
            </tr>
            <tr>
              <td><strong>Комиссия эквайринга</strong></td>
              <td>Удержания банка по безналу</td>
              <td class="number-cell" style="color: #ef4444;">-${money(data.cashlessAcquiringCommissions)}</td>
            </tr>
            <tr class="totals-row">
              <td><strong>БЕЗНАЛ НЕТТО</strong></td>
              <td>Оборот минус комиссия</td>
              <td class="number-cell"><strong>${money(data.cashlessNetRevenue)}</strong></td>
            </tr>
          </tbody>
        </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Финансовый отчет — Ева-стиль</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #1e293b;
      padding: 40px;
      margin: 0;
      line-height: 1.5;
      background: #fff;
    }
    .header-container {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .title {
      font-size: 24px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
      margin: 0 0 5px 0;
    }
    .subtitle {
      font-size: 14px;
      color: #4f46e5;
      margin: 0;
      font-weight: 700;
      letter-spacing: 0.3px;
    }
    .meta-info {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #64748b;
      margin-top: 15px;
      font-family: monospace;
      background: #f8fafc;
      padding: 10px 15px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #4f46e5;
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 5px;
      margin: 30px 0 15px 0;
    }
    .stat-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-bottom: 25px;
    }
    .stat-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 15px;
    }
    .stat-label {
      font-size: 11px;
      color: #64748b;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 6px;
      letter-spacing: 0.5px;
    }
    .stat-val {
      font-size: 20px;
      font-weight: 800;
      font-family: monospace;
      color: #0f172a;
    }
    .stat-val.primary {
      color: #4f46e5;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      margin-bottom: 25px;
      text-align: left;
    }
    th {
      background-color: #f1f5f9;
      color: #475569;
      font-weight: 700;
      padding: 10px 12px;
      border: 1px solid #e2e8f0;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
    }
    td {
      padding: 10px 12px;
      border: 1px solid #e2e8f0;
      color: #334155;
    }
    tr:nth-child(even) {
      background-color: #f8fafc;
    }
    .number-cell {
      text-align: right;
      font-family: monospace;
      font-weight: 600;
      font-size: 12px;
    }
    .totals-row td {
      font-weight: 800;
      background-color: #f1f5f9 !important;
      color: #0f172a;
      border-top: 2px solid #cbd5e1;
    }
    .footer-signature {
      margin-top: 60px;
      border-top: 1px dashed #cbd5e1;
      padding-top: 20px;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #64748b;
    }
    .signature-box {
      text-align: center;
    }
    .signature-line {
      width: 180px;
      border-bottom: 1px solid #94a3b8;
      margin-top: 25px;
      margin-bottom: 5px;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header-container">
    <h1 class="title">Сводный финансовый отчет</h1>
    <p class="subtitle">Студия красоты «Ева-стиль» — консолидированные доходы и расход материалов</p>
    <div class="meta-info">
      <div>ПЕРИОД: <strong style="color: #0f172a;">${escapeHtml(data.periodTitle.toUpperCase())}</strong></div>
      <div>СГЕНЕРИРОВАНО: <strong>${escapeHtml(new Date().toLocaleString("ru-RU"))}</strong></div>
    </div>
  </div>
  ${summaryHtml}
  ${servicesHtml}
  ${materialsHtml}
  ${expensesHtml}
  ${mastersHtml}
  ${cashlessHtml}
  <div class="footer-signature">
    <div>
      Система учета ИС «Ева-стиль» v${escapeHtml(data.appVersion)}<br>
      Конфиденциальный документ для внутреннего использования владелицей.
    </div>
    <div class="signature-box">
      <div class="signature-line"></div>
      <div>Подпись владелицы салона</div>
    </div>
  </div>
</body>
</html>`;
}
