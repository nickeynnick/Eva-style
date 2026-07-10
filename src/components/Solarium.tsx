import React, { useState, useEffect } from "react";
import { SolariumSession, SettingsRule, ReceivingPaymentMethod } from "../types";
import { paymentMethodLabel } from "../utils/paymentUtils";
import { Sun, Calendar, Plus, Trash2, ListFilter, RotateCcw, TrendingUp } from "lucide-react";

interface SolariumProps {
  solariumSessions: SolariumSession[];
  setSolariumSessions: React.Dispatch<React.SetStateAction<SolariumSession[]>>;
  activeSettings: SettingsRule;
  selectedDate: string;
  showHistory?: boolean;
}

type PeriodFilterMode = "selected" | "range" | "month" | "all";

export default function Solarium({
  solariumSessions,
  setSolariumSessions,
  activeSettings,
  selectedDate,
  showHistory = true,
}: SolariumProps) {
  // Input form state
  const [sessionDate, setSessionDate] = useState(selectedDate);
  const [minutes, setMinutes] = useState<number | "">("");
  const [creamPrice, setCreamPrice] = useState<number | "">("");
  const [stickersPrice, setStickersPrice] = useState<number | "">("");
  const [paymentMethod, setPaymentMethod] = useState<ReceivingPaymentMethod>("наличные");

  // Filtering list state
  const [filterMode, setFilterMode] = useState<PeriodFilterMode>("selected");
  const [filterSingleDate, setFilterSingleDate] = useState(selectedDate);
  const [filterStartDate, setFilterStartDate] = useState(selectedDate);
  const [filterEndDate, setFilterEndDate] = useState(selectedDate);

  // Synchronize with parent globally selected date
  useEffect(() => {
    setSessionDate(selectedDate);
    setFilterSingleDate(selectedDate);
    setFilterStartDate(selectedDate);
    setFilterEndDate(selectedDate);
  }, [selectedDate]);

  // Confirmation state for deleting sessions
  const [confirmDeleteSessionId, setConfirmDeleteSessionId] = useState<string | null>(null);

  // Helper is date inside current month?
  const isDateInCurrentMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };

  // Filtered list computed
  const filteredSessions = solariumSessions.filter(s => {
    if (filterMode === "selected") {
      return s.date === filterSingleDate;
    } else if (filterMode === "range") {
      return s.date >= filterStartDate && s.date <= filterEndDate;
    } else if (filterMode === "month") {
      return isDateInCurrentMonth(s.date);
    } else {
      return true; // all time
    }
  });

  // Calculate statistics for filtered list
  const totalMinutesInPeriod = filteredSessions.reduce((sum, s) => sum + s.minutes, 0);
  const totalMaterialsInPeriod = filteredSessions.reduce((sum, s) => sum + s.creamPrice + s.stickersPrice, 0);
  const totalRevenueInPeriod = filteredSessions.reduce((sum, s) => {
    const base = (s.minutes * activeSettings.solariumMinuteRate) + s.creamPrice + s.stickersPrice;
    const acq = s.acquiringCost !== undefined ? s.acquiringCost : (s.paymentMethod === "дебетовая карта" ? Math.round(base * (activeSettings.acquiringCommission / 100) * 100) / 100 : 0);
    return sum + base + acq;
  }, 0);

  // Add session
  const handleAddSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (minutes === "" || Number(minutes) <= 0) {
      alert("Укажите положительное количество минут");
      return;
    }

    const baseCost = Number(minutes) * activeSettings.solariumMinuteRate + (Number(creamPrice) || 0) + (Number(stickersPrice) || 0);
    const acq = paymentMethod === "дебетовая карта" ? Math.round(baseCost * (activeSettings.acquiringCommission / 100) * 100) / 100 : 0;

    const newSession: SolariumSession = {
      id: "sol-" + Date.now(),
      date: sessionDate,
      minutes: Number(minutes),
      creamPrice: Number(creamPrice) || 0,
      stickersPrice: Number(stickersPrice) || 0,
      paymentMethod,
      acquiringCost: acq
    };

    setSolariumSessions(prev => [newSession, ...prev]);
    
    // reset inputs
    setMinutes("");
    setCreamPrice("");
    setStickersPrice("");
  };

  const handleDeleteSession = (id: string) => {
    setSolariumSessions(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="space-y-8" id="solarium-view">
      {/* Title */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-sans tracking-tight">Солярий</h2>
          <p className="text-sm text-slate-500 font-sans">Регистрируйте сеансы солярия, рассчитывайте стоимость материалов (крем, стикини) и формируйте списки доходов</p>
        </div>
      </div>

      {/* Statistics dashboards for selected period */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="solarium-kpi-widgets">
        {/* Minute price */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block font-sans">Цена за минуту (В тарифах)</span>
            <div className="text-2xl font-mono font-extrabold text-slate-800">
              {activeSettings.solariumMinuteRate} ₽
            </div>
          </div>
          <div className="h-10 w-10 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center">
            <Sun className="h-5 w-5" />
          </div>
        </div>

        {/* Minutes logged */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block font-sans">Минут за период</span>
            <div className="text-2xl font-mono font-extrabold text-slate-800">
              {totalMinutesInPeriod} мин
            </div>
          </div>
          <div className="h-10 w-10 bg-emerald-50 text-emerald-500 rounded-xl flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        {/* Materials (stickers + cream) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block font-sans">Материалы (крем, стикини)</span>
            <div className="text-2xl font-mono font-extrabold text-blue-600">
              {totalMaterialsInPeriod.toLocaleString()} ₽
            </div>
          </div>
          <div className="h-10 w-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        {/* Revenue logged */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between shadow-xs">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block font-sans">Выручка солярия за период</span>
            <div className="text-2xl font-mono font-extrabold text-emerald-600">
              {totalRevenueInPeriod.toLocaleString()} ₽
            </div>
          </div>
          <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Sun className="h-5 w-5 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Form and History blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="solarium-details-grid">
        {/* Record session Card */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-md font-semibold text-slate-800 flex items-center gap-2">
              <Sun className="h-5 w-5 text-amber-500" />
              Зафиксировать сеанс солярия
            </h3>

            <form onSubmit={handleAddSession} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Дата</label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2 bg-slate-50/50 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Количество минут</label>
                <input
                  type="number"
                  placeholder="Например, 10"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2 bg-slate-50/50 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500"
                  min="1"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Материал: Крем (Р)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={creamPrice}
                    onChange={(e) => setCreamPrice(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2 bg-slate-50/50 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Материал: Стикини (Р)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={stickersPrice}
                    onChange={(e) => setStickersPrice(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2 bg-slate-50/50 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500"
                    min="0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Тип оплаты</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as ReceivingPaymentMethod)}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500"
                >
                  <option value="наличные">Наличные</option>
                  <option value="дебетовая карта">Картой (безнал)</option>
                  <option value="перевод">Перевод</option>
                </select>
              </div>

              {/* Total display live */}
              <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 font-sans space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>За минуты:</span>
                  <span className="font-mono">{((Number(minutes) || 0) * activeSettings.solariumMinuteRate).toLocaleString()} ₽</span>
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Материалы (крем/стикини):</span>
                  <span className="font-mono">{((Number(creamPrice) || 0) + (Number(stickersPrice) || 0)).toLocaleString()} ₽</span>
                </div>
                {paymentMethod === "дебетовая карта" && (
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Эквайринг ({activeSettings.acquiringCommission}%):</span>
                    <span className="font-mono text-blue-600">
                      +{Math.round(((Number(minutes) || 0) * activeSettings.solariumMinuteRate + (Number(creamPrice) || 0) + (Number(stickersPrice) || 0)) * (activeSettings.acquiringCommission / 100) * 100 / 100).toLocaleString()} ₽
                    </span>
                  </div>
                )}
                {paymentMethod === "перевод" && (
                  <div className="flex justify-between text-xs text-cyan-600">
                    <span>Учёт переводом — отдельно от кассы и безнала</span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-1.5 flex justify-between items-baseline text-slate-800 font-bold">
                  <span>Всего:</span>
                  <span className="text-md font-mono text-amber-600">
                    {Math.round(
                      ((Number(minutes) || 0) * activeSettings.solariumMinuteRate + (Number(creamPrice) || 0) + (Number(stickersPrice) || 0)) *
                      (1 + (paymentMethod === "дебетовая карта" ? activeSettings.acquiringCommission / 100 : 0))
                    ).toLocaleString()} ₽
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-xl text-sm transition-all focus:outline-none active:scale-95"
              >
                + Добавить в базу
              </button>
            </form>
          </div>
        </div>

        {/* History list card */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            
            {/* Filter buttons */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <h3 className="text-md font-semibold text-slate-800 font-sans">История посещений солярия</h3>
              
              <div className="flex flex-wrap gap-1 p-0.5 bg-slate-100 rounded-xl" id="solarium-filter-tabs">
                <button
                  type="button"
                  onClick={() => setFilterMode("selected")}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                    filterMode === "selected" ? "bg-white text-slate-800 shadow-sm font-semibold" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Выбранная дата
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("range")}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                    filterMode === "range" ? "bg-white text-slate-800 shadow-sm font-semibold" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Диапазон дат
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("month")}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                    filterMode === "month" ? "bg-white text-slate-800 shadow-sm font-semibold" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Текущий месяц
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode("all")}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                    filterMode === "all" ? "bg-white text-slate-800 shadow-sm font-semibold" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Все время
                </button>
              </div>
            </div>

            {/* Interactive sub-filters based on mode */}
            {filterMode === "selected" && (
              <div className="flex items-center gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600 font-medium">Показать за дату:</span>
                <input
                  type="date"
                  value={filterSingleDate}
                  onChange={(e) => setFilterSingleDate(e.target.value)}
                  className="border border-slate-200 rounded px-2.5 py-1 text-xs bg-white text-slate-700"
                />
              </div>
            )}

            {filterMode === "range" && (
              <div className="flex flex-wrap items-center gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600 font-medium">Диапазон дат с:</span>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="border border-slate-200 rounded px-2.5 py-1 text-xs bg-white"
                />
                <span className="text-slate-500">по:</span>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="border border-slate-200 rounded px-2.5 py-1 text-xs bg-white"
                />
              </div>
            )}

            {filterMode === "month" && (
              <div className="bg-slate-50 p-3 rounded-xl text-xs text-slate-500 font-medium">
                Отображаются записи за текущий календарный месяц:{" "}
                <strong className="text-slate-700">{new Date().toLocaleString("ru-RU", { month: "long", year: "numeric" })}</strong>.
              </div>
            )}

            {/* List entries */}
            {filteredSessions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-100">
                Нет записей солярия за выбранный период
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                      <th className="py-2.5 px-4">Смена / Дата</th>
                      <th className="py-2.5 px-4 text-center">Минуты</th>
                      <th className="py-2.5 px-4 text-right">Материалы</th>
                      <th className="py-2.5 px-4 text-center">Оплата</th>
                      <th className="py-2.5 px-4 text-right">Сумма</th>
                      <th className="py-2.5 px-4 text-center">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSessions.map(session => {
                      const baseCost = (session.minutes * activeSettings.solariumMinuteRate) + session.creamPrice + session.stickersPrice;
                      const hasAcq = session.paymentMethod === "дебетовая карта";
                      const acqFee = session.acquiringCost !== undefined ? session.acquiringCost : (hasAcq ? Math.round(baseCost * (activeSettings.acquiringCommission / 100) * 100) / 100 : 0);
                      const totalCost = baseCost + acqFee;
                      return (
                        <tr key={session.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-medium text-slate-800">
                            {new Date(session.date).toLocaleDateString("ru-RU")}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">
                            {session.minutes} мин
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-500">
                            Крем (мат.): {session.creamPrice} ₽ | Стикини (мат.): {session.stickersPrice} ₽{acqFee > 0 && ` | Экв: ${acqFee} ₽`}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                              session.paymentMethod === "наличные" ? "bg-emerald-50 text-emerald-700"
                              : session.paymentMethod === "перевод" ? "bg-cyan-50 text-cyan-700"
                              : "bg-blue-50 text-blue-700"
                            }`}>
                              {paymentMethodLabel(session.paymentMethod)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-600 font-mono">
                            {totalCost} ₽
                          </td>
                          <td className="py-3 px-4 text-center">
                            {confirmDeleteSessionId === session.id ? (
                              <button
                                onClick={() => {
                                  handleDeleteSession(session.id);
                                  setConfirmDeleteSessionId(null);
                                }}
                                className="text-red-700 bg-red-50 border border-red-200 py-1 px-2.5 rounded hover:bg-red-100 transition-colors inline-flex items-center gap-1 text-[10px] font-bold animate-pulse"
                                title="Подтвердить удаление"
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-600" />
                                Точно?
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setConfirmDeleteSessionId(session.id);
                                  setTimeout(() => {
                                    setConfirmDeleteSessionId(current => current === session.id ? null : current);
                                  }, 4000);
                                }}
                                className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-50 transition-colors inline-block"
                                title="Удалить сеанс"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
