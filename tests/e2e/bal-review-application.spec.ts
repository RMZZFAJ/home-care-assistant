import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { legacyBalance } from "../integration/bal-review-fixtures.mjs";
import { fixtures } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { selectDocumentSection } from "./document-sections";
import { audit } from "./accessibility-audit";
import { generatedPdf } from "./generated-pdf";

test.setTimeout(180_000);
const stock = (patient: string) => sql("select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id="+q(patient));
async function openReview(page: Page) {
 await selectDocumentSection(page, "workflow");
 await page.getByRole("button", { name: "Revisão da família", exact: true }).click();
 return page.getByRole("dialog", { name: "Revisar contagem do balanço", exact: true });
}
test("BAL separates a private item opinion from stock application and recovers its committed application by GET after reload", async ({ page }, info) => {
 const f = await legacyBalance({ quantity: "1" }), before = stock(f.patient);
 await page.goto("/login");await page.getByLabel("E-mail", { exact: true }).fill(fixtures.family.email);
 await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);await page.getByRole("button", { name: "Entrar", exact: true }).click();
 await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();await selectContext(page, f.patient);
 await page.goto("/fichas/"+f.document.id);
 let dialog = await openReview(page);
 const first = f.document.lines[0], resultLabel = "Resultado do parecer — "+first.name_snapshot;
 await expect(dialog.getByRole("button", { name: "Salvar preenchimento privado", exact: true })).toBeEnabled();
 await dialog.getByRole("textbox", { name: /^Seu parecer sobre a contagem/ }).fill("Parecer independente; somente um material examinado.");
 await dialog.getByRole("combobox", { name: resultLabel, exact: true }).selectOption("confirmed");
 await dialog.getByRole("textbox", { name: "Comentário do material — "+first.name_snapshot, exact: true }).fill("Conferido individualmente.");
 const saved = page.waitForResponse(r => new URL(r.url()).pathname==="/api/drafts" && r.request().method()==="POST");
 await dialog.getByRole("button", { name: "Salvar preenchimento privado", exact: true }).click();expect((await saved).status()).toBe(200);
 await expect(dialog.getByRole("button", { name: "Salvar preenchimento privado", exact: true })).toBeEnabled();
 expect(stock(f.patient)).toBe(before);await page.reload();dialog = await openReview(page);
 await dialog.getByRole("button", { name: "Continuar rascunho", exact: true }).click();
 await expect(dialog.getByRole("combobox", { name: resultLabel, exact: true })).toHaveValue("confirmed");
 await expect(dialog.getByRole("textbox", { name: "Comentário do material — "+first.name_snapshot, exact: true })).toHaveValue("Conferido individualmente.");
 await dialog.getByRole("button", { name: "Consultar referência atual", exact: true }).click();
 await dialog.getByRole("button", { name: "Adotar referência atual e manter meu parecer", exact: true }).click();
 await dialog.getByRole("button", { name: "Revisar parecer", exact: true }).click();
 await expect(dialog.getByRole("region", { name: "Materiais incluídos no parecer", exact: true })).toContainText("Os demais materiais não foram declarados como examinados");
 await dialog.getByRole("button", { name: "Confirmar revisão", exact: true }).click();await expect(dialog).toHaveCount(0);
 expect(stock(f.patient)).toBe(before);
 const reviewed = (await (await page.request.get("/api/documents/"+f.document.id)).json()).data;
 expect(reviewed.status).toBe("submitted");expect(reviewed.balanceReview.reviews[0].item_results).toHaveLength(1);
 expect(reviewed.balanceReview.application.state).toBe("not_applied");
 await page.getByRole("button", { name: "Aplicar contagem pelo grupo familiar", exact: true }).click();
 const applyDialog = page.getByRole("dialog", { name: "Aplicar contagem ao estoque", exact: true });
 for (const width of [1440, 1024, 768, 390, 320]) {
  await page.setViewportSize({ width, height: 940 });
  await applyDialog.getByRole("button", { name: "Confirmar aplicação da contagem", exact: true }).focus();
  await audit(page, "bal-separate-application-"+width);
 }
 let posts = 0, lookups = 0;
 page.on("request", request => { if (new URL(request.url()).pathname==="/api/balances/application" && request.method()==="GET") lookups++; });
 await page.route("**/api/documents/"+f.document.id, async route => {
  if (route.request().method()!=="POST") return route.continue();
  expect(route.request().postDataJSON().action).toBe("apply_balance");posts++;
  const response = await route.fetch();expect(response.ok(), await response.text()).toBe(true);
  sql("insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values("+q(f.patient)+","+q(fixtures.family.id)+",'bal.approve.family',false)");
  return route.abort("failed");
 });
 await applyDialog.getByRole("button", { name: "Confirmar aplicação da contagem", exact: true }).click();
 await expect(page.getByRole("button", { name: "Consultar aplicação desta tentativa", exact: true })).toBeEnabled();
 const applied = stock(f.patient);expect(applied).not.toBe(before);expect(posts).toBe(1);
 await page.reload();await selectDocumentSection(page, "workflow");
 expect(posts).toBe(1);await page.getByRole("button", { name: "Consultar aplicação desta tentativa", exact: true }).click();
 await expect(page.getByRole("button", { name: "Consultar aplicação desta tentativa", exact: true })).toHaveCount(0);
 await expect(page.getByRole("heading", { name: "Aplicação da contagem ao estoque", exact: true })).toBeFocused();
 await expect(page.getByText("Aplicação original recuperada por consulta. Nenhum movimento foi repetido.", { exact: true })).toBeVisible();
 expect(lookups).toBe(1);expect(posts).toBe(1);expect(stock(f.patient)).toBe(applied);
 await audit(page, "bal-recovered-application-320");
 const pdf = await generatedPdf(page, "/api/documents/"+f.document.id+"/pdf");expect(pdf.status()).toBe(200);
 mkdirSync("output/pdf/phase-d", { recursive: true });writeFileSync("output/pdf/phase-d/bal-separate-application-"+info.project.name+".pdf", await pdf.body());
 expect(stock(f.patient)).toBe(applied);
});
