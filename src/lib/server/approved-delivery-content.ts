import type { DocumentSnapshot, PdfEmissionContext } from "./operational-pdf";
import { approvedDocumentContent } from "./approved-document-content";
import { pdfFidelitySchema } from "@/lib/documents/pdf-fidelity";
import { confirmedDeliveryQuantity } from "@/lib/documents/delivery-confirmed-quantity";
import { entReceiptState } from "@/lib/documents/ent-receipt-state";
import { formatBrazilDate } from "@/lib/receipt";
import { familyFulfillmentDescription, familyReviewDescription } from "@/lib/documents/family-fulfillment";
import { formatQuantity, quantity } from "@/lib/quantity";

const amount = (value: unknown, unit?: string) => typeof value === "number" || typeof value === "string" ? formatQuantity(value, unit) : "Não disponível no registro";
const name = (line: Record<string, unknown>) => String(line.name_snapshot ?? line.product_name_snapshot ?? line.custom_name ?? "Material não identificado");
const unit = (line: Record<string, unknown>) => String(line.unit_snapshot ?? "Unidade não preservada");
export function approvedDeliveryContent(snapshot: DocumentSnapshot, emission: PdfEmissionContext) {
  if (snapshot.type !== "ENT") throw new Error("Delivery content required");
  const { source, facts, semanticFacts } = approvedDocumentContent(snapshot, emission), fidelity = pdfFidelitySchema.parse(snapshot.documentFacts);
  const acceptedAt = typeof snapshot.workflow?.acceptedAt === "string" ? snapshot.workflow.acceptedAt : null;
  semanticFacts["receipt/state"] = entReceiptState(snapshot.status, source.historical, acceptedAt, emission.representation).declaration;
  if (snapshot.status === "administratively_closed") semanticFacts["receipt/administrative"] = "Encerramento administrativo não substitui aceite pessoal. Os efeitos apurados e a situação física ainda desconhecida permanecem nas seções próprias.";
  snapshot.lines.forEach((line, index) => {
    const familyDecision = familyFulfillmentDescription(line);
    if (familyDecision) semanticFacts["familyFulfillment/" + index] = familyDecision;
    const key = "material/" + index, received = confirmedDeliveryQuantity(snapshot, line, fidelity.deliveryResolutions, source.historical);
    semanticFacts[key + "/name"] = name(line); semanticFacts[key + "/unit"] = unit(line);
    semanticFacts[key + "/expedited"] = amount(line.quantity, unit(line));
    semanticFacts[key + "/received"] = received.state === "recorded" ? amount(received.quantity, unit(line)) : received.state === "unavailable" ? "Quantidade não preservada" : "Não confirmado";
    semanticFacts[key + "/open"] = amount((typeof line.reconciled_quantity === "string" || typeof line.reconciled_quantity === "number") && (typeof line.accepted_quantity === "string" || typeof line.accepted_quantity === "number") ? quantity(String(line.quantity)).minus(line.accepted_quantity).minus(line.reconciled_quantity).toFixed() : null, unit(line));
    const receipt = (line.metadata as { receipt?: { notes?: string; acceptedQuantity?: unknown; }; } | undefined)?.receipt;
    if (receipt) {
      semanticFacts["issue/" + index + "/notes"] = receipt.notes || "Nota não preservada";
      semanticFacts["issue/" + index + "/accepted"] = "Aceito na declaração original: " + amount(receipt.acceptedQuantity, unit(line));
    }
  });
  for (const review of snapshot.fulfillmentReviews ?? []) semanticFacts["familyReview/" + review.id] = familyReviewDescription(review);
  fidelity.deliveryResolutions.forEach((event, index) => {
    const line = snapshot.lines.find(value => value.id === event.lineId), key = "resolution/" + index;
    semanticFacts[key + "/outcome"] = event.resolution ? { received: "Recebimento complementar", returned: "Devolução à origem", missing: "Falta ou perda conciliada" }[event.resolution] : "Resolução não preservada";
    semanticFacts[key + "/actor"] = (event.actorName ?? "Nome não preservado") + " · " + formatBrazilDate(event.recordedAt);
    semanticFacts[key + "/quantity"] = "Quantidade desta resolução: " + amount(event.quantity, line ? unit(line) : undefined);
    semanticFacts[key + "/reason"] = event.reason || "Motivo não preservado";
  });
  const transfer = snapshot.transfer;
  if (transfer) {
    semanticFacts["transfer/declaration"] = "Declarante: " + transfer.declaration.actor.name + " · " + formatBrazilDate(transfer.declaration.recordedAt); semanticFacts["transfer/reason"] = transfer.declaration.reason;
    semanticFacts["transfer/people"] = "Contraparte para concordância: " + transfer.declaration.counterparty.name + " · Recebedor físico designado: " + transfer.declaration.recipient.name;
    if (transfer.agreement) { semanticFacts["transfer/agreement"] = (transfer.agreement.decision === "agree" ? "Concordância própria: " : "Recusa própria: ") + transfer.agreement.actor.name + " · " + formatBrazilDate(transfer.agreement.recordedAt); semanticFacts["transfer/agreementReason"] = transfer.agreement.reason; }
    if (transfer.withdrawal) { semanticFacts["transfer/withdrawal"] = (transfer.withdrawal.kind === "administrative_close" ? "Encerramento administrativo: " : "Retirada pelo declarante: ") + transfer.withdrawal.actor.name + " · " + formatBrazilDate(transfer.withdrawal.recordedAt); semanticFacts["transfer/withdrawalReason"] = transfer.withdrawal.reason; }
  }
  const cancellation = snapshot.deliveryCancellation;
  if (cancellation) {
    [cancellation.request, ...cancellation.history].forEach((request, index) => {
      const key = "cancellationRequest/" + index;
      semanticFacts[key + "/actor"] = (request.requestedName ?? "Nome não preservado") + " · " + formatBrazilDate(request.requestedAt); semanticFacts[key + "/reason"] = request.reason;
      if (request.outcome) { semanticFacts[key + "/decision"] = "Decisão de " + (request.outcome.actorName ?? "Nome não preservado") + " · " + formatBrazilDate(request.outcome.recordedAt); semanticFacts[key + "/decisionReason"] = request.outcome.reason; }
    });
    if (cancellation.request.status === "consented") cancellation.lines.forEach((line, index) => {
      const key = "cancellationLine/" + index;
      semanticFacts[key + "/accepted"] = amount(line.acceptedQuantity, line.unit); semanticFacts[key + "/returned"] = amount(line.returnQuantity, line.unit); semanticFacts[key + "/consumed"] = amount(line.consumedQuantity, line.unit);
      line.consumptionReferences.forEach((ref, refIndex) => { semanticFacts["cancellationConsumption/" + index + "/" + refIndex] = line.name + " · " + amount(ref.quantity, line.unit) + " de consumo confirmado em " + formatBrazilDate(ref.recordedAt); });
    });
    if (cancellation.request.status === "pending" && cancellation.sourceReady && cancellation.sourceAccess !== false) cancellation.lines.forEach((line, index) => {
      const key = "cancellationAvailable/" + index;
      semanticFacts[key + "/accepted"] = amount(line.acceptedQuantity, line.unit); semanticFacts[key + "/consumed"] = amount(line.availableConsumedQuantity, line.unit); semanticFacts[key + "/transit"] = amount(line.unresolvedTransit, line.unit);
    });
  }
  for (const [index, item] of (snapshot.deliveryRegularization?.cases ?? []).entries()) {
    const prefix = "regularization/" + index;
    semanticFacts[prefix + "/proposer"] = "Proposta de " + item.proposal.proposedName + " · " + formatBrazilDate(item.proposed_at);
    semanticFacts[prefix + "/reviewer"] = "Conferente independente: " + item.proposal.reviewerName;
    semanticFacts[prefix + "/reason"] = item.proposal.reason; semanticFacts[prefix + "/basis"] = item.proposal.basis;
    semanticFacts[prefix + "/originalReceipt"] = item.before_snapshot.acceptedBy ? "Recebimento pessoal original preservado: " + (item.before_snapshot.receiptName ?? "Nome não preservado") + " · " + formatBrazilDate(item.before_snapshot.acceptedAt) : "Sem recebimento pessoal declarado no registro original.";
    const lines = item.decision?.lines.length ? item.decision.lines : item.proposal.lines;
    lines.forEach((line, lineIndex) => {
      const key = prefix + "/line/" + lineIndex, settled = item.state === "approved" ? quantity(line.receivedQuantity).plus(line.returnedQuantity).plus(line.missingQuantity) : quantity(0);
      semanticFacts[key + "/original"] = "Expedido: " + amount(line.expeditedQuantity, line.unit) + " · Aceite pessoal preservado: " + amount(line.acceptedQuantity, line.unit);
      semanticFacts[key + "/before"] = "Conciliação anterior: " + amount(line.priorReconciledQuantity, line.unit) + " · Trânsito anterior: " + amount(line.pendingQuantity, line.unit);
      for (const [kind, value] of Object.entries({ received: line.receivedQuantity, returned: line.returnedQuantity, missing: line.missingQuantity, unknown: line.unknownQuantity })) semanticFacts[key + "/" + kind] = amount(value, line.unit);
      semanticFacts[key + "/after"] = "Conciliação após o procedimento: " + amount(quantity(line.priorReconciledQuantity).plus(settled).toFixed(), line.unit) + " · Trânsito restante: " + amount(quantity(line.pendingQuantity).minus(settled).toFixed(), line.unit);
    });
    if (item.decision) { semanticFacts[prefix + "/decision"] = "Decisão própria de " + item.decision.actorName + " · " + formatBrazilDate(item.decision.recordedAt); semanticFacts[prefix + "/decisionReason"] = item.decision.reason; }
    semanticFacts[prefix + "/execution"] = item.state === "approved" && item.decision?.lines.some(line => line.movementIds?.length) ? "Movimentações administrativas registradas por " + item.decision.actorName + " · " + formatBrazilDate(item.decision.recordedAt) : "Sem movimentação de estoque identificada neste procedimento.";
    item.findings.forEach((finding, findingIndex) => { semanticFacts[prefix + "/findingActor/" + findingIndex] = "Apuração de " + finding.actor_name + " · " + formatBrazilDate(finding.recorded_at); semanticFacts[prefix + "/finding/" + findingIndex] = finding.body; });
  }
  return { facts, semanticFacts };
}
