import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdirSync } from "node:fs";
import { setup, fixtures, issue, rpc } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { auditFromTop } from "./accessibility-audit";
import { selectDocumentSection } from "./document-sections";

test.setTimeout(180_000);
const widths = [320, 390, 768, 1024, 1440];
async function login(page: Page, patient: string, role: "professional" | "family") {
  await page.goto("/login"); await page.getByLabel("E-mail", { exact: true }).fill(fixtures[role].email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword); await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible(); await selectContext(page, patient);
}
const next = (page: Page) => page.getByRole("button", { name: /^(Avançar|Revisar)$/ }).click();
const facts = (patient: string) => sql(`select jsonb_build_object('req',(select jsonb_agg(to_jsonb(r) order by id) from public.requisitions r where care_recipient_id=${q(patient)}),'docs',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id=${q(patient)}),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(patient)}));`);

for (const type of ["REQ", "COM"] as const) test(`06.1 ${type} selection and review follow the canonical model in five widths without operational writes`, async ({ page, browser }, info) => {
  const f = await setup({ catalogue: [{ name: "Material de cuidado " + "com nome extenso ".repeat(5) + randomUUID().slice(0, 8), category: "medicamentos", unit: "mL", aliases: [] }] });
  const name = sql(`select name from public.care_recipient_products where care_recipient_id=${q(f.patient)} and product_id=${q(f.products[0])};`);
  await login(page, f.patient, type === "REQ" ? "professional" : "family"); const before = facts(f.patient);
  const writes: string[] = []; page.on("request", request => { if (["/api/requisitions", "/api/documents"].includes(new URL(request.url()).pathname) && request.method() === "POST") writes.push(request.url()); });
  await page.goto(type === "REQ" ? "/fichas/req" : "/fichas/com");
  if (type === "COM") await page.getByLabel("Forma de aquisição", { exact: false }).selectOption("purchase");
  await next(page); await expect(page.getByRole("heading", { name: "Medicamentos", exact: true })).toBeVisible();
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
    const remainingSteps = type === "REQ" ? 5 : 4; for (let step = 0; step < remainingSteps; step++) await next(page);
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

for (const type of ["REQ", "COM"] as const) test(`06.1 ${type} materials retain every fact with canonical responsive table and reversible search`, async ({ page, browser }, info) => {
  const names = ["Material detalhado " + "com nome extenso ".repeat(6) + randomUUID().slice(0, 8), "Outro material " + randomUUID().slice(0, 8)];
  const f = await setup({ catalogue: names.map(name => ({ name, category: "medicamentos", unit: "unidade", aliases: [] })) });
  const doc = type === "REQ" ? await issue(f.patient, f.products) : await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_draft: false,
    p_payload: { origin: "purchase", lines: f.products.map(productId => ({ productId, quantity: "10" })) },
  });
  await login(page, f.patient, "family");
  await page.goto(type === "REQ" ? "/historico/" + doc.id : "/documentos/" + doc.id);
  await selectDocumentSection(page, "materials");
  const table = page.getByRole("table", { name: type === "REQ" ? "Materiais requisitados" : "Materiais da compra ou doação", exact: true });
  await expect(table.locator("tbody tr")).toHaveCount(2);
  const ids = await table.locator("tbody tr").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-material-line-id")));
  const before = facts(f.patient), writes: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/") && request.method() !== "GET") writes.push(request.url()); });
  const reference = await browser.newContext();
  try {
    const model = await reference.newPage(); await model.route(/^https?:/, route => route.abort());
    await model.goto(pathToFileURL(resolve("Home_Care_Assistant_Modelo_Integral.html")).href + "#ficha/" + (type === "REQ" ? "REQ-0003" : "COM-0001") + "/materiais");
    await model.locator("#roleSelect").selectOption("family");
    const modelTable = model.locator(".tablewrap.mobilecards").first();
    await expect(modelTable).toBeVisible();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 }); await model.setViewportSize({ width, height: 900 });
      for (const property of ["border-radius", "background-color", "border-color"] as const) {
        const expected = await modelTable.evaluate((node, property) => getComputedStyle(node).getPropertyValue(property), property);
        await expect(table.locator("..")).toHaveCSS(property, expected);
      }
      const row = table.locator("tbody tr").first(), modelRow = modelTable.locator("tbody tr").first();
      for (const property of ["display", "padding-left", "padding-top", "gap"] as const) {
        const expected = await modelRow.evaluate((node, property) => getComputedStyle(node).getPropertyValue(property), property);
        await expect(row).toHaveCSS(property, expected);
      }
      await expect(table.getByText(names[0], { exact: true })).toBeVisible();
      await expect(table.getByText(names[1], { exact: true })).toBeVisible();
      await expect(table.locator("tbody td")).toHaveCount(type === "REQ" ? 8 : 18);
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
    await search.fill("OUTRO--MATERIAL"); await expect(table.locator("tbody tr")).toHaveCount(1);
    await expect(table).toContainText(names[1]);
    await search.fill("Sem correspondência fictícia"); await expect(table).toHaveCount(0);
    const clear = page.getByRole("button", { name: "Limpar busca de materiais", exact: true });
    await clear.focus(); await clear.press("Enter"); await expect(table.locator("tbody tr")).toHaveCount(2);
    expect(await table.locator("tbody tr").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-material-line-id")))).toEqual(ids);
    await page.getByRole("region", { name: /rolagem horizontal quando necessária/ }).focus();
    await expect(page.getByRole("region", { name: /rolagem horizontal quando necessária/ })).toBeFocused();
    await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
    expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches && matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
    await auditFromTop(page, `canonical ${type} forced colors and reduced motion`);
    await page.emulateMedia({ forcedColors: "none", reducedMotion: "no-preference" });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
    await expect(search).toBeVisible(); await expect(table.getByText(names[0], { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => { document.documentElement.style.zoom = ""; });
    expect(facts(f.patient)).toBe(before); expect(writes).toEqual([]);
  } finally { await reference.close(); }
});
