import { describe, it, expect } from "vitest";
import {
  applyCertificateDeduction,
  canPayWithCertificate,
} from "../utils/certificateUtils";
import { GiftCertificate } from "../types";

const cert: GiftCertificate = {
  id: "c1",
  code: "10001",
  nominal: 5000,
  balance: 3000,
  soldDate: "2026-01-01",
  salePaymentMethod: "наличные",
  isActive: true,
  usages: [],
};

describe("certificateUtils", () => {
  it("deducts amount and deactivates when empty", () => {
    const r = applyCertificateDeduction(3000, 3000);
    expect(r.newBalance).toBe(0);
    expect(r.isActive).toBe(false);
  });

  it("allows payment when balance sufficient", () => {
    expect(canPayWithCertificate(cert, 2500)).toBe(true);
    expect(canPayWithCertificate(cert, 3500)).toBe(false);
  });

  it("accounts for restored amount when re-editing visit", () => {
    expect(canPayWithCertificate(cert, 3200, 500)).toBe(true);
  });
});
