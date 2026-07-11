import { 
  Employee, 
  Position, 
  SettingsRule, 
  RawMaterialPrices, 
  AdminDayOfWeekRate,
  AdminDaysRateRule,
  Visit, 
  SolariumSession, 
  ExtraTransaction, 
  MasterTransaction, 
  AdminShift, 
  DailyCashState 
} from "./types";

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: "emp-1",
    name: "Епифанцева В.А.",
    position: Position.Owner,
    percentage: 100,
    dailyRent: 0,
    phone: "+7 (999) 111-22-33"
  },
  {
    id: "emp-2",
    name: "Потоцкая И.Р.",
    position: Position.Hairdresser,
    percentage: 50,
    dailyRent: 0,
    phone: "+7 (999) 234-56-78"
  },
  {
    id: "emp-3",
    name: "Федотова Г.Н.",
    position: Position.Hairdresser,
    percentage: 50,
    dailyRent: 0,
    phone: "+7 (999) 345-67-89"
  },
  {
    id: "emp-4",
    name: "Мастер маникюра",
    position: Position.Manicurist,
    percentage: 50,
    manicuresPercentage: {
      classical: 80,
      apparatus: 75
    },
    dailyRent: 0,
    phone: "+7 (999) 987-65-43"
  },
  {
    id: "emp-5",
    name: "Елизавета (Наращивание)",
    position: Position.Lashmaker,
    percentage: 50,
    dailyRent: 0,
    phone: "+7 (999) 456-12-34"
  },
  {
    id: "emp-6",
    name: "Анна (Визаж)",
    position: Position.Visagiste,
    percentage: 50,
    dailyRent: 0,
    phone: "+7 (999) 567-89-01"
  },
  {
    id: "emp-7",
    name: "Яна",
    position: Position.Administrator,
    percentage: 0,
    dailyRent: 0,
    phone: "+7 (900) 000-00-01"
  },
  {
    id: "emp-8",
    name: "Подмена",
    position: Position.Administrator,
    percentage: 0,
    dailyRent: 0,
    phone: "+7 (900) 000-00-02"
  }
];

export const INITIAL_SETTINGS_RULES: SettingsRule[] = [
  {
    id: "rule-1",
    effectiveDate: "2020-01-01",
    acquiringCommission: 3.5,
    adminBaseRate: 1500,
    solariumMinuteRate: 30
  }
];

export const INITIAL_RAW_MATERIAL_PRICES: RawMaterialPrices = {
  shampooProscenia: 6.222,
  lotionAcPretreatment: 4.991,
  laminatingGel: 12.0,
  maskProscenia: 5.5,
  shampooProeditCurlFit: 6.0,
  basePliaBase: 20.0,
  lotionPliaStep1: 13.3475,
  lotionPliaStep2: 5.0,
  conditionerPearl: 8.5,
  serumAfterPerm: 15.0
};

export const INITIAL_ADMIN_DAYS_RATES: AdminDayOfWeekRate = {
  monday: 1500,
  tuesday: 1500,
  wednesday: 1500,
  thursday: 1500,
  friday: 1500,
  saturday: 1800,
  sunday: 1800
};

export const INITIAL_VISITS: Visit[] = [];

export const INITIAL_SOLARIUM_SESSIONS: SolariumSession[] = [];

export const INITIAL_EXTRA_TRANSACTIONS: ExtraTransaction[] = [];

export const INITIAL_MASTER_TRANSACTIONS: MasterTransaction[] = [];

export const INITIAL_ADMIN_SHIFTS: AdminShift[] = [];

export const INITIAL_DAILY_CASH: DailyCashState[] = [];

export const INITIAL_MATERIAL_PACKAGING: Record<string, { price: number; volume: number }> = {
  shampooProscenia: { price: 6222, volume: 1000 },
  lotionAcPretreatment: { price: 4991, volume: 1000 },
  laminatingGel: { price: 1800, volume: 150 },
  maskProscenia: { price: 5280, volume: 980 },
  shampooProeditCurlFit: { price: 1500, volume: 250 },
  basePliaBase: { price: 5000, volume: 250 },
  lotionPliaStep1: { price: 5339, volume: 400 },
  lotionPliaStep2: { price: 2000, volume: 400 },
  conditionerPearl: { price: 4250, volume: 500 },
  serumAfterPerm: { price: 3000, volume: 200 },
};

export const INITIAL_MATERIAL_CONSUMPTIONS = {
  lamination: {
    короткие: { shampoo: 15, lotion: 10, mask: 10, gel: 45, constant: 105, baseCost: 1000 },
    средние: { shampoo: 20, lotion: 15, mask: 15, gel: 65, constant: 125, baseCost: 1300 },
    удлиненные: { shampoo: 25, lotion: 20, mask: 20, gel: 120, constant: 150, baseCost: 1500 },
    длинные: { shampoo: 30, lotion: 25, mask: 25, gel: 100, constant: 150, baseCost: 1800 },
  },
  biocurl: {
    частичная: { shampoo: 5, base: 4, lotionOne: 10, lotionTwo: 10, cond: 10, serum: 8, constant: 80, baseCost: 800 },
    короткие: { shampoo: 8, base: 6, lotionOne: 12, lotionTwo: 12, cond: 12, serum: 10, constant: 100, baseCost: 1000 },
    средние: { shampoo: 12, base: 10, lotionOne: 15, lotionTwo: 15, cond: 20, serum: 15, constant: 120, baseCost: 1200 },
    удлиненные: { shampoo: 15, base: 12, lotionOne: 18, lotionTwo: 18, cond: 22, serum: 18, constant: 140, baseCost: 1400 },
    длинные: { shampoo: 18, base: 15, lotionOne: 20, lotionTwo: 20, cond: 25, serum: 20, constant: 150, baseCost: 1600 },
  },
};

export const INITIAL_ADMIN_DAYS_RATES_RULES: AdminDaysRateRule[] = [
  {
    id: "default-days-rule",
    effectiveDate: "2020-01-01",
    monday: 1500,
    tuesday: 1500,
    wednesday: 1500,
    thursday: 1500,
    friday: 1500,
    saturday: 1800,
    sunday: 1800,
  },
];

export const DEFAULT_APP_PREFERENCES = {
  showDeletedVisits: true,
  allowDeleteVisits: true,
  allowDeleteCertificates: true,
  showVisitChangeHistory: true,
  allowMasterPayouts: true,
  allowAdminShiftEdits: true,
  hideFormulaCalculations: false,
  keepOwnerUnlocked: false,
  autoLockDuration: 5,
  autoBackupEnabled: true,
  autoBackupInterval: "weekly" as "daily" | "weekly",
};
