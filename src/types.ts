export enum Position {
  Owner = "Владелица",
  Hairdresser = "Мастер-парикмахер",
  Manicurist = "Мастер маникюра",
  Lashmaker = "Мастер наращивания",
  Visagiste = "Визажист",
  Administrator = "Администратор",
}

export interface Employee {
  id: string;
  name: string;
  position: Position;
  percentage: number; // default work percentage (e.g. 50%)
  manicuresPercentage?: {
    classical: number; // e.g. 80%
    apparatus: number; // e.g. 75%
  };
  dailyRent: number; // rent per day if any
  phone: string;
  birthday?: string;
}

export interface VisitEditLog {
  timestamp: string;
  action: "создан" | "отредактирован" | "удален";
  details: string;
}

/** Способы получения денег в кассу / на счёт / переводом */
export type ReceivingPaymentMethod = "наличные" | "дебетовая карта" | "перевод";

/** Все способы оплаты визита, включая сертификат и долг */
export type PaymentMethod = ReceivingPaymentMethod | "сертификат" | "в долг";

export interface Visit {
  id: string;
  date: string; // YYYY-MM-DD
  masterId: string;
  paymentMethod: PaymentMethod;
  workCost: number;
  materialsCost: number;
  salonMaterialsCost?: number;
  masterMaterialsCost?: number;
  manicureType?: "classical" | "apparatus";
  acquiringCost: number;
  totalCost: number;
  /** ID сертификата при оплате сертификатом */
  giftCertificateId?: string;
  certificateAmountUsed?: number;
  /** ID записи долга при оплате «в долг» */
  debtId?: string;
  clientName?: string;
  clientPhone?: string;
  isDeleted?: boolean;
  editLogs: VisitEditLog[];
  originalWorkCost?: number;
  originalMaterialsCost?: number;
}

export interface SolariumSession {
  id: string;
  date: string;
  minutes: number;
  creamPrice: number;
  stickersPrice: number;
  paymentMethod: ReceivingPaymentMethod | "в долг";
  acquiringCost?: number;
  clientName?: string;
  debtId?: string;
}

export interface GiftCertificateUsage {
  id: string;
  date: string;
  visitId: string;
  amount: number;
}

export interface GiftCertificate {
  id: string;
  code: string;
  nominal: number;
  balance: number;
  soldDate: string;
  soldTo?: string;
  salePaymentMethod: ReceivingPaymentMethod;
  note?: string;
  isActive: boolean;
  usages: GiftCertificateUsage[];
}

export interface DebtPayment {
  id: string;
  date: string;
  amount: number;
  paymentMethod: ReceivingPaymentMethod;
  comment?: string;
}

export interface DebtRecord {
  id: string;
  clientName: string;
  clientPhone?: string;
  visitId: string;
  visitDate: string;
  originalAmount: number;
  remainingAmount: number;
  createdDate: string;
  dueDate?: string;
  comment?: string;
  payments: DebtPayment[];
  isClosed: boolean;
}

export interface ExtraTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: "плюс" | "минус";
  amount: number;
  comment: string;
  category?: string; // e.g. "Интернет", "Свет", "Аренда", "Закупка товара"
  isDeleted?: boolean;
}

// System configuration rule that changes over time
export interface SettingsRule {
  id: string;
  effectiveDate: string; // YYYY-MM-DD
  acquiringCommission: number; // in percent (e.g. 3.5)
  adminBaseRate: number; // in rub (e.g. 1500)
  solariumMinuteRate: number; // in rub (e.g. 30)
}

export interface RawMaterialPrices {
  shampooProscenia: number; // R/ml
  lotionAcPretreatment: number; // R/ml
  laminatingGel: number; // R/gr
  maskProscenia: number; // R/ml
  shampooProeditCurlFit: number; // R/ml
  basePliaBase: number; // R/ml
  lotionPliaStep1: number; // R/ml
  lotionPliaStep2: number; // R/ml
  conditionerPearl: number; // R/ml
  serumAfterPerm: number; // R/ml
}

export interface AdminDayOfWeekRate {
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
}

export interface AdminDaysRateRule {
  id: string;
  effectiveDate: string; // YYYY-MM-DD
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
}

export interface AdminShift {
  id: string;
  adminId: string;
  date: string; // YYYY-MM-DD
  rate: number; // recorded rate at that day
}

export interface MasterFinanceRecord {
  masterId: string;
  shiftsCount: number;
  shareAmount: number;
  materialsReimbursement: number; // materials provided by master or return
  rentDeduction: number;
  extraDeductions: number; // fines, manual rent, etc. Triggered via transaction
  extraAdditions: number; // advances or manual payouts
  paidOutAmount: number; // total paid on hand
  balance: number; // rest to pay
}

export interface MasterTransaction {
  id: string;
  masterId: string;
  type: "выплата" | "аванс" | "штраф" | "вычет аренды" | "возврат материалов" | "прочее";
  amount: number;
  date: string; // YYYY-MM-DD
  comment: string;
}

export interface DailyCashState {
  date: string; // YYYY-MM-DD
  startCash: number; // entered by user at start of day
}
