import React, { useRef, useState } from "react";
import { Employee, AdminShift, Position } from "../types";
import { Calendar, ChevronLeft, ChevronRight, User } from "lucide-react";

interface AdminSalariesProps {
  employees: Employee[];
  adminShifts: AdminShift[];
  setAdminShifts: React.Dispatch<React.SetStateAction<AdminShift[]>>;
  selectedDate: string;
  allowAdminShiftEdits?: boolean;
}

export default function AdminSalaries({
  employees,
  adminShifts,
  setAdminShifts,
  allowAdminShiftEdits = true,
}: AdminSalariesProps) {
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  /** Ячейка в режиме редактирования: `${adminId}|${dateStr}` */
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [draftAmount, setDraftAmount] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const admins = employees.filter((e) => e.position === Position.Administrator);

  const monthsRussian = [
    "ЯНВАРЬ", "ФЕВРАЛЬ", "МАРТ", "АПРЕЛЬ", "МАЙ", "ИЮНЬ",
    "ИЮЛЬ", "АВГУСТ", "СЕНТЯБРЬ", "ОКТЯБРЬ", "НОЯБРЬ", "ДЕКАБРЬ",
  ];

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const monthPrefix = `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}`;

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const getShift = (adminId: string, dateStr: string) =>
    adminShifts.find((s) => s.adminId === adminId && s.date === dateStr);

  /** Сохранить сумму за день. Пусто / 0 — удалить запись. */
  const commitDayAmount = (adminId: string, dateStr: string, raw: string) => {
    if (!allowAdminShiftEdits) return;
    const normalized = raw.replace(",", ".").trim();
    const amount = normalized === "" ? 0 : Number(normalized);
    const existing = getShift(adminId, dateStr);

    if (!Number.isFinite(amount) || amount <= 0) {
      if (existing) {
        setAdminShifts((prev) => prev.filter((s) => s.id !== existing.id));
      }
      return;
    }

    const rounded = Math.round(amount);
    if (existing) {
      if (existing.rate !== rounded) {
        setAdminShifts((prev) =>
          prev.map((s) => (s.id === existing.id ? { ...s, rate: rounded } : s))
        );
      }
      return;
    }

    const newShift: AdminShift = {
      id: "ashift-" + Date.now() + Math.random().toString(36).slice(2, 6),
      adminId,
      date: dateStr,
      rate: rounded,
    };
    setAdminShifts((prev) => [...prev, newShift]);
  };

  const startEdit = (adminId: string, dateStr: string) => {
    if (!allowAdminShiftEdits) return;
    const existing = getShift(adminId, dateStr);
    setEditingCell(`${adminId}|${dateStr}`);
    setDraftAmount(existing ? String(existing.rate) : "");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const finishEdit = (adminId: string, dateStr: string, save: boolean) => {
    if (save) commitDayAmount(adminId, dateStr, draftAmount);
    setEditingCell(null);
    setDraftAmount("");
  };

  const getAdminMonthPerformance = (adminId: string) => {
    const monthlyShifts = adminShifts.filter(
      (s) => s.adminId === adminId && s.date.startsWith(monthPrefix)
    );
    return {
      count: monthlyShifts.length,
      earned: monthlyShifts.reduce((sum, s) => sum + s.rate, 0),
    };
  };

  const getWeekdayName = (dayNum: number) => {
    const d = new Date(currentYear, currentMonth, dayNum);
    return ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"][d.getDay()];
  };

  return (
    <div className="space-y-8" id="admin-salaries-view">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-sans tracking-tight">Табель администраторов</h2>
          <p className="text-sm text-slate-500 font-sans">
            Введите зарплату администратора за каждый рабочий день вручную
          </p>
        </div>
      </div>

      <div
        className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between max-w-xl mx-auto"
        id="month-navigator"
      >
        <button
          type="button"
          onClick={handlePrevMonth}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 px-3.5 py-2 rounded-xl transition-colors font-sans"
        >
          <ChevronLeft className="h-4 w-4" />
          Пред.
        </button>
        <span className="text-sm font-bold text-slate-800 tracking-wider font-sans uppercase">
          {monthsRussian[currentMonth]} {currentYear}
        </span>
        <button
          type="button"
          onClick={handleNextMonth}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 px-3.5 py-2 rounded-xl transition-colors font-sans"
        >
          След.
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="admins-deck">
        {admins.map((admin) => {
          const perf = getAdminMonthPerformance(admin.id);
          return (
            <div
              key={admin.id}
              className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 hover:shadow-xs transition-shadow"
            >
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-md font-bold text-slate-800 font-sans">{admin.name}</h4>
                  <p className="text-[11px] text-slate-400 font-medium">Зарплата за день вводится в табеле</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pb-2">
                <div className="bg-slate-50 rounded-xl p-3.5 space-y-0.5 border border-slate-100/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Дней с начислением
                  </span>
                  <div className="text-xl font-mono font-extrabold text-slate-800">{perf.count}</div>
                </div>
                <div className="bg-purple-50/50 rounded-xl p-3.5 space-y-0.5 border border-purple-100/50">
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">
                    Начислено за месяц
                  </span>
                  <div className="text-xl font-mono font-extrabold text-purple-700">
                    {perf.earned.toLocaleString()} ₽
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4" id="shift-checker-grid">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h3 className="text-md font-semibold text-slate-800 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            Зарплата по дням
          </h3>
          {!allowAdminShiftEdits && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
              🔒 ТОЛЬКО ДЛЯ ЧТЕНИЯ
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 font-sans">
          Нажмите на ячейку и введите сумму в рублях. Пустое значение или 0 удаляет начисление за день.
        </p>

        {admins.length === 0 ? (
          <div className="text-center py-6 text-slate-400">
            Администраторы не найдены. Создайте сотрудников в панели владелицы.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse border-spacing-0">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="py-2.5 px-4 sticky left-0 bg-slate-50 z-10 border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.01)] min-w-[120px]">
                    Сотрудник
                  </th>
                  {Array.from({ length: daysInMonth }).map((_, idx) => {
                    const dNum = idx + 1;
                    const wName = getWeekdayName(dNum);
                    const isWeekend = wName === "Сб" || wName === "Вс";
                    return (
                      <th
                        key={idx}
                        className={`py-2 text-center border-r border-slate-100 min-w-[52px] font-sans ${
                          isWeekend ? "bg-amber-50/50 text-amber-700 font-semibold" : ""
                        }`}
                        title={`${dNum} ${monthsRussian[currentMonth]} (${wName})`}
                      >
                        <div className="text-[10px]">{dNum}</div>
                        <div className="text-[9px] font-medium text-slate-400">{wName}</div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr
                    key={admin.id}
                    className="hover:bg-slate-50/30 transition-colors border-b border-slate-100 text-sm"
                  >
                    <td className="py-3 px-4 font-bold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.01)]">
                      {admin.name}
                    </td>
                    {Array.from({ length: daysInMonth }).map((_, idx) => {
                      const dNum = idx + 1;
                      const dateStr = `${monthPrefix}-${dNum.toString().padStart(2, "0")}`;
                      const shift = getShift(admin.id, dateStr);
                      const cellKey = `${admin.id}|${dateStr}`;
                      const isEditing = editingCell === cellKey;
                      const wName = getWeekdayName(dNum);

                      return (
                        <td
                          key={idx}
                          className={`py-1 px-0.5 text-center border-r border-slate-100 select-none transition-colors ${
                            allowAdminShiftEdits ? "cursor-pointer hover:bg-slate-100/50" : "cursor-default"
                          }`}
                          onClick={() => {
                            if (!isEditing) startEdit(admin.id, dateStr);
                          }}
                        >
                          {isEditing ? (
                            <input
                              ref={inputRef}
                              type="number"
                              min="0"
                              step="1"
                              inputMode="numeric"
                              value={draftAmount}
                              onChange={(e) => setDraftAmount(e.target.value)}
                              onBlur={() => finishEdit(admin.id, dateStr, true)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  finishEdit(admin.id, dateStr, true);
                                } else if (e.key === "Escape") {
                                  e.preventDefault();
                                  finishEdit(admin.id, dateStr, false);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-12 mx-auto block text-center text-[11px] font-mono font-bold border border-purple-300 rounded-lg px-0.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-purple-300"
                              title={`${dNum}.${currentMonth + 1} (${wName})`}
                            />
                          ) : shift ? (
                            <div
                              className={`min-h-7 min-w-[2.75rem] px-0.5 text-purple-700 rounded-lg flex items-center justify-center mx-auto text-[10px] font-mono font-bold transition-all ${
                                allowAdminShiftEdits
                                  ? "bg-purple-100 hover:bg-purple-200"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                              title={
                                allowAdminShiftEdits
                                  ? `${dNum}.${currentMonth + 1} (${wName}): ${shift.rate} ₽ — нажмите, чтобы изменить`
                                  : `${shift.rate} ₽`
                              }
                            >
                              {shift.rate}
                            </div>
                          ) : (
                            <div
                              className="h-7 w-7 text-slate-300 rounded flex items-center justify-center mx-auto text-xs font-black"
                              title={
                                allowAdminShiftEdits
                                  ? `Нажмите, чтобы ввести ЗП за ${dNum}.${currentMonth + 1} (${wName})`
                                  : "Только для чтения"
                              }
                            >
                              ·
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
