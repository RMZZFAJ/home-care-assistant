import { expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { PDF } from "@libpdf/core";
import { composeIssuance, validateIssuanceContent } from "@/lib/server/pdf-content";
import type { DocumentSnapshot } from "@/lib/server/operational-pdf";
import type { PurchaseEntryBalances } from "@/lib/validation/purchase-entry-balances";
import { purchaseEntrySource } from "./support/purchase-entry-balance-fixtures";
import { legacyFidelitySnapshots, fidelityEmission } from "./support/pdf-fidelity-fixtures";

const emission = { ...fidelityEmission, rendererRevision: 16 as const };
const id = (n: number) => "92000000-0000-4000-8000-" + String(n).padStart(12, "0");
const compact = (text: string) => text.normalize("NFKC").replaceAll(/\s/g, "");
const plain = async (bytes: Uint8Array) => compact((await PDF.load(bytes)).extractText().flatMap(page => page.lines.map(line => line.spans.flatMap(span => span.chars.map(char => char.char)).join(""))).join(" "));
function lifecycle(source: DocumentSnapshot) {
  source.lifecycleFacts = { schemaVersion: 1, documentId: source.id, version: source.version, cancellation: { state: "not_cancelled", act: null, acknowledgements: [] }, complements: [] };
  return source;
}
function balance() {
  const source = structuredClone(legacyFidelitySnapshots.find(row => row.type === "BAL")!);
  source.id = id(1); source.version = 3; source.status = "approved";
  source.workflow = { countVersion: 1, reviewPolicy: { balReview: "optional" } };
  source.lines = [{ id: id(2), name_snapshot: "Material contado com precisão", unit_snapshot: "un", category_snapshot: "higiene", quantity: "8.125", metadata: { expectedQuantity: "7.25" } }];
  source.balanceReviews = undefined;
  source.balanceApplication = { state: "applied", id: id(3), countVersion: 1, documentVersion: 2, actorId: id(4), actorName: "Pessoa que aplicou a contagem", appliedAt: "2026-11-11T15:00:00Z", lines: [{ lineId: id(2), state: "known", quantity: "8.125" }] };
  source.balanceReviewCorrections = [];
  source.documentFacts = { schemaVersion: 1, deliveryResolutions: [], purchaseReceiptEvents: [] };
  source.payload = { notes: "Observação física original preservada integralmente." };
  return lifecycle(source);
}

it("approved COM retains each parcel, different validators and the latest per-material balance without replacing it with a current sum", async () => {
  const { source } = purchaseEntrySource(); lifecycle(source);
  const plan = await composeIssuance(source, "a".repeat(64), emission), text = await plain(plan.bytes);
  for (const fact of ["Compra de materiais", "Pessoa da primeira parcela", "Responsável pela primeira parcela", "Responsável pela validação 1", "Responsável pela validação 2", "38,125 un", "34 un", "3,125 un", "4 un", "Previsão e aquisição", "Chegadas e validação por parcela", "Registro documental preservado."])
    expect(text, fact).toContain(compact(fact));
  expect(plan.semanticFacts?.["material/0/balance"]).toContain("38,125 un");
  expect(plan.semanticFacts?.["material/1/balance"]).toContain("34 un");
  const altered = structuredClone(source); (altered.purchaseEntryBalances as PurchaseEntryBalances)[0].quantity = "71.125";
  const different = await composeIssuance(altered, "a".repeat(64), emission);
  await expect(validateIssuanceContent(plan.bytes, different)).rejects.toMatchObject({ code: "CONTENT_INVALID" });
  mkdirSync("output/pdf/approved", { recursive: true }); writeFileSync("output/pdf/approved/com-controlled.pdf", plan.bytes);
}, 30000);

it("approved COM omits a restricted balance while preserving parcel facts and the distinct donation title", async () => {
  const { source } = purchaseEntrySource(); lifecycle(source); source.payload.origin = "donation";
  const facts = source.purchaseEntryBalances as PurchaseEntryBalances;
  source.purchaseEntryBalances = facts.map(fact => ({ ...fact, state: "restricted", quantity: null }));
  const plan = await composeIssuance(source, "a".repeat(64), emission), text = await plain(plan.bytes);
  expect(text).toContain(compact("Doação de materiais")); expect(text).toContain(compact("Acesso restrito"));
  expect(text).not.toContain(compact("38,125")); expect(text).not.toContain(compact("34 un"));
  expect(text).toContain(compact("Responsável pela validação 2"));
  writeFileSync("output/pdf/approved/com-restricted.pdf", plan.bytes);
}, 30000);

it("approved BAL preserves reference, counted quantity and the actual post-application balance separately with no seal", async () => {
  const source = balance(), before = JSON.stringify(source);
  const plan = await composeIssuance(source, "a".repeat(64), emission), text = await plain(plan.bytes);
  expect(JSON.stringify(source)).toBe(before);
  for (const fact of ["Balanço do estoque da equipe", "7,25 un", "8,125 un", "Pessoa que aplicou a contagem", "Observação física original preservada integralmente.", "Revisão facultativa não realizada"])
    expect(text, fact).toContain(compact(fact));
  expect(plan.semanticFacts?.["material/0/reference"]).toBe("7,25 un");
  expect(plan.semanticFacts?.["material/0/counted"]).toBe("8,125 un");
  expect(plan.semanticFacts?.["material/0/balance"]).toContain("8,125 un");
  expect(text).not.toContain(compact("Família ciente")); expect(text).not.toContain(compact("Entrada validada"));
  writeFileSync("output/pdf/approved/bal-controlled.pdf", plan.bytes);
}, 30000);

it("approved BAL distinguishes restricted, unapplied and unavailable balances without turning any state into zero", async () => {
  for (const state of ["restricted", "not_applied", "unavailable"] as const) {
    const source = balance(); source.status = "submitted";
    if (state === "restricted") source.balanceApplication = { ...(source.balanceApplication as object), lines: [{ lineId: id(2), state: "restricted", quantity: null }] };
    else source.balanceApplication = { state, lines: [] };
    const plan = await composeIssuance(source, "a".repeat(64), emission);
    expect(plan.semanticFacts?.["material/0/balance"]).toContain({ restricted: "Acesso restrito", not_applied: "Não aplicado", unavailable: "Não disponível no registro" }[state]);
    expect(plan.semanticFacts?.["material/0/balance"]).not.toContain("0 un");
  }
}, 30000);
