import { currentPdfFixture } from "./support/current-pdf-fixture";
import { it, expect } from "vitest";
import { composeIssuance, validateIssuanceContent } from "@/lib/server/pdf-content";
import { regularizationSnapshot } from "./support/pdf-regularization-fixtures";
import { fidelityEmission } from "./support/pdf-fidelity-fixtures";

function terminalEnt(state: "cancelled" | "administratively_closed") {
  const source = regularizationSnapshot(); source.status = state; source.workflow = {};
  source.lines[0].accepted_quantity = "0"; source.lines[0].reconciled_quantity = "0";
  if (state === "cancelled") source.deliveryRegularization = null;
  else {
    const item = source.deliveryRegularization!.cases[0], line = item.proposal.lines[0];
    item.before_snapshot.acceptedBy = null; item.before_snapshot.acceptedAt = null; item.before_snapshot.receiptName = null;
    Object.assign(line, { acceptedQuantity: "0", pendingQuantity: "5", receivedQuantity: "0", returnedQuantity: "0", missingQuantity: "0", unknownQuantity: "5", movementIds: [] });
    item.proposal.unknownQuantity = "5";
  }
  return source;
}
for (const state of ["cancelled", "administratively_closed"] as const) it(`refuses retired experimental renderers for ${state}`, async () => {
  for (const rendererRevision of [7, 8]) await expect(composeIssuance(currentPdfFixture(terminalEnt(state)), "c".repeat(64), { ...fidelityEmission, rendererRevision })).rejects.toMatchObject({ code: "CONTENT_INVALID" });
});

for (const status of ["cancelled", "administratively_closed", "confirmed", "received", "cancellation_pending", "disputed", "pending_receipt", "legacy_unknown"]) for (const personal of [false, true]) it(`V9 ${status} with personal receipt=${personal} preserves facts without an invented task`, async () => {
  const source = terminalEnt(status === "administratively_closed" ? status : "cancelled"); source.status = status;
  source.workflow = personal ? { acceptedAt: "2026-11-02T12:00:00Z" } : {};
  const plan = await composeIssuance(currentPdfFixture(source), "c".repeat(64), { ...fidelityEmission, rendererRevision: 16, representation: "operational" });
  const body = plan.runs.map(r => r.text).join(" ");
  if (status === "pending_receipt" && !personal) expect(body).toContain("A pessoa designada deve conferir");
  else expect(body).not.toContain("A pessoa designada deve conferir");
  if (status !== "pending_receipt") expect(body).not.toContain("Aguardando conferência");
  if (status === "administratively_closed") expect(body).toContain("Encerramento administrativo não substitui aceite pessoal");
  if (status === "cancelled") expect(body).toContain("Documento cancelado. Este exemplar não solicita novo recebimento");
  if (status === "legacy_unknown") expect(body).toContain("Situação operacional não reconhecida nesta versão");
  if (personal) expect(body).toContain("Conferência pessoal preservada em");
  expect(source.lines[0].accepted_quantity).toBe("0");
  await expect(validateIssuanceContent(plan.bytes, { ...plan, runs: plan.runs.map(r => r.factGroup === "receipt/state" ? { ...r, factGroup: "unrelated" } : r) })).rejects.toMatchObject({ code: "CONTENT_INVALID" });
}, 30000);

it("V9 historical ENT never turns an old pending status into a current personal receipt task", async () => {
  const source = terminalEnt("cancelled"); source.status = "pending_receipt";
  source.sourceFacts = { ...(source.sourceFacts as object), historical: true };
  const plan = await composeIssuance(currentPdfFixture(source), "c".repeat(64), { ...fidelityEmission, rendererRevision: 16 });
  const body = plan.runs.map(r => r.text).join(" ");
  expect(body).toContain("Nenhuma tarefa atual de recebimento é criada");
  expect(plan.semanticFacts!["receipt/state"]).toContain("Nenhuma tarefa atual de recebimento é criada");
  expect(body).not.toContain("Aguardando conferência"); expect(body).not.toContain("A pessoa designada deve conferir");
}, 30000);

it("V9 unknown status cannot resolve an inherited object property into a document label", async () => {
  const source = terminalEnt("cancelled"); source.status = "constructor";
  const plan = await composeIssuance(currentPdfFixture(source), "c".repeat(64), { ...fidelityEmission, rendererRevision: 16, representation: "operational" });
  const body = plan.runs.map(r => r.text).join(" ");
  expect(body).toContain("Situação não reconhecida nesta versão"); expect(body).not.toContain("[native code]"); expect(body).not.toContain("A pessoa designada deve conferir");
}, 30000);

for (const personal of [false, true]) it(`V9 derived native ENT keeps the old facts without a current receipt task; personal=${personal}`, async () => {
  const source = terminalEnt("cancelled"); source.status = "pending_receipt"; source.workflow = personal ? { acceptedAt: "2026-11-02T12:00:00Z" } : {};
  const plan = await composeIssuance(currentPdfFixture(source), "c".repeat(64), { ...fidelityEmission, rendererRevision: 16, representation: "derived" });
  const body = plan.runs.map(r => r.text).join(" ");
  expect(body).toContain("Esta representação descreve uma versão preservada");
  expect(body).not.toContain("A pessoa designada deve conferir"); expect(body).not.toContain("Aguardando conferência");
  if (personal) expect(body).toContain("Conferência pessoal preservada em");
}, 30000);
