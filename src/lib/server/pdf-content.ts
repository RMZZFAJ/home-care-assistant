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
import { formatBrazilDate } from "../receipt";
import {
  pdfSourceFactsSchema,
  sourceNameLabels,
} from "../documents/pdf-source-facts";
import { pdfFidelitySchema } from "../documents/pdf-fidelity";
import { validatePdfStructure } from "./pdf-structure-validation";
import { formatStockObservation, formatStockObservationTime } from "../stock-observation";
import type { StockObservation, StockObservationTimeSource } from "@/types/requisition";

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
