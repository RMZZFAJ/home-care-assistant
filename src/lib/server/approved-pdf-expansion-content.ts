import { requirePdfDocumentExpansion, pdfSectionLabels } from "@/lib/documents/pdf-modes";
import { progressCategories, progressStages } from "@/lib/validation/document-progress";
import { progressCareRoles, progressEventPresentation } from "@/lib/documents/progress-catalog";
import { auditActionLabel } from "@/lib/audit-presentation";
import { formatBrazilDate } from "@/lib/receipt";
import type { DocumentSnapshot, PdfEmissionContext } from "./operational-pdf";

/** Obligations derived from the frozen sources independently of the painter's run log. */
export function approvedPdfExpansionContent(snapshot: DocumentSnapshot, emission: PdfEmissionContext) {
  const source = requirePdfDocumentExpansion(snapshot.documentExpansion, { ...snapshot, requestedAt: emission.requestedAt });
  const semanticFacts: Record<string,string> = {}, options = source.options;
  semanticFacts["expansion/selection"] = "Seções escolhidas: " + options.sections.map(key => pdfSectionLabels[key]).join("; ") + ".";
  const date = (value: string) => value.split("-").reverse().join("/");
  semanticFacts["expansion/period"] = options.period.from && options.period.through
    ? "Período: de " + date(options.period.from) + " a " + date(options.period.through) + ", dias completos e inclusivos."
    : "Período: todos os registros disponíveis até o instante de referência.";
  semanticFacts["expansion/reference"] = "Instante de referência dos complementos: " + formatBrazilDate(source.referenceAt) + " · Fuso: America/Sao_Paulo.";
  if (options.mode === "audit") {
    semanticFacts["expansion/audit/purpose"] = options.purpose!;
    semanticFacts["expansion/audit/limits"] = "Relatório documental preliminar. Não é laudo pericial, não atesta a veracidade física dos relatos nem certifica conformidade. A marca nominativa identifica o exemplar, mas não impede sua remoção nem prova, sozinha, autoria de vazamento.";
  }
  if (source.progress) semanticFacts["expansion/progress/scope"] = "Relato manual não comprova ciência, recebimento, aprovação ou movimento de estoque. A etapa relacionada não altera a ordem dos acontecimentos.";
  if (source.progress?.length === 0) semanticFacts["expansion/progress/empty"] = "Nenhum andamento neste período. Isso não significa ausência de registros fora do recorte.";
  source.progress?.forEach((row,index) => {
    const key="expansion/progress/"+index,presentation=progressEventPresentation(row);
    semanticFacts[key+"/event"] = presentation.origin+" · "+presentation.label+" · "+(row.source==="manual"?progressCategories[row.category]:presentation.event);
    semanticFacts[key+"/actor"] = (row.authorName??(row.authorId?"Nome histórico não preservado":"Sistema, sem autoria pessoal"))+" · "+formatBrazilDate(row.recordedAt);
    if(row.source==="manual") {
      semanticFacts[key+"/text"]=row.text;
      if(row.stage)semanticFacts[key+"/stage"]="Etapa relacionada: "+progressStages[row.stage];
      if(row.mentions?.length)semanticFacts[key+"/mentions"]="Pessoas mencionadas: "+row.mentions.map(person=>person.name+" · "+progressCareRoles[person.careRole]).join("; ")+". Uma menção não registra ciência ou autoria.";
      row.references.forEach((ref,position)=>{semanticFacts[key+"/reference/"+position]="Referência autorizada · "+(ref.code??ref.type);});
    }
  });
  if(source.communications?.length===0)semanticFacts["expansion/communications/empty"]="Nenhuma comunicação neste recorte.";
  const channels:Record<string,string>={internal:"Aplicativo",whatsapp:"WhatsApp",email:"E-mail"};
  const states:Record<string,string>={pending:"Enfileirada para envio",processing:"Envio em processamento",accepted:"Aceita pelo provedor",delivered:"Entrega informada pelo provedor",read:"Leitura informada pelo provedor",sent:"Envio informado",failed:"Falha informada",cancelled:"Cancelada",uncertain:"Resultado incerto"};
  source.communications?.forEach((row,index)=>{
    const key="expansion/communications/"+index;
    semanticFacts[key+"/recipient"]="Comunicação registrada para "+(row.recipientLabel||"Destinatário nominal não preservado");
    semanticFacts[key+"/state"]=(channels[row.channel]??"Canal não reconhecido")+" · "+(states[row.state]??"Estado não reconhecido")+" · "+row.attempts+" tentativa(s) · "+formatBrazilDate(row.recordedAt);
    if(row.seenAt)semanticFacts[key+"/seen"]="Visualização da notificação informada pelo aplicativo em "+formatBrazilDate(row.seenAt)+"; não substitui ciência da ficha.";
  });
  if(source.confirmations?.length===0)semanticFacts["expansion/confirmations/empty"]="Nenhuma confirmação operacional neste recorte.";
  source.confirmations?.forEach((row,index)=>{
    semanticFacts["expansion/confirmations/"+index+"/event"]=progressEventPresentation(row).event!;
    semanticFacts["expansion/confirmations/"+index+"/actor"]=(row.authorName??"Nome histórico não preservado")+" · "+formatBrazilDate(row.recordedAt);
  });
  if(source.relations){
    if(!source.relations.references.length&&!source.relations.complements.length)semanticFacts["expansion/relations/empty"]="Nenhum vínculo preservado nesta versão.";
    source.relations.references.forEach((ref,index)=>{semanticFacts["expansion/relations/reference/"+index]=ref.accessible?"Ficha relacionada · "+ref.code+" · "+ref.type:"Ficha relacionada · Acesso restrito";});
    source.relations.complements.forEach((link,index)=>{
      const key="expansion/relations/complement/"+index;
      if(!link.accessible){semanticFacts[key]="Ficha complementar · Acesso restrito";return;}
      semanticFacts[key+"/code"]=(link.role==="source"?"Complementa ":"Complementada por ")+link.document.code;
      semanticFacts[key+"/reason"]=link.reason;
      semanticFacts[key+"/actor"]=(link.actorName??"Nome histórico não preservado")+" · "+formatBrazilDate(link.recordedAt);
    });
  }
  if(source.access?.length===0)semanticFacts["expansion/access/empty"]="Nenhum acesso relatado neste recorte.";
  source.access?.forEach((row,index)=>{semanticFacts["expansion/access/"+index]=(row.actorName??"Nome histórico não preservado")+" · "+formatBrazilDate(row.recordedAt);});
  if(source.auditTrail?.length===0)semanticFacts["expansion/audit/empty"]="Nenhum evento de auditoria neste recorte.";
  source.auditTrail?.forEach((row,index)=>{semanticFacts["expansion/audit/"+index]=auditActionLabel(row.action)+" · "+formatBrazilDate(row.recordedAt)+" · "+(row.actorId?"Ator registrado; nome histórico não preservado nesta fonte":"Sem ator pessoal registrado");});
  return { semanticFacts, auditWatermark: options.mode === "audit" ? "Auditoria restrita · " + emission.requestedName + " · " + formatBrazilDate(emission.requestedAt) + " · HCA-" + emission.verificationCode : undefined };
}
