import { describe, expect, it } from "vitest";
import {
  computeDayAcquiring,
  computeDayCashlessGross,
} from "../utils/dailyFinanceUtils";
import { GiftCertificate, DebtRecord, SettingsRule, Visit } from "../types";

const settingsRules: SettingsRule[] = [
  {
    id: "s1",
    effectiveDate: "2020-01-01",
    acquiringCommission: 3,
    adminBaseRate: 1500,
    solariumMinuteRate: 30,
  },
];

describe("dailyFinanceUtils — сертификаты и долги", () => {
  it("учитывает эквайринг при продаже сертификата картой", () => {
    const certs: GiftCertificate[] = [
      {
        id: "c1",
        code: "1001",
        nominal: 5000,
        balance: 5000,
        soldDate: "2026-07-01",
        soldTo: "Клиент",
        salePaymentMethod: "дебетовая карта",
        isActive: true,
        usages: [],
      },
    ];
    expect(computeDayAcquiring("2026-07-01", [], [], certs, [], settingsRules)).toBe(150);
  });

  it("учитывает эквайринг при погашении долга картой", () => {
    const debts: DebtRecord[] = [
      {
        id: "d1",
        clientName: "Иван",
        visitId: "v1",
        visitDate: "2026-07-01",
        originalAmount: 6000,
        remainingAmount: 0,
        isClosed: true,
        createdDate: "2026-07-01",
        payments: [
          {
            id: "p1",
            date: "2026-07-05",
            amount: 6000,
            paymentMethod: "дебетовая карта",
            acquiringCost: 210,
          },
        ],
      },
    ];
    expect(computeDayAcquiring("2026-07-05", [], [], [], debts, settingsRules)).toBe(210);
  });

  it("брутто безнал включает продажу сертификата и погашение долга", () => {
    const certs: GiftCertificate[] = [
      {
        id: "c1",
        code: "1001",
        nominal: 5000,
        balance: 5000,
        soldDate: "2026-07-01",
        salePaymentMethod: "дебетовая карта",
        isActive: true,
        usages: [],
      },
    ];
    const debts: DebtRecord[] = [
      {
        id: "d1",
        clientName: "Иван",
        visitId: "v2",
        visitDate: "2026-07-01",
        originalAmount: 3000,
        remainingAmount: 0,
        isClosed: true,
        createdDate: "2026-07-01",
        payments: [
          {
            id: "p1",
            date: "2026-07-01",
            amount: 3000,
            paymentMethod: "дебетовая карта",
            acquiringCost: 90,
          },
        ],
      },
    ];
    const gross = computeDayCashlessGross("2026-07-01", [], [], certs, debts, settingsRules);
    expect(gross).toBe(8240);
  });

  it("визит по сертификату не даёт эквайринг в день услуги", () => {
    const visits: Visit[] = [
      {
        id: "v1",
        date: "2026-07-02",
        masterId: "m1",
        workCost: 4000,
        materialsCost: 0,
        paymentMethod: "сертификат",
        acquiringCost: 0,
        totalCost: 4000,
        editLogs: [],
      },
    ];
    expect(computeDayAcquiring("2026-07-02", visits, [], [], [], settingsRules)).toBe(0);
  });
});

describe("модель чистой прибыли (начисление по визитам)", () => {
  it("выручка услуги считается в workCost независимо от способа оплаты", () => {
    const certVisit: Visit = {
      id: "v1",
      date: "2026-07-02",
      masterId: "m1",
      workCost: 4000,
      materialsCost: 500,
      paymentMethod: "сертификат",
      acquiringCost: 0,
      totalCost: 4500,
      editLogs: [],
    };
    const debtVisit: Visit = {
      id: "v2",
      date: "2026-07-02",
      masterId: "m1",
      workCost: 6000,
      materialsCost: 0,
      paymentMethod: "в долг",
      acquiringCost: 0,
      totalCost: 6000,
      editLogs: [],
    };
    const serviceRevenue = [certVisit, debtVisit].reduce((s, v) => s + v.workCost, 0);
    expect(serviceRevenue).toBe(10000);
  });
});
