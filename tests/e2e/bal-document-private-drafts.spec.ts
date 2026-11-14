import { test, expect } from "@playwright/test";
import { balDocumentFixture, balDocumentFacts } from "../integration/bal-document-draft-fixtures.mjs";
import { balanceDocumentLabels } from "../../src/lib/forms/balance-document-draft";
import { selectDocumentSection } from "./document-sections";
import { loginDecision, noPrivateWrites, privateFormCount, confirmedOutcome } from "./l1-decision-policy";
import { audit } from "./accessibility-audit";
test.setTimeout(150_000);
for (const purpose of ["review_family", "review_supervisor", "assign_recount"] as const) test(`BAL ${purpose}: conferência mantém fatos da contagem e recupera resultado sem salvar decisão`, async ({ page }) => {
  const f = await balDocumentFixture(purpose), writes = noPrivateWrites(page), before = balDocumentFacts(f), count = privateFormCount(f.patient);
  await loginDecision(page, f.identity.email, f.patient);
  if (purpose === "assign_recount") await page.goto(`/balancos?careRecipientId=${f.patient}&recountDocumentId=${f.document.id}`);
  else { await page.goto("/fichas/" + f.document.id); await selectDocumentSection(page, "workflow"); await page.getByRole("button", { name: balanceDocumentLabels[purpose], exact: true }).click(); }
  await expect(page.getByRole("button", { name: "Salvar preenchimento privado", exact: true })).toHaveCount(0);
  await page.getByRole("textbox", { name: purpose === "assign_recount" ? /^Sua justificativa para o reconto/ : /^Sua revisão sobre a contagem/ }).fill("Conferência independente sem decisão em preparação.");
  if (purpose === "assign_recount") { const field = page.getByRole("combobox", { name: /^Plantão para o reconto/ }); await field.fill(f.target.professional_name); await field.press("ArrowDown"); await page.getByRole("option").filter({ hasText: f.target.professional_name }).click(); }
  expect(balDocumentFacts(f)).toBe(before);
  await page.getByRole("button", { name: purpose === "assign_recount" ? "Revisar designação" : "Conferir revisão", exact: true }).click();
  await audit(page, "L1 revisão BAL sem central");
  await confirmedOutcome(page, f.document.id, purpose === "assign_recount" ? "Confirmar designação" : "Confirmar revisão");
  expect(balDocumentFacts(f)).not.toBe(before); expect(privateFormCount(f.patient)).toBe(count); expect(writes).toEqual([]);
});
