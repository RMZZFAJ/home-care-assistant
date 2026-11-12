import { expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { PDF } from "@libpdf/core";
import { PDFDocument } from "pdf-lib";
import { composeIssuance, validateIssuanceContent } from "@/lib/server/pdf-content";
import { confirmedDeliveryQuantity } from "@/lib/documents/delivery-confirmed-quantity";
import type { DocumentSnapshot } from "@/lib/server/operational-pdf";
import { regularizationSnapshot, regularizationId } from "./support/pdf-regularization-fixtures";
import { fidelityEmission, legacyFidelitySnapshots } from "./support/pdf-fidelity-fixtures";

const emission = { ...fidelityEmission, rendererRevision: 16 as const };
const compact = (text: string) => text.normalize("NFKC").replaceAll(/\s/g, "");
const plain = async (bytes: Uint8Array) => compact((await PDF.load(bytes)).extractText().flatMap(page => page.lines.map(line => line.spans.flatMap(span => span.chars.map(char => char.char)).join(""))).join(" "));
function lifecycle(source: DocumentSnapshot) {
  source.lifecycleFacts = { schemaVersion: 1, documentId: source.id, version: source.version, cancellation: { state: "not_cancelled", act: null, acknowledgements: [] }, complements: [] };
  return source;
}
it("confirmed quantity preserves personal receipt and physical complements while excluding administrative credits, returns and losses", () => {
  const source = regularizationSnapshot(), line = source.lines[0]; line.accepted_quantity = "4";
  const after = "2026-11-02T13:00:00-03:00";
  const resolution = { eventId: regularizationId(60), lineId: String(line.id), version: 4, actorId: regularizationId(9), actorName: "Recebedora complementar", recordedAt: after, resolution: "received" as const, quantity: "1", reason: "Recebimento físico complementar." };
  expect(confirmedDeliveryQuantity(source, line, [], false)).toEqual({ state: "recorded", quantity: "2" });
  expect(confirmedDeliveryQuantity(source, line, [resolution], false)).toEqual({ state: "recorded", quantity: "3" });
  expect(confirmedDeliveryQuantity(source, line, [{ ...resolution, resolution: "returned" }, { ...resolution, resolution: "missing" }], false)).toEqual({ state: "recorded", quantity: "2" });
  source.workflow = {};
  expect(confirmedDeliveryQuantity(source, line, [resolution], false)).toEqual({ state: "not_confirmed", quantity: null });
  expect(confirmedDeliveryQuantity(source, line, [resolution], true)).toEqual({ state: "not_confirmed", quantity: null });
});

it("approved ENT retains the original receipt, administrative before/after quantities, decision and unknown transit without technical identifiers", async () => {
  const source = lifecycle(regularizationSnapshot()), before = JSON.stringify(source);
  const plan = await composeIssuance(source, "a".repeat(64), emission), text = await plain(plan.bytes);
  expect(JSON.stringify(source)).toBe(before);
  for (const value of ["Regularização administrativa", "Proponente preservada", "Conferente preservada", "Recebedora original preservada", "Responsável futura", "Conferência independente preserva a unidade ainda desconhecida", "Decisão independente limita os efeitos às duas unidades apuradas", "Encerramento administrativo não substitui aceite pessoal"])
    expect(text, value).toContain(compact(value));
  expect(plan.semanticFacts?.["material/0/received"]).toBe("2 unidade");
  expect(plan.semanticFacts?.["material/0/open"]).toBe("1 unidade");
  expect(plan.semanticFacts?.["regularization/0/line/0/after"]).toBe("Conciliação após o procedimento: 2 unidade · Trânsito restante: 1 unidade");
  for (const internal of [regularizationId(2), regularizationId(4), regularizationId(21), regularizationId(22)]) expect(text).not.toContain(internal);
  const altered = structuredClone(source); altered.deliveryRegularization!.cases[0].proposal.basis = "Ressalva indevidamente substituída.";
  const wrong = await composeIssuance(altered, "a".repeat(64), emission);
  await expect(validateIssuanceContent(plan.bytes, wrong)).rejects.toMatchObject({ code: "CONTENT_INVALID" });
  mkdirSync("output/pdf/approved", { recursive: true }); writeFileSync("output/pdf/approved/ent-regularization-controlled.pdf", plan.bytes);
}, 30000);

it("approved autonomous return preserves direction, declaration/agreement and absence of personal receipt without requiring a linked entry", async () => {
  const source = lifecycle(structuredClone(legacyFidelitySnapshots.find(row => row.type === "ENT")!));
  source.status = "pending_receipt"; source.version = 3; source.payload = { source: "CARE_TEAM", destination: "FAMILY", notes: "Devolução autônoma preservada." }; source.workflow = {};
  lifecycle(source);
  source.lines = [{ id: regularizationId(70), name_snapshot: "Material devolvido autonomamente", unit_snapshot: "unidade", quantity: "5", accepted_quantity: "0", reconciled_quantity: "0", metadata: {}, fully_checked: false }];
  source.documentFacts = { schemaVersion: 1, deliveryResolutions: [], purchaseReceiptEvents: [] };
  source.transfer = { state: "dispatched", originDocumentId: null, dispatchedAt: "2026-11-11T12:00:00Z", declaration: { actor: { id: regularizationId(71), name: "Profissional declarante" }, counterparty: { id: regularizationId(72), name: "Familiar da concordância" }, recipient: { id: regularizationId(73), name: "Familiar do recebimento" }, source: "CARE_TEAM", destination: "FAMILY", reason: "Justificativa da devolução própria.", recordedAt: "2026-11-11T11:00:00Z", referenceHash: "b".repeat(64) }, agreement: { actor: { id: regularizationId(72), name: "Familiar da concordância" }, decision: "agree", reason: "Concordância não é aceite físico.", recordedAt: "2026-11-11T11:30:00Z", documentVersion: 2 }, withdrawal: null };
  const plan = await composeIssuance(source, "a".repeat(64), emission), text = await plain(plan.bytes);
  expect((await PDFDocument.load(plan.bytes)).getTitle()).toContain("Devolução de materiais");
  for (const value of ["Devolução autônoma da equipe para a família", "sem entrega de origem vinculada", "Profissional declarante", "Familiar da concordância", "Familiar do recebimento", "Concordância não é aceite físico.", "Não confirmado"])
    expect(text, value).toContain(compact(value));
  expect(plan.semanticFacts?.["material/0/received"]).toBe("Não confirmado"); expect(plan.semanticFacts?.["material/0/open"]).toBe("5 unidade");
  writeFileSync("output/pdf/approved/return-controlled.pdf", plan.bytes);
}, 30000);

it("approved ENT keeps pending or rejected administrative quantities as proposals and never gives an unproved receipt a success seal", async () => {
  for (const state of ["pending", "rejected"] as const) {
    const source = lifecycle(regularizationSnapshot()), item = source.deliveryRegularization!.cases[0]; item.state = state;
    source.workflow = {}; item.before_snapshot.acceptedBy = null; item.before_snapshot.acceptedAt = null; item.before_snapshot.receiptName = null;
    if (state === "pending") item.decision = null; else item.decision!.lines = [];
    const plan = await composeIssuance(source, "a".repeat(64), emission), text = await plain(plan.bytes);
    expect(plan.semanticFacts?.["material/0/received"]).toBe("Não confirmado");
    expect(plan.semanticFacts?.["regularization/0/execution"]).toBe("Sem movimentação de estoque identificada neste procedimento.");
    expect(plan.semanticFacts?.["regularization/0/line/0/after"]).toBe("Conciliação após o procedimento: 0 unidade · Trânsito restante: 3 unidade");
    expect(text).not.toContain(compact("RECEBIMENTO CONFIRMADO"));
  }
}, 30000);
