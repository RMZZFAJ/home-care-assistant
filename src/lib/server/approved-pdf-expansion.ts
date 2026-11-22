import { canonicalSymbols } from "@/lib/ui/canonical-symbols";
import { requirePdfDocumentExpansion, documentModeLabel, pdfSectionLabels } from "@/lib/documents/pdf-modes";
import { progressCategories, progressStages } from "@/lib/validation/document-progress";
import { progressCareRoles, progressEventPresentation } from "@/lib/documents/progress-catalog";
import { auditActionLabel } from "@/lib/audit-presentation";
import { formatBrazilDate } from "@/lib/receipt";
import { documentColors, type ApprovedPdfLayout } from "./approved-pdf-layout";
import type { DocumentSnapshot, PdfEmissionContext } from "./operational-pdf";

export function approvedPdfMode(snapshot: DocumentSnapshot, emission: PdfEmissionContext) {
  if (emission.example) return { modality: "Exemplo fictício · sem emissão", auditWatermark: "DEMONSTRAÇÃO · SEM VALOR DOCUMENTAL" };
  if (emission.rendererRevision !== 17) return { modality: "Ficha" };
  const source = requirePdfDocumentExpansion(snapshot.documentExpansion, { ...snapshot, requestedAt: emission.requestedAt });
  return {
    modality: documentModeLabel(source.options),
    ...(source.options.mode === "audit" ? {
      auditWatermark: "Auditoria restrita · " + emission.requestedName + " · " + formatBrazilDate(emission.requestedAt) + " · HCA-" + emission.verificationCode,
    } : {}),
  };
}
export function appendApprovedPdfExpansion(layout: ApprovedPdfLayout, snapshot: DocumentSnapshot, emission: PdfEmissionContext) {
  if (emission.rendererRevision !== 17) return;
  const source = requirePdfDocumentExpansion(snapshot.documentExpansion, { ...snapshot, requestedAt: emission.requestedAt });
  const options = source.options, period = options.period;
  const date = (value: string) => value.split("-").reverse().join("/");
  layout.heading("Complementos desta ficha");
  layout.paragraph("Seções escolhidas: " + options.sections.map(key => pdfSectionLabels[key]).join("; ") + ".", "expansion/selection", { size: 9.5 });
  layout.paragraph(period.from && period.through ? "Período: de " + date(period.from) + " a " + date(period.through) + ", dias completos e inclusivos." : "Período: todos os registros disponíveis até o instante de referência.", "expansion/period", { size: 9.5 });
  layout.paragraph("Instante de referência dos complementos: " + formatBrazilDate(source.referenceAt) + " · Fuso: America/Sao_Paulo.", "expansion/reference", { size: 9.5 });
  layout.paragraph("O período filtra o momento dos Andamentos, confirmações, acessos e auditoria; comunicações usam o registro ou a última tentativa. Vínculos refletem a versão preservada da ficha. Materiais, observações e exceções essenciais da Ficha permanecem integrais.", "expansion/criterion", { size: 9 });
  layout.paragraph("Fontes: eventos canônicos da ficha, registros manuais e demais fontes escolhidas, visíveis no momento da reserva. Os complementos podem registrar fatos posteriores à situação da ficha indicada no cabeçalho.", "expansion/sources", { size: 9 });
  if (options.mode === "audit") {
    layout.heading("Finalidade e limites da auditoria");
    layout.paragraph(options.purpose!, "expansion/audit/purpose");
    layout.paragraph("Relatório documental preliminar. Não é laudo pericial, não atesta a veracidade física dos relatos nem certifica conformidade. A marca nominativa identifica o exemplar, mas não impede sua remoção nem prova, sozinha, autoria de vazamento.", "expansion/audit/limits", { size: 9.5 });
  }
  if (source.progress) {
    layout.ensure(185);
    layout.heading("Andamentos", source.progress.length + " registro(s) no recorte. Origem e destaque são independentes; a ordem é cronológica.");
    layout.paragraph("Relato manual não comprova ciência, recebimento, aprovação ou movimento de estoque. A etapa relacionada não altera a ordem dos acontecimentos.", "expansion/progress/scope", { size: 9 });
    if (!source.progress.length) layout.paragraph("Nenhum andamento neste período. Isso não significa ausência de registros fora do recorte.", "expansion/progress/empty");
    source.progress.forEach((row, index) => {
      const key = "expansion/progress/" + index, presentation = progressEventPresentation(row);
      layout.ensure(80);
      layout.markedParagraph(presentation.origin + " · " + presentation.label + " · " + (row.source === "manual" ? progressCategories[row.category] : presentation.event), key + "/event", [canonicalSymbols[presentation.originIcon], canonicalSymbols[presentation.icon]], presentation.relevance === "attention" ? documentColors.warn : presentation.relevance === "milestone" ? documentColors.good : documentColors.blue);
      layout.paragraph((row.authorName ?? (row.authorId ? "Nome histórico não preservado" : "Sistema, sem autoria pessoal")) + " · " + formatBrazilDate(row.recordedAt), key + "/actor", { size: 9 });
      if (row.source === "manual") {
        if (row.stage) layout.paragraph("Etapa relacionada: " + progressStages[row.stage], key + "/stage", { size: 9 });
        layout.observation(row.text, index + 1, key + "/text");
        if (row.mentions?.length) layout.paragraph("Pessoas mencionadas: " + row.mentions.map(person => person.name + " · " + progressCareRoles[person.careRole]).join("; ") + ". Uma menção não registra ciência ou autoria.", key + "/mentions", { size: 9.5 });
        row.references.forEach((ref, position) => layout.paragraph("Referência autorizada · " + (ref.code ?? ref.type), key + "/reference/" + position, { size: 9.5, href: new URL("/documentos/" + ref.id, emission.verificationOrigin).href }));
      }
      layout.gap(5);
    });
  }
  if (source.communications) {
    layout.ensure(120);
    layout.heading("Comunicações", "Estado disponível na reserva, pelo momento do registro ou da última tentativa. Transporte não comprova ciência pessoal.");
    if (!source.communications.length) layout.paragraph("Nenhuma comunicação neste recorte.", "expansion/communications/empty");
    const channels: Record<string, string> = { internal: "Aplicativo", whatsapp: "WhatsApp", email: "E-mail" };
    const states: Record<string, string> = { pending: "Enfileirada para envio", processing: "Envio em processamento", accepted: "Aceita pelo provedor", delivered: "Entrega informada pelo provedor", read: "Leitura informada pelo provedor", sent: "Envio informado", failed: "Falha informada", cancelled: "Cancelada", uncertain: "Resultado incerto" };
    source.communications.forEach((row, index) => {
      const key = "expansion/communications/" + index;
      layout.paragraph("Comunicação registrada para " + (row.recipientLabel || "Destinatário nominal não preservado"), key + "/recipient", { strong: true });
      layout.paragraph((channels[row.channel] ?? "Canal não reconhecido") + " · " + (states[row.state] ?? "Estado não reconhecido") + " · " + row.attempts + " tentativa(s) · " + formatBrazilDate(row.recordedAt), key + "/state", { size: 9.5 });
      if (row.seenAt) layout.paragraph("Visualização da notificação informada pelo aplicativo em " + formatBrazilDate(row.seenAt) + "; não substitui ciência da ficha.", key + "/seen", { size: 9 });
    });
  }
  if (source.confirmations) {
    layout.ensure(110);
    layout.heading("Confirmações operacionais", "Atos da cronologia canônica; a natureza de cada ato permanece distinta.");
    if (!source.confirmations.length) layout.paragraph("Nenhuma confirmação operacional neste recorte.", "expansion/confirmations/empty");
    source.confirmations.forEach((row, index) => {
      layout.paragraph(progressEventPresentation(row).event!, "expansion/confirmations/" + index + "/event", { strong: true });
      layout.paragraph((row.authorName ?? "Nome histórico não preservado") + " · " + formatBrazilDate(row.recordedAt), "expansion/confirmations/" + index + "/actor", { size: 9.5 });
    });
  }
  if (source.relations) {
    layout.ensure(140);
    layout.heading("Detalhes dos vínculos", "Fontes: referências explícitas e vínculos formais da versão preservada; não inferem atendimento ou cumprimento.");
    if (!source.relations.references.length && !source.relations.complements.length) layout.paragraph("Nenhum vínculo preservado nesta versão.", "expansion/relations/empty");
    source.relations.references.forEach((ref, index) => layout.paragraph(ref.accessible ? "Ficha relacionada · " + ref.code + " · " + ref.type : "Ficha relacionada · Acesso restrito", "expansion/relations/reference/" + index, ref.accessible ? { href: new URL("/documentos/" + ref.id, emission.verificationOrigin).href } : {}));
    source.relations.complements.forEach((link, index) => {
      const key = "expansion/relations/complement/" + index;
      if (!link.accessible) { layout.paragraph("Ficha complementar · Acesso restrito", key); return; }
      layout.paragraph((link.role === "source" ? "Complementa " : "Complementada por ") + link.document.code, key + "/code", { href: new URL("/documentos/" + link.document.id, emission.verificationOrigin).href });
      layout.paragraph(link.reason, key + "/reason");
      layout.paragraph((link.actorName ?? "Nome histórico não preservado") + " · " + formatBrazilDate(link.recordedAt), key + "/actor", { size: 9.5 });
    });
  }
  if (source.access) {
    layout.ensure(155);
    layout.heading("Histórico operacional de acesso", "Relatos de exibição enviados pelo aplicativo. Novos acessos da mesma pessoa/versão são agrupados em vinte minutos; registros anteriores permanecem preservados.");
    layout.paragraph("Acesso observado não comprova leitura integral, ciência, assinatura ou recebimento.", "expansion/access/scope", { size: 9.5 });
    if (!source.access.length) layout.paragraph("Nenhum acesso relatado neste recorte.", "expansion/access/empty");
    source.access.forEach((row, index) => layout.paragraph((row.actorName ?? "Nome histórico não preservado") + " · " + formatBrazilDate(row.recordedAt), "expansion/access/" + index, { size: 9.5 }));
  }
  if (source.auditTrail) {
    layout.ensure(200);
    layout.heading("Trilha de auditoria da ficha", "Fonte: eventos de auditoria vinculados diretamente à ficha ou por referência documental. Não inclui logs de infraestrutura, dados de sessão ou payloads privados.");
    layout.paragraph("Esta fonte preserva a identidade do ator no sistema, mas não seu nome histórico. Os nomes preservados dos atos documentais aparecem na cronologia correspondente.", "expansion/audit/identity", { size: 9 });
    if (!source.auditTrail.length) layout.paragraph("Nenhum evento de auditoria neste recorte.", "expansion/audit/empty");
    source.auditTrail.forEach((row, index) => layout.paragraph(auditActionLabel(row.action) + " · " + formatBrazilDate(row.recordedAt) + " · " + (row.actorId ? "Ator registrado; nome histórico não preservado nesta fonte" : "Sem ator pessoal registrado"), "expansion/audit/" + index, { size: 9.5 }));
  }
}
