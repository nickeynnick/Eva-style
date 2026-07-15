import React, { useState } from "react";
import { 
  Employee, 
  Visit, 
  SolariumSession, 
  ExtraTransaction, 
  SettingsRule, 
  DailyCashState, 
  Position,
  MasterTransaction,
  PaymentMethod,
  GiftCertificate,
  DebtRecord,
} from "../types";
import {
  calculateVisitTotal,
  calculateAcquiring,
  paymentMethodLabel,
  getVisitCashAmount,
  getVisitCardAmount,
  getVisitTransferAmount,
} from "../utils/paymentUtils";
import {
  getActiveSettingsForDate,
  getSolariumSessionBase,
  getSolariumSessionAcquiring,
  getSolariumSessionTotal,
} from "../utils/settingsUtils";
import {
  getDebtPaymentAcquiringCost,
  getDebtPaymentCardTotal,
} from "../utils/dailyFinanceUtils";
import { printShiftSummary } from "../utils/shiftSummary";
import { showAppAlert } from "../utils/appDialog";
import { 
  Calendar, 
  Plus, 
  CreditCard, 
  RussianRuble, 
  History, 
  Edit2, 
  Trash2, 
  Info, 
  Undo2, 
  ArrowUpRight, 
  ArrowDownRight,
  Calculator,
  Clock,
  Printer,
} from "lucide-react";

interface DailyAccountingProps {
  employees: Employee[];
  visits: Visit[];
  setVisits: React.Dispatch<React.SetStateAction<Visit[]>>;
  solariumSessions: SolariumSession[];
  extraTransactions: ExtraTransaction[];
  setExtraTransactions: React.Dispatch<React.SetStateAction<ExtraTransaction[]>>;
  dailyCash: DailyCashState[];
  setDailyCash: React.Dispatch<React.SetStateAction<DailyCashState[]>>;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  settingsRules: SettingsRule[];
  masterTransactions?: MasterTransaction[];
  giftCertificates: GiftCertificate[];
  setGiftCertificates: React.Dispatch<React.SetStateAction<GiftCertificate[]>>;
  debtRecords: DebtRecord[];
  setDebtRecords: React.Dispatch<React.SetStateAction<DebtRecord[]>>;
  showDeletedVisits?: boolean;
  allowDeleteVisits?: boolean;
  showVisitChangeHistory?: boolean;
}

function DailyAccounting({
  employees,
  visits,
  setVisits,
  solariumSessions,
  extraTransactions,
  setExtraTransactions,
  dailyCash,
  setDailyCash,
  selectedDate,
  setSelectedDate,
  settingsRules,
  masterTransactions,
  giftCertificates,
  setGiftCertificates,
  debtRecords,
  setDebtRecords,
  showDeletedVisits = true,
  allowDeleteVisits = true,
  showVisitChangeHistory = true
}: DailyAccountingProps) {
  // Input form state for new visit
  const [masterId, setMasterId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("наличные");
  const [selectedCertId, setSelectedCertId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [workCost, setWorkCost] = useState<number | "">("");
  const [salonMaterialsCostInput, setSalonMaterialsCostInput] = useState<number | "">("");
  const [masterMaterialsCostInput, setMasterMaterialsCostInput] = useState<number | "">("");
  const [manicureType, setManicureType] = useState<"classical" | "apparatus">("classical");
  const [selectedMasterFilter, setSelectedMasterFilter] = useState<string>("all");
  
  // Edit visit state
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [confirmDeleteVisitId, setConfirmDeleteVisitId] = useState<string | null>(null);
  const [confirmPermanentDeleteVisitId, setConfirmPermanentDeleteVisitId] = useState<string | null>(null);
  const [confirmDeleteExtraTxId, setConfirmDeleteExtraTxId] = useState<string | null>(null);
  const [confirmPermanentDeleteExtraTxId, setConfirmPermanentDeleteExtraTxId] = useState<string | null>(null);
  const [editWorkCost, setEditWorkCost] = useState<number | "">("");
  const [editSalonMaterialsCostInput, setEditSalonMaterialsCostInput] = useState<number | "">("");
  const [editMasterMaterialsCostInput, setEditMasterMaterialsCostInput] = useState<number | "">("");
  const [editManicureType, setEditManicureType] = useState<"classical" | "apparatus">("classical");
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>("наличные");
  const [editMasterId, setEditMasterId] = useState("");
  const [editSelectedCertId, setEditSelectedCertId] = useState("");
  const [editClientName, setEditClientName] = useState("");
  const [editClientPhone, setEditClientPhone] = useState("");

  // Input cash form state
  const [startingCashInput, setStartingCashInput] = useState<number | "">("");
  
  // Custom expense input state
  const [expAmount, setExpAmount] = useState<number | "">("");
  const [expComment, setExpComment] = useState("");
  const [expCategory, setExpCategory] = useState("Покупка товара");

  // Get current day cash state
  const dayCashState = dailyCash.find(c => c.date === selectedDate);
  const startCash = dayCashState ? dayCashState.startCash : 0;

  // Filter items for the selected day
  const rawDayVisits = visits.filter(v => v.date === selectedDate);
  const dayVisits = rawDayVisits.filter(v => !v.isDeleted);
  const allDayVisitsIncludeDeleted = showDeletedVisits ? rawDayVisits : rawDayVisits.filter(v => !v.isDeleted);
  
  const displayedVisits = allDayVisitsIncludeDeleted.filter(v => {
    if (selectedMasterFilter === "all") return true;
    return v.masterId === selectedMasterFilter;
  });

  const daySolariumSessions = solariumSessions.filter(s => s.date === selectedDate);
  const rawDayExtraTransactions = extraTransactions.filter(t => t.date === selectedDate);
  const dayExtraTransactions = rawDayExtraTransactions.filter(t => !t.isDeleted);
  const allDayExtraTransactionsIncludeDeleted = showDeletedVisits ? rawDayExtraTransactions : rawDayExtraTransactions.filter(t => !t.isDeleted);

  const daySettings = getActiveSettingsForDate(settingsRules, selectedDate);

  // Compute Solarium dynamic revenue (по сохранённому тарифу каждого сеанса)
  const solariumCashRevenue = daySolariumSessions
    .filter(s => s.paymentMethod === "наличные")
    .reduce((sum, s) => sum + getSolariumSessionBase(s, settingsRules), 0);

  const solariumCardRevenue = daySolariumSessions
    .filter(s => s.paymentMethod === "дебетовая карта")
    .reduce((sum, s) => sum + getSolariumSessionTotal(s, settingsRules), 0);

  const solariumTransferRevenue = daySolariumSessions
    .filter(s => s.paymentMethod === "перевод")
    .reduce((sum, s) => sum + getSolariumSessionBase(s, settingsRules), 0);

  const totalSolariumRevenue = solariumCashRevenue + solariumCardRevenue + solariumTransferRevenue;

  const activeCerts = giftCertificates.filter(c => c.isActive && c.balance > 0);

  const getEditAvailableCerts = (visitId: string) => {
    const visit = visits.find(v => v.id === visitId);
    const base = giftCertificates.filter(c => c.isActive && c.balance > 0);
    if (!visit?.giftCertificateId) return base;
    const linked = giftCertificates.find(c => c.id === visit.giftCertificateId);
    if (linked && !base.some(c => c.id === linked.id)) {
      return [...base, linked];
    }
    return base;
  };

  // Master performance and salaries calculation for this day
  const mastersPerfMap = new Map<string, {
    visitCount: number;
    volumeOfWork: number;
    salonMaterials: number;
    masterMaterials: number;
    calculatedSalary: number;
  }>();

  // Populate map with masters
  employees.forEach(emp => {
    if (emp.position !== Position.Administrator) {
      mastersPerfMap.set(emp.id, {
        visitCount: 0,
        volumeOfWork: 0,
        salonMaterials: 0,
        masterMaterials: 0,
        calculatedSalary: 0
      });
    }
  });

  dayVisits.forEach(visit => {
    const perf = mastersPerfMap.get(visit.masterId);
    if (perf) {
      const emp = employees.find(e => e.id === visit.masterId);
      if (emp) {
        perf.visitCount += 1;
        perf.volumeOfWork += visit.workCost;
        
        // Dynamic percent selection based on manicureType
        let pctVal = emp.percentage;
        if (emp.position === Position.Manicurist && emp.manicuresPercentage) {
          if (visit.manicureType === "classical") {
            pctVal = emp.manicuresPercentage.classical;
          } else if (visit.manicureType === "apparatus") {
            pctVal = emp.manicuresPercentage.apparatus;
          }
        }
        const pct = pctVal / 100; // e.g. 50% = 0.5
        const baseEarnings = visit.workCost * pct;
        
        // Materials accounting:
        let mastersMatCost = 0;
        let salonMatCost = 0;

        if (visit.salonMaterialsCost !== undefined || visit.masterMaterialsCost !== undefined) {
          salonMatCost = visit.salonMaterialsCost || 0;
          mastersMatCost = visit.masterMaterialsCost || 0;
        } else {
          const isSalonMat = (visit as any).isSalonMaterials !== false; // defaults to true
          if (isSalonMat) {
            salonMatCost = visit.materialsCost;
          } else {
            mastersMatCost = visit.materialsCost;
          }
        }

        perf.salonMaterials += salonMatCost;
        perf.masterMaterials += mastersMatCost;

        // Salary = base share + master materials reimbursement
        perf.calculatedSalary += baseEarnings + mastersMatCost;
      }
    }
  });

  const masterPerformanceList = Array.from(mastersPerfMap.entries()).map(([id, perf]) => {
    const emp = employees.find(e => e.id === id);
    return {
      id,
      name: emp?.name || "Неизвестный мастер",
      position: emp?.position || "Мастер",
      ...perf
    };
  }).filter(item => item.visitCount > 0); // only show active ones for this day

  // Save starting cash balance
  const handleSaveStartingCash = (e: React.FormEvent) => {
    e.preventDefault();
    if (startingCashInput === "") return;
    const val = Number(startingCashInput);
    
    setDailyCash(prev => {
      const filtered = prev.filter(c => c.date !== selectedDate);
      return [...filtered, { date: selectedDate, startCash: val }];
    });
    setStartingCashInput("");
  };

  // Add Beauty Treatment Visit
  const handleAddVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterId || workCost === "") {
      showAppAlert("Выберите мастера и укажите стоимость работы");
      return;
    }

    const costWork = Number(workCost);
    const costSalonMat = Number(salonMaterialsCostInput) || 0;
    const costMasterMat = Number(masterMaterialsCostInput) || 0;
    const costMat = costSalonMat + costMasterMat;
    const baseAmount = costWork + costMat;

    if (paymentMethod === "сертификат") {
      if (!selectedCertId) {
        showAppAlert("Выберите подарочный сертификат");
        return;
      }
      const cert = giftCertificates.find(c => c.id === selectedCertId);
      if (!cert || !cert.isActive) {
        showAppAlert("Сертификат не найден или неактивен");
        return;
      }
      if (cert.balance < baseAmount) {
        showAppAlert(`Недостаточно средств на сертификате. Остаток: ${cert.balance} ₽, нужно: ${baseAmount} ₽`);
        return;
      }
    }

    if (paymentMethod === "в долг" && !clientName.trim()) {
      showAppAlert("Укажите имя клиента для оформления долга");
      return;
    }
    
    const selectedEmp = employees.find(e => e.id === masterId);
    const isManicurist = selectedEmp?.position === Position.Manicurist;
    const finalManicureType = isManicurist ? manicureType : undefined;
    
    const { acquiringCost: acq, totalCost: total } = calculateVisitTotal(
      costWork, costMat, paymentMethod, daySettings.acquiringCommission
    );

    const visitId = "visit-" + Date.now();
    const now = new Date();
    const timeStr = `${now.getDate().toString().padStart(2, "0")}.${(now.getMonth() + 1).toString().padStart(2, "0")}.${now.getFullYear()} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

    let debtId: string | undefined;
    if (paymentMethod === "в долг") {
      debtId = "debt-" + Date.now();
      const debtRecord: DebtRecord = {
        id: debtId,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim() || undefined,
        visitId,
        visitDate: selectedDate,
        originalAmount: baseAmount,
        remainingAmount: baseAmount,
        createdDate: selectedDate,
        payments: [],
        isClosed: false,
      };
      setDebtRecords(prev => [debtRecord, ...prev]);
    }

    if (paymentMethod === "сертификат" && selectedCertId) {
      setGiftCertificates(prev => prev.map(c => {
        if (c.id !== selectedCertId) return c;
        const newBalance = Math.round((c.balance - baseAmount) * 100) / 100;
        return {
          ...c,
          balance: newBalance,
          isActive: newBalance > 0,
          usages: [...c.usages, { id: "usage-" + Date.now(), date: selectedDate, visitId, amount: baseAmount }],
        };
      }));
    }

    const newVisit: Visit = {
      id: visitId,
      date: selectedDate,
      masterId,
      paymentMethod,
      workCost: costWork,
      materialsCost: costMat,
      salonMaterialsCost: costSalonMat,
      masterMaterialsCost: costMasterMat,
      manicureType: finalManicureType,
      acquiringCost: acq,
      totalCost: total,
      giftCertificateId: paymentMethod === "сертификат" ? selectedCertId : undefined,
      certificateAmountUsed: paymentMethod === "сертификат" ? baseAmount : undefined,
      debtId,
      clientName: paymentMethod === "в долг" ? clientName.trim() : undefined,
      clientPhone: paymentMethod === "в долг" ? clientPhone.trim() || undefined : undefined,
      editLogs: [
        {
          timestamp: timeStr,
          action: "создан",
          details: `Создан визит. Мастер: ${selectedEmp?.name}. Работа: ${costWork} ₽, Мат. салона: ${costSalonMat} ₽, Мат. мастера: ${costMasterMat} ₽${finalManicureType ? ` (${finalManicureType === "classical" ? "классический" : "аппаратный"})` : ""}. Оплата: ${paymentMethodLabel(paymentMethod)}${acq > 0 ? ` (Экв: ${acq} ₽)` : ""}. Итого: ${total} ₽.${paymentMethod === "в долг" ? ` Клиент: ${clientName}.` : ""}${paymentMethod === "сертификат" ? ` Сертификат: ${giftCertificates.find(c => c.id === selectedCertId)?.code}.` : ""}`
        }
      ]
    };

    setVisits(prev => [...prev, newVisit]);
    
    setMasterId("");
    setWorkCost("");
    setSalonMaterialsCostInput("");
    setMasterMaterialsCostInput("");
    setManicureType("classical");
    setSelectedCertId("");
    setClientName("");
    setClientPhone("");
  };

  // Edit visit handlers
  const startEditVisit = (visit: Visit) => {
    setEditingVisitId(visit.id);
    setEditMasterId(visit.masterId);
    setEditWorkCost(visit.workCost);
    
    const vSalon = visit.salonMaterialsCost !== undefined ? visit.salonMaterialsCost : ((visit as any).isSalonMaterials !== false ? visit.materialsCost : 0);
    const vMaster = visit.masterMaterialsCost !== undefined ? visit.masterMaterialsCost : ((visit as any).isSalonMaterials === false ? visit.materialsCost : 0);
    
    setEditSalonMaterialsCostInput(vSalon);
    setEditMasterMaterialsCostInput(vMaster);
    setEditManicureType(visit.manicureType || "classical");
    setEditPaymentMethod(visit.paymentMethod);
    setEditSelectedCertId(visit.giftCertificateId || "");
    setEditClientName(visit.clientName || "");
    setEditClientPhone(visit.clientPhone || "");
  };

  const handleSaveEditVisit = (visitId: string) => {
    if (!editMasterId || editWorkCost === "") return;

    const oldVisit = visits.find(v => v.id === visitId);
    if (!oldVisit) return;

    const costWork = Number(editWorkCost);
    const costSalonMat = Number(editSalonMaterialsCostInput) || 0;
    const costMasterMat = Number(editMasterMaterialsCostInput) || 0;
    const costMat = costSalonMat + costMasterMat;
    const baseAmount = costWork + costMat;
    const visitSettings = getActiveSettingsForDate(settingsRules, oldVisit.date);

    if (editPaymentMethod === "сертификат") {
      if (!editSelectedCertId) {
        showAppAlert("Выберите подарочный сертификат");
        return;
      }
      const certId = editSelectedCertId;
      const cert = giftCertificates.find(c => c.id === certId);
      let availableBalance = cert?.balance ?? 0;
      if (
        oldVisit.paymentMethod === "сертификат" &&
        oldVisit.giftCertificateId === certId &&
        oldVisit.certificateAmountUsed
      ) {
        availableBalance += oldVisit.certificateAmountUsed;
      }
      if (!cert || availableBalance < baseAmount) {
        showAppAlert(`Недостаточно средств на сертификате. Доступно: ${availableBalance} ₽, нужно: ${baseAmount} ₽`);
        return;
      }
    }

    if (editPaymentMethod === "в долг" && !editClientName.trim()) {
      showAppAlert("Укажите имя клиента для оформления долга");
      return;
    }

    // Восстановить списание сертификата / закрыть долг от старой версии визита
    if (oldVisit.paymentMethod === "сертификат") {
      restoreCertificateFromVisit(oldVisit);
    }
    if (oldVisit.paymentMethod === "в долг" && editPaymentMethod !== "в долг") {
      closeDebtFromVisit(oldVisit);
    }

    let resolvedDebtId = oldVisit.debtId;
    let resolvedClientName = editClientName.trim();
    let resolvedClientPhone = editClientPhone.trim() || undefined;

    // Применить новое списание сертификата
    if (editPaymentMethod === "сертификат" && editSelectedCertId) {
      setGiftCertificates(prev => prev.map(c => {
        if (c.id !== editSelectedCertId) return c;
        const newBalance = Math.round((c.balance - baseAmount) * 100) / 100;
        return {
          ...c,
          balance: newBalance,
          isActive: newBalance > 0,
          usages: [
            ...c.usages.filter(u => u.visitId !== visitId),
            { id: "usage-" + Date.now(), date: oldVisit.date, visitId, amount: baseAmount },
          ],
        };
      }));
    }

    // Обновить или создать долг
    if (editPaymentMethod === "в долг") {
      if (oldVisit.debtId) {
        setDebtRecords(prev => prev.map(d => {
          if (d.id !== oldVisit.debtId) return d;
          const paid = d.payments.reduce((s, p) => s + p.amount, 0);
          const remaining = Math.max(0, Math.round((baseAmount - paid) * 100) / 100);
          return {
            ...d,
            clientName: resolvedClientName,
            clientPhone: resolvedClientPhone,
            originalAmount: baseAmount,
            remainingAmount: remaining,
            isClosed: remaining <= 0,
          };
        }));
        resolvedDebtId = oldVisit.debtId;
      } else {
        resolvedDebtId = "debt-" + Date.now();
        setDebtRecords(prev => [...prev, {
          id: resolvedDebtId!,
          clientName: resolvedClientName,
          clientPhone: resolvedClientPhone,
          visitId,
          visitDate: oldVisit.date,
          originalAmount: baseAmount,
          remainingAmount: baseAmount,
          createdDate: oldVisit.date,
          payments: [],
          isClosed: false,
        }]);
      }
    }

    const selectedEmp = employees.find(e => e.id === editMasterId);
    const isManicurist = selectedEmp?.position === Position.Manicurist;
    const finalManicureType = isManicurist ? editManicureType : undefined;

    const { acquiringCost: acq, totalCost: total } = calculateVisitTotal(
      costWork, costMat, editPaymentMethod, visitSettings.acquiringCommission
    );

    const now = new Date();
    const timeStr = `${now.getDate().toString().padStart(2, "0")}.${(now.getMonth() + 1).toString().padStart(2, "0")}.${now.getFullYear()} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

    setVisits(prev => prev.map(v => {
      if (v.id !== visitId) return v;

      const changes: string[] = [];
      if (v.masterId !== editMasterId) {
        const oldName = employees.find(e => e.id === v.masterId)?.name;
        const newName = employees.find(e => e.id === editMasterId)?.name;
        changes.push(`мастер: ${oldName} -> ${newName}`);
      }
      if (v.workCost !== costWork) changes.push(`работа: ${v.workCost} -> ${costWork} ₽`);

      const oldSalon = v.salonMaterialsCost !== undefined ? v.salonMaterialsCost : ((v as any).isSalonMaterials !== false ? v.materialsCost : 0);
      const oldMaster = v.masterMaterialsCost !== undefined ? v.masterMaterialsCost : ((v as any).isSalonMaterials === false ? v.materialsCost : 0);
      if (oldSalon !== costSalonMat) changes.push(`мат. салона: ${oldSalon} -> ${costSalonMat} ₽`);
      if (oldMaster !== costMasterMat) changes.push(`мат. мастера: ${oldMaster} -> ${costMasterMat} ₽`);

      if (v.manicureType !== finalManicureType) {
        changes.push(`тип маникюра: ${v.manicureType || "нет"} -> ${finalManicureType || "нет"}`);
      }
      if (v.paymentMethod !== editPaymentMethod) changes.push(`оплата: ${v.paymentMethod} -> ${editPaymentMethod}`);

      const newLog = {
        timestamp: timeStr,
        action: "отредактирован" as const,
        details: `Изменения: ${changes.join(", ")}. Итоговое сальдо: ${total} ₽.`,
      };

      return {
        ...v,
        masterId: editMasterId,
        workCost: costWork,
        materialsCost: costMat,
        salonMaterialsCost: costSalonMat,
        masterMaterialsCost: costMasterMat,
        manicureType: finalManicureType,
        paymentMethod: editPaymentMethod,
        acquiringCost: acq,
        totalCost: total,
        giftCertificateId: editPaymentMethod === "сертификат" ? editSelectedCertId : undefined,
        certificateAmountUsed: editPaymentMethod === "сертификат" ? baseAmount : undefined,
        debtId: editPaymentMethod === "в долг" ? resolvedDebtId : undefined,
        clientName: editPaymentMethod === "в долг" ? resolvedClientName : undefined,
        clientPhone: editPaymentMethod === "в долг" ? resolvedClientPhone : undefined,
        originalWorkCost: v.originalWorkCost || v.workCost,
        originalMaterialsCost: v.originalMaterialsCost || v.materialsCost,
        editLogs: [...v.editLogs, newLog],
      };
    }));

    setEditingVisitId(null);
  };

  const applyCertificateForVisit = (visit: Visit): boolean => {
    if (visit.paymentMethod !== "сертификат" || !visit.giftCertificateId || !visit.certificateAmountUsed) {
      return true;
    }
    const cert = giftCertificates.find(c => c.id === visit.giftCertificateId);
    if (!cert || !cert.isActive || cert.balance < visit.certificateAmountUsed) {
      showAppAlert(`Недостаточно средств на сертификате для восстановления визита. Остаток: ${cert?.balance ?? 0} ₽`);
      return false;
    }
    setGiftCertificates(prev => prev.map(c => {
      if (c.id !== visit.giftCertificateId) return c;
      const newBalance = Math.round((c.balance - visit.certificateAmountUsed!) * 100) / 100;
      return {
        ...c,
        balance: newBalance,
        isActive: newBalance > 0,
        usages: [...c.usages, { id: "usage-" + Date.now(), date: visit.date, visitId: visit.id, amount: visit.certificateAmountUsed! }],
      };
    }));
    return true;
  };

  const reopenDebtFromVisit = (visit: Visit) => {
    if (!visit.debtId) return;
    const amount = visit.workCost + visit.materialsCost;
    setDebtRecords(prev => prev.map(d => {
      if (d.id !== visit.debtId) return d;
      const paid = d.payments.reduce((s, p) => s + p.amount, 0);
      const remaining = Math.max(0, Math.round((amount - paid) * 100) / 100);
      return {
        ...d,
        originalAmount: amount,
        remainingAmount: remaining,
        isClosed: remaining <= 0,
      };
    }));
  };
  const restoreCertificateFromVisit = (visit: Visit) => {
    if (!visit.giftCertificateId || !visit.certificateAmountUsed) return;
    setGiftCertificates(prev => prev.map(c => {
      if (c.id !== visit.giftCertificateId) return c;
      const newBalance = Math.round((c.balance + visit.certificateAmountUsed!) * 100) / 100;
      return {
        ...c,
        balance: newBalance,
        isActive: newBalance > 0,
        usages: c.usages.filter(u => u.visitId !== visit.id),
      };
    }));
  };

  const closeDebtFromVisit = (visit: Visit) => {
    if (!visit.debtId) return;
    setDebtRecords(prev => prev.map(d => {
      if (d.id !== visit.debtId) return d;
      return { ...d, isClosed: true, remainingAmount: 0 };
    }));
  };

  const handleDeleteVisit = (visitId: string) => {
    const visit = visits.find(v => v.id === visitId);
    if (visit && !visit.isDeleted) {
      restoreCertificateFromVisit(visit);
      closeDebtFromVisit(visit);
    }
    setVisits(prev => prev.map(v => {
      if (v.id === visitId) {
        const now = new Date();
        const timeStr = `${now.getDate().toString().padStart(2, "0")}.${(now.getMonth() + 1).toString().padStart(2, "0")}.${now.getFullYear()} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
        
        return {
          ...v,
          isDeleted: true,
          editLogs: [...v.editLogs, {
            timestamp: timeStr,
            action: "удален" as const,
            details: `Запись помечена как удаленная.`
          }]
        };
      }
      return v;
    }));
  };

  const handleRestoreVisit = (visitId: string) => {
    const visit = visits.find(v => v.id === visitId);
    if (!visit) return;

    if (visit.paymentMethod === "сертификат" && !applyCertificateForVisit(visit)) {
      return;
    }
    if (visit.paymentMethod === "в долг") {
      reopenDebtFromVisit(visit);
    }

    setVisits(prev => prev.map(v => {
      if (v.id === visitId) {
        const now = new Date();
        const timeStr = `${now.getDate().toString().padStart(2, "0")}.${(now.getMonth() + 1).toString().padStart(2, "0")}.${now.getFullYear()} ${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;
        
        return {
          ...v,
          isDeleted: false,
          editLogs: [...v.editLogs, {
            timestamp: timeStr,
            action: "создан" as const,
            details: `Запись восстановлена из архива.`
          }]
        };
      }
      return v;
    }));
  };

  const handlePermanentDeleteVisit = (visitId: string) => {
    const visit = visits.find(v => v.id === visitId);
    if (visit) {
      restoreCertificateFromVisit(visit);
      closeDebtFromVisit(visit);
    }
    setVisits(prev => prev.filter(v => v.id !== visitId));
  };

  // Add custom operational expense
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (expAmount === "" || !expComment) {
      showAppAlert("Введите сумму и комментарий к расходу");
      return;
    }

    const newTx: ExtraTransaction = {
      id: "tx-" + Date.now(),
      date: selectedDate,
      type: "минус",
      amount: Number(expAmount),
      comment: expComment,
      category: expCategory
    };

    setExtraTransactions(prev => [...prev, newTx]);
    setExpAmount("");
    setExpComment("");
  };

  const handleDeleteExtraTx = (txId: string) => {
    setExtraTransactions(prev => prev.map(t => {
      if (t.id === txId) {
        return { ...t, isDeleted: true };
      }
      return t;
    }));
  };

  const handleRestoreExtraTx = (txId: string) => {
    setExtraTransactions(prev => prev.map(t => {
      if (t.id === txId) {
        return { ...t, isDeleted: false };
      }
      return t;
    }));
  };

  const handlePermanentDeleteExtraTx = (txId: string) => {
    setExtraTransactions(prev => prev.filter(t => t.id !== txId));
  };

  // Calculations for daily summary card
  const visitsCashTotal = dayVisits.reduce((sum, v) => sum + getVisitCashAmount(v), 0);
  const visitsCardTotal = dayVisits.reduce((sum, v) => sum + getVisitCardAmount(v), 0);
  const visitsTransferTotal = dayVisits.reduce((sum, v) => sum + getVisitTransferAmount(v), 0);

  const visitsCertTotal = dayVisits
    .filter(v => v.paymentMethod === "сертификат")
    .reduce((sum, v) => sum + v.workCost + v.materialsCost, 0);

  const visitsDebtTotal = dayVisits
    .filter(v => v.paymentMethod === "в долг")
    .reduce((sum, v) => sum + v.workCost + v.materialsCost, 0);

  const totalAcquiringFromVisits = dayVisits
    .filter(v => v.paymentMethod === "дебетовая карта")
    .reduce((sum, v) => sum + v.acquiringCost, 0);

  const totalAcquiringFromSolarium = daySolariumSessions
    .filter(s => s.paymentMethod === "дебетовая карта")
    .reduce((sum, s) => sum + getSolariumSessionAcquiring(s, settingsRules), 0);

  const totalAcquiringFromCerts = giftCertificates
    .filter(c => c.soldDate === selectedDate && c.salePaymentMethod === "дебетовая карта")
    .reduce((sum, c) => {
      const certSettings = getActiveSettingsForDate(settingsRules, c.soldDate);
      return sum + calculateAcquiring(c.nominal, "дебетовая карта", certSettings.acquiringCommission);
    }, 0);

  const debtPaymentsToday = debtRecords.flatMap(d => d.payments.filter(p => p.date === selectedDate));

  const totalAcquiringFromDebts = debtPaymentsToday
    .filter(p => p.paymentMethod === "дебетовая карта")
    .reduce((sum, p) => sum + getDebtPaymentAcquiringCost(p, settingsRules), 0);

  const totalAcquiringToday = Math.round(
    (totalAcquiringFromVisits + totalAcquiringFromSolarium + totalAcquiringFromCerts + totalAcquiringFromDebts) * 100
  ) / 100;

  const dayExpensesTotal = dayExtraTransactions
    .filter(t => t.type === "минус")
    .reduce((sum, t) => sum + t.amount, 0);

  const dayAdditionsTotal = dayExtraTransactions
    .filter(t => t.type === "плюс")
    .reduce((sum, t) => sum + t.amount, 0);

  const certSalesCashToday = giftCertificates
    .filter(c => c.soldDate === selectedDate && c.salePaymentMethod === "наличные")
    .reduce((sum, c) => sum + c.nominal, 0);
  const certSalesCardToday = giftCertificates
    .filter(c => c.soldDate === selectedDate && c.salePaymentMethod === "дебетовая карта")
    .reduce((sum, c) => {
      const certSettings = getActiveSettingsForDate(settingsRules, c.soldDate);
      const acq = calculateAcquiring(c.nominal, "дебетовая карта", certSettings.acquiringCommission);
      return sum + c.nominal + acq;
    }, 0);
  const certSalesTransferToday = giftCertificates
    .filter(c => c.soldDate === selectedDate && c.salePaymentMethod === "перевод")
    .reduce((sum, c) => sum + c.nominal, 0);

  const debtPaymentsCash = debtPaymentsToday.filter(p => p.paymentMethod === "наличные").reduce((s, p) => s + p.amount, 0);
  const debtPaymentsCard = debtPaymentsToday
    .filter(p => p.paymentMethod === "дебетовая карта")
    .reduce((s, p) => s + getDebtPaymentCardTotal(p, settingsRules), 0);
  const debtPaymentsTransfer = debtPaymentsToday.filter(p => p.paymentMethod === "перевод").reduce((s, p) => s + p.amount, 0);

  const transferTotalToday =
    visitsTransferTotal + solariumTransferRevenue + certSalesTransferToday + debtPaymentsTransfer;

  const cashInflowToday =
    visitsCashTotal + solariumCashRevenue + dayAdditionsTotal + certSalesCashToday + debtPaymentsCash;

  // Solarium
  const solariumTotal = totalSolariumRevenue;
  const totalSolariumMaterialsToday = daySolariumSessions.reduce((sum, s) => sum + s.creamPrice + s.stickersPrice, 0);

  // Total salon materials cost calculated
  const totalSalonMaterialsCost = dayVisits.reduce((sum, v) => {
    if (v.salonMaterialsCost !== undefined) return sum + v.salonMaterialsCost;
    return sum + ((v as any).isSalonMaterials !== false ? v.materialsCost : 0);
  }, 0);

  // Master payouts made TODAY (We lookup historical master transactions filed under this date of type Payout/Advance)
  // Let's filter payouts or advances. To compute real Cash drawer change, we check if they are paid in cash
  // We'll calculate the end cash:
  // End Cash = Start Cash + (Visits Cash Revenue) + (Solarium Cash Revenue) + Inflow Cash - (Salary Cash Payouts) - (Custom Cash Expenses)
  // By default, we assume operating expenses and salary payouts shown on report are paid from Cash register
  const activeMasterPayoutsToday = masterTransactions
    ? masterTransactions
        .filter(t => t.date === selectedDate && (t.type === "выплата" || t.type === "аванс"))
        .reduce((sum, t) => sum + t.amount, 0)
    : 0;

  const endCash = Math.max(0, startCash + cashInflowToday - dayExpensesTotal - activeMasterPayoutsToday);

  const handlePrintShiftSummary = () => {
    printShiftSummary({
      dateLabel: new Date(selectedDate).toLocaleDateString("ru-RU", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      startCash,
      cashInflow: cashInflowToday,
      cashBreakdown: `Визиты: ${visitsCashTotal} ₽ | Солярий: ${solariumCashRevenue} ₽ | Сертиф.: ${certSalesCashToday} ₽ | Долги: ${debtPaymentsCash} ₽`,
      cardTotal: visitsCardTotal + solariumCardRevenue + certSalesCardToday + debtPaymentsCard,
      cardBreakdown: `Визиты: ${visitsCardTotal} ₽ | Солярий: ${solariumCardRevenue} ₽ | Сертиф.: ${certSalesCardToday} ₽ | Долги: ${debtPaymentsCard} ₽`,
      transferTotal: transferTotalToday,
      transferBreakdown: `Визиты: ${visitsTransferTotal} ₽ | Солярий: ${solariumTransferRevenue} ₽ | Сертиф.: ${certSalesTransferToday} ₽ | Долги: ${debtPaymentsTransfer} ₽`,
      certRedemption: visitsCertTotal,
      newDebts: visitsDebtTotal,
      acquiringTotal: totalAcquiringToday,
      expensesTotal: dayExpensesTotal,
      materialsTotal: totalSalonMaterialsCost + totalSolariumMaterialsToday,
      payoutsTotal: activeMasterPayoutsToday,
      endCash,
      visitCount: dayVisits.length,
      solariumSessions: daySolariumSessions.length,
    });
  };

  return (
    <div className="space-y-3" id="daily-accounting-view">
      {/* Date Header Selection */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3" id="daily-header">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5 leading-none">
            Рабочая смена салона
          </h2>
          <p className="text-[10px] text-slate-400 mt-1">Регистрация визитов, управление кассой и материалами</p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Выбрать дату:</span>
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <Calendar className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-rose-500" />
              <input 
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-8 pr-2.5 py-1.5 border border-slate-200 rounded bg-slate-50 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-rose-200 focus:border-rose-300"
                id="selected-date-picker"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const d = new Date();
                const year = d.getFullYear();
                const month = (d.getMonth() + 1).toString().padStart(2, "0");
                const day = d.getDate().toString().padStart(2, "0");
                setSelectedDate(`${year}-${month}-${day}`);
              }}
              className="px-2.5 py-1.5 text-xs font-bold bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 rounded cursor-pointer transition-colors"
              id="set-today-btn"
            >
              Сегодня
            </button>
            <button
              type="button"
              onClick={handlePrintShiftSummary}
              className="px-2.5 py-1.5 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded cursor-pointer transition-colors flex items-center gap-1"
              title="Печать итога смены"
              id="print-shift-summary-btn"
            >
              <Printer className="h-3 w-3" />
              Итог дня
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Master Summary for Selected Date */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-3 space-y-2.5" id="masters-summary-card">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Calculator className="h-3.5 w-3.5 text-rose-500" />
            Сводная таблица по мастерам за {new Date(selectedDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}
          </h3>
          <span className="text-[10px] bg-rose-50 border border-rose-100 text-rose-700 font-bold uppercase tracking-wide px-2 py-0.5 rounded">
            Мастеров в работе: {masterPerformanceList.length}
          </span>
        </div>

        {masterPerformanceList.length === 0 ? (
          <div className="text-center py-4 bg-slate-50 rounded border border-dashed border-slate-200">
            <Info className="h-5 w-5 text-slate-400 mx-auto mb-1" />
            <p className="text-[11px] text-slate-400 font-semibold">На сегодня визитов мастеров еще не зарегистрировано.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded border border-slate-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-1.5 px-2.5">Мастер / Роль</th>
                  <th className="py-1.5 px-2.5 text-center">Визиты</th>
                  <th className="py-1.5 px-2.5 text-right">Объем работ</th>
                  <th className="py-1.5 px-2.5 text-right">Расходники салона</th>
                  <th className="py-1.5 px-2.5 text-right">Расходники мастера</th>
                  <th className="py-1.5 px-2.5 text-right text-rose-700 bg-rose-50/50">Начисленная ЗП</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[11px] font-sans">
                {masterPerformanceList.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-1.5 px-2.5">
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="text-[9px] text-slate-400 font-mono leading-none mt-0.5 uppercase">{item.position}</div>
                    </td>
                    <td className="py-1.5 px-2.5 text-center font-mono font-bold text-slate-800">{item.visitCount}</td>
                    <td className="py-1.5 px-2.5 text-right font-mono font-semibold text-slate-800">{item.volumeOfWork.toLocaleString()} ₽</td>
                    <td className="py-1.5 px-2.5 text-right font-mono text-slate-500">{item.salonMaterials.toLocaleString()} ₽</td>
                    <td className="py-1.5 px-2.5 text-right font-mono text-slate-500">{item.masterMaterials.toLocaleString()} ₽</td>
                    <td className="py-1.5 px-2.5 text-right font-mono text-rose-700 font-bold bg-rose-50/40">{Math.round(item.calculatedSalary).toLocaleString()} ₽</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3" id="actions-accounting-grid">
        {/* Left Column: Add Visit Action */}
        <div className="lg:col-span-1">
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Plus className="h-3.5 w-3.5 text-rose-500" />
              Добавить визит клиента
            </h3>
            
            <form onSubmit={handleAddVisit} className="space-y-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Мастер</label>
                <select
                  value={masterId}
                  onChange={(e) => setMasterId(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50 font-semibold focus:outline-none focus:ring-1 focus:ring-rose-200"
                  required
                >
                  <option value="">-- Выбрать мастера --</option>
                  {employees
                    .filter(e => e.position !== Position.Administrator)
                    .map(e => (
                      <option key={e.id} value={e.id}>{e.name} ({e.position})</option>
                    ))
                  }
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Способ оплаты</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50 font-semibold focus:outline-none focus:ring-1 focus:ring-rose-200"
                >
                  <option value="наличные">Наличные</option>
                  <option value="дебетовая карта">Картой (безнал)</option>
                  <option value="перевод">Перевод</option>
                  <option value="сертификат">Подарочный сертификат</option>
                  <option value="в долг">В долг</option>
                </select>
              </div>

              {paymentMethod === "сертификат" && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Номер сертификата</label>
                  <select
                    value={selectedCertId}
                    onChange={(e) => setSelectedCertId(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50 font-semibold"
                    required
                  >
                    <option value="">— Выберите —</option>
                    {activeCerts.map(c => (
                      <option key={c.id} value={c.id}>
                        № {c.code} — остаток {c.balance.toLocaleString()} ₽
                      </option>
                    ))}
                  </select>
                  {activeCerts.length === 0 && (
                    <p className="text-[9px] text-amber-600 mt-1">Нет активных сертификатов. Выпустите во вкладке «Сертификаты».</p>
                  )}
                </div>
              )}

              {paymentMethod === "в долг" && (
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Имя клиента *</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Телефон</label>
                    <input
                      type="text"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50"
                    />
                  </div>
                </div>
              )}

              {/* Manicurist procedure type selection */}
              {employees.find(e => e.id === masterId)?.position === Position.Manicurist && (
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">
                    Тип процедуры маникюра
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setManicureType("classical")}
                      className={`text-[10px] py-1 px-1.5 rounded border transition-all ${
                        manicureType === "classical"
                          ? "bg-purple-100 border-purple-300 font-bold text-purple-700 shadow-xs"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      Классический ({employees.find(e => e.id === masterId)?.manicuresPercentage?.classical || employees.find(e => e.id === masterId)?.percentage || 100}%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setManicureType("apparatus")}
                      className={`text-[10px] py-1 px-1.5 rounded border transition-all ${
                        manicureType === "apparatus"
                          ? "bg-purple-100 border-purple-300 font-bold text-purple-700 shadow-xs"
                          : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      Аппаратный ({employees.find(e => e.id === masterId)?.manicuresPercentage?.apparatus || employees.find(e => e.id === masterId)?.percentage || 100}%)
                    </button>
                  </div>
                  <p className="text-[9px] text-slate-400 mt-1 leading-tight">Процент мастера будет рассчитан согласно выбранному типу.</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Работа (Р)</label>
                  <input
                    type="number"
                    placeholder="Цена"
                    value={workCost}
                    onChange={(e) => setWorkCost(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-rose-200 font-mono font-bold"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Мат. салона (Р)</label>
                  <input
                    type="number"
                    placeholder="Цена"
                    value={salonMaterialsCostInput}
                    onChange={(e) => setSalonMaterialsCostInput(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-rose-200 font-mono font-bold"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Мат. мастера (Р)</label>
                  <input
                    type="number"
                    placeholder="Цена"
                    value={masterMaterialsCostInput}
                    onChange={(e) => setMasterMaterialsCostInput(e.target.value === "" ? "" : Number(e.target.value))}
                    className="w-full text-xs border border-slate-200 rounded px-2.5 py-1.5 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-rose-200 font-mono font-bold"
                    min="0"
                  />
                </div>
              </div>

              {/* Real-time sum showing acquiring */}
              <div className="bg-slate-50 border border-slate-200 rounded p-2.5 space-y-1 font-mono text-[10px]" id="live-visit-calculator">
                <div className="flex justify-between text-slate-500">
                  <span>Мастерская цена:</span>
                  <span className="font-bold">
                    {((Number(workCost) || 0) + (Number(salonMaterialsCostInput) || 0) + (Number(masterMaterialsCostInput) || 0)).toLocaleString()} ₽
                  </span>
                </div>
                {paymentMethod === "дебетовая карта" && (
                  <div className="flex justify-between text-amber-700 font-semibold">
                    <span>Эквайринг ({daySettings.acquiringCommission}%):</span>
                    <span>
                      +{(Math.round(((Number(workCost) || 0) + (Number(salonMaterialsCostInput) || 0) + (Number(masterMaterialsCostInput) || 0)) * (daySettings.acquiringCommission / 100) * 100) / 100).toLocaleString()} ₽
                    </span>
                  </div>
                )}
                {(paymentMethod === "сертификат" || paymentMethod === "в долг") && (
                  <div className="flex justify-between text-violet-700 font-semibold text-[9px]">
                    <span>{paymentMethod === "сертификат" ? "Списание с сертификата" : "Оформление долга"} — без притока в кассу</span>
                  </div>
                )}
                {paymentMethod === "перевод" && (
                  <div className="flex justify-between text-cyan-700 font-semibold text-[9px]">
                    <span>Оплата переводом — учёт отдельно от кассы и безнала</span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-1.5 flex justify-between items-baseline">
                  <span className="text-[11px] font-bold text-slate-700">Итого к оплате:</span>
                  <span className="text-sm font-extrabold text-rose-700">
                    {Math.round(
                      ((Number(workCost) || 0) + (Number(salonMaterialsCostInput) || 0) + (Number(masterMaterialsCostInput) || 0)) * 
                      (1 + (paymentMethod === "дебетовая карта" ? daySettings.acquiringCommission / 100 : 0))
                    ).toLocaleString()} ₽
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white py-1.5 px-3 rounded text-xs font-bold uppercase tracking-wider transition-all shadow-xs"
              >
                Внести визит
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Visits detail history + Cash flow registry */}
        <div className="lg:col-span-2 space-y-3">
          {/* Table of visits with Full Audit Logs */}
          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-rose-500" />
                Журнал проведенных работ с аудитом учета
              </h3>
              
              <div className="text-right flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-slate-400 font-bold uppercase font-sans">Мастер:</span>
                <select
                  value={selectedMasterFilter}
                  onChange={(e) => setSelectedMasterFilter(e.target.value)}
                  className="text-[10px] font-semibold bg-slate-50 border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:border-slate-300"
                >
                  <option value="all">Все мастера</option>
                  {employees
                    .filter(e => e.position !== Position.Administrator)
                    .map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))
                  }
                </select>
              </div>
            </div>
            
            {displayedVisits.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded border border-dashed border-slate-200">
                <p className="text-xs text-slate-400">Нет записей {selectedMasterFilter !== "all" ? "по выбранному мастеру" : "за сегодня"}.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {displayedVisits.map(visit => {
                  const emp = employees.find(e => e.id === visit.masterId);
                  const isDeleted = visit.isDeleted;
                  const isEditingThis = editingVisitId === visit.id;

                  return (
                    <div 
                      key={visit.id} 
                      className={`border rounded p-2.5 transition-all relative ${
                        isDeleted 
                          ? "bg-red-50/20 border-red-200 opacity-60" 
                          : "bg-white border-slate-200 shadow-xs"
                      }`}
                    >
                      {/* View / Edit Form Toggle */}
                      {isEditingThis ? (
                        <div className="space-y-2">
                          <div className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Редактирование записи:</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase">Мастер</label>
                              <select
                                value={editMasterId}
                                onChange={(e) => setEditMasterId(e.target.value)}
                                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:outline-none"
                              >
                                {employees
                                  .filter(e => e.position !== Position.Administrator)
                                  .map(e => <option key={e.id} value={e.id}>{e.name}</option>)
                                }
                              </select>
                            </div>
                            {employees.find(e => e.id === editMasterId)?.position === Position.Manicurist && (
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase">Тип маникюра</label>
                                <select
                                  value={editManicureType}
                                  onChange={(e) => setEditManicureType(e.target.value as any)}
                                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:outline-none"
                                >
                                  <option value="classical">Классический</option>
                                  <option value="apparatus">Аппаратный</option>
                                </select>
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase">Работа (Р)</label>
                              <input
                                type="number"
                                value={editWorkCost}
                                onChange={(e) => setEditWorkCost(e.target.value === "" ? "" : Number(e.target.value))}
                                className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded px-2 py-1 font-mono focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase">Мат. салона (Р)</label>
                              <input
                                type="number"
                                value={editSalonMaterialsCostInput}
                                onChange={(e) => setEditSalonMaterialsCostInput(e.target.value === "" ? "" : Number(e.target.value))}
                                className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded px-2 py-1 font-mono focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase">Мат. мастера (Р)</label>
                              <input
                                type="number"
                                value={editMasterMaterialsCostInput}
                                onChange={(e) => setEditMasterMaterialsCostInput(e.target.value === "" ? "" : Number(e.target.value))}
                                className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded px-2 py-1 font-mono focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase">Оплата</label>
                              <select
                                value={editPaymentMethod}
                                onChange={(e) => setEditPaymentMethod(e.target.value as PaymentMethod)}
                                className="w-full text-xs font-semibold bg-slate-50 border border-slate-100 rounded px-2 py-1 focus:outline-none"
                              >
                                <option value="наличные">Наличные</option>
                                <option value="дебетовая карта">Картой</option>
                                <option value="перевод">Перевод</option>
                                <option value="сертификат">Сертификат</option>
                                <option value="в долг">В долг</option>
                              </select>
                            </div>
                          </div>
                          {editPaymentMethod === "сертификат" && (
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase">Сертификат</label>
                              <select
                                value={editSelectedCertId}
                                onChange={(e) => setEditSelectedCertId(e.target.value)}
                                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:outline-none"
                              >
                                <option value="">— Выберите —</option>
                                {getEditAvailableCerts(visit.id).map(c => (
                                  <option key={c.id} value={c.id}>
                                    № {c.code} — остаток {c.balance.toLocaleString()} ₽
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                          {editPaymentMethod === "в долг" && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase">Имя клиента *</label>
                                <input
                                  type="text"
                                  value={editClientName}
                                  onChange={(e) => setEditClientName(e.target.value)}
                                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase">Телефон</label>
                                <input
                                  type="text"
                                  value={editClientPhone}
                                  onChange={(e) => setEditClientPhone(e.target.value)}
                                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded px-2 py-1 focus:outline-none"
                                />
                              </div>
                            </div>
                          )}
                          <div className="flex justify-end gap-1.5 pt-1">
                            <button
                              onClick={() => setEditingVisitId(null)}
                              className="text-[10px] font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 px-2.5 py-1 rounded"
                            >
                              Отмена
                            </button>
                            <button
                              onClick={() => handleSaveEditVisit(visit.id)}
                              className="text-[10px] font-bold bg-slate-900 text-white hover:bg-slate-800 px-2.5 py-1 rounded uppercase tracking-wider"
                            >
                              Сохранить
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {/* Visit header */}
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                                  visit.paymentMethod === "наличные" 
                                    ? "bg-slate-100 border-slate-300 text-slate-600" 
                                    : visit.paymentMethod === "перевод"
                                    ? "bg-cyan-50 border-cyan-200 text-cyan-700"
                                    : visit.paymentMethod === "сертификат"
                                    ? "bg-violet-50 border-violet-200 text-violet-700"
                                    : visit.paymentMethod === "в долг"
                                    ? "bg-amber-50 border-amber-200 text-amber-700"
                                    : "bg-rose-50 border-rose-200 text-rose-700"
                                }`}>
                                  {paymentMethodLabel(visit.paymentMethod)}
                                </span>
                                {visit.clientName && (
                                  <span className="text-[9px] text-slate-500 font-semibold">{visit.clientName}</span>
                                )}
                                {isDeleted && (
                                  <span className="text-[9px] bg-red-100 border border-red-200 text-red-700 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                                    Удален
                                  </span>
                                )}
                              </div>
                              <h4 className={`text-xs font-bold text-slate-900 mt-1 leading-none ${isDeleted ? "line-through text-slate-400" : ""}`}>
                                {emp?.name || "Неизвестный мастер"}
                              </h4>
                              <p className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase tracking-tight">
                                {emp?.position}
                                {visit.manicureType && ` (${visit.manicureType === "classical" ? "классический" : "аппаратный"})`}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className={`text-xs font-extrabold font-mono text-slate-900 ${isDeleted ? "line-through text-slate-400" : ""}`}>
                                {visit.totalCost ? Math.round(visit.workCost + visit.materialsCost + visit.acquiringCost).toLocaleString() : 0} ₽
                              </div>
                              <p className="text-[9px] text-slate-400 font-mono mt-0.5 leading-none">
                                Раб: {visit.workCost} ₽
                                {visit.salonMaterialsCost !== undefined && visit.salonMaterialsCost > 0 ? ` | Мат. салония: ${visit.salonMaterialsCost} ₽` : ""}
                                {visit.masterMaterialsCost !== undefined && visit.masterMaterialsCost > 0 ? ` | Мат. мастера: ${visit.masterMaterialsCost} ₽` : ""}
                                {!(visit.salonMaterialsCost !== undefined || visit.masterMaterialsCost !== undefined) && visit.materialsCost > 0 ? ` | Преп: ${visit.materialsCost} ₽ (${(visit as any).isSalonMaterials !== false ? "Салон" : "Мастер"})` : ""}
                                {visit.acquiringCost > 0 && ` | Экв: ${visit.acquiringCost} ₽`}
                              </p>
                            </div>
                          </div>

                          {/* Historical logs tracking */}
                          {showVisitChangeHistory && (
                            <div className="bg-slate-50 border border-slate-200 rounded p-1.5 text-[9px] text-slate-600 space-y-0.5 font-mono leading-relaxed">
                              <div className="font-bold text-slate-500 uppercase tracking-wider text-[8px] mb-0.5">История сессии:</div>
                              {visit.editLogs.map((log, index) => (
                                <div key={index} className="flex gap-1.5 border-b border-slate-100 pb-0.5 last:border-0 last:pb-0">
                                  <span className="text-slate-400 font-semibold whitespace-nowrap">{log.timestamp}</span>
                                  <span className={`font-extrabold uppercase text-[8px] ${
                                    log.action === "создан" ? "text-slate-500" : log.action === "удален" ? "text-red-500" : "text-amber-700"
                                  }`}>
                                    [{log.action}]
                                  </span>
                                  <span className="text-slate-600 font-medium">{log.details}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Control actions */}
                          <div className="flex justify-end gap-1.5 pt-0.5">
                            {isDeleted ? (
                              <div className="flex gap-1.5 flex-wrap">
                                <button
                                  onClick={() => handleRestoreVisit(visit.id)}
                                  className="text-[9px] font-bold text-slate-700 hover:text-slate-900 uppercase tracking-wider flex items-center gap-1 bg-slate-100 border border-slate-300 py-0.5 px-2 rounded hover:bg-slate-200 transition-colors"
                                >
                                  <Undo2 className="h-2.5 w-2.5" />
                                  Восстановить
                                </button>
                                {allowDeleteVisits ? (
                                  confirmPermanentDeleteVisitId === visit.id ? (
                                    <button
                                      onClick={() => {
                                        handlePermanentDeleteVisit(visit.id);
                                        setConfirmPermanentDeleteVisitId(null);
                                      }}
                                      className="text-[9px] font-bold text-white bg-red-600 hover:bg-red-700 uppercase tracking-wider flex items-center gap-1 border border-red-700 py-0.5 px-2 rounded transition-colors animate-pulse animate-duration-1000"
                                    >
                                      <Trash2 className="h-2.5 w-2.5" />
                                      Удалить навсегда?
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setConfirmPermanentDeleteVisitId(visit.id);
                                        setTimeout(() => {
                                          setConfirmPermanentDeleteVisitId(current => current === visit.id ? null : current);
                                        }, 4000);
                                      }}
                                      className="text-[9px] font-bold text-red-600 hover:text-red-700 uppercase tracking-wider flex items-center gap-1 bg-red-50 border border-red-200 py-0.5 px-2 rounded hover:bg-red-100 transition-colors"
                                    >
                                      <Trash2 className="h-2.5 w-2.5" />
                                      Удалить навсегда
                                    </button>
                                  )
                                ) : (
                                  <span className="text-[9px] text-slate-400 italic bg-slate-50 py-0.5 px-1.5 rounded border border-slate-100">
                                    Удаление ограничено
                                  </span>
                                )}
                              </div>
                            ) : (
                              <>
                                {(() => {
                                  const createdLog = visit.editLogs.find(log => log.action === "создан") || visit.editLogs[0];
                                  if (!createdLog) return null;
                                  const timePart = createdLog.timestamp.includes(" ") 
                                    ? createdLog.timestamp.split(" ")[1] 
                                    : createdLog.timestamp;
                                  return (
                                    <span className="text-[10px] font-mono font-bold text-slate-400 self-center mr-2 flex items-center gap-1" title={`Время внесения записи: ${createdLog.timestamp}`}>
                                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                                      {timePart}
                                    </span>
                                  );
                                })()}
                                <button
                                  onClick={() => startEditVisit(visit)}
                                  className="text-[9px] font-bold text-slate-600 hover:text-slate-900 uppercase tracking-wider flex items-center gap-1 bg-slate-100 border border-slate-300 py-0.5 px-2 rounded hover:bg-slate-200 transition-colors"
                                >
                                  <Edit2 className="h-2.5 w-2.5" />
                                  Изменить
                                </button>
                                {allowDeleteVisits ? (
                                  confirmDeleteVisitId === visit.id ? (
                                    <button
                                      onClick={() => {
                                        handleDeleteVisit(visit.id);
                                        setConfirmDeleteVisitId(null);
                                      }}
                                      className="text-[9px] font-bold text-white bg-red-600 hover:bg-red-700 uppercase tracking-wider flex items-center gap-1 border border-red-700 py-0.5 px-2 rounded transition-colors animate-pulse"
                                    >
                                      <Trash2 className="h-2.5 w-2.5" />
                                      Точно?
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => {
                                        setConfirmDeleteVisitId(visit.id);
                                        setTimeout(() => {
                                          setConfirmDeleteVisitId(current => current === visit.id ? null : current);
                                        }, 4000);
                                      }}
                                      className="text-[9px] font-bold text-red-600 hover:text-red-700 uppercase tracking-wider flex items-center gap-1 bg-red-50 border border-red-200 py-0.5 px-2 rounded hover:bg-red-100 transition-colors"
                                    >
                                      <Trash2 className="h-2.5 w-2.5" />
                                      Удалить
                                    </button>
                                  )
                                ) : (
                                  <span className="text-[9px] text-slate-400 italic bg-slate-50 py-0.5 px-1.5 rounded border border-slate-100">
                                    Удаление ограничено
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cashbox registry box */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3" id="accounting-financials">
        {/* Cash balance and operational minuses */}
        <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <RussianRuble className="h-3.5 w-3.5 text-rose-500" />
            Кассовые операции и операционные расходы
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Opening cash drawer setter */}
            <form onSubmit={handleSaveStartingCash} className="border border-slate-200 rounded p-2.5 space-y-2 bg-slate-50/50">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Денежный ящик (Утро)</span>
              <div className="text-sm font-mono font-bold text-slate-800">
                Текущий остаток: {startCash.toLocaleString()} ₽
              </div>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  placeholder="Ввести наличные"
                  value={startingCashInput}
                  onChange={(e) => setStartingCashInput(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-rose-200"
                  min="0"
                />
                <button
                  type="submit"
                  className="bg-slate-900 text-white rounded text-xs font-bold px-2 py-1 hover:bg-slate-800 transition-colors uppercase tracking-wider"
                >
                  Задать
                </button>
              </div>
            </form>

            {/* Salon materials consumed / stats indicators */}
            <div className="border border-slate-200 rounded p-2.5 flex flex-col justify-between bg-slate-50/50">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Солярий</span>
                <div className="text-sm font-mono font-bold text-rose-700">
                  +{solariumTotal.toLocaleString()} ₽
                </div>
                <span className="text-[9px] text-slate-400 block mt-0.5 leading-tight">
                  (Нал: +{solariumCashRevenue} ₽ | Картой: +{solariumCardRevenue} ₽ | Перевод: +{solariumTransferRevenue} ₽)
                </span>
              </div>
              <div className="pt-1.5 border-t border-slate-200 mt-1.5 space-y-1">
                <div className="text-[9px] text-slate-500">
                  Расходники дня: <strong className="font-mono text-slate-700">{totalSalonMaterialsCost} ₽</strong>
                </div>
                <div className="text-[9px] text-slate-500">
                  Материалы солярия: <strong className="font-mono text-blue-600">{totalSolariumMaterialsToday} ₽</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Add dynamic operating expense form */}
          <div className="border-t border-slate-150 pt-3.5 space-y-2.5">
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">Внести операционный расход за день (Минусы)</span>
            <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div className="md:col-span-1">
                <input
                  type="number"
                  placeholder="Сумма"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 font-mono focus:outline-none"
                  min="0"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <input
                  type="text"
                  placeholder="Комментарий (описание расхода)"
                  value={expComment}
                  onChange={(e) => setExpComment(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none input-high-density"
                  required
                />
              </div>
              <div className="md:col-span-1">
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:outline-none bg-white font-semibold"
                >
                  <option value="Свет">Свет / Вода</option>
                  <option value="Вывоз мусора">Вывоз мусора</option>
                  <option value="Покупка товара">Материалы</option>
                  <option value="Хозрасходы">Хозрасходы</option>
                  <option value="Прочее">Прочее</option>
                </select>
              </div>
              <button
                type="submit"
                className="md:col-span-4 bg-slate-900 hover:bg-slate-800 text-white rounded py-1 font-bold text-xs uppercase tracking-wider transition-colors mt-0.5 shadow-xs"
              >
                + Записать расход
              </button>
            </form>

            {/* List of today op expenses */}
            {allDayExtraTransactionsIncludeDeleted.length > 0 && (
              <div className="space-y-1 pt-1.5 font-sans">
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Операции расходов за сегодня:</span>
                <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                  {allDayExtraTransactionsIncludeDeleted.map(tx => {
                    const isDeleted = tx.isDeleted;
                    return (
                      <div 
                        key={tx.id} 
                        className={`flex justify-between items-center text-[10px] py-1.5 px-2.5 rounded border transition-all ${
                          isDeleted 
                            ? "bg-red-50/20 border-red-200 opacity-70" 
                            : "bg-slate-50 border-slate-200 shadow-2xs"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <span className={`font-bold mr-1.5 font-mono ${isDeleted ? "line-through text-slate-400" : "text-red-600"}`}>
                            -{tx.amount} ₽
                          </span>
                          <span className={`font-semibold ${isDeleted ? "line-through text-slate-450" : "text-slate-600"}`}>
                            {tx.comment}
                          </span>
                          <span className="text-[8px] text-slate-400 ml-1.5 font-mono">({tx.category})</span>
                          {isDeleted && (
                            <span className="text-[8px] bg-red-100 border border-red-200 text-red-700 font-bold px-1 py-0.5 rounded uppercase tracking-wider ml-1.5">
                              Удален
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1.5 ml-2 shrink-0">
                          {isDeleted ? (
                            <>
                              <button
                                onClick={() => handleRestoreExtraTx(tx.id)}
                                className="text-[8px] font-bold text-slate-600 hover:text-slate-800 uppercase tracking-wider flex items-center gap-0.5 bg-white border border-slate-300 py-0.5 px-1.5 rounded hover:bg-slate-50 transition-colors"
                                title="Восстановить расход"
                              >
                                <Undo2 className="h-2.5 w-2.5" />
                                Восст.
                              </button>
                              {allowDeleteVisits ? (
                                confirmPermanentDeleteExtraTxId === tx.id ? (
                                  <button
                                    onClick={() => {
                                      handlePermanentDeleteExtraTx(tx.id);
                                      setConfirmPermanentDeleteExtraTxId(null);
                                    }}
                                    className="text-[8px] font-bold text-white bg-red-600 hover:bg-red-700 uppercase tracking-wider flex items-center gap-0.5 border border-red-700 py-0.5 px-1.5 rounded transition-colors animate-pulse animate-duration-1000"
                                    title="Удалить навсегда"
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                    Окончат.
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setConfirmPermanentDeleteExtraTxId(tx.id);
                                      setTimeout(() => {
                                        setConfirmPermanentDeleteExtraTxId(current => current === tx.id ? null : current);
                                      }, 4000);
                                    }}
                                    className="text-red-500 hover:text-red-700 p-0.5 hover:bg-red-50 rounded border border-transparent hover:border-red-100 transition-colors"
                                    title="Удалить окончательно"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )
                              ) : null}
                            </>
                          ) : (
                            <>
                              {allowDeleteVisits ? (
                                confirmDeleteExtraTxId === tx.id ? (
                                  <button
                                    onClick={() => {
                                      handleDeleteExtraTx(tx.id);
                                      setConfirmDeleteExtraTxId(null);
                                    }}
                                    className="text-[8px] font-bold text-white bg-red-600 hover:bg-red-700 uppercase tracking-wider py-0.5 px-1.5 rounded transition-colors animate-pulse animate-duration-1000"
                                  >
                                    Точно?
                                  </button>
                                ) : (
                                  <button 
                                    onClick={() => {
                                      setConfirmDeleteExtraTxId(tx.id);
                                      setTimeout(() => {
                                        setConfirmDeleteExtraTxId(current => current === tx.id ? null : current);
                                      }, 4000);
                                    }}
                                    className="text-slate-400 hover:text-red-500 p-0.5 rounded transition-colors"
                                    title="Удалить расход"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                )
                              ) : (
                                <span className="text-[8px] text-slate-400 italic bg-slate-100 py-0.5 px-1 rounded border border-slate-200">Блок</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Dynamic summary daily balance sheet */}
        <div className="bg-slate-900 text-slate-100 p-3.5 rounded-lg border border-slate-950 shadow-sm flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">Итого за {new Date(selectedDate).toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}</span>
            </div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-200 border-b border-slate-800 pb-1.5">Финансовый контур дня</h3>
          </div>

          <div className="space-y-2 text-xs font-sans divide-y divide-slate-800/80">
            {/* Start Cash */}
            <div className="flex justify-between items-baseline pt-1.5 first:pt-0">
               <span className="text-slate-400">Касса на начало дня:</span>
               <span className="font-mono font-bold text-slate-300">{startCash.toLocaleString()} ₽</span>
            </div>

            {/* Cash Additions + Beauty Cash + Solarium Cash */}
            <div className="flex justify-between items-baseline pt-1.5">
               <span className="text-slate-400">Внесено наличных:</span>
               <div className="text-right">
                 <span className="font-mono font-bold text-emerald-400">+{cashInflowToday.toLocaleString()} ₽</span>
                 <div className="text-[9px] text-slate-500 font-mono">
                   (Визиты: {visitsCashTotal} ₽ | Солярий: {solariumCashRevenue} ₽ | Сертиф.: {certSalesCashToday} ₽ | Долги: {debtPaymentsCash} ₽)
                 </div>
               </div>
            </div>

            {/* Cards receipts */}
            <div className="flex justify-between items-baseline pt-1.5">
               <span className="text-slate-400">На безналичный счет:</span>
               <div className="text-right">
                 <span className="font-mono font-bold text-blue-400">+{(visitsCardTotal + solariumCardRevenue + certSalesCardToday + debtPaymentsCard).toLocaleString()} ₽</span>
                 <div className="text-[9px] text-slate-500 font-mono">
                   (Визиты: {visitsCardTotal} ₽ | Солярий: {solariumCardRevenue} ₽ | Сертиф.: {certSalesCardToday} ₽ | Долги: {debtPaymentsCard} ₽)
                 </div>
               </div>
            </div>

            {/* Bank transfers — separate category */}
            <div className="flex justify-between items-baseline pt-1.5">
               <span className="text-slate-400">Переводы (отдельно):</span>
               <div className="text-right">
                 <span className="font-mono font-bold text-cyan-400">+{transferTotalToday.toLocaleString()} ₽</span>
                 <div className="text-[9px] text-slate-500 font-mono">
                   (Визиты: {visitsTransferTotal} ₽ | Солярий: {solariumTransferRevenue} ₽ | Сертиф.: {certSalesTransferToday} ₽ | Долги: {debtPaymentsTransfer} ₽)
                 </div>
               </div>
            </div>

            {/* Certificates redemption — no cash inflow */}
            {(visitsCertTotal > 0) && (
              <div className="flex justify-between items-baseline pt-1.5">
                 <span className="text-slate-400">Погашено сертификатами:</span>
                 <span className="font-mono font-bold text-violet-400">{visitsCertTotal.toLocaleString()} ₽</span>
              </div>
            )}

            {/* New debts issued today */}
            {(visitsDebtTotal > 0) && (
              <div className="flex justify-between items-baseline pt-1.5">
                 <span className="text-slate-400">Новые долги (визиты):</span>
                 <span className="font-mono font-bold text-amber-400">{visitsDebtTotal.toLocaleString()} ₽</span>
              </div>
            )}

            {/* Acquiring Expenses */}
            <div className="flex justify-between items-baseline pt-1.5 font-sans">
               <span className="text-slate-400">Комиссии эквайринга (расход):</span>
               <span className="font-mono font-bold text-rose-400/90">-{totalAcquiringToday.toLocaleString()} ₽</span>
            </div>

            {/* Expenses */}
            <div className="flex justify-between items-baseline pt-1.5 font-sans">
               <span className="text-slate-400">Операционные расходы дня:</span>
               <span className="font-mono font-bold text-red-400">-{dayExpensesTotal.toLocaleString()} ₽</span>
            </div>

            {/* Salon materials expenses */}
            <div className="flex justify-between items-baseline pt-1.5 font-sans">
               <span className="text-slate-400">Материалы:</span>
               <div className="text-right">
                 <span className="font-mono font-bold text-emerald-400">+{(totalSalonMaterialsCost + totalSolariumMaterialsToday).toLocaleString()} ₽</span>
                 <div className="text-[9px] text-slate-500 font-mono">
                   (Услуги: {totalSalonMaterialsCost.toLocaleString()} ₽ | Солярий: {totalSolariumMaterialsToday.toLocaleString()} ₽)
                 </div>
               </div>
            </div>

            {/* Payouts */}
            <div className="flex justify-between items-baseline pt-1.5">
               <span className="text-slate-400 font-sans">Выплаты и авансы сотрудникам:</span>
               <span className="font-mono font-bold text-red-400">-{activeMasterPayoutsToday.toLocaleString()} ₽</span>
            </div>
          </div>

          {/* End Of Day Projected Cash Drawer */}
          <div className="bg-slate-950 p-2.5 rounded border border-slate-800 flex justify-between items-center">
            <div>
               <span className="text-[10px] font-bold text-slate-300 block uppercase tracking-wide">Касса на вечер</span>
               <span className="text-[8px] text-slate-500 font-mono">(Проект в ящике наличными)</span>
            </div>
            <span className="text-lg font-black font-mono text-emerald-400">
               {endCash.toLocaleString()} ₽
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(DailyAccounting);
