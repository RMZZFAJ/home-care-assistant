import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { setup, actor, fixtures, rpc } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";

test.setTimeout(180_000);
test.afterEach(async ({ page }) => page.unrouteAll({ behavior: "wait" }));
const rows = (page: Page) => page.locator("[data-delivery-id]");
const ids = (page: Page) => rows(page).evaluateAll(nodes => nodes.map(node => node.getAttribute("data-delivery-id")));
const facts = (patient: string) => sql(`select encode(sha256(convert_to(jsonb_build_object('documents',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id=${q(patient)}),'events',(select jsonb_agg(to_jsonb(e) order by id) from public.document_events e where care_recipient_id=${q(patient)}),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(patient)}))::text,'UTF8')),'hex');`);
async function login(page: Page, patient: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.professional.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}
async function delivery(f: Awaited<ReturnType<typeof setup>>, recipient = fixtures.professional.id, issuer = f.admin) {
  return rpc(issuer, "create_supply_document", { p_patient: f.patient, p_type: "ENT", p_payload: { source: "FAMILY", destination: "CARE_TEAM", recipientId: recipient, recipientReason: "Recebimento pessoal fictício para conferir a lista autorizada", lines: [{ productId: f.products[0], quantity: "1" }] }, p_key: randomUUID(), p_draft: false });
}
async function traverse(page: Page, order: string[]) {
  const seen: string[] = [];
  for (let offset = 0; offset < order.length; offset += 20) {
    await expect.poll(() => ids(page)).toEqual(order.slice(offset, offset + 20));
    if (offset === 20) {
      const url = page.url(); await page.reload();
      await expect.poll(() => ids(page)).toEqual(order.slice(offset, offset + 20));
      await page.goBack(); await expect.poll(() => ids(page)).toEqual(order.slice(0, 20));
      await page.goForward(); await expect(page).toHaveURL(url);
      await expect.poll(() => ids(page)).toEqual(order.slice(offset, offset + 20));
    }
    seen.push(...await ids(page) as string[]);
    const next = page.getByRole("navigation", { name: "Páginas das entregas", exact: true }).getByRole("button", { name: "Próxima", exact: true });
    if (offset + 20 < order.length) await next.click(); else await expect(next).toBeDisabled();
  }
  expect(seen).toEqual(order); expect(new Set(seen).size).toBe(order.length);
}
test("delivery list reaches more than100 own tasks and separates the authorized history without executing receipt", async ({ page }) => {
  const f = await setup();
  await rpc(f.admin, "family_stock_movement", { p_patient: f.patient, p_product: f.products[0], p_action: "inbound", p_quantity: "200", p_reason: "Saldo fictício para mais de100 tarefas de entrega", p_key: randomUUID() });
  for (let index = 0; index < 101; index++) await delivery(f);
  const other = await delivery(f, fixtures.adminA.id, await actor("family", f.patient));
  const oracle = (own: boolean): string[] => JSON.parse(sql(`select jsonb_agg(id::text order by created_at desc,id) from public.operational_documents where care_recipient_id=${q(f.patient)} and type='ENT'${own ? ` and recipient_id=${q(fixtures.professional.id)}` : ""};`));
  const own = oracle(true), team = oracle(false), before = facts(f.patient);
  expect(own).toHaveLength(101); expect(team).toHaveLength(102); expect(own).not.toContain(other.id);
  await login(page, f.patient);
  const writes: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/") && request.method() !== "GET") writes.push(request.url()); });
  await page.goto(`/entregas?careRecipientId=${f.patient}`);
  await traverse(page, own);
  const state = page.getByRole("combobox", { name: "Situação das entregas", exact: true }), scope = page.getByRole("combobox", { name: "Responsável pelas entregas", exact: true });
  await state.selectOption("pending_receipt"); await scope.selectOption("team");
  await traverse(page, team);
  await state.selectOption("cancelled");
  await expect(page.getByText("Nenhuma entrega nesta seleção", { exact: true })).toBeVisible();
  await expect(rows(page)).toHaveCount(0);
  await state.selectOption("tasks");
  await expect(scope).toHaveValue("own"); await expect(scope).toBeDisabled();
  await expect.poll(() => ids(page)).toEqual(own.slice(0, 20));
  expect(facts(f.patient)).toBe(before); expect(writes).toEqual([]);
});

test("delivery list refuses corrupt successful reads,preserves only matching scope and removes denied content", async ({ page }, info) => {
  const f = await setup(), doc = await delivery(f), before = facts(f.patient);
  await login(page, f.patient);
  let mode = "live";
  await page.route("**/api/deliveries?*", async route => {
    if (mode === "error") return route.fulfill({ status: 503, json: { code: "UNAVAILABLE", error: "Lista de entregas temporariamente indisponível" } });
    if (mode === "denied") return route.fulfill({ status: 403, json: { code: "FORBIDDEN", error: "Consulta de entregas recusada" } });
    const response = await route.fetch(), body = await response.json();
    if (mode === "incomplete") return route.fulfill({ response, json: { data: [] } });
    if (mode === "patient") body.careRecipientId = fixtures.reader.id;
    if (mode === "page") body.page = 2;
    if (mode === "status") body.filters.status = "confirmed";
    if (mode === "scope") body.filters.scope = "team";
    if (mode === "total") body.total = 0;
    if (mode === "summary") body.data[0].deliverySummary = null;
    if (mode === "direction") body.data[0].deliverySummary.destination = body.data[0].deliverySummary.source;
    return route.fulfill({ response, json: body });
  });
  await page.goto(`/entregas?careRecipientId=${f.patient}`);
  await expect(rows(page).first()).toContainText(doc.code);
  // Realtime invalidation starts a read of the same selection, not an operation.
  for (const invalid of ["incomplete", "patient", "page", "status", "scope", "total", "summary", "direction"]) {
    mode = invalid;
    await page.evaluate(() => window.dispatchEvent(new Event("hca:data-changed")));
    await expect(page.getByRole("alert").filter({ hasText: "resposta" })).toBeVisible();
    await expect(rows(page).first()).toContainText(doc.code);
    await expect(page.getByText("Última consulta preservada.", { exact: false })).toBeVisible();
    await expect(page.getByText("Nenhuma entrega nesta seleção", { exact: true })).toHaveCount(0);
    mode = "live"; await page.getByRole("button", { name: "Tentar novamente", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "resposta" })).toHaveCount(0);
  }
  mode = "error";
  const state = page.getByRole("combobox", { name: "Situação das entregas", exact: true });
  await state.selectOption("pending_receipt");
  await expect(page.getByRole("alert").filter({ hasText: "Lista de entregas temporariamente indisponível" })).toBeVisible();
  await expect(rows(page)).toHaveCount(0);
  await expect(page.getByText("Última consulta preservada.", { exact: false })).toHaveCount(0);
  await expect(page.getByText("Nenhuma entrega nesta seleção", { exact: true })).toHaveCount(0);
  mode = "live"; await page.getByRole("button", { name: "Tentar novamente", exact: true }).click();
  await expect(rows(page).first()).toContainText(doc.code);
  await page.setViewportSize({ width: 320, height: 900 });
  await audit(page, "delivery scoped list 320");
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await page.getByRole("main").screenshot({ path: `output/playwright/phase-d/delivery-scoped-list-${info.project.name}.png` });
  mode = "denied"; await page.evaluate(() => window.dispatchEvent(new Event("hca:data-changed")));
  await expect(page.getByRole("alert").filter({ hasText: "Consulta de entregas recusada" })).toBeVisible();
  await expect(rows(page)).toHaveCount(0);
  await expect(page.getByText("Última consulta preservada.", { exact: false })).toHaveCount(0);
  await page.unroute("**/api/deliveries?*");
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.professional.id)},'ent.read',false);`);
  expect((await page.request.get(`/api/deliveries?careRecipientId=${f.patient}`)).status()).toBe(403);
  await page.reload(); await expect(page.getByText("Seu contexto não permite consultar entregas.", { exact: true })).toBeVisible();
  await expect(rows(page)).toHaveCount(0); expect(facts(f.patient)).toBe(before);
});
