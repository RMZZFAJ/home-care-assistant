import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fixtureFile, sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { setup, rpc } from "../integration/v4-fixtures.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";

async function login(page: Page, patient: string) {
  const fixtures = JSON.parse(readFileSync(fixtureFile, "utf8"));
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.professional.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient); await page.goto("/fichas/req");
  await expect(page.getByText("Carregando catálogo e pendências…", { exact: true })).toHaveCount(0);
}
async function next(page: Page) { await page.getByRole("button", { name: /^Avançar$|^Revisar$/ }).click(); }
async function hygiene(page: Page) { await next(page); await next(page); await expect(page.getByRole("heading", { name: "Higiene", exact: true })).toBeVisible(); }
async function review(page: Page) { for (let step = 0; step < 4; step++) await next(page); await expect(page.getByRole("heading", { name: "Revisão", exact: true })).toBeVisible(); }
const card = (page: Page, name: string) => page.locator("article").filter({ has: page.getByRole("checkbox", { name: new RegExp("^" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }) });
const count = (patient: string) => sql(`select count(*) from public.requisitions where care_recipient_id=${sqlLiteral(patient)};`);

test("observação REQ preserva 0, 7, desconhecido, vazio e horários ao retomar no dia seguinte e recuperar resposta perdida", async ({ page }, info) => {
  test.setTimeout(150_000);
  const f = await setup();
  for (const p_name of ["Material fictício sem observação", "Material fictício sete observado"])
    await rpc(f.admin, "admin_upsert_recipient_product", { p_care_recipient_id: f.patient, p_product_id: null, p_name, p_category: "higiene", p_unit: "unidade", p_aliases: [], p_is_active: true });
  const ledger = sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`);
  await login(page, f.patient); await hygiene(page);
  const names = ["Material fictício V4 0", "Material fictício V4 1", "Material fictício sem observação", "Material fictício sete observado"];
  const cards = names.map(name => card(page, name));
  for (const row of cards) {
    await row.getByRole("checkbox").first().check();
    await expect(row.getByLabel("Estoque observado com a equipe", { exact: false })).toHaveValue("");
    await expect(row.getByLabel("Informação do estoque da equipe", { exact: true })).toHaveValue("unfilled");
  }
  const zero = cards[0].getByLabel("Estoque observado com a equipe", { exact: false });
  await zero.fill("7"); await zero.fill("");
  await expect(cards[0].getByLabel("Informação do estoque da equipe", { exact: true })).toHaveValue("unfilled");
  await zero.fill("0");
  await cards[1].getByLabel("Informação do estoque da equipe", { exact: true }).selectOption("unknown");
  await expect(cards[1].getByLabel("Estoque observado com a equipe", { exact: false })).toBeDisabled();
  await cards[2].getByLabel("Estoque observado com a equipe", { exact: false }).fill("7");
  await cards[2].getByLabel("Estoque observado com a equipe", { exact: false }).fill("");
  await cards[3].getByLabel("Estoque observado com a equipe", { exact: false }).fill("7");
  await page.getByRole("button", { name: "Salvar rascunho", exact: true }).click();
  await expect(page.getByText("Rascunho salvo neste dispositivo.", { exact: true })).toBeVisible();
  const fixture = JSON.parse(readFileSync(fixtureFile, "utf8"));
  const draftKey = "hca:v2:requisition:" + fixture.professional.id + ":" + f.patient;
  // Controlled previous-day fixture remains within the current tab's 24h
  // retention. Cross-device/server draft persistence belongs to D3.
  const previousTimes = await page.evaluate(key => {
    const saved = JSON.parse(sessionStorage.getItem(key)!);
    for (const line of saved.form.lines) if (!line.stockObservationAt || !Number.isFinite(Date.parse(line.stockObservationAt))) throw new Error("The actual UI must record its declaration time");
    saved.savedAt = Date.now() - 20 * 60 * 60 * 1000;
    saved.form.lines.forEach((line: { stockObservationAt: string }, index: number) => { line.stockObservationAt = new Date(saved.savedAt - index * 60_000).toISOString(); });
    sessionStorage.setItem(key, JSON.stringify(saved));
    return Object.fromEntries(saved.form.lines.map((line: { productId: string; stockObservationAt: string }) => [line.productId, line.stockObservationAt]));
  }, draftKey);
  await page.reload(); await hygiene(page);
  await expect(zero).toHaveValue("0");
  await expect(cards[1].getByLabel("Informação do estoque da equipe", { exact: true })).toHaveValue("unknown");
  await expect(cards[2].getByLabel("Informação do estoque da equipe", { exact: true })).toHaveValue("unfilled");
  await expect(cards[3].getByLabel("Estoque observado com a equipe", { exact: false })).toHaveValue("7");
  await review(page);
  for (const fact of ["0 unidade (observado)", "7 unidade (observado)", "Não sei informar", "Não informado"]) await expect(page.getByText(fact, { exact: false })).toBeVisible();
  await expect(page.getByText("Registro no rascunho (horário do dispositivo):", { exact: false })).toHaveCount(4);
  for (const width of [1440, 768, 390, 320]) { await page.setViewportSize({ width, height: 900 }); await audit(page, "REQ observation review " + width); }
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await page.screenshot({ path: `output/playwright/phase-d/requisition-observation-${info.project.name}.png`, fullPage: true, animations: "disabled" });
  let failedResponse = false;
  await page.route("**/api/requisitions", async route => {
    if (route.request().method() === "POST" && !failedResponse) { failedResponse = true; await route.fetch(); await route.abort("failed"); }
    else await route.continue();
  });
  await page.getByRole("button", { name: "Concluir requisição", exact: true }).click();
  await expect(page.getByRole("button", { name: "Recuperar esta tentativa", exact: true })).toBeVisible();
  expect(count(f.patient)).toBe("1");
  const response = page.waitForResponse(result => result.request().method() === "POST" && new URL(result.url()).pathname === "/api/requisitions");
  await page.getByRole("button", { name: "Recuperar esta tentativa", exact: true }).click();
  const result = await response; expect(result.ok()).toBe(true);
  const { receipt } = await result.json();
  const observations = receipt.lines.map((line: { stockObservation: string; currentStock: number | null }) => [line.stockObservation, line.currentStock]).sort();
  expect(observations).toEqual([["observed", 0], ["observed", 7], ["unfilled", null], ["unknown", null]].sort());
  for (const line of receipt.lines) {
    expect(new Date(line.stockObservationAt).toISOString()).toBe(previousTimes[line.productId]);
    expect(line.stockObservationTimeSource).toBe("client_draft");
    expect(Date.parse(line.stockObservationAt)).toBeLessThan(Date.parse(receipt.createdAt) - 19 * 60 * 60 * 1000);
  }
  expect(count(f.patient)).toBe("1");
  expect(sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`)).toBe(ledger);
  await page.unroute("**/api/requisitions");
  await page.goto("/historico/" + receipt.requisitionId);
  for (const fact of ["0 unidade (observado)", "7 unidade (observado)", "Não sei informar", "Não informado"]) await expect(page.getByText(fact, { exact: false }).first()).toBeVisible();
  await expect(page.getByText("Registro no rascunho (horário do dispositivo):", { exact: false })).toHaveCount(4);
  const pdf = await page.request.get(`/api/documents/${receipt.requisitionId}/pdf`);
  expect(pdf.ok()).toBe(true); expect(pdf.headers()["content-type"]).toContain("application/pdf");
  if (info.project.name === "chromium") {
    mkdirSync("output/pdf/phase-d", { recursive: true });
    const path = `output/pdf/phase-d/requisition-observations-${receipt.requisitionId}.pdf`;
    writeFileSync(path, await pdf.body(), { flag: "wx" });
    await info.attach("REQ observations PDF", { path, contentType: "application/pdf" });
  }
});

test("rascunho anterior conserva 0 e 7 para revisão sem classificá-los como observação confirmada", async ({ page }) => {
  const f = await setup(); await login(page, f.patient);
  const fixture = JSON.parse(readFileSync(fixtureFile, "utf8"));
  const catalog = await (await page.request.get("/api/catalog?careRecipientId=" + f.patient)).json();
  const lines = f.products.map((productId: string, index: number) => ({ productId, productName: catalog.data.find((p: { id: string }) => p.id === productId).name, category: "higiene", unit: "unidade", currentStock: index ? 7 : 0, urgent: false }));
  await page.evaluate(({ key, form }) => sessionStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), form })), { key: "hca:v2:requisition:" + fixture.professional.id + ":" + f.patient, form: { lines, extraItems: [], observations: [] } });
  await page.reload(); await hygiene(page);
  for (const [index, line] of lines.entries()) {
    await expect(card(page, line.productName).getByLabel("Estoque observado com a equipe", { exact: false })).toHaveValue(index ? "7" : "0");
    await expect(card(page, line.productName).getByLabel("Informação do estoque da equipe", { exact: true })).toHaveValue("legacy_unclassified");
  }
  await next(page);
  await expect(page.getByText("Confirme como informar a observação recuperada do rascunho antigo.", { exact: false }).first()).toBeVisible();
  expect(count(f.patient)).toBe("0");
  for (const line of lines) await card(page, line.productName).getByLabel("Informação do estoque da equipe", { exact: true }).selectOption("observed");
  await review(page);
  for (const amount of [0, 7]) await expect(page.getByText(amount + " unidade (observado)", { exact: false })).toBeVisible();
});
