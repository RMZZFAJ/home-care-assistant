import { test, expect } from "@playwright/test";
import { decisionFixture, decisionFacts, decisionReason } from "../integration/com-decision-fixtures.mjs";
import { fixtures, rpc } from "../integration/v4-fixtures.mjs";
import { openDocumentMore } from "./document-sections";
import { loginDecision, noPrivateWrites, privateFormCount, confirmedOutcome, loseDecisionResponse } from "./l1-decision-policy";
import { audit } from "./accessibility-audit";
import { arrivalCard, chooseArrivalAction, confirmArrivalReview, openArrivalReview } from "./purchase-arrival-review";
test.setTimeout(150_000);
for (const purpose of ["validate_receipt", "reject_receipt", "close_expectation", "cancel"] as const) test(`COM ${purpose}: seleção e justificativa só produzem um ato depois da confirmação, sem rascunho`, async ({ page }) => {
 const f = await decisionFixture(purpose !== "cancel"), before = decisionFacts(f), writes = noPrivateWrites(page);
 await loginDecision(page, fixtures.adminA.email, f.patient); await page.goto("/fichas/" + f.document.id);
 if (purpose === "validate_receipt" || purpose === "reject_receipt") {
   const panel = await openArrivalReview(page), selected = arrivalCard(panel, f.secondReceipt.id);
   await arrivalCard(panel, f.firstReceipt.id).getByRole("switch").click();
   if (purpose === "reject_receipt") await chooseArrivalAction(selected, "Recusar chegada", decisionReason);
   expect(decisionFacts(f)).toBe(before); expect(privateFormCount(f.patient)).toBe("0");
   await audit(page, "Conferência COM sem rascunho");
   const { receipt } = await confirmArrivalReview(page, panel, true);
   expect(receipt.results).toMatchObject([{ receiptId: f.secondReceipt.id, status: purpose === "validate_receipt" ? "approved" : "rejected" }]);
 } else if (purpose === "cancel") {
   await openDocumentMore(page);
   await page.getByRole("menuitem", { name: "Cancelar ficha", exact: true }).click();
   const review = page.getByRole("dialog", { name: "Revisar e cancelar", exact: true });
   await review.getByRole("textbox", { name: "Motivo do cancelamento", exact: true }).fill(decisionReason);
   expect(decisionFacts(f)).toBe(before); expect(privateFormCount(f.patient)).toBe("0");
   await audit(page, "Cancelamento de COM sem rascunho");
   const endpoint = `/api/documents/${f.document.id}/decisions`;
   const packets = await loseDecisionResponse(page, endpoint);
   await page.route(`**${endpoint}/reconcile`, route => route.fulfill({ status: 503, json: {
     code: "DATABASE_UNAVAILABLE", error: "Consulta fictícia indisponível.",
   } }), { times: 1 });
   await review.getByRole("button", { name: "Confirmar cancelamento", exact: true }).click();
   const failure = page.getByRole("dialog", { name: "Não foi possível cancelar a ficha", exact: true });
   await expect(failure).toHaveAttribute("data-outcome", "uncertain");
   const receipt = page.waitForResponse(response => response.url().endsWith(`${endpoint}/reconcile`));
   await failure.getByRole("button", { name: "Conferir resultado", exact: true }).click();
   expect((await (await receipt).json()).data).toMatchObject({ state: "applied", documentId: f.document.id });
   expect(packets).toHaveLength(1);
   await expect(page.getByRole("dialog", { name: "Ficha cancelada", exact: true })).toBeVisible();
 } else {
   await openDocumentMore(page);
   await page.getByRole("menuitem", { name: "Encerrar expectativa restante", exact: true }).click();
   await page.getByRole("textbox", { name: "Motivo / justificativa", exact: true }).fill(decisionReason);
   await page.getByRole("checkbox", { name: /Conferi o resumo e confirmo dispensar/ }).check();
   expect(decisionFacts(f)).toBe(before); expect(privateFormCount(f.patient)).toBe("0");
   await page.getByRole("button", { name: "Revisar operação", exact: true }).click(); await audit(page, "L1 decisão COM sem rascunho");
   await confirmedOutcome(page, f.document.id, "Confirmar encerramento da expectativa");
 }
 expect(decisionFacts(f)).not.toBe(before); expect(writes).toEqual([]); expect(privateFormCount(f.patient)).toBe("0");
 if (purpose === "validate_receipt" || purpose === "reject_receipt") { const current = await rpc(f.admin, "operational_document", { p_id: f.document.id }); expect(current.receipts.find((row: { id: string }) => row.id === f.secondReceipt.id).state).toBe(purpose === "validate_receipt" ? "approved" : "rejected"); }
});
