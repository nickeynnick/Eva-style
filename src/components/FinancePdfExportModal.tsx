import React, { useEffect, useState } from "react";
import { FileText, Printer, X } from "lucide-react";
import ModalOverlay from "./ModalOverlay";
import {
  DEFAULT_FINANCE_PDF_SECTIONS,
  FINANCE_PDF_SECTION_LABELS,
  countSelectedFinancePdfSections,
  type FinancePdfSections,
} from "../utils/financePdfReport";

export type FinancePeriodType = "today" | "month" | "custom" | "day";

const MONTHS_RU = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: (sections: FinancePdfSections) => void;
  periodTitle: string;
  finPeriodType: FinancePeriodType;
  setFinPeriodType: (v: FinancePeriodType) => void;
  finMonth: number;
  setFinMonth: (v: number) => void;
  finYear: number;
  setFinYear: (v: number) => void;
  finSelectedDay: string;
  setFinSelectedDay: (v: string) => void;
  finStartDate: string;
  setFinStartDate: (v: string) => void;
  finEndDate: string;
  setFinEndDate: (v: string) => void;
};

export default function FinancePdfExportModal({
  open,
  onClose,
  onConfirm,
  periodTitle,
  finPeriodType,
  setFinPeriodType,
  finMonth,
  setFinMonth,
  finYear,
  setFinYear,
  finSelectedDay,
  setFinSelectedDay,
  finStartDate,
  setFinStartDate,
  finEndDate,
  setFinEndDate,
}: Props) {
  const [sections, setSections] = useState<FinancePdfSections>(DEFAULT_FINANCE_PDF_SECTIONS);

  useEffect(() => {
    if (open) {
      setSections({ ...DEFAULT_FINANCE_PDF_SECTIONS });
    }
  }, [open]);

  if (!open) return null;

  const selectedCount = countSelectedFinancePdfSections(sections);
  const canExport = selectedCount > 0;

  const setSection = (key: keyof FinancePdfSections, value: boolean) => {
    setSections((prev) => ({ ...prev, [key]: value }));
  };

  const selectAll = () => setSections({ ...DEFAULT_FINANCE_PDF_SECTIONS });
  const clearAll = () =>
    setSections({
      summary: false,
      services: false,
      materials: false,
      expenses: false,
      masters: false,
      cashless: false,
    });

  const periodBtn = (type: FinancePeriodType, label: string) => (
    <button
      key={type}
      type="button"
      onClick={() => setFinPeriodType(type)}
      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
        finPeriodType === type
          ? "bg-white text-indigo-600 shadow-sm border border-slate-200"
          : "text-slate-500 hover:text-slate-800"
      }`}
    >
      {label}
    </button>
  );

  return (
    <ModalOverlay open onClose={onClose} zIndex={70} aria-label="Экспорт PDF">
      <div className="w-full max-w-lg bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[min(85vh,720px)]">
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-5 py-4 text-white shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-indigo-100 text-[10px] font-bold uppercase tracking-wider mb-1">
                <FileText className="h-3.5 w-3.5" />
                Финансы
              </div>
              <h2 className="text-lg font-bold">Экспорт PDF</h2>
              <p className="text-sm text-indigo-100 mt-0.5">Выберите период и разделы отчёта</p>
            </div>
            <button type="button" onClick={onClose} className="p-1 text-white/80 hover:text-white" aria-label="Закрыть">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5 overflow-y-auto flex-1 min-h-0">
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Период</h3>
            <div className="flex flex-wrap p-1 bg-slate-100 rounded-xl gap-1">
              {periodBtn("today", "Сегодня")}
              {periodBtn("month", "Месяц")}
              {periodBtn("day", "День")}
              {periodBtn("custom", "Диапазон")}
            </div>

            <div className="text-xs text-slate-600">
              {finPeriodType === "today" && (
                <p>
                  Текущий день:{" "}
                  <strong className="text-slate-800">
                    {new Date().toLocaleDateString("ru-RU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      weekday: "long",
                    })}
                  </strong>
                </p>
              )}

              {finPeriodType === "month" && (
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={finMonth}
                    onChange={(e) => setFinMonth(Number(e.target.value))}
                    className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-semibold text-slate-800"
                  >
                    {MONTHS_RU.map((m, idx) => (
                      <option key={m} value={idx}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <select
                    value={finYear}
                    onChange={(e) => setFinYear(Number(e.target.value))}
                    className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-semibold text-slate-800 font-mono"
                  >
                    {[2025, 2026, 2027].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {finPeriodType === "day" && (
                <input
                  type="date"
                  value={finSelectedDay}
                  onChange={(e) => setFinSelectedDay(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-semibold text-slate-800 font-mono"
                />
              )}

              {finPeriodType === "custom" && (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-1.5">
                    <span className="text-slate-500">С</span>
                    <input
                      type="date"
                      value={finStartDate}
                      onChange={(e) => setFinStartDate(e.target.value)}
                      className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-semibold text-slate-800 font-mono"
                    />
                  </label>
                  <label className="flex items-center gap-1.5">
                    <span className="text-slate-500">По</span>
                    <input
                      type="date"
                      value={finEndDate}
                      onChange={(e) => setFinEndDate(e.target.value)}
                      className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 font-semibold text-slate-800 font-mono"
                    />
                  </label>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-400">
              Период совпадает с вкладкой «Финансы»:{" "}
              <span className="font-semibold text-slate-600">{periodTitle || "—"}</span>
            </p>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Разделы отчёта</h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-800"
                >
                  Выбрать все
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-slate-700"
                >
                  Снять все
                </button>
              </div>
            </div>

            <ul className="space-y-2">
              {FINANCE_PDF_SECTION_LABELS.map(({ key, label }) => (
                <li key={key}>
                  <label className="flex items-start gap-2.5 text-sm text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={sections[key]}
                      onChange={(e) => setSection(key, e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{label}</span>
                  </label>
                </li>
              ))}
            </ul>

            {!canExport && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                Выберите хотя бы один раздел отчёта.
              </p>
            )}
          </section>
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex gap-2 justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Отмена
          </button>
          <button
            type="button"
            disabled={!canExport}
            onClick={() => onConfirm(sections)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="h-3.5 w-3.5" />
            Сформировать PDF
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
