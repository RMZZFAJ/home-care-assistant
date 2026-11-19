import { formatBrazilDate } from "@/lib/receipt";
import type { SupplyDocument, SupplyLine } from "@/types/documents";
import { quantity } from "@/lib/quantity";
import { deliveryNeedRequest, readCountedDeliveryReceipt } from "./delivery-receipt";

export function linkedDeliveryNeed(data: SupplyDocument, line: SupplyLine) {
  return data.kind === "ENT" && line.requisitionItemIds.length > 0 && Boolean(line.family_fulfillment);
}

export function currentDeliveryNeed(data: SupplyDocument, line: SupplyLine) {
  const request = deliveryNeedRequest(line.metadata);
  return data.fulfillmentReviews?.findLast(review => review.lineId === line.id &&
    quantity(review.acceptedQuantity).eq(line.accepted_quantity) && quantity(review.expeditedQuantity).eq(line.quantity) &&
    (!request || Date.parse(review.recordedAt) >= Date.parse(request.recordedAt)));
}

export function awaitsDeliveryNeed(data: SupplyDocument, line: SupplyLine) {
  if (!linkedDeliveryNeed(data, line) || !data.workflow_data.acceptedAt || currentDeliveryNeed(data, line)) return false;
  const receipt = readCountedDeliveryReceipt(line.metadata);
  return Boolean(deliveryNeedRequest(line.metadata) ||
    receipt && !quantity(receipt.receivedQuantity).eq(line.quantity) ||
    line.family_fulfillment === "complete" && quantity(line.accepted_quantity).gt(0) && quantity(line.accepted_quantity).lt(line.quantity));
}

export function deliveryTransit(line: SupplyLine) {
  return quantity(line.quantity).minus(line.accepted_quantity).minus(line.reconciled_quantity);
}

export function deliveryNeedRequestDescription(metadata: unknown) {
  const request = deliveryNeedRequest(metadata);
  return request ? `${request.reason} · ${request.actorName} · ${formatBrazilDate(request.recordedAt)}` : null;
}

export const deliveryResolutionLabels = {
  received: "Recebimento complementar",
  returned: "Devolução à origem",
  missing: "Falta ou perda conciliada",
  not_sent: "Material permaneceu na origem",
};

export function familyReviewDescription(review: NonNullable<SupplyDocument["fulfillmentReviews"]>[number]) {
  return `Nova avaliação familiar: ${review.decision === "complete" ? "atendimento completo" : "atendimento parcial; necessidade ainda em aberto"}. ${review.actorName} · ${formatBrazilDate(review.recordedAt)}. Referência física: ${review.acceptedQuantity} recebido de ${review.expeditedQuantity} expedido.${review.reason ? " Motivo: " + review.reason : ""} A avaliação não altera o recebimento ou o estoque.`;
}
export function familyFulfillmentDescription(line: Record<string, unknown>) {
  const decision = line.family_fulfillment;
  if (decision !== "partial" && decision !== "complete") return null;
  return "Atendimento indicado pela família: " + (decision === "partial" ? "parcial; a necessidade continua em aberto" : "completo; divergência de quantidade exige nova avaliação familiar") + ". " + (typeof line.fulfillment_decided_name === "string" ? line.fulfillment_decided_name : "Autoria não disponível") + " · " + formatBrazilDate(typeof line.fulfillment_decided_at === "string" ? line.fulfillment_decided_at : null) + ". Esta avaliação não confirma recebimento ou movimento de estoque.";
}
