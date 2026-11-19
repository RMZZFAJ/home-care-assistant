import { z } from "zod";
import { quantity } from "@/lib/quantity";
import { exactQuantity } from "@/lib/validation/exact-quantity";
import type { CountedDeliveryReceiptBody } from "@/lib/validation/delivery-receipt";
import type { SupplyDocument } from "@/types/documents";

const countedFacts = z.object({
  expeditedQuantity: exactQuantity,
  receivedQuantity: exactQuantity,
  recognizedQuantity: exactQuantity,
  remainingTransitQuantity: exactQuantity,
  excessQuantity: exactQuantity,
});

export function readCountedDeliveryReceipt(metadata: unknown) {
  const value = metadata && typeof metadata === "object" && "countedReceipt" in metadata ? metadata.countedReceipt : null;
  const read = countedFacts.safeParse(value);
  return read.success ? read.data : null;
}

export function cancelledTransitReturn(metadata: unknown) {
  const value = metadata && typeof metadata === "object" && "cancelledTransitReturn" in metadata ? metadata.cancelledTransitReturn : null;
  const read = exactQuantity.safeParse(value);
  return read.success && quantity(read.data).gt(0) ? read.data : null;
}

export function deliveryNeedRequest(metadata: unknown) {
  const request = metadata && typeof metadata === "object" && "fulfillmentReviewRequest" in metadata ? metadata.fulfillmentReviewRequest : null;
  if (!request || typeof request !== "object" || !("reason" in request) || typeof request.reason !== "string" ||
    !("actorId" in request) || typeof request.actorId !== "string" ||
    !("actorName" in request) || typeof request.actorName !== "string" ||
    !("recordedAt" in request) || typeof request.recordedAt !== "string" || !Number.isFinite(Date.parse(request.recordedAt))) return null;
  return { reason: request.reason, actorId: request.actorId, actorName: request.actorName, recordedAt: request.recordedAt };
}

export function compareDeliveryQuantity(expedited: string | number, received: string | number) {
  const planned = quantity(expedited);
  const declared = quantity(received);
  const difference = declared.minus(planned);
  const recognized = difference.gt(0) ? planned : declared;
  return {
    difference,
    recognized,
    transit: difference.lt(0) ? difference.negated() : quantity(0),
    excess: difference.gt(0) ? difference : quantity(0),
  };
}

export function verifyCountedDeliveryReceipt(
  data: SupplyDocument, body: CountedDeliveryReceiptBody, version: number, actorId: string,
) {
  const { lines, notes } = body.countedReceipt;
  if (data.workflow_data.acceptedBy !== actorId ||
    data.workflow_data.receiptNotes !== (notes ?? "") ||
    !data.events.some(event => event.action === "ent.receive" && event.actorId === actorId && event.version === version + 1) ||
    lines.length !== data.lines.length
  ) throw new Error("A confirmação do recebimento pessoal ainda precisa ser conferida.");
  const amounts = new Map(lines.map(line => [line.lineId, line]));
  for (const line of data.lines) {
    const counted = readCountedDeliveryReceipt(line.metadata);
    const submitted = amounts.get(line.id);
    if (!submitted || !counted) throw new Error("A confirmação não contém todos os materiais conferidos.");
    const received = submitted.receivedQuantity;
    const actual = compareDeliveryQuantity(line.quantity, received);
    if (!quantity(counted.expeditedQuantity).eq(line.quantity) ||
      !quantity(counted.receivedQuantity).eq(received) ||
      !actual.recognized.eq(counted.recognizedQuantity) ||
      !actual.transit.eq(counted.remainingTransitQuantity) ||
      !actual.excess.eq(counted.excessQuantity)
    ) throw new Error("As quantidades do recebimento ainda precisam ser conferidas.");
    if (submitted.reviewReason) {
      const request = deliveryNeedRequest(line.metadata);
      if (request?.reason !== submitted.reviewReason || request.actorId !== actorId)
        throw new Error("O pedido de avaliação familiar ainda precisa ser conferido.");
    }
  }
}
