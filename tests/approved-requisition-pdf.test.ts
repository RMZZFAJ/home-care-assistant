import { expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { PDF } from "@libpdf/core";
import { PDFDocument, PDFHexString, PDFName, PDFString } from "pdf-lib";
import { renderApprovedRequisitionPdf } from "@/lib/server/approved-requisition-pdf";
import { approvedRequisitionContent } from "@/lib/server/approved-requisition-content";
import type { DocumentTextRun } from "@/lib/server/approved-pdf-layout";
import { ApprovedPdfTextUnsupportedError } from "@/lib/server/approved-pdf-layout";
import { validatePdfStructure } from "@/lib/server/pdf-structure-validation";
import { composeIssuance, validateIssuanceContent } from "@/lib/server/pdf-content";
import { legacyFidelitySnapshots, fidelityEmission } from "./support/pdf-fidelity-fixtures";
import type { PdfLifecycleFacts } from "@/lib/documents/pdf-lifecycle";

const id = (n: number) => "91000000-0000-4000-8000-" + String(n).padStart(12, "0");
const compact = (text: string) => text.normalize("NFKC").replaceAll(/\s/g, "");
async function extract(bytes: Uint8Array) {
  return (await PDF.load(bytes)).extractText().flatMap(page => page.lines.map(line => line.spans.map(span => span.chars.map(char => char.char).join("")).join(""))).join(" ");
}
function requisition() {
  const snapshot = structuredClone(legacyFidelitySnapshots.find(row => row.type === "REQ")!);
  snapshot.id = id(1); snapshot.version = 3; snapshot.status = "cancelled";
  snapshot.documentFacts = { schemaVersion: 1, deliveryResolutions: [], purchaseReceiptEvents: [] };
  snapshot.history = [{ action: "req.cancelled", actorName: "Autora do cancelamento", createdAt: "2026-11-02T12:00:00Z", version: 2 }];
  snapshot.actors = { issuer: { name: "Autora histórica fictícia", category: "Familiar" } };
  snapshot.payload = { intent: { observations: ["Observação original integral, sem modificação pelo exportador."] } };
  snapshot.lines = [
    { id: id(2), product_name_snapshot: "Material urgente preservado", unit_snapshot: "un", category_snapshot: "Higiene e cuidados", urgent: true, current_stock: "0", stock_observation: "observed", stock_observation_at: "2026-11-01T11:59:00Z", stock_observation_time_source: "server_submission" },
    { id: id(3), product_name_snapshot: "Material sem quantidade observada", unit_snapshot: "un", category_snapshot: "Higiene e cuidados", urgent: false, current_stock: null, stock_observation: "unfilled", stock_observation_at: null, stock_observation_time_source: "legacy_unknown" },
  ];
  snapshot.fulfillmentLines = [{ id: id(2), attended: true }, { id: id(3), attended: false }];
  snapshot.sciencePolicy = { familyAware: true, science_satisfied_at: "2026-11-01T13:00:00Z" };
  snapshot.scienceEvents = [{ actor_name: "Pessoa ciente da emissão", mode: "express", created_at: "2026-11-01T13:00:00Z" }];
  snapshot.lifecycleFacts = {
    schemaVersion: 1, documentId: id(1), version: 3,
    cancellation: { state: "recorded", act: { id: id(4), version: 2, actorId: id(5), actorName: "Autora do cancelamento", recordedAt: "2026-11-02T12:00:00Z", reason: "Cancelamento motivado sem apagar a ciência anterior." }, acknowledgements: [{ id: id(6), version: 3, actorId: id(7), actorName: "Pessoa ciente do cancelamento", recordedAt: "2026-11-02T13:00:00Z" }] },
    complements: [{ id: id(8), eventId: id(9), version: 3, role: "supplement", accessible: false }],
  } satisfies PdfLifecycleFacts;
  return snapshot;
}

it("approved REQ preserves original materials, observations and separate acts without technical payload in its distributed identity", async () => {
  const source = requisition(), before = JSON.stringify(source), runs: { x: number; baseline: number; width: number; size: number; page: number }[] = [];
  const result = await composeIssuance(source, "a".repeat(64), { ...fidelityEmission, rendererRevision: 16 });
  runs.push(...result.runs);
  expect(JSON.stringify(source)).toBe(before);
  const text = compact(await extract(result.bytes));
  for (const fact of ["Material urgente preservado", "Material sem quantidade observada", "URGENTE", "Acesso restrito", "Pessoa ciente da emissão", "Autora do cancelamento", "Pessoa ciente do cancelamento", "Cancelamento motivado sem apagar a ciência anterior.", "Observação original integral, sem modificação pelo exportador.", "Autenticidade e verificação", "Confidencialidade e proteção de dados pessoais", "Não ICP-Brasil", "Familiar"])
    expect(text, fact).toContain(compact(fact));
  expect(text).toContain(compact("0 un (observado)")); expect(text).toContain(compact("Não informado"));
  expect(text).not.toContain("Rotina"); expect(text).not.toContain("PRIORIDADE");
  const pdf = await PDFDocument.load(result.bytes, { updateMetadata: false });
  expect(pdf.catalog.lookup(PDFName.of("Lang"), PDFString).decodeText()).toBe("pt-BR");
  expect(JSON.parse(pdf.catalog.lookup(PDFName.of("HCAIssuance"), PDFHexString).decodeText())).toEqual({ verificationCode: fidelityEmission.verificationCode, requestedAt: fidelityEmission.requestedAt });
  validatePdfStructure(pdf);
  expect(runs.length).toBeGreaterThan(50);
  for (const run of runs) expect(run.x >= 0 && run.baseline >= 0 && run.x + run.width <= 595.29 && run.baseline + run.size <= 841.9).toBe(true);
  mkdirSync("output/pdf/approved", { recursive: true }); writeFileSync("output/pdf/approved/req-controlled.pdf", result.bytes);
}, 30000);

it("approved REQ continues categories, long material names and final observation text without losing the original numbering", async () => {
  const source = requisition(); source.status = "submitted";
  source.lifecycleFacts = { schemaVersion: 1, documentId: source.id, version: source.version, cancellation: { state: "not_cancelled", act: null, acknowledgements: [] }, complements: [] };
  const tail = "Última frase preservada da observação extensa.";
  source.payload = { intent: { observations: ["Observação completa com muitos trechos. ".repeat(190) + tail] } };
  source.lines = Array.from({ length: 27 }, (_, index) => ({ ...source.lines[index % 2], id: id(100 + index), product_name_snapshot: "Material " + index + " " + "nome completo preservado ".repeat(index === 9 ? 45 : 1) }));
  const runs: DocumentTextRun[] = [];
  const raw = await renderApprovedRequisitionPdf(source, { ...fidelityEmission, onText: run => runs.push(run) });
  const result = { ...raw, runs, rendererRevision: 16, ...approvedRequisitionContent(source, fidelityEmission) };
  writeFileSync("output/pdf/approved/req-long.pdf", result.bytes);
  writeFileSync("output/pdf/approved/req-long-runs.json", JSON.stringify(runs));
  const pdf = await PDF.load(result.bytes), text = compact(await extract(result.bytes));
  expect(pdf.extractText().length).toBeGreaterThan(3);
  expect((await validateIssuanceContent(result.bytes, result)).passed).toBe(true);
  // Full-page extraction interleaves adjacent cells and running heads. The runtime
  // parser checks each cell at its coordinates and joins its page fragments.
  for (const [index, line] of source.lines.entries()) expect(result.semanticFacts?.["material/" + index + "/name"]).toBe(line.product_name_snapshot);
  expect(text).toContain(compact(tail)); expect(text).toContain(compact("Higiene e cuidados · continuação"));
  writeFileSync("output/pdf/approved/req-long.pdf", result.bytes);
}, 30000);

it("approved REQ refuses malformed restricted facts, future cancellation and unrepresentable text", async () => {
  const malformed = requisition(); const facts = malformed.lifecycleFacts as PdfLifecycleFacts;
  facts.complements[0] = { ...facts.complements[0], reason: "Dados que não devem viajar sem acesso" } as unknown as PdfLifecycleFacts["complements"][number];
  await expect(renderApprovedRequisitionPdf(malformed, fidelityEmission)).rejects.toThrow();
  const future = requisition(); const cancellation = (future.lifecycleFacts as PdfLifecycleFacts).cancellation;
  if (cancellation.state === "recorded") cancellation.act.version = 99;
  await expect(renderApprovedRequisitionPdf(future, fidelityEmission)).rejects.toThrow();
  const unsupported = requisition(); unsupported.lines[0].product_name_snapshot = "Material 🧬";
  await expect(renderApprovedRequisitionPdf(unsupported, fidelityEmission)).rejects.toBeInstanceOf(ApprovedPdfTextUnsupportedError);
}, 30000);
