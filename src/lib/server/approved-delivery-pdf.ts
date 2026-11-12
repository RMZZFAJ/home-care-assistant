import { originalAuthorDetail, documentCutLabel } from "@/lib/documents/pdf-presentation";
import { PDFHexString, PDFName } from "pdf-lib";
import { ApprovedPdfLayout, type DocumentHeader, type DocumentTone } from "./approved-pdf-layout";
import { appendDocumentOriginContext, appendDocumentRelated, appendOriginalObservations, appendDocumentCancellation, appendVerificationAndPrivacy } from "./approved-document-sections";
import type { DocumentSnapshot, PdfEmissionContext } from "./operational-pdf";
import { documentStatuses, type DeliveryRecipientSelection } from "@/types/documents";
import { pdfSourceFactsSchema } from "@/lib/documents/pdf-source-facts";
import { pdfFidelitySchema } from "@/lib/documents/pdf-fidelity";
import { requirePdfLifecycleFacts } from "@/lib/documents/pdf-lifecycle";
import { materialTransferDirection } from "@/lib/documents/transfer-follow-up";
import { confirmedDeliveryQuantity, recordedDeliveryRecipient } from "@/lib/documents/delivery-confirmed-quantity";
import { entReceiptState } from "@/lib/documents/ent-receipt-state";
import { CATEGORY_LABELS } from "@/lib/catalog";
import { formatBrazilDate } from "@/lib/receipt";
import { formatQuantity, quantity } from "@/lib/quantity";

const name = (line: Record<string, unknown>) => String(line.name_snapshot ?? line.product_name_snapshot ?? line.custom_name ?? "Material não identificado");
const unit = (line: Record<string, unknown>) => String(line.unit_snapshot ?? "Unidade não preservada");
const amount = (value: unknown, measure?: string) => typeof value === "string" || typeof value === "number" ? formatQuantity(value, measure) : "Não disponível no registro";
const cancellationStates = { pending: "Aguardando decisão do recebedor", consented: "Consentido e conciliado", refused: "Recusado pelo recebedor", withdrawn: "Retirado pelo solicitante" };
const regularizationStates = { pending: "Proposta aguardando conferência independente", approved: "Encerramento administrativo aprovado", rejected: "Proposta rejeitada, sem movimentação", withdrawn: "Proposta retirada, sem movimentação", obsolete: "Proposta obsoleta encerrada, sem movimentação" };

export async function renderApprovedDeliveryPdf(snapshot: DocumentSnapshot, emission: PdfEmissionContext) {
  if (snapshot.type !== "ENT") throw new Error("Delivery source required");
  const source = pdfSourceFactsSchema.parse(snapshot.sourceFacts), fidelity = pdfFidelitySchema.parse(snapshot.documentFacts), lifecycle = requirePdfLifecycleFacts(snapshot.lifecycleFacts, snapshot);
  const origin = new URL(emission.verificationOrigin);
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') throw new Error("Verification origin required");
  const direction = materialTransferDirection(String(snapshot.payload.source ?? ""), String(snapshot.payload.destination ?? "")), returned = direction === "return";
  const issuer = source.issuerName ?? "Autoria nominal desconhecida", patient = source.patientName ?? "Nome do paciente não preservado";
  const at = source.historical ? source.sourceCreatedAt : source.issuedAt, acceptedAt = typeof snapshot.workflow?.acceptedAt === "string" ? snapshot.workflow.acceptedAt : null;
  const receiptName = recordedDeliveryRecipient(snapshot, source) ?? "Nome não preservado";
  const personal = !source.historical && Boolean(acceptedAt), cancelled = snapshot.status === "cancelled", administrative = snapshot.status === "administratively_closed";
  const complete = snapshot.status === "confirmed" || snapshot.status === "received", issue = snapshot.lines.some(line => (line.metadata as { issueOpen?: boolean } | undefined)?.issueOpen);
  const tone: DocumentTone = cancelled || administrative ? "bad" : complete ? "good" : "warn";
  const title = returned ? "Devolução de materiais" : direction === "delivery" ? "Entrega de materiais" : "Movimentação de materiais · percurso não preservado";
  const status = documentStatuses[snapshot.status] ?? "Situação não preservada";
  const quantities = snapshot.lines.map(line => confirmedDeliveryQuantity(snapshot, line, fidelity.deliveryResolutions, source.historical));
  const header: DocumentHeader = {
    modality: "Ficha", title, code: snapshot.code, status, tone, asOf: documentCutLabel(snapshot), requestedAt: formatBrazilDate(emission.requestedAt), exporter: emission.requestedName, verificationCode: emission.verificationCode,
    privateUrl: new URL("/documentos/" + snapshot.id, origin).href,
    metric: quantities.filter(value => value.state === "recorded" && quantity(value.quantity).gt(0)).length + " / " + snapshot.lines.length, metricLabel: "materiais com recebimento pessoal registrado",
    seal: personal ? { title: issue || !snapshot.lines.every(line => line.fully_checked) ? "Recebimento parcial" : "Recebimento confirmado", actor: receiptName, at: formatBrazilDate(acceptedAt), how: "Conferência pessoal preservada", tone: "good", confirmed: true }
      : { title: administrative ? "Encerramento administrativo" : source.historical ? "Recebimento não comprovado" : "Recebimento pendente", actor: "Sem confirmação pessoal preservada", at: "", how: "Expedição não comprova recebimento físico.", tone: administrative ? "bad" : "warn", confirmed: false },
  };
  const layout = await ApprovedPdfLayout.create(header, emission.onText), identity = { verificationCode: emission.verificationCode, requestedAt: emission.requestedAt };
  layout.pdf.catalog.set(PDFName.of("HCAIssuance"), PDFHexString.fromText(JSON.stringify(identity))); layout.pdf.setCreationDate(new Date(emission.requestedAt)); layout.pdf.setModificationDate(new Date(emission.requestedAt));
  layout.firstHeader();
  layout.fields([{ label: "Paciente", value: patient, key: "identity/patient" }, { label: "Registrado por", value: issuer, detail: originalAuthorDetail(snapshot), detailKey: "identity/issuerRole", key: "identity/issuer" }, { label: returned ? "Devolução expedida" : "Expedição registrada", value: formatBrazilDate(at), key: "identity/recordedAt" }]);
  appendDocumentOriginContext(layout, snapshot);
  appendDocumentRelated(layout, snapshot, lifecycle, origin);
  if (snapshot.transfer?.originDocumentId) layout.paragraph("Há uma entrega de origem vinculada. Consulte sua referência autorizada na ficha.", "transfer/origin", { size: 9.5 });
  else if (returned) layout.paragraph("Devolução autônoma da equipe para a família, sem entrega de origem vinculada.", "transfer/origin", { size: 9.5 });
  layout.milestones([
    { label: returned ? "Expedição da devolução" : "Expedição", symbol: "box", detail: formatBrazilDate(at), done: Boolean(at), tone: "blue" },
    { label: personal ? "Recebimento confirmado" : "Recebimento", symbol: "people", detail: personal ? formatBrazilDate(acceptedAt) : "Sem confirmação pessoal", done: personal, current: !personal && !cancelled && !administrative, tone: personal ? "good" : "warn" },
    ...(issue || fidelity.deliveryResolutions.length || snapshot.deliveryRegularization?.cases.length ? [{ label: "Tratamento da divergência", symbol: "clock" as const, detail: issue ? "Em aberto" : "Atos preservados abaixo", done: !issue && (complete || administrative), current: issue, tone: issue ? "warn" as const : "blue" as const }] : []),
    { label: cancelled ? "Cancelamento" : administrative ? "Encerramento administrativo" : "Conclusão", symbol: cancelled || administrative ? "cross" : "check", detail: cancelled || administrative ? "Não presume recebimento pessoal" : complete ? "Concluída" : "Em acompanhamento", done: complete || cancelled || administrative, tone: complete ? "good" : cancelled || administrative ? "bad" : undefined },
  ]);
  layout.heading("Relação de materiais", "Expedido, recebido pessoalmente e diferença ainda em aberto são fatos distintos. Devolução, falta e conciliação administrativa aparecem em seções próprias.");
  const groups = new Map<string, { line: Record<string, unknown>; index: number }[]>();
  snapshot.lines.forEach((line, index) => { const key = String(line.category_snapshot ?? ""), label = Object.hasOwn(CATEGORY_LABELS, key) ? CATEGORY_LABELS[key as keyof typeof CATEGORY_LABELS] : key || "Materiais sem categoria preservada"; const group = groups.get(label) ?? []; group.push({ line, index }); groups.set(label, group); });
  layout.table([{ label: "Nº", fraction: 0.045 }, { label: "Material", fraction: 0.335 }, { label: "Unidade", fraction: 0.12 }, { label: "Expedido", fraction: 0.15 }, { label: "Recebido confirmado", fraction: 0.18 }, { label: "Em aberto", fraction: 0.17 }], [...groups.entries()].flatMap(([category, rows]) => rows.map(({ line, index }) => {
    const receipt = quantities[index], open = (typeof line.reconciled_quantity === "string" || typeof line.reconciled_quantity === "number") && (typeof line.accepted_quantity === "string" || typeof line.accepted_quantity === "number") ? quantity(String(line.quantity)).minus(line.accepted_quantity).minus(line.reconciled_quantity).toFixed() : null;
    if (open !== null && quantity(open).lt(0)) throw new Error("Invalid frozen reconciliation");
    return { category, cells: [{ text: String(index + 1).padStart(2, "0") }, { text: name(line), key: "material/" + index + "/name", strong: true }, { text: unit(line), key: "material/" + index + "/unit" }, { text: amount(line.quantity, unit(line)), key: "material/" + index + "/expedited" }, { text: receipt.state === "recorded" ? amount(receipt.quantity, unit(line)) : receipt.state === "unavailable" ? "Quantidade não preservada" : "Não confirmado", key: "material/" + index + "/received" }, { text: amount(open, unit(line)), key: "material/" + index + "/open" }] };
  })));
  layout.heading("Declaração do recebimento");
  layout.paragraph(entReceiptState(snapshot.status, source.historical, acceptedAt, emission.representation).declaration, "receipt/state", { size: 9.5 });
  if (administrative) layout.paragraph("Encerramento administrativo não substitui aceite pessoal. Os efeitos apurados e a situação física ainda desconhecida permanecem nas seções próprias.", "receipt/administrative", { size: 9.5 });
  if (personal) layout.paragraph("Conferência pessoal: " + receiptName + " · " + formatBrazilDate(acceptedAt), "receipt/actor");
  const selection = snapshot.workflow?.recipientSelection as DeliveryRecipientSelection | undefined;
  if (selection) {
    layout.heading("Recebedor designado"); layout.paragraph(selection.recipientName + " · " + (selection.manual ? "Escolha manual" : "Sugestão da escala mantida"), "recipient/person");
    layout.paragraph("Indicado por " + selection.selectedName + " · " + formatBrazilDate(selection.recordedAt), "recipient/actor", { size: 9.5 }); if (selection.reason) layout.paragraph(selection.reason, "recipient/reason");
    layout.paragraph("A indicação não comprova presença nem substitui a confirmação pessoal do recebimento.", "recipient/scope", { size: 9.5 });
  }
  const transfer = snapshot.transfer;
  if (transfer) {
    layout.heading(returned ? "Declaração da devolução" : "Declaração da transferência");
    layout.paragraph("Declarante: " + transfer.declaration.actor.name + " · " + formatBrazilDate(transfer.declaration.recordedAt), "transfer/declaration"); layout.paragraph(transfer.declaration.reason, "transfer/reason");
    layout.paragraph("Contraparte para concordância: " + transfer.declaration.counterparty.name + " · Recebedor físico designado: " + transfer.declaration.recipient.name, "transfer/people", { size: 9.5 });
    if (transfer.agreement) { layout.paragraph((transfer.agreement.decision === "agree" ? "Concordância própria: " : "Recusa própria: ") + transfer.agreement.actor.name + " · " + formatBrazilDate(transfer.agreement.recordedAt), "transfer/agreement"); layout.paragraph(transfer.agreement.reason, "transfer/agreementReason"); }
    else layout.paragraph("Sem concordância registrada nesta versão.", "transfer/agreement");
    if (transfer.withdrawal) { layout.paragraph((transfer.withdrawal.kind === "administrative_close" ? "Encerramento administrativo: " : "Retirada pelo declarante: ") + transfer.withdrawal.actor.name + " · " + formatBrazilDate(transfer.withdrawal.recordedAt), "transfer/withdrawal"); layout.paragraph(transfer.withdrawal.reason, "transfer/withdrawalReason"); }
    layout.paragraph(transfer.dispatchedAt ? "Expedição própria: " + formatBrazilDate(transfer.dispatchedAt) : "Declaração e concordância não equivalem a expedição ou recebimento físico.", "transfer/dispatch", { size: 9.5 });
  }
  for (const [index, line] of snapshot.lines.entries()) {
    const receipt = (line.metadata as { receipt?: { problem?: string; notes?: string; acceptedQuantity?: string | number } } | undefined)?.receipt;
    if (!receipt) continue;
    layout.heading("Divergência original · " + name(line));
    const problem = { shortage: "Quantidade menor", damaged: "Material avariado", wrong: "Produto divergente", other: "Outra diferença" };
    layout.paragraph(receipt.problem && Object.hasOwn(problem, receipt.problem) ? problem[receipt.problem as keyof typeof problem] : "Classificação não preservada", "issue/" + index + "/kind");
    layout.paragraph(receipt.notes || "Nota não preservada", "issue/" + index + "/notes");
    layout.paragraph("Aceito na declaração original: " + amount(receipt.acceptedQuantity, unit(line)), "issue/" + index + "/accepted", { size: 9.5 });
  }
  for (const [index, event] of fidelity.deliveryResolutions.entries()) {
    const line = snapshot.lines.find(value => value.id === event.lineId), prefix = "resolution/" + index;
    layout.heading("Resolução de divergência · " + (line ? name(line) : "Material não identificado"));
    layout.paragraph(event.resolution ? { received: "Recebimento complementar", returned: "Devolução à origem", missing: "Falta ou perda conciliada" }[event.resolution] : "Resolução não preservada", prefix + "/outcome", { strong: true });
    layout.paragraph((event.actorName ?? "Nome não preservado") + " · " + formatBrazilDate(event.recordedAt), prefix + "/actor", { size: 9.5 }); layout.paragraph("Quantidade desta resolução: " + amount(event.quantity, line ? unit(line) : undefined), prefix + "/quantity"); layout.paragraph(event.reason || "Motivo não preservado", prefix + "/reason");
  }
  const cancellation = snapshot.deliveryCancellation;
  if (cancellation) {
    layout.heading("Pedido de cancelamento e decisão");
    const requests = [cancellation.request, ...cancellation.history];
    for (const [index, request] of requests.entries()) {
      const prefix = "cancellationRequest/" + index;
      layout.paragraph(cancellationStates[request.status], prefix + "/state", { strong: true }); layout.paragraph((request.requestedName ?? "Nome não preservado") + " · " + formatBrazilDate(request.requestedAt), prefix + "/actor", { size: 9.5 }); layout.paragraph(request.reason, prefix + "/reason");
      if (request.outcome) { layout.paragraph("Decisão de " + (request.outcome.actorName ?? "Nome não preservado") + " · " + formatBrazilDate(request.outcome.recordedAt), prefix + "/decision", { size: 9.5 }); layout.paragraph(request.outcome.reason, prefix + "/decisionReason"); }
    }
    if (cancellation.historical) layout.paragraph("Pedido anterior preservado após encerramento administrativo, sem consentimento pessoal atribuído ao recebedor.", "cancellationRequest/scope");
    else if (cancellation.request.status === "pending") layout.paragraph("Pedido pendente não estorna materiais. Devolução física e consumo confirmado dependem de conciliação própria.", "cancellationRequest/scope");
    else if (cancellation.request.status !== "consented") layout.paragraph("A recusa ou retirada preservou o recebimento e não movimentou estoque.", "cancellationRequest/scope");
    if (cancellation.request.status === "pending") {
      if (!cancellation.sourceReady) layout.paragraph("Referências de consumo indisponíveis neste exemplar. Isso não declara consumo zero.", "cancellationRequest/availability");
      else if (cancellation.sourceAccess === false) layout.paragraph("Referências de consumo: Acesso restrito.", "cancellationRequest/availability");
      else layout.table([{ label: "Material", fraction: 0.4 }, { label: "Aceito", fraction: 0.2 }, { label: "Consumo disponível", fraction: 0.2 }, { label: "Em trânsito", fraction: 0.2 }], cancellation.lines.map((line, index) => ({ cells: [{ text: line.name }, { text: amount(line.acceptedQuantity, line.unit), key: "cancellationAvailable/" + index + "/accepted" }, { text: amount(line.availableConsumedQuantity, line.unit), key: "cancellationAvailable/" + index + "/consumed" }, { text: amount(line.unresolvedTransit, line.unit), key: "cancellationAvailable/" + index + "/transit" }] })));
    }
    if (cancellation.request.status === "consented") {
      layout.table([{ label: "Material", fraction: 0.4 }, { label: "Aceito", fraction: 0.2 }, { label: "Devolvido", fraction: 0.2 }, { label: "Consumo referenciado", fraction: 0.2 }], cancellation.lines.map((line, index) => ({ cells: [{ text: line.name }, { text: amount(line.acceptedQuantity, line.unit), key: "cancellationLine/" + index + "/accepted" }, { text: amount(line.returnQuantity, line.unit), key: "cancellationLine/" + index + "/returned" }, { text: amount(line.consumedQuantity, line.unit), key: "cancellationLine/" + index + "/consumed" }] })));
      for (const [index, line] of cancellation.lines.entries()) for (const [refIndex, reference] of line.consumptionReferences.entries()) layout.paragraph(line.name + " · " + amount(reference.quantity, line.unit) + " de consumo confirmado em " + formatBrazilDate(reference.recordedAt), "cancellationConsumption/" + index + "/" + refIndex, { size: 9.5 });
    }
  }
  for (const [index, item] of (snapshot.deliveryRegularization?.cases ?? []).entries()) {
    const prefix = "regularization/" + index;
    layout.heading("Regularização administrativa · " + (index + 1)); layout.paragraph(regularizationStates[item.state], prefix + "/state", { strong: true });
    layout.paragraph("Proposta de " + item.proposal.proposedName + " · " + formatBrazilDate(item.proposed_at), prefix + "/proposer", { size: 9.5 });
    layout.paragraph("Conferente independente: " + item.proposal.reviewerName, prefix + "/reviewer", { size: 9.5 }); layout.paragraph(item.proposal.reason, prefix + "/reason"); layout.paragraph(item.proposal.basis, prefix + "/basis");
    layout.paragraph("Situação anterior: " + (documentStatuses[item.before_snapshot.status] ?? "Situação não preservada"), prefix + "/before", { size: 9.5 });
    layout.paragraph(item.before_snapshot.acceptedBy ? "Recebimento pessoal original preservado: " + (item.before_snapshot.receiptName ?? "Nome não preservado") + " · " + formatBrazilDate(item.before_snapshot.acceptedAt) : "Sem recebimento pessoal declarado no registro original.", prefix + "/originalReceipt", { size: 9.5 });
    layout.paragraph(item.state === "approved" ? "Os efeitos administrativos não alteram a autoria nem as quantidades do aceite pessoal original." : "Quantidades propostas não representam movimentação confirmada.", prefix + "/scope", { size: 9.5 });
    const lines = item.decision?.lines.length ? item.decision.lines : item.proposal.lines;
    for (const [lineIndex, line] of lines.entries()) {
      const key = prefix + "/line/" + lineIndex, settled = item.state === "approved" ? quantity(line.receivedQuantity).plus(line.returnedQuantity).plus(line.missingQuantity) : quantity(0);
      layout.heading(line.name + " · " + line.unit);
      layout.paragraph("Expedido: " + amount(line.expeditedQuantity, line.unit) + " · Aceite pessoal preservado: " + amount(line.acceptedQuantity, line.unit), key + "/original");
      layout.paragraph("Conciliação anterior: " + amount(line.priorReconciledQuantity, line.unit) + " · Trânsito anterior: " + amount(line.pendingQuantity, line.unit), key + "/before", { size: 9.5 });
      layout.table([{ label: "Recebimento apurado", fraction: 0.25 }, { label: "Devolução apurada", fraction: 0.25 }, { label: "Falta apurada", fraction: 0.25 }, { label: "Desconhecido", fraction: 0.25 }], [{ cells: [{ text: amount(line.receivedQuantity, line.unit), key: key + "/received" }, { text: amount(line.returnedQuantity, line.unit), key: key + "/returned" }, { text: amount(line.missingQuantity, line.unit), key: key + "/missing" }, { text: amount(line.unknownQuantity, line.unit), key: key + "/unknown" }] }]);
      layout.paragraph("Conciliação após o procedimento: " + amount(quantity(line.priorReconciledQuantity).plus(settled).toFixed(), line.unit) + " · Trânsito restante: " + amount(quantity(line.pendingQuantity).minus(settled).toFixed(), line.unit), key + "/after", { size: 9.5 });
    }
    if (item.decision) { layout.paragraph("Decisão própria de " + item.decision.actorName + " · " + formatBrazilDate(item.decision.recordedAt), prefix + "/decision", { strong: true }); layout.paragraph(item.decision.reason, prefix + "/decisionReason"); }
    layout.paragraph(item.state === "approved" && item.decision?.lines.some(line => line.movementIds?.length) ? "Movimentações administrativas registradas por " + item.decision.actorName + " · " + formatBrazilDate(item.decision.recordedAt) : "Sem movimentação de estoque identificada neste procedimento.", prefix + "/execution", { size: 9.5 });
    if (quantity(item.proposal.unknownQuantity).gt(0)) layout.paragraph("Situação física desconhecida permanece em trânsito. Responsável pela apuração: " + (item.proposal.followUpOwnerName ?? "Nome não preservado") + ". Apuração não equivale a aceite pessoal por outra pessoa.", prefix + "/followup", { size: 9.5 });
    for (const [findingIndex, finding] of item.findings.entries()) { layout.paragraph("Apuração de " + finding.actor_name + " · " + formatBrazilDate(finding.recorded_at), prefix + "/findingActor/" + findingIndex, { size: 9.5 }); layout.paragraph(finding.body, prefix + "/finding/" + findingIndex); }
  }
  appendOriginalObservations(layout, snapshot); appendDocumentCancellation(layout, lifecycle, "Cancelamento da ficha");
  const verificationUrl = new URL("/verificar/emissao/" + emission.verificationCode, origin).href;
  await appendVerificationAndPrivacy(layout, emission, returned ? "Esta ficha de devolução" : "Esta ficha de entrega", issuer, at, verificationUrl, emission.verificationCode.match(/.{1,4}/g)?.join("-") ?? emission.verificationCode);
  layout.finish(); return { bytes: Buffer.from(await layout.pdf.save({ useObjectStreams: false })), identity };
}
