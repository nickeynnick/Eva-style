import { PaymentMethod, ReceivingPaymentMethod, Visit } from "../types";

export const RECEIVING_PAYMENT_METHODS: ReceivingPaymentMethod[] = [
  "наличные",
  "дебетовая карта",
  "перевод",
];

export const ALL_PAYMENT_METHODS: PaymentMethod[] = [
  "наличные",
  "дебетовая карта",
  "перевод",
  "сертификат",
  "в долг",
];

export function getVisitBaseAmount(workCost: number, materialsCost: number): number {
  return workCost + materialsCost;
}

export function calculateAcquiring(base: number, paymentMethod: PaymentMethod, commissionPct: number): number {
  if (paymentMethod !== "дебетовая карта") return 0;
  return Math.round(base * (commissionPct / 100) * 100) / 100;
}

export function calculateVisitTotal(
  workCost: number,
  materialsCost: number,
  paymentMethod: PaymentMethod,
  commissionPct: number
): { base: number; acquiringCost: number; totalCost: number } {
  const base = getVisitBaseAmount(workCost, materialsCost);
  const acquiringCost = calculateAcquiring(base, paymentMethod, commissionPct);
  return { base, acquiringCost, totalCost: base + acquiringCost };
}

export function getVisitPaidAmount(visit: Visit): number {
  if (visit.isDeleted) return 0;
  if (visit.paymentMethod === "в долг" || visit.paymentMethod === "сертификат") {
    return visit.workCost + visit.materialsCost;
  }
  return visit.workCost + visit.materialsCost + visit.acquiringCost;
}

export function getVisitCashAmount(visit: Visit): number {
  if (visit.isDeleted || visit.paymentMethod !== "наличные") return 0;
  return visit.workCost + visit.materialsCost;
}

export function getVisitCardAmount(visit: Visit): number {
  if (visit.isDeleted || visit.paymentMethod !== "дебетовая карта") return 0;
  return visit.workCost + visit.materialsCost + visit.acquiringCost;
}

export function getVisitTransferAmount(visit: Visit): number {
  if (visit.isDeleted || visit.paymentMethod !== "перевод") return 0;
  return visit.workCost + visit.materialsCost;
}

export function paymentMethodLabel(method: PaymentMethod | string): string {
  switch (method) {
    case "наличные":
      return "Наличные";
    case "дебетовая карта":
      return "Картой";
    case "перевод":
      return "Перевод";
    case "сертификат":
      return "Сертификат";
    case "в долг":
      return "В долг";
    default:
      return String(method);
  }
}

export function normalizeCertificateNumber(input: string): string {
  return input.replace(/\D/g, "");
}

export function isValidCertificateNumber(code: string): boolean {
  return /^\d+$/.test(code) && code.length > 0;
}
