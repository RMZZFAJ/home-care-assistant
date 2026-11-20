import { isDocumentAccessReport } from "./display-access-report";
import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdirSync } from "node:fs";
import { setup, fixtures, issue, rpc } from "../integration/v4-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { auditFromTop } from "./accessibility-audit";
import { selectDocumentSection } from "./document-sections";

test.setTimeout(180_000);
const widths = [320, 390, 768, 1024, 1440];
async function login(page: Page, patient: string, email: string) {
  await page.goto("/login"); await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword); await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible(); await selectContext(page, patient);
}
const next = (page: Page) => page.getByRole("button", { name: /^(Selecionar materiais|Continuar|Revisar ficha)$/ }).click();
const facts = (patient: string) => sql(`select jsonb_build_object('req',(select jsonb_agg(to_jsonb(r) order by id) from public.requisitions r where care_recipient_id=${q(patient)}),'docs',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id=${q(patient)}),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(patient)}));`);

for (const type of ["REQ", "COM"] as const) test(`06.1 ${type} selection and review follow the canonical model in five widths without operational writes`, async ({ page, browser }, info) => {
  const f = await setup({ catalogue: [{ name: "Material de cuidado " + "com nome extenso ".repeat(5) + randomUUID().slice(0, 8), category: "medicamentos", unit: "mL", aliases: [] }] });
  const name = sql(`select name from public.care_recipient_products where care_recipient_id=${q(f.patient)} and product_id=${q(f.products[0])};`);
  // Five complete accessibility passes should measure this fixture, even
  // when an older local stack retains thousands of residences for shared test accounts.
  const user = await shiftWorker(f.patient, type === "REQ" ? "professional" : "family");
  await login(page, f.patient, user.email); const before = facts(f.patient);
  const writes: string[] = []; page.on("request", request => { if (["/api/requisitions", "/api/documents"].includes(new URL(request.url()).pathname) && request.method() === "POST") writes.push(request.url()); });
  await page.goto(type === "REQ" ? "/fichas/req" : "/fichas/com");
  if (type === "COM") await page.getByLabel("Forma de aquisição", { exact: false }).selectOption("purchase");
  await next(page);
  await expect(page.getByRole("button", { name: /^Medicamentos/, pressed: true })).toBeVisible();
  const checkbox = page.getByRole("checkbox", { name: new RegExp("^Material de cuidado") }); await checkbox.check();
  const product = page.locator(type === "REQ" ? "article" : ".product-choice").filter({ has: checkbox });
  const quantity = product.getByLabel(type === "REQ" ? "Estoque observado com a equipe" : "Quantidade — " + name, { exact: type !== "REQ" });
  await quantity.fill(type === "REQ" ? "99999" : "12");
  const reference = await browser.newContext();
  try {
    const model = await reference.newPage(); await model.route(/^https?:/, route => route.abort());
    await model.goto(pathToFileURL(resolve("Home_Care_Assistant_Modelo_Integral.html")).href + "#nova/" + type);
    await model.locator("#roleSelect").selectOption("family"); await model.locator(".productoption input[type=checkbox]").first().check();
    mkdirSync("output/playwright/phase-d", { recursive: true });
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 }); await model.setViewportSize({ width, height: 900 });
      const selected = model.locator(".productoption").filter({ has: model.locator("input:checked") }).first();
      for (const property of ["background-color", "border-color", "border-radius", "padding-left", "padding-top"] as const) {
        const expected = await selected.evaluate((node, property) => getComputedStyle(node).getPropertyValue(property), property);
        await expect(product).toHaveCSS(property, expected);
      }
      for (const property of ["font-size", "font-weight"] as const) {
        const font = await selected.locator("strong").evaluate((node, property) => getComputedStyle(node).getPropertyValue(property), property);
        await expect(product.locator("strong").first()).toHaveCSS(property, font);
      }
      await expect(quantity).toHaveValue(type === "REQ" ? "99999" : "12");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await auditFromTop(page, `canonical ${type} selection ${width}`);
      if (width === 320) {
        const box = await product.boundingBox();
        if (!box) throw new Error("The visible material needs a capture boundary");
        await page.screenshot({ path: `output/playwright/phase-d/${type.toLowerCase()}-choice-${info.project.name}.png`, fullPage: true, clip: box, animations: "disabled" });
      }
    }
    for (let step = 0; step < 3; step++) await next(page);
    await expect(page.getByRole("heading", { name: "Revisão", exact: true })).toBeVisible();
    await expect(page.getByText(name, { exact: false }).first()).toBeVisible();
    await model.locator('[data-action="wizardNext"]').click();
    if (type === "REQ") await model.locator('input[name^="observed-"]').fill("99999");
    await model.locator('[data-action="wizardNext"]').click(); await model.locator('[data-action="wizardNext"]').click();
    const reviewRecord = page.locator(".hca-material-review li").first(), modelRecord = model.locator("#wizardForm .record").first();
    await expect(modelRecord).toBeVisible();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await model.setViewportSize({ width, height: 900 });
      for (const property of ["display", "padding-left", "padding-top", "gap", "border-bottom-width"] as const) {
        await expect(reviewRecord).toHaveCSS(property, await modelRecord.evaluate((node, property) => getComputedStyle(node).getPropertyValue(property), property));
      }
      for (const selector of ["strong", "small"]) for (const property of ["font-size", "font-weight"] as const) {
        await expect(reviewRecord.locator(selector).first()).toHaveCSS(property, await modelRecord.locator(selector).first().evaluate((node, property) => getComputedStyle(node).getPropertyValue(property), property));
      }
      const grid = page.locator(".hca-document-wizard .hca-definition-grid").first(), modelGrid = model.locator("#wizardForm .kv");
      for (const property of ["display", "gap"] as const) await expect(grid).toHaveCSS(property, await modelGrid.evaluate((node, property) => getComputedStyle(node).getPropertyValue(property), property));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await auditFromTop(page, `canonical ${type} review ${width}`);
      if (width === 320) await page.screenshot({ path: `output/playwright/phase-d/${type.toLowerCase()}-review-${info.project.name}.png`, fullPage: true, animations: "disabled" });
    }
    expect(facts(f.patient)).toBe(before); expect(writes).toEqual([]);
  } finally { await reference.close(); }
});

for (const type of ["REQ", "COM"] as const) test(`06.1 ${type} materials follow the v7 compact list with reversible search`, async ({ page }, info) => {
  const names = ["Material detalhado " + "com nome extenso ".repeat(6) + randomUUID().slice(0, 8), "Outro material " + randomUUID().slice(0, 8)];
  const f = await setup({ catalogue: names.map(name => ({ name, category: "medicamentos", unit: "unidade", aliases: [] })) });
  const doc = type === "REQ" ? await issue(f.patient, f.products) : await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_draft: false,
    p_payload: { origin: "purchase", lines: f.products.map(productId => ({ productId, quantity: "10" })) },
  });
  await login(page, f.patient, fixtures.family.email);
  await page.goto(type === "REQ" ? "/historico/" + doc.id : "/documentos/" + doc.id);
  await selectDocumentSection(page, "materials");
  const list = page.getByRole("list", { name: type === "REQ" ? "Materiais requisitados" : "Materiais da compra ou doação", exact: true });
  const items = list.getByRole("listitem");
  await expect(items).toHaveCount(2);
  const ids = await items.evaluateAll(nodes => nodes.map(node => node.getAttribute("data-material-line-id")));
  const before = facts(f.patient), writes: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/") && request.method() !== "GET" && !isDocumentAccessReport(request)) writes.push(request.url()); });
  {
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 900 });
      const row = items.first().getByRole("button");
      await expect(row).toHaveCSS("display", "grid");
      await expect(row).toHaveCSS("padding-left", "15px");
      await expect(row).toHaveCSS("padding-top", "12px");
      await expect(list.getByText(names[0], { exact: true })).toBeVisible();
      await expect(list.getByText(names[1], { exact: true })).toBeVisible();
      await expect(row.locator(".hca-v7-material-facts > span")).toHaveCount(type === "REQ" ? 2 : 4);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await auditFromTop(page, `canonical ${type} materials ${width}`);
      if (width === 320) {
        mkdirSync("output/playwright/phase-d", { recursive: true });
        const box = await page.locator(".hca-document-materials").boundingBox();
        if (!box) throw new Error("The visible materials section needs a capture boundary");
        await page.screenshot({ path: `output/playwright/phase-d/${type.toLowerCase()}-materials-${info.project.name}.png`, fullPage: true, clip: box, animations: "disabled" });
      }
    }
    const search = page.getByRole("searchbox", { name: "Pesquisar material", exact: true });
    await search.fill("OUTRO--MATERIAL"); await expect(items).toHaveCount(1);
    await expect(list).toContainText(names[1]);
    await search.fill("Sem correspondência fictícia"); await expect(list).toHaveCount(0);
    const clear = page.getByRole("button", { name: "Limpar busca", exact: true });
    await clear.focus(); await clear.press("Enter"); await expect(items).toHaveCount(2);
    expect(await items.evaluateAll(nodes => nodes.map(node => node.getAttribute("data-material-line-id")))).toEqual(ids);
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches && matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
    await auditFromTop(page, `canonical ${type} forced colors and reduced motion`);
    await page.emulateMedia({ forcedColors: "none", reducedMotion: "no-preference" });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
    await expect(search).toBeVisible(); await expect(list.getByText(names[0], { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => { document.documentElement.style.zoom = ""; });
    expect(facts(f.patient)).toBe(before); expect(writes).toEqual([]);
  }
});
