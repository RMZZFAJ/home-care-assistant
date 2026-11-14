import { fulfillmentLabel } from "@/lib/documents/fulfillment-label";
import { approvedDocumentContent } from "./approved-document-content";
import type { DocumentSnapshot, PdfEmissionContext } from "./operational-pdf";
import { formatBrazilDate } from "@/lib/receipt";
import { formatStockObservation, formatStockObservationTime } from "@/lib/stock-observation";
import type { StockObservation, StockObservationTimeSource } from "@/types/requisition";

/** Content obligations from the frozen source, independent of the approved painter's run log. */
export function approvedRequisitionContent(snapshot: DocumentSnapshot, emission: PdfEmissionContext) {
  if (snapshot.type !== "REQ") throw new Error("Approved REQ content required");
  const { source, facts, semanticFacts } = approvedDocumentContent(snapshot, emission);
  semanticFacts["identity/recordedAt"] = formatBrazilDate(source.historical ? source.sourceCreatedAt : source.issuedAt);
  for (const [index, line] of snapshot.lines.entries()) {
    const key = "material/" + index;
    const stock = typeof line.current_stock === "number" || typeof line.current_stock === "string" ? line.current_stock : null;
    const stockTime = ["client_draft", "server_submission", "legacy_unknown"].includes(String(line.stock_observation_time_source)) ? line.stock_observation_time_source as StockObservationTimeSource : "legacy_unknown";
    semanticFacts[key + "/name"] = String(line.name_snapshot ?? line.product_name_snapshot ?? line.custom_name ?? "Material não identificado");
    semanticFacts[key + "/unit"] = String(line.unit_snapshot ?? "Unidade não preservada");
    semanticFacts[key + "/stock"] = formatStockObservation(stock, line.stock_observation as StockObservation, typeof line.unit_snapshot === "string" ? line.unit_snapshot : undefined) + " " + formatStockObservationTime(typeof line.stock_observation_at === "string" ? line.stock_observation_at : null, stockTime);
    const attended = snapshot.fulfillmentLines?.find(value => value.id === line.id);
    semanticFacts[key + "/fulfillment"] = source.historical ? "Atendimento não apurado na origem histórica" : fulfillmentLabel(attended);
    if (line.urgent) facts.push("URGENTE");
  }
  for (const event of snapshot.scienceEvents ?? []) facts.push(event.actor_name, formatBrazilDate(event.created_at));
  return { facts, semanticFacts };
}
