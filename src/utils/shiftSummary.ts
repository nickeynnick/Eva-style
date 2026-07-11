export interface ShiftSummaryData {
  dateLabel: string;
  startCash: number;
  cashInflow: number;
  cashBreakdown: string;
  cardTotal: number;
  cardBreakdown: string;
  transferTotal: number;
  transferBreakdown: string;
  certRedemption: number;
  newDebts: number;
  acquiringTotal: number;
  expensesTotal: number;
  materialsTotal: number;
  payoutsTotal: number;
  endCash: number;
  visitCount: number;
  solariumSessions: number;
}

export function buildShiftSummaryHtml(data: ShiftSummaryData): string {
  const row = (label: string, value: string, bold = false) =>
    `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee;${bold ? "font-weight:bold;" : ""}">${label}</td>` +
    `<td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;${bold ? "font-weight:bold;" : ""}">${value}</td></tr>`;

  return `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><title>Итог смены — ${data.dateLabel}</title>
<style>
  body{font-family:Segoe UI,Arial,sans-serif;padding:24px;color:#1e293b;max-width:720px;margin:0 auto}
  h1{font-size:20px;margin:0 0 4px} .sub{color:#64748b;font-size:12px;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  .section{margin-top:16px;font-size:11px;font-weight:bold;text-transform:uppercase;color:#64748b;letter-spacing:.05em}
  .footer{margin-top:24px;font-size:10px;color:#94a3b8;text-align:center}
  @media print{body{padding:12px} button{display:none}}
</style></head><body>
<h1>Ева-стиль — Итог смены</h1>
<p class="sub">${data.dateLabel} · Визитов: ${data.visitCount} · Солярий: ${data.solariumSessions} сеансов</p>
<div class="section">Касса</div>
<table>${row("Касса на начало дня", `${data.startCash.toLocaleString("ru-RU")} ₽`)}
${row("Приток наличных", `+${data.cashInflow.toLocaleString("ru-RU")} ₽`)}
<tr><td colspan="2" style="padding:2px 8px 8px;font-size:11px;color:#64748b">${data.cashBreakdown}</td></tr>
${row("Операционные расходы", `−${data.expensesTotal.toLocaleString("ru-RU")} ₽`)}
${row("Выплаты мастерам", `−${data.payoutsTotal.toLocaleString("ru-RU")} ₽`)}
${row("Касса на вечер (проект)", `${data.endCash.toLocaleString("ru-RU")} ₽`, true)}</table>
<div class="section">Безнал и переводы</div>
<table>${row("На безналичный счёт", `+${data.cardTotal.toLocaleString("ru-RU")} ₽`)}
<tr><td colspan="2" style="padding:2px 8px 8px;font-size:11px;color:#64748b">${data.cardBreakdown}</td></tr>
${row("Переводы", `+${data.transferTotal.toLocaleString("ru-RU")} ₽`)}
<tr><td colspan="2" style="padding:2px 8px 8px;font-size:11px;color:#64748b">${data.transferBreakdown}</td></tr>
${row("Комиссия эквайринга", `−${data.acquiringTotal.toLocaleString("ru-RU")} ₽`)}</table>
<div class="section">Прочее</div>
<table>
${data.certRedemption > 0 ? row("Погашено сертификатами", `${data.certRedemption.toLocaleString("ru-RU")} ₽`) : ""}
${data.newDebts > 0 ? row("Новые долги", `${data.newDebts.toLocaleString("ru-RU")} ₽`) : ""}
${row("Материалы (услуги + солярий)", `${data.materialsTotal.toLocaleString("ru-RU")} ₽`)}
</table>
<p class="footer">Сформировано программой «Ева-стиль» · ${new Date().toLocaleString("ru-RU")}</p>
<button onclick="window.print()" style="margin-top:16px;padding:8px 16px;background:#e11d48;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:bold">Печать</button>
</body></html>`;
}

export function printShiftSummary(data: ShiftSummaryData): void {
  const html = buildShiftSummaryHtml(data);
  const win = window.open("", "_blank", "width=800,height=900");
  if (!win) {
    alert("Не удалось открыть окно печати. Разрешите всплывающие окна.");
    return;
  }
  win.document.write(html);
  win.document.close();
}
