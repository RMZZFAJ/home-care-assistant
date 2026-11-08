import type { DocumentSnapshot } from "@/lib/server/operational-pdf";
import { legacyFidelitySnapshots } from "./pdf-fidelity-fixtures";

export const regularizationId = (n: number) => `41000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export function regularizationSnapshot(): DocumentSnapshot {
  const line = {
    lineId: regularizationId(1), productId: "patient-material-with-text-id", name: "Material da regularização técnica", unit: "unidade", quantityDecimals: 0,
    expeditedQuantity: "5", acceptedQuantity: "2", priorReconciledQuantity: "0", pendingQuantity: "3",
    receivedQuantity: "1", returnedQuantity: "1", missingQuantity: "0", unknownQuantity: "1", movementIds: [regularizationId(21), regularizationId(22)],
  };
  const source = structuredClone(legacyFidelitySnapshots.find(s => s.type === "ENT")!);
  source.status = "administratively_closed";
  source.version = 4;
  source.workflow = { acceptedBy: regularizationId(9), acceptedAt: "2026-11-01T12:00:00Z" };
  source.lines = [{ id: line.lineId, product_id: line.productId, name_snapshot: line.name, unit_snapshot: line.unit, quantity: "5", accepted_quantity: "2", reconciled_quantity: "2", metadata: {} }];
  source.documentFacts = { schemaVersion: 1, deliveryResolutions: [], purchaseReceiptEvents: [] };
  source.deliveryRegularization = {
    recipientAvailable: false, pendingTransit: "1", sourceReady: true, sourceLines: [], currentId: regularizationId(2),
    canPropose: false, canReview: false, canApprove: false, canRecordFinding: false, canClose: false, reviewers: [], followUpPeople: [],
    cases: [{
      id: regularizationId(2), document_id: source.id, care_recipient_id: regularizationId(3), proposed_by: regularizationId(4), reviewer_id: regularizationId(5), follow_up_owner_id: regularizationId(6),
      proposed_at: "2026-11-02T12:00:00Z", reference_version: 3, state: "approved",
      before_snapshot: { version: 2, status: "received_divergent", recipientId: regularizationId(9), acceptedBy: regularizationId(9), acceptedAt: "2026-11-01T12:00:00Z", receiptName: "Recebedora original preservada", lines: [] },
      proposal: { reason: "Impossibilidade de nova declaração pessoal", basis: "Conferência independente preserva a unidade ainda desconhecida", lines: [line], unknownQuantity: "1", proposedName: "Proponente preservada", reviewerName: "Conferente preservada", followUpOwnerName: "Responsável futura", personalReceipt: false },
      decision: { action: "review_regularization", actorId: regularizationId(5), actorName: "Conferente preservada", recordedAt: "2026-11-03T12:00:00Z", reason: "Decisão independente limita os efeitos às duas unidades apuradas", version: 4, lines: [line] },
      findings: [],
    }],
  };
  return source;
}
