import { PDF } from "@libpdf/core";
import { PDFDocument, PDFHexString, PDFName } from "pdf-lib";
import { ApiError } from "./api";
import {
  renderDocumentPdf,
  PdfTextUnsupportedError,
  type DocumentSnapshot,
  type PdfEmissionContext,
} from "./operational-pdf";
import { formatQuantity } from "../quantity";
import { formatBrazilDate } from "../receipt";
import {
  pdfSourceFactsSchema,
  sourceNameLabels,
} from "../documents/pdf-source-facts";

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
    revision === 6
      ? pdfSourceFactsSchema.safeParse(snapshot.sourceFacts)
      : null;
  if (parsed && !parsed.success) throw invalid("source-facts-schema");
  const sourceFacts = parsed?.success ? parsed.data : undefined;
  let bytes: Buffer;
  try {
    bytes = await renderDocumentPdf(snapshot, sourceHash, {
      ...emission,
      sourceFacts,
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
