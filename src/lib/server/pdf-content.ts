import { PDF } from "@libpdf/core";
import { PDFDocument, PDFHexString, PDFName, PDFString } from "pdf-lib";
import { ApiError } from "./api";
import {
  renderDocumentPdf,
  PdfTextUnsupportedError,
  type DocumentSnapshot,
  type PdfEmissionContext,
} from "./operational-pdf";
import { formatQuantity, quantity } from "../quantity";
import { documentStatuses } from "@/types/documents";
import { entReceiptState } from "@/lib/documents/ent-receipt-state";
import { materialTransferDirection } from "@/lib/documents/transfer-follow-up";
import { formatBrazilDate } from "../receipt";
import {
  pdfSourceFactsSchema,
  sourceNameLabels,
} from "../documents/pdf-source-facts";
import { pdfFidelitySchema } from "../documents/pdf-fidelity";
import { validatePdfStructure } from "./pdf-structure-validation";
import { formatStockObservation, formatStockObservationTime } from "../stock-observation";
import type { StockObservation, StockObservationTimeSource } from "@/types/requisition";
import { balanceApplicationFacts } from "@/lib/validation/balance-application";
import { balanceCorrectionFacts } from "@/lib/validation/balance-corrections";
import { requirePurchaseEntryBalances, type PurchaseEntryBalances } from "@/lib/validation/purchase-entry-balances";

type Run = Parameters<NonNullable<PdfEmissionContext["onText"]>>[0];
export type PdfContentPlan = {
  bytes: Buffer;
  runs: Run[];
  identity: Record<string, unknown>;
  facts: string[];
  semanticFacts?: Record<string, string>;
};
const normalize = (value: string) =>
  value.normalize("NFKC").replaceAll(/\s+/g, "");
const invalid = (reason = "parse") => {
  const error = new ApiError(
    "CONTENT_INVALID",
    reason === "unrepresentable"
      ? "Este conteúdo contém caracteres ainda não suportados no PDF. Consulte a ficha no sistema ou solicite uma revisão autorizada."
      : "O conteúdo do PDF não passou na conferência. A emissão foi preservada para recuperação.",
    503,
    false,
  );
  error.cause = new Error(reason);
  return error;
};
/** Only server-composed PDFs enter this parser; public uploads need a separate bounded isolation boundary. */
export async function composeIssuance(
  snapshot: DocumentSnapshot,
  sourceHash: string,
  emission: PdfEmissionContext,
): Promise<PdfContentPlan> {
  const runs: Run[] = [];
  const revision = emission.rendererRevision ?? 5;
  const parsed =
    revision >= 6
      ? pdfSourceFactsSchema.safeParse(snapshot.sourceFacts)
      : null;
  if (parsed && !parsed.success) throw invalid("source-facts-schema");
  const sourceFacts = parsed?.success ? parsed.data : undefined;
  const fidelity = revision >= 7 ? pdfFidelitySchema.safeParse(snapshot.documentFacts) : null;
  if (fidelity && !fidelity.success) throw invalid("fidelity-facts-schema");
  const application = revision >= 11 && snapshot.type === "BAL" ? balanceApplicationFacts.safeParse(snapshot.balanceApplication) : null;
  if (application && !application.success) throw invalid("balance-application-schema");
  if (application?.success && application.data.state === "applied") {
    const expected = snapshot.lines.map(line => String(line.id));
    const actual = application.data.lines.map(line => line.lineId);
    if (application.data.documentVersion > snapshot.version || application.data.countVersion !== snapshot.workflow?.countVersion
      || expected.length !== actual.length || new Set(actual).size !== actual.length || expected.some(id => !actual.includes(id)))
      throw invalid("balance-application-source");
  }
  const corrections = revision >= 12 && snapshot.type === "BAL" ? balanceCorrectionFacts.safeParse(snapshot.balanceReviewCorrections) : null;
  if (corrections && !corrections.success) throw invalid("balance-corrections-schema");
  if (corrections?.success) {
    const required = (snapshot.balanceReviews?.reviews ?? []).flatMap(review => (review.item_results ?? []).filter(item => item.result === "difference").map(item => review.id + ":" + item.lineId));
    if (required.length !== corrections.data.length || corrections.data.some(entry => !required.includes(entry.reviewId + ":" + entry.sourceLineId))) throw invalid("balance-corrections-scope");
    for (const entry of corrections.data) {
      const review = snapshot.balanceReviews!.reviews.find(row => row.id === entry.reviewId)!;
      if (entry.acts.some(act => act.documentId !== snapshot.id || act.version > snapshot.version || act.version <= review.reviewed_document_version
        || act.countVersion <= review.count_version || (act.application.state === "applied" && act.application.documentVersion > snapshot.version))) throw invalid("balance-corrections-cutoff");
    }
  }
  let entries: PurchaseEntryBalances | undefined;
  if (revision >= 14 && snapshot.type === "ENT" && snapshot.transfer
    && (snapshot.payload.source !== snapshot.transfer.declaration.source
      || snapshot.payload.destination !== snapshot.transfer.declaration.destination
      || !materialTransferDirection(snapshot.transfer.declaration.source, snapshot.transfer.declaration.destination)))
    throw invalid("transfer-direction-source");
  if (revision >= 13 && snapshot.type === "COM") {
    try {
      entries = requirePurchaseEntryBalances(snapshot.purchaseEntryBalances, {
        version: snapshot.version, lines: snapshot.lines, receipts: snapshot.purchaseReceipts ?? [],
        events: fidelity?.success ? fidelity.data.purchaseReceiptEvents.map(event => ({ ...event, id: event.eventId })) : [],
      });
    } catch { throw invalid("purchase-entry-balances-source"); }
  }
  let bytes: Buffer;
  try {
    bytes = await renderDocumentPdf(snapshot, sourceHash, {
      ...emission,
      sourceFacts,
      fidelityFacts: fidelity?.success ? fidelity.data : undefined,
      onText: (run) => runs.push(run),
    });
  } catch (error) {
    throw invalid(
      error instanceof PdfTextUnsupportedError ? "unrepresentable" : "render",
    );
  }
  const identity = {
    id: emission.id,
    verificationCode: emission.verificationCode,
    requestedAt: emission.requestedAt,
    documentId: snapshot.id,
    version: snapshot.version,
    sourceHash,
    rendererRevision: revision,
  };
  // These facts come from the frozen source, independently of the painter's run log.
  const facts = [
    snapshot.id,
    snapshot.code,
    snapshot.protocol,
    sourceHash,
    emission.id,
    emission.verificationCode.match(/.{4}/g)!.join("-"),
    emission.requestedName,
    String(
      sourceFacts
        ? (sourceFacts.patientName ?? "Nome do paciente não preservado")
        : (snapshot.actors?.patient?.name ??
            snapshot.payload.patientName ??
            "Registrado no documento"),
    ),
    String(
      sourceFacts
        ? (sourceFacts.issuerName ?? "Autoria nominal desconhecida")
        : (snapshot.actors?.issuer?.name ??
            snapshot.payload.requesterName ??
            "Registrado no documento"),
    ),
    ...snapshot.lines.flatMap((line) => [
      String(
        line.name_snapshot ??
          line.product_name_snapshot ??
          line.custom_name ??
          line.product_id ??
          "Material",
      ),
      ...(snapshot.type === "REQ"
        ? []
        : [formatQuantity(String(line.quantity ?? 0))]),
    ]),
  ];
  const semanticFacts: Record<string, string> = {};
  if (revision >= 14 && snapshot.type === "ENT") {
    const direction = materialTransferDirection(String(snapshot.payload.source ?? ""), String(snapshot.payload.destination ?? ""));
    semanticFacts["fidelity/transfer/nature"] = direction === "return" ? "Devolução de materiais" : direction === "delivery" ? "Entrega de materiais" : "Movimentação de materiais · percurso não preservado";
    semanticFacts["fidelity/transfer/route"] = direction === "return" ? "Equipe para Família" : direction === "delivery" ? "Família para Equipe" : "Percurso não preservado neste registro";
    if (snapshot.transfer) semanticFacts["fidelity/transfer/origin"] = snapshot.transfer.originDocumentId ? "ENT documental de origem: " + snapshot.transfer.originDocumentId : direction === "return" ? "Sem entrega de origem vinculada a esta devolução." : "Origem documental não informada.";
  }
  if (entries) for (const fact of entries) {
    const source = snapshot.lines.find(item => item.id === fact.lineId)!;
    const unit = String(source.unit_snapshot ?? "");
    const name = String(source.name_snapshot ?? source.product_name_snapshot ?? source.custom_name ?? source.product_id ?? "Material");
    const prefix = "purchase-entry/" + fact.lineId;
    semanticFacts[prefix + "/0"] = name + " · " + String(source.unit_snapshot ?? "Unidade não preservada");
    semanticFacts[prefix + "/1"] = formatQuantity(String(source.purchased_quantity ?? 0), unit);
    semanticFacts[prefix + "/2"] = formatQuantity(String(source.accepted_quantity ?? 0), unit);
    semanticFacts[prefix + "/3"] = fact.state === "known" ? formatQuantity(fact.quantity, unit) : fact.state === "restricted" ? "Acesso restrito" : fact.state === "not_validated" ? "Sem entrada validada" : "Não disponível no registro";
    if (fact.entry) {
      const entry = fact.entry;
      semanticFacts["fidelity/" + prefix + "/source"] = entry.receiptId + " · evento " + entry.eventId + " · versão " + entry.eventVersion + " · entrada de " + formatQuantity(entry.enteredQuantity, unit);
      semanticFacts["fidelity/" + prefix + "/submitted"] = (entry.submittedName ?? "Nome histórico não preservado") + " · " + formatBrazilDate(entry.submittedAt);
      semanticFacts["fidelity/" + prefix + "/validated"] = (entry.validatorName ?? "Nome histórico não preservado") + " · " + (entry.validatorId ?? "Identidade não preservada") + " · " + formatBrazilDate(entry.validatedAt);
    }
  }
  if (application?.success) {
    const a = application.data;
    semanticFacts["fidelity/balance/application-state"] = a.state === "not_applied" ? "Não aplicado" : a.state === "unavailable" ? "Não disponível no registro" : "Aplicação registrada";
    if (a.state === "applied") {
      semanticFacts["fidelity/balance/application-act"] = a.id + " · " + a.actorName + " · " + formatBrazilDate(a.appliedAt) + " · versão " + a.documentVersion;
      for (const line of a.lines) {
        const source = snapshot.lines.find(item => item.id === line.lineId)!;
        semanticFacts["fidelity/balance/after/" + line.lineId] = line.state === "restricted" ? "Acesso restrito" : formatQuantity(line.quantity, String(source.unit_snapshot ?? ""));
      }
    }
  }
  if (corrections?.success) for (const entry of corrections.data) {
    const prefix = "fidelity/correction/" + entry.reviewId + "/" + entry.sourceLineId;
    semanticFacts[prefix + "/scope"] = entry.sourceState === "unavailable" ? "Identidade histórica do material indisponível; nenhum vínculo presumido." : entry.acts.length ? "Atos posteriores da mesma ficha e material." : "Nenhum reconto posterior vinculado a este material nesta ficha.";
    for (const act of entry.acts) {
      const key = prefix + "/" + act.eventId;
      semanticFacts[key + "/count"] = "Reconto " + act.countVersion + " · versão " + act.version + " · " + act.line.name + " · " + formatQuantity(act.line.quantity, act.line.unit);
      semanticFacts[key + "/actor"] = (act.actorName ?? "Nome histórico não preservado") + " · " + formatBrazilDate(act.recordedAt);
      semanticFacts[key + "/application"] = act.application.state === "not_applied" ? "Reconto registrado; contagem não aplicada ao estoque." : act.application.state === "unavailable" ? "Saldo após a aplicação: Não disponível no registro." : "Aplicado por " + act.application.actorName + " · " + formatBrazilDate(act.application.appliedAt) + " · versão " + act.application.documentVersion;
      if (act.application.state === "applied") semanticFacts[key + "/after"] = act.application.lines[0].state === "restricted" ? "Acesso restrito" : formatQuantity(act.application.lines[0].quantity, act.line.unit);
    }
  }
  if (sourceFacts) {
    const f = sourceFacts;
    Object.assign(semanticFacts, {
      "source/issuer": f.issuerName ?? "Autoria nominal desconhecida",
      "source/issuerId": f.issuerId ?? "Identidade não preservada",
      "source/issuerSource": sourceNameLabels[f.issuerSource],
      "source/patient": f.patientName ?? "Nome do paciente não preservado",
      "source/patientSource": sourceNameLabels[f.patientSource],
    });
    const dates = f.historical
      ? {
          originalAt: f.sourceCreatedAt,
          importedAt: f.importedAt,
          registeredAt: f.registeredAt,
        }
      : {
          documentCreatedAt: f.documentCreatedAt,
          issuedAt: f.issuedAt,
          ...(f.draftCreatedAt ? { draftCreatedAt: f.draftCreatedAt } : {}),
        };
    for (const [key, value] of Object.entries(dates))
      semanticFacts["source/" + key] = formatBrazilDate(value);
  }
  if (fidelity?.success) {
    const f = fidelity.data;
    if (snapshot.type === "REQ") for (const [index, line] of snapshot.lines.entries()) {
      const key = `fidelity/requisition/${line.id ?? index}`;
      const timeSource = ["client_draft", "server_submission", "legacy_unknown"].includes(String(line.stock_observation_time_source)) ? line.stock_observation_time_source as StockObservationTimeSource : "legacy_unknown";
      const stock = typeof line.current_stock === "string" || typeof line.current_stock === "number" ? line.current_stock : null;
      semanticFacts[key + "/1"] = "Estoque da equipe: " + formatStockObservation(stock, line.stock_observation as StockObservation, typeof line.unit_snapshot === "string" ? line.unit_snapshot : undefined)
        + " " + formatStockObservationTime(typeof line.stock_observation_at === "string" ? line.stock_observation_at : null, timeSource);
      const status = typeof line.id === "string" ? snapshot.fulfillmentLines?.find(item => item.id === line.id) : undefined;
      semanticFacts[key + "/status"] = `Item ${String(index + 1).padStart(2, "0")} · ${sourceFacts?.historical ? "Atendimento não apurado na origem histórica" : status ? status.attended ? "Atendimento com aceite positivo registrado" : "Sem aceite positivo registrado" : "Situação de atendimento não preservada nesta versão"}`;
    }
    for (const line of snapshot.type === "ENT" ? snapshot.lines : []) {
      const receipt = (line.metadata as { receipt?: Record<string, unknown> } | undefined)?.receipt;
      if (!receipt || !Object.keys(receipt).length) continue;
      semanticFacts[`fidelity/delivery/${line.id}/notes`] = typeof receipt.notes === "string" && receipt.notes ? receipt.notes : "Nota não preservada";
      semanticFacts[`fidelity/delivery/${line.id}/accepted`] = receipt.acceptedQuantity == null ? "Quantidade não preservada" : formatQuantity(String(receipt.acceptedQuantity), String(line.unit_snapshot ?? ""));
    }
    for (const event of f.deliveryResolutions) {
      const prefix = `fidelity/resolution/${event.eventId}`;
      semanticFacts[prefix + "/event"] = event.eventId;
      semanticFacts[prefix + "/actor"] = `${event.actorName ?? "Nome histórico não preservado"} · ${event.actorId ?? "Identidade não preservada"} · ${formatBrazilDate(event.recordedAt)}`;
      semanticFacts[prefix + "/reason"] = event.reason || "Motivo não preservado";
      const line = snapshot.lines.find(line => line.id === event.lineId);
      semanticFacts[prefix + "/quantity"] = event.quantity === null ? "Quantidade não preservada" : formatQuantity(event.quantity, line ? String(line.unit_snapshot ?? "") : undefined);
      semanticFacts[prefix + "/outcome"] = event.resolution === "received" ? "Recebimento complementar"
        : event.resolution === "returned" ? "Devolução à origem" : event.resolution === "missing" ? "Falta ou perda conciliada" : "Resolução não preservada";
    }
    for (const event of f.purchaseReceiptEvents) {
      semanticFacts[`fidelity/purchase/${event.eventId}/event`] = event.eventId;
      semanticFacts[`fidelity/purchase/${event.eventId}/actor`] = `${event.actorName ?? "Nome histórico não preservado"} · ${event.actorId ?? "Identidade não preservada"} · ${formatBrazilDate(event.recordedAt)}`;
    }
    const reviewPolicy = snapshot.workflow?.reviewPolicy as { balApprovers?: string[] } | undefined;
    for (const review of snapshot.balanceReviews?.reviews ?? [])
      semanticFacts[`fidelity/review/${review.id}/scope`] = review.count_version !== snapshot.balanceReviews?.countVersion
        ? "Registro de contagem anterior; não é parecer vigente da contagem atual."
        : snapshot.balanceReviews?.counter.id && review.reviewer_id !== snapshot.balanceReviews.counter.id && review.reference_state === "current" && Array.isArray(reviewPolicy?.balApprovers) && reviewPolicy.balApprovers.includes(review.review_group)
          ? "Parecer da contagem atual e grupo habilitado na política preservada."
          : "Parecer preservado; elegibilidade vigente não comprovada por este contexto.";
    for (const review of snapshot.balanceReviews?.legacyApprovals ?? [])
      semanticFacts[`fidelity/legacy-review/${review.actor_id}/${review.count_version}`] = `${review.actor_id} · ${review.actorName ?? "Nome não preservado"}`;
    for (const review of snapshot.balanceReviews?.reviews ?? []) if (review.reviewed_snapshot.opinionOnly)
      for (const item of review.item_results ?? []) {
        const source = review.reviewed_snapshot.lines.find(line => line.id === item.lineId);
        semanticFacts[`fidelity/review/${review.id}/item/${item.lineId}`] = `${source?.name_snapshot ?? "Material não identificado"} · ${item.result === "confirmed" ? "Confirmado" : "Diferença apontada"} · ${item.forwarding === "none" ? "Sem encaminhamento" : item.forwarding === "recount" ? "Reconto indicado" : "Ajuste autorizado indicado"} · ${item.comment || "Sem comentário adicional"}`;
      }
  }
  if (revision >= 9 && snapshot.type === "ENT") semanticFacts["fidelity/ent/receipt-state"] = entReceiptState(snapshot.status,Boolean(sourceFacts?.historical),typeof snapshot.workflow?.acceptedAt === "string" ? snapshot.workflow.acceptedAt : null,emission.representation).declaration;
  if (revision >= 8 && snapshot.type === "ENT") for (const item of snapshot.deliveryRegularization?.cases ?? []) {
    // Derived from the frozen business facts, independently of painter runs.
    const prefix = `fidelity/regularization/${item.id}`;
    const outcomes = { pending: "Proposta aguardando conferência independente", approved: "Encerramento administrativo aprovado", rejected: "Proposta rejeitada, sem movimentação", withdrawn: "Proposta retirada, sem movimentação", obsolete: "Proposta obsoleta encerrada, sem movimentação" };
    semanticFacts[prefix + "/before"] = `${documentStatuses[item.before_snapshot.status] ?? item.before_snapshot.status} · v${item.before_snapshot.version}`;
    semanticFacts[prefix + "/after"] = outcomes[item.state] + (item.decision ? ` · v${item.decision.version}` : " · sem decisão registrada");
    semanticFacts[prefix + "/proposer"] = `${item.proposal.proposedName} · ${item.proposed_by} · ${formatBrazilDate(item.proposed_at)}`;
    semanticFacts[prefix + "/reviewer"] = `${item.proposal.reviewerName} · ${item.reviewer_id}`;
    semanticFacts[prefix + "/receipt"] = item.before_snapshot.acceptedBy ?? "Sem aceite pessoal declarado";
    semanticFacts[prefix + "/decision"] = item.decision ? `${item.decision.actorName} · ${item.decision.actorId} · ${formatBrazilDate(item.decision.recordedAt)}` : "Sem decisão registrada";
    const hasEffects = item.state === "approved" && item.decision?.lines.some(line => line.movementIds?.length);
    semanticFacts[prefix + "/executor"] = hasEffects && item.decision ? `${item.decision.actorName} · ${item.decision.actorId} · ${formatBrazilDate(item.decision.recordedAt)}` : "Sem movimentação de estoque identificada neste procedimento";
    semanticFacts[prefix + "/reason"] = item.proposal.reason;
    semanticFacts[prefix + "/basis"] = item.proposal.basis;
    if (item.decision) semanticFacts[prefix + "/decisionReason"] = item.decision.reason;
    for (const line of item.decision?.lines.length ? item.decision.lines : item.proposal.lines) {
      const settled = item.state === "approved" ? quantity(line.receivedQuantity).plus(line.returnedQuantity).plus(line.missingQuantity) : quantity(0);
      semanticFacts[prefix + `/${line.lineId}/before`] = `${formatQuantity(line.priorReconciledQuantity, line.unit)} · ${formatQuantity(line.pendingQuantity, line.unit)}`;
      semanticFacts[prefix + `/${line.lineId}/after`] = `${formatQuantity(quantity(line.priorReconciledQuantity).plus(settled).toFixed(), line.unit)} · ${formatQuantity(quantity(line.pendingQuantity).minus(settled).toFixed(), line.unit)}`;
    }
  }
  const plan = { bytes, runs, identity, facts, semanticFacts };
  await validateIssuanceContent(bytes, plan);
  return plan;
}
/** Independent parser checks each painted run at its expected position, not merely page count or token membership. */
export async function validateIssuanceContent(
  bytes: Uint8Array,
  plan: PdfContentPlan,
) {
  try {
    if (bytes.byteLength > 10485760 || !plan.runs.length)
      throw invalid("size-or-plan");
    const pdf = await PDF.load(bytes),
      pages = pdf.extractText();
    if (
      !pages.length ||
      pages.length > 200 ||
      pages.length !== Math.max(...plan.runs.map((r) => r.page)) + 1
    )
      throw invalid("pages");
    const body: string[] = [];
    const groups = new Map<string, string>();
    for (const [index, run] of plan.runs.entries()) {
      if (!normalize(run.text)) continue;
      const page = pages[run.page];
      if (
        !page ||
        run.x < 0 ||
        run.baseline < 0 ||
        run.x + run.width > page.width ||
        run.baseline + run.size > page.height
      )
        throw invalid("geometry:" + index);
      const chars = page.lines
        .flatMap((l) => l.spans.flatMap((s) => s.chars))
        .filter(
          (c) =>
            Math.abs(c.baseline - run.baseline) < 0.7 &&
            c.bbox.x >= run.x - 0.5 &&
            c.bbox.x < run.x + run.width - 0.1,
        )
        .sort((a, b) => a.bbox.x - b.bbox.x);
      if (normalize(chars.map((c) => c.char).join("")) !== normalize(run.text))
        throw invalid("extraction:" + index);
      if (!run.decoration) {
        const text = chars.map((c) => c.char).join("");
        body.push(text);
        if (run.factGroup)
          groups.set(run.factGroup, (groups.get(run.factGroup) ?? "") + text);
      }
    }
    const bodyText = normalize(body.join(""));
    const groupText = [...groups.values()].map(normalize);
    for (const [group, fact] of Object.entries(plan.semanticFacts ?? {})) {
      if (
        !groups.has(group) ||
        !normalize(groups.get(group)!).includes(normalize(fact))
      )
        throw invalid("semantic-fact:" + group);
    }
    const missing = plan.facts.findIndex(
      (fact) =>
        !normalize(fact) ||
        (!bodyText.includes(normalize(fact)) &&
          !groupText.some((text) => text.includes(normalize(fact)))),
    );
    if (!plan.facts.length || missing !== -1)
      throw invalid("source-fact:" + missing);
    const parsed = await PDFDocument.load(bytes, { updateMetadata: false });
    if (Number(plan.identity.rendererRevision) >= 10) validatePdfStructure(parsed);
    if (Number(plan.identity.rendererRevision) >= 7 && parsed.catalog.lookupMaybe(PDFName.of("Lang"), PDFString)?.decodeText() !== "pt-BR")
      throw invalid("language");
    const identity = JSON.parse(
      parsed.catalog
        .lookup(PDFName.of("HCAIssuance"), PDFHexString)
        .decodeText(),
    );
    if (JSON.stringify(identity) !== JSON.stringify(plan.identity))
      throw invalid("identity");
    return {
      passed: true as const,
      pages: pages.length,
      paintedRuns: plan.runs.length,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw invalid();
  }
}
