import { describe, it, expect } from "vitest";
import {
  calculateAcquiring,
  calculateVisitTotal,
  getVisitCardAmount,
} from "../utils/paymentUtils";
import { Visit } from "../types";

describe("calculateAcquiring", () => {
  it("returns 0 for non-card payments", () => {
    expect(calculateAcquiring(1000, "наличные", 3.5)).toBe(0);
    expect(calculateAcquiring(1000, "сертификат", 3.5)).toBe(0);
  });

  it("calculates card commission", () => {
    expect(calculateAcquiring(1000, "дебетовая карта", 3.5)).toBe(35);
    expect(calculateAcquiring(333, "дебетовая карта", 3)).toBe(9.99);
  });
});

describe("calculateVisitTotal", () => {
  it("includes acquiring in total for card", () => {
    const { acquiringCost, totalCost } = calculateVisitTotal(1000, 200, "дебетовая карта", 3.5);
    expect(acquiringCost).toBe(42);
    expect(totalCost).toBe(1242);
  });

  it("no acquiring for cash", () => {
    const { acquiringCost, totalCost } = calculateVisitTotal(1000, 0, "наличные", 3.5);
    expect(acquiringCost).toBe(0);
    expect(totalCost).toBe(1000);
  });
});

describe("getVisitCardAmount", () => {
  it("includes base and acquiring for card visits", () => {
    const visit = {
      isDeleted: false,
      paymentMethod: "дебетовая карта",
      workCost: 500,
      materialsCost: 100,
      acquiringCost: 21,
    } as Visit;
    expect(getVisitCardAmount(visit)).toBe(621);
  });
});
