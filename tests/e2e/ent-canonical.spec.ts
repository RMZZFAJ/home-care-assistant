import { expect, test, type Browser, type Page, type Locator } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { setup, fixtures, rpc } from "../integration/v4-fixtures.mjs";
import { transferFixture, declareTransfer } from "../integration/transfer-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { selectDocumentSection } from "./document-sections";
import { selectDeliveryRecipient } from "./delivery-recipient";
import { auditFromTop } from "./accessibility-audit";

test.setTimeout(180_000);
const widths = [320, 390, 768, 1024, 1440];
const facts = (patient: string) => sql(`select jsonb_build_object('docs',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id=${q(patient)}),'lines',(select jsonb_agg(to_jsonb(l) order by l.id) from public.document_lines l join public.operational_documents d on d.id=l.document_id where d.care_recipient_id=${q(patient)}),'events',(select jsonb_agg(to_jsonb(e) order by e.id) from public.document_events e where care_recipient_id=${q(patient)}),'transfers',(select jsonb_agg(to_jsonb(t) order by document_id) from public.ent_transfers t where care_recipient_id=${q(patient)}),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(patient)}));`);
async function login(page: Page, patient: string) {
  await page.goto("/login"); await page.getByLabel("E-mail", { exact: true }).fill(fixtures.family.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword); await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible(); await selectContext(page, patient);
}
async function reference(browser: Browser, route: string) {
  const context = await browser.newContext(), page = await context.newPage();
  await page.route(/^https?:/, route => route.abort());
  await page.goto(pathToFileURL(resolve("Home_Care_Assistant_Modelo_Integral.html")).href + "#" + route);
  await page.locator("#roleSelect").selectOption("family");
  return { context, page };
}
async function referenceReview(model: Page) {
  await model.locator('.productoption input[type="checkbox"]').first().check();
  await model.locator('[data-action="wizardNext"]').click();
  await model.locator('select[name="recipient"]').selectOption({ index: 0 });
  await model.locator('[data-action="wizardNext"]').click(); await model.locator('[data-action="wizardNext"]').click();
  await expect(model.locator("#wizardForm .kv")).toBeVisible();
}
function watchWrites(page: Page) {
  const writes: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/") && request.method() !== "GET") writes.push(request.url()); });
  return writes;
}
async function captureVisible(locator: Locator, path: string) {
  await locator.evaluate(node => node.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" }));
  expect(await locator.evaluate(node => {
    const box = node.getBoundingClientRect(), x = box.left + box.width / 2;
    return [box.top + 12, box.bottom - 12].every(y => y > 0 && y < innerHeight && node.contains(document.elementFromPoint(x, y)));
  }), "The actual scrolled content must be clear of fixed navigation").toBe(true);
  await locator.screenshot({ path, animations: "disabled" });
}

test("06.2 ENT selection and complete readonly review follow the model without shipment", async ({ page, browser }, info) => {
  const name = "Material de entrega " + "com nome extenso ".repeat(6) + randomUUID().slice(0, 8);
  const f = await setup({ catalogue: [{ name, category: "medicamentos", unit: "unidade", aliases: [] }] });
  await login(page, f.patient); const before = facts(f.patient), writes = watchWrites(page);
  await page.goto("/fichas/ent");
  const response = await page.request.get(`/api/documents/delivery-preparation?careRecipientId=${f.patient}&source=FAMILY`);
  expect(response.ok()).toBe(true);
  const person = ((await response.json()).data.people as { id: string; name: string }[]).find(p => p.id === fixtures.professional.id);
  if (!person) throw new Error("The native preparation must include the eligible recipient");
  const reason = "Escolha pessoal fictícia para conferir a revisão visual da entrega";
  await selectDeliveryRecipient(page, person.name, reason);
  const next = () => page.getByRole("button", { name: /^(Avançar|Revisar)$/ }).click();
  await next(); const checkbox = page.getByRole("checkbox", { name: name + " unidade", exact: true });
  await checkbox.check(); await page.getByLabel("Quantidade — " + name, { exact: true }).fill("12");
  const ref = await reference(browser, "nova/ENT");
  try {
    await ref.page.locator('.productoption input[type="checkbox"]').first().check();
    const selected = ref.page.locator(".productoption").filter({ has: ref.page.locator("input:checked") }).first();
    const card = page.locator(".hca-material-choice").filter({ has: checkbox });
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 }); await ref.page.setViewportSize({ width, height: 900 });
      for (const property of ["background-color", "border-color", "border-radius", "padding-top"] as const) await expect(card).toHaveCSS(property, await selected.evaluate((node, property) => getComputedStyle(node).getPropertyValue(property), property));
      await expect(page.getByLabel("Quantidade — " + name, { exact: true })).toHaveValue("12");
      await auditFromTop(page, "canonical ENT selection " + width);
    }
    for (let step = 0; step < 4; step++) await next();
    await expect(page.getByRole("heading", { name: "Revisão", exact: true })).toBeVisible();
    await ref.page.locator('[data-action="wizardNext"]').click(); await ref.page.locator('select[name="recipient"]').selectOption({ index: 0 });
    await ref.page.locator('[data-action="wizardNext"]').click(); await ref.page.locator('[data-action="wizardNext"]').click();
    const grid = page.locator(".hca-document-wizard .hca-definition-grid").first();
    await expect(grid).toContainText(person.name); await expect(grid).toContainText("Família → Equipe");
    await expect(page.getByText("Justificativa da escolha: " + reason, { exact: true })).toBeVisible();
    await expect(page.locator(".hca-material-review")).toContainText(name); await expect(page.locator(".hca-material-review")).toContainText("12 unidade");
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 }); await ref.page.setViewportSize({ width, height: 900 });
      for (const property of ["display", "gap"] as const) await expect(grid).toHaveCSS(property, await ref.page.locator("#wizardForm .kv").evaluate((node, property) => getComputedStyle(node).getPropertyValue(property), property));
      await auditFromTop(page, "canonical ENT review " + width);
    }
    mkdirSync("output/playwright/phase-d", { recursive: true });
    await captureVisible(grid, `output/playwright/phase-d/ent-review-identity-${info.project.name}.png`);
    await captureVisible(page.locator(".hca-material-review"), `output/playwright/phase-d/ent-review-material-${info.project.name}.png`);
    expect(facts(f.patient)).toBe(before); expect(writes).toEqual([]);
  } finally { await ref.context.close(); }
});

test("06.2 dispatched ENT preserves five independent material fields and reversible canonical search", async ({ page, browser }, info) => {
  const names = ["Material expedido " + "com nome extenso ".repeat(6) + randomUUID().slice(0, 8), "Outro material " + randomUUID().slice(0, 8)];
  const f = await setup({ catalogue: names.map(name => ({ name, category: "medicamentos", unit: "unidade", aliases: [] })) });
  const doc = await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "ENT", p_key: randomUUID(), p_draft: false, p_payload: { source: "FAMILY", destination: "CARE_TEAM", recipientId: fixtures.professional.id, recipientReason: "Escolha manual fictícia para conferência da composição", lines: f.products.map(productId => ({ productId, quantity: "7" })) } });
  await login(page, f.patient); await page.goto("/documentos/" + doc.id); await selectDocumentSection(page, "materials");
  const table = page.getByRole("table", { name: "Materiais da entrega ou transferência", exact: true });
  await expect(table.locator("tbody tr")).toHaveCount(2); await expect(table.locator("tbody td")).toHaveCount(10);
  const first = table.locator("tbody tr").filter({ has: page.getByText(names[0], { exact: true }) });
  for (const [label, value] of [["Expedido", "7 unidade"], ["Aceito", "0 unidade"], ["Conciliado", "0 unidade"], ["Quantidade pendente", "7 unidade"]]) await expect(first.locator(`td[data-label="${label}"]`)).toContainText(value);
  const before = facts(f.patient), writes = watchWrites(page), ids = await table.locator("tbody tr").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-material-line-id")));
  const ref = await reference(browser, "ficha/ENT-0001/materiais");
  try {
    const model = ref.page.locator(".tablewrap.mobilecards").first(); await expect(model).toBeVisible();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 }); await ref.page.setViewportSize({ width, height: 900 });
      for (const property of ["border-radius", "border-color", "background-color"] as const) await expect(table.locator("..")).toHaveCSS(property, await model.evaluate((node, property) => getComputedStyle(node).getPropertyValue(property), property));
      for (const property of ["display", "padding-left", "padding-top", "gap"] as const) await expect(first).toHaveCSS(property, await model.locator("tbody tr").first().evaluate((node, property) => getComputedStyle(node).getPropertyValue(property), property));
      await auditFromTop(page, "canonical dispatched ENT " + width);
      if (width === 320) {
        mkdirSync("output/playwright/phase-d", { recursive: true });
        await captureVisible(first, `output/playwright/phase-d/ent-materials-first-${info.project.name}.png`);
        await captureVisible(table.locator("tbody tr").last(), `output/playwright/phase-d/ent-materials-last-${info.project.name}.png`);
      }
    }
    const search = page.getByRole("searchbox", { name: "Pesquisar material", exact: true });
    await search.fill("OUTRO--MATERIAL"); await expect(table.locator("tbody tr")).toHaveCount(1);
    await search.fill("Sem correspondência fictícia"); await expect(table).toHaveCount(0);
    const clear = page.getByRole("button", { name: "Limpar busca de materiais", exact: true }); await clear.focus(); await clear.press("Enter");
    expect(await table.locator("tbody tr").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-material-line-id")))).toEqual(ids);
    expect(facts(f.patient)).toBe(before); expect(writes).toEqual([]);
  } finally { await ref.context.close(); }
});

test("06.2 autonomous return declaration never presents declared quantities as shipped or received", async ({ page, browser }) => {
  const f = await transferFixture(), created = await declareTransfer(f, { originDocumentId: null });
  expect(created.response.error).toBeNull(); const doc = created.response.data;
  expect(doc.transfer.originDocumentId).toBeNull(); expect(doc.protocol).toBeNull();
  await login(page, f.patient); await page.goto("/documentos/" + doc.id); await selectDocumentSection(page, "materials");
  const table = page.getByRole("table", { name: "Materiais da entrega ou transferência", exact: true });
  await expect(table.locator("tbody tr")).toHaveCount(1); await expect(table.locator("tbody td")).toHaveCount(2);
  await expect(page.getByText("Expedido", { exact: true })).toHaveCount(0); await expect(table).toContainText("5 unidade");
  const before = facts(f.patient), writes = watchWrites(page);
  await selectDocumentSection(page, "workflow");
  const region = page.getByRole("region", { name: "Declaração e concordância da transferência", exact: true }), grid = region.locator(".hca-definition-grid").first();
  await expect(region).toContainText("Esta devolução pode ser registrada de forma autônoma");
  for (const label of ["Declarante", "Registrada em", "Contraparte designada para concordância", "Recebedor físico designado"]) await expect(grid.locator("dt").filter({ hasText: label })).toBeVisible();
  const ref = await reference(browser, "nova/ENT");
  try {
    await referenceReview(ref.page);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 }); await ref.page.setViewportSize({ width, height: 900 });
      for (const property of ["display", "gap"] as const) await expect(grid).toHaveCSS(property, await ref.page.locator("#wizardForm .kv").evaluate((node, property) => getComputedStyle(node).getPropertyValue(property), property));
      await auditFromTop(page, "canonical autonomous return facts " + width);
    }
    expect(facts(f.patient)).toBe(before); expect(writes).toEqual([]);
  } finally { await ref.context.close(); }
});
