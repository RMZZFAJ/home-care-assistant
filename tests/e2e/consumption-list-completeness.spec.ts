import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { setup, fixtures } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";

test.setTimeout(150_000);
test.afterEach(async ({ page }) => page.unrouteAll({ behavior: "wait" }));
const rows = (page: Page) => page.getByRole("list", { name: "Relatos da consulta", exact: true }).getByRole("listitem");
const facts = (patient: string) => sql(`select encode(sha256(convert_to(jsonb_build_object('reports',(select jsonb_agg(to_jsonb(r) order by id) from public.consumption_reports r where care_recipient_id=${q(patient)}),'revisions',(select jsonb_agg(to_jsonb(v) order by v.id) from public.consumption_report_revisions v join public.consumption_reports r on r.id=v.report_id where r.care_recipient_id=${q(patient)}),'decisions',(select jsonb_agg(to_jsonb(v) order by v.id) from public.consumption_report_decisions v join public.consumption_reports r on r.id=v.report_id where r.care_recipient_id=${q(patient)}),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(patient)}))::text,'UTF8')),'hex');`);
async function prepare(page: Page) {
  const f = await setup();
  sql(`insert into public.consumption_reports(care_recipient_id,reported_by,kind,location,body,lines,idempotency_key) select ${q(f.patient)},${q(fixtures.adminA.id)},'shortage','FAMILY','Relato familiar fictício '||n,'[]'::jsonb,gen_random_uuid() from generate_series(1,25)n;
    insert into public.consumption_reports(care_recipient_id,reported_by,kind,location,body,lines,idempotency_key) values(${q(f.patient)},${q(fixtures.adminA.id)},'consumption','CARE_TEAM','Relato da equipe para filtro','[]'::jsonb,gen_random_uuid());`);
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, f.patient);
  return f;
}
const refresh = (page: Page) => page.getByRole("button", { name: "Atualizar lista", exact: true }).click();

test("consumption list rejects corrupt pages and clears previous content after a denied continuation", async ({ page }, info) => {
  const f = await prepare(page), before = facts(f.patient), writes: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/consumption" && request.method() !== "GET") writes.push(request.url()); });
  let mode = "live";
  await page.route("**/api/consumption?*", async route => {
    const isMore = new URL(route.request().url()).searchParams.has("beforeAt");
    if (isMore && mode === "unavailable") return route.fulfill({ status: 503, json: { code: "UNAVAILABLE", error: "Página de relatos temporariamente indisponível" } });
    if (isMore && mode === "denied") return route.fulfill({ status: 403, json: { code: "FORBIDDEN", error: "Continuação dos relatos recusada" } });
    const response = await route.fetch(), body = await response.json();
    if (mode === "incomplete") return route.fulfill({ response, json: { data: [], next: null } });
    if (mode === "patient") body.careRecipientId = fixtures.reader.id;
    if (mode === "filters") body.filters.kind = "consumption";
    if (mode === "size") body.pageSize = 100;
    if (mode === "duplicate") body.data[1] = body.data[0];
    if (mode === "order") body.data.reverse();
    if (mode === "next") body.next.id = body.data[0].id;
    if (mode === "cursor" && isMore) body.before = null;
    return route.fulfill({ response, json: body });
  });
  await page.goto(`/consumo?careRecipientId=${f.patient}`);
  await expect(rows(page)).toHaveCount(20);
  for (const invalid of ["incomplete", "patient", "filters", "size", "duplicate", "order", "next"]) {
    mode = invalid; await refresh(page);
    await expect(page.getByRole("region", { name: "Relatos registrados", exact: true }).getByRole("alert").filter({ hasText: "resposta" })).toBeVisible();
    await expect(rows(page)).toHaveCount(20);
    await expect(page.getByText("Última consulta confirmada; aguardando atualização.", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Carregar mais relatos", exact: true })).toBeDisabled();
    mode = "live"; await refresh(page);
    await expect(page.getByRole("region", { name: "Relatos registrados", exact: true }).getByRole("alert").filter({ hasText: "resposta" })).toHaveCount(0);
  }
  for (const invalid of ["unavailable", "cursor"]) {
    mode = invalid; await page.getByRole("button", { name: "Carregar mais relatos", exact: true }).click();
    await expect(page.getByRole("region", { name: "Relatos registrados", exact: true }).getByRole("alert")).toBeVisible(); await expect(rows(page)).toHaveCount(20);
    await expect(page.getByText("Nenhum relato encontrado para estes filtros.", { exact: true })).toHaveCount(0);
    mode = "live"; await refresh(page); await expect(page.getByRole("region", { name: "Relatos registrados", exact: true }).getByRole("alert")).toHaveCount(0);
  }
  mode = "denied"; await page.getByRole("button", { name: "Carregar mais relatos", exact: true }).click();
  await expect(page.getByRole("region", { name: "Relatos registrados", exact: true }).getByRole("alert").filter({ hasText: "Continuação dos relatos recusada" })).toBeVisible();
  await expect(rows(page)).toHaveCount(0);
  await expect(page.getByText("Última consulta confirmada; aguardando atualização.", { exact: false })).toHaveCount(0);
  await expect(page.getByText("Nenhum relato encontrado para estes filtros.", { exact: true })).toHaveCount(0);
  mode = "live"; await refresh(page); await expect(rows(page)).toHaveCount(20);
  await page.unroute("**/api/consumption?*");
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'stock.family.read',false);`);
  await refresh(page); await expect(rows(page)).toHaveCount(1); await expect(rows(page)).toContainText("Relato da equipe para filtro");
  const allowed = await (await page.request.get(`/api/consumption?careRecipientId=${f.patient}`)).json();
  expect(allowed.data).toHaveLength(1); expect(allowed.data[0].location).toBe("CARE_TEAM");
  await page.setViewportSize({ width: 320, height: 900 }); await audit(page, "consumption list scoped320");
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await page.getByRole("main").screenshot({ path: `output/playwright/phase-d/consumption-scoped-list-${info.project.name}.png` });
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'stock.team.read',false);`);
  await refresh(page); await expect(rows(page)).toHaveCount(0); await expect(page.getByText("Nenhum relato encontrado para estes filtros.", { exact: true })).toBeVisible();
  expect((await (await page.request.get(`/api/consumption?careRecipientId=${f.patient}`)).json()).data).toEqual([]);
  expect(facts(f.patient)).toBe(before); expect(writes).toEqual([]);
});

test("consumption list ignores a late continuation and restores filters and focus with browser navigation", async ({ page }) => {
  const f = await prepare(page), before = facts(f.patient);
  await page.addInitScript(() => { const native = window.fetch.bind(window); window.fetch = (input, init) => { const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, location.origin); return native(input, url.pathname === "/api/consumption" ? { ...init, signal: undefined } : init); }; });
  let release!: () => void, entered!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; }), held = new Promise<void>(resolve => { entered = resolve; });
  await page.route("**/api/consumption?*", async route => {
    const response = await route.fetch();
    if (new URL(route.request().url()).searchParams.has("beforeAt")) { entered(); await gate; }
    return route.fulfill({ response });
  });
  try {
    await page.goto(`/consumo?careRecipientId=${f.patient}`); await expect(rows(page)).toHaveCount(20);
    await page.getByRole("button", { name: "Carregar mais relatos", exact: true }).click(); await held;
    const kind = page.getByRole("combobox", { name: "Tipo", exact: true }), search = page.getByRole("textbox", { name: "Buscar no relato original", exact: true });
    await kind.selectOption("consumption"); await search.fill("equipe");
    const apply = page.getByRole("button", { name: "Aplicar filtros", exact: true }); await apply.focus(); await expect(apply).toBeFocused(); await apply.press("Enter");
    await expect(page).toHaveURL(/kind=consumption/); await expect(rows(page)).toHaveCount(1); await expect(rows(page)).toContainText("Relato da equipe para filtro"); await expect(apply).toBeFocused();
    const late = page.waitForResponse(response => new URL(response.url()).pathname === "/api/consumption" && new URL(response.url()).searchParams.has("beforeAt"));
    release(); await (await late).finished(); await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect(rows(page)).toHaveCount(1); await expect(kind).toHaveValue("consumption"); await expect(search).toHaveValue("equipe");
    await page.goBack(); await expect(page).not.toHaveURL(/kind=/); await expect(kind).toHaveValue(""); await expect(search).toHaveValue(""); await expect(rows(page)).toHaveCount(20);
    await page.goForward(); await expect(page).toHaveURL(/kind=consumption/); await expect(kind).toHaveValue("consumption"); await expect(search).toHaveValue("equipe"); await expect(rows(page)).toHaveCount(1);
    await page.reload(); await expect(rows(page)).toHaveCount(1); await expect(search).toHaveValue("equipe");
    expect(facts(f.patient)).toBe(before);
  } finally { release?.(); }
});
