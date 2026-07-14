import React, { useState, useMemo, useEffect } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from "recharts";
import { 
  Employee, 
  Position, 
  SettingsRule, 
  RawMaterialPrices, 
  AdminDayOfWeekRate, 
  AdminDaysRateRule,
  ExtraTransaction, 
  Visit, 
  SolariumSession,
  AdminShift,
  MasterTransaction,
  GiftCertificate,
  DebtRecord,
} from "../types";
import {
  getActiveSettingsForDate,
  getSolariumMinuteRate,
  getSolariumSessionAcquiring,
  getSolariumSessionTotal,
} from "../utils/settingsUtils";
import { getThemeChartColors, useThemeMode } from "../utils/theme";
import { 
  Users, 
  TrendingUp, 
  Sliders, 
  Plus, 
  Edit3, 
  Trash2, 
  Phone, 
  MapPin, 
  Calendar, 
  RussianRuble, 
  Save, 
  Check, 
  ArrowDownRight, 
  ArrowUpRight,
  Sparkles,
  Percent,
  ShieldCheck,
  BarChart3,
  Layers,
  Lock,
  Clock,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Eye,
  EyeOff,
  FileText,
  Printer
} from "lucide-react";
import { ResetAppMode } from "../utils/resetAppData";
import { computeDayAcquiring, computePeriodAcquiring, computePeriodCashlessGross } from "../utils/dailyFinanceUtils";
import { AutoBackupInterval, usesPreferredBackupTime } from "../utils/backupData";
import { AUTO_BACKUP_INTERVAL_OPTIONS } from "../utils/autoBackupRunner";
import { hashPassword, verifyPassword } from "../utils/ownerPassword";
import {
  exportAdminShiftsCsv,
  exportMasterPayrollCsv,
  exportMonthlyRevenueCsv,
  exportPeriodFinanceCsv,
} from "../utils/csvExport";
import { APP_VERSION } from "../data/appVersion";
import { computeMonthMetrics, formatDelta } from "../utils/periodMetrics";
import { showAppAlert } from "../utils/appDialog";
import { restoreAppFocus } from "../utils/restoreAppFocus";

interface OwnerSectionProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  settingsRules: SettingsRule[];
  setSettingsRules: React.Dispatch<React.SetStateAction<SettingsRule[]>>;
  materialPrices: RawMaterialPrices;
  setMaterialPrices: React.Dispatch<React.SetStateAction<RawMaterialPrices>>;
  materialPackaging: Record<string, { price: number; volume: number }>;
  setMaterialPackaging: React.Dispatch<React.SetStateAction<Record<string, { price: number; volume: number }>>>;
  materialConsumptions: any;
  setMaterialConsumptions: any;
  adminDaysRates: AdminDayOfWeekRate;
  setAdminDaysRates: React.Dispatch<React.SetStateAction<AdminDayOfWeekRate>>;
  adminDaysRatesRules?: AdminDaysRateRule[];
  setAdminDaysRatesRules?: React.Dispatch<React.SetStateAction<AdminDaysRateRule[]>>;
  extraTransactions: ExtraTransaction[];
  setExtraTransactions: React.Dispatch<React.SetStateAction<ExtraTransaction[]>>;
  visits: Visit[];
  solariumSessions: SolariumSession[];
  adminShifts: AdminShift[];
  masterTransactions: MasterTransaction[];
  giftCertificates: GiftCertificate[];
  debtRecords: DebtRecord[];
  activeSettingsIdx: number;
  showDeletedVisits: boolean;
  setShowDeletedVisits: (val: boolean) => void;
  allowDeleteVisits: boolean;
  setAllowDeleteVisits: (val: boolean) => void;
  allowDeleteCertificates: boolean;
  setAllowDeleteCertificates: (val: boolean) => void;
  allowDeleteDebts: boolean;
  setAllowDeleteDebts: (val: boolean) => void;
  showVisitChangeHistory: boolean;
  setShowVisitChangeHistory: (val: boolean) => void;
  allowMasterPayouts: boolean;
  setAllowMasterPayouts: (val: boolean) => void;
  allowAdminShiftEdits: boolean;
  setAllowAdminShiftEdits: (val: boolean) => void;
  hideFormulaCalculations?: boolean;
  setHideFormulaCalculations?: (val: boolean) => void;
  ownerPassword?: string;
  setOwnerPassword?: (val: string) => void;
  keepOwnerUnlocked?: boolean;
  setKeepOwnerUnlocked?: (val: boolean) => void;
  autoLockDuration?: number;
  setAutoLockDuration?: (val: number) => void;
  autoBackupEnabled?: boolean;
  setAutoBackupEnabled?: (val: boolean) => void;
  autoBackupInterval?: AutoBackupInterval;
  setAutoBackupInterval?: (val: AutoBackupInterval) => void;
  autoBackupPreferredTime?: string;
  setAutoBackupPreferredTime?: (val: string) => void;
  lastAutoBackupDate?: string | null;
  onLock?: () => void;
  onResetApp?: (mode: "preserveTariffs" | "full") => void;
}

export default function OwnerSection({
  employees,
  setEmployees,
  settingsRules,
  setSettingsRules,
  materialPrices,
  setMaterialPrices,
  materialPackaging,
  setMaterialPackaging,
  materialConsumptions,
  setMaterialConsumptions,
  adminDaysRates,
  setAdminDaysRates,
  adminDaysRatesRules = [],
  setAdminDaysRatesRules = () => {},
  extraTransactions,
  setExtraTransactions,
  visits,
  solariumSessions,
  adminShifts,
  masterTransactions,
  giftCertificates,
  debtRecords,
  showDeletedVisits,
  setShowDeletedVisits,
  allowDeleteVisits,
  setAllowDeleteVisits,
  allowDeleteCertificates,
  setAllowDeleteCertificates,
  allowDeleteDebts,
  setAllowDeleteDebts,
  showVisitChangeHistory,
  setShowVisitChangeHistory,
  allowMasterPayouts,
  setAllowMasterPayouts,
  allowAdminShiftEdits,
  setAllowAdminShiftEdits,
  hideFormulaCalculations = false,
  setHideFormulaCalculations = () => {},
  ownerPassword = "",
  setOwnerPassword = () => {},
  keepOwnerUnlocked = false,
  setKeepOwnerUnlocked = () => {},
  autoLockDuration = 5,
  setAutoLockDuration = () => {},
  autoBackupEnabled = true,
  setAutoBackupEnabled = () => {},
  autoBackupInterval = "weekly",
  setAutoBackupInterval = () => {},
  autoBackupPreferredTime = "18:00",
  setAutoBackupPreferredTime = () => {},
  lastAutoBackupDate = null,
  onLock = () => {},
  onResetApp,
}: OwnerSectionProps) {
  // Navigation inside owner section (various views: employees | finance | settings | stats | security)
  const [activeSubTab, setActiveSubTab] = useState<"employees" | "finance" | "settings" | "stats" | "security">("employees");
  const [confirmResetMode, setConfirmResetMode] = useState<ResetAppMode | null>(null);
  const [resetConfirmWord, setResetConfirmWord] = useState("");
  const themeMode = useThemeMode();
  const chartColors = useMemo(() => getThemeChartColors(), [themeMode]);

  const startReset = (mode: ResetAppMode) => {
    setConfirmResetMode(mode);
    setResetConfirmWord("");
  };

  const cancelReset = () => {
    setConfirmResetMode(null);
    setResetConfirmWord("");
  };

  const confirmReset = (mode: ResetAppMode) => {
    if (resetConfirmWord !== "СБРОС") {
      showAppAlert("Для подтверждения введите слово СБРОС (заглавными буквами).");
      return;
    }
    setConfirmResetMode(null);
    setResetConfirmWord("");
    onResetApp?.(mode);
  };

  // Collapsed states for blocks
  const [collapsedBlocks, setCollapsedBlocks] = useState<Record<string, boolean>>({});

  // Customizable Dashboard Block Config (visibilities & sequence)
  const [dashboardBlocks, setDashboardBlocks] = useState<{ id: string; name: string; visible: boolean }[]>(() => {
    const saved = localStorage.getItem("eva_style_dashboard_blocks_v2");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const validIds = ["revenue-chart", "master-revenue", "pnl-summary", "add-outgoing", "recorded-bills-list", "detailed-daily-ledger", "detailed-yearly-ledger"];
        // Verify we have all required elements
        const hasAll = validIds.every(id => parsed.some((b: any) => b.id === id));
        if (hasAll && parsed.length === validIds.length) {
          return parsed;
        }
      } catch (e) {
        // use default
      }
    }
    return [
      { id: "revenue-chart", name: "Динамика выручки по дням (Диаграмма)", visible: true },
      { id: "master-revenue", name: "Распределение выручки между мастерами (Диаграмма)", visible: true },
      { id: "pnl-summary", name: "Сводные финансовые показатели P&L", visible: true },
      { id: "add-outgoing", name: "Внесение накладных расходов (Интерфейс)", visible: true },
      { id: "recorded-bills-list", name: "Перечень накладных расходов за месяц (Список)", visible: true },
      { id: "detailed-daily-ledger", name: "Детальный суточный журнал учета (Таблица)", visible: true },
      { id: "detailed-yearly-ledger", name: "Детальный сводный отчет за год (Таблица)", visible: true }
    ];
  });

  useEffect(() => {
    localStorage.setItem("eva_style_dashboard_blocks_v2", JSON.stringify(dashboardBlocks));
  }, [dashboardBlocks]);

  const toggleBlock = (blockId: string) => {
    setCollapsedBlocks(prev => ({
      ...prev,
      [blockId]: !prev[blockId]
    }));
  };

  const moveDashboardBlock = (index: number, direction: "up" | "down") => {
    const newBlocks = [...dashboardBlocks];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newBlocks.length) return;
    
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIndex];
    newBlocks[targetIndex] = temp;
    
    setDashboardBlocks(newBlocks);
  };

  const toggleDashboardBlockVisibility = (id: string) => {
    setDashboardBlocks(prev => prev.map(b => b.id === id ? { ...b, visible: !b.visible } : b));
  };

  const getBlockStyle = (id: string): React.CSSProperties => {
    const idx = dashboardBlocks.findIndex((b) => b.id === id);
    const block = dashboardBlocks[idx];
    if (!block || !block.visible) {
      return { display: "none" };
    }
    return { order: idx + 1 };
  };

  // Local state for password forms in Settings Panel
  const [secNewPassword, setSecNewPassword] = useState("");
  const [secConfirmPassword, setSecConfirmPassword] = useState("");
  const [secCurrentPassword, setSecCurrentPassword] = useState("");
  const [secError, setSecError] = useState("");
  const [secSuccess, setSecSuccess] = useState("");

  // --- SUB-PANEL 4: DETAILED INDIVIDUAL EMPLOYEE STATS OVER CUSTOM DATES ---
  const [statsEmployeeId, setStatsEmployeeId] = useState("");
  const [statsStartDate, setStatsStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // Default to start of current month
    return d.toISOString().split("T")[0];
  });
  const [statsEndDate, setStatsEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const monthsRussian = [
    "ЯНВАРЬ", "ФЕВРАЛЬ", "МАРТ", "АПРЕЛЬ", "МАЙ", "ИЮНЬ",
    "ИЮЛЬ", "АВГУСТ", "СЕНТЯБРЬ", "ОКТЯБРЬ", "НОЯБРЬ", "ДЕКАБРЬ"
  ];

  // --- SUB-PANEL 1: EMPLOYEES CRUD ---
  const [empName, setEmpName] = useState("");
  const [empPosition, setEmpPosition] = useState<Position>(Position.Hairdresser);
  const [empPct, setEmpPct] = useState<number>(50);
  const [empRent, setEmpRent] = useState<number>(0);
  const [empPhone, setEmpPhone] = useState("");
  const [empBirthday, setEmpBirthday] = useState("");
  const [classicalManicurePct, setClassicalManicurePct] = useState<number>(80);
  const [apparatusManicurePct, setApparatusManicurePct] = useState<number>(75);
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [confirmDeleteEmpId, setConfirmDeleteEmpId] = useState<string | null>(null);

  const handleAddOrEditEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName) return;

    if (editingEmpId) {
      // Edit
      setEmployees(prev => prev.map(emp => {
        if (emp.id === editingEmpId) {
          const updated: Employee = {
            ...emp,
            name: empName,
            position: empPosition,
            percentage: empPct,
            dailyRent: empRent,
            phone: empPhone || "Телефон не указан",
            birthday: empBirthday || undefined
          };
          if (empPosition === Position.Manicurist) {
            updated.manicuresPercentage = {
              classical: classicalManicurePct,
              apparatus: apparatusManicurePct
            };
          }
          return updated;
        }
        return emp;
      }));
      setEditingEmpId(null);
    } else {
      // Create new card
      const newEmp: Employee = {
        id: "emp-" + Date.now(),
        name: empName,
        position: empPosition,
        percentage: empPosition === Position.Owner ? 100 : empPct,
        dailyRent: empRent,
        phone: empPhone || "Телефон не указан",
        birthday: empBirthday || undefined
      };

      if (empPosition === Position.Manicurist) {
        newEmp.manicuresPercentage = {
          classical: classicalManicurePct,
          apparatus: apparatusManicurePct
        };
      }

      setEmployees(prev => [...prev, newEmp]);
    }

    // Reset Form
    setEmpName("");
    setEmpPosition(Position.Hairdresser);
    setEmpPct(50);
    setEmpRent(0);
    setEmpPhone("");
    setEmpBirthday("");
    setClassicalManicurePct(80);
    setApparatusManicurePct(75);
  };

  const startEditEmployee = (emp: Employee) => {
    setEditingEmpId(emp.id);
    setEmpName(emp.name);
    setEmpPosition(emp.position);
    setEmpPct(emp.percentage);
    setEmpRent(emp.dailyRent);
    setEmpPhone(emp.phone === "Телефон не указан" ? "" : emp.phone);
    setEmpBirthday(emp.birthday || "");
    if (emp.manicuresPercentage) {
      setClassicalManicurePct(emp.manicuresPercentage.classical);
      setApparatusManicurePct(emp.manicuresPercentage.apparatus);
    }
  };

  const deleteEmployee = (empId: string) => {
    setEmployees(prev => prev.filter(e => e.id !== empId));
  };


  // --- SUB-PANEL 2: FINANCE REPORT COMPREHENSIVE ---
  // Financial metrics calculated for current month / cumulative
  const [finMonth, setFinMonth] = useState<number>(new Date().getMonth());
  const [finYear, setFinYear] = useState<number>(new Date().getFullYear());
  const [finPeriodType, setFinPeriodType] = useState<"today" | "month" | "custom" | "day">("today");

  const [finSelectedDay, setFinSelectedDay] = useState<string>(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split("T")[0];
  });

  const [finStartDate, setFinStartDate] = useState<string>(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split("T")[0];
  });

  const [finEndDate, setFinEndDate] = useState<string>(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().split("T")[0];
  });

  // Month-wide operational expense inputs
  const [billAmount, setBillAmount] = useState<number | "">("");
  const [billComment, setBillComment] = useState("");
  const [billCategory, setBillCategory] = useState("Свет");
  const [billDate, setBillDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });

  const monthPrefix = useMemo(() => `${finYear}-${(finMonth + 1).toString().padStart(2, "0")}`, [finYear, finMonth]);

  const isDateInPeriod = useMemo(() => {
    return (dateStr: string) => {
      if (finPeriodType === "today") {
        const today = new Date();
        const offset = today.getTimezoneOffset();
        const localDate = new Date(today.getTime() - (offset * 60 * 1000));
        const todayStr = localDate.toISOString().split("T")[0];
        return dateStr === todayStr;
      }
      if (finPeriodType === "day") {
        return dateStr === finSelectedDay;
      }
      if (finPeriodType === "month") {
        const prefix = `${finYear}-${(finMonth + 1).toString().padStart(2, "0")}`;
        return dateStr.startsWith(prefix);
      }
      if (finPeriodType === "custom") {
        return dateStr >= finStartDate && dateStr <= finEndDate;
      }
      return false;
    };
  }, [finPeriodType, finSelectedDay, finStartDate, finEndDate, finMonth, finYear]);

  const datesList = useMemo(() => {
    if (finPeriodType === "today") {
      const today = new Date();
      const offset = today.getTimezoneOffset();
      const localDate = new Date(today.getTime() - (offset * 60 * 1000));
      return [localDate.toISOString().split("T")[0]];
    }
    if (finPeriodType === "day") {
      return [finSelectedDay];
    }
    if (finPeriodType === "month") {
      const daysInMonth = new Date(finYear, finMonth + 1, 0).getDate();
      const dates = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dayPad = d.toString().padStart(2, "0");
        dates.push(`${finYear}-${(finMonth + 1).toString().padStart(2, "0")}-${dayPad}`);
      }
      return dates;
    }
    if (finPeriodType === "custom") {
      const start = new Date(finStartDate);
      const end = new Date(finEndDate);
      const dates = [];
      const current = new Date(start);
      let protectCount = 0;
      while (current <= end && protectCount < 366) {
        protectCount++;
        const offset = current.getTimezoneOffset();
        const localDate = new Date(current.getTime() - (offset * 60 * 1000));
        dates.push(localDate.toISOString().split("T")[0]);
        current.setDate(current.getDate() + 1);
      }
      return dates;
    }
    return [];
  }, [finPeriodType, finSelectedDay, finStartDate, finEndDate, finYear, finMonth]);

  const currentMonthVisits = useMemo(() => visits.filter(v => isDateInPeriod(v.date) && !v.isDeleted), [visits, isDateInPeriod]);
  const currentMonthSolarium = useMemo(() => solariumSessions.filter(s => isDateInPeriod(s.date)), [solariumSessions, isDateInPeriod]);
  const currentMonthExtraTxs = useMemo(() => extraTransactions.filter(t => isDateInPeriod(t.date) && !t.isDeleted), [extraTransactions, isDateInPeriod]);
  const currentMonthShifts = useMemo(() => adminShifts.filter(s => isDateInPeriod(s.date)), [adminShifts, isDateInPeriod]);

  const todaySettings = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, "0")}-${today.getDate().toString().padStart(2, "0")}`;
    return getActiveSettingsForDate(settingsRules, todayStr);
  }, [settingsRules]);

  const selectedPeriodTitle = useMemo(() => {
    if (finPeriodType === "today") {
      return `за сегодня, ${new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}`;
    }
    if (finPeriodType === "day") {
      try {
        const dObj = new Date(finSelectedDay);
        return `на день ${dObj.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })}`;
      } catch (e) {
        return `на выбранный день`;
      }
    }
    if (finPeriodType === "month") {
      return `${monthsRussian[finMonth]} ${finYear}`;
    }
    if (finPeriodType === "custom") {
      try {
        const start = new Date(finStartDate).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
        const end = new Date(finEndDate).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
        return `период ${start} — ${end}`;
      } catch (e) {
        return `выбранный период`;
      }
    }
    return "";
  }, [finPeriodType, finSelectedDay, finStartDate, finEndDate, finMonth, finYear, monthsRussian]);

  const financials = useMemo(() => {
    // Beauty work revenues (начисление: все визиты по workCost, независимо от способа оплаты)
    const totalVisitsWorkRevenues = currentMonthVisits.reduce((sum, v) => sum + v.workCost, 0);
    const totalVisitsMaterialsRevenues = currentMonthVisits.reduce((sum, v) => sum + v.materialsCost, 0);

    const totalSalonMaterialsRevenue = currentMonthVisits.reduce((sum, v) => {
      if (v.salonMaterialsCost !== undefined) return sum + v.salonMaterialsCost;
      return sum + ((v as any).isSalonMaterials !== false ? v.materialsCost : 0);
    }, 0);

    const totalSolariumMinutes = currentMonthSolarium.reduce((sum, s) => sum + s.minutes, 0);
    const totalSolariumMinsRevenues = currentMonthSolarium.reduce(
      (sum, s) => sum + s.minutes * getSolariumMinuteRate(s, settingsRules),
      0
    );
    const totalSolariumCreamRevenues = currentMonthSolarium.reduce((sum, s) => sum + s.creamPrice, 0);
    const totalSolariumStickersRevenues = currentMonthSolarium.reduce((sum, s) => sum + s.stickersPrice, 0);
    const totalSolariumGross = totalSolariumMinsRevenues + totalSolariumCreamRevenues + totalSolariumStickersRevenues;

    const totalSolariumMaterialsRevenue = totalSolariumCreamRevenues + totalSolariumStickersRevenues;
    const totalMaterialsRevenue = totalSalonMaterialsRevenue + totalSolariumMaterialsRevenue;

    const grossRevenue = totalVisitsWorkRevenues + totalVisitsMaterialsRevenues + totalSolariumGross;

    // OUTGOINGS:
    // Admin shift spends total
    const adminsMonthlyWages = currentMonthShifts.reduce((sum, s) => sum + s.rate, 0);

    // Master shares earned
    const mastersPortionsWages = currentMonthVisits.reduce((sum, visit) => {
      const emp = employees.find(e => e.id === visit.masterId);
      if (!emp) return sum;
      let pctVal = emp.percentage;
      if (emp.position === Position.Manicurist && emp.manicuresPercentage) {
        if (visit.manicureType === "classical") {
          pctVal = emp.manicuresPercentage.classical;
        } else if (visit.manicureType === "apparatus") {
          pctVal = emp.manicuresPercentage.apparatus;
        }
      }
      const pct = pctVal / 100;
      return sum + (visit.workCost * pct);
    }, 0);

    // Salon materials consumed
    const salonMaterialsConsumptionVal = currentMonthVisits.reduce((sum, v) => {
      if (v.salonMaterialsCost !== undefined) return sum + v.salonMaterialsCost;
      return sum + ((v as any).isSalonMaterials !== false ? v.materialsCost : 0);
    }, 0);

    // Utilities / shopping other operating minus costs
    const billExpenses = currentMonthExtraTxs
      .filter(t => t.type === "минус")
      .reduce((sum, t) => sum + t.amount, 0);

    // Buying materials expense category
    const materialsPurchaseExpenses = currentMonthExtraTxs
      .filter(t => t.type === "минус" && (t.category === "Закупка товара" || t.category === "Закупка материалов" || t.comment?.toLowerCase().includes("материал") || t.comment?.toLowerCase().includes("закупка")))
      .reduce((sum, t) => sum + t.amount, 0);

    // Other utilities / bill expenses excluding materials purchase
    const otherBillExpenses = currentMonthExtraTxs
      .filter(t => t.type === "минус" && !(t.category === "Закупка товара" || t.category === "Закупка материалов" || t.comment?.toLowerCase().includes("материал") || t.comment?.toLowerCase().includes("закупка")))
      .reduce((sum, t) => sum + t.amount, 0);

    const totalAcquiringCommissionPaid = computePeriodAcquiring(
      datesList,
      visits,
      solariumSessions,
      giftCertificates,
      debtRecords,
      settingsRules
    );

    // Gross Revenue of Services & Minutes (Excluding Salon & Solarium Materials)
    const grossRevenueExcludingMaterials = totalVisitsWorkRevenues + totalSolariumMinsRevenues;

    // Expenses of Services & Minutes (Excluding Material Purchases)
    const totalExpensesExcludingMaterials = adminsMonthlyWages + mastersPortionsWages + totalAcquiringCommissionPaid + otherBillExpenses;

    // Net Earnings of Services (Materials are tracked in a separate section and do not count towards clean profit)
    const netEarnings = grossRevenueExcludingMaterials - totalExpensesExcludingMaterials;

    const totalExpenses = adminsMonthlyWages + mastersPortionsWages + totalAcquiringCommissionPaid + billExpenses;

    // Cashless metrics
    const cashlessGrossRevenue = computePeriodCashlessGross(
      datesList,
      visits,
      solariumSessions,
      giftCertificates,
      debtRecords,
      settingsRules
    );
    const cashlessAcquiringCommissions = totalAcquiringCommissionPaid;
    const cashlessNetRevenue = cashlessGrossRevenue - cashlessAcquiringCommissions;

    return {
      totalVisitsWorkRevenues,
      totalVisitsMaterialsRevenues,
      totalSalonMaterialsRevenue,
      totalSolariumMinutes,
      totalSolariumMinsRevenues,
      totalSolariumCreamRevenues,
      totalSolariumStickersRevenues,
      totalSolariumMaterialsRevenue,
      totalMaterialsRevenue,
      materialsPurchaseExpenses,
      otherBillExpenses,
      totalSolariumGross,
      grossRevenue,
      adminsMonthlyWages,
      mastersPortionsWages,
      salonMaterialsConsumptionVal,
      totalAcquiringCommissionPaid,
      billExpenses,
      totalExpenses,
      netEarnings,
      cashlessGrossRevenue,
      cashlessAcquiringCommissions,
      cashlessNetRevenue,
      commissionPct: todaySettings.acquiringCommission,
      grossRevenueExcludingMaterials,
      totalExpensesExcludingMaterials
    };
  }, [currentMonthVisits, currentMonthSolarium, currentMonthExtraTxs, currentMonthShifts, employees, settingsRules, todaySettings, datesList, visits, solariumSessions, giftCertificates, debtRecords]);

  const {
    totalVisitsWorkRevenues,
    totalVisitsMaterialsRevenues,
    totalSalonMaterialsRevenue,
    totalSolariumMinutes,
    totalSolariumMinsRevenues,
    totalSolariumCreamRevenues,
    totalSolariumStickersRevenues,
    totalSolariumMaterialsRevenue,
    totalMaterialsRevenue,
    materialsPurchaseExpenses,
    otherBillExpenses,
    totalSolariumGross,
    grossRevenue,
    adminsMonthlyWages,
    mastersPortionsWages,
    salonMaterialsConsumptionVal,
    totalAcquiringCommissionPaid,
    billExpenses,
    totalExpenses,
    netEarnings,
    cashlessGrossRevenue,
    cashlessAcquiringCommissions,
    cashlessNetRevenue,
    commissionPct,
    grossRevenueExcludingMaterials,
    totalExpensesExcludingMaterials
  } = financials;

  const periodComparison = useMemo(() => {
    if (finPeriodType !== "month") return null;
    const currentPrefix = `${finYear}-${(finMonth + 1).toString().padStart(2, "0")}-`;
    let prevMonth = finMonth - 1;
    let prevYear = finYear;
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear -= 1;
    }
    const prevPrefix = `${prevYear}-${(prevMonth + 1).toString().padStart(2, "0")}-`;
    const current = computeMonthMetrics(
      currentPrefix,
      visits,
      solariumSessions,
      adminShifts,
      extraTransactions,
      employees,
      settingsRules,
      giftCertificates,
      debtRecords
    );
    const previous = computeMonthMetrics(
      prevPrefix,
      visits,
      solariumSessions,
      adminShifts,
      extraTransactions,
      employees,
      settingsRules,
      giftCertificates,
      debtRecords
    );
    return { current, previous, prevLabel: monthsRussian[prevMonth], currLabel: monthsRussian[finMonth] };
  }, [
    finPeriodType,
    finYear,
    finMonth,
    visits,
    solariumSessions,
    adminShifts,
    extraTransactions,
    employees,
    settingsRules,
    giftCertificates,
    debtRecords,
    monthsRussian,
  ]);

  const handleGeneratePdfReport = () => {
    // 1. Create a quiet hidden iframe
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    // 2. Prepare HTML output
    const masterRows = masterRevenueData.length === 0 
      ? '<tr><td colspan="6" style="text-align: center; color: #94a3b8;">Нет данных по мастерам за выбранный период</td></tr>'
      : masterRevenueData.map(m => `
        <tr>
          <td><strong style="color: #0f172a;">${m.name}</strong></td>
          <td><span style="font-size: 11px; font-weight: 600; padding: 2px 6px; border-radius: 4px; background: #fee2e2; color: #991b1b;">${m.position}</span></td>
          <td style="text-align: right; font-family: monospace; font-weight: 600;">${m.count}</td>
          <td style="text-align: right; font-family: monospace; font-weight: 600;">${m.work.toLocaleString()} ₽</td>
          <td style="text-align: right; font-family: monospace; font-weight: 600; color: #4f46e5;">${m.materials.toLocaleString()} ₽</td>
          <td style="text-align: right; font-family: monospace; font-weight: 700; color: #1e293b;">${m.total.toLocaleString()} ₽</td>
        </tr>
      `).join('');

    const isPositive = totalMaterialsRevenue - materialsPurchaseExpenses >= 0;
    const balanceSign = isPositive ? "+" : "";
    const balanceColor = isPositive ? "#10b981" : "#ef4444";

    const reportHtml = `
      <!DOCTYPE html>
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
            <div>ПЕРИОД: <strong style="color: #0f172a;">${selectedPeriodTitle.toUpperCase()}</strong></div>
            <div>СГЕНЕРИРОВАНО: <strong>${new Date().toLocaleString("ru-RU")}</strong></div>
          </div>
        </div>

        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-label">Общая выручка за период (услуги + солярий)</div>
            <div class="stat-val primary">+${grossRevenue.toLocaleString()} ₽</div>
          </div>
          <div class="stat-card">
            <div class="stat-label flex items-center">Финансовый результат по материалам</div>
            <div class="stat-val" style="color: ${balanceColor};">
              ${balanceSign}${(totalMaterialsRevenue - materialsPurchaseExpenses).toLocaleString()} ₽
            </div>
          </div>
        </div>

        <div class="section-title">1. Анализ доходности услуг и оборудования</div>
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
              <td class="number-cell">+${totalVisitsWorkRevenues.toLocaleString()} ₽</td>
            </tr>
            <tr>
              <td><strong>Поминутные сеансы солярия</strong></td>
              <td>Общее время: ${totalSolariumMinutes} минут работы ламп</td>
              <td class="number-cell">+${totalSolariumMinsRevenues.toLocaleString()} ₽</td>
            </tr>
            <tr>
              <td><strong>Косметические средства солярия</strong></td>
              <td>Продажи кремов, стикини, шапочек и комплектов</td>
              <td class="number-cell">+${totalSolariumMaterialsRevenue.toLocaleString()} ₽</td>
            </tr>
            <tr class="totals-row">
              <td><strong>СУММАРНАЯ ВЫРУЧКА</strong></td>
              <td>Все услуги и солярий (без учета расходных материалов визитов)</td>
              <td class="number-cell"><strong>+${grossRevenue.toLocaleString()} ₽</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">2. Движение и расход материалов по складу</div>
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
              <td class="number-cell" style="color: #4f46e5;">+${totalSalonMaterialsRevenue.toLocaleString()} ₽</td>
            </tr>
            <tr>
              <td><strong>Материалы солярия (крема, стикини)</strong></td>
              <td>Косметические средства солярия, выданные в сессиях</td>
              <td class="number-cell" style="color: #4f46e5;">+${totalSolariumMaterialsRevenue.toLocaleString()} ₽</td>
            </tr>
            <tr>
              <td><strong>Инвестиции в закупки расходников</strong></td>
              <td>Регистрация накладных расходов по закупке товаров/материалов</td>
              <td class="number-cell" style="color: #ef4444;">-${materialsPurchaseExpenses.toLocaleString()} ₽</td>
            </tr>
            <tr class="totals-row">
              <td><strong>РЕЗУЛЬТАТ ПО МАТЕРИАЛАМ (Профицит / Дефицит склада)</strong></td>
              <td>Потребление за вычетом прямых складских закупок за период</td>
              <td class="number-cell" style="color: ${balanceColor};">
                <strong>${balanceSign}${(totalMaterialsRevenue - materialsPurchaseExpenses).toLocaleString()} ₽</strong>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">3. Расходы и чистый результат</div>
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
              <td class="number-cell" style="color: #ef4444;">-${adminsMonthlyWages.toLocaleString()} ₽</td>
            </tr>
            <tr>
              <td><strong>Доли мастеров</strong></td>
              <td>Начисленные проценты от работы</td>
              <td class="number-cell" style="color: #ef4444;">-${Math.round(mastersPortionsWages).toLocaleString()} ₽</td>
            </tr>
            <tr>
              <td><strong>Эквайринг</strong></td>
              <td>Комиссия банка по безналу</td>
              <td class="number-cell" style="color: #ef4444;">-${totalAcquiringCommissionPaid.toLocaleString()} ₽</td>
            </tr>
            <tr>
              <td><strong>Прочие расходы</strong></td>
              <td>Операционные минусы без закупки материалов</td>
              <td class="number-cell" style="color: #ef4444;">-${otherBillExpenses.toLocaleString()} ₽</td>
            </tr>
            <tr class="totals-row">
              <td><strong>ЧИСТЫЙ РЕЗУЛЬТАТ</strong></td>
              <td>Выручка услуг − расходы (материалы отдельно)</td>
              <td class="number-cell"><strong>${netEarnings.toLocaleString()} ₽</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">4. Информация по мастерам и их потреблению</div>
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
        </table>

        <div class="footer-signature">
          <div>
            Система учета ИС «Ева-стиль» v${APP_VERSION}<br>
            Конфиденциальный документ для внутреннего использования владелицей.
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div>Подпись владелицы салона</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 600);
          }
        </script>
      </body>
      </html>
    `;

    // 3. Populate iframe document & perform print
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(reportHtml);
      doc.close();
    }

    // 4. Clean up after print menu dialog finishes/cancels to avoid DOM bloat
    setTimeout(() => {
      document.body.removeChild(iframe);
      restoreAppFocus();
    }, 5000);
  };

  const handleExportPeriodReport = () => {
    exportPeriodFinanceCsv(
      {
        periodTitle: selectedPeriodTitle,
        grossRevenueExcludingMaterials,
        totalVisitsWorkRevenues,
        totalSolariumMinsRevenues,
        totalSalonMaterialsRevenue,
        totalSolariumMaterialsRevenue,
        materialsPurchaseExpenses,
        adminsMonthlyWages,
        mastersPortionsWages,
        totalAcquiringCommissionPaid,
        otherBillExpenses,
        totalExpensesExcludingMaterials,
        netEarnings,
        cashlessGrossRevenue,
        cashlessAcquiringCommissions,
        cashlessNetRevenue,
      },
      masterRevenueData.map((m) => ({
        name: m.name,
        position: m.position,
        count: m.count,
        work: m.work,
        materials: m.materials,
        total: m.total,
      }))
    );
    handleGeneratePdfReport();
  };

  const masterRevenueData = useMemo(() => {
    const revenueByMaster: Record<string, { work: number; materials: number; total: number; count: number }> = {};
    
    employees.forEach(emp => {
      if (emp.position !== Position.Administrator && emp.position !== Position.Owner) {
        revenueByMaster[emp.id] = { work: 0, materials: 0, total: 0, count: 0 };
      }
    });
    
    currentMonthVisits.forEach(v => {
      if (v.isDeleted) return;
      if (!revenueByMaster[v.masterId]) {
        revenueByMaster[v.masterId] = { work: 0, materials: 0, total: 0, count: 0 };
      }
      revenueByMaster[v.masterId].work += v.workCost;
      revenueByMaster[v.masterId].materials += v.materialsCost;
      revenueByMaster[v.masterId].total += (v.workCost + v.materialsCost);
      revenueByMaster[v.masterId].count += 1;
    });

    const data = Object.keys(revenueByMaster).map(id => {
      const emp = employees.find(e => e.id === id);
      const name = emp ? emp.name : `Мастер #${id.slice(-4)}`;
      const position = emp ? emp.position : "Мастер";
      return {
        id,
        name,
        position,
        work: revenueByMaster[id].work,
        materials: revenueByMaster[id].materials,
        total: revenueByMaster[id].total,
        count: revenueByMaster[id].count
      };
    })
    .filter(item => item.total > 0)
    .sort((a, b) => b.total - a.total);

    const totalServiceRevenue = data.reduce((sum, item) => sum + item.total, 0);

    return data.map(item => ({
      ...item,
      percentage: totalServiceRevenue > 0 ? Math.round((item.total / totalServiceRevenue) * 100) : 0
    }));
  }, [currentMonthVisits, employees]);

  const dailyChartData = useMemo(() => {
    const data = [];
    for (const dateStr of datesList) {
      const dayVisits = currentMonthVisits.filter(v => v.date === dateStr);
      const daySolarium = currentMonthSolarium.filter(s => s.date === dateStr);
      
      const beautyRevenue = dayVisits.reduce((sum, v) => sum + v.workCost, 0);
      const daySolCream = daySolarium.reduce((sum, s) => sum + s.creamPrice, 0);
      const daySolStickers = daySolarium.reduce((sum, s) => sum + s.stickersPrice, 0);
      const materialsRevenue = dayVisits.reduce((sum, v) => {
        if (v.salonMaterialsCost !== undefined) return sum + v.salonMaterialsCost;
        return sum + ((v as any).isSalonMaterials !== false ? v.materialsCost : 0);
      }, 0) + daySolCream + daySolStickers;
      const solariumRevenue = daySolarium.reduce(
        (sum, s) => sum + s.minutes * getSolariumMinuteRate(s, settingsRules),
        0
      );
      
      const totalRevenue = beautyRevenue + materialsRevenue + solariumRevenue;

      let label = dateStr;
      try {
        const parts = dateStr.split("-");
        if (parts.length === 3) {
          const dObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          if (finPeriodType === "month") {
            label = `${dObj.getDate()}`;
          } else if (finPeriodType === "today" || finPeriodType === "day") {
            label = dObj.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
          } else {
            label = dObj.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
          }
        }
      } catch (e) {}
      
      data.push({
        day: label,
        "Услуги": beautyRevenue,
        "Материалы": materialsRevenue,
        "Солярий": solariumRevenue,
        "Выручка": totalRevenue,
      });
    }
    return data;
  }, [currentMonthVisits, currentMonthSolarium, datesList, settingsRules, finPeriodType]);

  const chartSummaries = useMemo(() => {
    if (dailyChartData.length === 0) return { bestDayStr: "—", avgDayStr: "0 ₽" };
    
    let maxRev = 0;
    let maxDay = "";
    let totalComputed = 0;
    
    dailyChartData.forEach(item => {
      totalComputed += item.Выручка;
      if (item.Выручка > maxRev) {
        maxRev = item.Выручка;
        maxDay = item.day;
      }
    });
    
    const avg = totalComputed / dailyChartData.length;
    
    return {
      bestDayStr: maxRev > 0 ? `День ${maxDay} (${maxRev.toLocaleString()} ₽)` : "—",
      avgDayStr: `${Math.round(avg).toLocaleString()} ₽`
    };
  }, [dailyChartData]);

  const dailyLedgerList = useMemo(() => {
    const list = [];
    
    for (const dateStr of datesList) {
      const parts = dateStr.split("-");
      if (parts.length !== 3) continue;
      const day = Number(parts[2]);
      
      const dayVisits = visits.filter(v => v.date === dateStr && !v.isDeleted);
      const daySolarium = solariumSessions.filter(s => s.date === dateStr);
      const dayShifts = adminShifts.filter(s => s.date === dateStr);
      const dayOtherTxs = extraTransactions.filter(t => t.date === dateStr && !t.isDeleted);
      
      // Revenues
      const dayWorkRevenue = dayVisits.reduce((sum, v) => sum + v.workCost, 0);
      const daySolCream = daySolarium.reduce((sum, s) => sum + s.creamPrice, 0);
      const daySolStickers = daySolarium.reduce((sum, s) => sum + s.stickersPrice, 0);
      const dayMatsRevenue = dayVisits.reduce((sum, v) => {
        if (v.salonMaterialsCost !== undefined) return sum + v.salonMaterialsCost;
        return sum + ((v as any).isSalonMaterials !== false ? v.materialsCost : 0);
      }, 0) + daySolCream + daySolStickers;
      const daySolGross = daySolarium.reduce(
        (sum, s) => sum + s.minutes * getSolariumMinuteRate(s, settingsRules),
        0
      );
      
      const dayGross = dayWorkRevenue + daySolGross; // Excludes Materials
      
      // Personnel & Operational Expenses
      const dayAdminWages = dayShifts.reduce((sum, s) => sum + s.rate, 0);
      const dayMasterWages = dayVisits.reduce((sum, visit) => {
        const emp = employees.find(e => e.id === visit.masterId);
        if (!emp) return sum;
        let pctVal = emp.percentage;
        if (emp.position === Position.Manicurist && emp.manicuresPercentage) {
          if (visit.manicureType === "classical") {
            pctVal = emp.manicuresPercentage.classical;
          } else if (visit.manicureType === "apparatus") {
            pctVal = emp.manicuresPercentage.apparatus;
          }
        }
        return sum + (visit.workCost * (pctVal / 100));
      }, 0);
      const dayAcquiring = computeDayAcquiring(
        dateStr,
        visits,
        solariumSessions,
        giftCertificates,
        debtRecords,
        settingsRules
      );

      const dayMaterialsPurchaseExpenses = dayOtherTxs
        .filter(t => t.type === "минус" && (t.category === "Закупка товара" || t.category === "Закупка материалов" || t.comment?.toLowerCase().includes("материал") || t.comment?.toLowerCase().includes("закупка")))
        .reduce((sum, t) => sum + t.amount, 0);

      const dayOtherBillExpense = dayOtherTxs
        .filter(t => t.type === "минус" && !(t.category === "Закупка товара" || t.category === "Закупка материалов" || t.comment?.toLowerCase().includes("материал") || t.comment?.toLowerCase().includes("закупка")))
        .reduce((sum, t) => sum + t.amount, 0);
        
      const dayExpenses = dayAdminWages + dayMasterWages + dayAcquiring + dayOtherBillExpense; // Excludes Material Purchases
      const dayNet = dayGross - dayExpenses; // Excludes Materials
      
      // Get weekday:
      let weekday = "";
      const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const days = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
      weekday = days[dateObj.getDay()];
      
      const isWeekend = weekday === "Сб" || weekday === "Вс";
      const hasActivity = dayGross > 0 || dayExpenses > 0 || dayMatsRevenue > 0 || dayMaterialsPurchaseExpenses > 0;
      
      list.push({
        dateStr,
        day,
        weekday,
        isWeekend,
        hasActivity,
        dayWorkRevenue,
        dayMatsRevenue,
        daySolGross,
        dayGross,
        dayAdminWages,
        dayMasterWages,
        dayAcquiring,
        dayMaterialsPurchaseExpenses,
        dayOtherBillExpense,
        dayExpenses,
        dayNet
      });
    }
    return list;
  }, [visits, solariumSessions, adminShifts, extraTransactions, employees, datesList, settingsRules, giftCertificates, debtRecords]);

  const yearlyLedgerList = useMemo(() => {
    const list = [];
    
    for (let month = 0; month < 12; month++) {
      const monthPrefix = `${finYear}-${(month + 1).toString().padStart(2, "0")}-`;
      
      const monthVisits = visits.filter(v => v.date.startsWith(monthPrefix) && !v.isDeleted);
      const monthSolarium = solariumSessions.filter(s => s.date.startsWith(monthPrefix));
      const monthShifts = adminShifts.filter(s => s.date.startsWith(monthPrefix));
      const monthOtherTxs = extraTransactions.filter(t => t.date.startsWith(monthPrefix) && !t.isDeleted);
      
      // Revenues
      const monthWorkRevenue = monthVisits.reduce((sum, v) => sum + v.workCost, 0);
      const monthSolCream = monthSolarium.reduce((sum, s) => sum + s.creamPrice, 0);
      const monthSolStickers = monthSolarium.reduce((sum, s) => sum + s.stickersPrice, 0);
      const monthMatsRevenue = monthVisits.reduce((sum, v) => {
        if (v.salonMaterialsCost !== undefined) return sum + v.salonMaterialsCost;
        return sum + ((v as any).isSalonMaterials !== false ? v.materialsCost : 0);
      }, 0) + monthSolCream + monthSolStickers;
      const monthSolGross = monthSolarium.reduce(
        (sum, s) => sum + s.minutes * getSolariumMinuteRate(s, settingsRules),
        0
      );
      const monthGross = monthWorkRevenue + monthSolGross; // Excludes Materials
      
      // Expenses
      const monthAdminWages = monthShifts.reduce((sum, s) => sum + s.rate, 0);
      const monthMasterWages = monthVisits.reduce((sum, visit) => {
        const emp = employees.find(e => e.id === visit.masterId);
        if (!emp) return sum;
        let pctVal = emp.percentage;
        if (emp.position === Position.Manicurist && emp.manicuresPercentage) {
          if (visit.manicureType === "classical") {
            pctVal = emp.manicuresPercentage.classical;
          } else if (visit.manicureType === "apparatus") {
            pctVal = emp.manicuresPercentage.apparatus;
          }
        }
        return sum + (visit.workCost * (pctVal / 100));
      }, 0);
      const monthAcquiring = (() => {
        let sum = 0;
        const daysInMonth = new Date(finYear, month + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${finYear}-${(month + 1).toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
          sum += computeDayAcquiring(
            dateStr,
            visits,
            solariumSessions,
            giftCertificates,
            debtRecords,
            settingsRules
          );
        }
        return Math.round(sum * 100) / 100;
      })();

      const monthMaterialsPurchaseExpenses = monthOtherTxs
        .filter(t => t.type === "минус" && (t.category === "Закупка товара" || t.category === "Закупка материалов" || t.comment?.toLowerCase().includes("материал") || t.comment?.toLowerCase().includes("закупка")))
        .reduce((sum, t) => sum + t.amount, 0);

      const monthOtherBillExpense = monthOtherTxs
        .filter(t => t.type === "минус" && !(t.category === "Закупка товара" || t.category === "Закупка материалов" || t.comment?.toLowerCase().includes("материал") || t.comment?.toLowerCase().includes("закупка")))
        .reduce((sum, t) => sum + t.amount, 0);
        
      const monthExpenses = monthAdminWages + monthMasterWages + monthAcquiring + monthOtherBillExpense; // Excludes Material Purchases
      const monthNet = monthGross - monthExpenses; // Excludes Materials
      
      const hasActivity = monthGross > 0 || monthExpenses > 0 || monthMatsRevenue > 0 || monthMaterialsPurchaseExpenses > 0;
      
      list.push({
        month,
        monthName: monthsRussian[month],
        hasActivity,
        monthWorkRevenue,
        monthMatsRevenue,
        monthSolGross,
        monthGross,
        monthAdminWages,
        monthMasterWages,
        monthAcquiring,
        monthMaterialsPurchaseExpenses,
        monthOtherBillExpense,
        monthExpenses,
        monthNet
      });
    }
    return list;
  }, [visits, solariumSessions, adminShifts, extraTransactions, employees, finYear, settingsRules, giftCertificates, debtRecords]);

  const handleAddBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (billAmount === "" || !billComment) return;

    const op: ExtraTransaction = {
      id: "tx-" + Date.now(),
      date: billDate,
      type: "минус",
      amount: Number(billAmount),
      comment: billComment,
      category: billCategory
    };

    setExtraTransactions(prev => [...prev, op]);
    setBillAmount("");
    setBillComment("");
  };

  const handleRemoveBill = (id: string) => {
    setExtraTransactions(prev => prev.filter(t => t.id !== id));
  };


  // --- SUB-PANEL 3: TARIFFS & DAYS OF WEEK RATES ---
  const [effectiveDate, setEffectiveDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [tempAcq, setTempAcq] = useState(3.5);
  const [tempSolMinute, setTempSolMinute] = useState(30);

  const handleSaveTariffRule = (e: React.FormEvent) => {
    e.preventDefault();
    const newRule: SettingsRule = {
      id: "rule-" + Date.now(),
      effectiveDate,
      acquiringCommission: tempAcq,
      adminBaseRate: 0, // removed from ui as per request
      solariumMinuteRate: tempSolMinute
    };

    setSettingsRules(prev => [newRule, ...prev]);
    showAppAlert("Новые тарифные правила зафиксированы в истории!");
  };

  const handleRemoveTariffRule = (id: string) => {
    if (settingsRules.length <= 1) {
      showAppAlert("Нельзя удалить последнее правило тарифов!");
      return;
    }
    setSettingsRules(prev => prev.filter(r => r.id !== id));
  };

  // Rule builder state for Date-based administrator daily rate modifications
  const [adminRuleEffectiveDate, setAdminRuleEffectiveDate] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [adminRuleMon, setAdminRuleMon] = useState(adminDaysRates.monday || 1500);
  const [adminRuleTue, setAdminRuleTue] = useState(adminDaysRates.tuesday || 1500);
  const [adminRuleWed, setAdminRuleWed] = useState(adminDaysRates.wednesday || 1500);
  const [adminRuleThu, setAdminRuleThu] = useState(adminDaysRates.thursday || 1500);
  const [adminRuleFri, setAdminRuleFri] = useState(adminDaysRates.friday || 1500);
  const [adminRuleSat, setAdminRuleSat] = useState(adminDaysRates.saturday || 1800);
  const [adminRuleSun, setAdminRuleSun] = useState(adminDaysRates.sunday || 1800);

  const handleSaveAdminDaysRule = (e: React.FormEvent) => {
    e.preventDefault();
    const newRule: AdminDaysRateRule = {
      id: "admin-days-rule-" + Date.now(),
      effectiveDate: adminRuleEffectiveDate,
      monday: adminRuleMon,
      tuesday: adminRuleTue,
      wednesday: adminRuleWed,
      thursday: adminRuleThu,
      friday: adminRuleFri,
      saturday: adminRuleSat,
      sunday: adminRuleSun
    };
    setAdminDaysRatesRules(prev => [newRule, ...prev]);
    showAppAlert("Новое правило ставок администратора сохранено!");
  };

  const handleRemoveAdminDaysRule = (id: string) => {
    if (adminDaysRatesRules.length <= 1) {
      showAppAlert("Нельзя удалить последнее правило ставок!");
      return;
    }
    setAdminDaysRatesRules(prev => prev.filter(r => r.id !== id));
  };

  // Raw Material prices live state edit
  const updateMaterialPrice = (key: keyof RawMaterialPrices, value: number) => {
    setMaterialPrices(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Day of week rate editor
  const handleUpdateDayRate = (day: keyof AdminDayOfWeekRate, value: number) => {
    setAdminDaysRates(prev => ({
      ...prev,
      [day]: value
    }));
  };

  const getActiveAdminRuleForToday = () => {
    const localNow = new Date();
    const offset = localNow.getTimezoneOffset();
    const localDate = new Date(localNow.getTime() - (offset * 60 * 1000));
    const todayStr = localDate.toISOString().split("T")[0];

    if (adminDaysRatesRules && adminDaysRatesRules.length > 0) {
      const sorted = [...adminDaysRatesRules].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
      const activeRule = sorted.find(r => r.effectiveDate <= todayStr);
      if (activeRule) return activeRule;
      return sorted[sorted.length - 1];
    }
    return {
      id: "default",
      effectiveDate: "По умолчанию",
      monday: adminDaysRates.monday,
      tuesday: adminDaysRates.tuesday,
      wednesday: adminDaysRates.wednesday,
      thursday: adminDaysRates.thursday,
      friday: adminDaysRates.friday,
      saturday: adminDaysRates.saturday,
      sunday: adminDaysRates.sunday
    };
  };

  return (
    <div className="space-y-8" id="owner-panel-view">
      {/* Title & Navigation Menu Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 tracking-tight font-sans">Кабинет владельца салона</h2>
            <p className="text-sm text-slate-500 font-sans">Осуществляйте strategic-контроль за персоналом, тарифами, сырьем и прибыльностью салона</p>
          </div>
          {onLock && (
            <button
              type="button"
              onClick={onLock}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-xl text-xs font-bold transition-colors cursor-pointer self-start sm:self-center"
              title="Заблокировать кабинет"
              id="lock-owner-cabin-btn"
            >
              <Lock className="h-4 w-4" />
              Запереть кабинет
            </button>
          )}
        </div>

        {/* Quadruple sub-tabs triggers positioned full-width below the title */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex bg-slate-100 p-1.5 rounded-2xl font-sans gap-1.5" id="owner-sub-tabs">
          <button
            onClick={() => setActiveSubTab("employees")}
            className={`text-xs font-semibold px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 lg:flex-1 ${
              activeSubTab === "employees" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Users className="h-4 w-4" />
            Сотрудники
          </button>
          <button
            onClick={() => setActiveSubTab("finance")}
            className={`text-xs font-semibold px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 lg:flex-1 ${
              activeSubTab === "finance" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            Сводный отчет
          </button>
          <button
            onClick={() => setActiveSubTab("stats")}
            className={`text-xs font-semibold px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 lg:flex-1 ${
              activeSubTab === "stats" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800 font-bold"
            }`}
          >
            <BarChart3 className="h-4 w-4 text-emerald-600" />
            Статистика сотрудников
          </button>
          <button
            onClick={() => setActiveSubTab("settings")}
            className={`text-xs font-semibold px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 lg:flex-1 ${
              activeSubTab === "settings" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Sliders className="h-4 w-4" />
            Настройки и тарифы
          </button>
          <button
            onClick={() => setActiveSubTab("security")}
            className={`text-xs font-semibold px-4 py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 lg:flex-1 ${
              activeSubTab === "security" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
            }`}
            id="owner-subtab-security"
          >
            <ShieldCheck className="h-4 w-4 text-rose-500" />
            Безопасность
          </button>
        </div>
      </div>

      {/* --- PANEL 1: EMPLOYEES CRUD --- */}
      {activeSubTab === "employees" && (
        <div className="space-y-8" id="subpanel-employees">
          {/* New employee card form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => toggleBlock("add-employee")}>
              <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                <Plus className="h-5 w-5 text-emerald-600" />
                {editingEmpId ? "Редактировать карточку сотрудника" : "Новая карточка сотрудника"}
              </h3>
              <button type="button" className="text-slate-400 hover:text-slate-600 focus:outline-none">
                {collapsedBlocks["add-employee"] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
            </div>

            {!collapsedBlocks["add-employee"] && (
              <form onSubmit={handleAddOrEditEmployee} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end font-sans">
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">ФИО / Имя</label>
                  <input
                    type="text"
                    placeholder="Епифанцева В.А."
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50/50 focus:outline-none"
                    required
                  />
                </div>

                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Должность</label>
                  <select
                    value={empPosition}
                    onChange={(e) => setEmpPosition(e.target.value as Position)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50/50 focus:outline-none"
                  >
                    <option value={Position.Owner}>{Position.Owner}</option>
                    <option value={Position.Hairdresser}>{Position.Hairdresser}</option>
                    <option value={Position.Manicurist}>{Position.Manicurist}</option>
                    <option value={Position.Lashmaker}>{Position.Lashmaker}</option>
                    <option value={Position.Visagiste}>{Position.Visagiste}</option>
                    <option value={Position.Administrator}>{Position.Administrator}</option>
                  </select>
                </div>

                {/* Work split % */}
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Личный процент (%)</label>
                  <input
                    type="number"
                    value={empPosition === Position.Owner ? 100 : empPct}
                    onChange={(e) => setEmpPct(Number(e.target.value) || 0)}
                    disabled={empPosition === Position.Owner}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50/50 focus:outline-none font-mono text-slate-700"
                    min="0"
                    max="100"
                  />
                </div>

                {/* Rent per work shift */}
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Плата за аренду/день (Р)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={empRent}
                    onChange={(e) => setEmpRent(Number(e.target.value) || 0)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50/50 focus:outline-none font-mono text-slate-700"
                    min="0"
                  />
                </div>

                {/* Phone contact */}
                <div className="md:col-span-1 border-b border-transparent">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Телефон</label>
                  <input
                    type="text"
                    placeholder="+7..."
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50/50 focus:outline-none font-mono"
                  />
                </div>

                {/* Birthday date */}
                <div className="md:col-span-1">
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Дата рождения</label>
                  <input
                    type="text"
                    placeholder="ДД.ММ.ГГГГ"
                    value={empBirthday}
                    onChange={(e) => setEmpBirthday(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50/50 focus:outline-none font-mono text-slate-700"
                  />
                </div>

                {/* Manicurist specific classical/apparatus percentages toggle */}
                {empPosition === Position.Manicurist && (
                  <div className="md:col-span-6 bg-purple-50/50 border border-purple-100 p-4 rounded-xl grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Специальный % за классический маникюр</label>
                      <input
                        type="number"
                        value={classicalManicurePct}
                        onChange={(e) => setClassicalManicurePct(Number(e.target.value) || 0)}
                        className="w-full border border-slate-200 text-xs px-3 py-1.5 bg-white rounded-lg font-mono"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Специальный % за аппаратный маникюр</label>
                      <input
                        type="number"
                        value={apparatusManicurePct}
                        onChange={(e) => setApparatusManicurePct(Number(e.target.value) || 0)}
                        className="w-full border border-slate-200 text-xs px-3 py-1.5 bg-white rounded-lg font-mono"
                        min="0"
                      />
                    </div>
                  </div>
                )}

                <div className="md:col-span-6 flex justify-end gap-2 pt-2">
                  {editingEmpId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEmpId(null);
                        setEmpName("");
                      }}
                      className="bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-bold"
                    >
                      Отмена
                    </button>
                  )}
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-6 rounded-xl shadow-sm hover:shadow-md transition-shadow active:scale-95"
                  >
                    {editingEmpId ? "Сохранить изменения" : "Добавить сотрудника"}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Cards Deck of Employees matches Screenshot 6 */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => toggleBlock("employees-list")}>
              <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                Действующий штат сотрудников ({employees.length})
              </h3>
              <button type="button" className="text-slate-400 hover:text-slate-600 focus:outline-none">
                {collapsedBlocks["employees-list"] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
            </div>

            {!collapsedBlocks["employees-list"] && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="employees-grid">
            {employees.map(emp => {
              const matchesOwner = emp.position === Position.Owner;
              const matchesManicurist = emp.position === Position.Manicurist;

              return (
                <div key={emp.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-xs transition-shadow relative">
                  <div>
                    {/* Header profile row */}
                    <div className="flex items-start gap-3">
                      <div className={`h-11 w-11 rounded-full flex items-center justify-center font-bold text-xs ${
                        matchesOwner 
                          ? "bg-blue-50 text-blue-700" 
                          : matchesManicurist 
                          ? "bg-orange-50 text-orange-600" 
                          : emp.position === Position.Administrator 
                          ? "bg-purple-50 text-purple-600 font-bold"
                          : "bg-emerald-50 text-emerald-700"
                      }`}>
                        {emp.name.split(" ").map(n => n[0]).join("")}
                      </div>

                      <div className="space-y-0.5">
                        <h4 className="text-sm font-bold text-slate-800">{emp.name}</h4>
                        <span className="text-[10px] bg-slate-50 text-slate-500 font-semibold uppercase px-2 py-0.5 rounded-full border border-slate-100">
                          {emp.position}
                        </span>
                      </div>
                    </div>

                    {/* Metrics content */}
                    <div className="my-4 pt-3 border-t border-slate-50/80 space-y-2 text-xs text-slate-600">
                      
                      {matchesManicurist && emp.manicuresPercentage ? (
                        <div className="bg-slate-50/50 p-2 rounded-lg space-y-1 my-1 text-[11px]">
                          <div className="flex justify-between">
                            <span>Классический:</span>
                            <span className="font-bold text-purple-700">{emp.manicuresPercentage.classical}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Аппаратный:</span>
                            <span className="font-bold text-purple-700">{emp.manicuresPercentage.apparatus}%</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Процент работы:</span>
                          <span className="font-bold font-mono text-slate-800">{emp.percentage}%</span>
                        </div>
                      )}

                      <div className="flex justify-between">
                        <span className="text-slate-400">Собств. Аренда:</span>
                        <span className="font-bold font-mono text-slate-800">{emp.dailyRent} ₽/день</span>
                      </div>

                      <div className="flex flex-col gap-1 mt-1 pt-1 border-t border-slate-50 text-[11px] text-slate-400 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3" />
                          <span>{emp.phone}</span>
                        </div>
                        {emp.birthday && (
                          <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                            <Calendar className="h-3 w-3 text-rose-500" />
                            <span>ДР: {emp.birthday}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons footer */}
                  <div className="flex justify-end gap-1.5 border-t border-slate-50 pt-3 mt-1 text-slate-400">
                    <button
                      onClick={() => startEditEmployee(emp)}
                      className="p-1.5 hover:text-blue-500 rounded hover:bg-blue-50 transition-colors"
                      title="Редактировать сотрудника"
                    >
                      <Trash2 className="h-4 w-4 hidden" /> {/* Hidden code structure match */}
                      <Edit3 className="h-4 w-4" />
                    </button>
                    {confirmDeleteEmpId === emp.id ? (
                      <button
                        onClick={() => {
                          deleteEmployee(emp.id);
                          setConfirmDeleteEmpId(null);
                        }}
                        className="p-1 px-2 bg-red-50 text-red-700 border border-red-200 rounded text-[10px] font-bold animate-pulse hover:bg-red-100 transition-colors flex items-center gap-1"
                        title="Подтвердить удаление"
                      >
                        <Trash2 className="h-3 w-3 text-red-600" />
                        Удалить?
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setConfirmDeleteEmpId(emp.id);
                          setTimeout(() => {
                            setConfirmDeleteEmpId(current => current === emp.id ? null : current);
                          }, 4000);
                        }}
                        className="p-1.5 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                        title="Удалить карточку"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
              </div>
            )}
          </div>
        </div>
      )}


      {/* --- PANEL 2: FINANCE REPORT COMPREHENSIVE --- */}
      {activeSubTab === "finance" && (
        <div className="flex flex-col gap-8" id="subpanel-finance">
          {/* Period selector for comprehensive report */}
          <div className="bg-white p-6 rounded-2xl border border-slate-150 shadow-sm space-y-4 font-sans max-w-3xl mx-auto w-full" style={{ order: -10 }} id="finance-period-selector-card">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <span className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="h-4 w-4 text-indigo-600" />
                Период сводного отчета:
              </span>
              
              {/* Segmented controls */}
              <div className="flex flex-wrap p-1 bg-slate-100 rounded-xl gap-1">
                <button
                  type="button"
                  onClick={() => setFinPeriodType("today")}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                    finPeriodType === "today" ? "bg-white text-indigo-600 shadow-sm font-bold border border-slate-250/20" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Сегодня
                </button>
                <button
                  type="button"
                  onClick={() => setFinPeriodType("month")}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                    finPeriodType === "month" ? "bg-white text-indigo-600 shadow-sm font-bold border border-slate-250/20" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Месяц
                </button>
                <button
                  type="button"
                  onClick={() => setFinPeriodType("day")}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                    finPeriodType === "day" ? "bg-white text-indigo-600 shadow-sm font-bold border border-slate-250/20" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  День
                </button>
                <button
                  type="button"
                  onClick={() => setFinPeriodType("custom")}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                    finPeriodType === "custom" ? "bg-white text-indigo-600 shadow-sm font-bold border border-slate-250/20" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Произвольный период
                </button>
              </div>
            </div>

            {/* Dynamic controls according to selected option */}
            <div className="pt-2 border-t border-slate-50 flex flex-col md:flex-row justify-center items-center gap-4 text-xs">
              {finPeriodType === "today" && (
                <div className="text-slate-550 font-medium flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse animate-duration-1000" />
                  Выбран текущий день (сегодня): 
                  <strong className="text-slate-800 font-bold bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg">
                    {new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric", weekday: "long" })}
                  </strong>
                </div>
              )}

              {finPeriodType === "month" && (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-slate-500 font-medium whitespace-nowrap">Выберите месяц:</span>
                  <select
                    value={finMonth}
                    onChange={(e) => setFinMonth(Number(e.target.value))}
                    className="border border-slate-250 rounded-xl px-3 py-1.5 text-xs bg-slate-50 font-semibold text-slate-800"
                  >
                    {["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"].map((m, idx) => (
                      <option key={idx} value={idx}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={finYear}
                    onChange={(e) => setFinYear(Number(e.target.value))}
                    className="border border-slate-250 rounded-xl px-3 py-1.5 text-xs bg-slate-50 font-semibold text-slate-800 font-mono"
                  >
                    {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              )}

              {finPeriodType === "day" && (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-slate-500 font-medium whitespace-nowrap">Выберите конкретный день:</span>
                  <input
                    type="date"
                    value={finSelectedDay}
                    onChange={(e) => setFinSelectedDay(e.target.value)}
                    className="border border-slate-250 rounded-xl px-3 py-1 text-xs bg-slate-50 font-semibold text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {finSelectedDay && (() => {
                    try {
                      const dObj = new Date(finSelectedDay);
                      if (!isNaN(dObj.getTime())) {
                        return (
                          <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md font-bold">
                            {dObj.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })}
                          </span>
                        );
                      }
                    } catch(e) {}
                    return null;
                  })()}
                </div>
              )}

              {finPeriodType === "custom" && (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">С:</span>
                    <input
                      type="date"
                      value={finStartDate}
                      onChange={(e) => setFinStartDate(e.target.value)}
                      className="border border-slate-250 rounded-xl px-3 py-1 text-xs bg-slate-50 font-semibold text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">По:</span>
                    <input
                      type="date"
                      value={finEndDate}
                      onChange={(e) => setFinEndDate(e.target.value)}
                      className="border border-slate-250 rounded-xl px-3 py-1 text-xs bg-slate-50 font-semibold text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Экспорт за выбранный период: CSV + PDF одной кнопкой */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2 justify-center sm:justify-end">
              <button
                type="button"
                onClick={handleExportPeriodReport}
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all active:scale-[0.98] border border-indigo-500 font-sans cursor-pointer"
                id="generate-finance-period-export-btn"
              >
                <FileText className="h-4 w-4" />
                <span>Экспорт CSV + PDF за период</span>
              </button>
              <button
                type="button"
                onClick={handleGeneratePdfReport}
                className="w-full sm:w-auto bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-200 font-sans cursor-pointer"
                id="generate-finance-pdf-btn"
                title="Только печать / сохранить как PDF"
              >
                <Printer className="h-4 w-4" />
                <span>Только PDF</span>
              </button>
            </div>
          </div>

          {/* Визуализация финансовой отчетности за текущий/выбранный месяц */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6" id="owner-revenue-chart-card" style={getBlockStyle("revenue-chart")}>
            <div className="flex items-center justify-between cursor-pointer select-none pb-2 border-b border-slate-50" onClick={() => toggleBlock("revenue-chart")}>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-600 animate-pulse" />
                <h3 className="text-md font-bold text-slate-800">
                  Анализ динамики выручки по дням ({selectedPeriodTitle})
                </h3>
              </div>
              <button type="button" className="text-slate-400 hover:text-slate-600 focus:outline-none">
                {collapsedBlocks["revenue-chart"] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
            </div>

            {!collapsedBlocks["revenue-chart"] && (
              <>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
                  <p className="text-xs text-slate-400 font-sans">
                    Интерактивный график посуточного распределения доходов от услуг мастеров, материалов и сеансов солярия
                  </p>
                  
                  <div className="grid grid-cols-2 md:flex gap-4 font-sans">
                    <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100/50">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Средняя за день</span>
                      <span className="text-xs font-mono font-black text-slate-700">{chartSummaries.avgDayStr}</span>
                    </div>
                    <div className="bg-emerald-50/50 px-4 py-2 rounded-xl border border-emerald-100/40">
                      <span className="text-[10px] text-emerald-600/80 font-bold uppercase tracking-wider block">Пиковая выручка</span>
                      <span className="text-xs font-mono font-black text-emerald-700 text-left">{chartSummaries.bestDayStr}</span>
                    </div>
                  </div>
                </div>

                <div className="h-[360px] w-full mt-4 font-sans min-w-0" id="revenue-chart-viewport">
                  <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart
                      data={dailyChartData}
                      margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                      <XAxis 
                        dataKey="day" 
                        tickLine={false}
                        axisLine={{ stroke: chartColors.grid }}
                        tick={{ fontSize: 10, fill: chartColors.tick, fontWeight: 'bold' }} 
                      />
                      <YAxis 
                        tickLine={false}
                        axisLine={{ stroke: chartColors.grid }}
                        tickFormatter={(v) => `${v.toLocaleString()} ₽`}
                        tick={{ fontSize: 10, fill: chartColors.tick }} 
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: chartColors.tooltipBg, 
                          color: chartColors.tooltipText,
                          borderRadius: '16px', 
                          border: `1px solid ${chartColors.tooltipBorder}`,
                          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                          fontSize: '11px',
                          padding: '12px'
                        }}
                        formatter={(value: any, name: any) => [`${value.toLocaleString()} ₽`, name]}
                        labelFormatter={(label) => `Число месяца: ${label}`}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={36} 
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: '11px', paddingTop: '10px', color: chartColors.tick }}
                      />
                      
                      {/* Beauty work and materials and solarium stacked bars */}
                      <Bar dataKey="Услуги" stackId="revenue" fill="#6366f1" radius={[0, 0, 0, 0]} barSize={14} name="Услуги красоты" />
                      <Bar dataKey="Материалы" stackId="revenue" fill="#ec4899" radius={[0, 0, 0, 0]} barSize={14} name="Материалы визитов" />
                      <Bar dataKey="Солярий" stackId="revenue" fill="#eab308" radius={[3, 3, 0, 0]} barSize={14} name="Сеансы солярия" />
                      
                      {/* Dynamic outline trend area */}
                      <Area 
                        type="monotone" 
                        dataKey="Выручка" 
                        stroke="#10b981" 
                        strokeWidth={2.5} 
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                        name="Общая выручка"
                        activeDot={{ r: 6 }}
                        dot={{ stroke: '#10b981', strokeWidth: 1, r: 2, fill: chartColors.dotFill }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>

          {/* Распределение выручки между мастерами — новый визуальный блок */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6" id="owner-master-revenue-distribution-card" style={getBlockStyle("master-revenue")}>
            <div className="flex items-center justify-between cursor-pointer select-none pb-2 border-b border-slate-50" onClick={() => toggleBlock("master-revenue")}>
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600 animate-pulse" />
                <h3 className="text-md font-bold text-slate-800 font-sans">
                  Распределение выручки между мастерами ({selectedPeriodTitle})
                </h3>
              </div>
              <button type="button" className="text-slate-400 hover:text-slate-600 focus:outline-none">
                {collapsedBlocks["master-revenue"] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
            </div>

            {!collapsedBlocks["master-revenue"] && (
              <>
                <p className="text-xs text-slate-400 font-sans">
                  Визуализация долей выручки от услуг и материалов, сгенерированных каждым мастером за выбранный период (всего за услуги: {(masterRevenueData.reduce((s, i) => s + i.total, 0)).toLocaleString()} ₽)
                </p>

                {masterRevenueData.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs font-sans">
                    Нет завершенных визитов или данных по мастерам за выбранный месяц
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    {/* Donut Chart Section */}
                    <div className="md:col-span-5 flex justify-center">
                      <div className="h-[220px] w-[240px] relative flex justify-center items-center">
                        <RechartsPieChart width={240} height={220}>
                          <Pie
                            data={masterRevenueData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="total"
                          >
                            {masterRevenueData.map((entry, index) => {
                              const MASTER_COLORS = [
                                "#6366f1", // indigo
                                "#ec4899", // pink
                                "#f59e0b", // amber
                                "#14b8a6", // teal
                                "#10b981", // emerald
                                "#f97316", // orange
                                "#06b6d4", // cyan
                                "#d946ef", // fuchsia
                                "#8b5cf6", // violet
                                "#ef4444", // red
                              ];
                              return (
                                <Cell key={`cell-${index}`} fill={MASTER_COLORS[index % MASTER_COLORS.length]} />
                              );
                            })}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: chartColors.tooltipBg,
                              color: chartColors.tooltipText,
                              borderRadius: '12px',
                              border: `1px solid ${chartColors.tooltipBorder}`,
                              fontSize: '11px',
                              padding: '8px'
                            }}
                            formatter={(value: any, name: any) => [`${value.toLocaleString()} ₽`, name]}
                          />
                        </RechartsPieChart>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-[9px] text-slate-400 uppercase tracking-widest font-sans font-black">Всего услуг</span>
                          <span className="text-md font-black text-slate-800 font-mono font-bold">
                            {(masterRevenueData.reduce((s, i) => s + i.total, 0)).toLocaleString()} ₽
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Rankings and info cards list */}
                    <div className="md:col-span-7 space-y-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-100 font-sans">
                        Рейтинг и доли выработки мастеров
                      </h4>
                      <div className="space-y-3 font-sans">
                        {masterRevenueData.map((item, idx) => {
                          const MASTER_COLORS = [
                            "#6366f1", // indigo
                            "#ec4899", // pink
                            "#f59e0b", // amber
                            "#14b8a6", // teal
                            "#10b981", // emerald
                            "#f97316", // orange
                            "#06b6d4", // cyan
                            "#d946ef", // fuchsia
                            "#8b5cf6", // violet
                            "#ef4444", // red
                          ];
                          const barColor = MASTER_COLORS[idx % MASTER_COLORS.length];
                          return (
                            <div key={item.id} className="space-y-1">
                              <div className="flex items-center justify-between text-xs font-semibold">
                                <div className="flex items-center gap-1.5">
                                  <span 
                                    className="h-2.5 w-2.5 rounded-full inline-block" 
                                    style={{ backgroundColor: barColor }} 
                                  />
                                  <span className="text-slate-800 font-bold">{item.name}</span>
                                  <span className="text-[9px] text-slate-400 font-bold bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md">
                                    {item.position}
                                  </span>
                                </div>
                                <div className="text-right font-mono text-slate-600">
                                  <span className="text-slate-800 font-black">{item.total.toLocaleString()} ₽</span>
                                  <span className="text-slate-400 ml-1.5 font-bold">({item.percentage}%)</span>
                                </div>
                              </div>
                              
                              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden flex">
                                <div 
                                  className="h-full rounded-full transition-all duration-500" 
                                  style={{ 
                                    width: `${item.percentage}%`, 
                                    backgroundColor: barColor 
                                  }} 
                                />
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pl-4">
                                <span>Визитов: <strong className="text-slate-600 font-bold">{item.count}</strong></span>
                                <span className="flex gap-2">
                                  <span>Работа: <strong className="text-slate-600 font-bold">{item.work.toLocaleString()} ₽</strong></span>
                                  <span>Расходники: <strong className="text-indigo-600 font-bold">{item.materials.toLocaleString()} ₽</strong></span>
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Инструменты (всегда сверху после периода) + настраиваемые блоки P&L / расходов */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-3" style={{ order: 0 }} id="owner-csv-export-card">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-rose-500" />
                  Дополнительный экспорт (CSV)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Сводный отчёт за выбранный выше период — кнопка «Экспорт CSV + PDF за период». Ниже — отдельные выгрузки по месяцу/году.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      exportMasterPayrollCsv(
                        employees,
                        visits,
                        masterTransactions,
                        monthPrefix
                      )
                    }
                    className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900"
                  >
                    Ведомость мастеров
                  </button>
                  <button
                    type="button"
                    onClick={() => exportAdminShiftsCsv(employees, adminShifts, monthPrefix)}
                    className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-200"
                  >
                    Табель админов
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      exportMonthlyRevenueCsv(finYear, visits, solariumSessions, settingsRules)
                    }
                    className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-100 rounded-lg hover:bg-rose-100"
                  >
                    Выручка за {finYear}
                  </button>
                </div>
              </div>

              {periodComparison && (
                <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-6 space-y-3" style={{ order: 0 }} id="owner-period-comparison-card">
                  <h3 className="text-sm font-bold text-slate-800">
                    Сравнение: {periodComparison.currLabel} vs {periodComparison.prevLabel} {finYear}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    {[
                      {
                        label: "Выручка (работа + солярий)",
                        cur: periodComparison.current.grossRevenueExcludingMaterials,
                        prev: periodComparison.previous.grossRevenueExcludingMaterials,
                      },
                      {
                        label: "Чистый результат",
                        cur: periodComparison.current.netEarnings,
                        prev: periodComparison.previous.netEarnings,
                      },
                      {
                        label: "Визитов",
                        cur: periodComparison.current.visitCount,
                        prev: periodComparison.previous.visitCount,
                      },
                    ].map((row) => {
                      const delta = formatDelta(row.cur, row.prev);
                      return (
                        <div key={row.label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                          <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">{row.label}</div>
                          <div className="font-mono font-bold text-slate-900">
                            {row.cur.toLocaleString("ru-RU")}{row.label.includes("Визит") ? "" : " ₽"}
                          </div>
                          <div className={`text-[10px] font-mono mt-1 ${delta.positive ? "text-emerald-600" : "text-red-600"}`}>
                            {delta.text}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4" id="owner-pnl-summary-card" style={getBlockStyle("pnl-summary")}>
                <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => toggleBlock("pnl-summary")}>
                  <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                    Сводная ведомость доходов и расходов ({selectedPeriodTitle})
                  </h3>
                  <button type="button" className="text-slate-400 hover:text-slate-600 focus:outline-none">
                    {collapsedBlocks["pnl-summary"] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                </div>

                {!collapsedBlocks["pnl-summary"] && (
                  <div className="space-y-4 pt-2">
                    {/* Revenue section */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-150 pb-1">Доходы салона (Услуги и время)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs md:text-sm">
                        <div className="flex justify-between py-1.5 px-3 bg-slate-50 rounded-lg">
                          <span className="text-slate-600">Оказанные услуги красоты мастерами:</span>
                          <span className="font-mono font-bold text-slate-800">+{totalVisitsWorkRevenues.toLocaleString()} ₽</span>
                        </div>
                        <div className="flex justify-between py-1.5 px-3 bg-slate-50 rounded-lg">
                          <span className="text-slate-600">Минуты солярия ({totalSolariumMinutes} мин):</span>
                          <span className="font-mono font-bold text-slate-800">+{totalSolariumMinsRevenues.toLocaleString()} ₽</span>
                        </div>
                      </div>
                    </div>

                    {/* Dedicated Materials section */}
                    <div className="space-y-2 pt-2">
                       <h4 className="text-xs font-bold text-indigo-500 uppercase tracking-widest border-b border-indigo-150 pb-1 flex items-center gap-1.5 font-sans">
                        <Layers className="h-3.5 w-3.5" />
                        Раздел: Материалы (Отдельный учет)
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs md:text-sm">
                        <div className="flex justify-between py-1.5 px-3 bg-indigo-50/40 rounded-lg">
                          <span className="text-slate-600 font-sans">Расходные материалы визитов (Салон):</span>
                          <span className="font-mono font-bold text-indigo-600">+{totalSalonMaterialsRevenue?.toLocaleString()} ₽</span>
                        </div>
                        <div className="flex justify-between py-1.5 px-3 bg-indigo-50/40 rounded-lg">
                          <span className="text-slate-600 font-sans">Материалы солярия (крема, стикини):</span>
                          <span className="font-mono font-bold text-indigo-600">+{totalSolariumMaterialsRevenue?.toLocaleString()} ₽</span>
                        </div>
                        <div className="flex justify-between py-1.5 px-3 bg-red-50/20 border border-red-100 rounded-lg">
                          <span className="text-slate-600 font-sans">Затраты на закупку расходников:</span>
                          <span className="font-mono font-bold text-red-600">-{materialsPurchaseExpenses.toLocaleString()} ₽</span>
                        </div>
                        <div className="flex justify-between py-1.5 px-3 bg-emerald-50/30 border border-emerald-100 rounded-lg">
                          <span className="font-bold text-emerald-800 font-sans">Финансовый результат по материалам:</span>
                          <span className={`font-mono font-black ${totalMaterialsRevenue - materialsPurchaseExpenses >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                            {totalMaterialsRevenue - materialsPurchaseExpenses >= 0 ? "+" : ""}{(totalMaterialsRevenue - materialsPurchaseExpenses).toLocaleString()} ₽
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Cashless analytics section */}
                    <div className="space-y-2 pt-2" id="cashless-pnl-analytics">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-150 pb-1 flex items-center gap-1.5 font-sans">
                        <CreditCard className="h-3.5 w-3.5 text-indigo-500" />
                        Безналичный расчет (Карты) после вычета эквайринга
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs md:text-sm">
                        <div className="flex justify-between py-1.5 px-3 bg-indigo-50/20 rounded-lg border border-indigo-50/50">
                          <span className="text-slate-600">Оборот по дебетовым картам (Брутто):</span>
                          <span className="font-mono font-bold text-slate-800">+{cashlessGrossRevenue.toLocaleString()} ₽</span>
                        </div>
                        <div className="flex justify-between py-1.5 px-3 bg-indigo-50/20 rounded-lg border border-indigo-50/50">
                          <span className="text-slate-600 font-sans">Комиссия эквайринга банком ({commissionPct}%):</span>
                          <span className="font-mono font-bold text-red-600">-{cashlessAcquiringCommissions.toLocaleString()} ₽</span>
                        </div>
                        <div className="flex justify-between py-1.5 px-3 bg-emerald-50/20 border border-emerald-500/10 rounded-lg md:col-span-2 shadow-sm">
                          <span className="font-bold text-slate-700 font-sans">Чистая прибыль по безналу (поступления на р/с):</span>
                          <span className="font-mono font-black text-emerald-600">+{cashlessNetRevenue.toLocaleString()} ₽</span>
                        </div>
                      </div>
                    </div>

                    {/* Expenses section */}
                    <div className="space-y-2 pt-2">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-150 pb-1">Расходы салона (Выплаты & Коммуналка)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs md:text-sm">
                        <div className="flex justify-between py-1.5 px-3 bg-red-50/30 rounded-lg border border-red-50">
                          <span className="text-slate-600">Зарплата администраторов:</span>
                          <span className="font-mono font-bold text-red-650">-{adminsMonthlyWages.toLocaleString()} ₽</span>
                        </div>
                        <div className="flex justify-between py-1.5 px-3 bg-red-50/30 rounded-lg border border-red-50">
                          <span className="text-slate-600">Выплаты долей мастерам (к з/п):</span>
                          <span className="font-mono font-bold text-red-650">-{mastersPortionsWages.toLocaleString()} ₽</span>
                        </div>
                        <div className="flex justify-between py-1.5 px-3 bg-red-50/30 rounded-lg border border-red-50">
                          <span className="text-slate-600">Удержанные комиссии эквайринга:</span>
                          <span className="font-mono font-bold text-red-650">-{totalAcquiringCommissionPaid.toLocaleString()} ₽</span>
                        </div>
                        <div className="flex justify-between py-1.5 px-3 bg-red-50/30 rounded-lg border border-red-50">
                          <span className="text-slate-600 font-sans">Операционные расходы (без закупки материалов):</span>
                          <span className="font-mono font-bold text-red-600">-{otherBillExpenses.toLocaleString()} ₽</span>
                        </div>
                      </div>
                    </div>

                    {/* Profit summary badge */}
                    <div className="bg-slate-900 text-white rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
                      <div>
                        <span className="text-xs text-slate-400 font-semibold uppercase tracking-widest block font-sans">Итоговая чистая прибыль салона</span>
                        <p className="text-xs text-slate-400 font-sans">Учтены все визиты (включая сертификат и долг), солярий, зарплаты персонала и накладные расходы. Материалы — в отдельной секции выше.</p>
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] text-slate-400 font-sans">Валовый оборот (Услуги/Время): <strong className="font-mono text-slate-200">{grossRevenueExcludingMaterials.toLocaleString()} ₽</strong></div>
                        <div className="text-[11px] text-slate-400 font-sans">Всего затрат (Сервис): <strong className="font-mono text-slate-200">{totalExpensesExcludingMaterials.toLocaleString()} ₽</strong></div>
                        
                        <div className={`text-2xl font-mono font-black mt-2.5 ${netEarnings >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                          {netEarnings >= 0 ? "+" : ""}{netEarnings.toLocaleString()} ₽
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

            {/* Monthly bill adder panel */}
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4" id="owner-add-outgoing-card" style={getBlockStyle("add-outgoing")}>
                <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => toggleBlock("add-outgoing")}>
                  <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                    <Plus className="h-5 w-5 text-red-500" />
                    Внести расходы салона (свет, вода, мусор, товары)
                  </h3>
                  <button type="button" className="text-slate-400 hover:text-slate-600 focus:outline-none">
                    {collapsedBlocks["add-outgoing"] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                </div>

                {!collapsedBlocks["add-outgoing"] && (
                  <form onSubmit={handleAddBill} className="space-y-4 font-sans">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Категория платежа</label>
                      <select
                        value={billCategory}
                        onChange={(e) => setBillCategory(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50/50"
                      >
                        <option value="Свет">Свет</option>
                        <option value="Вода">Вода</option>
                        <option value="Вывоз мусора">Вывоз мусора</option>
                        <option value="Закупка товара">Закупка материалов</option>
                        <option value="Аренда помещения">Аренда помещения</option>
                        <option value="Продукты">Продукты / Хознужды</option>
                        <option value="Прочее">Другое</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Сумма (Р)</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={billAmount}
                          onChange={(e) => setBillAmount(e.target.value === "" ? "" : Number(e.target.value))}
                          className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 font-mono"
                          min="1"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Дата счета</label>
                        <input
                          type="date"
                          value={billDate}
                          onChange={(e) => setBillDate(e.target.value)}
                          className="w-full text-xs border border-slate-100 rounded-xl px-3 py-2 bg-slate-50/50 focus:outline-none"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Описание / Комментарий</label>
                      <textarea
                        placeholder="Оплата электроэнергии по квитанции №..."
                        value={billComment}
                        onChange={(e) => setBillComment(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 h-16 resize-none"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors"
                    >
                      Записать коммунальный расход
                    </button>
                  </form>
                )}
              </div>

          {/* List of bills recorded this month */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4" id="owner-recorded-bills-card" style={getBlockStyle("recorded-bills-list")}>
            <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => toggleBlock("recorded-bills-list")}>
              <h3 className="text-md font-bold text-slate-800">Перечень накладных расходов ({selectedPeriodTitle})</h3>
              <button type="button" className="text-slate-400 hover:text-slate-600 focus:outline-none">
                {collapsedBlocks["recorded-bills-list"] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
            </div>

            {!collapsedBlocks["recorded-bills-list"] && (
              <>
                {currentMonthExtraTxs.filter(t => t.type === "минус").length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">За выбранный период коммунальных или накладных расходов еще не зарегистрировано</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {currentMonthExtraTxs.filter(t => t.type === "минус").map(tx => (
                      <div key={tx.id} className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/40 relative flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                              {tx.category || "Расход"}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">{new Date(tx.date).toLocaleDateString("ru-RU")}</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-2 font-medium">{tx.comment}</p>
                        </div>
                        <div className="flex justify-between items-baseline pt-4 border-t border-slate-100/50 mt-3">
                          <span className="text-font-bold text-red-500 font-mono font-black">-{tx.amount} ₽</span>
                          <button
                            onClick={() => handleRemoveBill(tx.id)}
                            className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* BIG DAILY COMPREHENSIVE FINANCIAL SUMMARY TABULATION */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4" id="owner-daily-ledger-card" style={getBlockStyle("detailed-daily-ledger")}>
            <div className="flex items-center justify-between cursor-pointer select-none border-b border-slate-100 pb-4" onClick={() => toggleBlock("detailed-daily-ledger")}>
              <div>
                <h3 className="text-md font-bold text-slate-800">Детальный ежедневный сводный отчет</h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Сводная таблица по всем статьям доходов, расходов, удержаний и чистой прибыли по дням
                </p>
              </div>
              <button type="button" className="text-slate-400 hover:text-slate-600 focus:outline-none">
                {collapsedBlocks["detailed-daily-ledger"] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
            </div>
            
            {!collapsedBlocks["detailed-daily-ledger"] && (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left border-collapse text-[11px] sm:text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
                    <th className="py-3 px-4 font-sans text-left">Дата</th>
                    <th className="py-3 px-3 text-right">Услуги (₽)</th>
                    <th className="py-3 px-3 text-right text-indigo-500 bg-indigo-50/10">Мат. под-чист (₽)</th>
                    <th className="py-3 px-3 text-right text-red-500 bg-red-50/10">Закуп мат. (₽)</th>
                    <th className="py-3 px-3 text-right">Солярий (мин, ₽)</th>
                    <th className="py-3 px-3 text-right">ЗП Админов (₽)</th>
                    <th className="py-3 px-3 text-right">Выпл Мастерам (₽)</th>
                    <th className="py-3 px-3 text-right">Эквайринг (₽)</th>
                    <th className="py-3 px-3 text-right">Хоз расходы (₽)</th>
                    <th className="py-3 px-3 text-right text-slate-700 bg-slate-50 font-bold">Брутто услуг</th>
                    <th className="py-3 px-3 text-right text-red-650 bg-red-50/10 font-bold">Затраты услуг</th>
                    <th className="py-3 px-4 text-right bg-emerald-50 text-emerald-800 font-black">Чистая прибыль (Услуги)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans font-medium">
                  {dailyLedgerList.map((item) => (
                    <tr 
                      key={item.dateStr} 
                      className={`hover:bg-slate-50/60 transition-colors ${
                        !item.hasActivity ? "opacity-30 text-slate-400 bg-slate-50/20" : ""
                      }`}
                    >
                      <td className="py-2.5 px-4 font-bold text-slate-700">
                        <span className="font-mono font-bold mr-1.5">{item.day.toString().padStart(2, "0")}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          item.isWeekend ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-700"
                        }`}>
                          {item.weekday}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                        {item.dayWorkRevenue > 0 ? `${item.dayWorkRevenue.toLocaleString()}` : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-indigo-650 bg-indigo-50/10">
                        {item.dayMatsRevenue > 0 ? `${item.dayMatsRevenue.toLocaleString()}` : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-red-600 bg-red-50/10">
                        {item.dayMaterialsPurchaseExpenses > 0 ? `${item.dayMaterialsPurchaseExpenses.toLocaleString()}` : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-600">
                        {item.daySolGross > 0 ? `${item.daySolGross.toLocaleString()}` : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-blue-650">
                        {item.dayAdminWages > 0 ? `${item.dayAdminWages.toLocaleString()}` : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-purple-700">
                        {item.dayMasterWages > 0 ? `${item.dayMasterWages.toLocaleString()}` : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                        {item.dayAcquiring > 0 ? `${item.dayAcquiring.toLocaleString()}` : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-red-500">
                        {item.dayOtherBillExpense > 0 ? `${item.dayOtherBillExpense.toLocaleString()}` : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 bg-slate-50/60">
                        {item.dayGross > 0 ? `${item.dayGross.toLocaleString()}` : "—"}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-semibold text-red-600 bg-red-50/10">
                        {item.dayExpenses > 0 ? `${item.dayExpenses.toLocaleString()}` : "—"}
                      </td>
                      <td className={`py-2.5 px-4 text-right font-mono font-black ${
                        item.dayNet > 0 ? "text-emerald-650 bg-emerald-50/20" : item.dayNet < 0 ? "text-red-650 bg-red-50/20" : "text-slate-400"
                      }`}>
                        {item.dayNet !== 0 ? `${item.dayNet > 0 ? "+" : ""}${item.dayNet.toLocaleString()}` : "0"} ₽
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100/80 text-slate-800 font-bold border-t border-slate-250">
                    <td className="py-3 px-4 font-sans text-left">ИТОГО ЗА МЕСЯЦ</td>
                    <td className="py-3 px-3 text-right font-mono">{totalVisitsWorkRevenues.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-mono text-indigo-650 bg-indigo-50/10">{totalMaterialsRevenue.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-mono text-red-600 bg-red-50/10">{materialsPurchaseExpenses.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-mono text-amber-700">{totalSolariumMinsRevenues.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-mono text-blue-700">{adminsMonthlyWages.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-mono text-purple-700">{mastersPortionsWages.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-mono text-indigo-600">{totalAcquiringCommissionPaid.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-mono text-red-600">{otherBillExpenses.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-950 bg-slate-200/50">{grossRevenueExcludingMaterials.toLocaleString()}</td>
                    <td className="py-3 px-3 text-right font-mono text-red-800 bg-red-100/30">{totalExpensesExcludingMaterials.toLocaleString()}</td>
                    <td className={`py-3 px-4 text-right font-mono font-black text-sm bg-slate-200/40 ${
                      netEarnings >= 0 ? "text-emerald-700" : "text-red-700"
                    }`}>
                      {netEarnings >= 0 ? "+" : ""}{netEarnings.toLocaleString()} ₽
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            )}
          </div>

          {/* BIG YEARLY COMPREHENSIVE FINANCIAL SUMMARY TABULATION */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4" id="owner-yearly-ledger-card" style={getBlockStyle("detailed-yearly-ledger")}>
            <div className="flex items-center justify-between cursor-pointer select-none border-b border-slate-100 pb-4" onClick={() => toggleBlock("detailed-yearly-ledger")}>
              <div>
                <h3 className="text-md font-bold text-slate-800 font-sans">Детальный сводный отчет за год ({finYear})</h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Сводная таблица по всем статьям доходов, расходов и чистой прибыли по месяцам за выбранный год
                </p>
              </div>
              <button type="button" className="text-slate-400 hover:text-slate-600 focus:outline-none">
                {collapsedBlocks["detailed-yearly-ledger"] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
            </div>
            
            {!collapsedBlocks["detailed-yearly-ledger"] && (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left border-collapse text-[11px] sm:text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
                      <th className="py-3 px-4 font-sans text-left">Месяц</th>
                      <th className="py-3 px-3 text-right font-sans">Услуги (₽)</th>
                      <th className="py-3 px-3 text-right text-indigo-500 bg-indigo-50/10">Мат. под-чист (₽)</th>
                      <th className="py-3 px-3 text-right text-red-500 bg-red-50/10">Закуп мат. (₽)</th>
                      <th className="py-3 px-3 text-right font-sans">Солярий (₽)</th>
                      <th className="py-3 px-3 text-right">ЗП Админов (₽)</th>
                      <th className="py-3 px-3 text-right">Выпл Мастерам (₽)</th>
                      <th className="py-3 px-3 text-right">Эквайринг (₽)</th>
                      <th className="py-3 px-3 text-right">Хоз расходы (₽)</th>
                      <th className="py-3 px-3 text-right text-slate-700 bg-slate-50 font-sans font-bold">Брутто услуг</th>
                      <th className="py-3 px-3 text-right text-red-650 bg-red-50/20 font-sans font-bold">Затраты услуг</th>
                      <th className="py-3 px-4 text-right bg-emerald-50 text-emerald-800 font-sans font-black">Чистая прибыль (Услуги)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans font-medium">
                    {yearlyLedgerList.map((item) => (
                      <tr 
                        key={item.month} 
                        className={`hover:bg-slate-50/60 transition-colors ${
                          !item.hasActivity ? "opacity-30 text-slate-400 bg-slate-50/20" : ""
                        }`}
                      >
                        <td className="py-2.5 px-4 font-bold text-slate-700 uppercase">
                          {item.monthName}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                          {item.monthWorkRevenue > 0 ? `${item.monthWorkRevenue.toLocaleString()}` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-indigo-650 bg-indigo-50/10">
                          {item.monthMatsRevenue > 0 ? `${item.monthMatsRevenue.toLocaleString()}` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-red-600 bg-red-50/10">
                          {item.monthMaterialsPurchaseExpenses > 0 ? `${item.monthMaterialsPurchaseExpenses.toLocaleString()}` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-amber-600">
                          {item.monthSolGross > 0 ? `${item.monthSolGross.toLocaleString()}` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-blue-650">
                          {item.monthAdminWages > 0 ? `${item.monthAdminWages.toLocaleString()}` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-purple-700">
                          {item.monthMasterWages > 0 ? `${item.monthMasterWages.toLocaleString()}` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                          {item.monthAcquiring > 0 ? `${item.monthAcquiring.toLocaleString()}` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-red-500">
                          {item.monthOtherBillExpense > 0 ? `${item.monthOtherBillExpense.toLocaleString()}` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 bg-slate-50/60">
                          {item.monthGross > 0 ? `${item.monthGross.toLocaleString()}` : "—"}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-semibold text-red-600 bg-red-50/10">
                          {item.monthExpenses > 0 ? `${item.monthExpenses.toLocaleString()}` : "—"}
                        </td>
                        <td className={`py-2.5 px-4 text-right font-mono font-black ${
                          item.monthNet > 0 ? "text-emerald-650 bg-emerald-50/20" : item.monthNet < 0 ? "text-red-650 bg-red-50/20" : "text-slate-400"
                        }`}>
                          {item.monthNet !== 0 ? `${item.monthNet > 0 ? "+" : ""}${item.monthNet.toLocaleString()} ₽` : "0 ₽"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100/80 text-slate-800 font-bold border-t border-slate-250 border-slate-300">
                      <td className="py-3 px-4 font-sans text-left uppercase font-black text-slate-700">ИТОГО ЗА ГОД</td>
                      <td className="py-3 px-3 text-right font-mono font-bold">{yearlyLedgerList.reduce((s, i) => s + i.monthWorkRevenue, 0).toLocaleString()}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-indigo-650 bg-indigo-50/10">{yearlyLedgerList.reduce((s, i) => s + i.monthMatsRevenue, 0).toLocaleString()}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-red-600 bg-red-50/10">{yearlyLedgerList.reduce((s, i) => s + i.monthMaterialsPurchaseExpenses, 0).toLocaleString()}</td>
                      <td className="py-3 px-3 text-right font-mono text-amber-700 font-bold">{yearlyLedgerList.reduce((s, i) => s + i.monthSolGross, 0).toLocaleString()}</td>
                      <td className="py-3 px-3 text-right font-mono text-blue-750 font-bold">{yearlyLedgerList.reduce((s, i) => s + i.monthAdminWages, 0).toLocaleString()}</td>
                      <td className="py-3 px-3 text-right font-mono text-purple-750 font-bold">{yearlyLedgerList.reduce((s, i) => s + i.monthMasterWages, 0).toLocaleString()}</td>
                      <td className="py-3 px-3 text-right font-mono text-indigo-650 font-bold">{yearlyLedgerList.reduce((s, i) => s + i.monthAcquiring, 0).toLocaleString()}</td>
                      <td className="py-3 px-3 text-right font-mono text-red-650 font-bold">{yearlyLedgerList.reduce((s, i) => s + i.monthOtherBillExpense, 0).toLocaleString()}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-950 bg-slate-200/50 font-bold">{yearlyLedgerList.reduce((s, i) => s + i.monthGross, 0).toLocaleString()}</td>
                      <td className="py-3 px-3 text-right font-mono text-red-800 bg-red-100/30 font-bold">{yearlyLedgerList.reduce((s, i) => s + i.monthExpenses, 0).toLocaleString()}</td>
                      <td className={`py-3 px-4 text-right font-mono font-black text-sm bg-slate-200/40 ${
                        yearlyLedgerList.reduce((s, i) => s + i.monthNet, 0) >= 0 ? "text-emerald-700" : "text-red-700"
                      }`}>
                        {yearlyLedgerList.reduce((s, i) => s + i.monthNet, 0) >= 0 ? "+" : ""}{yearlyLedgerList.reduce((s, i) => s + i.monthNet, 0).toLocaleString()} ₽
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}


      {/* --- PANEL 4: DETAILED INDIVIDUAL EMPLOYEE STATS OVER CUSTOM DATES --- */}
      {activeSubTab === "stats" && (
        <div className="space-y-8" id="subpanel-stats">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => toggleBlock("stats-filter")}>
              <div>
                <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-emerald-600" />
                  Индивидуальная статистика сотрудников за любой период
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-1">
                  Выберите любого мастера или администратора и укажите любой временной диапазон для получения детальных расчетов и финансового анализа.
                </p>
              </div>
              <button type="button" className="text-slate-400 hover:text-slate-600 focus:outline-none">
                {collapsedBlocks["stats-filter"] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
            </div>

            {!collapsedBlocks["stats-filter"] && (
              /* Select employee & dates form layout */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-50 font-sans">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Сотрудник</label>
                  <select
                    value={statsEmployeeId}
                    onChange={(e) => setStatsEmployeeId(e.target.value)}
                    className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3.5 py-2.5 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-emerald-500 transition-colors"
                  >
                    <option value="">-- Выберите сотрудника --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.position})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Начало периода</label>
                  <input
                    type="date"
                    value={statsStartDate}
                    onChange={(e) => setStatsStartDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-emerald-500 transition-colors font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Конец периода</label>
                  <input
                    type="date"
                    value={statsEndDate}
                    onChange={(e) => setStatsEndDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3.5 py-2 bg-slate-50/50 hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-emerald-500 transition-colors font-mono font-bold"
                  />
                </div>
              </div>
            )}
          </div>

          {(() => {
            const selectedEmp = employees.find(e => e.id === statsEmployeeId);
            if (!selectedEmp) {
              return (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400 font-sans">
                  <BarChart3 className="h-10 w-10 text-slate-300 mx-auto mb-3 animate-pulse" />
                  Пожалуйста, выберите сотрудника из выпадающего списка выше для составления отчета.
                </div>
              );
            }

            // Calculation logic for this employee:
            const isAdm = selectedEmp.position === Position.Administrator;

            // 1. FILTER VISITS FOR SELECTED DATES
            const empVisitsPeriod = visits.filter(v => 
              v.masterId === selectedEmp.id && 
              !v.isDeleted && 
              v.date >= statsStartDate && 
              v.date <= statsEndDate
            );

            // 2. COUNTS SHIFTS & SUM SHARE
            let shiftsCount = 0;
            let earnedShare = 0;

            if (isAdm) {
              const periodShifts = adminShifts ? adminShifts.filter(s => 
                s.adminId === selectedEmp.id && 
                s.date >= statsStartDate && 
                s.date <= statsEndDate
              ) : [];
              shiftsCount = periodShifts.length;
              earnedShare = periodShifts.reduce((sum, s) => sum + s.rate, 0);
            } else {
              const uniqueDates = Array.from(new Set(empVisitsPeriod.map(v => v.date)));
              shiftsCount = uniqueDates.length;
              earnedShare = empVisitsPeriod.reduce((sum, v) => {
                let pctVal = selectedEmp.percentage;
                if (selectedEmp.position === Position.Manicurist && selectedEmp.manicuresPercentage) {
                  if (v.manicureType === "classical") {
                    pctVal = selectedEmp.manicuresPercentage.classical;
                  } else if (v.manicureType === "apparatus") {
                    pctVal = selectedEmp.manicuresPercentage.apparatus;
                  }
                }
                const pct = pctVal / 100;
                return sum + (v.workCost * pct);
              }, 0);
            }

            // 3. MATERIALS COST & REIMBURSEMENT
            const materialsCost = empVisitsPeriod.reduce((sum, v) => sum + v.materialsCost, 0);
            const materialsReimbursement = empVisitsPeriod.reduce((sum, v) => {
              if (v.masterMaterialsCost !== undefined) {
                return sum + v.masterMaterialsCost;
              }
              return sum + ((v as any).isSalonMaterials !== false ? v.materialsCost : 0);
            }, 0);

            // 4. DAILY RENT DEDUCTION IN PERIOD
            const rentDeduction = selectedEmp.dailyRent * shiftsCount;

            // 5. MANUAL TRANSACTIONS IN PERIOD
            const periodTxs = masterTransactions ? masterTransactions.filter(t => 
              t.masterId === selectedEmp.id && 
              t.date >= statsStartDate && 
              t.date <= statsEndDate
            ) : [];

            const totalPayouts = periodTxs
              .filter(t => t.type === "выплата" || t.type === "аванс")
              .reduce((sum, t) => sum + t.amount, 0);

            const totalFines = periodTxs
              .filter(t => t.type === "штраф" || t.type === "вычет аренды")
              .reduce((sum, t) => sum + t.amount, 0);

            const totalExtras = periodTxs
              .filter(t => t.type === "возврат материалов" || t.type === "прочее")
              .reduce((sum, t) => sum + t.amount, 0);

            // Total revenue brought by employee services to salon:
            const customerTurnover = isAdm ? earnedShare : empVisitsPeriod.reduce((sum, v) => sum + v.totalCost, 0);

            // Balance to receive
            const totalToPay = earnedShare + materialsReimbursement + totalExtras - rentDeduction - totalFines;
            const restBalance = totalToPay - totalPayouts;

            return (
              <div className="space-y-6">
                {/* Metric Bento-Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4" id="stats-metric-grid">
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Отработано дней/смен</span>
                    <div className="text-2xl font-mono font-black text-slate-800">{shiftsCount}</div>
                    <span className="text-[11px] text-slate-400 block font-sans">дней занятости на смене</span>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Оборот услуг (₽)</span>
                    <div className="text-2xl font-mono font-black text-emerald-600 font-bold">
                      {customerTurnover.toLocaleString()} ₽
                    </div>
                    <span className="text-[11px] text-slate-400 block font-sans">
                      {isAdm ? "начислено" : `принесено салону (${empVisitsPeriod.length} визитов)`}
                    </span>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1 bg-purple-50/10 border-purple-100/30">
                    <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wider block">Комиссионный доход (₽)</span>
                    <div className="text-2xl font-mono font-black text-purple-700 font-bold">
                      {earnedShare.toLocaleString()} ₽
                    </div>
                    <span className="text-[11px] text-purple-400 block font-sans">
                      {isAdm ? "базовый оклад" : `доля мастера (${selectedEmp.percentage}%)`}
                    </span>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">Материалы и расходы</span>
                    <div className="text-2xl font-mono font-black text-rose-500 font-bold">
                      {materialsCost.toLocaleString()} ₽
                    </div>
                    <span className="text-[11px] text-slate-400 block font-sans">себестоимость сырья у мастера</span>
                  </div>
                </div>

                {/* Second Bento Row: Payouts and Balance */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="stats-metric-secondary">
                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Фактически выплачено</span>
                    <div className="text-xl font-mono font-extrabold text-slate-700">
                      {totalPayouts.toLocaleString()} ₽
                    </div>
                    <span className="text-[11px] text-slate-400 block font-sans">авансы и выплаты под расчет</span>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Штрафы и удержания</span>
                    <div className="text-xl font-mono font-extrabold text-rose-600">
                      {totalFines.toLocaleString()} ₽
                    </div>
                    <span className="text-[11px] text-slate-400 block font-sans">включая удержания аренды ({rentDeduction} ₽)</span>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm space-y-1 bg-indigo-50/20">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider block">Остаток под расчет в периоде</span>
                    <div className={`text-xl font-mono font-black ${restBalance >= 0 ? "text-indigo-700" : "text-rose-600"}`}>
                      {restBalance.toLocaleString()} ₽
                    </div>
                    <span className="text-[11px] text-indigo-400 block font-sans">итого начислено за период за вычетом выданных</span>
                  </div>
                </div>

                {/* Split list detail with grids */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
                  {/* Visits block */}
                  <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => toggleBlock("stats-visits")}>
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-emerald-600" />
                        Выполненные визиты и работы ({empVisitsPeriod.length})
                      </h4>
                      <button type="button" className="text-slate-400 hover:text-slate-600 focus:outline-none">
                        {collapsedBlocks["stats-visits"] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                      </button>
                    </div>

                    {!collapsedBlocks["stats-visits"] && (
                      empVisitsPeriod.length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-400">Нет записей по визитам у данного сотрудника за период.</div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-slate-100">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                                <th className="py-2 px-3">Дата</th>
                                <th className="py-2 px-3">Оплата</th>
                                <th className="py-2 px-3 text-right">Услуга (Р)</th>
                                <th className="py-2 px-3 text-right">Материалы (Р)</th>
                                <th className="py-2 px-3 text-right">Доля мастера (Р)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {empVisitsPeriod.map(v => {
                                let pctValue = selectedEmp.percentage;
                                if (selectedEmp.position === Position.Manicurist && selectedEmp.manicuresPercentage) {
                                  if (v.manicureType === "classical") {
                                    pctValue = selectedEmp.manicuresPercentage.classical;
                                  } else if (v.manicureType === "apparatus") {
                                    pctValue = selectedEmp.manicuresPercentage.apparatus;
                                  }
                                }
                                const pctVal = pctValue / 100;
                                const earned = v.workCost * pctVal;
                                return (
                                  <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                    <td className="py-2 px-3 font-mono text-slate-600 font-bold">{v.date}</td>
                                    <td className="py-2 px-3">
                                      <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-medium ${
                                        v.paymentMethod === "наличные" ? "bg-emerald-50 text-emerald-700" : "bg-purple-50 text-purple-700"
                                      }`}>
                                        {v.paymentMethod}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono text-slate-700 font-semibold">{v.totalCost.toLocaleString()}</td>
                                    <td className="py-2 px-3 text-right font-mono text-slate-400">{v.materialsCost}</td>
                                    <td className="py-2 px-3 text-right font-mono text-purple-700 font-bold">{earned.toLocaleString()}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )
                    )}
                  </div>

                  {/* Transactions block */}
                  <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => toggleBlock("stats-transactions")}>
                      <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                        <RussianRuble className="h-4 w-4 text-indigo-500" />
                        Накладные выплаты / вычеты ({periodTxs.length})
                      </h4>
                      <button type="button" className="text-slate-400 hover:text-slate-600 focus:outline-none">
                        {collapsedBlocks["stats-transactions"] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                      </button>
                    </div>

                    {!collapsedBlocks["stats-transactions"] && (
                      periodTxs.length === 0 ? (
                        <div className="text-center py-8 text-xs text-slate-400">Выплат/штрафов не зафиксировано за этот отрезок.</div>
                      ) : (
                        <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                          {periodTxs.map(t => {
                            const isDed = t.type === "штраф" || t.type === "вычет аренды";
                            return (
                              <div key={t.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                                <div className="flex justify-between items-center text-[11px]">
                                  <span className="font-mono text-slate-400">{t.date}</span>
                                  <span className={`font-mono font-bold ${isDed ? "text-red-500" : "text-emerald-700"}`}>
                                    {isDed ? "-" : "+"}{t.amount} ₽
                                  </span>
                                </div>
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-semibold text-slate-700">{t.type}</span>
                                  <span className="text-[10px] text-slate-400 truncate max-w-[124px]" title={t.comment}>{t.comment || "—"}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}


      {/* --- PANEL 3: TARIFFS & DAYS OF WEEK RATES --- */}
      {activeSubTab === "settings" && (
        <div className="space-y-8" id="subpanel-settings">
          {/* General system rule edit matches Screenshot 7 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => toggleBlock("system-settings")}>
                  <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                    <Sliders className="h-5 w-5 text-purple-600" />
                    Системные настройки и тарифы
                  </h3>
                  <button type="button" className="text-slate-400 hover:text-slate-600 focus:outline-none">
                    {collapsedBlocks["system-settings"] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                </div>

                {!collapsedBlocks["system-settings"] && (
                  <form onSubmit={handleSaveTariffRule} className="space-y-4 font-sans">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Действует с даты</label>
                      <input
                        type="date"
                        value={effectiveDate}
                        onChange={(e) => setEffectiveDate(e.target.value)}
                        className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Комиссия эквайринга (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={tempAcq}
                        onChange={(e) => setTempAcq(Number(e.target.value) || 0)}
                        className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 font-mono font-bold"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Минута солярия (Р)</label>
                      <input
                        type="number"
                        value={tempSolMinute}
                        onChange={(e) => setTempSolMinute(Number(e.target.value) || 0)}
                        className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 font-mono font-bold"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                    >
                      Зафиксировать новое правило
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* List history system rules */}
            <div className="lg:col-span-2">
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => toggleBlock("system-settings-history")}>
                  <h3 className="text-md font-bold text-slate-800">История изменений тарифной сетки</h3>
                  <button type="button" className="text-slate-400 hover:text-slate-600 focus:outline-none">
                    {collapsedBlocks["system-settings-history"] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                  </button>
                </div>
                
                {!collapsedBlocks["system-settings-history"] && (
                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-left border-collapse text-xs md:text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                          <th className="py-2.5 px-4 font-sans">Действует с даты</th>
                          <th className="py-2.5 px-4 text-center">Комиссия эквайринга</th>
                          <th className="py-2.5 px-4 text-center">Минута солярия</th>
                          <th className="py-2.5 px-4 text-center">Действие</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-sans">
                        {settingsRules.map(rule => (
                          <tr key={rule.id} className="hover:bg-slate-50/30 transition-colors">
                            <td className="py-3 px-4 font-bold text-blue-600 font-mono">{rule.effectiveDate}</td>
                            <td className="py-3 px-4 text-center font-mono font-semibold">+{rule.acquiringCommission}%</td>
                            <td className="py-3 px-4 text-center font-mono text-amber-600">{rule.solariumMinuteRate} ₽</td>
                            <td className="py-3 px-4 text-center">
                              <button
                                onClick={() => handleRemoveTariffRule(rule.id)}
                                className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* EDIT DAY OF WEEK RATES WITH EFFECTIVE DATE CAPABILITY */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6" id="days-rates-box">
            <div className="flex items-center justify-between cursor-pointer select-none pb-2 border-b border-slate-50" onClick={() => toggleBlock("admin-days-rates")}>
              <div>
                <h3 className="text-md font-bold text-slate-800 flex items-center gap-1.5">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  Тарифы и ставки работы администраторов по дням недели
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Укажите ставки работы администратора для каждого дня недели и дату, с которой это правило вступает в силу. Работает полная история изменений тарифов!
                </p>
              </div>
              <button type="button" className="text-slate-400 hover:text-slate-600 focus:outline-none">
                {collapsedBlocks["admin-days-rates"] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
            </div>

            {!collapsedBlocks["admin-days-rates"] && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Form to define new rule */}
              <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200">
                <h4 className="text-xs font-bold text-purple-800 uppercase tracking-wider mb-4">Создать правило ставок</h4>
                <form onSubmit={handleSaveAdminDaysRule} className="space-y-4 font-sans text-xs">
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Действует с даты:</label>
                    <input
                      type="date"
                      value={adminRuleEffectiveDate}
                      onChange={(e) => setAdminRuleEffectiveDate(e.target.value)}
                      className="w-full text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-white"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Пн", state: adminRuleMon, set: setAdminRuleMon },
                      { label: "Вт", state: adminRuleTue, set: setAdminRuleTue },
                      { label: "Ср", state: adminRuleWed, set: setAdminRuleWed },
                      { label: "Чт", state: adminRuleThu, set: setAdminRuleThu },
                      { label: "Пт", state: adminRuleFri, set: setAdminRuleFri },
                      { label: "Сб", state: adminRuleSat, set: setAdminRuleSat },
                      { label: "Вс", state: adminRuleSun, set: setAdminRuleSun }
                    ].map((day, idx) => (
                      <div key={idx} className="space-y-1">
                        <label className="block text-slate-400 text-[10px] font-bold uppercase">{day.label}</label>
                        <input
                          type="number"
                          value={day.state}
                          onChange={(e) => day.set(Number(e.target.value) || 0)}
                          className="w-full text-xs font-bold font-mono border border-slate-200 bg-white rounded px-2 py-1 text-slate-800"
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                  >
                    Активировать правило ставок
                  </button>
                </form>
              </div>

              {/* Right Column: List history rules of administrator day rates */}
              <div className="lg:col-span-2 space-y-4">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">История правил окладов администратора</h4>
                
                <div className="overflow-x-auto rounded-xl border border-slate-100">
                  <table className="w-full text-left border-collapse text-xs md:text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-100">
                        <th className="py-2.5 px-4 font-sans">С даты</th>
                        <th className="py-2.5 px-4 text-center">Пн</th>
                        <th className="py-2.5 px-4 text-center">Вт</th>
                        <th className="py-2.5 px-4 text-center">Ср</th>
                        <th className="py-2.5 px-4 text-center">Чт</th>
                        <th className="py-2.5 px-4 text-center">Пт</th>
                        <th className="py-2.5 px-4 text-center">Сб</th>
                        <th className="py-2.5 px-4 text-center">Вс</th>
                        <th className="py-2.5 px-4 text-center">Удалить</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {adminDaysRatesRules.map((rule) => (
                        <tr key={rule.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="py-3 px-4 font-bold text-purple-700 font-mono">{rule.effectiveDate}</td>
                          <td className="py-3 px-4 text-center font-mono font-medium">{rule.monday}</td>
                          <td className="py-3 px-4 text-center font-mono font-medium">{rule.tuesday}</td>
                          <td className="py-3 px-4 text-center font-mono font-medium">{rule.wednesday}</td>
                          <td className="py-3 px-4 text-center font-mono font-medium">{rule.thursday}</td>
                          <td className="py-3 px-4 text-center font-mono font-medium">{rule.friday}</td>
                          <td className="py-3 px-4 text-center font-mono font-medium text-indigo-600">{rule.saturday}</td>
                          <td className="py-3 px-4 text-center font-mono font-medium text-indigo-600">{rule.sunday}</td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleRemoveAdminDaysRule(rule.id)}
                              className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {(() => {
                  const active = getActiveAdminRuleForToday();
                  return (
                    <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 space-y-2.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-extrabold text-purple-800 uppercase tracking-wider block">Действующее правило:</span>
                        <span className="text-[10px] font-bold font-mono text-purple-600 bg-white border border-purple-200 px-2 py-0.5 rounded-full shadow-3xs">
                          {active.effectiveDate === "По умолчанию" ? "По умолчанию" : `С даты: ${active.effectiveDate}`}
                        </span>
                      </div>
                      <div className="grid grid-cols-7 gap-2">
                        {[
                          { l: "Пн", k: "monday" },
                          { l: "Вт", k: "tuesday" },
                          { l: "Ср", k: "wednesday" },
                          { l: "Чт", k: "thursday" },
                          { l: "Пт", k: "friday" },
                          { l: "Сб", k: "saturday" },
                          { l: "Вс", k: "sunday" }
                        ].map(d => (
                          <div key={d.k} className="text-center bg-white border border-slate-100 rounded p-1 shadow-3xs">
                            <span className="text-[9px] font-semibold text-slate-400 block mb-0.5">{d.l}</span>
                            <span className="font-mono font-extrabold text-slate-700 text-xs text-center block">
                              {(active as any)[d.k]}₽
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

              </div>
            </div>
            )}
          </div>

          {/* Raw Material prices matches Excel screenshot & user request directly */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4" id="raw-materials-box">
            <div className="flex items-center justify-between cursor-pointer select-none border-b border-slate-100 pb-3" onClick={() => toggleBlock("raw-materials")}>
              <div>
                <h3 className="text-md font-bold text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
                  ПРАЙС ЦЕН НА СЫРЬЕ С АВТОРАСЧЕТОМ (Р/МЛ)
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Задавайте цену за упаковку и объем упаковки. Себестоимость за 1 мл/гр рассчитается автоматически.
                </p>
              </div>
              <button type="button" className="text-slate-400 hover:text-slate-600 focus:outline-none">
                {collapsedBlocks["raw-materials"] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
            </div>

            {!collapsedBlocks["raw-materials"] && (
              <div className="space-y-6 pt-2">
              {/* Lamination Section */}
              <div className="space-y-3 bg-indigo-50/20 p-4.5 rounded-xl border border-indigo-100/40">
                <div className="flex items-center gap-1.5 border-b border-indigo-100 pb-1.5">
                  <Sparkles className="h-4.5 w-4.5 text-indigo-500" />
                  <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Материалы для Ламинирования LebeL</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 font-sans">
                  {[
                    { label: "Шампунь PROSCENIA SHAMPOO", key: "shampooProscenia", unit: "мл" },
                    { label: "Увлажняющий лосьон AC PRETREATMENT", key: "lotionAcPretreatment", unit: "мл" },
                    { label: "Ламинирующий гель/крем", key: "laminatingGel", unit: "гр" },
                    { label: "Маска PROSCENIA TREATMENT M/ L", key: "maskProscenia", unit: "мл" }
                  ].map(item => {
                    const config = materialPackaging[item.key] || { price: 0, volume: 1 };
                    const calculatedUnit = config.volume > 0 ? (config.price / config.volume) : 0;

                    return (
                      <div key={item.key} className="flex flex-col space-y-2 bg-white p-4 rounded-xl border border-slate-200 shadow-3xs hover:border-slate-300 transition-colors">
                        <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide block truncate">{item.label}</span>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col space-y-0.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Прайс уп-ки (руб)</label>
                            <input
                              type="number"
                              placeholder="Цена"
                              value={config.price || ""}
                              onChange={(e) => {
                                const val = e.target.value === "" ? 0 : Number(e.target.value);
                                setMaterialPackaging(prev => ({
                                  ...prev,
                                  [item.key]: { ...prev[item.key] || { price: 0, volume: 1 }, price: val }
                                }));
                              }}
                              className="w-full text-xs font-bold font-mono border border-slate-200 focus:border-indigo-500 bg-white rounded px-2 py-1 focus:outline-none"
                            />
                          </div>

                          <div className="flex flex-col space-y-0.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Объем ({item.unit})</label>
                            <input
                              type="number"
                              placeholder="Объем"
                              value={config.volume || ""}
                              onChange={(e) => {
                                const val = e.target.value === "" ? 0 : Number(e.target.value);
                                setMaterialPackaging(prev => ({
                                  ...prev,
                                  [item.key]: { ...prev[item.key] || { price: 0, volume: 1 }, volume: val }
                                }));
                              }}
                              className="w-full text-xs font-bold font-mono border border-slate-200 focus:border-indigo-500 bg-white rounded px-2 py-1 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-[10px] text-slate-500 font-mono">
                          <span>Себестоимость:</span>
                          <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            {calculatedUnit.toFixed(4)} ₽ / {item.unit}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Biocurl Section */}
              <div className="space-y-3 bg-purple-50/20 p-4.5 rounded-xl border border-purple-100/40">
                <div className="flex items-center gap-1.5 border-b border-purple-100 pb-1.5">
                  <Layers className="h-4.5 w-4.5 text-purple-500" />
                  <h4 className="text-xs font-bold text-purple-800 uppercase tracking-wider">Материалы для Био-завивки PLIA</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 font-sans">
                  {[
                    { label: "Шампунь PROEDIT CURL FIT", key: "shampooProeditCurlFit", unit: "мл" },
                    { label: "База PLIA BASE", key: "basePliaBase", unit: "мл" },
                    { label: "Лосьон PLIA Шаг 1", key: "lotionPliaStep1", unit: "мл" },
                    { label: "Лосьон PLIA Шаг 2 CURL 2", key: "lotionPliaStep2", unit: "мл" },
                    { label: "Кондиционер Жемчужный", key: "conditionerPearl", unit: "мл" },
                    { label: "Сыворотка AFTER PERM", key: "serumAfterPerm", unit: "мл" }
                  ].map(item => {
                    const config = materialPackaging[item.key] || { price: 0, volume: 1 };
                    const calculatedUnit = config.volume > 0 ? (config.price / config.volume) : 0;

                    return (
                      <div key={item.key} className="flex flex-col space-y-2 bg-white p-4 rounded-xl border border-slate-200 shadow-3xs hover:border-slate-300 transition-colors">
                        <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide block truncate">{item.label}</span>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex flex-col space-y-0.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Прайс уп-ки (руб)</label>
                            <input
                              type="number"
                              placeholder="Цена"
                              value={config.price || ""}
                              onChange={(e) => {
                                const val = e.target.value === "" ? 0 : Number(e.target.value);
                                setMaterialPackaging(prev => ({
                                  ...prev,
                                  [item.key]: { ...prev[item.key] || { price: 0, volume: 1 }, price: val }
                                }));
                              }}
                              className="w-full text-xs font-bold font-mono border border-slate-200 focus:border-indigo-500 bg-white rounded px-2 py-1 focus:outline-none"
                            />
                          </div>

                          <div className="flex flex-col space-y-0.5">
                            <label className="text-[9px] font-bold text-slate-400 uppercase">Объем ({item.unit})</label>
                            <input
                              type="number"
                              placeholder="Объем"
                              value={config.volume || ""}
                              onChange={(e) => {
                                const val = e.target.value === "" ? 0 : Number(e.target.value);
                                setMaterialPackaging(prev => ({
                                  ...prev,
                                  [item.key]: { ...prev[item.key] || { price: 0, volume: 1 }, volume: val }
                                }));
                              }}
                              className="w-full text-xs font-bold font-mono border border-slate-200 focus:border-indigo-500 bg-white rounded px-2 py-1 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-1 border-t border-slate-200 text-[10px] text-slate-500 font-mono">
                          <span>Себестоимость:</span>
                          <span className="font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                            {calculatedUnit.toFixed(4)} ₽ / {item.unit}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            )}
          </div>

          {/* New detailed material consumption setup */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5" id="consumptions-box">
            <div className="flex items-center justify-between cursor-pointer select-none pb-2 border-b border-slate-100" onClick={() => toggleBlock("materials-consumption")}>
              <div>
                <h3 className="text-md font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  НАСТРОЙКА РАСХОДА МАТЕРИАЛОВ ПО ТИПАМ ВОЛОС
                </h3>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Задавайте нормы расхода сырья для каждого типа волос. Технический калькулятор будет автоматически вычислять себестоимость.
                </p>
              </div>
              <button type="button" className="text-slate-400 hover:text-slate-600 focus:outline-none">
                {collapsedBlocks["materials-consumption"] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
            </div>

            {!collapsedBlocks["materials-consumption"] && (
              <div className="space-y-6 pt-2">
              
              {/* Lamination Section (matches screenshot exactly) */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-emerald-50/20 space-y-4">
                <div className="flex items-center gap-2 border-b border-emerald-100 pb-2">
                  <div className="p-1 px-2.5 bg-emerald-500 text-white rounded text-xs font-bold uppercase tracking-wider">Ламинирование</div>
                  <span className="text-xs text-slate-500 font-medium font-sans">Нормы расхода и бельевые константы</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  {["короткие", "средние", "удлиненные", "длинные"].map((hairType) => {
                    const laminationConfig = materialConsumptions?.lamination?.[hairType] || { shampoo: 0, lotion: 0, mask: 0, gel: 0, constant: 0, baseCost: 1000 };
                    return (
                      <div key={hairType} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-3xs space-y-2.5">
                        <span className="text-xs font-extrabold text-slate-700 capitalize flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          {hairType === "удлиненные" ? "Удлиненные" : hairType === "короткие" ? "Короткие" : hairType === "средние" ? "Средние" : "Длинные"}
                        </span>

                        <div className="space-y-2 font-sans text-xs">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-slate-500 text-[11px] truncate">Шампунь (мл):</span>
                            <input
                              type="number"
                              value={laminationConfig.shampoo || ""}
                              onChange={(e) => {
                                const val = e.target.value === "" ? 0 : Number(e.target.value);
                                setMaterialConsumptions((prev: any) => ({
                                  ...prev,
                                  lamination: {
                                    ...prev.lamination,
                                    [hairType]: { ...prev.lamination[hairType], shampoo: val }
                                  }
                                }));
                              }}
                              className="w-16 font-bold font-mono border border-slate-200 rounded text-right px-1.5 py-0.5 bg-slate-50 text-slate-800 text-xs focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-1">
                            <span className="text-slate-500 text-[11px] truncate">Лосьон (мл):</span>
                            <input
                              type="number"
                              value={laminationConfig.lotion || ""}
                              onChange={(e) => {
                                const val = e.target.value === "" ? 0 : Number(e.target.value);
                                setMaterialConsumptions((prev: any) => ({
                                  ...prev,
                                  lamination: {
                                    ...prev.lamination,
                                    [hairType]: { ...prev.lamination[hairType], lotion: val }
                                  }
                                }));
                              }}
                              className="w-16 font-bold font-mono border border-slate-200 rounded text-right px-1.5 py-0.5 bg-slate-50 text-slate-800 text-xs focus:outline-none"
                            />
                          </div>

                          <input type="hidden" /> {/* force unique tags inside structure */}

                          <div className="flex items-center justify-between gap-1">
                            <span className="text-slate-500 text-[11px] truncate font-semibold text-amber-700">Гель/крем (гр):</span>
                            <input
                              type="number"
                              value={laminationConfig.gel || ""}
                              onChange={(e) => {
                                const val = e.target.value === "" ? 0 : Number(e.target.value);
                                setMaterialConsumptions((prev: any) => ({
                                  ...prev,
                                  lamination: {
                                    ...prev.lamination,
                                    [hairType]: { ...prev.lamination[hairType], gel: val }
                                  }
                                }));
                              }}
                              className="w-16 font-bold font-mono border border-amber-200 rounded text-right px-1.5 py-0.5 bg-amber-50/50 text-amber-800 text-xs focus:outline-none focus:border-amber-400"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-1">
                            <span className="text-slate-500 text-[11px] truncate">Маска (мл):</span>
                            <input
                              type="number"
                              value={laminationConfig.mask || ""}
                              onChange={(e) => {
                                const val = e.target.value === "" ? 0 : Number(e.target.value);
                                setMaterialConsumptions((prev: any) => ({
                                  ...prev,
                                  lamination: {
                                    ...prev.lamination,
                                    [hairType]: { ...prev.lamination[hairType], mask: val }
                                  }
                                }));
                              }}
                              className="w-16 font-bold font-mono border border-slate-200 rounded text-right px-1.5 py-0.5 bg-slate-50 text-slate-800 text-xs focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-1 pt-1.5 border-t border-slate-100">
                            <span className="text-blue-600 font-extrabold text-[11px] truncate">Баз. работа (Р):</span>
                            <input
                              type="number"
                              value={laminationConfig.baseCost !== undefined ? laminationConfig.baseCost : (hairType === "короткие" ? 1000 : hairType === "средние" ? 1300 : hairType === "удлиненные" ? 1500 : 1800)}
                              onChange={(e) => {
                                const val = e.target.value === "" ? 0 : Number(e.target.value);
                                setMaterialConsumptions((prev: any) => ({
                                  ...prev,
                                  lamination: {
                                    ...prev.lamination,
                                    [hairType]: { ...prev.lamination[hairType], baseCost: val }
                                  }
                                }));
                              }}
                              className="w-16 font-extrabold font-mono border border-blue-200 rounded text-right px-1.5 py-0.5 bg-blue-50 text-blue-800 text-xs focus:outline-none focus:border-blue-400"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-1 pt-1">
                            <span className="text-indigo-600 font-semibold text-[11px] truncate">Белье (Р):</span>
                            <input
                              type="number"
                              value={laminationConfig.constant || ""}
                              onChange={(e) => {
                                const val = e.target.value === "" ? 0 : Number(e.target.value);
                                setMaterialConsumptions((prev: any) => ({
                                  ...prev,
                                  lamination: {
                                    ...prev.lamination,
                                    [hairType]: { ...prev.lamination[hairType], constant: val }
                                  }
                                }));
                              }}
                              className="w-16 font-extrabold font-mono border border-indigo-200 rounded text-right px-1.5 py-0.5 bg-indigo-50 text-indigo-800 text-xs focus:outline-none focus:border-indigo-400"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bio Perm Section */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-purple-50/20 space-y-4">
                <div className="flex items-center gap-2 border-b border-purple-100 pb-2">
                  <div className="p-1 px-2.5 bg-purple-500 text-white rounded text-xs font-bold uppercase tracking-wider">Био-завивка</div>
                  <span className="text-xs text-slate-500 font-medium font-sans">Нормы расхода препаратов</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
                  {["частичная", "короткие", "средние", "удлиненные", "длинные"].map((hairType) => {
                    const biocurlConfig = materialConsumptions?.biocurl?.[hairType] || { shampoo: 0, base: 0, lotionOne: 0, lotionTwo: 0, cond: 0, serum: 0, constant: 0, baseCost: 1000 };
                    return (
                      <div key={hairType} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-3xs space-y-2">
                        <span className="text-xs font-extrabold text-slate-700 capitalize flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
                          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                          {hairType === "частичная" ? "Частичная" : hairType === "удлиненные" ? "Удлиненные" : hairType === "короткие" ? "Короткие" : hairType === "средние" ? "Средние" : "Длинные"}
                        </span>

                        <div className="space-y-1.5 font-sans text-xs">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-slate-500 text-[10px] truncate">Шампунь CURL FIT (мл):</span>
                            <input
                              type="number"
                              value={biocurlConfig.shampoo || ""}
                              onChange={(e) => {
                                const val = e.target.value === "" ? 0 : Number(e.target.value);
                                setMaterialConsumptions((prev: any) => ({
                                  ...prev,
                                  biocurl: {
                                    ...prev.biocurl,
                                    [hairType]: { ...prev.biocurl[hairType], shampoo: val }
                                  }
                                }));
                              }}
                              className="w-14 font-bold font-mono border border-slate-200 rounded text-right px-1 py-0.5 bg-slate-50 text-slate-800 text-[11px] focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-1">
                            <span className="text-slate-500 text-[10px] truncate">База PLIA BASE (мл):</span>
                            <input
                              type="number"
                              value={biocurlConfig.base || ""}
                              onChange={(e) => {
                                const val = e.target.value === "" ? 0 : Number(e.target.value);
                                setMaterialConsumptions((prev: any) => ({
                                  ...prev,
                                  biocurl: {
                                    ...prev.biocurl,
                                    [hairType]: { ...prev.biocurl[hairType], base: val }
                                  }
                                }));
                              }}
                              className="w-14 font-bold font-mono border border-slate-200 rounded text-right px-1 py-0.5 bg-slate-50 text-slate-800 text-[11px] focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-1">
                            <span className="text-slate-500 text-[10px] truncate">Лосьон Шаг 1 (мл):</span>
                            <input
                              type="number"
                              value={biocurlConfig.lotionOne || ""}
                              onChange={(e) => {
                                const val = e.target.value === "" ? 0 : Number(e.target.value);
                                setMaterialConsumptions((prev: any) => ({
                                  ...prev,
                                  biocurl: {
                                    ...prev.biocurl,
                                    [hairType]: { ...prev.biocurl[hairType], lotionOne: val }
                                  }
                                }));
                              }}
                              className="w-14 font-bold font-mono border border-slate-200 rounded text-right px-1 py-0.5 bg-slate-50 text-slate-800 text-[11px] focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-1">
                            <span className="text-slate-500 text-[10px] truncate">Лосьон Шаг 2 (мл):</span>
                            <input
                              type="number"
                              value={biocurlConfig.lotionTwo || ""}
                              onChange={(e) => {
                                const val = e.target.value === "" ? 0 : Number(e.target.value);
                                setMaterialConsumptions((prev: any) => ({
                                  ...prev,
                                  biocurl: {
                                    ...prev.biocurl,
                                    [hairType]: { ...prev.biocurl[hairType], lotionTwo: val }
                                  }
                                }));
                              }}
                              className="w-14 font-bold font-mono border border-slate-200 rounded text-right px-1 py-0.5 bg-slate-50 text-slate-800 text-[11px] focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-1">
                            <span className="text-slate-500 text-[10px] truncate">Жемчужный (мл):</span>
                            <input
                              type="number"
                              value={biocurlConfig.cond || ""}
                              onChange={(e) => {
                                const val = e.target.value === "" ? 0 : Number(e.target.value);
                                setMaterialConsumptions((prev: any) => ({
                                  ...prev,
                                  biocurl: {
                                    ...prev.biocurl,
                                    [hairType]: { ...prev.biocurl[hairType], cond: val }
                                  }
                                }));
                              }}
                              className="w-14 font-bold font-mono border border-slate-200 rounded text-right px-1 py-0.5 bg-slate-50 text-slate-800 text-[11px] focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-1">
                            <span className="text-slate-500 text-[10px] truncate">AFTER PERM (мл):</span>
                            <input
                              type="number"
                              value={biocurlConfig.serum || ""}
                              onChange={(e) => {
                                const val = e.target.value === "" ? 0 : Number(e.target.value);
                                setMaterialConsumptions((prev: any) => ({
                                  ...prev,
                                  biocurl: {
                                    ...prev.biocurl,
                                    [hairType]: { ...prev.biocurl[hairType], serum: val }
                                  }
                                }));
                              }}
                              className="w-14 font-bold font-mono border border-slate-200 rounded text-right px-1 py-0.5 bg-slate-50 text-slate-800 text-[11px] focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-100">
                            <span className="text-blue-600 font-extrabold text-[10px] truncate">Баз. работа (Р):</span>
                            <input
                              type="number"
                              value={biocurlConfig.baseCost !== undefined ? biocurlConfig.baseCost : (hairType === "частичная" ? 800 : hairType === "короткие" ? 1000 : hairType === "средние" ? 1200 : hairType === "удлиненные" ? 1400 : 1600)}
                              onChange={(e) => {
                                const val = e.target.value === "" ? 0 : Number(e.target.value);
                                setMaterialConsumptions((prev: any) => ({
                                  ...prev,
                                  biocurl: {
                                    ...prev.biocurl,
                                    [hairType]: { ...prev.biocurl[hairType], baseCost: val }
                                  }
                                }));
                              }}
                              className="w-14 font-extrabold font-mono border border-blue-200 rounded text-right px-1 py-0.5 bg-blue-50 text-blue-800 text-[11px] focus:outline-none focus:border-blue-400"
                            />
                          </div>

                          <div className="flex items-center justify-between gap-1 pt-1">
                            <span className="text-purple-600 font-semibold text-[10px] truncate">Белье (Р):</span>
                            <input
                              type="number"
                              value={biocurlConfig.constant || ""}
                              onChange={(e) => {
                                const val = e.target.value === "" ? 0 : Number(e.target.value);
                                setMaterialConsumptions((prev: any) => ({
                                  ...prev,
                                  biocurl: {
                                    ...prev.biocurl,
                                    [hairType]: { ...prev.biocurl[hairType], constant: val }
                                  }
                                }));
                              }}
                              className="w-14 font-extrabold font-mono border border-purple-200 rounded text-right px-1 py-0.5 bg-purple-50 text-purple-800 text-[11px] focus:outline-none focus:border-purple-400"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
            )}
          </div>

          {/* НАСТРОЙКА ФИНАНСОВОГО ДАШБОРДА */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4" id="owner-dashboard-layout-settings-card">
            <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => toggleBlock("dashboard-layout-settings")}>
              <h3 className="text-md font-bold text-slate-800 flex items-center gap-2">
                <Sliders className="h-5 w-5 text-indigo-600" />
                Персонализация финансового дашборда
              </h3>
              <button type="button" className="text-slate-400 hover:text-slate-600 focus:outline-none">
                {collapsedBlocks["dashboard-layout-settings"] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
            </div>

            {!collapsedBlocks["dashboard-layout-settings"] && (
              <div className="space-y-4 font-sans">
                <p className="text-xs text-slate-400">
                  Скрывайте ненужные блоки или меняйте порядок — изменения сразу видны на вкладке «Сводный отчет». Настройки сохраняются на этом устройстве.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveSubTab("finance")}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 underline underline-offset-2"
                >
                  Открыть вкладку «Сводный отчет»
                </button>

                <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-slate-50/50">
                  {dashboardBlocks.map((block, idx) => {
                    return (
                      <div key={block.id} className="flex items-center justify-between p-3.5 bg-white hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          {/* Drag/Order arrows */}
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              onClick={() => moveDashboardBlock(idx, "up")}
                              disabled={idx === 0}
                              className={`p-1 rounded hover:bg-slate-100 transition-colors ${idx === 0 ? "text-slate-200 cursor-not-allowed" : "text-slate-500 hover:text-indigo-600"}`}
                              title="Переместить выше"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveDashboardBlock(idx, "down")}
                              disabled={idx === dashboardBlocks.length - 1}
                              className={`p-1 rounded hover:bg-slate-100 transition-colors ${idx === dashboardBlocks.length - 1 ? "text-slate-200 cursor-not-allowed" : "text-slate-500 hover:text-indigo-600"}`}
                              title="Переместить ниже"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                              <span className="font-mono text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-md font-semibold">#{idx + 1}</span>
                              {block.name}
                            </span>
                            <p className="text-[10px] text-slate-400">
                              {block.id === "revenue-chart" && "График выручки (услуги, солярий, материалы)"}
                              {block.id === "master-revenue" && "Распределение выручки между всеми мастерами (круг)"}
                              {block.id === "pnl-summary" && "Таблица доходов салона, зарплат, комиссий и чистой прибыли"}
                              {block.id === "add-outgoing" && "Форма добавления коммунальных или накладных расходов"}
                              {block.id === "recorded-bills-list" && "Список накладных и коммунальных расходов"}
                              {block.id === "detailed-daily-ledger" && "Огромная таблица по суточной прибыли"}
                              {block.id === "detailed-yearly-ledger" && "Сводная таблица по всем месяцам выбранного года"}
                            </p>
                          </div>
                        </div>

                        {/* Visibility check toggler */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleDashboardBlockVisibility(block.id)}
                            className={`p-2 rounded-xl border flex items-center gap-1 text-[11px] font-semibold transition-all ${
                              block.visible 
                                ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100/70"
                                : "bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100"
                            }`}
                          >
                            {block.visible ? (
                              <>
                                <Eye className="h-4 w-4 text-indigo-600" />
                                <span>Активен</span>
                              </>
                            ) : (
                              <>
                                <EyeOff className="h-4 w-4 text-slate-400" />
                                <span>Скрыт</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

        </div>
      )}


      {/* --- PANEL 4: SECURITY & ACCESS CONTROL --- */}
      {activeSubTab === "security" && (
        <div className="space-y-6" id="subpanel-security">
          <div>
            <h3 className="text-lg font-bold text-slate-800 tracking-tight font-sans">
              Безопасность и контроль доступа
            </h3>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              Управляйте отображением журнала, гибкими правами сотрудников и параметрами автоматического запирания вкладки «Владелица»
            </p>
          </div>

          {/* Section 1: Work Journal Security policies */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between cursor-pointer select-none" onClick={() => toggleBlock("security-journal-control")}>
              <h4 className="text-md font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-rose-500" />
                Контроль отображения и безопасности в журнале работ
              </h4>
              <button type="button" className="text-slate-400 hover:text-slate-600 focus:outline-none">
                {collapsedBlocks["security-journal-control"] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </button>
            </div>
            
            {!collapsedBlocks["security-journal-control"] && (
              <>
                <p className="text-xs text-slate-400 font-sans">
                  Настраивайте видимость удаленных элементов в журнале учета и управляйте правами сотрудников на проведение операций удаления для предотвращения финансовых злоупотреблений.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {/* Toggle 1: Отображение удаленных элементов */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="space-y-0.5 pr-2">
                  <span className="text-xs font-bold text-slate-700 block text-left">Показывать удаленные элементы в журнале</span>
                  <span className="text-[11px] text-slate-400 block text-left">Включает отображение удаленных записей с пометкой в общем списке</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeletedVisits(!showDeletedVisits)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    showDeletedVisits ? "bg-rose-500" : "bg-slate-300"
                  }`}
                  id="toggle-show-deleted-visits-sec"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      showDeletedVisits ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 2: Возможность удаления */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="space-y-0.5 pr-2">
                  <span className="text-xs font-bold text-slate-700 block text-left">Разрешить сотрудникам удалять записи</span>
                  <span className="text-[11px] text-slate-400 block font-sans text-left">Предоставляет доступ к кнопкам мгновенного удаления визитов</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAllowDeleteVisits(!allowDeleteVisits)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    allowDeleteVisits ? "bg-rose-500" : "bg-slate-300"
                  }`}
                  id="toggle-allow-delete-visits-sec"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      allowDeleteVisits ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Toggle: удаление сертификатов */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="space-y-0.5 pr-2">
                  <span className="text-xs font-bold text-slate-700 block text-left">Разрешить удаление сертификатов</span>
                  <span className="text-[11px] text-slate-400 block font-sans text-left">
                    Кнопки удаления активных и закрытых сертификатов во вкладке «Сертификаты» (настраивается только владелицей)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAllowDeleteCertificates(!allowDeleteCertificates)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    allowDeleteCertificates ? "bg-rose-500" : "bg-slate-300"
                  }`}
                  id="toggle-allow-delete-certificates-sec"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      allowDeleteCertificates ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Toggle: удаление долгов */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="space-y-0.5 pr-2">
                  <span className="text-xs font-bold text-slate-700 block text-left">Разрешить удаление долгов</span>
                  <span className="text-[11px] text-slate-400 block font-sans text-left">
                    Кнопки удаления открытых и закрытых долгов во вкладке «Сертификаты» (настраивается только владелицей)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAllowDeleteDebts(!allowDeleteDebts)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    allowDeleteDebts ? "bg-rose-500" : "bg-slate-300"
                  }`}
                  id="toggle-allow-delete-debts-sec"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      allowDeleteDebts ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 3: Отображение истории изменения журнала посещений */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="space-y-0.5 pr-2">
                  <span className="text-xs font-bold text-slate-700 block text-left">Показывать историю изменения посещений</span>
                  <span className="text-[11px] text-slate-400 block font-sans text-left">Отображать детальный лог изменений («История сессии») для каждого визита в журнале</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVisitChangeHistory(!showVisitChangeHistory)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    showVisitChangeHistory ? "bg-rose-500" : "bg-slate-300"
                  }`}
                  id="toggle-show-visit-change-history-sec"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      showVisitChangeHistory ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 4: Разрешить внесение выплат сотрудникам */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="space-y-0.5 pr-2">
                  <span className="text-xs font-bold text-slate-700 block text-left">Разрешить выдачу выплат/штрафов</span>
                  <span className="text-[11px] text-slate-400 block font-sans text-left">Разрешает начислять авансы и вычеты мастерам в табеле зарплат</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAllowMasterPayouts(!allowMasterPayouts)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    allowMasterPayouts ? "bg-rose-500" : "bg-slate-300"
                  }`}
                  id="toggle-allow-master-payouts-sec"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      allowMasterPayouts ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 5: Разрешить редактирование табеля администратора */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="space-y-0.5 pr-2">
                  <span className="text-xs font-bold text-slate-700 block text-left">Разрешить внесение изменений в табель администратора</span>
                  <span className="text-[11px] text-slate-400 block font-sans text-left">Если выключено, отметки смен администратора фиксируются только для чтения</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAllowAdminShiftEdits(!allowAdminShiftEdits)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    allowAdminShiftEdits ? "bg-rose-500" : "bg-slate-300"
                  }`}
                  id="toggle-allow-admin-shift-edits-sec"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      allowAdminShiftEdits ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 6: Скрыть калькуляцию по формулам в калькуляторе */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div className="space-y-0.5 pr-2">
                  <span className="text-xs font-bold text-slate-700 block text-left">Скрыть калькуляцию по формулам</span>
                  <span className="text-[11px] text-slate-400 block font-sans text-left">Скрывает блок детальных формул и шагов в калькуляторе услуг</span>
                </div>
                <button
                  type="button"
                  onClick={() => setHideFormulaCalculations && setHideFormulaCalculations(!hideFormulaCalculations)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    hideFormulaCalculations ? "bg-rose-500" : "bg-slate-300"
                  }`}
                  id="toggle-hide-formula-calculations-sec"
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      hideFormulaCalculations ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
            </>
            )}
          </div>

          {/* Section 2: Owner Password Security Block & Options */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4" id="owner-security-panel">
              <div className="flex items-center justify-between cursor-pointer select-none pb-1.5 border-b border-slate-50" onClick={() => toggleBlock("security-owner-lock")}>
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Lock className="h-4.5 w-4.5 text-rose-500" />
                  Защита вкладки «Владелица»
                </h4>
                <button type="button" className="text-slate-400 hover:text-slate-600 focus:outline-none">
                  {collapsedBlocks["security-owner-lock"] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </button>
              </div>

              {!collapsedBlocks["security-owner-lock"] && (
                <>

              {secError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-xs font-bold text-rose-600 font-sans">
                  {secError}
                </div>
              )}
              {secSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-600 font-sans">
                  {secSuccess}
                </div>
              )}

              {!ownerPassword ? (
                /* Set Password Card */
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void (async () => {
                      if (!secNewPassword) {
                        setSecError("Пожалуйста, введите пароль.");
                        return;
                      }
                      if (secNewPassword !== secConfirmPassword) {
                        setSecError("Пароли не совпадают.");
                        return;
                      }
                      try {
                        setOwnerPassword(await hashPassword(secNewPassword));
                        setSecNewPassword("");
                        setSecConfirmPassword("");
                        setSecError("");
                        setSecSuccess("Пароль успешно установлен и активирован!");
                        setTimeout(() => setSecSuccess(""), 4000);
                      } catch {
                        setSecError("Не удалось сохранить пароль. Попробуйте ещё раз.");
                      }
                    })();
                  }}
                  className="space-y-4 font-sans text-xs"
                >
                  <p className="text-[11px] text-slate-400">
                    Установите пароль, чтобы ограничить доступ посторонних или мастеров к разделу настроек и финансов.
                  </p>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Новый пароль</label>
                    <input
                      type="password"
                      placeholder="Минимум 1 символ..."
                      value={secNewPassword}
                      onChange={(e) => {
                        setSecNewPassword(e.target.value);
                        setSecError("");
                      }}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 font-sans font-bold focus:outline-none focus:ring-1 focus:ring-rose-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 font-semibold mb-1">Подтвердите пароль</label>
                    <input
                      type="password"
                      placeholder="Повторите новый пароль..."
                      value={secConfirmPassword}
                      onChange={(e) => {
                        setSecConfirmPassword(e.target.value);
                        setSecError("");
                      }}
                      className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 font-sans font-bold focus:outline-none focus:ring-1 focus:ring-rose-500"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-rose-500 hover:bg-rose-600 text-white py-2 px-4 rounded-xl font-bold transition-all shadow-sm shadow-rose-100"
                  >
                    Активировать защиту паролем
                  </button>
                </form>
              ) : (
                /* Modify or Delete Password Cards */
                <div className="space-y-4 font-sans text-xs">
                  <div className="p-3 bg-rose-50/50 border border-rose-100/60 rounded-xl text-[11px] text-rose-700/80">
                    Защита паролем активна. Сброс возможен через кодовое слово.
                  </div>

                  <div className="space-y-4 divide-y divide-slate-100">
                    {/* Change Password form */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void (async () => {
                          const ok = await verifyPassword(secCurrentPassword, ownerPassword);
                          if (!ok) {
                            setSecError("Текущий пароль введен неверно.");
                            return;
                          }
                          if (!secNewPassword) {
                            setSecError("Пожалуйста, введите новый пароль.");
                            return;
                          }
                          if (secNewPassword !== secConfirmPassword) {
                            setSecError("Новые пароли не совпадают.");
                            return;
                          }
                          try {
                            setOwnerPassword(await hashPassword(secNewPassword));
                            setSecNewPassword("");
                            setSecConfirmPassword("");
                            setSecCurrentPassword("");
                            setSecError("");
                            setSecSuccess("Пароль успешно изменен!");
                            setTimeout(() => setSecSuccess(""), 4000);
                          } catch {
                            setSecError("Не удалось сохранить пароль. Попробуйте ещё раз.");
                          }
                        })();
                      }}
                      className="space-y-3 pt-3"
                    >
                      <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">Изменить пароль</span>
                      <div>
                        <label className="block text-slate-500 mb-1">Текущий пароль</label>
                        <input
                          type="password"
                          placeholder="Старый пароль..."
                          value={secCurrentPassword}
                          onChange={(e) => {
                            setSecCurrentPassword(e.target.value);
                            setSecError("");
                          }}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 mb-1">Новый пароль</label>
                        <input
                          type="password"
                          placeholder="Новый пароль..."
                          value={secNewPassword}
                          onChange={(e) => {
                            setSecNewPassword(e.target.value);
                            setSecError("");
                          }}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-slate-500 mb-1">Подтвердите новый пароль</label>
                        <input
                          type="password"
                          placeholder="Повторите новый пароль..."
                          value={secConfirmPassword}
                          onChange={(e) => {
                            setSecConfirmPassword(e.target.value);
                            setSecError("");
                          }}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-slate-800 hover:bg-slate-900 text-white py-2 px-4 rounded-xl font-bold transition-all shadow-sm"
                      >
                        Обновить пароль
                      </button>
                    </form>

                    {/* Close / Lock section */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void (async () => {
                          const ok = await verifyPassword(secCurrentPassword, ownerPassword);
                          if (!ok) {
                            setSecError("Текущий пароль введен неверно.");
                            return;
                          }
                          setOwnerPassword("");
                          setSecCurrentPassword("");
                          setSecError("");
                          setSecSuccess("Защита успешно отключена!");
                          setTimeout(() => setSecSuccess(""), 4000);
                        })();
                      }}
                      className="space-y-3 pt-4"
                    >
                      <span className="font-bold text-rose-600 block text-[11px] uppercase tracking-wider">Отключить пароль</span>
                      <p className="text-[11px] text-slate-400">
                        Для полного удаления защиты введите текущий пароль и нажмите кнопку ниже.
                      </p>
                      <div>
                        <input
                          type="password"
                          placeholder="Текущий пароль..."
                          value={secCurrentPassword}
                          onChange={(e) => {
                            setSecCurrentPassword(e.target.value);
                            setSecError("");
                          }}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-slate-50/50 font-sans focus:outline-none focus:ring-1 focus:ring-rose-500"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 py-2 px-4 rounded-xl font-bold transition-all"
                      >
                        Удалить защиту вкладки
                      </button>
                    </form>
                  </div>
                </div>
              )}
              </>
              )}
            </div>

            {/* Additional parameters: keepUnlocked toggle & dynamic automatic locking timer adjustment */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
              <div className="flex items-center justify-between cursor-pointer select-none pb-2 border-b border-slate-100" onClick={() => toggleBlock("security-auto-lock-params")}>
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Sliders className="h-4.5 w-4.5 text-blue-600" />
                  Параметры автоматического запирания
                </h4>
                <button type="button" className="text-slate-400 hover:text-slate-600 focus:outline-none">
                  {collapsedBlocks["security-auto-lock-params"] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </button>
              </div>
              
              {!collapsedBlocks["security-auto-lock-params"] && (
                <>
                  <p className="text-xs text-slate-400 font-sans mt-2">
                    Настройте интеллектуальное блокирование доступа при уходе со страницы или после периода бездействия для предотвращения несанкционированного доступа.
                  </p>

                  <div className="space-y-4 pt-2">
                {/* Option 2.1: Не блокировать вкладку при переходе */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="space-y-0.5 pr-2">
                    <span className="text-xs font-bold text-slate-700 block text-left">Не блокировать вкладку при переходе на другую</span>
                    <span className="text-[11px] text-slate-400 block font-sans text-left">
                      Если включено, переключение вкладок программы внутри сессии не будет повторно запрашивать ввод пароля.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setKeepOwnerUnlocked(!keepOwnerUnlocked)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      keepOwnerUnlocked ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                    id="toggle-keep-owner-unlocked"
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        keepOwnerUnlocked ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Option 2.2: Таймер автоматической блокировки (if keepOwnerUnlocked is active) */}
                {keepOwnerUnlocked && (
                  <div className="p-4 bg-amber-50/50 border border-amber-100/60 rounded-xl space-y-3 font-sans">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-600 animate-pulse" />
                      <span className="text-xs font-bold text-amber-800">Таймер автоматической блокировки при бездействии</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal text-left">
                      Поскольку вкладка не блокируется при переходе, система применит принудительную блокировку при отсутствии пользовательской активности (движений мыши, касаний, нажатий клавиш) в течение заданного времени.
                    </p>

                    <div className="flex items-center gap-3 pt-1">
                      <span className="text-xs text-slate-600 font-semibold">Время ожидания бездействия:</span>
                      <select
                        value={autoLockDuration}
                        onChange={(e) => setAutoLockDuration(Number(e.target.value))}
                        className="text-xs font-bold border border-amber-200 bg-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        <option value={1}>1 минута</option>
                        <option value={2}>2 минуты</option>
                        <option value={5}>5 минут</option>
                        <option value={10}>10 минут</option>
                        <option value={15}>15 минут</option>
                        <option value={30}>30 минут</option>
                      </select>
                    </div>
                  </div>
                )}

                {!keepOwnerUnlocked && (
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-400 font-sans text-left">
                    <span className="font-semibold block text-slate-600 mb-0.5">Вкладка всегда запирается мгновенно</span>
                    При переключении на Журнал работ, Зарплаты или Смены, кабинет «Владелица» будет блокироваться немедленно (таймер неактивности не требуется).
                  </div>
                )}
              </div>
              </>
              )}
            </div>

            {/* Auto backup settings */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
              <div className="flex items-center justify-between cursor-pointer select-none pb-2 border-b border-slate-100" onClick={() => toggleBlock("security-auto-backup")}>
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="h-4.5 w-4.5 text-emerald-600" />
                  Автосохранение резервной копии
                </h4>
                <button type="button" className="text-slate-400 hover:text-slate-600 focus:outline-none">
                  {collapsedBlocks["security-auto-backup"] ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </button>
              </div>

              {!collapsedBlocks["security-auto-backup"] && (
                <>
                  <p className="text-xs text-slate-400 font-sans">
                    Программа автоматически сохраняет JSON-резервную копию в папку «Документы → Ева-стиль → Backups» (только в Windows-приложении). Хранятся последние 10 автокопий — более старые удаляются.
                  </p>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="space-y-0.5 pr-2">
                      <span className="text-xs font-bold text-slate-700 block text-left">Включить автосохранение</span>
                      <span className="text-[11px] text-slate-400 block font-sans text-left">
                        Копия создаётся без диалога и без участия пользователя.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAutoBackupEnabled(!autoBackupEnabled)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        autoBackupEnabled ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          autoBackupEnabled ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                  {autoBackupEnabled && (
                    <div className="space-y-3 p-4 bg-emerald-50/50 border border-emerald-100/60 rounded-xl">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs text-slate-600 font-semibold">Интервал:</span>
                        <select
                          value={autoBackupInterval}
                          onChange={(e) => setAutoBackupInterval(e.target.value as AutoBackupInterval)}
                          className="text-xs font-bold border border-emerald-200 bg-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        >
                          {AUTO_BACKUP_INTERVAL_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        {lastAutoBackupDate && (
                          <span className="text-[11px] text-slate-500">
                            Последняя копия:{" "}
                            {new Date(
                              lastAutoBackupDate.includes("T")
                                ? lastAutoBackupDate
                                : lastAutoBackupDate + "T12:00:00"
                            ).toLocaleString("ru-RU")}
                          </span>
                        )}
                      </div>
                      {usesPreferredBackupTime(autoBackupInterval) && (
                        <div className="flex flex-wrap items-center gap-3">
                          <label className="text-xs text-slate-600 font-semibold" htmlFor="auto-backup-preferred-time">
                            Предпочтительное время:
                          </label>
                          <input
                            id="auto-backup-preferred-time"
                            type="time"
                            value={autoBackupPreferredTime}
                            onChange={(e) => setAutoBackupPreferredTime(e.target.value || "18:00")}
                            className="text-xs font-bold border border-emerald-200 bg-white rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <span className="text-[11px] text-slate-500 font-sans max-w-md">
                            Копия за период создаётся после этого времени (если программа открыта). По умолчанию 18:00.
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {onResetApp && (
            <div className="bg-white p-6 rounded-2xl border border-red-200 shadow-sm space-y-4" id="owner-reset-panel">
              <div className="flex items-center gap-2 border-b border-red-100 pb-3">
                <Trash2 className="h-5 w-5 text-red-600" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Сброс данных программы</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Необратимое удаление данных.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/40 space-y-3">
                  <span className="text-xs font-bold text-slate-800 block">Сброс с сохранением тарифов</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Удаляются визиты, касса, солярий, зарплаты, сертификаты, долги и настройки интерфейса.
                    Сохраняются: тарифы (эквайринг, солярий), калькулятор услуг, сотрудники, пароль владелицы.
                  </p>
                  {confirmResetMode === "preserveTariffs" ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={resetConfirmWord}
                        onChange={(e) => setResetConfirmWord(e.target.value)}
                        placeholder="Введите СБРОС"
                        className="w-full px-3 py-2 rounded-lg border border-red-200 text-sm font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-red-300"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => confirmReset("preserveTariffs")}
                        className="w-full py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white"
                      >
                        Подтвердить сброс
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startReset("preserveTariffs")}
                      className="w-full py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      Сбросить данные
                    </button>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-red-200 bg-red-50/40 space-y-3">
                  <span className="text-xs font-bold text-red-800 block">Полный сброс (включая тарифы)</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Всё из варианта слева, плюс сброс тарифов, цен материалов, формул калькулятора,
                    ставок администраторов и списка сотрудников к заводским значениям.
                  </p>
                  {confirmResetMode === "full" ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={resetConfirmWord}
                        onChange={(e) => setResetConfirmWord(e.target.value)}
                        placeholder="Введите СБРОС"
                        className="w-full px-3 py-2 rounded-lg border border-red-200 text-sm font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-red-300"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => confirmReset("full")}
                        className="w-full py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider bg-red-700 hover:bg-red-800 text-white"
                      >
                        Подтвердить полный сброс
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startReset("full")}
                      className="w-full py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white"
                    >
                      Полный сброс
                    </button>
                  )}
                </div>
              </div>

              {confirmResetMode && (
                <button
                  type="button"
                  onClick={cancelReset}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                >
                  Отмена
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
