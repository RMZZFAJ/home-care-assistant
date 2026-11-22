import { test, expect } from "@playwright/test";
import { transferDecisionFixture, decisionReason, decisionFacts } from "../integration/transfer-decision-draft-fixtures.mjs";
import { transferActionLabels } from "../../src/lib/forms/transfer-decision-draft";
import { selectDocumentSection } from "./document-sections";
import { loginDecision, noPrivateWrites, privateFormCount, confirmedOutcome } from "./l1-decision-policy";
import { audit } from "./accessibility-audit";
test.setTimeout(150_000);
test("declaração legada mantém a referência histórica e dispensa decisão prévia na tela", async ({ page }) => {
  const f = await transferDecisionFixture("agree"), before = decisionFacts(f), writes = noPrivateWrites(page);
  await loginDecision(page, f.writer.email, f.patient);
  await page.goto("/fichas/" + f.document.id);
  await selectDocumentSection(page, "workflow");
  await expect(page.getByRole("region", { name: "Expedição e histórico da transferência" })).toContainText("Contraparte designada para concordância");
  for (const action of ["agree", "decline"] as const) {
    await expect(page.getByRole("button", { name: transferActionLabels[action], exact: true })).toHaveCount(0);
  }
  expect(decisionFacts(f)).toBe(before);
  expect(writes).toEqual([]);
});

for (const action of ["withdraw", "dispatch"] as const) test(`transferência ${action}: fatos são conferidos antes do ato, sem rascunho de decisão ou duplicação`, async ({ page }) => {
  const f = await transferDecisionFixture(action), before = decisionFacts(f), count = privateFormCount(f.patient), writes = noPrivateWrites(page);
  await loginDecision(page, f.writer.email, f.patient); await page.goto("/fichas/" + f.document.id); await selectDocumentSection(page, "workflow");
  await page.getByRole("button", { name: transferActionLabels[action], exact: true }).click();
  if (action !== "dispatch") await page.getByRole("textbox", { name: "Sua justificativa para este ato", exact: true }).fill(decisionReason);
  await page.getByRole("button", { name: "Revisar meu ato", exact: true }).click();
  expect(decisionFacts(f)).toBe(before); await audit(page, "L1 ato de transferência sem rascunho");
  await confirmedOutcome(page, f.document.id, "Confirmar " + (action === "dispatch" ? "expedição" : "decisão"));
  expect(decisionFacts(f)).not.toBe(before); expect(privateFormCount(f.patient)).toBe(count); expect(writes).toEqual([]);
});
