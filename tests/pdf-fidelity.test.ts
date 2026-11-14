import { currentPdfFixture } from "./support/current-pdf-fixture";
import { describe, expect, it, vi } from "vitest";
import { PDF } from "@libpdf/core";
import { PDFDocument, PDFName } from "pdf-lib";
import { composeIssuance, validateIssuanceContent } from "@/lib/server/pdf-content";
import { renderDocumentPdf, type DocumentSnapshot } from "@/lib/server/operational-pdf";
import type { PdfFidelityFacts } from "@/lib/documents/pdf-fidelity";
import { fidelityEmission, fidelitySourceFacts, legacyFidelitySnapshots } from "./support/pdf-fidelity-fixtures";

vi.setConfig({testTimeout:30000});
const hash = "c".repeat(64);
const empty: PdfFidelityFacts = { schemaVersion: 1, deliveryResolutions: [], purchaseReceiptEvents: [] };
const emission = { ...fidelityEmission, rendererRevision: 16 as const };
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
  source.lines = [{
    id: id(1), name_snapshot: "Material da divergência", unit_snapshot: "unidade", quantity: "3", accepted_quantity: "1", reconciled_quantity: "2", fully_checked: false,
    metadata: { issueOpen: false, receipt: { acceptedQuantity: "1", problem: "damaged", notes: "Avaria no lacre original; preservar nota literal." } }
  }];
  source.documentFacts = {
    ...structuredClone(empty), deliveryResolutions: [
      { ...event(3), lineId: id(1), resolution: "returned", quantity: "1", reason: "Devolução física do lacre avariado." },
      { ...event(4), lineId: id(1), resolution: "missing", quantity: "1", reason: "Falta apurada em parcela distinta, sem devolução presumida." },
    ]
  } satisfies PdfFidelityFacts;
  return source;
}

describe("technical fidelity without a PDF redesign", () => {
  it("refuses retired V4/V5/V6 painters for all six controlled sources", async () => {
    for (const source of legacyFidelitySnapshots) for (const rendererRevision of [4, 5, 6]) await expect(renderDocumentPdf(source, hash, { ...fidelityEmission, rendererRevision })).rejects.toThrow("Consolidated document emission required");
  });

  it("describes purchase, donation, first count, formal recount and an unpreserved legacy context without inventing an initial patient balance", async () => {
    const cases = [
      ["COM", { origin: "purchase" }, {}, "Compra de materiais"],
      ["COM", { origin: "donation" }, {}, "Doação de materiais"],
      ["BAL", { balanceContext: { kind: "scheduled" } }, { countVersion: 1 }, "Primeira contagem desta ficha"],
      ["BAL", { balanceContext: { kind: "recount" } }, { countVersion: 2 }, "Reconto registrado em ato próprio"],
      ["BAL", {}, {}, "Contexto de plantão não preservado"],
    ] as const;
    for (const [type, payload, workflow, title] of cases) {
      const source = document(type); source.payload = { ...payload }; source.workflow = { ...workflow };
      // This controlled title probe supplies only the authoritative kind. A real
      // snapshot's complete shift facts are covered by Auth/browser consumers.
      if (source.type === "BAL" && source.payload.balanceContext) source.payload.balanceContext = { ...(source.payload.balanceContext as object), professionalName: "Profissional preservado", shiftType: "Diurno" };
      const plan = await composeIssuance(currentPdfFixture(source), hash, emission);
      expect(await text(plan.bytes)).toContain(compact(title));
      expect((await PDFDocument.load(plan.bytes)).getTitle()).toContain(source.code);
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
    const plan = await composeIssuance(currentPdfFixture(source), hash, emission), extracted = await text(plan.bytes);
    expect(plan.semanticFacts?.["material/0/stock"]).toBe("0 mL (observado) Registro no rascunho (horário do dispositivo): 04/11/2026, 15:12");
    expect(plan.semanticFacts?.["material/1/stock"]).toBe("1,234567 mL (observado) Informação recebida na emissão: 04/11/2026, 15:12");
    expect(plan.semanticFacts?.["material/2/stock"]).toContain("Não sei informar");
    expect(plan.semanticFacts?.["material/3/stock"]).toContain("Não informado");
    expect(plan.semanticFacts?.["material/4/stock"]).toContain("7 mL · observação legada sem classificação");
    expect(plan.semanticFacts?.["material/0/fulfillment"]).toBe("Atendido conforme avaliação familiar e recebimento");
    expect(plan.semanticFacts?.["material/1/fulfillment"]).toBe("Pendente de atendimento");
    expect(plan.semanticFacts?.["material/4/fulfillment"]).toBe("Situação não preservada");
    expect(extracted).not.toContain("778899");
    const misattributed = { ...plan, runs: plan.runs.map(run => run.factGroup === "material/0/stock" ? { ...run, factGroup: "unrelated-row" } : run) };
    await expect(validateIssuanceContent(plan.bytes, misattributed)).rejects.toMatchObject({ code: "CONTENT_INVALID" });
    source.sourceFacts = { ...fidelitySourceFacts, historical: true };
    const historical = await composeIssuance(currentPdfFixture(source), hash, emission);
    expect(historical.semanticFacts?.["material/0/fulfillment"]).toBe("Atendimento não apurado na origem histórica");
    expect((await validateIssuanceContent(historical.bytes, historical)).passed).toBe(true);
  }, 30000);

  it("includes the original ENT damage note and distinguishes returned and missing parcels with immutable event, actor, quantity and reason", async () => {
    const source = delivery(), plan = await composeIssuance(currentPdfFixture(source), hash, emission), extracted = await text(plan.bytes);
    for (const value of ["Material avariado", "Avaria no lacre original; preservar nota literal.", "Devolução à origem", "Falta ou perda conciliada", "Devolução física do lacre avariado.", "Falta apurada em parcela distinta, sem devolução presumida.", "Autora preservada da resolução", "1 unidade"])
      expect(extracted).toContain(compact(value));
    const old = await composeIssuance(currentPdfFixture(source), hash, { ...fidelityEmission, rendererRevision: 16 });
    expect(await text(old.bytes)).toContain(compact("Avaria no lacre original; preservar nota literal."));
    expect(await text(old.bytes)).toContain(compact("Devolução física do lacre avariado."));
  }, 30000);

  it("rejects misattributed technical facts even when the bytes and a compromised painter run log agree", async () => {
    const plan = await composeIssuance(currentPdfFixture(delivery()), hash, emission);
    const changed = { ...plan, runs: plan.runs.map(run => run.factGroup === "resolution/1/reason" ? { ...run, factGroup: "unrelated-note" } : run) };
    await expect(validateIssuanceContent(plan.bytes, changed)).rejects.toMatchObject({ code: "CONTENT_INVALID" });
  }, 30000);

  it("keeps prior BAL review and legacy approvals clearly historical after recount, including the preserved policy", async () => {
    const source = document("BAL"); source.workflow = { reviewPolicy: { balReview: "optional" }, countVersion: 2 };
    source.balanceReviews = {
      counter: { id: id(90), name: "Contador atual preservado", source: "count_event" }, countVersion: 2, notes: "Observação da contagem atual",
      reviews: [{
        id: id(30), count_version: 1, counter_id: id(91), reviewer_id: id(92), reviewer_name: "Revisora da primeira contagem", review_group: "family", comment: "Parecer exclusivo da contagem anterior", reference_state: "historical", recorded_at: "2026-11-02T12:00:00Z", reviewed_document_version: 2,
        reviewed_snapshot: { counter: { id: id(91), name: "Contador anterior preservado", source: "count_event" }, notes: "Observação original anterior", countVersion: 1, lines: [], referenceRevision: "old", currentRevision: "old", appliedBeforeReview: true }
      }],
      legacyApprovals: [{ actor_id: id(93), actorName: "Nome do cadastro no snapshot", nameSource: "current_profile", review_group: "supervisor", count_version: 1, created_at: "2026-11-01T12:00:00Z" }],
    };
    const extracted = await text((await composeIssuance(currentPdfFixture(source), hash, emission)).bytes);
    for (const value of ["Registro de contagem anterior; não é revisão vigente da contagem atual.", "Aprovação de contagem anterior; não é aprovação vigente da contagem atual.", "Nome do cadastro no snapshot", "Parecer exclusivo da contagem anterior"])
      expect(extracted).toContain(compact(value));
  }, 30000);

  it("distinguishes pending, rejected and validated COM receipts and links each parcel to its actual events", async () => {
    const source = document("COM"); source.payload.origin = "purchase";
    source.lines = [{ id: id(1), name_snapshot: "Material das parcelas", unit_snapshot: "unidade", quantity: "3" }];
    source.purchaseReceipts = (["pending", "rejected", "approved"] as const).map((state, i) => ({ id: id(10 + i), state, submitted_by: id(90), submitted_name: "Declarante preservada", lines: [{ lineId: id(1), quantity: "1" }], created_at: "2026-11-01T12:00:00Z", validated_at: state === "pending" ? null : "2026-11-02T12:00:00Z", validated_name: "Conferente preservada", reason: state === "rejected" ? "Parcela rejeitada não credita estoque." : null }));
    const facts: PdfFidelityFacts = {
      ...structuredClone(empty), purchaseReceiptEvents: [
        { ...event(5), action: "com.receive", receiptId: id(10) },
        { ...event(6), action: "com.reject_receipt", receiptId: id(11) },
        { ...event(7), action: "com.validate_receipt", receiptId: id(12) },
      ]
    }; source.documentFacts = facts;
    const extracted = await text((await composeIssuance(currentPdfFixture(source), hash, emission)).bytes);
    for (const value of ["Parcela 1", "Parcela 2", "Parcela 3", "Rejeitada por Conferente preservada", "Validada por Conferente preservada", "Parcela rejeitada não credita estoque."]) expect(extracted).toContain(compact(value));
    facts.purchaseReceiptEvents[0].receiptId = null;
    expect(await text((await composeIssuance(currentPdfFixture(source), hash, emission)).bytes)).toContain(compact("Parcela rejeitada não credita estoque."));
  }, 30000);

  it("does not label a same-count review current when it is self-review, outside the preserved group or lacks reference evidence", async () => {
    const source = document("BAL"); source.workflow = { reviewPolicy: { balReview: "required", balRequirement: "all", balApprovers: ["family"] } };
    source.balanceReviews = {
      counter: { id: id(90), name: "Contador preservado", source: "count_event" }, countVersion: 2, notes: "", legacyApprovals: [],
      reviews: [{
        id: id(30), count_version: 2, counter_id: id(90), reviewer_id: id(92), reviewer_name: "Revisora preservada", review_group: "family", comment: "Parecer independente", reference_state: "current", recorded_at: "2026-11-02T12:00:00Z", reviewed_document_version: 2,
        reviewed_snapshot: { counter: { id: id(90), name: "Contador preservado", source: "count_event" }, notes: "", countVersion: 2, lines: [], referenceRevision: "same", currentRevision: "same", appliedBeforeReview: false }
      }]
    };
    expect(await text((await composeIssuance(currentPdfFixture(source), hash, emission)).bytes)).toContain(compact("Revisão da contagem atual. Não aplica nem corrige estoque."));
    for (const change of [{ reviewer_id: id(90) }, { review_group: "supervisor" as const }, { reference_state: "unavailable" as const }]) {
      const invalid = structuredClone(source); Object.assign(invalid.balanceReviews!.reviews[0], change);
      const extracted = await text((await composeIssuance(currentPdfFixture(invalid), hash, emission)).bytes);
      expect(extracted).toContain(compact("elegibilidade para a contagem atual não comprovada por este contexto"));
      expect(extracted).not.toContain(compact("Parecer da contagem atual e grupo habilitado na política preservada."));
      expect(source.workflow?.reviewPolicy).toMatchObject({balRequirement:"all"});
    }
    const unknownPolicy = structuredClone(source);
    (unknownPolicy.workflow!.reviewPolicy as Record<string, unknown>).balApprovers = "family";
    const unknown = await text((await composeIssuance(currentPdfFixture(unknownPolicy), hash, emission)).bytes);
    expect(unknown).not.toContain(compact("Revisão da contagem atual. Não aplica nem corrige estoque."));
    expect(unknown).toContain(compact("elegibilidade para a contagem atual não comprovada por este contexto"));
  }, 30000);

  it("requires frozen V7 facts without making them mandatory for a recoverable V6 intention", async () => {
    const source = document("COM"); delete source.documentFacts;
    await expect(composeIssuance(source, hash, emission)).rejects.toMatchObject({ code: "CONTENT_INVALID" });
    await expect(composeIssuance(source, hash, { ...fidelityEmission, rendererRevision: 6 })).rejects.toMatchObject({ code: "CONTENT_INVALID" });
  });

  it("binds the PDF language to the technical file without claiming a tagged-PDF or assistive-technology approval", async () => {
    const plan = await composeIssuance(currentPdfFixture(document("COM")), hash, emission);
    const altered = await PDFDocument.load(plan.bytes, { updateMetadata: false });
    expect(altered.getTitle()).toContain("Compra de materiais");
    const current = await composeIssuance(currentPdfFixture(document("COM")), hash, { ...emission, representation: "operational" });
    expect((await PDFDocument.load(current.bytes)).getTitle()).toContain("Compra de materiais");
    altered.catalog.delete(PDFName.of("Lang"));
    await expect(validateIssuanceContent(await altered.save(), plan)).rejects.toMatchObject({ code: "CONTENT_INVALID", cause: { message: "language" } });
  });
});
