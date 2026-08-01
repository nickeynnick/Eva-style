import { describe, expect, it } from "vitest";
import {
  applyAssistantActions,
  parseActionsFromAssistantText,
} from "../utils/aiAssistantActions";
import { createDefaultState } from "../store/migrations";

describe("parseActionsFromAssistantText", () => {
  it("extracts actions and strips fence from display text", () => {
    const text = `Сделаю запись расхода.

\`\`\`json
{
  "actions": [
    {
      "type": "add_extra_transaction",
      "date": "2026-08-01",
      "txType": "минус",
      "amount": 500,
      "comment": "Хозтовары"
    }
  ]
}
\`\`\``;
    const { displayText, actions } = parseActionsFromAssistantText(text);
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe("add_extra_transaction");
    expect(displayText).toContain("Сделаю запись расхода");
    expect(displayText).not.toContain("```");
  });

  it("rejects unknown action types", () => {
    const text = `\`\`\`json
{"actions":[{"type":"delete_employee","id":"x"}]}
\`\`\``;
    const { actions } = parseActionsFromAssistantText(text);
    expect(actions).toHaveLength(0);
  });

  it("parses open_tab UI action", () => {
    const text = `\`\`\`json
{"actions":[{"type":"open_tab","tab":"salaries"}]}
\`\`\``;
    const { actions } = parseActionsFromAssistantText(text);
    expect(actions).toHaveLength(1);
    expect(actions[0]).toEqual({ type: "open_tab", tab: "salaries" });
  });

  it("parses add_visit with masterName without fence", () => {
    const text = `Добавляю визит.\n{"actions":[{"type":"add_visit","date":"2026-08-01","masterName":"Епифанцева","workCost":200,"paymentMethod":"наличные"}]}`;
    const { actions } = parseActionsFromAssistantText(text);
    expect(actions).toHaveLength(1);
    expect(actions[0].type).toBe("add_visit");
  });
});

describe("applyAssistantActions", () => {
  it("adds extra transaction via patch", () => {
    const state = createDefaultState(true);
    const { patch, applied, errors } = applyAssistantActions(state, [
      {
        type: "add_extra_transaction",
        date: "2026-08-01",
        txType: "минус",
        amount: 100,
        comment: "Тест",
      },
    ]);
    expect(errors).toHaveLength(0);
    expect(applied).toHaveLength(1);
    expect(patch.extraTransactions?.length).toBe(1);
    expect(patch.extraTransactions?.[0].comment).toBe("Тест");
  });

  it("adds visit for Owner by masterName", () => {
    const state = createDefaultState(true);
    const owner = state.employees.find((e) => e.position === "Владелица");
    expect(owner).toBeTruthy();
    const { patch, errors } = applyAssistantActions(state, [
      {
        type: "add_visit",
        date: "2026-08-01",
        masterName: "Епифанцева",
        workCost: 200,
        paymentMethod: "наличные",
      },
    ]);
    expect(errors).toHaveLength(0);
    expect(patch.visits?.[0].masterId).toBe(owner!.id);
    expect(patch.visits?.[0].workCost).toBe(200);
  });

  it("adds and soft-deletes a visit", () => {
    const state = createDefaultState(true);
    const masterId = state.employees.find(
      (e) => e.position !== "Владелица" && e.position !== "Администратор"
    )?.id;
    expect(masterId).toBeTruthy();
    const added = applyAssistantActions(state, [
      {
        type: "add_visit",
        date: "2026-08-01",
        masterId: masterId!,
        workCost: 2000,
        materialsCost: 200,
        paymentMethod: "наличные",
      },
    ]);
    expect(added.errors).toHaveLength(0);
    expect(added.patch.visits?.length).toBe(1);
    const visitId = added.patch.visits![0].id;
    const withVisit = { ...state, visits: added.patch.visits! };
    const deleted = applyAssistantActions(withVisit, [{ type: "delete_visit", visitId }]);
    expect(deleted.errors).toHaveLength(0);
    expect(deleted.patch.visits?.[0].isDeleted).toBe(true);
  });

  it("adds settings rule and updates packaging", () => {
    const state = createDefaultState(true);
    const { patch, errors } = applyAssistantActions(state, [
      {
        type: "add_settings_rule",
        effectiveDate: "2026-09-01",
        acquiringCommission: 5,
        solariumMinuteRate: 35,
      },
      {
        type: "update_material_packaging",
        key: "serumAfterPerm",
        price: 5000,
        volume: 500,
      },
    ]);
    expect(errors).toHaveLength(0);
    expect(patch.settingsRules?.some((r) => r.acquiringCommission === 5)).toBe(true);
    expect(patch.materialPackaging?.serumAfterPerm).toEqual({ price: 5000, volume: 500 });
    expect(patch.materialPrices?.serumAfterPerm).toBe(10);
  });

  it("collects log_note without store patch fields", () => {
    const state = createDefaultState(true);
    const { patch, logNotes, applied } = applyAssistantActions(state, [
      { type: "log_note", message: "Проверка журнала" },
    ]);
    expect(logNotes).toEqual(["Проверка журнала"]);
    expect(applied).toHaveLength(1);
    expect(Object.keys(patch)).toHaveLength(0);
  });
});
