import QRCode from "qrcode";
import type { ApprovedPdfLayout } from "./approved-pdf-layout";
import type { DocumentSnapshot, PdfEmissionContext } from "./operational-pdf";
import type { PdfLifecycleFacts } from "@/lib/documents/pdf-lifecycle";
import { formatBrazilDate } from "@/lib/receipt";
import { readPdfPresentation } from "@/lib/documents/pdf-presentation";
import { pdfSourceFactsSchema, sourceNameLabels } from "@/lib/documents/pdf-source-facts";

export const confidentialityNotice = "Este documento contém dados pessoais, inclusive informações de saúde, sujeitos a proteção especial pela Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais — LGPD), quando aplicável. O acesso, a guarda, a reprodução e o compartilhamento devem respeitar a finalidade legítima, a necessidade e a segurança das informações, limitando-se às pessoas autorizadas e aos dados necessários. A emissão não autoriza divulgação pública ou uso incompatível com essa finalidade. Confira o destinatário antes de compartilhar e utilize canal adequado. Se receber este documento por engano, não o encaminhe; comunique o responsável pelo envio e observe as orientações de guarda ou descarte aplicáveis. A identificação do exportador não afasta os deveres dos demais envolvidos, nem substitui as regras de autorização e proteção do sistema.";

export function appendDocumentOriginContext(layout: ApprovedPdfLayout, snapshot: DocumentSnapshot) {
  const source = pdfSourceFactsSchema.parse(snapshot.sourceFacts);
  if (source.historical) {
    layout.heading("Origem histórica da ficha");
    layout.fields([{ label: "Data do documento de origem", value: formatBrazilDate(source.sourceCreatedAt), key: "origin/recordedAt" }, { label: "Importação no sistema", value: formatBrazilDate(source.importedAt), key: "origin/importedAt" }]);
    layout.paragraph("A importação não comprova a data da emissão original nem sua ciência ou recebimento.", "origin/scope", { size: 9.5 });
  }
  if (["current_profile", "unknown"].includes(source.issuerSource)) layout.paragraph("Autoria: " + sourceNameLabels[source.issuerSource], "origin/issuerSource", { size: 9 });
  if (["current_profile", "unknown"].includes(source.patientSource)) layout.paragraph("Nome do paciente: " + sourceNameLabels[source.patientSource], "origin/patientSource", { size: 9 });
}

export function appendDocumentRelated(layout: ApprovedPdfLayout, snapshot: DocumentSnapshot, lifecycle: PdfLifecycleFacts, origin: URL) {
  const previous = snapshot.payload.sourceRequisition as { id?: string; code?: string; reason?: string; } | undefined;
  const presentation = readPdfPresentation(snapshot);
  if (previous || lifecycle.complements.length || presentation?.references.length) {
    layout.heading("Documentos relacionados");
    if (previous) {
      if (!presentation) layout.paragraph("Referência à requisição de origem não disponível neste registro.", "related/source");
      if (previous.reason) layout.paragraph(previous.reason, "related/sourceReason", { size: 9.5 });
    }
    const labels = { requisition: "Requisição vinculada", source_requisition: "Origem da necessidade remanescente", transfer_origin: "Entrega de origem", remaining_need: "Nova requisição de necessidade remanescente", related_document: "Ficha vinculada no histórico" };
    for (const [index, ref] of (presentation?.references ?? []).entries()) {
      const label = labels[ref.kind], key = "operationalReference/" + index;
      if (!ref.accessible) layout.paragraph(label + " · Acesso restrito", key);
      else layout.paragraph(label + " · " + ref.code, key, { strong: true, href: new URL("/documentos/" + ref.id, origin).href });
    }
    for (const [index, link] of lifecycle.complements.entries()) {
      const key = "related/" + index;
      if (!link.accessible) { layout.paragraph("Ficha complementar · Acesso restrito", key); continue; }
      layout.paragraph((link.role === "source" ? "Complementa " : "Complementada por ") + link.document.code, key + "/code", { strong: true, href: new URL("/documentos/" + link.document.id, origin).href });
      layout.paragraph("Vínculo registrado por " + (link.actorName ?? "Nome não preservado") + " · " + formatBrazilDate(link.recordedAt), key + "/actor", { size: 9 });
      layout.paragraph(link.reason, key + "/reason", { size: 9.5 });
    }
  }
}

export function appendOriginalObservations(layout: ApprovedPdfLayout, snapshot: DocumentSnapshot) {
  const intent = snapshot.payload.intent as { observations?: string[]; } | undefined;
  const observations = typeof snapshot.payload.notes === "string" && snapshot.payload.notes ? [snapshot.payload.notes] : intent?.observations ?? [];
  layout.heading("Observações originais", "Registradas pelo autor no ato da ficha.");
  if (!observations.length) layout.paragraph("Nenhuma observação original registrada.", "observations/empty");
  observations.forEach((note, index) => layout.observation(note, index + 1, "observation/" + index));
}

export function appendDocumentCancellation(layout: ApprovedPdfLayout, lifecycle: PdfLifecycleFacts, title: string) {
  const cancellation = lifecycle.cancellation;
  if (cancellation.state !== "not_cancelled") {
    layout.heading(title);
    if (cancellation.state === "unavailable") layout.paragraph("Cancelamento indicado; ato original não preservado. Nenhuma ciência presumida.", "cancellation/unavailable");
    else {
      layout.paragraph("Cancelada por " + (cancellation.act.actorName ?? "Nome não preservado") + " · " + formatBrazilDate(cancellation.act.recordedAt), "cancellation/actor");
      layout.paragraph(cancellation.act.reason ?? "Motivo não preservado", "cancellation/reason");
      layout.paragraph("O cancelamento preserva o conteúdo emitido, os vínculos e as ciências anteriores. Ciência do cancelamento é um ato próprio.", "cancellation/scope", { size: 9.5 });
      cancellation.acknowledgements.forEach((ack, index) => layout.paragraph("Ciência do cancelamento: " + (ack.actorName ?? "Nome não preservado") + " · " + formatBrazilDate(ack.recordedAt), "cancellation/ack/" + index, { size: 9.5 }));
      if (!cancellation.acknowledgements.length) layout.paragraph("Nenhuma ciência deste cancelamento registrada até o corte.", "cancellation/awareness");
    }
  }
}

export async function appendVerificationAndPrivacy(layout: ApprovedPdfLayout, emission: PdfEmissionContext, subject: string, issuer: string, operationalAt: string | null, verificationUrl: string, formattedCode: string) {
  if (emission.example) {
    layout.heading("Exemplo fictício · sem valor documental");
    layout.paragraph("Demonstração do formato. Não corresponde a uma emissão registrada, não contém assinatura digital e não comprova atos, ciência ou movimentações reais.", "example/scope");
    return;
  }
  if (emission.representation === "derived") layout.paragraph("Este exemplar retrata uma versão preservada. Um arquivo autêntico pode estar desatualizado; consulte a ficha para conhecer sua situação atual.", "representation/scope", { size: 9.5 });
  const description = subject + " foi registrada por " + issuer + ", em " + formatBrazilDate(operationalAt) + ". A emissão deste exemplar foi solicitada por " + emission.requestedName + ", em " + formatBrazilDate(emission.requestedAt) + ", para assinatura digital pelo Home Care Assistant. A assinatura identifica a origem e a integridade deste exemplar; não comprova a veracidade física dos relatos nem que a ficha permanece ativa.";
  await layout.authenticity(description, verificationUrl, formattedCode, await QRCode.toBuffer(verificationUrl, { type: "png", width: 220, margin: 1 }));
  layout.heading("Confidencialidade e proteção de dados pessoais");
  layout.paragraph(confidentialityNotice, "privacy/notice", { size: 9 });
}
