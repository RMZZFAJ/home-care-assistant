import type { DocumentSnapshot, PdfEmissionContext } from "./operational-pdf";
import { pdfSourceFactsSchema, sourceNameLabels } from "@/lib/documents/pdf-source-facts";
import { requirePdfLifecycleFacts } from "@/lib/documents/pdf-lifecycle";
import { formatBrazilDate } from "@/lib/receipt";
import { readPdfPresentation, originalAuthorDetail, documentCutLabel } from "@/lib/documents/pdf-presentation";

/** Common source obligations, independent of all layout components. */
export function approvedDocumentContent(snapshot: DocumentSnapshot, emission: PdfEmissionContext) {
  const source = pdfSourceFactsSchema.parse(snapshot.sourceFacts), lifecycle = requirePdfLifecycleFacts(snapshot.lifecycleFacts, snapshot);
  const observations = typeof snapshot.payload.notes === "string" && snapshot.payload.notes ? [snapshot.payload.notes] : (snapshot.payload.intent as { observations?: string[] } | undefined)?.observations ?? [];
  const facts = [snapshot.code, source.patientName ?? "Nome do paciente não preservado", source.issuerName ?? "Autoria nominal desconhecida", emission.requestedName, emission.verificationCode.match(/.{1,4}/g)?.join("-") ?? emission.verificationCode,
    ...snapshot.lines.flatMap(line => [String(line.name_snapshot ?? line.product_name_snapshot ?? line.custom_name ?? "Material não identificado"), String(line.unit_snapshot ?? "Unidade não preservada")]), ...observations];
  const semanticFacts: Record<string, string> = { "identity/patient": source.patientName ?? "Nome do paciente não preservado", "identity/issuer": source.issuerName ?? "Autoria nominal desconhecida" };
  semanticFacts["identity/issuerRole"] = originalAuthorDetail(snapshot);
  semanticFacts["identity/asOf"] = documentCutLabel(snapshot);
  if (source.historical) { semanticFacts["origin/recordedAt"] = formatBrazilDate(source.sourceCreatedAt); semanticFacts["origin/importedAt"] = formatBrazilDate(source.importedAt); }
  if (["current_profile", "unknown"].includes(source.issuerSource)) semanticFacts["origin/issuerSource"] = "Autoria: " + sourceNameLabels[source.issuerSource];
  if (["current_profile", "unknown"].includes(source.patientSource)) semanticFacts["origin/patientSource"] = "Nome do paciente: " + sourceNameLabels[source.patientSource];
  const presentation = readPdfPresentation(snapshot);
  const referenceLabels = { requisition: "Requisição vinculada", source_requisition: "Origem da necessidade remanescente", transfer_origin: "Entrega de origem", remaining_need: "Nova requisição de necessidade remanescente", related_document: "Ficha vinculada no histórico" };
  for (const [index, ref] of (presentation?.references ?? []).entries()) semanticFacts["operationalReference/" + index] = referenceLabels[ref.kind] + " · " + (ref.accessible ? ref.code : "Acesso restrito");
  observations.forEach((note, index) => { semanticFacts["observation/" + index] = note; });
  const cancellation = lifecycle.cancellation;
  if (cancellation.state === "recorded") {
    semanticFacts["cancellation/actor"] = "Cancelada por " + (cancellation.act.actorName ?? "Nome não preservado") + " · " + formatBrazilDate(cancellation.act.recordedAt);
    semanticFacts["cancellation/reason"] = cancellation.act.reason ?? "Motivo não preservado";
    cancellation.acknowledgements.forEach((ack, index) => { semanticFacts["cancellation/ack/" + index] = "Ciência do cancelamento: " + (ack.actorName ?? "Nome não preservado") + " · " + formatBrazilDate(ack.recordedAt); });
  } else if (cancellation.state === "unavailable") semanticFacts["cancellation/unavailable"] = "Cancelamento indicado; ato original não preservado. Nenhuma ciência presumida.";
  lifecycle.complements.forEach((link, index) => {
    const prefix = "related/" + index;
    if (!link.accessible) semanticFacts[prefix] = "Ficha complementar · Acesso restrito";
    else {
      semanticFacts[prefix + "/code"] = (link.role === "source" ? "Complementa " : "Complementada por ") + link.document.code;
      semanticFacts[prefix + "/actor"] = "Vínculo registrado por " + (link.actorName ?? "Nome não preservado") + " · " + formatBrazilDate(link.recordedAt);
      semanticFacts[prefix + "/reason"] = link.reason;
    }
  });
  return { source, facts, semanticFacts };
}
