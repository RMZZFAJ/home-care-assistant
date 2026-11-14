import { expect, test, type Page, type Locator } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { actor, fixtures, issue, rpc, setup } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { auditFromTop } from "./accessibility-audit";
import type { DashboardData } from "../../src/types/dashboard";

test.setTimeout(180_000);
const widths = [320, 390, 768, 1024, 1440];
const facts = (patient: string) => sql(`select jsonb_build_object(
 'documents',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id=${q(patient)}),
 'requisitions',(select jsonb_agg(to_jsonb(r) order by id) from public.requisitions r where care_recipient_id=${q(patient)}),
 'science',(select jsonb_agg(to_jsonb(s) order by id) from public.requisition_science_events s where care_recipient_id=${q(patient)}),
 'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(patient)}));`);
async function login(page: Page, patient: string, role = "adminA") {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures[role].email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}
async function compare(actual: Locator, model: Locator, properties: string[]) {
  for (const property of properties) {
    const expected = await model.evaluate((node, key) => getComputedStyle(node).getPropertyValue(key), property);
    await expect(actual).toHaveCSS(property, expected);
  }
}

test("15 ADM-01 next task follows the model and actual role without completing receipt or science", async ({ page, browser }, info) => {
  const f = await setup();
  await issue(f.patient, f.products);
  await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient, p_type: "ENT", p_key: randomUUID(), p_draft: false,
    p_payload: { source: "FAMILY", destination: "CARE_TEAM", recipientId: fixtures.professional.id,
      recipientReason: "Pessoa designada para conferência fictícia", lines: [{ productId: f.products[0], quantity: "1" }] },
  });
  const before = facts(f.patient);
  await login(page, f.patient);
  const response = await page.request.get("/api/dashboard?careRecipientId=" + f.patient);
  expect(response.status()).toBe(200);
  const data: DashboardData = (await response.json()).data;
  const expected = data.pendingTasks.find(task => task.priority === "attention") ?? data.pendingTasks[0];
  expect(expected).toBeTruthy();
  const banner = page.getByRole("region", { name: "Próxima providência", exact: true });
  await expect(banner.getByRole("heading", { level: 2 })).toHaveText(expected.title);
  const reference = await browser.newContext();
  try {
    const model = await reference.newPage();
    await model.route(/^https?:/, route => route.abort());
    await model.goto(pathToFileURL(resolve("Home_Care_Assistant_Modelo_Integral.html")).href);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await model.setViewportSize({ width, height: 900 });
      await compare(banner, model.locator(".welcome"), ["background-image", "border-color", "border-radius", "padding-left", "padding-top"]);
      await compare(banner.getByRole("heading"), model.locator(".welcome h2"), ["font-size", "font-weight", "letter-spacing"]);
      const metric = page.locator(".hca-metric-card").first(), modelMetric = model.locator(".metric").first();
      await compare(metric, modelMetric, ["background-color", "border-color", "border-radius", "padding-top", "min-height"]);
      await compare(metric.locator("strong"), modelMetric.locator(".value"), ["font-size", "font-weight", "letter-spacing"]);
      await compare(page.getByRole("region", { name: "Ações que precisam de você", exact: true }), model.locator(".card").first(), ["border-radius"]);
      await auditFromTop(page, "ADM01 task " + width);
    }
    mkdirSync("output/playwright/phase-d", { recursive: true });
    await page.screenshot({ path: `output/playwright/phase-d/tasks-${info.project.name}.png`, fullPage: true });
    const destination = banner.getByRole("link", { name: "Abrir próxima providência", exact: true });
    await expect(destination).toHaveAttribute("href", expected.href);
    await destination.focus(); await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(expected.href));
    await expect(page.locator(".hca-workspace")).toHaveAttribute("data-context-patient", f.patient);
    expect(facts(f.patient)).toBe(before);
    await page.getByLabel("Menu do usuário", { exact: true }).click();
    await page.getByRole("menuitem", { name: "Sair", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await login(page, f.patient, "professional");
    const pro = (await (await page.request.get("/api/dashboard?careRecipientId=" + f.patient)).json()).data as DashboardData;
    const task = pro.pendingTasks.find(item => item.priority === "attention") ?? pro.pendingTasks[0];
    await expect(banner.getByRole("heading")).toHaveText(task.title);
    await expect(page.getByRole("link", { name: "Organizar compra", exact: true })).toHaveCount(0);
    expect(facts(f.patient)).toBe(before);
  } finally { await reference.close(); }
});

test("15 ADM-01 empty and failed reads never fabricate an attention task or global approval", async ({ page }) => {
  const f = await setup(); await login(page, f.patient);
  const before = facts(f.patient), banner = page.getByRole("region", { name: "Próxima providência", exact: true });
  const result = await page.request.get("/api/dashboard?careRecipientId=" + f.patient);
  expect((await result.json()).data.pendingTasks).toEqual([]);
  await expect(page.getByText("Sem itens nesta consulta", { exact: true })).toBeVisible();
  await expect(banner).toHaveCount(0);
  await expect(page.getByText("Em dia", { exact: true })).toHaveCount(0);
  await page.route("**/api/dashboard?*", route => route.fulfill({ status: 503, json: { code: "DATABASE_UNAVAILABLE", error: "Consulta de tarefas indisponível no cenário controlado." } }));
  await page.evaluate(() => window.dispatchEvent(new Event("hca:data-changed")));
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Consulta de tarefas indisponível");
  await expect(banner).toHaveCount(0);
  await page.unrouteAll({ behavior: "wait" });
  await page.getByRole("button", { name: "Tentar novamente", exact: true }).click();
  await expect(page.getByText("Sem itens nesta consulta", { exact: true })).toBeVisible();
  expect(facts(f.patient)).toBe(before);
});

test("15 NOT-01 and ADM-06 keep native notices and every authorized destination in canonical responsive records", async ({ page, browser }, info) => {
  const f = await setup(), family = await actor("family", f.patient);
  const doc = await rpc(family, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_draft: false,
    p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity: "1" }] } });
  const before = facts(f.patient);
  await login(page, f.patient, "family");
  await page.goto("/notificacoes?careRecipientId=" + f.patient);
  const center = page.getByRole("region", { name: "Acompanhamento pessoal", exact: true });
  const row = center.getByRole("listitem").filter({ hasText: doc.code });
  await expect(row).toBeVisible();
  const reference = await browser.newContext();
  try {
    const model = await reference.newPage(); await model.route(/^https?:/, route => route.abort());
    await model.goto(pathToFileURL(resolve("Home_Care_Assistant_Modelo_Integral.html")).href + "#notificacoes");
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 }); await model.setViewportSize({ width, height: 900 });
      await compare(row, model.locator(".notice-row.unread").first(), ["background-color", "padding-left", "padding-top", "column-gap"]);
      await compare(row.getByRole("heading"), model.locator(".notice-row.unread h3").first(), ["font-size", "font-weight"]);
      await auditFromTop(page, "NOT01 notice " + width);
    }
    mkdirSync("output/playwright/phase-d", { recursive: true });
    await center.screenshot({ path: `output/playwright/phase-d/inbox-${info.project.name}.png` });
    await row.getByRole("button", { name: "Marcar como vista", exact: true }).click();
    await expect(row.getByText("Vista no aplicativo", { exact: true })).toBeVisible();
    expect(sql(`select count(*) from public.requisition_notifications where document_id=${q(doc.id)} and recipient_user_id=${q(fixtures.family.id)} and seen_at is not null;`)).toBe("1");
    expect(facts(f.patient)).toBe(before);
    await page.goto("/mais?careRecipientId=" + f.patient);
    const destinations = page.getByRole("navigation", { name: "Rotina e funções autorizadas", exact: true });
    await expect(destinations).toBeVisible();
    const hrefs = await destinations.getByRole("link").evaluateAll(nodes => nodes.map(node => node.getAttribute("href")));
    expect(hrefs).toContain("/guias"); expect(hrefs).toContain("/verificar");
    await model.goto(pathToFileURL(resolve("Home_Care_Assistant_Modelo_Integral.html")).href + "#mais");
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 }); await model.setViewportSize({ width, height: 900 });
      expect(await destinations.getByRole("link").evaluateAll(nodes => nodes.map(node => node.getAttribute("href")))).toEqual(hrefs);
      const actualColumns = await destinations.evaluate(node => getComputedStyle(node).gridTemplateColumns.split(" ").length);
      const modelColumns = await model.locator(".grid3").first().evaluate(node => getComputedStyle(node).gridTemplateColumns.split(" ").length);
      expect(actualColumns).toBe(modelColumns);
      const card = destinations.getByRole("link").first(), modelCard = model.locator(".grid3 > a").first();
      await compare(card, modelCard, ["background-color", "border-color", "border-radius", "padding-top", "color"]);
      await compare(card.getByRole("heading"), modelCard.getByRole("heading"), ["font-size", "font-weight", "margin-top"]);
      await auditFromTop(page, "ADM06 destinations " + width);
    }
    await destinations.screenshot({ path: `output/playwright/phase-d/more-${info.project.name}.png` });
    await destinations.getByRole("link", { name: /^Guias e ajuda/ }).focus(); await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/guias/);
    await expect(page.locator(".hca-workspace")).toHaveAttribute("data-context-patient", f.patient);
    const missing = await page.goto("/endereco-ficticio-inexistente"); expect(missing?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Página não encontrada", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Abrir Home Care Assistant", exact: true })).toHaveCSS("background-color", "rgb(21, 111, 102)");
    await auditFromTop(page, "ADM06 missing page", "Página não encontrada | Home Care Assistant");
    expect(facts(f.patient)).toBe(before);
  } finally { await reference.close(); }
});
