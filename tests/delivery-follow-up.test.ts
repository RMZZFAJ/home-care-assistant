import { expect, it } from "vitest";
import { deliveryFollowUp } from "@/lib/documents/delivery-follow-up";
import { supplyMilestones } from "@/lib/documents/milestones";
import type { DeliveryCancellationContext, DeliveryRegularizationContext } from "@/types/documents";

const facts = { type: "ENT" as const, status: "pending_receipt", protocol: "ENT-1", fullyCheckedLines: 0, totalLines: 2 };
const regularization: DeliveryRegularizationContext = {
  recipientAvailable: true, pendingTransit: "1", sourceReady: true, sourceLines: [],
  cases: [], currentId: null, canPropose: false, canReview: false, canApprove: false,
  canRecordFinding: false, canClose: false, reviewers: [], followUpPeople: [],
};
const cancellation: DeliveryCancellationContext = {
  request: { id: "request", source: "server_record", requestedBy: "owner", requestedName: "Família", requestedAt: "2026-11-11T00:00:00Z", requestedVersion: 1, previousStatus: "confirmed", reason: "Revisar o pedido", status: "pending" },
  history: [], lines: [], sourceReady: true, referenceHash: "reference", unresolvedTransit: "0",
};

it("distinguishes a completed reconciliation with returned or missing material from full receipt", () => {
  const difference = { ...facts, status: "confirmed", fullyCheckedLines: 1 };
  const next = deliveryFollowUp(difference);
  expect(next).toMatchObject({ pending: false, heading: "Consultar a conferência com diferenças", statusLabel: "Conferência concluída com diferenças" });
  expect(next.description).toContain("não foram recebidas e não atendem uma REQ");
  const milestones = supplyMilestones(difference);
  expect(milestones[2]).toMatchObject({ state: "closed", percent: 50 });
  expect(milestones[2].detail).toContain("não são recebimento");
  expect(milestones[3]).toMatchObject({ state: "done", detail: "Conferência e conciliação concluídas" });
  const full = { ...difference, fullyCheckedLines: 2 };
  expect(supplyMilestones(full)[2]).toMatchObject({ state: "done", percent: 100 });
  expect(deliveryFollowUp(full).heading).toBe("Consultar o recebimento confirmado");
});
it("does not infer full receipt or differences from absent line or issuance references", () => {
  for (const missing of [{ totalLines: 0, fullyCheckedLines: 0 }, { protocol: null, fullyCheckedLines: 2 }]) {
    const input = { ...facts, status: "confirmed", ...missing };
    expect(deliveryFollowUp(input).heading).toBe("Consultar a conferência registrada");
    expect(deliveryFollowUp(input).statusLabel).toBeUndefined();
    expect(supplyMilestones(input)[2].state).toBe("unknown");
  }
});
it.each(["pending_receipt", "disputed", "cancellation_pending"])("unavailable recipient in %s cannot be replaced by another personal receipt", status => {
  const next = deliveryFollowUp({ ...facts, status, deliveryRegularization: { ...regularization, recipientAvailable: false } });
  expect(next).toMatchObject({ pending: true, heading: "Consultar a regularização da entrega" });
  expect(next.description).toContain("outra pessoa não declara recebimento");
});
it("keeps unknown physical transit pending after administrative closure", () => {
  const input = { ...facts, status: "administratively_closed", deliveryRegularization: regularization };
  expect(deliveryFollowUp(input)).toMatchObject({ pending: true, heading: "Acompanhar o material ainda em trânsito" });
  expect(supplyMilestones(input)[2].state).toBe("unknown");
  expect(supplyMilestones(input)[3].state).toBe("closed");
  expect(deliveryFollowUp({ ...input, deliveryRegularization: null }).description).toContain("não presume recebimento");
});
it("keeps a cancellation request independent from transit reconciliation and source availability", () => {
  const input = { ...facts, status: "cancellation_pending", deliveryCancellation: cancellation };
  expect(deliveryFollowUp(input).heading).toBe("Conferir o pedido de cancelamento");
  expect(deliveryFollowUp({ ...input, deliveryCancellation: { ...cancellation, unresolvedTransit: "0.001" } }).heading).toBe("Conciliar o material ainda em trânsito");
  const restricted = deliveryFollowUp({ ...input, deliveryCancellation: { ...cancellation, sourceReady: false, sourceAccess: false } });
  expect(restricted.heading).toBe("Atualizar as referências do cancelamento");
  expect(restricted.description).toContain("valores restritos");
});
it.each(["cancelled", "rejected"])("closed %s does not request a new receipt or revive pending cancellation", status => {
  expect(deliveryFollowUp({ ...facts, status })).toMatchObject({ pending: false, section: "history" });
  expect(deliveryFollowUp({ ...facts, status, deliveryCancellation: cancellation })).toMatchObject({ pending: false, section: "workflow" });
});
it("draft preparation does not prove dispatch and an unknown status does not prescribe an operation", () => {
  expect(deliveryFollowUp({ ...facts, status: "draft", protocol: null })).toMatchObject({ pending: true, heading: "Conferir a preparação da entrega" });
  expect(deliveryFollowUp({ ...facts, status: "future" })).toMatchObject({ pending: false, heading: "Consultar os fatos da entrega" });
  expect(deliveryFollowUp({ ...facts, status: "disputed" }).description).toContain("devolução ou falta não equivalem a recebimento");
});
