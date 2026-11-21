import { currentPdfFixture } from "./support/current-pdf-fixture";
import { expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { PDF } from "@libpdf/core";
import { composeIssuance, validateIssuanceContent } from "@/lib/server/pdf-content";
import type { DocumentSnapshot } from "@/lib/server/operational-pdf";
import { fidelityEmission, legacyFidelitySnapshots } from "./support/pdf-fidelity-fixtures";

const id = (n: number) => "60000000-0000-4000-8000-" + String(n).padStart(12, "0");
const stamp = "2026-11-11T12:00:00Z";
const compact = (value: string) => value.normalize("NFKC").replaceAll(/\s/g, "");
it("preserves only the individually declared BAL opinions and their own stock-free provenance", async () => {
  const source: DocumentSnapshot = structuredClone(legacyFidelitySnapshots.find(row => row.type === "BAL")!);
  source.version = 2; source.status = "submitted";
  source.workflow = { countVersion: 1, reviewPolicy: { balReview: "required", balRequirement: "any", balApprovers: ["family"] } };
  source.documentFacts = { schemaVersion: 1, deliveryResolutions: [], purchaseReceiptEvents: [] };
  source.lines = ["Fralda preservada", "Seringa preservada", "Material sem parecer individual"].map((name, i) => ({
    id: id(i + 1), product_id: id(i + 11), name_snapshot: name, unit_snapshot: "unidade", quantity: "2", metadata: { expectedQuantity: "1" },
  }));
  const counter = { id: id(20), name: "Contadora preservada", source: "count_event", recordedAt: stamp };
  source.balanceReviewCorrections = [{reviewId:id(21),sourceLineId:id(2),sourceState:"known",acts:[]}];
  source.balanceReviews = {
    counter, countVersion: 1, notes: "Observações originais preservadas.", legacyApprovals: [],
    reviews: [{
      id: id(21), count_version: 1, counter_id: id(20), reviewer_id: id(22), reviewer_name: "Revisora independente", review_group: "family",
      comment: "Parecer próprio sem alterar a contagem.", reference_state: "current", recorded_at: stamp, reviewed_document_version: 1,
      item_results: [
        { lineId: id(1), result: "confirmed", forwarding: "none", comment: "Examinado sem diferença." },
        { lineId: id(2), result: "difference", forwarding: "adjustment", comment: "Apuração independente. ".repeat(15).trim() },
      ],
      reviewed_snapshot: {
        counter, notes: "Observações originais preservadas.", countVersion: 1,
        lines: source.lines.map(line => ({ id: String(line.id), name_snapshot: String(line.name_snapshot), unit_snapshot: String(line.unit_snapshot), quantity: String(line.quantity) })),
        referenceRevision: "1", currentRevision: "1", appliedBeforeReview: false, opinionOnly: true,
      },
    }],
  };
  const emission = { ...fidelityEmission, rendererRevision: 16 as const };
  const plan = await composeIssuance(currentPdfFixture(source), "a".repeat(64), emission);
  expect((await validateIssuanceContent(plan.bytes, plan)).passed).toBe(true);
  const text = compact((await PDF.load(plan.bytes)).extractText().flatMap(page => page.lines.map(line => line.spans.flatMap(span => span.chars.map(char => char.char)).join(""))).join(" "));
  for (const expected of ["Fralda preservada", "Seringa preservada", "Diferença apontada", "Ajuste autorizado indicado", "Não aplica nem corrige estoque.", "Observações originais preservadas."])
    expect(text).toContain(compact(expected));
  expect(Object.keys(plan.semanticFacts ?? {}).filter(key => key.includes("/item/"))).toHaveLength(2);
  expect(plan.semanticFacts?.[`fidelity/review/${id(21)}/item/${id(3)}`]).toBeUndefined();
  const altered = structuredClone(source);
  altered.balanceReviews!.reviews[0].item_results![1].forwarding = "recount";
  const wrong = await composeIssuance(currentPdfFixture(altered), "a".repeat(64), emission);
  await expect(validateIssuanceContent(plan.bytes, wrong)).rejects.toMatchObject({ code: "CONTENT_INVALID" });
  mkdirSync("output/pdf", { recursive: true });
  writeFileSync("output/pdf/bal-opinion-only-controlled.pdf", plan.bytes);
}, 30000);

it.each(["known", "restricted", "not_applied", "unavailable"] as const)("BAL application PDF preserves the %s state independently of counted or current stock", async state => {
  const source = structuredClone(legacyFidelitySnapshots.find(row => row.type === "BAL")!);
  source.version = 4; source.workflow = { ...source.workflow, countVersion: 1 };
  source.documentFacts = { schemaVersion: 1, deliveryResolutions: [], purchaseReceiptEvents: [] };
  source.lines = [{ id: id(1), product_id: id(11), name_snapshot: "Material preservado", unit_snapshot: "un", quantity: "37.125", metadata: { expectedQuantity: "1" } }];
  const effect = {
    state: "applied" as const, id: id(30), countVersion: 1, documentVersion: 3, actorId: id(22), actorName: "Responsável pela aplicação", appliedAt: stamp,
    lines: [{ lineId: id(1), state, quantity: state === "known" ? "37.125" : null }]
  };
  source.balanceApplication = state === "known" || state === "restricted" ? effect : { state, lines: [] };
  const plan = await composeIssuance(currentPdfFixture(source), "a".repeat(64), { ...fidelityEmission, rendererRevision: 16 });
  const text = compact((await PDF.load(plan.bytes)).extractText().flatMap(page => page.lines.map(line => line.spans.flatMap(span => span.chars.map(char => char.char)).join(""))).join(" "));
  const label = state === "known" ? "37,125" : state === "restricted" ? "Acesso restrito" : state === "not_applied" ? "Não aplicado" : "Não disponível no registro";
  expect(text).toContain(compact("Saldo após balanço")); expect(text).toContain(compact(label));
  if (state === "known" || state === "restricted") {
    expect(text).toContain(compact("Responsável pela aplicação"));
    expect(plan.semanticFacts?.["material/0/balance"]).toContain(label);
  } else expect(plan.semanticFacts?.["fidelity/balance/application-act"]).toBeUndefined();
  const wrong = structuredClone(source);
  wrong.balanceApplication = { ...effect, lines: [{ lineId: id(99), state: "known", quantity: "37.125" }] };
  await expect(composeIssuance(wrong, "a".repeat(64), { ...fidelityEmission, rendererRevision: 16 })).rejects.toMatchObject({ code: "CONTENT_INVALID" });
  if (state === "known") writeFileSync("output/pdf/bal-application-controlled.pdf", plan.bytes);
}, 30000);
