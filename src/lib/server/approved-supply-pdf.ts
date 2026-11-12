import { approvedPdfMode, appendApprovedPdfExpansion } from "./approved-pdf-expansion";
import { documentVariant } from "@/lib/documents/variant";
import { originalAuthorDetail, documentCutLabel } from "@/lib/documents/pdf-presentation";
import { PDFHexString, PDFName } from "pdf-lib";
import { ApprovedPdfLayout, type DocumentHeader, type DocumentRow, type DocumentTone } from "./approved-pdf-layout";
import { appendDocumentOriginContext, appendDocumentRelated, appendOriginalObservations, appendDocumentCancellation, appendVerificationAndPrivacy } from "./approved-document-sections";
import type { DocumentSnapshot, PdfEmissionContext } from "./operational-pdf";
import { documentStatuses } from "@/types/documents";
import { pdfSourceFactsSchema } from "@/lib/documents/pdf-source-facts";
import { requirePdfLifecycleFacts } from "@/lib/documents/pdf-lifecycle";
import { purchaseEntryBalances } from "@/lib/validation/purchase-entry-balances";
import { balanceApplicationFacts } from "@/lib/validation/balance-application";
import { balanceCorrectionFacts } from "@/lib/validation/balance-corrections";
import { CATEGORY_LABELS } from "@/lib/catalog";
import { formatBrazilDate } from "@/lib/receipt";
import { formatQuantity, quantity } from "@/lib/quantity";

const name = (line: Record<string, unknown>) => String(line.name_snapshot ?? line.product_name_snapshot ?? line.custom_name ?? "Material não identificado");
const unit = (line: Record<string, unknown>) => String(line.unit_snapshot ?? "Unidade não preservada");
const amount = (value: unknown, measure?: string) => typeof value === "number" || typeof value === "string" ? formatQuantity(value, measure) : "Não disponível no registro";
const category = (line: Record<string, unknown>) => {
  const key = String(line.category_snapshot ?? "");
  return Object.hasOwn(CATEGORY_LABELS, key) ? CATEGORY_LABELS[key as keyof typeof CATEGORY_LABELS] : key || "Materiais sem categoria preservada";
};
function grouped(rows: DocumentRow[]) {
  const groups = new Map<string | undefined, DocumentRow[]>();
  rows.forEach(row => { const group = groups.get(row.category) ?? []; group.push(row); groups.set(row.category, group); });
  return [...groups.values()].flat();
}

/** COM and BAL use the same approved composition and the existing frozen business facts. */
export async function renderApprovedSupplyPdf(snapshot: DocumentSnapshot, emission: PdfEmissionContext) {
  if (snapshot.type !== "COM" && snapshot.type !== "BAL") throw new Error("Approved supply model unavailable");
  const source = pdfSourceFactsSchema.parse(snapshot.sourceFacts), lifecycle = requirePdfLifecycleFacts(snapshot.lifecycleFacts, snapshot);
  const origin = new URL(emission.verificationOrigin);
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') throw new Error("Verification origin required");
  const issuer = source.issuerName ?? "Autoria nominal desconhecida", patient = source.patientName ?? "Nome do paciente não preservado";
  const at = source.historical ? source.sourceCreatedAt : source.issuedAt;
  const cancelled = snapshot.status === "cancelled", purchase = snapshot.type === "COM", donation = snapshot.payload.origin === "donation";
  const entries = purchase ? purchaseEntryBalances.parse(snapshot.purchaseEntryBalances) : null;
  const application = purchase ? null : balanceApplicationFacts.parse(snapshot.balanceApplication);
  const corrections = purchase ? null : balanceCorrectionFacts.parse(snapshot.balanceReviewCorrections);
  const receipts = [...(snapshot.purchaseReceipts ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const validated = receipts.filter(receipt => receipt.state === "approved");
  const last = [...validated].sort((a, b) => (b.validated_at ?? "").localeCompare(a.validated_at ?? ""))[0];
  const done = purchase ? !snapshot.purchaseProgress?.expectationPending && !snapshot.purchaseProgress?.validationPending && !snapshot.purchaseProgress?.physicalPending && snapshot.purchaseProgress !== undefined : application?.state === "applied";
  const tone: DocumentTone = cancelled || snapshot.status === "rejected" ? "bad" : done ? "good" : "warn";
  const status = cancelled ? "Cancelada" : purchase ? documentStatuses[snapshot.purchaseProgress?.state ?? snapshot.status] ?? "Situação não preservada" : done ? "Contagem aplicada" : snapshot.status === "archived" ? "Arquivada" : documentStatuses[snapshot.status] ?? "Situação não preservada";
  const title = purchase ? donation ? "Doação de materiais" : "Compra de materiais" : Number(snapshot.workflow?.countVersion ?? 1) > 1 ? "Reconto do estoque da equipe" : "Balanço do estoque da equipe";
  const header: DocumentHeader = {
    ...approvedPdfMode(snapshot, emission), title, code: snapshot.code, status, tone, asOf: documentCutLabel(snapshot), requestedAt: formatBrazilDate(emission.requestedAt), exporter: emission.requestedName, verificationCode: emission.verificationCode,
    privateUrl: new URL("/documentos/" + snapshot.id, origin).href,
    metric: purchase ? snapshot.lines.filter(line => quantity(String(line.accepted_quantity ?? 0)).gt(0)).length + " / " + snapshot.lines.length : String(snapshot.lines.length),
    metricLabel: purchase ? "materiais com entrada validada" : "materiais contados",
    seal: purchase ? last ? { title: validated.length > 1 ? "Entradas validadas" : "Entrada validada", actor: last.validated_name ?? "Nome não preservado", at: formatBrazilDate(last.validated_at ?? null), how: validated.length > 1 ? "Última validação; parcelas detalhadas abaixo." : "Validação da chegada registrada", tone: "good", confirmed: true }
      : { title: "Entrada pendente", actor: "Sem chegada validada", at: "", how: "Aquisição não comprova entrada em estoque.", tone: "warn", confirmed: false } : undefined,
  };
  const layout = await ApprovedPdfLayout.create(header, emission.onText), identity = { verificationCode: emission.verificationCode, requestedAt: emission.requestedAt };
  layout.pdf.catalog.set(PDFName.of("HCAIssuance"), PDFHexString.fromText(JSON.stringify(identity)));
  layout.pdf.setCreationDate(new Date(emission.requestedAt)); layout.pdf.setModificationDate(new Date(emission.requestedAt));
  layout.firstHeader();
  const authorDetail = originalAuthorDetail(snapshot);
  const context = snapshot.payload.balanceContext as { startsAt?: string; endsAt?: string; countedAt?: string; professionalName?: string; shiftType?: string; timezone?: string } | undefined;
  const countAt = snapshot.balanceReviews?.counter.recordedAt ?? context?.countedAt ?? at;
  layout.fields([
    { label: "Paciente", value: patient, key: "identity/patient" },
    { label: "Registrado por", value: issuer, detail: authorDetail, detailKey: "identity/issuerRole", key: "identity/issuer" },
    { label: purchase ? "Data do registro" : "Contagem realizada", value: formatBrazilDate(purchase ? at : countAt), key: "identity/recordedAt" },
    ...(!purchase && context ? [{ label: "Balanço previsto para", value: formatBrazilDate(context.startsAt ?? null) + " até " + formatBrazilDate(context.endsAt ?? null), detail: context.timezone ?? "America/Sao_Paulo", key: "identity/schedule" }] : []),
  ]);
  appendDocumentOriginContext(layout, snapshot);
  appendDocumentRelated(layout, snapshot, lifecycle, origin);
  if (purchase) {
    const acquired = snapshot.lines.some(line => quantity(String(line.purchased_quantity ?? 0)).gt(0));
    layout.milestones([
      { label: "Emissão", symbol: "document", detail: formatBrazilDate(at), done: Boolean(at), tone: "blue" },
      { label: donation ? "Doação registrada" : "Aquisição", symbol: "box", detail: acquired ? "Quantidade registrada" : "Em acompanhamento", done: acquired, current: !acquired && !cancelled, tone: acquired ? "blue" : "warn" },
      { label: "Chegadas e validação", symbol: "box", detail: validated.length + " parcela(s) validada(s)", done: done && validated.length > 0, current: acquired && !done && !cancelled, tone: done && validated.length ? "good" : "warn" },
      { label: cancelled ? "Cancelamento" : "Conclusão", symbol: cancelled ? "cross" : "check", detail: cancelled ? "Fatos anteriores preservados" : done ? "Expectativa encerrada" : "Em acompanhamento", done: done || cancelled, tone: cancelled ? "bad" : done ? "good" : undefined },
    ]);
    layout.heading("Relação de materiais", "Saldo do estoque familiar após a última entrada validada de cada material nesta ficha. Não é o saldo atual.");
    layout.table([{ label: "Nº", fraction: 0.045 }, { label: "Material / unidade", fraction: 0.355 }, { label: donation ? "Declarado" : "Adquirido", fraction: 0.17 }, { label: "Entrada validada", fraction: 0.18 }, { label: "Saldo após entrada", fraction: 0.25 }], grouped(snapshot.lines.map((line, index) => {
      const entry = entries!.find(value => value.lineId === line.id)!;
      const balance = entry.state === "known" ? amount(entry.quantity, unit(line)) : entry.state === "restricted" ? "Acesso restrito" : entry.state === "not_validated" ? "Sem entrada validada" : "Não disponível no registro";
      return { category: category(line), cells: [
        { text: String(index + 1).padStart(2, "0") }, { text: name(line) + "\n" + unit(line), key: "material/" + index + "/name", strong: true },
        { text: amount(line.purchased_quantity, unit(line)), key: "material/" + index + "/acquired" }, { text: amount(line.accepted_quantity, unit(line)), key: "material/" + index + "/validated" },
        { text: balance + (entry.entry ? "\n" + formatBrazilDate(entry.entry.validatedAt) : ""), key: "material/" + index + "/balance" },
      ] };
    })));
    layout.heading("Previsão e aquisição");
    layout.table([{ label: "Material", fraction: 0.4 }, { label: "Previsto", fraction: 0.2 }, { label: "Aprovado", fraction: 0.2 }, { label: donation ? "Declarado" : "Adquirido", fraction: 0.2 }], snapshot.lines.map((line, index) => ({ cells: [{ text: name(line) }, { text: amount(line.quantity, unit(line)), key: "purchase/" + index + "/planned" }, { text: amount(line.approved_quantity, unit(line)), key: "purchase/" + index + "/approved" }, { text: amount(line.purchased_quantity, unit(line)), key: "purchase/" + index + "/acquired" }] })));
    layout.heading("Chegadas e validação por parcela");
    if (!receipts.length) layout.paragraph("Nenhuma chegada registrada até o corte.", "receipts/empty");
    for (const [index, receipt] of receipts.entries()) {
      const prefix = "receipt/" + index;
      layout.heading("Parcela " + (index + 1) + " · " + ({ approved: "Recebimento validado", pending: "Aguardando conferência", rejected: "Recebimento rejeitado" }[receipt.state]));
      layout.paragraph("Chegada registrada por " + (receipt.submitted_name ?? "Nome não preservado") + " · " + formatBrazilDate(receipt.created_at), prefix + "/submitted", { size: 9.5 });
      layout.paragraph(receipt.state === "pending" ? "Ainda sem decisão de validação." : (receipt.state === "approved" ? "Validada por " : "Rejeitada por ") + (receipt.validated_name ?? "Nome não preservado") + " · " + formatBrazilDate(receipt.validated_at ?? null), prefix + "/decision", { size: 9.5 });
      if (receipt.reason) layout.paragraph(receipt.reason, prefix + "/reason");
      if (receipt.state === "rejected") layout.paragraph("Registro de chegada rejeitado; não comprova entrada de material.", prefix + "/scope", { size: 9.5 });
      layout.table([{ label: "Material", fraction: 0.7 }, { label: "Quantidade da parcela", fraction: 0.3 }], receipt.lines.map((item, itemIndex) => { const line = snapshot.lines.find(value => value.id === item.lineId); if (!line) throw new Error("Receipt material missing"); return { cells: [{ text: name(line) }, { text: amount(item.quantity, unit(line)), key: prefix + "/quantity/" + itemIndex }] }; }));
    }
    const closure = snapshot.purchaseProgress?.closure;
    if (closure) { layout.heading("Aquisição restante encerrada"); layout.paragraph((closure.actorName ?? "Nome não preservado") + " · " + formatBrazilDate(closure.recordedAt), "purchase/closure/actor"); layout.paragraph(closure.reason, "purchase/closure/reason"); }
    layout.paragraph("Somente a parcela validada acrescenta materiais ao estoque familiar. Aquisição e encerramento da expectativa não movimentam estoque. A entrega à equipe é um ato separado.", "purchase/scope", { size: 9.5 });
  } else {
    const reviews = snapshot.balanceReviews?.reviews ?? [];
    const policy = snapshot.workflow?.reviewPolicy as { balReview?: string; balApprovers?: string[]; balRequirement?: string } | undefined;
    const reviewRequired = policy?.balReview === "required";
    const eligible = reviews.filter(review => review.count_version === snapshot.balanceReviews?.countVersion && review.reference_state === "current" && review.reviewer_id !== snapshot.balanceReviews?.counter.id && policy?.balApprovers?.includes(review.review_group));
    const reviewSatisfied = policy?.balRequirement === "all" ? Boolean(policy.balApprovers?.length && policy.balApprovers.every(group => eligible.some(review => review.review_group === group))) : eligible.length > 0;
    layout.milestones([
      { label: "Contagem registrada", symbol: "document", detail: formatBrazilDate(countAt), done: Boolean(countAt), tone: "blue" },
      ...(reviews.length || reviewRequired ? [{ label: "Revisão", symbol: "people" as const, detail: reviews.length ? "Pareceres abaixo" : "Aguardando parecer", done: reviewSatisfied, current: !reviewSatisfied && !cancelled, tone: reviewSatisfied ? "blue" as const : "warn" as const }] : []),
      { label: cancelled ? "Cancelamento" : "Conclusão", symbol: cancelled ? "cross" : "check", detail: cancelled ? "Contagem preservada" : application?.state === "applied" ? "Contagem aplicada" : "Não aplicado ao estoque", done: application?.state === "applied" || cancelled, tone: cancelled ? "bad" : application?.state === "applied" ? "good" : undefined },
    ]);
    layout.heading("Relação de materiais", "Saldo do estoque da equipe imediatamente após aplicar esta contagem; não é o saldo atual. O parecer não altera o estoque.");
    layout.paragraph(Number(snapshot.workflow?.countVersion) > 1 ? "Reconto registrado em ato próprio, mantendo a contagem anterior." : documentVariant("BAL", snapshot.payload, snapshot.workflow).includes("contexto de plantão não preservado") ? "Contexto de plantão não preservado neste registro." : "Primeira contagem desta ficha, sem afirmar primeira contagem da residência.", "balance/countNature", { size: 9.5 });
    layout.table([{ label: "Nº", fraction: 0.045 }, { label: "Material / unidade", fraction: 0.355 }, { label: "Referência", fraction: 0.18 }, { label: "Contado", fraction: 0.17 }, { label: "Saldo após balanço", fraction: 0.25 }], grouped(snapshot.lines.map((line, index) => {
      const applied = application?.state === "applied" ? application.lines.find(item => item.lineId === line.id) : null;
      const after = application?.state === "not_applied" ? "Não aplicado" : application?.state === "unavailable" ? "Não disponível no registro" : applied?.state === "restricted" ? "Acesso restrito" : applied?.state === "known" ? amount(applied.quantity, unit(line)) : "Não disponível no registro";
      const reference = (line.metadata as { expectedQuantity?: unknown } | undefined)?.expectedQuantity;
      return { category: category(line), cells: [{ text: String(index + 1).padStart(2, "0") }, { text: name(line) + "\n" + unit(line), key: "material/" + index + "/name", strong: true }, { text: amount(reference, unit(line)), key: "material/" + index + "/reference" }, { text: amount(line.quantity, unit(line)), key: "material/" + index + "/counted" }, { text: after + (application?.state === "applied" ? "\n" + formatBrazilDate(application.appliedAt) : ""), key: "material/" + index + "/balance" }] };
    })));
    if (snapshot.balanceReviews?.counter) layout.paragraph("Contagem registrada por " + (snapshot.balanceReviews.counter.name ?? "Nome não preservado") + " · " + formatBrazilDate(countAt), "balance/counter", { size: 9.5 });
    if (snapshot.balanceReviews?.notes && snapshot.balanceReviews.notes !== snapshot.payload.notes) {
      layout.heading("Observações desta contagem");
      layout.observation(snapshot.balanceReviews.notes, 1, "balance/countNotes");
    }
    if (application?.state === "applied") layout.paragraph("Aplicada por " + application.actorName + " · " + formatBrazilDate(application.appliedAt), "balance/application", { size: 9.5 });
    layout.heading("Revisão da contagem");
    if (!reviews.length) layout.paragraph(reviewRequired ? "Revisão exigida, ainda não registrada." : "Revisão facultativa não realizada. A conclusão segue a política preservada na ficha.", "balance/reviewState");
    for (const [index, review] of reviews.entries()) {
      const prefix = "review/" + index;
      layout.heading("Parecer " + (index + 1) + " · " + (review.review_group === "family" ? "Família" : "Supervisão"));
      layout.paragraph(review.reviewer_name + " · " + formatBrazilDate(review.recorded_at), prefix + "/actor", { size: 9.5 });
      layout.paragraph(review.count_version !== snapshot.balanceReviews?.countVersion ? "Registro de contagem anterior; não é parecer vigente da contagem atual." : eligible.includes(review) ? "Parecer da contagem atual. Não aplica nem corrige estoque." : "Parecer preservado; elegibilidade para a contagem atual não comprovada por este contexto.", prefix + "/scope", { size: 9.5 });
      layout.paragraph(review.comment || "Sem comentário adicional.", prefix + "/comment");
      for (const [itemIndex, item] of (review.item_results ?? []).entries()) {
        const line = review.reviewed_snapshot.lines.find(value => value.id === item.lineId);
        layout.paragraph((line?.name_snapshot ?? "Material não identificado") + " · " + (item.result === "confirmed" ? "Confirmado" : "Diferença apontada") + " · " + ({ none: "Sem encaminhamento", recount: "Reconto indicado", adjustment: "Ajuste autorizado indicado" }[item.forwarding]), prefix + "/item/" + itemIndex, { strong: true });
        if (item.comment) layout.paragraph(item.comment, prefix + "/itemComment/" + itemIndex, { size: 9.5 });
      }
    }
    for (const [index, approval] of (snapshot.balanceReviews?.legacyApprovals ?? []).entries()) {
      layout.heading("Aprovação anterior preservada");
      layout.paragraph((approval.actorName ?? "Nome não preservado") + " · " + formatBrazilDate(approval.created_at), "balance/legacy/" + index);
      layout.paragraph(approval.count_version === snapshot.balanceReviews?.countVersion ? "Aprovação preservada desta contagem; não substitui o parecer por material nem presume aplicação ao estoque." : "Aprovação de contagem anterior; não é aprovação vigente da contagem atual.", "balance/legacyScope/" + index, { size: 9.5 });
    }
    for (const [index, correction] of (corrections ?? []).entries()) {
      if (!correction.acts.length) continue;
      layout.heading("Atos posteriores vinculados ao material");
      for (const [actIndex, act] of correction.acts.entries()) {
        const prefix = "correction/" + index + "/" + actIndex;
        layout.paragraph("Reconto · " + act.line.name + " · " + amount(act.line.quantity, act.line.unit), prefix + "/count", { strong: true });
        layout.paragraph((act.actorName ?? "Nome não preservado") + " · " + formatBrazilDate(act.recordedAt), prefix + "/actor", { size: 9.5 });
        layout.paragraph(act.application.state === "not_applied" ? "Reconto não aplicado ao estoque." : act.application.state === "unavailable" ? "Resultado da aplicação não disponível no registro." : "Aplicado por " + act.application.actorName + " · " + formatBrazilDate(act.application.appliedAt), prefix + "/application", { size: 9.5 });
        if (act.application.state === "applied") layout.paragraph("Saldo após este reconto: " + (act.application.lines[0].state === "restricted" ? "Acesso restrito" : amount(act.application.lines[0].quantity, act.line.unit)), prefix + "/balance");
      }
    }
  }
  appendOriginalObservations(layout, snapshot);
  appendDocumentCancellation(layout, lifecycle, "Cancelamento da ficha");
  const verificationUrl = new URL("/verificar/emissao/" + emission.verificationCode, origin).href;
  appendApprovedPdfExpansion(layout, snapshot, emission);
  await appendVerificationAndPrivacy(layout, emission, purchase ? "Esta ficha de aquisição" : "Esta ficha de balanço", issuer, at, verificationUrl, emission.verificationCode.match(/.{1,4}/g)?.join("-") ?? emission.verificationCode);
  layout.finish();
  return { bytes: Buffer.from(await layout.pdf.save({ useObjectStreams: false })), identity };
}
