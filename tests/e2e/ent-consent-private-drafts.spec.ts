import { test, expect } from "@playwright/test";
import { consentFixture } from "../integration/ent-consent-fixtures.mjs";
import { entFacts, entReason } from "../integration/ent-operation-fixtures.mjs";
import { fixtures } from "../integration/v4-fixtures.mjs";
import { selectDocumentSection } from "./document-sections";
import { loginDecision, noPrivateWrites, privateFormCount, confirmedOutcome } from "./l1-decision-policy";
import { audit } from "./accessibility-audit";
test.setTimeout(150_000);
test("ENT consentimento mantém devolução física e ciência separadas, sem salvar campos ou repetir estoque após resposta perdida", async ({ page }) => {
 const f = await consentFixture(), before = entFacts(f), writes = noPrivateWrites(page);
 await loginDecision(page, fixtures.professional.email, f.patient); await page.goto("/fichas/" + f.document.id); await selectDocumentSection(page, "workflow");
 await page.getByRole("button", { name: "Consentir e reconciliar cancelamento", exact: true }).click();
 for (const line of f.document.lines) await page.getByRole("textbox", { name: `Devolução física real · ${line.name_snapshot} · ${line.unit_snapshot}`, exact: true }).fill("2");
 await page.getByRole("textbox", { name: "Motivo / justificativa", exact: true }).fill(entReason);
 expect(entFacts(f)).toBe(before); await page.getByRole("button", { name: "Revisar operação", exact: true }).click(); await audit(page, "L1 consentimento sem rascunho");
 await confirmedOutcome(page, f.document.id, "Confirmar operação"); expect(privateFormCount(f.patient)).toBe("0"); expect(writes).toEqual([]); expect(entFacts(f)).not.toBe(before);
});
