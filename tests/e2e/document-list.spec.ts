import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { setup, actor, fixtures, rpc } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { auditFromTop } from "./accessibility-audit";

test.setTimeout(120_000);
test.afterEach(async ({ page }) => page.unrouteAll({ behavior: "wait" }));
async function openFilters(page: Page) { const trigger = page.getByRole("button", { name: /^Filtros/ }); if (await trigger.getAttribute("aria-expanded") !== "true") await trigger.click(); }
const links = (page: Page) => page.locator("a.av-record");
const facts = (patient: string) => sql(`select jsonb_build_object('documents',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id=${q(patient)}),'events',(select jsonb_agg(to_jsonb(e) order by id) from public.document_events e where care_recipient_id=${q(patient)}),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(patient)}),'science',(select jsonb_agg(to_jsonb(s) order by id) from public.requisition_science_events s where care_recipient_id=${q(patient)}),'openings',(select jsonb_agg(to_jsonb(o) order by id) from public.requisition_openings o where care_recipient_id=${q(patient)}));`);
async function login(page: Page, patient: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}
test("document list rejects malformed totals without presenting an empty or losing the previous read", async ({ page }) => {
  const f = await setup();
  const doc = await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity: "1" }] }, p_key: randomUUID(), p_draft: false });
  const before = facts(f.patient);
  await login(page, f.patient);
  let mode = "live";
  await page.route("**/api/documents?*", async route => {
    const response = await route.fetch(), body = await response.json();
    if (mode === "incomplete") return route.fulfill({ response, json: { data: [], page: 1, pageSize: 20 } });
    if (mode === "patient") body.careRecipientId = fixtures.reader.id;
    if (mode === "page") body.page = 2;
    if (mode === "filter") body.filters = { ...body.filters, type: "ENT" };
    if (mode === "total") body.total = 0;
    if (mode === "duplicate") { body.data = [body.data[0], body.data[0]]; body.total = 2; }
    return route.fulfill({ response, json: body });
  });
  await page.goto(`/historico?careRecipientId=${f.patient}&type=COM`);
  await expect(links(page)).toHaveCount(1);
  await expect(links(page).first()).toContainText(doc.code);
  for (const invalid of ["incomplete", "patient", "page", "filter", "total", "duplicate"]) {
    mode = invalid;
    await openFilters(page); await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "resposta" })).toBeVisible();
    await expect(page.getByText("Nenhuma ficha encontrada", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Última consulta válida", { exact: false })).toBeVisible();
    await expect(links(page)).toHaveCount(0);
    await page.getByRole("button", { name: "Mostrar lista da última consulta", exact: true }).click();
    await expect(links(page)).toHaveCount(1);
    await expect(links(page).first()).toContainText(doc.code);
    mode = "live";
    await page.getByRole("button", { name: "Tentar novamente", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "resposta" })).toHaveCount(0);
  }
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'com.read',false);`);
  await openFilters(page); await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect(page.getByText("Nenhuma ficha encontrada", { exact: true })).toBeVisible();
  await expect(links(page)).toHaveCount(0);
  expect(facts(f.patient)).toBe(before);
});

async function traverse(page: Page, order: string[]) {
  const collected: string[] = [];
  const observed = () => links(page).evaluateAll(nodes => nodes.map(node => new URL((node as HTMLAnchorElement).href).pathname.split("/").at(-1)));
  const navigation = page.getByRole("navigation", { name: "Páginas do histórico", exact: true });
  for (let offset = 0; offset < order.length; offset += 20) {
    await expect.poll(observed).toEqual(order.slice(offset, offset + 20));
    collected.push(...await observed() as string[]);
    if (offset + 20 < order.length) await navigation.getByRole("button", { name: "Próxima", exact: true }).click();
    else await expect(navigation.getByRole("button", { name: "Próxima", exact: true })).toBeDisabled();
  }
  expect(collected).toEqual(order);
  expect(new Set(collected).size).toBe(order.length);
}

test("document list reaches more than100 REQ and old pending records with stable order,URL and late-filter protection", async ({ page }, info) => {
  const f = await setup(), professional = await actor("professional", f.patient);
  for (let index = 0; index < 101; index++) {
    await rpc(professional, "submit_requisition", {
      p_care_recipient_id: f.patient, p_idempotency_key: randomUUID(), p_payload_hash: "ignored",
      p_lines: [{ productId: f.products[0], currentStock: "0", urgent: true, repeatReason: `Emissão fictícia independente para percurso de lista ${index}` }],
      p_extra_items: [], p_observations: [],
    });
  }
  await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity: "1" }] }, p_key: randomUUID(), p_draft: true });
  await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "ENT", p_payload: { source: "FAMILY", destination: "CARE_TEAM", recipientId: fixtures.professional.id, recipientReason: "Expedição fictícia para consultar o conjunto de fichas", lines: [{ productId: f.products[1], quantity: "1" }] }, p_key: randomUUID(), p_draft: false });
  const oracle = (type = ""): string[] => JSON.parse(sql(`select jsonb_agg(id::text order by created_at desc,id) from public.operational_documents where care_recipient_id=${q(f.patient)}${type ? ` and type=${q(type)}` : ""};`));
  const order = oracle(), requisitions = oracle("REQ"), oldest = requisitions.at(-1)!;
  const code = sql(`select code from public.operational_documents where id=${q(oldest)};`), before = facts(f.patient);
  expect(requisitions).toHaveLength(101);
  await page.addInitScript(() => {
    const native = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, location.origin);
      return native(input, url.pathname === "/api/documents" ? { ...init, signal: undefined } : init);
    };
  });
  await login(page, f.patient);
  const writes: string[] = [];
  page.on("request", request => {
    if (new URL(request.url()).pathname.startsWith("/api/") && request.method() !== "GET") writes.push(request.url());
  });
  await page.goto(`/historico?careRecipientId=${f.patient}`);
  await traverse(page, order);
  await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await page.getByRole("combobox", { name: "Tipo de ficha", exact: true }).selectOption("REQ");
  await openFilters(page); await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await traverse(page, requisitions);
  expect(new URL(page.url()).searchParams.get("page")).toBe("6");
  await page.reload();
  await expect.poll(async () => new URL((await links(page).first().getAttribute("href"))!, page.url()).pathname).toBe(`/documentos/${oldest}`);
  await expect(page.getByRole("combobox", { name: "Tipo de ficha", exact: true })).toHaveValue("REQ");

  let release!: () => void, entered!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; }), ready = new Promise<void>(resolve => { entered = resolve; });
  await page.route("**/api/documents?*", async route => {
    if (new URL(route.request().url()).searchParams.get("search") === "SEMRESULTADO999") {
      const response = await route.fetch(); entered(); await gate; return route.fulfill({ response });
    }
    return route.continue();
  });
  const search = page.getByRole("searchbox", { name: "Buscar por código ou protocolo", exact: true });
  const oldResponse = page.waitForResponse(response => new URL(response.url()).pathname === "/api/documents" && new URL(response.url()).searchParams.get("search") === "SEMRESULTADO999");
  try {
    await search.fill("SEMRESULTADO999"); await search.press("Enter"); await ready;
    await expect(page.getByText("Consultando documentos…", { exact: true })).toBeVisible();
    await expect(page.getByText("Nenhuma ficha encontrada", { exact: true })).toHaveCount(0);
    await page.goBack();
    await expect(page.locator(".hca-activity-overlay")).toHaveCount(0);
    await search.fill(code); await search.press("Enter");
    await expect.poll(() => new URL(page.url()).searchParams.get("search")).toBe(code);
    await expect(links(page)).toHaveCount(1);
    await expect(links(page).first()).toContainText(code);
    await expect(search).toBeFocused();
  } finally { release(); }
  await (await oldResponse).finished();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect(links(page)).toHaveCount(1);
  await expect(links(page).first()).toHaveAttribute("href", new RegExp("^/documentos/" + oldest + "(?:\\?|$)"));
  await expect(search).toBeFocused();
  await page.unroute("**/api/documents?*");
  const day = sql(`select (created_at at time zone 'America/Sao_Paulo')::date::text from public.operational_documents where id=${q(oldest)};`);
  await openFilters(page); await page.getByLabel("De", { exact: true }).fill(day);
  await page.getByLabel("Até", { exact: true }).fill(day);
  await openFilters(page); await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get("from")).toBe(day);
  await openFilters(page); await expect(page.getByLabel("De", { exact: true })).toHaveValue(day);
  await expect(links(page)).toHaveCount(1);
  await page.goBack();
  await expect.poll(() => new URL(page.url()).searchParams.get("from")).toBeNull();
  await expect(page.getByLabel("De", { exact: true })).toHaveValue("");
  await expect(search).toHaveValue(code);
  await expect(links(page)).toHaveCount(1);
  await page.setViewportSize({ width: 320, height: 900 });
  await auditFromTop(page, "document list old request 320");
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await page.getByRole("main").screenshot({ path: `output/playwright/phase-d/document-list-old-request-${info.project.name}.png` });
  expect(facts(f.patient)).toBe(before);
  expect(writes).toEqual([]);
});

test("document list distinguishes initial delay and error from zero and clears a denied read", async ({ page }, info) => {
  const f = await setup();
  const doc = await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_payload: { origin: "donation", lines: [{ productId: f.products[0], quantity: "1" }] }, p_key: randomUUID(), p_draft: false });
  const before = facts(f.patient);
  await login(page, f.patient);
  let release!: () => void, entered!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; }), ready = new Promise<void>(resolve => { entered = resolve; });
  let mode = "held";
  await page.route("**/api/documents?*", async route => {
    if (mode === "held") { entered(); await held; return route.fulfill({ status: 503, json: { code: "UNAVAILABLE", error: "Consulta de fichas indisponível" } }); }
    if (mode === "denied") return route.fulfill({ status: 403, json: { code: "FORBIDDEN", error: "Consulta de fichas recusada" } });
    return route.continue();
  });
  try {
    await page.goto(`/historico?careRecipientId=${f.patient}&type=COM`);
    await ready;
    await expect(page.getByText("Consultando documentos…", { exact: true })).toBeVisible();
    await expect(page.getByText("Total ainda não confirmado.", { exact: true })).toBeVisible();
    await expect(page.getByText("Nenhuma ficha encontrada", { exact: true })).toHaveCount(0);
  } finally { release(); }
  await expect(page.getByRole("alert").filter({ hasText: "Consulta de fichas indisponível" })).toBeVisible();
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await page.getByRole("main").screenshot({ path: `output/playwright/phase-d/document-list-initial-error-${info.project.name}.png` });
  await expect(page.getByText("0 registro(s) no contexto autorizado", { exact: true })).toHaveCount(0);
  mode = "live";
  const retry = page.getByRole("button", { name: "Tentar novamente", exact: true });
  await retry.focus(); await retry.press("Enter");
  await expect(links(page).first()).toContainText(doc.code);
  const foreign = await rpc(await actor("global"), "admin_upsert_recipient", { p_id: null, p_display_name: "Paciente fictício sem vínculo de leitura " + randomUUID().slice(0, 8), p_is_active: true, p_is_development: true });
  expect((await page.request.get(`/api/documents?careRecipientId=${foreign.id}`)).status()).toBe(404);
  const bounded = await page.request.get(`/api/documents?careRecipientId=${f.patient}&pageSize=101`);
  expect(bounded.status()).toBe(200);
  expect((await bounded.json()).pageSize).toBe(100);
  expect((await page.request.get(`/api/documents?careRecipientId=${f.patient}&from=2026-11-12&to=2026-11-11`)).status()).toBe(400);
  mode = "denied";
  await openFilters(page); await page.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Consulta de fichas recusada" })).toBeVisible();
  await expect(links(page)).toHaveCount(0);
  await expect(page.getByText("Última consulta válida", { exact: false })).toHaveCount(0);
  await expect(page.getByText("Total ainda não confirmado.", { exact: true })).toBeVisible();
  expect(facts(f.patient)).toBe(before);
});
