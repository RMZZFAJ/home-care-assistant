import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { setup, issue, delivery, actor, rpc, fixtures } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";

test.setTimeout(150_000);
async function login(page: Page, patient: string, role = "family") {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures[role].email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}
async function open(page: Page, id: string, type = "REQ") {
  const opening = type === "REQ" ? page.waitForResponse(r => r.url().includes(`/api/requisitions/${id}/openings`) && r.request().method() === "POST") : null;
  await page.goto("/documentos/" + id);
  if (opening) await (await opening).finished();
  await expect(page.getByRole("button", { name: "Registrar andamento", exact: true })).toBeEnabled();
}
const state = (id: string, patient: string) => sql(`select jsonb_build_object('document',(select to_jsonb(d) from public.operational_documents d where id=${sqlLiteral(id)}),
 'movements',(select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]') from public.stock_movements m where care_recipient_id=${sqlLiteral(patient)}))::text;`);

test("Andamento conserva rascunho, recupera publicação após reload com a mesma chave e não altera ficha, estoque ou autoria", async ({ page }, info) => {
  const f = await setup(), req = await issue(f.patient, f.products), family = await actor("family", f.patient);
  const com = await rpc(family, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_draft: false, p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity: "1" }] } });
  await login(page, f.patient); await open(page, req.id);
  const feed = page.getByRole("region", { name: "Andamentos da ficha", exact: true });
  await feed.getByRole("button", { name: "Registrar andamento", exact: true }).click();
  let editor = page.getByRole("dialog", { name: "Registrar andamento", exact: true });
  const text = "Registro fictício <img src=x onerror=alert(1)> sem HTML executável";
  await editor.getByRole("textbox", { name: "Texto do andamento", exact: true }).fill(text);
  await editor.getByRole("combobox", { name: "Categoria", exact: true }).selectOption("contact");
  await editor.getByRole("combobox", { name: "Etapa relacionada (opcional)", exact: true }).selectOption("family_science");
  await editor.getByRole("button", { name: "Guardar rascunho e fechar", exact: true }).click();
  await page.reload();
  await feed.getByRole("button", { name: "Registrar andamento", exact: true }).click();
  editor = page.getByRole("dialog", { name: "Registrar andamento", exact: true });
  await expect(editor.getByRole("textbox", { name: "Texto do andamento", exact: true })).toHaveValue(text);
  await expect(editor.getByRole("combobox", { name: "Categoria", exact: true })).toHaveValue("contact");
  await editor.getByLabel("Código da ficha a vincular", { exact: true }).fill(com.code);
  await editor.getByRole("button", { name: "Buscar fichas para referência", exact: true }).click();
  await editor.getByRole("textbox", { name: "Texto do andamento", exact: true }).fill("x".repeat(2000));
  await editor.getByRole("button", { name: "Inserir referência " + com.code, exact: true }).click();
  await expect(editor).toContainText("A referência ultrapassaria 2000 caracteres");
  await expect(editor.getByRole("textbox", { name: "Texto do andamento", exact: true })).toHaveValue("x".repeat(2000));
  await expect(editor.getByRole("button", { name: "Remover referência 1", exact: true })).toHaveCount(0);
  await editor.getByRole("textbox", { name: "Texto do andamento", exact: true }).fill(text);
  await editor.getByRole("button", { name: "Inserir referência " + com.code, exact: true }).click();
  const fullText = text + " #" + com.code;
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await audit(page, "Andamento editor " + width);
  }
  const before = state(req.id, f.patient), packets: unknown[] = [];
  await page.route(`**/api/documents/${req.id}/progress`, async route => {
    if (route.request().method() !== "POST") return route.continue();
    packets.push(route.request().postDataJSON());
    if (packets.length === 1) { const response = await route.fetch(); expect(response.ok()).toBe(true); return route.abort("failed"); }
    return route.continue();
  });
  await editor.getByRole("button", { name: "Publicar andamento", exact: true }).click();
  editor = page.getByRole("dialog", { name: "Recuperar publicação de andamento", exact: true });
  await expect(editor.getByRole("button", { name: "Recuperar a mesma publicação", exact: true })).toBeEnabled();
  await expect(editor.getByRole("textbox", { name: "Texto do andamento", exact: true })).toBeDisabled();
  await editor.getByRole("button", { name: "Fechar guardando referência", exact: true }).click();
  await page.reload();
  await feed.getByRole("button", { name: "Recuperar publicação", exact: true }).click();
  editor = page.getByRole("dialog", { name: "Recuperar publicação de andamento", exact: true });
  await expect(editor.getByRole("textbox", { name: "Texto do andamento", exact: true })).toHaveValue(fullText);
  await editor.getByRole("button", { name: "Recuperar a mesma publicação", exact: true }).click();
  await expect(editor).toHaveCount(0);
  await expect(feed).toContainText("Publicação recuperada");
  expect(packets).toHaveLength(2); expect(packets[1]).toEqual(packets[0]);
  await feed.getByRole("combobox", { name: "Mostrar Andamentos", exact: true }).selectOption("manual");
  await expect(feed.getByText(fullText, { exact: true })).toBeVisible();
  await expect(feed.locator("img")).toHaveCount(0);
  await expect(feed.getByRole("button", { name: com.code, exact: true })).toBeVisible();
  expect(sql(`select count(*) from private.document_progress_notes where document_id=${sqlLiteral(req.id)};`)).toBe("1");
  expect(sql(`select author_id from private.document_progress_notes where document_id=${sqlLiteral(req.id)};`)).toBe(fixtures.family.id);
  expect(state(req.id, f.patient)).toBe(before);
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await feed.scrollIntoViewIfNeeded();
    await audit(page, "Andamento publicado " + width);
    await info.attach("Andamento publicado " + width, { body: await feed.screenshot(), contentType: "image/png" });
  }
});

test("Andamentos alcançam todos os registros, separam fatos e ocultam consulta recusada sem apagar edição própria", async ({ page }) => {
  const f = await setup(), req = await issue(f.patient, f.products), professional = await actor("professional", f.patient);
  for (let index = 0; index < 43; index++) await rpc(professional, "document_progress_publish", { p_document: req.id, p_key: randomUUID(), p_body: { category: "record", stage: null, text: `Registro fictício ${index}`, references: [] } });
  await login(page, f.patient, "professional"); await open(page, req.id);
  const feed = page.getByRole("region", { name: "Andamentos da ficha", exact: true });
  await feed.getByRole("combobox", { name: "Mostrar Andamentos", exact: true }).selectOption("manual");
  for (const [pageNumber, count, first] of [[1, 20, 0], [2, 20, 20], [3, 3, 40]]) {
    await expect(feed).toContainText(`Página ${pageNumber} de 3`);
    await expect(feed.getByRole("article")).toHaveCount(count);
    await expect(feed.getByText(`Registro fictício ${first}`, { exact: true })).toBeVisible();
    if (pageNumber < 3) await feed.getByRole("button", { name: "Próximos", exact: true }).click();
  }
  await feed.getByRole("combobox", { name: "Mostrar Andamentos", exact: true }).selectOption("automatic");
  await expect(feed.getByText("Registro fictício 0", { exact: true })).toHaveCount(0);
  await expect(feed.getByText("Requisição emitida", { exact: true })).toBeVisible();
  await feed.getByRole("button", { name: "Registrar andamento", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Registrar andamento", exact: true });
  await editor.getByRole("textbox", { name: "Texto do andamento", exact: true }).fill("Texto próprio preservado durante recusa");
  await editor.getByRole("button", { name: "Guardar rascunho e fechar", exact: true }).click();
  await page.route(`**/api/documents/${req.id}/progress?*`, route => route.fulfill({ status: 403, json: { code: "FORBIDDEN", error: "Consulta recusada fictícia" } }));
  await feed.getByRole("button", { name: "Atualizar Andamentos", exact: true }).click();
  await expect(feed).toContainText("Não foi possível consultar os Andamentos");
  await expect(feed.getByText("Requisição emitida", { exact: true })).toHaveCount(0);
  await page.unroute(`**/api/documents/${req.id}/progress?*`);
  await feed.getByRole("button", { name: "Atualizar Andamentos", exact: true }).click();
  await feed.getByRole("button", { name: "Registrar andamento", exact: true }).click();
  await expect(editor.getByRole("textbox", { name: "Texto do andamento", exact: true })).toHaveValue("Texto próprio preservado durante recusa");
});

test("Andamentos funcionam em REQ COM ENT e BAL sem modificar versões ou movimentos", async ({ page }) => {
  const f = await setup(), req = await issue(f.patient, f.products), ent = await delivery(f.patient, req, f.products);
  const family = await actor("family", f.patient);
  const com = await rpc(family, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_draft: false, p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity: "1" }] } });
  await actor("adminA", f.patient);
  const bal = await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "BAL", p_key: randomUUID(), p_draft: false, p_payload: { lines: f.products.map((productId: string) => ({ productId, quantity: "2" })) } });
  await login(page, f.patient);
  for (const [type, id] of [["REQ", req.id], ["COM", com.id], ["ENT", ent.id], ["BAL", bal.id]]) {
    await open(page, id, type);
    const before = state(id, f.patient), feed = page.getByRole("region", { name: "Andamentos da ficha", exact: true });
    await feed.getByRole("button", { name: "Registrar andamento", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Registrar andamento", exact: true });
    await editor.getByRole("textbox", { name: "Texto do andamento", exact: true }).fill("Registro complementar fictício " + type);
    await editor.getByRole("button", { name: "Publicar andamento", exact: true }).click();
    await expect(editor).toHaveCount(0);
    await expect(feed).toContainText("Andamento publicado");
    expect(state(id, f.patient)).toBe(before);
  }
});
