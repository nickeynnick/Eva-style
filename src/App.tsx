import React, { useState, useEffect } from "react";
import { 
  Employee, 
  Visit, 
  SolariumSession, 
  ExtraTransaction, 
  MasterTransaction, 
  AdminShift, 
  DailyCashState, 
  SettingsRule, 
  RawMaterialPrices, 
  AdminDayOfWeekRate, 
  AdminDaysRateRule,
  Position,
  GiftCertificate,
  DebtRecord,
} from "./types";
import {
  INITIAL_EMPLOYEES,
  INITIAL_VISITS,
  INITIAL_SOLARIUM_SESSIONS,
  INITIAL_EXTRA_TRANSACTIONS,
  INITIAL_MASTER_TRANSACTIONS,
  INITIAL_ADMIN_SHIFTS,
  INITIAL_DAILY_CASH,
  INITIAL_SETTINGS_RULES,
  INITIAL_RAW_MATERIAL_PRICES,
  INITIAL_ADMIN_DAYS_RATES,
  INITIAL_MATERIAL_PACKAGING,
  INITIAL_MATERIAL_CONSUMPTIONS,
  INITIAL_ADMIN_DAYS_RATES_RULES,
  DEFAULT_APP_PREFERENCES,
} from "./initialData";
import { confirmResetAction, getResetSuccessMessage, ResetAppMode } from "./utils/resetAppData";

// Components
import DailyAccounting from "./components/DailyAccounting";
import ServiceCalculator from "./components/ServiceCalculator";
import Solarium from "./components/Solarium";
import MasterSalaries from "./components/MasterSalaries";
import AdminSalaries from "./components/AdminSalaries";
import OwnerSection from "./components/OwnerSection";
import OwnerPasswordPrompt from "./components/OwnerPasswordPrompt";
import InteractiveHelp from "./components/InteractiveHelp";
import CertificatesAndDebts from "./components/CertificatesAndDebts";

import { 
  Heart, 
  Activity, 
  Database, 
  Sun, 
  PlusCircle, 
  FileText, 
  ShieldCheck, 
  Menu, 
  Download, 
  Upload,
  Clock,
} from "lucide-react";

export default function App() {
  // Navigation active state
  const [activeTab, setActiveTab] = useState<string>("accounting");

  // Real-time Header Clock
  const [timeStr, setTimeStr] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
      setDateStr(now.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Selected date synchronized globally (defaults to current date, matching timezone)
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateString());

  // --- CORE SYSTEM STATES WITH LOCAL STORAGE RECOVERY ---
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem("eva_style_employees");
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });

  const [visits, setVisits] = useState<Visit[]>(() => {
    const saved = localStorage.getItem("eva_style_visits");
    return saved ? JSON.parse(saved) : INITIAL_VISITS;
  });

  const [solariumSessions, setSolariumSessions] = useState<SolariumSession[]>(() => {
    const saved = localStorage.getItem("eva_style_solarium_sessions");
    return saved ? JSON.parse(saved) : INITIAL_SOLARIUM_SESSIONS;
  });

  const [extraTransactions, setExtraTransactions] = useState<ExtraTransaction[]>(() => {
    const saved = localStorage.getItem("eva_style_extra_transactions");
    return saved ? JSON.parse(saved) : INITIAL_EXTRA_TRANSACTIONS;
  });

  const [masterTransactions, setMasterTransactions] = useState<MasterTransaction[]>(() => {
    const saved = localStorage.getItem("eva_style_master_transactions");
    return saved ? JSON.parse(saved) : INITIAL_MASTER_TRANSACTIONS;
  });

  const [adminShifts, setAdminShifts] = useState<AdminShift[]>(() => {
    const saved = localStorage.getItem("eva_style_admin_shifts");
    return saved ? JSON.parse(saved) : INITIAL_ADMIN_SHIFTS;
  });

  const [dailyCash, setDailyCash] = useState<DailyCashState[]>(() => {
    const saved = localStorage.getItem("eva_style_daily_cash");
    return saved ? JSON.parse(saved) : INITIAL_DAILY_CASH;
  });

  const [giftCertificates, setGiftCertificates] = useState<GiftCertificate[]>(() => {
    const saved = localStorage.getItem("eva_style_gift_certificates");
    return saved ? JSON.parse(saved) : [];
  });

  const [debtRecords, setDebtRecords] = useState<DebtRecord[]>(() => {
    const saved = localStorage.getItem("eva_style_debt_records");
    return saved ? JSON.parse(saved) : [];
  });

  const [settingsRules, setSettingsRules] = useState<SettingsRule[]>(() => {
    const saved = localStorage.getItem("eva_style_settings_rules");
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS_RULES;
  });

  const [materialPrices, setMaterialPrices] = useState<RawMaterialPrices>(() => {
    const saved = localStorage.getItem("eva_style_material_prices");
    return saved ? JSON.parse(saved) : INITIAL_RAW_MATERIAL_PRICES;
  });

  const [materialPackaging, setMaterialPackaging] = useState<Record<string, { price: number; volume: number }>>(() => {
    const saved = localStorage.getItem("eva_style_material_packaging");
    if (saved) return JSON.parse(saved);
    return INITIAL_MATERIAL_PACKAGING;
  });

  const [materialConsumptions, setMaterialConsumptions] = useState(() => {
    const saved = localStorage.getItem("eva_style_material_consumptions");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        let modified = false;
        if (parsed.lamination && parsed.lamination.короткие && (parsed.lamination.короткие.baseCost === undefined || parsed.lamination.короткие.constant > 200)) {
          parsed.lamination.короткие.baseCost = 1000;
          parsed.lamination.короткие.constant = 105;
          parsed.lamination.средние.baseCost = 1300;
          parsed.lamination.средние.constant = 125;
          parsed.lamination.удлиненные.baseCost = 1500;
          parsed.lamination.удлиненные.constant = 150;
          parsed.lamination.длинные.baseCost = 1800;
          parsed.lamination.длинные.constant = 150;
          modified = true;
        }
        if (parsed.biocurl && parsed.biocurl.короткие && (parsed.biocurl.короткие.baseCost === undefined || parsed.biocurl.короткие.constant > 200)) {
          parsed.biocurl.короткие.baseCost = 1000;
          parsed.biocurl.короткие.constant = 100;
          parsed.biocurl.средние.baseCost = 1200;
          parsed.biocurl.средние.constant = 120;
          parsed.biocurl.удлиненные.baseCost = 1400;
          parsed.biocurl.удлиненные.constant = 140;
          parsed.biocurl.длинные.baseCost = 1600;
          parsed.biocurl.длинные.constant = 150;
          modified = true;
        }
        if (parsed.biocurl && !parsed.biocurl["частичная"]) {
          parsed.biocurl["частичная"] = { shampoo: 5, base: 4, lotionOne: 10, lotionTwo: 10, cond: 10, serum: 8, constant: 80, baseCost: 800 };
          modified = true;
        }
        if (modified) {
          localStorage.setItem("eva_style_material_consumptions", JSON.stringify(parsed));
        }
        return parsed;
      } catch (e) {
        console.error("Error migrating material consumptions", e);
      }
    }

    // Excel default lamination values from screenshot & sensible biocurl defaults
    return INITIAL_MATERIAL_CONSUMPTIONS;
  });

  const [adminDaysRates, setAdminDaysRates] = useState<AdminDayOfWeekRate>(() => {
    const saved = localStorage.getItem("eva_style_admin_days_rates");
    return saved ? JSON.parse(saved) : INITIAL_ADMIN_DAYS_RATES;
  });

  const [adminDaysRatesRules, setAdminDaysRatesRules] = useState<AdminDaysRateRule[]>(() => {
    const saved = localStorage.getItem("eva_style_admin_days_rates_rules");
    if (saved) return JSON.parse(saved);
    return INITIAL_ADMIN_DAYS_RATES_RULES;
  });

  const [showDeletedVisits, setShowDeletedVisits] = useState<boolean>(() => {
    const saved = localStorage.getItem("eva_style_show_deleted_visits");
    return saved ? JSON.parse(saved) : true;
  });

  const [allowDeleteVisits, setAllowDeleteVisits] = useState<boolean>(() => {
    const saved = localStorage.getItem("eva_style_allow_delete_visits");
    return saved ? JSON.parse(saved) : true;
  });

  const [allowDeleteCertificates, setAllowDeleteCertificates] = useState<boolean>(() => {
    const saved = localStorage.getItem("eva_style_allow_delete_certificates");
    return saved ? JSON.parse(saved) : true;
  });

  const [showVisitChangeHistory, setShowVisitChangeHistory] = useState<boolean>(() => {
    const saved = localStorage.getItem("eva_style_show_visit_change_history");
    return saved ? JSON.parse(saved) : true;
  });

  const [allowMasterPayouts, setAllowMasterPayouts] = useState<boolean>(() => {
    const saved = localStorage.getItem("eva_style_allow_master_payouts");
    return saved ? JSON.parse(saved) : true;
  });

  const [allowAdminShiftEdits, setAllowAdminShiftEdits] = useState<boolean>(() => {
    const saved = localStorage.getItem("eva_style_allow_admin_shift_edits");
    return saved ? JSON.parse(saved) : true;
  });

  const [hideFormulaCalculations, setHideFormulaCalculations] = useState<boolean>(() => {
    const saved = localStorage.getItem("eva_style_hide_formula_calculations");
    return saved ? JSON.parse(saved) : false;
  });

  const [ownerPassword, setOwnerPassword] = useState<string>(() => {
    return localStorage.getItem("eva_style_owner_password") || "";
  });

  const [isOwnerUnlocked, setIsOwnerUnlocked] = useState<boolean>(false);

  const [keepOwnerUnlocked, setKeepOwnerUnlocked] = useState<boolean>(() => {
    const saved = localStorage.getItem("eva_style_keep_owner_unlocked");
    return saved ? JSON.parse(saved) : false;
  });

  const [autoLockDuration, setAutoLockDuration] = useState<number>(() => {
    const saved = localStorage.getItem("eva_style_auto_lock_duration");
    return saved ? JSON.parse(saved) : 5; // default 5 minutes
  });

  // Track last activity timestamp (milliseconds) for the security idle auto-lock
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  // Listen to user interactions to reset lastActivity
  useEffect(() => {
    if (!keepOwnerUnlocked || !ownerPassword || !isOwnerUnlocked) return;

    const handleActivity = () => {
      setLastActivity(Date.now());
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("mousedown", handleActivity);
    window.addEventListener("touchstart", handleActivity);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("mousedown", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
    };
  }, [keepOwnerUnlocked, ownerPassword, isOwnerUnlocked]);

  // Lock automatically when inactive
  useEffect(() => {
    if (!keepOwnerUnlocked || !ownerPassword || !isOwnerUnlocked) return;

    const interval = setInterval(() => {
      const elapsedMs = Date.now() - lastActivity;
      const durationMs = autoLockDuration * 60 * 1000;
      if (elapsedMs >= durationMs) {
        setIsOwnerUnlocked(false);
      }
    }, 2000); // Check every 2 seconds for responsive reaction

    return () => clearInterval(interval);
  }, [keepOwnerUnlocked, ownerPassword, isOwnerUnlocked, lastActivity, autoLockDuration]);

  // --- SYNCHRONIZE BACK TO LOCAL STORAGE ON MUTATION ---
  useEffect(() => {
    localStorage.setItem("eva_style_employees", JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem("eva_style_visits", JSON.stringify(visits));
  }, [visits]);

  useEffect(() => {
    localStorage.setItem("eva_style_solarium_sessions", JSON.stringify(solariumSessions));
  }, [solariumSessions]);

  useEffect(() => {
    localStorage.setItem("eva_style_extra_transactions", JSON.stringify(extraTransactions));
  }, [extraTransactions]);

  useEffect(() => {
    localStorage.setItem("eva_style_master_transactions", JSON.stringify(masterTransactions));
  }, [masterTransactions]);

  useEffect(() => {
    localStorage.setItem("eva_style_admin_shifts", JSON.stringify(adminShifts));
  }, [adminShifts]);

  useEffect(() => {
    localStorage.setItem("eva_style_daily_cash", JSON.stringify(dailyCash));
  }, [dailyCash]);

  useEffect(() => {
    localStorage.setItem("eva_style_gift_certificates", JSON.stringify(giftCertificates));
  }, [giftCertificates]);

  useEffect(() => {
    localStorage.setItem("eva_style_debt_records", JSON.stringify(debtRecords));
  }, [debtRecords]);

  useEffect(() => {
    localStorage.setItem("eva_style_settings_rules", JSON.stringify(settingsRules));
  }, [settingsRules]);

  useEffect(() => {
    localStorage.setItem("eva_style_material_prices", JSON.stringify(materialPrices));
  }, [materialPrices]);

  useEffect(() => {
    localStorage.setItem("eva_style_material_packaging", JSON.stringify(materialPackaging));
    // Calculate R/ml based on package price and package volume
    setMaterialPrices({
      shampooProscenia: materialPackaging.shampooProscenia.price / (materialPackaging.shampooProscenia.volume || 1),
      lotionAcPretreatment: materialPackaging.lotionAcPretreatment.price / (materialPackaging.lotionAcPretreatment.volume || 1),
      laminatingGel: materialPackaging.laminatingGel.price / (materialPackaging.laminatingGel.volume || 1),
      maskProscenia: materialPackaging.maskProscenia.price / (materialPackaging.maskProscenia.volume || 1),
      shampooProeditCurlFit: materialPackaging.shampooProeditCurlFit.price / (materialPackaging.shampooProeditCurlFit.volume || 1),
      basePliaBase: materialPackaging.basePliaBase.price / (materialPackaging.basePliaBase.volume || 1),
      lotionPliaStep1: materialPackaging.lotionPliaStep1.price / (materialPackaging.lotionPliaStep1.volume || 1),
      lotionPliaStep2: materialPackaging.lotionPliaStep2.price / (materialPackaging.lotionPliaStep2.volume || 1),
      conditionerPearl: materialPackaging.conditionerPearl.price / (materialPackaging.conditionerPearl.volume || 1),
      serumAfterPerm: materialPackaging.serumAfterPerm.price / (materialPackaging.serumAfterPerm.volume || 1),
    });
  }, [materialPackaging]);

  useEffect(() => {
    localStorage.setItem("eva_style_material_consumptions", JSON.stringify(materialConsumptions));
  }, [materialConsumptions]);

  useEffect(() => {
    localStorage.setItem("eva_style_admin_days_rates", JSON.stringify(adminDaysRates));
  }, [adminDaysRates]);

  useEffect(() => {
    localStorage.setItem("eva_style_admin_days_rates_rules", JSON.stringify(adminDaysRatesRules));
  }, [adminDaysRatesRules]);

  useEffect(() => {
    localStorage.setItem("eva_style_show_deleted_visits", JSON.stringify(showDeletedVisits));
  }, [showDeletedVisits]);

  useEffect(() => {
    localStorage.setItem("eva_style_allow_delete_visits", JSON.stringify(allowDeleteVisits));
  }, [allowDeleteVisits]);

  useEffect(() => {
    localStorage.setItem("eva_style_allow_delete_certificates", JSON.stringify(allowDeleteCertificates));
  }, [allowDeleteCertificates]);

  useEffect(() => {
    localStorage.setItem("eva_style_show_visit_change_history", JSON.stringify(showVisitChangeHistory));
  }, [showVisitChangeHistory]);

  useEffect(() => {
    localStorage.setItem("eva_style_allow_master_payouts", JSON.stringify(allowMasterPayouts));
  }, [allowMasterPayouts]);

  useEffect(() => {
    localStorage.setItem("eva_style_allow_admin_shift_edits", JSON.stringify(allowAdminShiftEdits));
  }, [allowAdminShiftEdits]);

  useEffect(() => {
    localStorage.setItem("eva_style_hide_formula_calculations", JSON.stringify(hideFormulaCalculations));
  }, [hideFormulaCalculations]);

  useEffect(() => {
    localStorage.setItem("eva_style_owner_password", ownerPassword);
  }, [ownerPassword]);

  useEffect(() => {
    localStorage.setItem("eva_style_keep_owner_unlocked", JSON.stringify(keepOwnerUnlocked));
  }, [keepOwnerUnlocked]);

  useEffect(() => {
    localStorage.setItem("eva_style_auto_lock_duration", JSON.stringify(autoLockDuration));
  }, [autoLockDuration]);

  useEffect(() => {
    if (activeTab !== "owner" && !keepOwnerUnlocked) {
      setIsOwnerUnlocked(false);
    }
  }, [activeTab, keepOwnerUnlocked]);


  // Active settings refers to the latest added settings rule
  const activeSettings = settingsRules[0] || {
    id: "default-rule",
    effectiveDate: "2020-01-01",
    acquiringCommission: 3.5,
    adminBaseRate: 1500,
    solariumMinuteRate: 30
  };

  // Administrative Backup utility to let Owner export/import SQLite alternatives
  const handleResetApp = (mode: ResetAppMode) => {
    const preserveTariffs = mode === "preserveTariffs";
    const description = preserveTariffs
      ? "Сбросить все операционные данные (визиты, кассу, зарплаты, сертификаты, долги) и настройки интерфейса?\n\nТарифы, сотрудники и пароль владелицы будут сохранены."
      : "Полный сброс: удалить ВСЕ данные и восстановить заводские тарифы, сотрудников и настройки калькулятора?\n\nПароль владелицы будет сохранён.";

    if (!confirmResetAction(description)) return;

    // Принудительный экспорт текущих данных перед сбросом
    handleExportBackup();

    setVisits(INITIAL_VISITS);
    setSolariumSessions(INITIAL_SOLARIUM_SESSIONS);
    setExtraTransactions(INITIAL_EXTRA_TRANSACTIONS);
    setMasterTransactions(INITIAL_MASTER_TRANSACTIONS);
    setAdminShifts(INITIAL_ADMIN_SHIFTS);
    setDailyCash(INITIAL_DAILY_CASH);
    setGiftCertificates([]);
    setDebtRecords([]);
    setSelectedDate(getTodayDateString());

    setShowDeletedVisits(DEFAULT_APP_PREFERENCES.showDeletedVisits);
    setAllowDeleteVisits(DEFAULT_APP_PREFERENCES.allowDeleteVisits);
    setAllowDeleteCertificates(DEFAULT_APP_PREFERENCES.allowDeleteCertificates);
    setShowVisitChangeHistory(DEFAULT_APP_PREFERENCES.showVisitChangeHistory);
    setAllowMasterPayouts(DEFAULT_APP_PREFERENCES.allowMasterPayouts);
    setAllowAdminShiftEdits(DEFAULT_APP_PREFERENCES.allowAdminShiftEdits);
    setHideFormulaCalculations(DEFAULT_APP_PREFERENCES.hideFormulaCalculations);
    setKeepOwnerUnlocked(DEFAULT_APP_PREFERENCES.keepOwnerUnlocked);
    setAutoLockDuration(DEFAULT_APP_PREFERENCES.autoLockDuration);
    setIsOwnerUnlocked(false);

    if (!preserveTariffs) {
      setSettingsRules(INITIAL_SETTINGS_RULES);
      setMaterialPackaging(INITIAL_MATERIAL_PACKAGING);
      setMaterialConsumptions(INITIAL_MATERIAL_CONSUMPTIONS);
      setAdminDaysRates(INITIAL_ADMIN_DAYS_RATES);
      setAdminDaysRatesRules(INITIAL_ADMIN_DAYS_RATES_RULES);
      setEmployees(INITIAL_EMPLOYEES);
      setMaterialPrices(INITIAL_RAW_MATERIAL_PRICES);
    }

    alert(getResetSuccessMessage(mode));
  };

  const handleExportBackup = () => {
    const data = {
      employees,
      visits,
      solariumSessions,
      extraTransactions,
      masterTransactions,
      adminShifts,
      dailyCash,
      settingsRules,
      materialPrices,
      adminDaysRates,
      adminDaysRatesRules,
      giftCertificates,
      debtRecords,
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute("download", `eva_style_export_${selectedDate}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.employees) setEmployees(parsed.employees);
          if (parsed.visits) setVisits(parsed.visits);
          if (parsed.solariumSessions) setSolariumSessions(parsed.solariumSessions);
          if (parsed.extraTransactions) setExtraTransactions(parsed.extraTransactions);
          if (parsed.masterTransactions) setMasterTransactions(parsed.masterTransactions);
          if (parsed.adminShifts) setAdminShifts(parsed.adminShifts);
          if (parsed.dailyCash) setDailyCash(parsed.dailyCash);
          if (parsed.settingsRules) setSettingsRules(parsed.settingsRules);
          if (parsed.materialPrices) setMaterialPrices(parsed.materialPrices);
          if (parsed.adminDaysRates) setAdminDaysRates(parsed.adminDaysRates);
          if (parsed.adminDaysRatesRules) setAdminDaysRatesRules(parsed.adminDaysRatesRules);
          if (parsed.giftCertificates) setGiftCertificates(parsed.giftCertificates);
          if (parsed.debtRecords) setDebtRecords(parsed.debtRecords);
          alert("Локальная резервная копия успешно восстановлена!");
        } catch (err) {
          alert("Неверный формат резервного файла!");
        }
      };
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800" id="eva_style_root">
      {/* Top High Density Administrative Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm" id="app-header-bar">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-12 flex items-center justify-between">
          
          {/* Logo & Brand Indicator */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-rose-50 border border-rose-100 rounded flex items-center justify-center text-rose-600 transition-transform">
              <Heart className="h-4 w-4 fill-rose-600 text-rose-600" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 tracking-tight font-sans leading-none">Ева-стиль</h1>
              <p className="text-[9px] text-slate-400 font-mono tracking-wider uppercase mt-0.5">Учетный пульт</p>
            </div>
          </div>

          {/* Connection Status Badge & Actions */}
          <div className="flex items-center gap-3">
            {timeStr && (
              <div 
                className="flex items-center gap-1.5 bg-rose-50/50 border border-rose-100/70 text-slate-700 text-xs py-1 px-2.5 rounded font-mono font-bold leading-none flex items-center gap-1.5"
                id="header-clock-display"
              >
                <Clock className="h-3.5 w-3.5 text-rose-500" />
                <span>{dateStr} {timeStr}</span>
              </div>
            )}

            <div 
              className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-600 text-[10px] py-1 px-2.5 rounded font-mono font-bold uppercase tracking-wider"
              id="db-status-indicator"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
              </span>
              Локальная БД: On
            </div>

            {/* Quick backup actions */}
            <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
              <button
                onClick={handleExportBackup}
                className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-50 transition-colors"
                title="Экспорт резервной копии"
              >
                <Upload className="h-3.5 w-3.5" />
              </button>
              <label 
                className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-50 transition-colors cursor-pointer"
                title="Импорт резервной копии"
              >
                <Download className="h-3.5 w-3.5" />
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleImportBackup} 
                  className="hidden" 
                />
              </label>
            </div>
          </div>
        </div>

        {/* Tab Headers Navigation Drawer */}
        <div className="bg-slate-50 border-t border-slate-200" id="tabs-navigation-panel">
          <div className="max-w-7xl mx-auto px-3">
            <nav className="flex space-x-1 py-1 overflow-x-auto scrollbar-none" aria-label="Tabs">
              {[
                { id: "accounting", name: "Учет за день" },
                { id: "certificates", name: "Сертификаты" },
                { id: "calculator", name: "Калькулятор услуг" },
                { id: "solarium", name: "Солярий" },
                { id: "salaries", name: "Зарплаты" },
                { id: "adminShifts", name: "Табель администраторов" },
                { id: "owner", name: "Владелица" },
                { id: "help", name: "Справка 📖" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap rounded py-1 px-2.5 text-[10px] font-bold uppercase tracking-wider transition-all ${
                    activeTab === tab.id
                      ? "bg-rose-50 text-rose-700 border border-rose-200 shadow-xs"
                      : "text-slate-500 border border-transparent hover:text-slate-800 hover:bg-slate-200/50"
                  }`}
                  id={`tab-btn-${tab.id}`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Container Viewport — вкладки остаются смонтированными, чтобы не сбрасывать ввод */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 py-3" id="view-viewport">
        <div className={activeTab === "accounting" ? "" : "hidden"} aria-hidden={activeTab !== "accounting"}>
          <DailyAccounting
            employees={employees}
            visits={visits}
            setVisits={setVisits}
            solariumSessions={solariumSessions}
            extraTransactions={extraTransactions}
            setExtraTransactions={setExtraTransactions}
            dailyCash={dailyCash}
            setDailyCash={setDailyCash}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            activeSettings={activeSettings}
            masterTransactions={masterTransactions}
            giftCertificates={giftCertificates}
            setGiftCertificates={setGiftCertificates}
            debtRecords={debtRecords}
            setDebtRecords={setDebtRecords}
            showDeletedVisits={showDeletedVisits}
            allowDeleteVisits={allowDeleteVisits}
            showVisitChangeHistory={showVisitChangeHistory}
          />
        </div>

        <div className={activeTab === "certificates" ? "" : "hidden"} aria-hidden={activeTab !== "certificates"}>
          <CertificatesAndDebts
            giftCertificates={giftCertificates}
            setGiftCertificates={setGiftCertificates}
            debtRecords={debtRecords}
            setDebtRecords={setDebtRecords}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            activeSettings={activeSettings}
            allowDeleteCertificates={allowDeleteCertificates}
          />
        </div>

        <div className={activeTab === "calculator" ? "" : "hidden"} aria-hidden={activeTab !== "calculator"}>
          <ServiceCalculator
            materialPrices={materialPrices}
            materialConsumptions={materialConsumptions}
            hideFormulaCalculations={hideFormulaCalculations}
          />
        </div>

        <div className={activeTab === "solarium" ? "" : "hidden"} aria-hidden={activeTab !== "solarium"}>
          <Solarium
            solariumSessions={solariumSessions}
            setSolariumSessions={setSolariumSessions}
            activeSettings={activeSettings}
            selectedDate={selectedDate}
          />
        </div>

        <div className={activeTab === "salaries" ? "" : "hidden"} aria-hidden={activeTab !== "salaries"}>
          <MasterSalaries
            employees={employees}
            visits={visits}
            masterTransactions={masterTransactions}
            setMasterTransactions={setMasterTransactions}
            selectedDate={selectedDate}
            adminShifts={adminShifts}
            allowPayouts={allowMasterPayouts}
          />
        </div>

        <div className={activeTab === "adminShifts" ? "" : "hidden"} aria-hidden={activeTab !== "adminShifts"}>
          <AdminSalaries
            employees={employees}
            adminShifts={adminShifts}
            setAdminShifts={setAdminShifts}
            adminDaysRates={adminDaysRates}
            adminDaysRatesRules={adminDaysRatesRules}
            selectedDate={selectedDate}
            allowAdminShiftEdits={allowAdminShiftEdits}
          />
        </div>

        <div className={activeTab === "owner" ? "" : "hidden"} aria-hidden={activeTab !== "owner"}>
          {ownerPassword && !isOwnerUnlocked ? (
            <OwnerPasswordPrompt
              correctPasswordHash={ownerPassword}
              onUnlock={() => setIsOwnerUnlocked(true)}
              onResetSuccess={() => {
                setOwnerPassword("");
                setIsOwnerUnlocked(true);
              }}
            />
          ) : (
            <OwnerSection
              employees={employees}
              setEmployees={setEmployees}
              settingsRules={settingsRules}
              setSettingsRules={setSettingsRules}
              materialPrices={materialPrices}
              setMaterialPrices={setMaterialPrices}
              materialPackaging={materialPackaging}
              setMaterialPackaging={setMaterialPackaging}
              materialConsumptions={materialConsumptions}
              setMaterialConsumptions={setMaterialConsumptions}
              adminDaysRates={adminDaysRates}
              setAdminDaysRates={setAdminDaysRates}
              adminDaysRatesRules={adminDaysRatesRules}
              setAdminDaysRatesRules={setAdminDaysRatesRules}
              extraTransactions={extraTransactions}
              setExtraTransactions={setExtraTransactions}
              visits={visits}
              solariumSessions={solariumSessions}
              adminShifts={adminShifts}
              masterTransactions={masterTransactions}
              activeSettingsIdx={0}
              showDeletedVisits={showDeletedVisits}
              setShowDeletedVisits={setShowDeletedVisits}
              allowDeleteVisits={allowDeleteVisits}
              setAllowDeleteVisits={setAllowDeleteVisits}
              allowDeleteCertificates={allowDeleteCertificates}
              setAllowDeleteCertificates={setAllowDeleteCertificates}
              showVisitChangeHistory={showVisitChangeHistory}
              setShowVisitChangeHistory={setShowVisitChangeHistory}
              allowMasterPayouts={allowMasterPayouts}
              setAllowMasterPayouts={setAllowMasterPayouts}
              allowAdminShiftEdits={allowAdminShiftEdits}
              setAllowAdminShiftEdits={setAllowAdminShiftEdits}
              hideFormulaCalculations={hideFormulaCalculations}
              setHideFormulaCalculations={setHideFormulaCalculations}
              ownerPassword={ownerPassword}
              setOwnerPassword={setOwnerPassword}
              keepOwnerUnlocked={keepOwnerUnlocked}
              setKeepOwnerUnlocked={setKeepOwnerUnlocked}
              autoLockDuration={autoLockDuration}
              setAutoLockDuration={setAutoLockDuration}
              onLock={() => setIsOwnerUnlocked(false)}
              onResetApp={handleResetApp}
            />
          )}
        </div>

        <div className={activeTab === "help" ? "" : "hidden"} aria-hidden={activeTab !== "help"}>
          <InteractiveHelp />
        </div>
      </main>

      {/* High Density Status Footer */}
      <footer className="bg-slate-200 border-t border-slate-300 py-1.5 px-3 flex flex-wrap items-center justify-between text-[10px] font-mono font-medium text-slate-500 shrink-0 select-none uppercase tracking-wider" id="app-footer">
        <div className="flex gap-4 items-center">
          <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>Система: <span className="text-slate-800 font-bold">Online</span></span>
          <span className="hidden sm:inline border-l border-slate-300 pl-4 text-slate-400">Связь: <span className="text-slate-700">ОК</span></span>
          <span className="hidden md:inline border-l border-slate-300 pl-4 text-slate-400">Шифрование сессий: <span className="text-rose-700 font-bold">Активно</span></span>
        </div>
        <div className="text-[10px] text-slate-500 font-bold">
          © 2026 Ева-стиль v1.0.4 · Windows
        </div>
      </footer>
    </div>
  );
}
