import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { PDF } from "@libpdf/core";
import { PDFDocument, PDFName } from "pdf-lib";
import { composeIssuance, validateIssuanceContent } from "@/lib/server/pdf-content";
import { renderDocumentPdf, type DocumentSnapshot } from "@/lib/server/operational-pdf";
import type { PdfFidelityFacts } from "@/lib/documents/pdf-fidelity";
import { fidelityEmission, fidelitySourceFacts, legacyFidelitySnapshots } from "./support/pdf-fidelity-fixtures";
import baseline from "./support/pdf-renderer-legacy-digests.json";

const hash = "c".repeat(64);
const empty: PdfFidelityFacts = { schemaVersion: 1, deliveryResolutions: [], purchaseReceiptEvents: [] };
const emission = { ...fidelityEmission, rendererRevision: 7 as const };
const id = (n: number) => "30000000-0000-4000-8000-" + String(n).padStart(12, "0");
function document(type: DocumentSnapshot["type"]): DocumentSnapshot {
  return { ...structuredClone(legacyFidelitySnapshots.find(s => s.type === type)!), documentFacts: structuredClone(empty) };
}
const compact = (text: string) => text.normalize("NFKC").replaceAll(/\s/g, "").toLocaleLowerCase("pt-BR");
async function text(bytes: Uint8Array) {
  return compact((await PDF.load(bytes)).extractText().flatMap(page => page.lines.map(line => line.spans.flatMap(span => span.chars.map(char => char.char)).join(""))).join(" "));
}
const event = (n: number) => ({ eventId: id(n), version: n, actorId: id(90), actorName: "Autora preservada da resolução", recordedAt: "2026-11-03T12:00:00Z" });
function delivery() {
  const source = document("ENT");
  source.lines = [{ id: id(1), name_snapshot: "Material da divergência", unit_snapshot: "unidade", quantity: "3", accepted_quantity: "1", reconciled_quantity: "2", fully_checked: false,
    metadata: { issueOpen: false, receipt: { acceptedQuantity: "1", problem: "damaged", notes: "Avaria no lacre original; preservar nota literal." } } }];
  source.documentFacts = { ...structuredClone(empty), deliveryResolutions: [
    { ...event(3), lineId: id(1), resolution: "returned", quantity: "1", reason: "Devolução física do lacre avariado." },
    { ...event(4), lineId: id(1), resolution: "missing", quantity: "1", reason: "Falta apurada em parcela distinta, sem devolução presumida." },
  ] } satisfies PdfFidelityFacts;
  return source;
}

describe("technical fidelity without a PDF redesign", () => {
  it("keeps the exact pre-change V4/V5/V6 bytes for all six controlled sources", async () => {
    for (const [index, source] of legacyFidelitySnapshots.entries()) for (const revision of [4, 5, 6] as const) {
      const bytes = await renderDocumentPdf(source, hash, revision === 4 ? undefined : { ...fidelityEmission, rendererRevision: revision, sourceFacts: fidelitySourceFacts });
      const key = `${source.type}-${index}-v${revision}` as keyof typeof baseline.digests;
      expect(createHash("sha256").update(bytes).digest("hex"), key).toBe(baseline.digests[key]);
    }
  }, 30000);

  it("describes purchase, donation, first count, formal recount and an unpreserved legacy context without inventing an initial patient balance", async () => {
    const cases = [
      ["COM", { origin: "purchase" }, {}, "COMPRA DE INSUMOS DA FAMÍLIA"],
      ["COM", { origin: "donation" }, {}, "DOAÇÃO DE INSUMOS À FAMÍLIA"],
      ["BAL", { balanceContext: { kind: "scheduled" } }, { countVersion: 1 }, "BALANÇO DO ESTOQUE DA EQUIPE · PRIMEIRA CONTAGEM DESTA FICHA"],
      ["BAL", { balanceContext: { kind: "recount" } }, { countVersion: 2 }, "RECONTO DO ESTOQUE DA EQUIPE"],
      ["BAL", {}, {}, "BALANÇO DO ESTOQUE DA EQUIPE · CONTEXTO DE PLANTÃO NÃO PRESERVADO"],
    ] as const;
    for (const [type, payload, workflow, title] of cases) {
      const source = document(type); source.payload = { ...payload }; source.workflow = { ...workflow };
      // This controlled title probe supplies only the authoritative kind. A real
      // snapshot's complete shift facts are covered by Auth/browser consumers.
      if (source.type === "BAL" && source.payload.balanceContext) source.payload.balanceContext = { ...(source.payload.balanceContext as object), professionalName: "Profissional preservado", shiftType: "Diurno" };
      const plan = await composeIssuance(source, hash, emission);
      expect(await text(plan.bytes)).toContain(compact(title));
      expect((await PDFDocument.load(plan.bytes)).getTitle()?.toLocaleUpperCase("pt-BR")).toContain(title);
    }
  }, 30000);

  it("preserves REQ zero, exact decimal, explicit unknown, unfilled and legacy observation with its actual time source and item status", async () => {
    const source = document("REQ");
    const values = [
      { current_stock: "0", stock_observation: "observed", stock_observation_at: "2026-11-04T18:12:30Z", stock_observation_time_source: "client_draft" },
      { current_stock: "1.234567", stock_observation: "observed", stock_observation_at: "2026-11-04T18:12:30Z", stock_observation_time_source: "server_submission" },
      { current_stock: null, stock_observation: "unknown", stock_observation_at: null },
      { current_stock: null, stock_observation: "unfilled", stock_observation_at: null },
      { current_stock: "7" },
    ];
    source.lines = values.map((value, i) => ({ id: id(i + 1), name_snapshot: `Material ${i + 1} da observação`, unit_snapshot: "mL", quantity: "778899.123", ...value }));
    source.fulfillmentLines = source.lines.slice(0, 4).map((line, i) => ({ id: String(line.id), attended: i === 0 }));
    const plan = await composeIssuance(source, hash, emission), extracted = await text(plan.bytes);
    for (const value of ["0 mL (observado)", "1,234567 mL (observado)", "Não sei informar", "Não informado", "7 mL · observação legada sem classificação", "Registro no rascunho (horário do dispositivo)", "Informação recebida na emissão", "Horário da informação desconhecido", "Item 01 · Atendimento com aceite positivo registrado", "Item 02 · Sem aceite positivo registrado", "Item 05 · Situação de atendimento não preservada nesta versão"])
      expect(extracted).toContain(compact(value));
    expect(extracted).not.toContain("778899");
    const misattributed = { ...plan, runs: plan.runs.map(run => run.factGroup === `fidelity/requisition/${id(1)}/1` ? { ...run, factGroup: "unrelated-row" } : run) };
    await expect(validateIssuanceContent(plan.bytes, misattributed)).rejects.toMatchObject({ code: "CONTENT_INVALID" });
    source.sourceFacts = { ...fidelitySourceFacts, historical: true };
    expect(await text((await composeIssuance(source, hash, emission)).bytes)).toContain(compact("Atendimento não apurado na origem histórica"));
  }, 30000);

  it("includes the original ENT damage note and distinguishes returned and missing parcels with immutable event, actor, quantity and reason", async () => {
    const source = delivery(), plan = await composeIssuance(source, hash, emission), extracted = await text(plan.bytes);
    for (const value of ["Material avariado", "Avaria no lacre original; preservar nota literal.", "Devolução à origem", "Falta ou perda conciliada", "Devolução física do lacre avariado.", "Falta apurada em parcela distinta, sem devolução presumida.", "Autora preservada da resolução", id(3), id(4), "1 unidade"])
      expect(extracted).toContain(compact(value));
    const old = await composeIssuance(source, hash, { ...fidelityEmission, rendererRevision: 6 });
    expect(await text(old.bytes)).not.toContain(compact("Avaria no lacre original; preservar nota literal."));
    expect(await text(old.bytes)).not.toContain(compact("Devolução física do lacre avariado."));
  }, 30000);

  it("rejects misattributed technical facts even when the bytes and a compromised painter run log agree", async () => {
    const plan = await composeIssuance(delivery(), hash, emission);
    const changed = { ...plan, runs: plan.runs.map(run => run.factGroup === `fidelity/resolution/${id(4)}/reason` ? { ...run, factGroup: "unrelated-note" } : run) };
    await expect(validateIssuanceContent(plan.bytes, changed)).rejects.toMatchObject({ code: "CONTENT_INVALID" });
  }, 30000);

  it("keeps prior BAL review and legacy approvals clearly historical after recount, including the preserved policy", async () => {
    const source = document("BAL"); source.workflow = { reviewPolicy: { balReview: "optional" }, countVersion: 2 };
    source.balanceReviews = {
      counter: { id: id(90), name: "Contador atual preservado", source: "count_event" }, countVersion: 2, notes: "Observação da contagem atual",
      reviews: [{ id: id(30), count_version: 1, counter_id: id(91), reviewer_id: id(92), reviewer_name: "Revisora da primeira contagem", review_group: "family", comment: "Parecer exclusivo da contagem anterior", reference_state: "historical", recorded_at: "2026-11-02T12:00:00Z", reviewed_document_version: 2,
        reviewed_snapshot: { counter: { id: id(91), name: "Contador anterior preservado", source: "count_event" }, notes: "Observação original anterior", countVersion: 1, lines: [], referenceRevision: "old", currentRevision: "old", appliedBeforeReview: true } }],
      legacyApprovals: [{ actor_id: id(93), actorName: "Nome do cadastro no snapshot", nameSource: "current_profile", review_group: "supervisor", count_version: 1, created_at: "2026-11-01T12:00:00Z" }],
    };
    const extracted = await text((await composeIssuance(source, hash, emission)).bytes);
    for (const value of ["Revisão facultativa", "Registro de contagem anterior; não é parecer vigente da contagem atual.", "Aprovação de contagem anterior; não é aprovação vigente da contagem atual.", "Nome do cadastro no snapshot", "não é prova do nome histórico no ato", "Parecer exclusivo da contagem anterior", "Contador atual preservado", "Contador anterior preservado"])
      expect(extracted).toContain(compact(value));
  }, 30000);

  it("distinguishes pending, rejected and validated COM receipts and links each parcel to its actual events", async () => {
    const source = document("COM"); source.payload.origin = "purchase";
    source.lines = [{ id: id(1), name_snapshot: "Material das parcelas", unit_snapshot: "unidade", quantity: "3" }];
    source.purchaseReceipts = (["pending", "rejected", "approved"] as const).map((state, i) => ({ id: id(10 + i), state, submitted_by: id(90), submitted_name: "Declarante preservada", lines: [{ lineId: id(1), quantity: "1" }], created_at: "2026-11-01T12:00:00Z", validated_at: state === "pending" ? null : "2026-11-02T12:00:00Z", validated_name: "Conferente preservada", reason: state === "rejected" ? "Parcela rejeitada não credita estoque." : null }));
    const facts: PdfFidelityFacts = { ...structuredClone(empty), purchaseReceiptEvents: [
      { ...event(5), action: "com.receive", receiptId: id(10) },
      { ...event(6), action: "com.reject_receipt", receiptId: id(11) },
      { ...event(7), action: "com.validate_receipt", receiptId: id(12) },
    ] }; source.documentFacts = facts;
    const extracted = await text((await composeIssuance(source, hash, emission)).bytes);
    for (const value of ["Parcela 1", "Parcela 2", "Parcela 3", "Rejeitada por Conferente preservada", "Validada por Conferente preservada", "Parcela rejeitada não credita estoque.", id(10), id(11), id(12), id(5), id(6), id(7)]) expect(extracted).toContain(compact(value));
    facts.purchaseReceiptEvents[0].receiptId = null;
    expect(await text((await composeIssuance(source, hash, emission)).bytes)).toContain(compact("Identificador da parcela não preservado; não foi inferido por quantidade ou data."));
  }, 30000);

  it("does not label a same-count review current when it is self-review, outside the preserved group or lacks reference evidence", async () => {
    const source = document("BAL"); source.workflow = { reviewPolicy: { balReview: "required", balRequirement: "all", balApprovers: ["family"] } };
    source.balanceReviews = { counter: { id: id(90), name: "Contador preservado", source: "count_event" }, countVersion: 2, notes: "", legacyApprovals: [],
      reviews: [{ id: id(30), count_version: 2, counter_id: id(90), reviewer_id: id(92), reviewer_name: "Revisora preservada", review_group: "family", comment: "Parecer independente", reference_state: "current", recorded_at: "2026-11-02T12:00:00Z", reviewed_document_version: 2,
        reviewed_snapshot: { counter: { id: id(90), name: "Contador preservado", source: "count_event" }, notes: "", countVersion: 2, lines: [], referenceRevision: "same", currentRevision: "same", appliedBeforeReview: false } }] };
    expect(await text((await composeIssuance(source, hash, emission)).bytes)).toContain(compact("Parecer da contagem atual e grupo habilitado na política preservada."));
    for (const change of [{ reviewer_id: id(90) }, { review_group: "supervisor" as const }, { reference_state: "unavailable" as const }]) {
      const invalid = structuredClone(source); Object.assign(invalid.balanceReviews!.reviews[0], change);
      const extracted = await text((await composeIssuance(invalid, hash, emission)).bytes);
      expect(extracted).toContain(compact("elegibilidade vigente não comprovada por este contexto"));
      expect(extracted).not.toContain(compact("Parecer da contagem atual e grupo habilitado na política preservada."));
      expect(extracted).toContain(compact("Todos os grupos habilitados"));
    }
    const unknownPolicy = structuredClone(source);
    (unknownPolicy.workflow!.reviewPolicy as Record<string, unknown>).balApprovers = "family";
    const unknown = await text((await composeIssuance(unknownPolicy, hash, emission)).bytes);
    expect(unknown).toContain(compact("Grupos não preservados"));
    expect(unknown).toContain(compact("elegibilidade vigente não comprovada por este contexto"));
  }, 30000);

  it("requires frozen V7 facts without making them mandatory for a recoverable V6 intention", async () => {
    const source = document("COM"); delete source.documentFacts;
    await expect(composeIssuance(source, hash, emission)).rejects.toMatchObject({ code: "CONTENT_INVALID" });
    await expect(composeIssuance(source, hash, { ...fidelityEmission, rendererRevision: 6 })).resolves.toHaveProperty("identity.rendererRevision", 6);
  });

  it("binds the PDF language to the technical file without claiming a tagged-PDF or assistive-technology approval", async () => {
    const plan = await composeIssuance(document("COM"), hash, emission);
    const altered = await PDFDocument.load(plan.bytes, { updateMetadata: false });
    expect(altered.getSubject()).toBe("Representação de versão histórica · conteúdo v1 · renderizador V7");
    const current = await composeIssuance(document("COM"), hash, { ...emission, representation: "operational" });
    expect((await PDFDocument.load(current.bytes)).getSubject()).toBe("Representação documental · conteúdo v1 · renderizador V7");
    altered.catalog.delete(PDFName.of("Lang"));
    await expect(validateIssuanceContent(await altered.save(), plan)).rejects.toMatchObject({ code: "CONTENT_INVALID", cause: { message: "language" } });
  });
});
