import { expect, it } from "vitest";
import { materialTransferDirection, materialTransferLabel, transferFollowUp } from "@/lib/documents/transfer-follow-up";
import { supplyMilestones } from "@/lib/documents/milestones";
import type { TransferFacts } from "@/types/transfers";

const person = (id: string) => ({ id, name: id });
const transfer: TransferFacts = {
  state: "pending", declaration: { actor: person("issuer"), counterparty: person("counterparty"), recipient: person("recipient"), source: "CARE_TEAM", destination: "FAMILY", reason: "Devolução autônoma", recordedAt: "2026-11-11T00:00:00Z", referenceHash: "reference" },
  agreement: null, withdrawal: null, originDocumentId: null, dispatchedAt: null,
  canAgree: false, canDispatch: false, canWithdraw: false,
};
const facts = { type: "ENT" as const, status: "transfer_pending", protocol: null, fullyCheckedLines: 0, totalLines: 1, transfer };
const agreement = { actor: person("counterparty"), decision: "agree" as const, reason: "Decisão própria", recordedAt: "2026-11-11T00:01:00Z", documentVersion: 1 };

it("names delivery and autonomous return only from their exact direction, without a new document type", () => {
  expect(materialTransferLabel("CARE_TEAM", "FAMILY")).toBe("Devolução de materiais");
  expect(materialTransferDirection("FAMILY", "CARE_TEAM")).toBe("delivery");
  expect(materialTransferLabel("FAMILY", "CARE_TEAM")).toBe("Entrega de materiais");
  for (const [source, destination] of [["CARE_TEAM", "CARE_TEAM"], ["FAMILY", undefined], ["TRANSIT", "FAMILY"]]) {
    expect(materialTransferDirection(source, destination)).toBeNull();
    expect(materialTransferLabel(source, destination)).toBe("Transferência entre custódias");
  }
});
it("a recorded declaration does not claim ENT issuance, shipment, receipt or authority", () => {
  expect(transferFollowUp(facts)).toMatchObject({ pending: true, heading: "Conferir a concordância da devolução", section: "workflow" });
  const milestones = supplyMilestones(facts);
  expect(milestones.map(item => item.label)).toEqual(["Declaração", "Concordância", "Expedição", "Recebimento"]);
  expect(milestones.map(item => item.state)).toEqual(["done", "pending", "pending", "pending"]);
  expect(transfer.canAgree).toBe(false);
});
it("agreement without shipment does not complete expedition or receipt", () => {
  const agreed = { ...facts, status: "transfer_ready", transfer: { ...transfer, state: "agreed" as const, agreement } };
  expect(transferFollowUp(agreed)?.heading).toBe("Conferir a expedição da devolução");
  expect(supplyMilestones(agreed).map(item => item.state)).toEqual(["done", "done", "pending", "pending"]);
});
it.each(["declined", "withdrawn"] as const)("unshipped %s closes preparation without inventing material movement", state => {
  const closed = { ...facts, status: state === "declined" ? "rejected" : "cancelled", transfer: { ...transfer, state } };
  expect(transferFollowUp(closed)).toMatchObject({ pending: false, section: "workflow" });
  expect(transferFollowUp(closed)?.description).toContain("nenhum material foi movimentado");
  expect(supplyMilestones(closed).map(item => item.state)).toEqual(["done", "closed", "closed", "closed"]);
  expect(supplyMilestones({ ...closed, transfer: { ...closed.transfer, agreement } })[1].state).toBe("done");
});
it("a dispatched return follows personal receipt and its divergence without being called a delivery", () => {
  const dispatched = { ...facts, protocol: "ENT-1", status: "pending_receipt", transfer: { ...transfer, state: "dispatched" as const, agreement } };
  expect(transferFollowUp(dispatched)?.heading).toBe("Conferir o recebimento da devolução");
  expect(supplyMilestones(dispatched).map(item => item.state)).toEqual(["done", "done", "pending", "pending"]);
  expect(transferFollowUp({ ...dispatched, status: "disputed" })?.heading).toBe("Conciliar a divergência da devolução");
  expect(transferFollowUp({ ...dispatched, status: "confirmed", fullyCheckedLines: 0 })?.heading).toBe("Consultar a conferência com diferenças");
  expect(transferFollowUp({ ...dispatched, status: "cancelled" })?.heading).toBe("Consultar o encerramento da devolução");
});
it("does not infer closed shipment or task from absent or unknown transfer state", () => {
  expect(transferFollowUp({ ...facts, transfer: undefined })).toBeNull();
  expect(transferFollowUp({ ...facts, transfer: { ...transfer, state: "future" as TransferFacts["state"] } })).toMatchObject({ pending: false, heading: "Consultar os atos da transferência" });
});
