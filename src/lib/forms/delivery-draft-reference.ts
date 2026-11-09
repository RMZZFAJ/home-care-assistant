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
