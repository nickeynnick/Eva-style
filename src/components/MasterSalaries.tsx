import React, { useState } from "react";
import { showAppAlert } from "../utils/appDialog";
import { 
  Employee, 
  Visit, 
  MasterTransaction, 
  Position,
  AdminShift
} from "../types";
import { calculateMasterShareForVisit } from "../utils/salaryUtils";
import { 
  RussianRuble, 
  Plus, 
  Trash2, 
  User, 
  Calendar, 
  CreditCard, 
  Info, 
  TrendingUp, 
  TrendingDown, 
  Calculator 
} from "lucide-react";

interface MasterSalariesProps {
  employees: Employee[];
  visits: Visit[];
  masterTransactions: MasterTransaction[];
  setMasterTransactions: React.Dispatch<React.SetStateAction<MasterTransaction[]>>;
  selectedDate: string;
  adminShifts?: AdminShift[];
  allowPayouts?: boolean;
}

type HistoryTab = "day" | "range" | "month" | "all";

export default function MasterSalaries({
  employees,
  visits,
  masterTransactions,
  setMasterTransactions,
  selectedDate,
  adminShifts,
  allowPayouts = true,
}: MasterSalariesProps) {
  // Add payout state
  const [targetMasterId, setTargetMasterId] = useState("");
  const [transactionType, setTransactionType] = useState<MasterTransaction["type"]>("выплата");
  const [amount, setAmount] = useState<number | "">("");
  const [txDate, setTxDate] = useState(selectedDate);
  const [comment, setComment] = useState("");

  // Confirmation state for deleting transactions
  const [confirmDeleteTxId, setConfirmDeleteTxId] = useState<string | null>(null);

  // History filters state
  const [historyTab, setHistoryTab] = useState<HistoryTab>("month");
  const [filterDay, setFilterDay] = useState(selectedDate);
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");

  // Wages ledger period filter state
  const [ledgerPeriodType, setLedgerPeriodType] = useState<"today" | "day" | "month" | "custom" | "year" | "all">("all");

  const [ledgerSelectedDay, setLedgerSelectedDay] = useState<string>(() => {
    return selectedDate;
  });

  const [ledgerSelectedMonth, setLedgerSelectedMonth] = useState<number>(() => {
    try {
      const parts = selectedDate.split("-");
      if (parts.length === 3) return Number(parts[1]) - 1;
    } catch (e) {}
    return new Date().getMonth();
  });

  const [ledgerSelectedYear, setLedgerSelectedYear] = useState<number>(() => {
    try {
      const parts = selectedDate.split("-");
      if (parts.length === 3) return Number(parts[0]);
    } catch (e) {}
    return new Date().getFullYear();
  });

  const [ledgerStartDate, setLedgerStartDate] = useState<string>(selectedDate);
  const [ledgerEndDate, setLedgerEndDate] = useState<string>(selectedDate);

  const isDateInLedgerPeriod = (dateStr: string) => {
    if (ledgerPeriodType === "all") {
      return true;
    }
    if (ledgerPeriodType === "today") {
      const today = new Date();
      const offset = today.getTimezoneOffset();
      const localDate = new Date(today.getTime() - (offset * 60 * 1000));
      const todayStr = localDate.toISOString().split("T")[0];
      return dateStr === todayStr;
    }
    if (ledgerPeriodType === "day") {
      return dateStr === ledgerSelectedDay;
    }
    if (ledgerPeriodType === "month") {
      const monthPrefix = `${ledgerSelectedYear}-${(ledgerSelectedMonth + 1).toString().padStart(2, "0")}`;
      return dateStr.startsWith(monthPrefix);
    }
    if (ledgerPeriodType === "custom") {
      return dateStr >= ledgerStartDate && dateStr <= ledgerEndDate;
    }
    if (ledgerPeriodType === "year") {
      return dateStr.startsWith(`${ledgerSelectedYear}-`);
    }
    return true;
  };

  const monthsRussian = [
    "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
    "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
  ];

  const selectedLedgerPeriodTitle = React.useMemo(() => {
    if (ledgerPeriodType === "all") {
      return "весь период";
    }
    if (ledgerPeriodType === "today") {
      return `сегодня, ${new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}`;
    }
    if (ledgerPeriodType === "day") {
      try {
        const parts = ledgerSelectedDay.split("-");
        if (parts.length === 3) {
          const dObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          return `день ${dObj.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric", weekday: "long" })}`;
        }
      } catch (e) {}
      return `день ${ledgerSelectedDay}`;
    }
    if (ledgerPeriodType === "month") {
      return `месяц ${monthsRussian[ledgerSelectedMonth]} ${ledgerSelectedYear}`;
    }
    if (ledgerPeriodType === "custom") {
      try {
        const d1 = new Date(ledgerStartDate).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
        const d2 = new Date(ledgerEndDate).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
        return `период c ${d1} по ${d2}`;
      } catch (e) {}
      return `период с ${ledgerStartDate} по ${ledgerEndDate}`;
    }
    if (ledgerPeriodType === "year") {
      return `${ledgerSelectedYear} год`;
    }
    return "выбранный период";
  }, [ledgerPeriodType, ledgerSelectedDay, ledgerSelectedMonth, ledgerSelectedYear, ledgerStartDate, ledgerEndDate]);

  const activeMasters = employees;

  // Compute stats for each master
  const masterFinancialRecords = activeMasters.map(master => {
    // 1. Filter visits of this master (exclude deleted ones and filter by target period)
    const masterVisits = visits.filter(v => v.masterId === master.id && !v.isDeleted && isDateInLedgerPeriod(v.date));
    
    // 2. Count shifts and compute base earned amount
    let shiftsCount = 0;
    let shareAmount = 0;

    if (master.position === Position.Administrator) {
      // Pull and sum administrative shifts of this employee
      const adminShiftRecords = adminShifts ? adminShifts.filter(s => s.adminId === master.id && isDateInLedgerPeriod(s.date)) : [];
      shiftsCount = adminShiftRecords.length;
      shareAmount = adminShiftRecords.reduce((sum, s) => sum + s.rate, 0);
    } else {
      // Standard beautician shift dates and commission share
      const distinctDates = Array.from(new Set(masterVisits.map(v => v.date)));
      shiftsCount = distinctDates.length;
      shareAmount = masterVisits.reduce((sum, v) => sum + calculateMasterShareForVisit(master, v), 0);
    }

    // 4. Master materials reimbursement
    const materialsReimbursement = masterVisits.reduce((sum, v) => {
      if (v.masterMaterialsCost !== undefined) {
        return sum + v.masterMaterialsCost;
      }
      return sum + ((v as any).isSalonMaterials === false ? v.materialsCost : 0);
    }, 0);

    // 5. Rent deduction (if they pay rent, it deducts per shift)
    const rentDeduction = master.dailyRent * shiftsCount;

    // 6. Manual transactions calculation (filtered by period too)
    const masterTxs = masterTransactions.filter(t => t.masterId === master.id && isDateInLedgerPeriod(t.date));
    
    // Deductions/Fines (and manual rent if typed as rent)
    const extraDeductions = masterTxs
      .filter(t => t.type === "штраф" || t.type === "вычет аренды")
      .reduce((sum, t) => sum + t.amount, 0);

    // Paid out
    const paidOutAmount = masterTxs
      .filter(t => t.type === "выплата" || t.type === "аванс")
      .reduce((sum, t) => sum + t.amount, 0);

    // Master materials reimbursement paid out manually (if typed so)
    const extraAdditions = masterTxs
      .filter(t => t.type === "возврат материалов" || t.type === "прочее")
      .reduce((sum, t) => sum + t.amount, 0);

    // Balance to issue
    // Balance = (Share + MaterialsReimbursement + any specific material return txs) - (Rent + Fines + PaidOut)
    const balance = (shareAmount + materialsReimbursement + extraAdditions) - (rentDeduction + extraDeductions + paidOutAmount);

    return {
      master,
      shiftsCount,
      shareAmount,
      materialsReimbursement,
      rentDeduction,
      extraDeductions,
      paidOutAmount,
      balance
    };
  });

  // Handle adding master transaction
  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMasterId || amount === "") {
      showAppAlert("Заполните имя мастера и сумму транзакции");
      return;
    }

    const newTx: MasterTransaction = {
      id: "mtx-" + Date.now(),
      masterId: targetMasterId,
      type: transactionType,
      amount: Number(amount),
      date: txDate,
      comment: comment.trim() || transactionType
    };

    setMasterTransactions(prev => [newTx, ...prev]);
    setAmount("");
    setComment("");
  };

  const handleDeleteTransaction = (id: string) => {
    setMasterTransactions(prev => prev.filter(t => t.id !== id));
  };

  // Helper date checker
  const isTransactionInCurrentMonth = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    return d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  };

  // Filter transaction records by selected history tab
  const filteredTxs = masterTransactions.filter(t => {
    if (historyTab === "day") {
      return t.date === filterDay;
    } else if (historyTab === "range") {
      if (!filterStart || !filterEnd) return true;
      return t.date >= filterStart && t.date <= filterEnd;
    } else if (historyTab === "month") {
      return isTransactionInCurrentMonth(t.date);
    } else {
      return true; // all time
    }
  });

  return (
    <div className="space-y-8" id="master-salaries-view">
      {/* Title block */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 font-sans tracking-tight">Финансовый баланс сотрудников (включая администраторов и владелицу)</h2>
          <p className="text-sm text-slate-500 font-sans">Осуществляйте контроль долей за работу, выходов администраторов, аренды, выплат и вычетов всей команды</p>
        </div>
      </div>

      {/* Main Table: Master Financial Balance Grid */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4" id="masters-balance-box">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-emerald-600" />
            <h3 className="text-md font-bold text-slate-800">
              Ведомость начислений ({selectedLedgerPeriodTitle})
            </h3>
          </div>
          
          {/* Segmented controls for salaries ledger */}
          <div className="flex flex-wrap p-1 bg-slate-100 rounded-xl gap-1 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setLedgerPeriodType("all")}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                ledgerPeriodType === "all" ? "bg-white text-emerald-600 shadow-sm border border-slate-200/20" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Все время
            </button>
            <button
              type="button"
              onClick={() => setLedgerPeriodType("today")}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                ledgerPeriodType === "today" ? "bg-white text-emerald-600 shadow-sm border border-slate-200/20" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Сегодня
            </button>
            <button
              type="button"
              onClick={() => setLedgerPeriodType("day")}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                ledgerPeriodType === "day" ? "bg-white text-emerald-600 shadow-sm border border-slate-200/20" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              День
            </button>
            <button
              type="button"
              onClick={() => setLedgerPeriodType("month")}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                ledgerPeriodType === "month" ? "bg-white text-emerald-600 shadow-sm border border-slate-200/20" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Месяц
            </button>
            <button
              type="button"
              onClick={() => setLedgerPeriodType("custom")}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                ledgerPeriodType === "custom" ? "bg-white text-emerald-600 shadow-sm border border-slate-200/20" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Период
            </button>
            <button
              type="button"
              onClick={() => setLedgerPeriodType("year")}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                ledgerPeriodType === "year" ? "bg-white text-emerald-600 shadow-sm border border-slate-200/20" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Год
            </button>
          </div>
        </div>

        {/* Dynamic selector helper inputs below top controls */}
        {ledgerPeriodType !== "all" && ledgerPeriodType !== "today" && (
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-wrap items-center gap-3 text-xs text-slate-700">
            {ledgerPeriodType === "day" && (
              <div className="flex items-center gap-2">
                <span className="font-semibold">Выберите дату:</span>
                <input
                  type="date"
                  value={ledgerSelectedDay}
                  onChange={(e) => setLedgerSelectedDay(e.target.value)}
                  className="border border-slate-200 rounded-lg px-2 py-1 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                />
              </div>
            )}
            
            {ledgerPeriodType === "month" && (
              <div className="flex items-center gap-2">
                <span className="font-semibold">Выберите месяц и год:</span>
                <select
                  value={ledgerSelectedMonth}
                  onChange={(e) => setLedgerSelectedMonth(Number(e.target.value))}
                  className="border border-slate-200 rounded-lg px-2 py-1 bg-white font-medium"
                >
                  {monthsRussian.map((m, idx) => (
                    <option key={idx} value={idx}>{m}</option>
                  ))}
                </select>
                <select
                  value={ledgerSelectedYear}
                  onChange={(e) => setLedgerSelectedYear(Number(e.target.value))}
                  className="border border-slate-200 rounded-lg px-2 py-1 bg-white font-mono font-medium"
                >
                  {[2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}

            {ledgerPeriodType === "custom" && (
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-500">С:</span>
                  <input
                    type="date"
                    value={ledgerStartDate}
                    onChange={(e) => setLedgerStartDate(e.target.value)}
                    className="border border-slate-200 rounded-lg px-2 py-1 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-500">По:</span>
                  <input
                    type="date"
                    value={ledgerEndDate}
                    onChange={(e) => setLedgerEndDate(e.target.value)}
                    className="border border-slate-200 rounded-lg px-2 py-1 bg-white font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>
            )}

            {ledgerPeriodType === "year" && (
              <div className="flex items-center gap-2">
                <span className="font-semibold">Выберите год:</span>
                <select
                  value={ledgerSelectedYear}
                  onChange={(e) => setLedgerSelectedYear(Number(e.target.value))}
                  className="border border-slate-200 rounded-lg px-2 py-1 bg-white font-mono font-medium"
                >
                  {[2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                <th className="py-3 px-4">Сотрудник / Роль</th>
                <th className="py-3 px-4 text-center">Смен</th>
                <th className="py-3 px-4 text-right text-emerald-600 bg-emerald-50/20">Начислено / Доля</th>
                <th className="py-3 px-4 text-right text-amber-600">Мат. мастера (к з/п)</th>
                <th className="py-3 px-4 text-right text-red-500">Снято за аренду</th>
                <th className="py-3 px-4 text-right text-red-600">Вычеты / Штрафы</th>
                <th className="py-3 px-4 text-right text-blue-600">Выплачено на руки</th>
                <th className="py-3 px-4 text-right font-bold text-slate-800 bg-slate-50">Остаток к выдаче</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {masterFinancialRecords.map(({ master, shiftsCount, shareAmount, materialsReimbursement, rentDeduction, extraDeductions, paidOutAmount, balance }) => (
                <tr key={master.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-800">{master.name}</div>
                    <div className="text-[11px] text-slate-400 capitalize">{master.position}</div>
                  </td>
                  <td className="py-3.5 px-4 text-center font-mono font-semibold">{shiftsCount}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-600 font-medium bg-emerald-50/10">+{Math.round(shareAmount).toLocaleString()} ₽</td>
                  <td className="py-3.5 px-4 text-right font-mono text-amber-600">
                    {materialsReimbursement > 0 ? `+${Math.round(materialsReimbursement).toLocaleString()} ₽` : "-"}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-red-500">
                    {rentDeduction > 0 ? `-${Math.round(rentDeduction).toLocaleString()} ₽` : "0 ₽"}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-red-600">
                    {extraDeductions > 0 ? `-${Math.round(extraDeductions).toLocaleString()} ₽` : "0 ₽"}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-blue-600">
                    {paidOutAmount > 0 ? `-${Math.round(paidOutAmount).toLocaleString()} ₽` : "0 ₽"}
                  </td>
                  <td className={`py-3.5 px-4 text-right font-mono font-bold bg-slate-50/80 ${balance >= 0 ? "text-slate-800" : "text-red-600"}`}>
                    {Math.round(balance).toLocaleString()} ₽
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grid: Form and list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="masters-salaries-actions-grid">
        {/* Form panel */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-md font-semibold text-slate-800 flex items-center gap-2">
              <RussianRuble className="h-5 w-5 text-emerald-600" />
              Внести выплату или вычет мастеру
            </h3>

            {allowPayouts ? (
              <form onSubmit={handleAddTransaction} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Выбрать сотрудника</label>
                  <select
                    value={targetMasterId}
                    onChange={(e) => setTargetMasterId(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50/50 focus:outline-none"
                    required
                  >
                    <option value="">-- Выбрать --</option>
                    {activeMasters.map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.position})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Тип операции</label>
                  <select
                    value={transactionType}
                    onChange={(e) => setTransactionType(e.target.value as any)}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50/50 focus:outline-none"
                  >
                    <option value="выплата">Выплата (аванс / получка)</option>
                    <option value="штраф">Штраф / Вычет</option>
                    <option value="вычет аренды">Вычет за аренду</option>
                    <option value="возврат материалов">Возврат за материалы</option>
                    <option value="прочее">Другие начисления/списания</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Сумма (Р)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                      className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2 bg-slate-50/50 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
                      min="1"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Дата операции</label>
                    <input
                      type="date"
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2 bg-slate-50/50 focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Комментарий / Причина</label>
                  <textarea
                    placeholder="Выдача аванса, штраф за опоздание (необязательно)..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full text-sm border border-slate-200 rounded-xl px-3.5 py-2 bg-slate-50/50 focus:outline-none h-20 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 rounded-xl text-sm transition-all shadow-sm active:scale-95"
                >
                  Сохранить транзакцию
                </button>
              </form>
            ) : (
              <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center space-y-2">
                <span className="text-rose-500 block text-lg">🔒</span>
                <span className="text-xs font-bold text-slate-700 block uppercase tracking-wide">Добавление выплат заблокировано</span>
                <p className="text-[11px] text-slate-400">
                  Владелица ограничила возможность внесения и редактирования выплат и штрафов в настройках безопасности.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* List history logs panel */}
        <div className="lg:col-span-2">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <h3 className="text-md font-semibold text-slate-800 font-sans">История выплат и начислений сотрудников</h3>
              
              <div className="flex flex-wrap gap-1 p-0.5 bg-slate-100 rounded-xl" id="salaries-history-tabs">
                <button
                  type="button"
                  onClick={() => setHistoryTab("day")}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                    historyTab === "day" ? "bg-white text-slate-800 shadow-sm font-semibold" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Конкретный день
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTab("range")}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                    historyTab === "range" ? "bg-white text-slate-800 shadow-sm font-semibold" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Диапазон дат
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTab("month")}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                    historyTab === "month" ? "bg-white text-slate-800 shadow-sm font-semibold" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Выбранный месяц
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTab("all")}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors ${
                    historyTab === "all" ? "bg-white text-slate-800 shadow-sm font-semibold" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Все время
                </button>
              </div>
            </div>

            {/* Filter controls sub-tabs details */}
            {historyTab === "day" && (
              <div className="flex items-center gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600 font-medium">Фильтр на день:</span>
                <input
                  type="date"
                  value={filterDay}
                  onChange={(e) => setFilterDay(e.target.value)}
                  className="border border-slate-200 rounded px-2 py-1 bg-white"
                />
              </div>
            )}

            {historyTab === "range" && (
              <div className="flex flex-wrap items-center gap-2.5 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                <Calendar className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600">С даты:</span>
                <input
                  type="date"
                  value={filterStart}
                  onChange={(e) => setFilterStart(e.target.value)}
                  className="border border-slate-200 rounded px-2 py-1 bg-white"
                />
                <span className="text-slate-500">По:</span>
                <input
                  type="date"
                  value={filterEnd}
                  onChange={(e) => setFilterEnd(e.target.value)}
                  className="border border-slate-200 rounded px-2 py-1 bg-white"
                />
              </div>
            )}

            {historyTab === "month" && (
              <div className="bg-slate-50 p-3 rounded-xl text-xs text-slate-500 font-medium font-sans">
                Документируемые транзакции за текущий месяц: <strong className="text-slate-700">{new Date().toLocaleString("ru-RU", { month: "long", year: "numeric" })}</strong>.
              </div>
            )}

            {/* Render items list */}
            {filteredTxs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-100">
                Записей транзакций за выбранный интервал нет
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredTxs.map(tx => {
                  const emp = employees.find(e => e.id === tx.masterId);
                  const isNegative = tx.type === "штраф" || tx.type === "вычет аренды";

                  return (
                    <div key={tx.id} className="flex justify-between items-center border border-slate-100 rounded-xl p-3.5 hover:border-slate-200 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{emp?.name || "Неизвестно"}</span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            tx.type === "выплата" || tx.type === "аванс" 
                              ? "bg-blue-50 text-blue-700"
                              : tx.type === "штраф"
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700"
                          }`}>
                            {tx.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{tx.comment}</p>
                        <p className="text-[10px] text-slate-400 font-sans font-medium">{new Date(tx.date).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`text-md font-bold font-mono ${isNegative ? "text-red-500" : "text-emerald-500"}`}>
                          {isNegative ? "-" : "+"}{tx.amount} ₽
                        </span>
                        {allowPayouts && (
                          confirmDeleteTxId === tx.id ? (
                            <button
                              onClick={() => {
                                handleDeleteTransaction(tx.id);
                                setConfirmDeleteTxId(null);
                              }}
                              className="text-red-700 bg-red-50 border border-red-200 py-1 px-2 rounded hover:bg-red-100 transition-colors flex items-center justify-center animate-pulse gap-1 text-[10px] font-bold"
                              title="Подтвердить удаление"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-600" />
                              Точно?
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setConfirmDeleteTxId(tx.id);
                                setTimeout(() => {
                                  setConfirmDeleteTxId(current => current === tx.id ? null : current);
                                }, 4000);
                              }}
                              className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-slate-50 transition-colors"
                              title="Удалить"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
