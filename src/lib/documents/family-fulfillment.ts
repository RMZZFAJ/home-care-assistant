import { formatBrazilDate } from "@/lib/receipt";
import type { SupplyDocument } from "@/types/documents";
export function familyReviewDescription(review: NonNullable<SupplyDocument["fulfillmentReviews"]>[number]) {
  return `Nova avaliação familiar: ${review.decision === "complete" ? "atendimento completo" : "atendimento parcial; necessidade ainda em aberto"}. ${review.actorName} · ${formatBrazilDate(review.recordedAt)}. Referência física: ${review.acceptedQuantity} recebido de ${review.expeditedQuantity} expedido.${review.reason ? " Motivo: " + review.reason : ""} A avaliação não altera o recebimento ou o estoque.`;
}
export function familyFulfillmentDescription(line: Record<string, unknown>) {
  const decision = line.family_fulfillment;
  if (decision !== "partial" && decision !== "complete") return null;
  return "Atendimento indicado pela família: " + (decision === "partial" ? "parcial; a necessidade continua em aberto" : "completo; divergência de quantidade exige nova avaliação familiar") + ". " + (typeof line.fulfillment_decided_name === "string" ? line.fulfillment_decided_name : "Autoria não disponível") + " · " + formatBrazilDate(typeof line.fulfillment_decided_at === "string" ? line.fulfillment_decided_at : null) + ". Esta avaliação não confirma recebimento ou movimento de estoque.";
}
