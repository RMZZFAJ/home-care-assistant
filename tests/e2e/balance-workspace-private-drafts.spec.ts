import { test, expect } from "@playwright/test";
import { preparationPurposes, preparationFixture, preparationFacts } from "../integration/balance-preparation-fixtures.mjs";
import { balancePreparationTitles, type BalancePreparationPurpose } from "../../src/lib/forms/balance-preparation-purposes";
import { chooseBalanceTarget } from "./balance-preparation-steps";
import { loginDecision, noPrivateWrites, privateFormCount, confirmedOutcome } from "./l1-decision-policy";
import { audit } from "./accessibility-audit";
test.setTimeout(150_000);
for (const raw of preparationPurposes) { const purpose = raw as BalancePreparationPurpose;
 test(`BAL por plantão ${purpose}: decisão explícita sem preparação persistida e resultado único após resposta perdida`, async ({ page }) => {
  const f = await preparationFixture(purpose), writes = noPrivateWrites(page), count = privateFormCount(f.patient), before = preparationFacts(f);
  await loginDecision(page, f.identity.email, f.patient); await page.goto("/balancos");
  await page.getByRole("button", { name: purpose === "configure" ? "Configurar dia e plantão" : purpose === "assign" ? "Resolver atribuição" : balancePreparationTitles[purpose], exact: true }).click();
  await page.getByRole("textbox", { name: "Justificativa", exact: true }).fill(f.content.values.reason);
  if (purpose === "configure") await page.getByRole("checkbox", { name: "Processamento automático neste paciente", exact: true }).uncheck();
  if (["assign", "defer", "request_deferral"].includes(purpose)) { const target = f.source.workspace.targets.find((t: { id: string }) => t.id === f.content.values.targetShiftId); await chooseBalanceTarget(page, page.getByRole("dialog"), target, f.source.workspace.regime?.timezone); }
  await expect(page.getByRole("button", { name: "Salvar preenchimento privado", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Revisar decisão", exact: true }).click(); expect(preparationFacts(f)).toEqual(before);
  await audit(page, "L1 decisão de plantão sem rascunho");
  await confirmedOutcome(page, f.targetResourceId, "Confirmar decisão", `/api/balances/decisions/${f.targetResourceId}?careRecipientId=${f.patient}`);
  await expect(page.getByRole("status").filter({ hasText: /Decisão registrada|Solicitação registrada/ }).or(page.getByRole("heading", { name: "Decisão registrada", exact: true }))).toBeVisible();
  expect(privateFormCount(f.patient)).toBe(count); expect(writes).toEqual([]); expect(preparationFacts(f)).not.toEqual(before);
 });
}
