import { PDF } from "@libpdf/core";
import { PDFDocument, PDFHexString, PDFName, PDFString } from "pdf-lib";
import { ApiError } from "./api";
import {
  renderDocumentPdf,
  PdfTextUnsupportedError,
  type DocumentSnapshot,
  type PdfEmissionContext,
} from "./operational-pdf";
import { materialTransferDirection } from "@/lib/documents/transfer-follow-up";
import {
  pdfSourceFactsSchema,
} from "../documents/pdf-source-facts";
import { pdfFidelitySchema } from "../documents/pdf-fidelity";
import { validatePdfStructure } from "./pdf-structure-validation";
import { balanceApplicationFacts } from "@/lib/validation/balance-application";
import { balanceCorrectionFacts } from "@/lib/validation/balance-corrections";
import { requirePurchaseEntryBalances } from "@/lib/validation/purchase-entry-balances";

import { requirePdfLifecycleFacts } from "@/lib/documents/pdf-lifecycle";
import { approvedRequisitionContent } from "./approved-requisition-content";
import { approvedSupplyContent } from "./approved-supply-content";
import { approvedPdfExpansionContent } from "./approved-pdf-expansion-content";
import { approvedDeliveryContent } from "./approved-delivery-content";

type Run = Parameters<NonNullable<PdfEmissionContext["onText"]>>[0];
export type PdfContentPlan = {
  bytes: Buffer;
  runs: Run[];
  identity: Record<string, unknown>;
  facts: string[];
  semanticFacts?: Record<string, string>;
  rendererRevision?: number;
  auditWatermark?: string;
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
  const revision = emission.rendererRevision ?? 16;
  if (![16, 17].includes(revision)) throw invalid("retired-renderer");
  const parsed = pdfSourceFactsSchema.safeParse(snapshot.sourceFacts);
  if (!parsed.success) throw invalid("source-facts-schema");
  const sourceFacts = parsed.data;
  const fidelity = pdfFidelitySchema.safeParse(snapshot.documentFacts);
  if (!fidelity.success) throw invalid("fidelity-facts-schema");
  const application = snapshot.type === "BAL" ? balanceApplicationFacts.safeParse(snapshot.balanceApplication) : null;
  if (application && !application.success) throw invalid("balance-application-schema");
  if (application?.success && application.data.state === "applied") {
    const expected = snapshot.lines.map(line => String(line.id));
    const actual = application.data.lines.map(line => line.lineId);
    if (application.data.documentVersion > snapshot.version || application.data.countVersion !== snapshot.workflow?.countVersion
      || expected.length !== actual.length || new Set(actual).size !== actual.length || expected.some(id => !actual.includes(id)))
      throw invalid("balance-application-source");
  }
  const corrections = snapshot.type === "BAL" ? balanceCorrectionFacts.safeParse(snapshot.balanceReviewCorrections) : null;
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
  if (snapshot.type === "ENT" && snapshot.transfer
    && (snapshot.payload.source !== snapshot.transfer.declaration.source
      || snapshot.payload.destination !== snapshot.transfer.declaration.destination
      || !materialTransferDirection(snapshot.transfer.declaration.source, snapshot.transfer.declaration.destination)))
    throw invalid("transfer-direction-source");
  if (snapshot.type === "COM") {
    try {
      requirePurchaseEntryBalances(snapshot.purchaseEntryBalances, {
        version: snapshot.version, lines: snapshot.lines, receipts: snapshot.purchaseReceipts ?? [],
        events: fidelity.data.purchaseReceiptEvents.map(event => ({ ...event, id: event.eventId })),
      });
    } catch { throw invalid("purchase-entry-balances-source"); }
  }
  try { requirePdfLifecycleFacts(snapshot.lifecycleFacts, snapshot); }
  catch { throw invalid("lifecycle-source-or-cutoff"); }
  let bytes: Buffer;
  try {
    bytes = await renderDocumentPdf(snapshot, sourceHash, {
      ...emission,
      sourceFacts,
      fidelityFacts: fidelity.data,
      onText: (run) => runs.push(run),
    });
  } catch (error) {
    throw invalid(
      error instanceof PdfTextUnsupportedError ? "unrepresentable" : "render",
    );
  }

  const identity = { verificationCode: emission.verificationCode, requestedAt: emission.requestedAt };
  const obligations = snapshot.type === "REQ" ? approvedRequisitionContent(snapshot, emission) : snapshot.type === "ENT" ? approvedDeliveryContent(snapshot, emission) : approvedSupplyContent(snapshot, emission);
  const expansion = revision === 17 ? approvedPdfExpansionContent(snapshot, emission) : undefined;
  const plan = { bytes, runs, identity, rendererRevision: revision, ...obligations, semanticFacts: { ...obligations.semanticFacts, ...expansion?.semanticFacts }, auditWatermark: expansion?.auditWatermark };
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
    if (plan.auditWatermark) for (const page of pages) {
      // The mark is vertical in a reserved margin. Reconstruct actual glyph
      // painting order; reading-order heuristics interleave it with body lines.
      const text = page.lines.flatMap(line => line.spans.flatMap(span => span.chars))
        .filter(char => char.bbox.x >= 7 && char.bbox.x + char.bbox.width <= 32.1 && Math.abs(char.fontSize - 6.3) < 0.01 && Number.isInteger(char.sequenceIndex))
        .sort((a, b) => a.sequenceIndex! - b.sequenceIndex!).map(char => char.char).join("");
      if (normalize(text) !== normalize(plan.auditWatermark)) throw invalid("audit-watermark");
    }
    const parsed = await PDFDocument.load(bytes, { updateMetadata: false });
    const revision = plan.rendererRevision ?? Number(plan.identity.rendererRevision);
    if (revision >= 10) validatePdfStructure(parsed);
    if (revision >= 7 && parsed.catalog.lookupMaybe(PDFName.of("Lang"), PDFString)?.decodeText() !== "pt-BR")
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
