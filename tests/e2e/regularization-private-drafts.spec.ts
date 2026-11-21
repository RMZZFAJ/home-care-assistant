import { test, expect } from "@playwright/test";
import { regularizationFixture, regularizationFacts, privateReason } from "../integration/regularization-draft-fixtures.mjs";
import { fixtures } from "../integration/v4-fixtures.mjs";
import { selectDocumentSection } from "./document-sections";
import { loginDecision, noPrivateWrites, privateFormCount, confirmedOutcome } from "./l1-decision-policy";
import { audit } from "./accessibility-audit";
test.setTimeout(150_000);
for (const scenario of [
 { purpose: "approve_regularization", action: "Conferir proposta", confirm: "Aprovar encerramento administrativo" },
 { purpose: "reject_regularization", action: "Rejeitar proposta", confirm: "Registrar decisão sem movimentar" },
 { purpose: "withdraw_regularization", action: "Retirar minha proposta", confirm: "Registrar decisão sem movimentar" },
 { purpose: "record_regularization_finding", action: "Registrar apuração própria", confirm: "Registrar minha apuração" },
]) test(`ENT ${scenario.purpose}: mantém autoria e apuração, confere resultado oficial sem rascunho de decisão`, async ({ page }) => {
 const f = await regularizationFixture(scenario.purpose), before = regularizationFacts(f), writes = noPrivateWrites(page);
 await loginDecision(page, fixtures[f.role].email, f.patient); await page.goto("/fichas/" + f.document.id); await selectDocumentSection(page, "workflow");
 await page.getByRole("button", { name: scenario.action, exact: true }).click();
 await page.getByLabel(scenario.purpose === "record_regularization_finding" ? "Relato da sua apuração" : "Sua justificativa", { exact: true }).fill(privateReason);
 await expect(page.getByRole("button", { name: "Salvar preenchimento privado", exact: true })).toHaveCount(0);
 await page.getByRole("button", { name: "Revisar ato administrativo", exact: true }).click(); expect(regularizationFacts(f)).toBe(before); await audit(page, "L1 regularização sem rascunho");
 await confirmedOutcome(page, f.document.id, scenario.confirm); expect(regularizationFacts(f)).not.toBe(before); expect(privateFormCount(f.patient)).toBe("0"); expect(writes).toEqual([]);
});
