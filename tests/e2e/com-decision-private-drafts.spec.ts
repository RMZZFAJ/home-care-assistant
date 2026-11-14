import { test, expect } from "@playwright/test";
import { decisionFixture, decisionFacts, decisionReason } from "../integration/com-decision-fixtures.mjs";
import { fixtures, rpc } from "../integration/v4-fixtures.mjs";
import { openDocumentMore, selectDocumentSection } from "./document-sections";
import { loginDecision, noPrivateWrites, privateFormCount, confirmedOutcome } from "./l1-decision-policy";
import { audit } from "./accessibility-audit";
test.setTimeout(150_000);
for (const purpose of ["validate_receipt", "reject_receipt", "close_expectation", "cancel"] as const) test(`COM ${purpose}: seleção e justificativa só produzem um ato depois da confirmação, sem rascunho`, async ({ page }) => {
 const f = await decisionFixture(purpose !== "cancel"), before = decisionFacts(f), writes = noPrivateWrites(page);
 await loginDecision(page, fixtures.adminA.email, f.patient); await page.goto("/fichas/" + f.document.id);
 const more = ["close_expectation", "cancel"].includes(purpose);
 if (more) await openDocumentMore(page); else await selectDocumentSection(page, "workflow");
 const label = purpose === "validate_receipt" ? "Validar recebimento" : purpose === "reject_receipt" ? "Rejeitar recebimento" : purpose === "close_expectation" ? "Encerrar expectativa restante" : "Solicitar cancelamento";
 await page.getByRole(more ? "menuitem" : "button", { name: label, exact: true }).click();
 if (purpose === "validate_receipt" || purpose === "reject_receipt") await page.getByRole("combobox", { name: "Recebimento pendente", exact: true }).selectOption(f.secondReceipt.id);
 if (purpose !== "validate_receipt") await page.getByRole("textbox", { name: "Motivo / justificativa", exact: true }).fill(decisionReason);
 if (purpose === "close_expectation") await page.getByRole("checkbox", { name: /Conferi o resumo e confirmo dispensar/ }).check();
 expect(decisionFacts(f)).toBe(before); expect(privateFormCount(f.patient)).toBe("0");
 await page.getByRole("button", { name: "Revisar operação", exact: true }).click(); await audit(page, "L1 decisão COM sem rascunho");
 await confirmedOutcome(page, f.document.id, purpose === "close_expectation" ? "Confirmar encerramento da expectativa" : "Confirmar operação");
 expect(decisionFacts(f)).not.toBe(before); expect(writes).toEqual([]); expect(privateFormCount(f.patient)).toBe("0");
 if (purpose === "validate_receipt" || purpose === "reject_receipt") { const current = await rpc(f.admin, "operational_document", { p_id: f.document.id }); expect(current.receipts.find((row: { id: string }) => row.id === f.secondReceipt.id).state).toBe(purpose === "validate_receipt" ? "approved" : "rejected"); }
});
