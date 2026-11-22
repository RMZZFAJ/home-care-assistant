import { isDocumentAccessReport } from "./display-access-report";
import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdirSync } from "node:fs";
import { setup, issue, rpc } from "../integration/v4-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { auditFromTop } from "./accessibility-audit";
import { expectMobileMaterialRow, mobileMaterialReference, openIssuedMaterials } from "./l2-mobile-materials";

test.setTimeout(180_000);
const widths = [320, 390, 768, 1024, 1440];
async function login(page: Page, patient: string, email: string) {
  await page.goto("/login"); await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword); await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible(); await selectContext(page, patient);
}
const next = (page: Page) => page.getByRole("button", { name: /^(Selecionar materiais|Continuar|Revisar ficha)$/ }).click();
const facts = (patient: string) => sql(`select jsonb_build_object('req',(select jsonb_agg(to_jsonb(r) order by id) from public.requisitions r where care_recipient_id=${q(patient)}),'docs',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id=${q(patient)}),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(patient)}));`);

test("REQ guarda no rascunho a ficha escolhida pelo menu do material", async ({ page }) => {
  const name = "Material para vínculo";
  const f = await setup({ catalogue: [{ name, category: "medicamentos", unit: "unidade", aliases: [] }] });
  const productId = f.products[0];
  const purchase = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient, p_type: "COM", p_draft: false, p_key: randomUUID(),
    p_payload: { lines: [{ productId, quantity: "1" }], acquisitionMode: "planned" },
  });
  const user = await shiftWorker(f.patient, "admin");
  const before = facts(f.patient);
  await page.goto("/login?next=%2Ffichas%2Freq", { waitUntil: "domcontentloaded" });
  await page.getByLabel("E-mail", { exact: true }).fill(user.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Etapas da requisição", exact: true }))
    .toBeVisible({ timeout: 45_000 });
  await expect(page.locator(".hca-workspace")).toHaveAttribute("data-context-patient", f.patient);
  await next(page);
  await page.getByRole("checkbox", { name, exact: false }).check();
  const more = page.getByRole("button", { name: "Mais ações de " + name, exact: true });
  await more.click();
  await page.getByRole("menuitem", { name: "Vincular a uma ficha", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Vincular este material", exact: true });
  await picker.getByRole("button", { name: "COM", exact: true }).click();
  await picker.getByRole("checkbox", { name: "Vincular " + purchase.code, exact: true }).check();
  await picker.getByRole("button", { name: "Aplicar vínculos", exact: true }).click();
  await expect(more).toBeFocused();
  await expect(page.getByText("1 ficha vinculada", { exact: true })).toBeVisible();
  await expect(page.getByText("Último rascunho salvo.", { exact: true })).toBeVisible();
  await expect.poll(async () => (await rpc(user.client, "creation_draft_context", {
    p_patient: f.patient, p_kind: "REQ", p_target: null,
  }))?.content.materialReferences).toEqual([{ productId, documentId: purchase.id }]);
  expect(facts(f.patient)).toBe(before);
});

for (const type of ["REQ", "COM"] as const) test(`06.1 ${type} selection and review follow the canonical model in five widths without operational writes`, async ({ page, browser }, info) => {
  const f = await setup({ catalogue: [{ name: "Material de cuidado " + "com nome extenso ".repeat(5) + randomUUID().slice(0, 8), category: "medicamentos", unit: "mL", aliases: [] }] });
  const name = sql(`select name from public.care_recipient_products where care_recipient_id=${q(f.patient)} and product_id=${q(f.products[0])};`);
  // Five complete accessibility passes should measure this fixture, even
  // when an older local stack retains thousands of residences for shared test accounts.
  const user = await shiftWorker(f.patient, type === "REQ" ? "professional" : "family");
  await login(page, f.patient, user.email); const before = facts(f.patient);
  const writes: string[] = []; page.on("request", request => { if (["/api/requisitions", "/api/documents"].includes(new URL(request.url()).pathname) && request.method() === "POST") writes.push(request.url()); });
  await page.goto(type === "REQ" ? "/fichas/req" : "/fichas/com");
  await next(page);
  await expect(page.getByRole("button", { name: /^Medicamentos/, pressed: true })).toBeVisible();
  const checkbox = page.getByRole("checkbox", { name: new RegExp("^Material de cuidado") }); await checkbox.check();
  const product = page.locator(type === "REQ" ? "article" : ".product-choice").filter({ has: checkbox });
  const quantity = product.getByLabel(type === "REQ" ? "Estoque atual" : "Quantidade — " + name, { exact: type !== "REQ" });
  await quantity.fill(type === "REQ" ? "99999" : "12");
  const reference = await browser.newContext();
  try {
    const model = await reference.newPage(); await model.route(/^https?:/, route => route.abort());
    const scenario = type === "REQ" ? "E04-01" : "E05-01";
    await model.goto(pathToFileURL(resolve("hca-laboratorio-02-v7.html")).href + "#" + scenario + "/review");
    mkdirSync("output/playwright/phase-d", { recursive: true });
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await expect(product).toHaveClass(/is-selected/);
      await expect(product.locator(".hca-wizard-material-head")).toHaveCSS("display", "flex");
      await expect(product.locator(".hca-wizard-material-head").getByRole("button", { name: /^Mais ações de / })).toBeVisible();
      await expect(checkbox).toHaveCSS("appearance", "none");
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
    await expect(page.getByRole("heading", { name: "Revise antes de emitir", exact: true })).toBeVisible();
    await expect(page.locator(".hca-wizard-review-identity dt")).toHaveText(["Paciente", "Preenchido por", "Tipo de ficha", "Destino"]);
    const destination = type === "REQ" ? "Família · avaliação da necessidade" : "Família · aquisição de materiais";
    await expect(page.getByText(destination, { exact: true })).toBeVisible();
    if (type === "REQ") await expect(page.getByText("O estoque será atualizado ao emitir", { exact: true })).toBeVisible();
    await expect(page.getByText(name, { exact: false }).first()).toBeVisible();
    const reviewRecord = page.locator(".hca-wizard-review-group .hca-material-review li").first();
    const modelRecord = model.locator("#product-app .review-group .material-row").first();
    await expect(modelRecord).toBeVisible();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await model.setViewportSize({ width, height: 900 });
      if (width <= 390) {
        for (const property of ["display", "padding-left", "padding-top", "gap", "border-radius"] as const) {
          await expect(reviewRecord).toHaveCSS(property, await modelRecord.evaluate((node, property) => getComputedStyle(node).getPropertyValue(property), property));
        }
      }
      await expect(reviewRecord.getByRole("button", { name: "Editar material " + name, exact: true })).toBeVisible();
      const grid = page.locator(".hca-wizard-review-identity");
      await expect(grid).toHaveCSS("display", "grid");
      await expect(grid).toHaveCSS("gap", width <= 500 ? "16px" : "16px 24px");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await auditFromTop(page, `canonical ${type} review ${width}`);
      if (width === 320) await page.screenshot({ path: `output/playwright/phase-d/${type.toLowerCase()}-review-${info.project.name}.png`, fullPage: true, animations: "disabled" });
    }
    expect(facts(f.patient)).toBe(before); expect(writes).toEqual([]);
  } finally { await reference.close(); }
});

for (const type of ["REQ", "COM"] as const) test(`06.1 ${type} materials follow the v7 compact list with reversible search`, async ({ page, browser }, info) => {
  const names = ["Material detalhado " + "com nome extenso ".repeat(6) + randomUUID().slice(0, 8), "Outro material " + randomUUID().slice(0, 8)];
  const f = await setup({ catalogue: names.map(name => ({ name, category: "medicamentos", unit: "unidade", aliases: [] })) });
  const doc = type === "REQ" ? await issue(f.patient, f.products) : await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_draft: false,
    p_payload: { origin: "purchase", lines: f.products.map(productId => ({ productId, quantity: "10" })) },
  });
  await openIssuedMaterials(page, f.patient, doc.id);
  const materials = page.getByRole("tabpanel", { name: "Materiais", exact: true });
  await expect(materials.locator(":scope > section").first().getByRole("heading", { name: "Materiais", exact: true })).toBeVisible();
  const list = page.getByRole("list", { name: type === "REQ" ? "Materiais requisitados" : "Materiais da compra ou doação", exact: true });
  const items = list.getByRole("listitem");
  await expect(items).toHaveCount(2);
  const ids = await items.evaluateAll(nodes => nodes.map(node => node.getAttribute("data-material-line-id")));
  const before = facts(f.patient), writes: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/") && request.method() !== "GET" && !isDocumentAccessReport(request)) writes.push(request.url()); });
  const reference = await mobileMaterialReference(browser, type === "REQ" ? "REQ-0003" : "COM-0028");
  try {
    for (const width of [320, 360, 412]) {
      await page.setViewportSize({ width, height: 900 });
      const row = items.first().getByRole("button");
      await expectMobileMaterialRow(row, reference.page, width);
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
    await materials.getByRole("button", { name: "Todos (1)", exact: true }).click();
    const pending = materials.getByRole("group", { name: "Filtrar materiais" }).getByRole("button", { name: "Pendentes (1)", exact: true });
    await pending.focus();
    await pending.press("Enter");
    await expect(materials.getByRole("button", { name: "Pendentes (1)", exact: true })).toBeFocused();
    await expect(search).toHaveValue("OUTRO--MATERIAL");
    await search.fill("Sem correspondência fictícia"); await expect(list).toHaveCount(0);
    const clear = page.getByRole("button", { name: "Limpar busca", exact: true });
    await clear.focus(); await clear.press("Enter"); await expect(items).toHaveCount(2);
    await expect(search).toBeFocused();
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
  } finally {
    await reference.context.close();
  }
});
