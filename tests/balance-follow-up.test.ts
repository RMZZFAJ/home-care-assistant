import { expect, it } from "vitest";
import { balanceFollowUp } from "../src/lib/documents/balance-follow-up";
import { supplyMilestones } from "../src/lib/documents/milestones";
import type { SupplyDocument } from "../src/types/documents";

type Facts = Parameters<typeof balanceFollowUp>[0];
const review = {
  reviewRequired: true,
  referenceState: "current",
  reconciliationApplied: false,
} as SupplyDocument["balanceReview"];
const count: Facts = { status: "submitted", protocol: "BAL-teste", balanceReview: review };

it("does not treat a draft or cancelled draft as a completed physical count", () => {
  expect(balanceFollowUp({ ...count, status: "draft", protocol: null })).toMatchObject({ pending: true, heading: "Concluir a contagem do balanço" });
  expect(balanceFollowUp({ ...count, status: "cancelled", protocol: null })).toMatchObject({ pending: false, section: "history" });
});
it("keeps required review pending without inferring eligibility or stock effect", () => {
  expect(balanceFollowUp(count)).toMatchObject({ pending: true, heading: "Acompanhar as revisões do balanço" });
  expect(balanceFollowUp(count).description).toContain("sem presumir conclusão");
});
it("keeps historical and unavailable references distinct from zero or approval", () => {
  const historical = balanceFollowUp({ ...count, balanceReview: { ...review!, referenceState: "historical" } });
  const unavailable = balanceFollowUp({ ...count, balanceReview: { ...review!, referenceState: "unavailable" } });
  expect(historical.description).toContain("movimentos posteriores");
  expect(unavailable.description).toContain("não foi presumido saldo zero");
  expect(historical.pending).toBe(true);
  expect(unavailable.pending).toBe(true);
});
it("does not turn an approved status into evidence of reconciliation", () => {
  expect(balanceFollowUp({ ...count, status: "approved" })).toMatchObject({ pending: true, heading: "Consultar o efeito da contagem" });
  expect(balanceFollowUp({ ...count, balanceReview: undefined })).toMatchObject({ heading: "Consultar os fatos da contagem" });
});
it("preserves a real past reconciliation after later movements", () => {
  const data: Facts = { ...count, status: "approved", balanceReview: { ...review!, reviewRequired: false, reconciliationApplied: true, referenceState: "historical" } };
  expect(balanceFollowUp(data)).toMatchObject({ heading: "Consultar a contagem conciliada", pending: false });
  expect(balanceFollowUp(data).description).toContain("saldo atual é uma consulta distinta");
  expect(balanceFollowUp({ ...data, protocol: null }).heading).toBe("Consultar os fatos da contagem");
  expect(supplyMilestones({ ...data, protocol: null, type: "BAL", totalLines: 1, fullyCheckedLines: 0 })[3].state).not.toBe("done");
});
it("keeps designation and the new physical count distinct even after prior approval", () => {
  const data: Facts = { ...count, status: "approved", balanceReview: { ...review!, reconciliationApplied: true }, balanceRecount: { requiresDesignation: true, activeAssignment: null } as SupplyDocument["balanceRecount"] };
  expect(balanceFollowUp(data)).toMatchObject({ pending: true, heading: "Designar o reconto do balanço" });
  expect(balanceFollowUp({ ...data, balanceRecount: { ...data.balanceRecount!, lastAssignment: { cycle_id: "cycle" } as NonNullable<SupplyDocument["balanceRecount"]>["lastAssignment"], activeAssignment: { id: "assignment", kind: "recount", cycle_id: "cycle" } as NonNullable<NonNullable<SupplyDocument["balanceRecount"]>["activeAssignment"]> } })).toMatchObject({ pending: true, heading: "Acompanhar o reconto designado" });
  expect(balanceFollowUp({ ...data, status: "rejected" }).section).toBe("history");
});
it("does not attach another cycle or an ordinary assignment to this count", () => {
  const data: Facts = { ...count, status: "approved", balanceReview: { ...review!, reconciliationApplied: true }, balanceRecount: { requiresDesignation: false, lastAssignment: { cycle_id: "own" }, activeAssignment: { kind: "recount", cycle_id: "other" } } as SupplyDocument["balanceRecount"] };
  for (const assignment of [data.balanceRecount!.activeAssignment, { kind: "initial", cycle_id: "own" } as NonNullable<NonNullable<SupplyDocument["balanceRecount"]>["activeAssignment"]>]) {
    const facts = { ...data, balanceRecount: { ...data.balanceRecount!, activeAssignment: assignment } };
    expect(balanceFollowUp(facts)).toMatchObject({ pending: false, heading: "Consultar a contagem conciliada" });
    expect(supplyMilestones({ ...facts, type: "BAL", totalLines: 1, fullyCheckedLines: 0 })[3].state).toBe("done");
  }
});
