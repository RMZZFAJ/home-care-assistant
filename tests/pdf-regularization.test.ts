import { currentPdfFixture } from "./support/current-pdf-fixture";
import { it, expect } from "vitest";
import { composeIssuance, validateIssuanceContent } from "@/lib/server/pdf-content";
import { regularizationSnapshot } from "./support/pdf-regularization-fixtures";
import { fidelityEmission } from "./support/pdf-fidelity-fixtures";

it("refuses the retired V7 regularization painter", async () => {
  await expect(composeIssuance(currentPdfFixture(regularizationSnapshot()), "c".repeat(64), { ...fidelityEmission, rendererRevision: 7 })).rejects.toMatchObject({ code: "CONTENT_INVALID" });
});

const emission = { ...fidelityEmission, rendererRevision: 16 as const };
const prefix = "regularization/0";
it("V8 identifies the original receipt, proposer, independent decider and transactional executor alongside before/after quantities", async () => {
  const source = regularizationSnapshot(), plan = await composeIssuance(currentPdfFixture(source), "c".repeat(64), emission);
  const facts = plan.semanticFacts!;
  expect(facts[prefix + "/proposer"]).toContain("Proponente preservada");
  expect(facts[prefix + "/reviewer"]).toContain("Conferente preservada");
  expect(facts[prefix + "/originalReceipt"]).toContain("Recebedora original preservada");
  expect(facts[prefix + "/execution"]).toContain("Movimentações administrativas registradas");
  expect(facts[prefix + "/line/0/before"]).toContain("Trânsito anterior: 3 unidade");
  expect(facts[prefix + "/decisionReason"]).toContain("duas unidades apuradas");
  expect(facts[prefix + "/line/0/before"]).toBe("Conciliação anterior: 0 unidade · Trânsito anterior: 3 unidade");
  expect(facts[prefix + "/line/0/after"]).toBe("Conciliação após o procedimento: 2 unidade · Trânsito restante: 1 unidade");
  const extracted = plan.runs.map(r => r.text).join(" ");
  for (const fact of ["Situação física desconhecida", "Recebimento pessoal original preservado", "Decisão independente limita os efeitos às duas unidades apuradas"]) expect(extracted).toContain(fact);
  expect(source.lines[0].accepted_quantity).toBe("2");
}, 30000);

it("pending, rejected and withdrawn proposals never present their suggested quantities as executed stock", async () => {
  for (const state of ["pending", "rejected", "withdrawn", "obsolete"] as const) {
    const source = regularizationSnapshot(), item = source.deliveryRegularization!.cases[0];
    item.state = state;
    if (state === "pending") item.decision = null;
    else item.decision!.lines = [];
    item.proposal.lines[0].movementIds = [];
    const plan = await composeIssuance(currentPdfFixture(source), "c".repeat(64), emission);
    expect(plan.semanticFacts![prefix + "/line/0/after"]).toBe("Conciliação após o procedimento: 0 unidade · Trânsito restante: 3 unidade");
    expect(plan.semanticFacts![prefix + "/execution"]).toBe("Sem movimentação de estoque identificada neste procedimento.");
    expect(plan.runs.map(r => r.text).join(" ")).not.toContain("Efeitos administrativos abaixo não alteram");
  }
}, 30000);

it("an approved unknown physical outcome preserves transit without inventing an executor or a personal receipt", async () => {
  const source = regularizationSnapshot(), item = source.deliveryRegularization!.cases[0], line = item.proposal.lines[0];
  Object.assign(line, { receivedQuantity: "0", returnedQuantity: "0", missingQuantity: "0", unknownQuantity: "3", movementIds: [] });
  item.proposal.unknownQuantity = "3";
  item.before_snapshot.acceptedBy = null; item.before_snapshot.acceptedAt = null; item.before_snapshot.receiptName = null;
  const plan = await composeIssuance(currentPdfFixture(source), "c".repeat(64), emission);
  expect(plan.semanticFacts![prefix + "/line/0/after"]).toBe("Conciliação após o procedimento: 0 unidade · Trânsito restante: 3 unidade");
  expect(plan.semanticFacts![prefix + "/originalReceipt"]).toBe("Sem recebimento pessoal declarado no registro original.");
  expect(plan.semanticFacts![prefix + "/execution"]).toBe("Sem movimentação de estoque identificada neste procedimento.");
}, 30000);

it("keeps the final line of long technical evidence and refuses a fact moved to an unrelated semantic region", async () => {
  const source = regularizationSnapshot(), item = source.deliveryRegularization!.cases[0];
  item.proposal.basis = "Ressalva preservada da conferência. ".repeat(45) + "FIM DA BASE FÍSICA";
  const plan = await composeIssuance(currentPdfFixture(source), "c".repeat(64), emission);
  expect(plan.runs.map(r => r.text).join(" ")).toContain("FIM DA BASE FÍSICA");
  expect(Math.max(...plan.runs.map(r => r.page))).toBeGreaterThan(0);
  await expect(validateIssuanceContent(plan.bytes, { ...plan, runs: plan.runs.map(r => r.factGroup === prefix + "/proposer" ? { ...r, factGroup: prefix + "/reviewer" } : r) })).rejects.toMatchObject({ code: "CONTENT_INVALID" });
  await expect(validateIssuanceContent(plan.bytes, { ...plan, semanticFacts: { ...plan.semanticFacts, [prefix + "/line/0/after"]: "3 unidade · 0 unidade" } })).rejects.toMatchObject({ code: "CONTENT_INVALID" });
}, 30000);
