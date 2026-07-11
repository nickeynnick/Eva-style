import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from "react";
import {
  Heart,
  Download,
  Upload,
  Clock,
} from "lucide-react";
import { getResetSuccessMessage, ResetAppMode } from "./utils/resetAppData";
import { serializeBackup, shouldRunAutoBackup } from "./utils/backupData";
import { validateBackupImport } from "./utils/backupImport";
import GlobalSearch from "./components/GlobalSearch";
import WelcomeOverlay from "./components/WelcomeOverlay";
import ImportPreviewModal from "./components/ImportPreviewModal";
import WhatsNewModal from "./components/WhatsNewModal";
import { getChangelogForVersion } from "./data/changelog";
import {
  useAppStore,
  useStorePreferences,
  useStoreMeta,
  AppStorePatch,
} from "./store";

import DailyAccounting from "./components/DailyAccounting";

const CertificatesAndDebts = lazy(() => import("./components/CertificatesAndDebts"));
const ServiceCalculator = lazy(() => import("./components/ServiceCalculator"));
const Solarium = lazy(() => import("./components/Solarium"));
const MasterSalaries = lazy(() => import("./components/MasterSalaries"));
const AdminSalaries = lazy(() => import("./components/AdminSalaries"));
const OwnerSection = lazy(() => import("./components/OwnerSection"));
const OwnerPasswordPrompt = lazy(() => import("./components/OwnerPasswordPrompt"));
const InteractiveHelp = lazy(() => import("./components/InteractiveHelp"));

const APP_VERSION = "1.2.0";

function TabFallback() {
  return (
    <div className="flex items-center justify-center py-16 text-slate-400 text-xs font-mono uppercase tracking-wider">
      Загрузка…
    </div>
  );
}

export default function App() {
  const { state, patch, setMaterialPackaging, importBackup, resetApp, buildBackupPayload } = useAppStore();
  const { preferences, setPreference } = useStorePreferences();
  const { meta, setMeta } = useStoreMeta();

  const [activeTab, setActiveTab] = useState("accounting");
  const [mountedTabs, setMountedTabs] = useState<Set<string>>(() => new Set(["accounting"]));
  const [isOwnerUnlocked, setIsOwnerUnlocked] = useState(false);
  const [importPreview, setImportPreview] = useState<ReturnType<typeof validateBackupImport> | null>(null);
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  const getTodayDateString = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  };
  const [selectedDateUi, setSelectedDateUi] = useState(getTodayDateString);

  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");
  const [lastActivity, setLastActivity] = useState(Date.now());

  const backupPayloadRef = useRef(buildBackupPayload);
  backupPayloadRef.current = buildBackupPayload;

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

  useEffect(() => {
    setMountedTabs((prev) => new Set(prev).add(activeTab));
  }, [activeTab]);

  useEffect(() => {
    if (meta.seenAppVersion !== APP_VERSION) {
      const entry = getChangelogForVersion(APP_VERSION);
      if (entry) setShowWhatsNew(true);
    }
  }, [meta.seenAppVersion]);

  useEffect(() => {
    if (activeTab !== "owner" && !preferences.keepOwnerUnlocked) {
      setIsOwnerUnlocked(false);
    }
  }, [activeTab, preferences.keepOwnerUnlocked]);

  useEffect(() => {
    if (!preferences.keepOwnerUnlocked || !meta.ownerPassword || !isOwnerUnlocked) return;
    const handleActivity = () => setLastActivity(Date.now());
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
  }, [preferences.keepOwnerUnlocked, meta.ownerPassword, isOwnerUnlocked]);

  useEffect(() => {
    if (!preferences.keepOwnerUnlocked || !meta.ownerPassword || !isOwnerUnlocked) return;
    const interval = setInterval(() => {
      if (Date.now() - lastActivity >= preferences.autoLockDuration * 60 * 1000) {
        setIsOwnerUnlocked(false);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [preferences.keepOwnerUnlocked, meta.ownerPassword, isOwnerUnlocked, lastActivity, preferences.autoLockDuration]);

  useEffect(() => {
    if (!preferences.autoBackupEnabled) return;
    const runAutoBackup = async () => {
      const todayStr = getTodayDateString();
      if (!shouldRunAutoBackup(preferences.autoBackupInterval, meta.lastAutoBackupDate, todayStr)) return;
      const desktop = (window as { evaStyleDesktop?: { isDesktop?: boolean; autoSaveBackup?: (p: { fileName: string; content: string }) => Promise<{ success: boolean }> } }).evaStyleDesktop;
      if (!desktop?.isDesktop || !desktop.autoSaveBackup) return;
      const content = serializeBackup(backupPayloadRef.current());
      const result = await desktop.autoSaveBackup({ fileName: `eva_style_auto_${todayStr}.json`, content });
      if (result.success) setMeta({ lastAutoBackupDate: todayStr });
    };
    runAutoBackup();
    const interval = setInterval(runAutoBackup, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [preferences.autoBackupEnabled, preferences.autoBackupInterval, meta.lastAutoBackupDate, setMeta]);

  const bindSetter = useCallback(
    <K extends keyof typeof state>(key: K) =>
      (value: (typeof state)[K] | ((prev: (typeof state)[K]) => (typeof state)[K])) => {
        const next =
          typeof value === "function"
            ? (value as (prev: (typeof state)[K]) => (typeof state)[K])(state[key])
            : value;
        patch({ [key]: next } as AppStorePatch);
      },
    [patch, state]
  );

  const handleResetApp = (mode: ResetAppMode) => {
    resetApp(mode);
    setSelectedDateUi(getTodayDateString());
    alert(getResetSuccessMessage(mode));
  };

  const handleExportBackup = async () => {
    const content = serializeBackup(buildBackupPayload());
    const fileName = `eva_style_export_${selectedDateUi}.json`;
    const desktop = (window as { evaStyleDesktop?: { isDesktop?: boolean; saveBackup?: (p: { fileName: string; content: string }) => Promise<{ success: boolean }> } }).evaStyleDesktop;
    if (desktop?.isDesktop && desktop.saveBackup) {
      await desktop.saveBackup({ fileName, content });
    } else {
      const a = document.createElement("a");
      a.href = `data:text/json;charset=utf-8,${encodeURIComponent(content)}`;
      a.download = fileName;
      a.click();
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        setImportPreview(validateBackupImport(parsed));
      } catch {
        setImportPreview({
          valid: false,
          errors: ["Неверный формат JSON"],
          warnings: [],
          preview: null,
          payload: null,
        });
      }
    };
    reader.readAsText(file, "UTF-8");
    e.target.value = "";
  };

  const changelogEntry = getChangelogForVersion(APP_VERSION);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800" id="eva_style_root">
      <WelcomeOverlay />
      {showWhatsNew && changelogEntry && (
        <WhatsNewModal
          entry={changelogEntry}
          onDismiss={() => {
            setMeta({ seenAppVersion: APP_VERSION });
            setShowWhatsNew(false);
          }}
        />
      )}
      {importPreview && (
        <ImportPreviewModal
          result={importPreview}
          onCancel={() => setImportPreview(null)}
          onConfirm={() => {
            if (importPreview.payload) importBackup(importPreview.payload);
            setImportPreview(null);
            alert("Локальная резервная копия успешно восстановлена!");
          }}
        />
      )}

      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm" id="app-header-bar">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-rose-50 border border-rose-100 rounded flex items-center justify-center text-rose-600">
              <Heart className="h-4 w-4 fill-rose-600 text-rose-600" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-none">Ева-стиль</h1>
              <p className="text-[9px] text-slate-400 font-mono tracking-wider uppercase mt-0.5">Учетный пульт</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {timeStr && (
              <div className="flex items-center gap-1.5 bg-rose-50/50 border border-rose-100/70 text-slate-700 text-xs py-1 px-2.5 rounded font-mono font-bold" id="header-clock-display">
                <Clock className="h-3.5 w-3.5 text-rose-500" />
                <span>{dateStr} {timeStr}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-600 text-[10px] py-1 px-2.5 rounded font-mono font-bold uppercase tracking-wider" id="db-status-indicator">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500" />
              </span>
              Store v{state.schemaVersion}
            </div>
            <div className="flex items-center gap-1 border-l border-slate-200 pl-3">
              <GlobalSearch
                visits={state.visits}
                giftCertificates={state.giftCertificates}
                debtRecords={state.debtRecords}
                onSelectVisit={(date) => { setSelectedDateUi(date); setActiveTab("accounting"); }}
                onSelectCertificate={() => setActiveTab("certificates")}
                onSelectDebt={() => setActiveTab("certificates")}
              />
              <button onClick={handleExportBackup} className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-50" title="Экспорт резервной копии">
                <Download className="h-3.5 w-3.5" />
              </button>
              <label className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-50 cursor-pointer" title="Импорт резервной копии">
                <Upload className="h-3.5 w-3.5" />
                <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
              </label>
            </div>
          </div>
        </div>
        <div className="bg-slate-50 border-t border-slate-200" id="tabs-navigation-panel">
          <div className="max-w-7xl mx-auto px-3">
            <nav className="flex space-x-1 py-1 overflow-x-auto scrollbar-none">
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
                    activeTab === tab.id ? "bg-rose-50 text-rose-700 border border-rose-200 shadow-xs" : "text-slate-500 border border-transparent hover:text-slate-800 hover:bg-slate-200/50"
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

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-4 py-3" id="view-viewport">
        {mountedTabs.has("accounting") && (
          <div className={activeTab === "accounting" ? "" : "hidden"} aria-hidden={activeTab !== "accounting"}>
            <DailyAccounting
              employees={state.employees}
              visits={state.visits}
              setVisits={bindSetter("visits")}
              solariumSessions={state.solariumSessions}
              extraTransactions={state.extraTransactions}
              setExtraTransactions={bindSetter("extraTransactions")}
              dailyCash={state.dailyCash}
              setDailyCash={bindSetter("dailyCash")}
              selectedDate={selectedDateUi}
              setSelectedDate={setSelectedDateUi}
              settingsRules={state.settingsRules}
              masterTransactions={state.masterTransactions}
              giftCertificates={state.giftCertificates}
              setGiftCertificates={bindSetter("giftCertificates")}
              debtRecords={state.debtRecords}
              setDebtRecords={bindSetter("debtRecords")}
              showDeletedVisits={preferences.showDeletedVisits}
              allowDeleteVisits={preferences.allowDeleteVisits}
              showVisitChangeHistory={preferences.showVisitChangeHistory}
            />
          </div>
        )}

        {mountedTabs.has("certificates") && (
          <div className={activeTab === "certificates" ? "" : "hidden"} aria-hidden={activeTab !== "certificates"}>
            <Suspense fallback={<TabFallback />}>
              <CertificatesAndDebts
                giftCertificates={state.giftCertificates}
                setGiftCertificates={bindSetter("giftCertificates")}
                debtRecords={state.debtRecords}
                setDebtRecords={bindSetter("debtRecords")}
                selectedDate={selectedDateUi}
                setSelectedDate={setSelectedDateUi}
                allowDeleteCertificates={preferences.allowDeleteCertificates}
                settingsRules={state.settingsRules}
              />
            </Suspense>
          </div>
        )}

        {mountedTabs.has("calculator") && (
          <div className={activeTab === "calculator" ? "" : "hidden"} aria-hidden={activeTab !== "calculator"}>
            <Suspense fallback={<TabFallback />}>
              <ServiceCalculator
                materialPrices={state.materialPrices}
                materialConsumptions={state.materialConsumptions}
                hideFormulaCalculations={preferences.hideFormulaCalculations}
              />
            </Suspense>
          </div>
        )}

        {mountedTabs.has("solarium") && (
          <div className={activeTab === "solarium" ? "" : "hidden"} aria-hidden={activeTab !== "solarium"}>
            <Suspense fallback={<TabFallback />}>
              <Solarium
                solariumSessions={state.solariumSessions}
                setSolariumSessions={bindSetter("solariumSessions")}
                settingsRules={state.settingsRules}
                selectedDate={selectedDateUi}
              />
            </Suspense>
          </div>
        )}

        {mountedTabs.has("salaries") && (
          <div className={activeTab === "salaries" ? "" : "hidden"} aria-hidden={activeTab !== "salaries"}>
            <Suspense fallback={<TabFallback />}>
              <MasterSalaries
                employees={state.employees}
                visits={state.visits}
                masterTransactions={state.masterTransactions}
                setMasterTransactions={bindSetter("masterTransactions")}
                selectedDate={selectedDateUi}
                adminShifts={state.adminShifts}
                allowPayouts={preferences.allowMasterPayouts}
              />
            </Suspense>
          </div>
        )}

        {mountedTabs.has("adminShifts") && (
          <div className={activeTab === "adminShifts" ? "" : "hidden"} aria-hidden={activeTab !== "adminShifts"}>
            <Suspense fallback={<TabFallback />}>
              <AdminSalaries
                employees={state.employees}
                adminShifts={state.adminShifts}
                setAdminShifts={bindSetter("adminShifts")}
                adminDaysRates={state.adminDaysRates}
                adminDaysRatesRules={state.adminDaysRatesRules}
                selectedDate={selectedDateUi}
                allowAdminShiftEdits={preferences.allowAdminShiftEdits}
                adminPaidWages={state.adminPaidWages}
                setAdminPaidWages={bindSetter("adminPaidWages")}
              />
            </Suspense>
          </div>
        )}

        {mountedTabs.has("owner") && (
          <div className={activeTab === "owner" ? "" : "hidden"} aria-hidden={activeTab !== "owner"}>
            <Suspense fallback={<TabFallback />}>
              {meta.ownerPassword && !isOwnerUnlocked ? (
                <OwnerPasswordPrompt
                  correctPasswordHash={meta.ownerPassword}
                  onUnlock={() => setIsOwnerUnlocked(true)}
                  onResetSuccess={() => {
                    setMeta({ ownerPassword: "" });
                    setIsOwnerUnlocked(true);
                  }}
                />
              ) : (
                <OwnerSection
                  employees={state.employees}
                  setEmployees={bindSetter("employees")}
                  settingsRules={state.settingsRules}
                  setSettingsRules={bindSetter("settingsRules")}
                  materialPrices={state.materialPrices}
                  setMaterialPrices={bindSetter("materialPrices")}
                  materialPackaging={state.materialPackaging}
                  setMaterialPackaging={(v) => {
                    if (typeof v === "function") {
                      setMaterialPackaging(v(state.materialPackaging));
                    } else {
                      setMaterialPackaging(v);
                    }
                  }}
                  materialConsumptions={state.materialConsumptions}
                  setMaterialConsumptions={bindSetter("materialConsumptions")}
                  adminDaysRates={state.adminDaysRates}
                  setAdminDaysRates={bindSetter("adminDaysRates")}
                  adminDaysRatesRules={state.adminDaysRatesRules}
                  setAdminDaysRatesRules={bindSetter("adminDaysRatesRules")}
                  extraTransactions={state.extraTransactions}
                  setExtraTransactions={bindSetter("extraTransactions")}
                  visits={state.visits}
                  solariumSessions={state.solariumSessions}
                  adminShifts={state.adminShifts}
                  masterTransactions={state.masterTransactions}
                  giftCertificates={state.giftCertificates}
                  debtRecords={state.debtRecords}
                  activeSettingsIdx={0}
                  showDeletedVisits={preferences.showDeletedVisits}
                  setShowDeletedVisits={(v) => setPreference("showDeletedVisits", v)}
                  allowDeleteVisits={preferences.allowDeleteVisits}
                  setAllowDeleteVisits={(v) => setPreference("allowDeleteVisits", v)}
                  allowDeleteCertificates={preferences.allowDeleteCertificates}
                  setAllowDeleteCertificates={(v) => setPreference("allowDeleteCertificates", v)}
                  showVisitChangeHistory={preferences.showVisitChangeHistory}
                  setShowVisitChangeHistory={(v) => setPreference("showVisitChangeHistory", v)}
                  allowMasterPayouts={preferences.allowMasterPayouts}
                  setAllowMasterPayouts={(v) => setPreference("allowMasterPayouts", v)}
                  allowAdminShiftEdits={preferences.allowAdminShiftEdits}
                  setAllowAdminShiftEdits={(v) => setPreference("allowAdminShiftEdits", v)}
                  hideFormulaCalculations={preferences.hideFormulaCalculations}
                  setHideFormulaCalculations={(v) => setPreference("hideFormulaCalculations", v)}
                  ownerPassword={meta.ownerPassword}
                  setOwnerPassword={(v) => setMeta({ ownerPassword: v })}
                  keepOwnerUnlocked={preferences.keepOwnerUnlocked}
                  setKeepOwnerUnlocked={(v) => setPreference("keepOwnerUnlocked", v)}
                  autoLockDuration={preferences.autoLockDuration}
                  setAutoLockDuration={(v) => setPreference("autoLockDuration", v)}
                  autoBackupEnabled={preferences.autoBackupEnabled}
                  setAutoBackupEnabled={(v) => setPreference("autoBackupEnabled", v)}
                  autoBackupInterval={preferences.autoBackupInterval}
                  setAutoBackupInterval={(v) => setPreference("autoBackupInterval", v)}
                  lastAutoBackupDate={meta.lastAutoBackupDate}
                  onLock={() => setIsOwnerUnlocked(false)}
                  onResetApp={handleResetApp}
                />
              )}
            </Suspense>
          </div>
        )}

        {mountedTabs.has("help") && (
          <div className={activeTab === "help" ? "" : "hidden"} aria-hidden={activeTab !== "help"}>
            <Suspense fallback={<TabFallback />}>
              <InteractiveHelp />
            </Suspense>
          </div>
        )}
      </main>

      <footer className="bg-slate-200 border-t border-slate-300 py-1.5 px-3 flex flex-wrap items-center justify-between text-[10px] font-mono font-medium text-slate-500 shrink-0 uppercase tracking-wider" id="app-footer">
        <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Система: <span className="text-slate-800 font-bold">Online</span></span>
        <div className="text-[10px] text-slate-500 font-bold">© 2026 Ева-стиль v{APP_VERSION} · Windows</div>
      </footer>
    </div>
  );
}
