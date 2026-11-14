import { test, expect } from "@playwright/test";
import { entOperationFixture, entFacts, entReason } from "../integration/ent-operation-fixtures.mjs";
import { fixtures, rpc } from "../integration/v4-fixtures.mjs";
import { openDocumentMore } from "./document-sections";
import { loginDecision, noPrivateWrites, privateFormCount, confirmedOutcome } from "./l1-decision-policy";
import { audit } from "./accessibility-audit";
test.setTimeout(150_000);
for (const mode of ["pending", "accepted"] as const) test(`ENT cancelamento ${mode}: fechar a conferência preserva fatos; confirmar consulta resultado sem salvar decisão`, async ({ page }) => {
 const f = await entOperationFixture(mode), writes = noPrivateWrites(page), before = entFacts(f);
 await loginDecision(page, fixtures.adminA.email, f.patient); await page.goto("/fichas/" + f.document.id); await openDocumentMore(page); await page.getByRole("menuitem", { name: "Solicitar cancelamento", exact: true }).click();
 await page.getByRole("textbox", { name: "Motivo / justificativa", exact: true }).fill(entReason);
 await page.getByRole("button", { name: "Revisar operação", exact: true }).click();
 await page.getByRole("dialog", { name: "Revisar operação definitiva", exact: true }).press("Escape");
 expect(entFacts(f)).toBe(before); await expect(page.getByRole("textbox", { name: "Motivo / justificativa", exact: true })).toHaveValue(entReason);
 await page.getByRole("button", { name: "Revisar operação", exact: true }).click(); await audit(page, "L1 ENT cancelamento sem rascunho");
 await confirmedOutcome(page, f.document.id, "Confirmar operação"); expect(privateFormCount(f.patient)).toBe("0"); expect(writes).toEqual([]);
 expect((await rpc(f.admin, "operational_document", { p_id: f.document.id })).status).toBe(mode === "pending" ? "cancelled" : "cancellation_pending");
});
