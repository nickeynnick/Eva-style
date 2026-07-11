import React, { useState } from "react";
import { Employee, AdminShift, Position, AdminDayOfWeekRate, AdminDaysRateRule } from "../types";
import { Calendar, ChevronLeft, ChevronRight, Check, CreditCard, User, HelpCircle, RussianRuble } from "lucide-react";

interface AdminSalariesProps {
  employees: Employee[];
  adminShifts: AdminShift[];
  setAdminShifts: React.Dispatch<React.SetStateAction<AdminShift[]>>;
  adminDaysRates: AdminDayOfWeekRate;
  adminDaysRatesRules?: AdminDaysRateRule[];
  selectedDate: string;
  allowAdminShiftEdits?: boolean;
  adminPaidWages: Record<string, number>;
  setAdminPaidWages: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

export default function AdminSalaries({
  employees,
  adminShifts,
  setAdminShifts,
  adminDaysRates,
  adminDaysRatesRules,
  selectedDate,
  allowAdminShiftEdits = true,
  adminPaidWages,
  setAdminPaidWages,
}: AdminSalariesProps) {
  // Navigation year & month state (defaults to current local clock)
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());

  // Store custom manual "paid" amounts inside a local component state or hook it up with localStorage.
  // We'll write to a dictionary of payments state that persists in localStorage or matches a property.
  // To keep it simple and reactive, let's keep an object state of paid wages in state & synchronize with localStorage.
  const updatePaidWage = (adminId: string, amount: number) => {
    setAdminPaidWages(prev => ({ ...prev, [adminId]: amount }));
  };

  const admins = employees.filter(e => e.position === Position.Administrator);

  const monthsRussian = [
    "ЯНВАРЬ", "ФЕВРАЛЬ", "МАРТ", "АПРЕЛЬ", "МАЙ", "ИЮНЬ",
    "ИЮЛЬ", "АВГУСТ", "СЕНТЯБРЬ", "ОКТЯБРЬ", "НОЯБРЬ", "ДЕКАБРЬ"
  ];

  // Number of days in the month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Helper to determine day of week rate considering history rates
  const getAdminRateForDateAndDay = (dateStr: string, dayOfWeekNum: number): number => {
    if (adminDaysRatesRules && adminDaysRatesRules.length > 0) {
      const sorted = [...adminDaysRatesRules].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
      const activeRule = sorted.find(r => r.effectiveDate <= dateStr) || sorted[sorted.length - 1];
      if (activeRule) {
        switch (dayOfWeekNum) {
          case 0: return activeRule.sunday;
          case 1: return activeRule.monday;
          case 2: return activeRule.tuesday;
          case 3: return activeRule.wednesday;
          case 4: return activeRule.thursday;
          case 5: return activeRule.friday;
          case 6: return activeRule.saturday;
        }
      }
    }

    // fallback to static props rates
    switch (dayOfWeekNum) {
      case 0: return adminDaysRates.sunday;
      case 1: return adminDaysRates.monday;
      case 2: return adminDaysRates.tuesday;
      case 3: return adminDaysRates.wednesday;
      case 4: return adminDaysRates.thursday;
      case 5: return adminDaysRates.friday;
      case 6: return adminDaysRates.saturday;
      default: return 1500;
    }
  };

  // Helper to toggle a shift on a chosen day
  const handleToggleShift = (adminId: string, dayNum: number) => {
    if (!allowAdminShiftEdits) return;
    const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-${dayNum.toString().padStart(2, "0")}`;
    const exists = adminShifts.find(s => s.adminId === adminId && s.date === dateStr);

    if (exists) {
      // Remove shift
      setAdminShifts(prev => prev.filter(s => s.id !== exists.id));
    } else {
      // Add shift. Determine day of week rate
      const d = new Date(currentYear, currentMonth, dayNum);
      const dayOfWeekNum = d.getDay(); // 0 is Sunday, 1 is Monday...
      const rate = getAdminRateForDateAndDay(dateStr, dayOfWeekNum);

      const newShift: AdminShift = {
        id: "ashift-" + Date.now() + Math.random().toString(36).substr(2, 4),
        adminId,
        date: dateStr,
        rate
      };

      setAdminShifts(prev => [...prev, newShift]);
    }
  };

  // Calculates earnings and active shifts for the selected month
  const getAdminMonthPerformance = (adminId: string) => {
    const monthPrefix = `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}`;
    const monthlyShifts = adminShifts.filter(s => s.adminId === adminId && s.date.startsWith(monthPrefix));
    
    // Sum rates dynamically
    const earned = monthlyShifts.reduce((sum, s) => sum + s.rate, 0);
    const count = monthlyShifts.length;
    const paid = adminPaidWages[adminId] || 0;
    const rest = earned - paid;

    return {
      count,
      earned,
      paid,
      rest
    };
  };

  // Helper weekday translate name
  const getWeekdayName = (dayNum: number) => {
    const d = new Date(currentYear, currentMonth, dayNum);
    const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
    return days[d.getDay()];
  };

  const getDayOfPeriodRate = (dayNum: number) => {
    const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}-${dayNum.toString().padStart(2, "0")}`;
    const d = new Date(currentYear, currentMonth, dayNum);
    const dayOfWeekNum = d.getDay();
    return getAdminRateForDateAndDay(dateStr, dayOfWeekNum);
  };

  return (
    <div className="space-y-8" id="admin-salaries-view">
      {/* Title block */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-sans tracking-tight">Табель администраторов</h2>
          <p className="text-sm text-slate-500 font-sans">Учет рабочих смен, выходов администраторов и ставок по дням недели</p>
        </div>
      </div>

      {/* Month Navigator Header matches Screen 5 */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between max-w-xl mx-auto" id="month-navigator">
        <button
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
          onClick={handleNextMonth}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 px-3.5 py-2 rounded-xl transition-colors font-sans"
        >
          След.
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Admin Summary Deck (Yana, Podmena cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="admins-deck">
        {admins.map(admin => {
          const perf = getAdminMonthPerformance(admin.id);
          const customDayRate = getDayOfPeriodRate(new Date().getDate()); // today's rate as a mock default indicator on card

          return (
            <div key={admin.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4 hover:shadow-xs transition-shadow">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-md font-bold text-slate-800 font-sans">{admin.name}</h4>
                  <p className="text-[11px] text-slate-400 font-medium">Ставка по умолчанию: {adminDaysRates.monday} ₽ за выход</p>
                </div>
              </div>

              {/* Stats columns */}
              <div className="grid grid-cols-2 gap-4 pb-2">
                <div className="bg-slate-50 rounded-xl p-3.5 space-y-0.5 border border-slate-100/50">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Смен в месяце</span>
                  <div className="text-xl font-mono font-extrabold text-slate-800">
                    {perf.count}
                  </div>
                </div>
                <div className="bg-purple-50/50 rounded-xl p-3.5 space-y-0.5 border border-purple-100/50">
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block">Начислено за месяц</span>
                  <div className="text-xl font-mono font-extrabold text-purple-700">
                    {perf.earned.toLocaleString()} ₽
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Attendance Sheet Card matches Screen 5 table layout */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4" id="shift-checker-grid">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <h3 className="text-md font-semibold text-slate-800 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            Табель администраторов
          </h3>
          {!allowAdminShiftEdits && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200">
              🔒 ТОЛЬКО ДЛЯ ЧТЕНИЯ
            </span>
          )}
        </div>

        {admins.length === 0 ? (
          <div className="text-center py-6 text-slate-400">Администраторы не найдены. Создайте сотрудников в панели владелицы.</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-left border-collapse border-spacing-0">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="py-2.5 px-4 sticky left-0 bg-slate-50 z-10 border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.01)] min-w-[120px]">Сотрудник</th>
                  {Array.from({ length: daysInMonth }).map((_, idx) => {
                    const dNum = idx + 1;
                    const wName = getWeekdayName(dNum);
                    const isWeekend = wName === "Сб" || wName === "Вс";
                    return (
                      <th 
                        key={idx} 
                        className={`py-2 text-center border-r border-slate-100 min-w-[34px] font-sans ${isWeekend ? "bg-amber-50/50 text-amber-700 font-semibold" : ""}`}
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
                {admins.map(admin => {
                  const monthPrefix = `${currentYear}-${(currentMonth + 1).toString().padStart(2, "0")}`;
                  
                  return (
                    <tr key={admin.id} className="hover:bg-slate-50/30 transition-colors border-b border-slate-100 text-sm">
                      <td className="py-3 px-4 font-bold text-slate-700 sticky left-0 bg-white z-10 border-r border-slate-100 shadow-[2px_0_5px_rgba(0,0,0,0.01)]">
                        {admin.name}
                      </td>
                      {Array.from({ length: daysInMonth }).map((_, idx) => {
                        const dNum = idx + 1;
                        const dateStr = `${monthPrefix}-${dNum.toString().padStart(2, "0")}`;
                        const isSet = adminShifts.some(s => s.adminId === admin.id && s.date === dateStr);
                        
                        const wName = getWeekdayName(dNum);
                        const rateForDay = getDayOfPeriodRate(dNum);

                        return (
                          <td 
                            key={idx} 
                            onClick={() => allowAdminShiftEdits && handleToggleShift(admin.id, dNum)}
                            className={`py-1 text-center border-r border-slate-100 select-none transition-colors ${
                              allowAdminShiftEdits ? "cursor-pointer hover:bg-slate-100/50" : "cursor-default"
                            }`}
                          >
                            {isSet ? (
                              <div 
                                className={`h-7 w-7 text-purple-700 rounded-lg flex items-center justify-center mx-auto text-xs font-bold transition-all ${
                                  allowAdminShiftEdits ? "bg-purple-100 hover:bg-purple-200 transform scale-102" : "bg-slate-100 text-slate-500"
                                }`}
                                title={allowAdminShiftEdits ? `Дата: ${dNum}.${currentMonth+1} (${wName})\nСтавка за этот день: ${rateForDay} ₽` : "Только для чтения"}
                              >
                                1
                              </div>
                            ) : (
                              <div 
                                className="h-7 w-7 text-slate-300 rounded flex items-center justify-center mx-auto text-xs font-black"
                                title={allowAdminShiftEdits ? `Нажмите для отметки выхода!\nДата: ${dNum}.${currentMonth+1} (${wName})\nСтавка за этот день: ${rateForDay} ₽` : "Только для чтения"}
                              >
                                ·
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
