import { expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { composeIssuance, validateIssuanceContent } from "@/lib/server/pdf-content";
import { documentVariant } from "@/lib/documents/variant";
import { fidelityEmission, fidelitySourceFacts, legacyFidelitySnapshots } from "./support/pdf-fidelity-fixtures";
const id = (n: number) => "90000000-0000-4000-8000-" + String(n).padStart(12, "0");
const stamp = "2026-11-11T12:00:00Z";
function source() {
  const snapshot = structuredClone(legacyFidelitySnapshots.find(item => item.type === "ENT")!);
  snapshot.id = id(1); snapshot.version = 3; snapshot.status = "pending_receipt";
  snapshot.createdAt = stamp;
  snapshot.code = "ENT-0001"; snapshot.protocol = "ENT-20261111-AUTONOMA";
  snapshot.payload = { source: "CARE_TEAM", destination: "FAMILY", notes: "Devolução própria de material preservado." };
  snapshot.workflow = {};
  snapshot.sourceFacts = { ...fidelitySourceFacts, issuedAt: stamp, documentCreatedAt: stamp, registeredAt: stamp,
    issuerId: id(20), issuerName: "Profissional declarante", historyActors: [
      { version: 1, id: id(20), name: "Profissional declarante", source: "event_snapshot" },
      { version: 2, id: id(21), name: "Familiar da concordância", source: "event_snapshot" },
      { version: 3, id: id(20), name: "Profissional declarante", source: "event_snapshot" },
    ] };
  snapshot.history = [
    { action: "ent.transfer.declared", actorName: "Profissional declarante", createdAt: stamp, version: 1 },
    { action: "ent.transfer.agreed", actorName: "Familiar da concordância", createdAt: stamp, version: 2 },
    { action: "ent.issued", actorName: "Profissional declarante", createdAt: stamp, version: 3 },
  ];
  snapshot.documentFacts = { schemaVersion: 1, deliveryResolutions: [], purchaseReceiptEvents: [] };
  snapshot.lines = [{ id: id(2), product_id: "material-preservado", name_snapshot: "Material da devolução autônoma", unit_snapshot: "unidade",
    quantity: "5", accepted_quantity: "0", reconciled_quantity: "0", fully_checked: false, metadata: {} }];
  snapshot.transfer = { state: "dispatched", originDocumentId: null, dispatchedAt: stamp,
    declaration: { actor: { id: id(20), name: "Profissional declarante" }, counterparty: { id: id(21), name: "Familiar da concordância" },
      recipient: { id: id(22), name: "Familiar do recebimento" }, source: "CARE_TEAM", destination: "FAMILY",
      reason: "Retorno autônomo sem entrega de origem vinculada.", recordedAt: stamp, referenceHash: "b".repeat(64) },
    agreement: { actor: { id: id(21), name: "Familiar da concordância" }, reason: "Concordância própria sem aceite físico.",
      decision: "agree", recordedAt: stamp, documentVersion: 2 }, withdrawal: null };
  snapshot.actors = { recipient: { id: id(22), name: "Familiar do recebimento" } };
  return snapshot;
}
const emission = { ...fidelityEmission, requestedAt: "2026-11-11T12:30:00Z", rendererRevision: 14 as const, representation: "operational" as const };

it("V14 names an autonomous return and preserves separate authors and pending personal receipt", async () => {
  const snapshot = source(), plan = await composeIssuance(snapshot, "a".repeat(64), emission);
  expect((await validateIssuanceContent(plan.bytes, plan)).passed).toBe(true);
  expect((await PDFDocument.load(plan.bytes)).getTitle()).toContain("Devolução de materiais");
  expect(plan.runs.some(run => run.text === "IDENTIFICAÇÃO DA DEVOLUÇÃO")).toBe(true);
  expect(plan.semanticFacts!["fidelity/transfer/nature"]).toBe("Devolução de materiais");
  expect(plan.semanticFacts!["fidelity/transfer/route"]).toBe("Equipe para Família");
  expect(plan.semanticFacts!["fidelity/transfer/origin"]).toBe("Sem entrega de origem vinculada a esta devolução.");
  expect(plan.semanticFacts!["fidelity/ent/receipt-state"]).toContain("Nenhum aceite é presumido");
  const changed = structuredClone(snapshot); changed.payload = { ...snapshot.payload, source: "FAMILY", destination: "CARE_TEAM" };
  await expect(composeIssuance(changed, "a".repeat(64), emission)).rejects.toMatchObject({ code: "CONTENT_INVALID" });
  changed.transfer!.declaration.source = "FAMILY"; changed.transfer!.declaration.destination = "CARE_TEAM";
  const wrong = await composeIssuance(changed, "a".repeat(64), emission);
  await expect(validateIssuanceContent(plan.bytes, wrong)).rejects.toMatchObject({ code: "CONTENT_INVALID" });
  mkdirSync("output/pdf", { recursive: true }); writeFileSync("output/pdf/autonomous-return-controlled.pdf", plan.bytes);
}, 30000);

it("older V10 keeps its generic ENT representation while the new UI uses only the preserved direction", async () => {
  const snapshot = source();
  expect(documentVariant("ENT", snapshot.payload)).toBe("Devolução de materiais");
  const older = await composeIssuance(snapshot, "a".repeat(64), { ...fidelityEmission, requestedAt: emission.requestedAt, rendererRevision: 10 });
  expect((await PDFDocument.load(older.bytes)).getTitle()).toContain("Comprovante de entrega de materiais");
  expect(older.semanticFacts!["fidelity/transfer/nature"]).toBeUndefined();
  expect((await validateIssuanceContent(older.bytes, older)).passed).toBe(true);
}, 30000);

it("V14 does not infer family or team custody from a missing historical route", async () => {
  const snapshot = source(); snapshot.payload = {}; snapshot.transfer = undefined;
  const plan = await composeIssuance(snapshot, "a".repeat(64), emission);
  expect(plan.semanticFacts!["fidelity/transfer/nature"]).toBe("Movimentação de materiais · percurso não preservado");
  expect(plan.semanticFacts!["fidelity/transfer/route"]).toBe("Percurso não preservado neste registro");
  expect(plan.runs.filter(run => run.text === "Custódia não preservada")).toHaveLength(2);
}, 30000);
