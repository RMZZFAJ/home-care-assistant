import type { SupplyDocument } from "@/types/documents";
import { formatBrazilDate } from "@/lib/receipt";

/** A private display reference; the database still authorizes the actual request. */
export function deliveryRequestDraftFields(data: SupplyDocument) {
  const request = data.deliveryCancellation?.request;
  return request
    ? {
        requestId: request.id,
        requestLabel: `${request.requestedName ?? "Nome histórico não preservado"} · ${formatBrazilDate(request.requestedAt)} · ${request.reason}`,
      }
    : {
        requestId: "",
        requestLabel: "Pedido indisponível na referência consultada",
      };
}

/** Only the sealed reference and user's inputs are private; consumption facts stay in Auth reads. */
export function deliveryConsentDraftFields(data: SupplyDocument) {
  return {
    ...deliveryRequestDraftFields(data),
    referenceHash: data.deliveryCancellation?.referenceHash ?? "",
  };
}
export function consentReferenceReady(data: SupplyDocument) {
  const reference = data.deliveryCancellation;
  return (
    data.type === "ENT" &&
    reference?.request.status === "pending" &&
    reference.sourceReady === true &&
    reference.sourceAccess !== false &&
    typeof reference.referenceHash === "string" &&
    /^[a-f0-9]{64}$/.test(reference.referenceHash)
  );
}
