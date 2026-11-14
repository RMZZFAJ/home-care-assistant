import { expect, it } from "vitest";
import type { PurchaseProgress, PurchaseProgressLine } from "@/types/documents";
import { purchaseFollowUp } from "@/lib/documents/purchase-follow-up";
import { supplyMilestones } from "@/lib/documents/milestones";

const line: PurchaseProgressLine = {
  lineId: "material", name: "Material", unit: "unidade", plannedQuantity: "10",
  approvedQuantity: "10", purchasedQuantity: "0", validatedQuantity: "0",
  pendingValidationQuantity: "0", unarrivedQuantity: "0", waivedQuantity: "0",
  waivableQuantity: "10", remainingExpectation: "10",
};
const progress: PurchaseProgress = {
  state: "approved", expectationClosed: false, expectationPending: true,
  physicalPending: false, validationPending: false, lines: [line], closure: null,
};
const input = { status: "approved", origin: "purchase", progress };
const facts = {
  type: "COM" as const, protocol: "COM-0001", status: "approved",
  fullyCheckedLines: 0, totalLines: 1,
};

it.each(["draft", "pending_approval"])("zero preapproval totals cannot complete a COM in %s", status => {
  const empty = { ...progress, state: status, expectationPending: false,
    lines: [{ ...line, approvedQuantity: "0", waivableQuantity: "0", remainingExpectation: "0" }] };
  expect(purchaseFollowUp({ ...input, status, progress: empty })).toMatchObject({ pending: true, section: "workflow" });
  const milestones = supplyMilestones({ ...facts, status, protocol: status === "draft" ? null : facts.protocol, purchaseProgress: empty });
  expect(milestones[1].state).toBe("pending");
  expect(milestones[2].state).not.toBe("done");
  expect(milestones[3].state).toBe("pending");
});
it("keeps receipt validation and closure independent from the remaining expectation", () => {
  const pending = { ...progress, expectationClosed: true, expectationPending: false, physicalPending: true, validationPending: true };
  const next = purchaseFollowUp({ ...input, progress: pending });
  expect(next.heading).toBe("Conferir as parcelas de chegada");
  expect(next.pending).toBe(true);
  expect(next.description).toContain("aquisição restante foi encerrada");
  expect(supplyMilestones({ ...facts, purchaseProgress: pending })[3].state).toBe("pending");
  expect(purchaseFollowUp({ ...input, progress: { ...pending, validationPending: false } }).heading).toBe("Informar a chegada da aquisição");
});
it("distinguishes acquisition from validated arrival for purchase and donation", () => {
  expect(purchaseFollowUp(input).heading).toBe("Registrar a aquisição dos materiais");
  expect(purchaseFollowUp({ ...input, origin: "donation" }).heading).toBe("Registrar os materiais da doação");
  const acquired = { ...progress, state: "purchased", physicalPending: true, expectationPending: false };
  const donation = purchaseFollowUp({ ...input, origin: "donation", progress: acquired });
  expect(donation.statusLabel).toBe("Doação registrada");
  expect(donation.heading).toBe("Informar a chegada da doação");
  expect(purchaseFollowUp({ ...input, origin: "donation", progress: { ...acquired, state: "purchasing" } }).statusLabel).toBe("Doação em andamento");
});
it.each(["cancelled", "rejected", "administratively_closed"])("closed %s directs to history even with old pending flags", status => {
  expect(purchaseFollowUp({ ...input, status })).toMatchObject({ pending: false, section: "history" });
  const milestones = supplyMilestones({ ...facts, status, purchaseProgress: progress });
  expect(milestones.map(step => step.state)).toEqual(["done", "closed", "closed", "closed"]);
});
it("does not infer completion from a missing projection or zero unclosed acquisition", () => {
  expect(purchaseFollowUp({ ...input, progress: undefined }).description).toContain("ausência desses dados não foi tratada como conclusão");
  const zero = { ...progress, expectationPending: false };
  expect(purchaseFollowUp({ ...input, progress: zero }).heading).toBe("Conferir a aquisição autorizada");
  expect(supplyMilestones({ ...facts, purchaseProgress: zero })[3].state).toBe("pending");
});
it("keeps a complete waiver distinct from physical receipt and preserves validated parcels", () => {
  const closed = { ...progress, expectationClosed: true, expectationPending: false,
    lines: [{ ...line, waivedQuantity: "10", waivableQuantity: "0", remainingExpectation: "0" }] };
  expect(purchaseFollowUp({ ...input, progress: closed })).toMatchObject({ pending: false, heading: "Consultar a aquisição restante encerrada" });
  expect(supplyMilestones({ ...facts, purchaseProgress: closed }).map(step => step.state)).toEqual(["done", "waived", "waived", "done"]);
  const validated = { ...closed, lines: [{ ...line, purchasedQuantity: "4", validatedQuantity: "4", waivedQuantity: "6", remainingExpectation: "0" }] };
  expect(supplyMilestones({ ...facts, purchaseProgress: validated })[2].state).toBe("done");
  expect(purchaseFollowUp({ ...input, progress: { ...validated, expectationClosed: false } }).heading).toBe("Consultar as entradas validadas");
});
