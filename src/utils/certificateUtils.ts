import { GiftCertificate } from "../types";

/** Остаток сертификата после списания (не опускается ниже 0). */
export function applyCertificateDeduction(
  balance: number,
  amount: number
): { newBalance: number; isActive: boolean } {
  const newBalance = Math.round((balance - amount) * 100) / 100;
  return { newBalance: Math.max(0, newBalance), isActive: newBalance > 0 };
}

/** Сумма, которую можно списать с сертификата для визита. */
export function getCertificateAvailableForVisit(
  cert: GiftCertificate,
  visitAmount: number,
  restoreAmount = 0
): number {
  return cert.balance + restoreAmount;
}

export function canPayWithCertificate(
  cert: GiftCertificate | undefined,
  amount: number,
  restoreAmount = 0
): boolean {
  if (!cert) return false;
  const available = cert.balance + restoreAmount;
  return available >= amount;
}
