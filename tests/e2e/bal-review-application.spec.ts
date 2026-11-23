import { noPrivateWrites, privateFormCount } from "./l1-decision-policy";
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { balCommand, legacyBalance, rpc } from "../integration/bal-review-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { selectDocumentSection } from "./document-sections";
import { audit } from "./accessibility-audit";
import { generatedPdf } from "./generated-pdf";

test.setTimeout(180_000);
const stock = (patient: string) => sql("select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id="+q(patient));
async function openBalanceAsFamily(page: Page, patient: string, id: string, email: string) {
 await page.goto("/login");await page.getByLabel("E-mail", { exact: true }).fill(email);
 await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);await page.getByRole("button", { name: "Entrar", exact: true }).click();
 await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();await selectContext(page, patient);
 await page.goto("/fichas/"+id);
}
async function openReview(page: Page) {
 await selectDocumentSection(page, "reviews");
 await page.getByRole("button", { name: "Revisão da família", exact: true }).click();
 return page.getByRole("dialog", { name: "Revisar contagem do balanço", exact: true });
}
test("BAL keeps an unsaved item review separate from stock application and recovers its committed application by GET after reload", async ({ page }, info) => {
 const extra = { id: randomUUID(), name: "Conector fora do catálogo", unit: "caixa", quantity: "2" };
 const f = await legacyBalance({ quantity: "1", balanceExtras: [extra] }), before = stock(f.patient), writes = noPrivateWrites(page), drafts = privateFormCount(f.patient);
 const family = await shiftWorker(f.patient, "family");
 await openBalanceAsFamily(page, f.patient, f.document.id, family.email);
 const dialog = await openReview(page);
 const first = f.document.lines[0], resultLabel = "Resultado da revisão — "+first.name_snapshot;
 const detailedCount = dialog.getByText("Referência e contagem dos materiais", { exact: true });
 await detailedCount.click();
 await expect(dialog.getByRole("table", { name: "Materiais da contagem", exact: true })).toBeVisible();
 await detailedCount.click();
 await dialog.getByRole("textbox", { name: /^Sua revisão sobre a contagem/ }).fill("Parecer independente; somente um material examinado.");
 await dialog.getByRole("group", { name: resultLabel, exact: true }).getByRole("button", { name: "Confere", exact: true }).click();
 await dialog.getByRole("textbox", { name: "Comentário do material — "+first.name_snapshot, exact: true }).fill("Conferido individualmente.");
 const extras = dialog.getByRole("region", { name: "Itens extras", exact: true });
 const extraChoices = extras.getByRole("group", { name: "Resultado da revisão — " + extra.name, exact: true });
 await expect(extraChoices.getByRole("button", { name: "Não conferi", exact: true })).toHaveAttribute("aria-pressed", "true");
 await expect(extras).toContainText("2 caixa");
 await extraChoices.getByRole("button", { name: "Diferença", exact: true }).click();
 await expect(extras.getByRole("combobox", { name: "Encaminhamento — " + extra.name, exact: true })).toHaveValue("none");
 await page.setViewportSize({ width: 320, height: 940 });
 await audit(page, "bal-review-extra-difference-320");
 await extraChoices.getByRole("button", { name: "Confere", exact: true }).click();
 await expect(dialog.getByRole("progressbar", { name: "Materiais conferidos" })).toHaveAttribute("value", "2");
 await audit(page, "bal-review-extra-320");
 mkdirSync("output/playwright/phase-d", { recursive: true });
 await extras.screenshot({ path: "output/playwright/phase-d/bal-review-extra-" + info.project.name + ".png" });
 expect(stock(f.patient)).toBe(before); expect(privateFormCount(f.patient)).toBe(drafts);
 await dialog.getByRole("button", { name: "Conferir revisão", exact: true }).click();
 await expect(dialog.getByRole("region", { name: "Materiais incluídos na revisão", exact: true })).toContainText("Os demais materiais não foram declarados como examinados");
 const reviewResponse = page.waitForResponse(response => new URL(response.url()).pathname === "/api/documents/"+f.document.id+"/decisions" && response.request().method() === "POST");
 await dialog.getByRole("button", { name: "Confirmar revisão", exact: true }).click();
 const reviewReceipt = await reviewResponse; expect(reviewReceipt.ok(), await reviewReceipt.text()).toBe(true);
 expect((await reviewReceipt.json()).data.state).toBe("applied");
 await expect(page.locator(".hca-activity-overlay")).toHaveCount(0);await expect(dialog).toHaveCount(0);
 expect(stock(f.patient)).toBe(before);
 const reviewed = (await (await page.request.get("/api/documents/"+f.document.id)).json()).data;
 expect(writes).toEqual([]); expect(privateFormCount(f.patient)).toBe(drafts);
 expect(reviewed.status).toBe("submitted");expect(reviewed.balanceReview.reviews[0].item_results).toHaveLength(2);
 expect(reviewed.balanceReview.reviews[0].item_results).toContainEqual({ lineId: extra.id, result: "confirmed", forwarding: "none", comment: "" });
 expect(reviewed.balanceReview.reviews[0].reviewed_snapshot.extras).toEqual([extra]);
 expect(reviewed.balanceReview.application.state).toBe("not_applied");
 await page.getByRole("button", { name: "Aplicar contagem pelo grupo familiar", exact: true }).click();
 const applyDialog = page.getByRole("dialog", { name: "Aplicar contagem ao estoque", exact: true });
 await expect(applyDialog.getByText("Estoque de referência", { exact: true }).first()).toBeVisible();
 await expect(applyDialog.getByText("Após o balanço", { exact: true }).first()).toBeVisible();
 for (const width of [1440, 1024, 768, 390, 320]) {
  await page.setViewportSize({ width, height: 940 });
  await applyDialog.getByRole("button", { name: "Confirmar aplicação da contagem", exact: true }).focus();
  await audit(page, "bal-separate-application-"+width);
 }
 let posts = 0, lookups = 0;
 const write = Promise.withResolvers<void>();
 page.on("request", request => { if (new URL(request.url()).pathname==="/api/balances/application" && request.method()==="GET") lookups++; });
 await page.route("**/api/documents/"+f.document.id, async route => {
  if (route.request().method()!=="POST") return route.continue();
  expect(route.request().postDataJSON().action).toBe("apply_balance");posts++;
  await write.promise;
  const response = await route.fetch();expect(response.ok(), await response.text()).toBe(true);
  sql("insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values("+q(f.patient)+","+q(family.id)+",'bal.approve.family',false)");
  return route.abort("failed");
 });
 try {
  await applyDialog.getByRole("button", { name: "Confirmar aplicação da contagem", exact: true }).click();
  const activity = page.getByRole("dialog", { name: "Registrando ajuste de balanço", exact: true });
  await expect(activity.getByRole("list", { name: "Etapas da operação" }).locator("[aria-current='step']")).toHaveText("Registrando ajuste de balanço");
  await expect(page.locator(".hca-modal").filter({ hasText: "Aplicar contagem ao estoque" })).toHaveCount(0);
  expect(stock(f.patient)).toBe(before);
  for (const width of [360, 412]) {
   await page.setViewportSize({ width, height: 900 });
   const path = info.outputPath(`bal-application-writing-${width}.png`);
   await page.screenshot({ path });
   await info.attach(`Aplicação da contagem ${width}px`, { path, contentType: "image/png" });
  }
 } finally { write.resolve(); }
 await page.setViewportSize({ width: 320, height: 940 });
 const failure = page.getByRole("dialog", { name: "Vamos conferir a aplicação", exact: true });
 await failure.getByRole("button", { name: "Voltar às revisões", exact: true }).click();
 await expect(page.getByRole("button", { name: "Consultar aplicação desta tentativa", exact: true })).toBeEnabled();
 const applied = stock(f.patient);expect(applied).not.toBe(before);expect(posts).toBe(1);
 await page.reload();await selectDocumentSection(page, "reviews");
 expect(posts).toBe(1);await page.getByRole("button", { name: "Consultar aplicação desta tentativa", exact: true }).click();
 await expect(page.getByRole("button", { name: "Consultar aplicação desta tentativa", exact: true })).toHaveCount(0);
 const recovered = page.getByRole("dialog", { name: "Aplicação encontrada", exact: true });
 await expect(recovered).toContainText(f.document.code);
 await recovered.getByRole("button", { name: "Concluir", exact: true }).click();
 await expect(page.getByRole("heading", { name: "Aplicação da contagem ao estoque", exact: true })).toBeFocused();
 await expect(page.getByText("Aplicação original recuperada por consulta. Nenhum movimento foi repetido.", { exact: true })).toBeVisible();
 expect(lookups).toBe(1);expect(posts).toBe(1);expect(stock(f.patient)).toBe(applied);
 await expect(page.getByText(extra.name + " · " + extra.unit + " · Item extra", { exact: true })).toBeVisible();
 await audit(page, "bal-recovered-application-320");
 const pdf = await generatedPdf(page, "/api/documents/"+f.document.id+"/pdf");expect(pdf.status()).toBe(200);
 mkdirSync("output/pdf/phase-d", { recursive: true });writeFileSync("output/pdf/phase-d/bal-separate-application-"+info.project.name+".pdf", await pdf.body());
 expect(stock(f.patient)).toBe(applied);
});

test("BAL shows the final application phase until the same official receipt is checked", async ({ page }) => {
 const f = await legacyBalance({ quantity: "1" }), family = await shiftWorker(f.patient, "family");
 const document = await rpc(family.client, "operational_document", { p_id: f.document.id });
 const review = await balCommand(family.client, document, { group: "family", reviewReference: document.balanceReview.referenceHash });
 expect(review.error).toBeNull();
 const before = stock(f.patient), receipt = Promise.withResolvers<void>();
 const keys: string[] = [];
 page.on("request", request => {
  if (request.method() === "POST" && new URL(request.url()).pathname === "/api/documents/" + f.document.id)
   keys.push(request.postDataJSON().idempotencyKey);
 });
 await page.route("**/api/balances/application?*", async route => {
  const params = new URL(route.request().url()).searchParams;
  expect(params.get("idempotencyKey")).toBe(keys[0]);
  expect(params.get("expectedVersion")).toBe(String(review.data.version));
  await receipt.promise;
  await route.continue();
 });
 await openBalanceAsFamily(page, f.patient, f.document.id, family.email);
 await selectDocumentSection(page, "reviews");
 const header = page.locator(".hca-document-header");
 await expect(header.locator(".hca-status--info").getByText("Pronto para aplicar", { exact: true }).last()).toBeVisible();
 await page.getByRole("button", { name: "Aplicar contagem pelo grupo familiar", exact: true }).click();
 const success = page.getByRole("dialog", { name: "Contagem aplicada", exact: true });
 try {
  await page.getByRole("button", { name: "Confirmar aplicação da contagem", exact: true }).click();
  const activity = page.getByRole("dialog", { name: "Concluindo aplicação", exact: true });
  await expect(activity).toBeVisible();
  await expect(success).toHaveCount(0);
 } finally { receipt.resolve(); }
 const afterWrite = stock(f.patient);
 expect(afterWrite).not.toBe(before);
 await expect(success).toContainText(f.document.code);
 await success.getByRole("button", { name: "Concluir", exact: true }).click();
 await expect(page.getByRole("heading", { name: "Aplicação da contagem ao estoque", exact: true })).toBeFocused();
 await expect(header.locator(".hca-status--success").getByText("Aplicado", { exact: true }).last()).toBeVisible();
 await expect(page.getByRole("button", { name: "Aplicar contagem pelo grupo familiar", exact: true })).toHaveCount(0);
 expect(keys).toHaveLength(1);
 expect(stock(f.patient)).toBe(afterWrite);
});
