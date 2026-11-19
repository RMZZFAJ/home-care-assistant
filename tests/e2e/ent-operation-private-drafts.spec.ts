import { test, expect } from "@playwright/test";
import { entOperationFixture, entFacts, entReason } from "../integration/ent-operation-fixtures.mjs";
import { fixtures, rpc } from "../integration/v4-fixtures.mjs";
import { openDocumentMore } from "./document-sections";
import { loginDecision, noPrivateWrites, privateFormCount, confirmedOutcome } from "./l1-decision-policy";
import { audit } from "./accessibility-audit";
import { generatedPdf } from "./generated-pdf";
import { PDF } from "@libpdf/core";
test.setTimeout(150_000);
for (const mode of ["pending", "accepted"] as const) test(`ENT cancelamento ${mode}: fechar a conferência preserva fatos; confirmar consulta resultado sem salvar decisão`, async ({ page }, info) => {
 const f = await entOperationFixture(mode), writes = noPrivateWrites(page), before = entFacts(f);
 await loginDecision(page, fixtures.adminA.email, f.patient); await page.goto("/fichas/" + f.document.id);
 async function open() {
  await openDocumentMore(page);
  await page.getByRole("menuitem", { name: mode === "pending" ? "Cancelar ficha" : "Solicitar cancelamento", exact: true }).click();
 }
 await open();
 if (mode === "pending") {
  const review = page.getByRole("dialog", { name: "Revisar e cancelar", exact: true });
  const reason = review.getByRole("textbox", { name: "Motivo do cancelamento" });
  const submit = review.getByRole("button", { name: "Confirmar cancelamento", exact: true });
  await expect(review.getByText("Retorno à origem", { exact: true })).toHaveCount(2);
  await expect(review.getByText("0 em trânsito", { exact: true })).toHaveCount(2);
  await expect(submit).toBeDisabled();
  await expect(submit).toBeInViewport({ ratio: 1 });
  if (info.project.use.hasTouch) await info.attach("Revisão do retorno físico", {
    contentType: "image/png", body: await page.screenshot({ animations: "disabled", scale: "css" }),
  });
  await reason.fill(entReason);
  await review.getByRole("button", { name: "Voltar à ficha", exact: true }).click();
  const discard = page.getByRole("dialog", { name: "Sair sem cancelar a ficha?", exact: true });
  await discard.getByRole("button", { name: "Voltar à revisão", exact: true }).click();
  await expect(reason).toHaveValue(entReason);
  await review.getByRole("button", { name: "Voltar à ficha", exact: true }).click();
  await discard.getByRole("button", { name: "Sair e descartar", exact: true }).click();
  await expect(review).toHaveCount(0);
  expect(entFacts(f)).toBe(before);
  await open();
  await expect(reason).toHaveValue("");
  await reason.fill(entReason);
  await audit(page, "ENT cancelamento em trânsito");
  await confirmedOutcome(page, f.document.id, "Confirmar cancelamento");
  const result = page.getByRole("dialog", { name: "Ficha cancelada", exact: true });
  await expect(result).toContainText("retornaram ao estoque da família");
  await result.getByRole("button", { name: "Voltar à ficha", exact: true }).click();
  const pdf = await generatedPdf(page, "/api/documents/" + f.document.id + "/pdf");
  expect(pdf.ok(), await pdf.text()).toBe(true);
  const text = (await PDF.load(await pdf.body())).extractText().flatMap(page =>
    page.lines.flatMap(line => line.spans.flatMap(span => span.chars.map(char => char.char))),
  ).join("").normalize("NFKC").replaceAll(/\s/g, "");
  expect(text).toContain("Retorno físico antes do recebimento".replaceAll(" ", ""));
  expect(privateFormCount(f.patient)).toBe("0");
  expect(writes).toEqual([]);
  return;
 }
 await page.getByRole("textbox", { name: "Motivo / justificativa", exact: true }).fill(entReason);
 await page.getByRole("button", { name: "Revisar operação", exact: true }).click();
 await page.getByRole("dialog", { name: "Revisar operação definitiva", exact: true }).press("Escape");
 expect(entFacts(f)).toBe(before); await expect(page.getByRole("textbox", { name: "Motivo / justificativa", exact: true })).toHaveValue(entReason);
 await page.getByRole("button", { name: "Revisar operação", exact: true }).click(); await audit(page, "L1 ENT cancelamento sem rascunho");
 await confirmedOutcome(page, f.document.id, "Confirmar operação"); expect(privateFormCount(f.patient)).toBe("0"); expect(writes).toEqual([]);
 expect((await rpc(f.admin, "operational_document", { p_id: f.document.id })).status).toBe("cancellation_pending");
});
