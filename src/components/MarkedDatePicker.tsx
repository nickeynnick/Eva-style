import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface MarkedDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  /** Даты YYYY-MM-DD, которые нужно выделить (например, дни с визитами). */
  markedDates: ReadonlySet<string>;
  id?: string;
  className?: string;
}

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

function parseIso(iso: string): { y: number; m: number; d: number } | null {
  const parts = iso.split("-");
  if (parts.length !== 3) return null;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!y || !m || !d) return null;
  return { y, m, d };
}

function toIso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Локальная дата YYYY-MM-DD (без UTC-сдвига). */
export function todayIso(): string {
  const now = new Date();
  return toIso(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** Календарь выбора даты с подсветкой дней, где были посещения. */
export default function MarkedDatePicker({
  value,
  onChange,
  markedDates,
  id,
  className = "",
}: MarkedDatePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const parsed = parseIso(value);
  const [viewYear, setViewYear] = useState(() => parsed?.y ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => (parsed ? parsed.m - 1 : new Date().getMonth()));

  useEffect(() => {
    const p = parseIso(value);
    if (!p) return;
    setViewYear(p.y);
    setViewMonth(p.m - 1);
  }, [value]);

  // Открытый календарь поверх соседних карточек (учёт за день и т.п.)
  useLayoutEffect(() => {
    if (!open || !rootRef.current) return;

    const rect = rootRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    setDropUp(spaceBelow < 280 && spaceAbove > spaceBelow);

    const host =
      rootRef.current.closest<HTMLElement>("#daily-header") ||
      rootRef.current.closest<HTMLElement>("[data-datepicker-elevate]") ||
      rootRef.current;

    const prevZ = host.style.zIndex;
    const prevPos = host.style.position;
    const computedPos = getComputedStyle(host).position;
    host.style.zIndex = "50";
    if (computedPos === "static") host.style.position = "relative";

    return () => {
      host.style.zIndex = prevZ;
      host.style.position = prevPos;
    };
  }, [open, viewYear, viewMonth]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const cells = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const startPad = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const items: Array<{ day: number | null; iso: string | null }> = [];
    for (let i = 0; i < startPad; i++) items.push({ day: null, iso: null });
    for (let d = 1; d <= daysInMonth; d++) {
      items.push({ day: d, iso: toIso(viewYear, viewMonth + 1, d) });
    }
    while (items.length % 7 !== 0) items.push({ day: null, iso: null });
    return items;
  }, [viewYear, viewMonth]);

  const today = todayIso();
  const displayLabel = (() => {
    const p = parseIso(value);
    if (!p) return value;
    return new Date(p.y, p.m - 1, p.d).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  })();

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else setViewMonth((m) => m + 1);
  };

  return (
    <div
      ref={rootRef}
      className={`relative inline-block ${open ? "z-[50]" : ""} ${className}`}
    >
      <button
        type="button"
        id={id}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 pl-2.5 pr-2.5 py-1.5 border border-slate-200 rounded bg-slate-50 text-xs font-semibold text-slate-700 hover:border-rose-200 hover:bg-rose-50/40 focus:outline-none focus:ring-1 focus:ring-rose-200 focus:border-rose-300 min-w-[9.5rem]"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Calendar className="h-3.5 w-3.5 text-rose-500 shrink-0" />
        <span className="leading-snug whitespace-nowrap">{displayLabel}</span>
      </button>

      {open && (
        <div
          ref={popoverRef}
          className={`absolute left-0 z-[60] w-[17.5rem] rounded-xl border border-slate-200 bg-white shadow-xl p-3 ${
            dropUp ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
          role="dialog"
          aria-label="Календарь"
        >
          <div className="flex items-center justify-between mb-2 gap-1">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              aria-label="Предыдущий месяц"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              aria-label="Следующий месяц"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="text-center text-[9px] font-bold uppercase tracking-wider text-slate-400 py-0.5"
              >
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((cell, idx) => {
              if (!cell.iso || cell.day == null) {
                return <div key={`e-${idx}`} className="h-8" />;
              }
              const isSelected = cell.iso === value;
              const isToday = cell.iso === today;
              const hasVisits = markedDates.has(cell.iso);
              const dow = new Date(viewYear, viewMonth, cell.day).getDay();
              const isWeekend = dow === 0 || dow === 6;

              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => {
                    onChange(cell.iso!);
                    setOpen(false);
                  }}
                  title={
                    hasVisits
                      ? `${cell.day}.${viewMonth + 1}.${viewYear} — есть записи`
                      : `${cell.day}.${viewMonth + 1}.${viewYear}`
                  }
                  className={[
                    "relative h-8 rounded-lg text-[11px] font-bold leading-none transition-colors",
                    isSelected
                      ? "bg-rose-500 text-white shadow-sm"
                      : isToday
                        ? "bg-rose-50 text-rose-700 ring-1 ring-rose-300"
                        : isWeekend
                          ? "text-amber-700 hover:bg-amber-50"
                          : "text-slate-700 hover:bg-slate-100",
                    hasVisits && !isSelected ? "font-extrabold" : "",
                  ].join(" ")}
                >
                  {cell.day}
                  {hasVisits && (
                    <span
                      className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full ${
                        isSelected ? "bg-white" : "bg-emerald-500"
                      }`}
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 text-[9px] text-slate-400 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              день с записями
            </span>
            <button
              type="button"
              onClick={() => {
                const t = todayIso();
                onChange(t);
                const p = parseIso(t)!;
                setViewYear(p.y);
                setViewMonth(p.m - 1);
                setOpen(false);
              }}
              className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 rounded"
            >
              Сегодня
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
