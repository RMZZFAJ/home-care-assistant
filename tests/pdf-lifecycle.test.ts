import { currentPdfFixture } from "./support/current-pdf-fixture";
import { expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { PDF } from "@libpdf/core";
import { composeIssuance, validateIssuanceContent } from "@/lib/server/pdf-content";
import { requirePdfLifecycleFacts, type PdfLifecycleFacts } from "@/lib/documents/pdf-lifecycle";
import { purchaseEntrySource } from "./support/purchase-entry-balance-fixtures";
import { legacyFidelitySnapshots, fidelityEmission } from "./support/pdf-fidelity-fixtures";
const id = (n: number) => "90000000-0000-4000-8000-" + String(n).padStart(12, "0");
function source() {
  const data = structuredClone(legacyFidelitySnapshots.find(s => s.type === "REQ")!);
  data.id = id(1); data.status = "cancelled"; data.version = 6;
  data.documentFacts = { schemaVersion: 1, deliveryResolutions: [], purchaseReceiptEvents: [] };
  data.scienceEvents = [{ actor_name: "Ciência original da emissão", mode: "express", created_at: "2026-11-01T12:30:00Z" }];
  data.lifecycleFacts = {
    schemaVersion: 1, documentId: id(1), version: 6,
    cancellation: {
      state: "recorded", act: { id: id(2), version: 3, actorId: id(3), actorName: "Pessoa que cancelou", recordedAt: "2026-11-11T12:00:00Z", reason: "Motivo original preservado. " + "Observação extensa para manter todos os trechos na paginação. ".repeat(16) + "Final integral do motivo." },
      acknowledgements: [{ id: id(4), version: 4, actorId: id(5), actorName: "Ciência própria do cancelamento", recordedAt: "2026-11-11T13:00:00Z" }]
    },
    complements: [{
      id: id(6), eventId: id(7), role: "supplement", version: 5, accessible: true, actorId: id(8), actorName: "Autora do vínculo", recordedAt: "2026-11-11T14:00:00Z", reason: "Vínculo financeiro reservado 71357",
      document: { id: id(9), type: "COM", code: "COM-0473", protocol: "COM-PROTOCOLO-PRESERVADO", version: 7, hash: "b".repeat(64) }
    }],
  } satisfies PdfLifecycleFacts;
  return data;
}
const emission = { ...fidelityEmission, rendererRevision: 16 as const };
const compact = (s: string) => s.normalize("NFKC").replaceAll(/\s/g, "");
async function text(bytes: Uint8Array) { return compact((await PDF.load(bytes)).extractText().flatMap(p => p.lines.map(l => l.spans.flatMap(s => s.chars.map(c => c.char)).join(""))).join(" ")); }
it("V15 prints separate cancellation, original SCI, own awareness and exact complementary reference with long reasons intact", async () => {
  const s = source(), plan = await composeIssuance(currentPdfFixture(s), "a".repeat(64), emission);
  expect((await validateIssuanceContent(plan.bytes, plan)).passed).toBe(true);
  const actual = await text(plan.bytes);
  for (const value of ["Pessoa que cancelou", "Final integral do motivo.", "Ciência original da emissão", "Ciência própria do cancelamento", "Autora do vínculo", "COM-0473", "Vínculo financeiro reservado 71357"])
    expect(actual).toContain(compact(value));
  const altered = structuredClone(s); const facts = altered.lifecycleFacts as PdfLifecycleFacts;
  if (facts.cancellation.state === "recorded") facts.cancellation.act.reason = "Outro motivo substituído.";
  const different = await composeIssuance(currentPdfFixture(altered), "a".repeat(64), emission);
  await expect(validateIssuanceContent(plan.bytes, different)).rejects.toMatchObject({ code: "CONTENT_INVALID" });
  mkdirSync("output/pdf/phase-d", { recursive: true }); writeFileSync("output/pdf/phase-d/lifecycle-controlled.pdf", plan.bytes);
}, 30000);
it("V15 omits restricted peer details rather than hiding them and refuses payload under the restricted flag", async () => {
  const s = source(), f = s.lifecycleFacts as PdfLifecycleFacts, original = f.complements[0];
  f.complements = [{ id: original.id, eventId: original.eventId, role: original.role, version: original.version, accessible: false }];
  const plan = await composeIssuance(currentPdfFixture(s), "a".repeat(64), emission), actual = await text(plan.bytes);
  expect(actual).toContain("Acessorestrito"); expect(actual).not.toContain("COM-0473"); expect(actual).not.toContain("71357");
  f.complements = [{ ...original, accessible: false } as unknown as PdfLifecycleFacts["complements"][number]];
  await expect(composeIssuance(s, "a".repeat(64), emission)).rejects.toMatchObject({ code: "CONTENT_INVALID" });
}, 30000);
it("V15 refuses a foreign version, a future act, acknowledgements preceding cancellation and a self-reference", () => {
  for (const change of ["document", "version", "act", "ack", "self"]) {
    const s = source(), f = s.lifecycleFacts as PdfLifecycleFacts;
    if (change === "document") f.documentId = id(99);
    if (change === "version") f.version++;
    if (f.cancellation.state === "recorded") { if (change === "act") f.cancellation.act.version = 8; if (change === "ack") f.cancellation.acknowledgements[0].version = 2; }
    if (change === "self" && f.complements[0].accessible) f.complements[0].document.id = s.id;
    expect(() => requirePdfLifecycleFacts(f, s)).toThrow();
  }
});
it("V15 distinguishes missing historical cancellation and absent awareness without inventing a person or decision", async () => {
  const s = source(), f = s.lifecycleFacts as PdfLifecycleFacts;
  f.cancellation = { state: "unavailable", act: null, acknowledgements: [] }; f.complements = [];
  const plan = await composeIssuance(currentPdfFixture(s), "a".repeat(64), emission), actual = await text(plan.bytes);
  expect(actual).toContain(compact("ato original não preservado")); expect(actual).toContain(compact("Nenhuma ciência presumida"));
  const older = structuredClone(s); delete older.lifecycleFacts;
  await expect(composeIssuance(older, "a".repeat(64), emission)).rejects.toMatchObject({ code: "CONTENT_INVALID" });
  const compatible = await composeIssuance(currentPdfFixture(older), "a".repeat(64), { ...emission, rendererRevision: 16 });
  expect(compatible.semanticFacts?.["fidelity/lifecycle/cancellation/state"]).toBeUndefined();
}, 30000);

it("V15 preserves the existing known COM and BAL post-operation balances alongside lifecycle facts", async () => {
  const purchase = purchaseEntrySource(), com = purchase.source;
  com.lifecycleFacts = { schemaVersion: 1, documentId: com.id, version: com.version, cancellation: { state: "not_cancelled", act: null, acknowledgements: [] }, complements: [] };
  const comPlan = await composeIssuance(currentPdfFixture(com), "a".repeat(64), emission);
  expect(comPlan.semanticFacts!["material/0/balance"]).toContain("38,125 un");
  const bal = structuredClone(legacyFidelitySnapshots.find(s => s.type === "BAL")!);
  bal.id = id(11); bal.version = 4; bal.status = "approved"; bal.workflow = { ...bal.workflow, countVersion: 1 };
  bal.documentFacts = { schemaVersion: 1, deliveryResolutions: [], purchaseReceiptEvents: [] };
  bal.lines = [{ id: id(12), product_id: id(13), name_snapshot: "Material conhecido", unit_snapshot: "un", quantity: "37.125", metadata: { expectedQuantity: "1" } }];
  bal.balanceApplication = { state: "applied", id: id(14), countVersion: 1, documentVersion: 3, actorId: id(15), actorName: "Autora da aplicação", appliedAt: "2026-11-11T12:00:00Z", lines: [{ lineId: id(12), state: "known", quantity: "37.125" }] };
  bal.balanceReviewCorrections = []; if (bal.balanceReviews) bal.balanceReviews.reviews = [];
  bal.lifecycleFacts = { schemaVersion: 1, documentId: bal.id, version: bal.version, cancellation: { state: "not_cancelled", act: null, acknowledgements: [] }, complements: [] };
  const balPlan = await composeIssuance(currentPdfFixture(bal), "a".repeat(64), emission);
  expect(balPlan.semanticFacts!["material/0/balance"]).toContain("37,125 un");
}, 30000);
