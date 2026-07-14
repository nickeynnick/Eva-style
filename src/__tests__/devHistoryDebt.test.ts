import { describe, expect, it } from "vitest";
import { summarizeStoreChange } from "../utils/devHistory";

describe("summarizeStoreChange debtRecords", () => {
  it("логирует удаление долга", () => {
    const prev = {
      employees: [],
      debtRecords: [
        {
          id: "debt-1",
          clientName: "Иванова",
          visitId: "v1",
          visitDate: "2026-07-01",
          originalAmount: 1000,
          remainingAmount: 500,
          createdDate: "2026-07-01",
          payments: [],
          isClosed: false,
        },
      ],
    };
    const patch = { debtRecords: [] };
    const { lines } = summarizeStoreChange(prev, patch);
    expect(lines.some((l) => l.includes("Удалён долг") && l.includes("Иванова"))).toBe(true);
  });

  it("логирует погашение долга", () => {
    const prev = {
      employees: [],
      debtRecords: [
        {
          id: "debt-1",
          clientName: "Петрова",
          visitId: "v1",
          visitDate: "2026-07-01",
          originalAmount: 1000,
          remainingAmount: 1000,
          createdDate: "2026-07-01",
          payments: [],
          isClosed: false,
        },
      ],
    };
    const patch = {
      debtRecords: [
        {
          id: "debt-1",
          clientName: "Петрова",
          visitId: "v1",
          visitDate: "2026-07-01",
          originalAmount: 1000,
          remainingAmount: 400,
          createdDate: "2026-07-01",
          payments: [
            {
              id: "pay-1",
              date: "2026-07-02",
              amount: 600,
              paymentMethod: "наличные",
            },
          ],
          isClosed: false,
        },
      ],
    };
    const { lines } = summarizeStoreChange(prev, patch);
    expect(lines.some((l) => l.includes("Изменён долг") && l.includes("Петрова"))).toBe(true);
    expect(lines.some((l) => /платёж|остаток/i.test(l))).toBe(true);
  });
});
