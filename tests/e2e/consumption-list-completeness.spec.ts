import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { setup, fixtures } from "../integration/v4-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";

test.setTimeout(150_000);
test.afterEach(async ({ page }) => page.unrouteAll({ behavior: "wait" }));
const rows = (page: Page) => page.getByRole("list", { name: "Relatos da consulta", exact: true }).getByRole("listitem");
const facts = (patient: string) => sql(`select encode(sha256(convert_to(jsonb_build_object('reports',(select jsonb_agg(to_jsonb(r) order by id) from public.consumption_reports r where care_recipient_id=${q(patient)}),'revisions',(select jsonb_agg(to_jsonb(v) order by v.id) from public.consumption_report_revisions v join public.consumption_reports r on r.id=v.report_id where r.care_recipient_id=${q(patient)}),'decisions',(select jsonb_agg(to_jsonb(v) order by v.id) from public.consumption_report_decisions v join public.consumption_reports r on r.id=v.report_id where r.care_recipient_id=${q(patient)}),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(patient)}))::text,'UTF8')),'hex');`);
async function prepare(page: Page) {
  const f = await setup(), reader = await shiftWorker(f.patient, "admin");
  sql(`insert into public.consumption_reports(care_recipient_id,reported_by,kind,location,body,lines,idempotency_key) select ${q(f.patient)},${q(fixtures.adminA.id)},'shortage','FAMILY','Relato familiar fictício '||n,'[]'::jsonb,gen_random_uuid() from generate_series(1,25)n;
    insert into public.consumption_reports(care_recipient_id,reported_by,kind,location,body,lines,idempotency_key)
      values(${q(f.patient)},${q(fixtures.adminA.id)},'consumption','CARE_TEAM','Relato da equipe para filtro',
        jsonb_build_array(jsonb_build_object('productId',${q(f.products[0])},'quantity','2','unit','unidade','name','Gaze da ronda')),gen_random_uuid());`);
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(reader.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, f.patient);
  return { ...f, reader };
}
const refresh = (page: Page) => page.getByRole("button", { name: "Atualizar lista", exact: true }).click();

test("consumption list rejects corrupt pages and clears previous content after a denied continuation", async ({ page }, info) => {
  const f = await prepare(page), before = facts(f.patient), writes: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/consumption" && request.method() !== "GET") writes.push(request.url()); });
  let mode = "live";
  await page.route("**/api/consumption?*", async route => {
    const requestMode = mode;
    const isMore = new URL(route.request().url()).searchParams.has("beforeAt");
    if (isMore && requestMode === "unavailable") return route.fulfill({ status: 503, json: { code: "UNAVAILABLE", error: "Página de relatos temporariamente indisponível" } });
    if (isMore && requestMode === "denied") return route.fulfill({ status: 403, json: { code: "FORBIDDEN", error: "Continuação dos relatos recusada" } });
    const response = await route.fetch(), body = await response.json();
    if (requestMode === "incomplete") return route.fulfill({ response, json: { data: [], next: null } });
    if (requestMode === "patient") body.careRecipientId = fixtures.reader.id;
    if (requestMode === "filters") body.filters.kind = "consumption";
    if (requestMode === "size") body.pageSize = 100;
    if (requestMode === "duplicate") body.data[1] = body.data[0];
    if (requestMode === "order") body.data.reverse();
    if (requestMode === "next") body.next.id = body.data[0].id;
    if (requestMode === "cursor" && isMore) body.before = null;
    return route.fulfill({ response, json: body });
  });
  await page.goto(`/consumo?careRecipientId=${f.patient}`);
  const list = page.getByRole("list", { name: "Relatos da consulta", exact: true });
  await expect(rows(page)).toHaveCount(20);
  for (const invalid of ["incomplete", "patient", "filters", "size", "duplicate", "order", "next"]) {
    mode = invalid; await refresh(page);
    const failure = page.getByRole("dialog", { name: "Não foi possível consultar os relatos", exact: true });
    await expect(failure).toContainText("resposta");
    await failure.getByRole("button", { name: "Voltar aos relatos", exact: true }).click();
    await expect(page.getByRole("region", { name: "Relatos registrados", exact: true }).getByRole("alert").filter({ hasText: "resposta" })).toBeVisible();
    await expect(rows(page)).toHaveCount(20);
    await expect(page.getByText("Última consulta confirmada; aguardando atualização.", { exact: false })).toBeVisible();
    await expect(page.getByRole("button", { name: "Carregar mais relatos", exact: true })).toBeDisabled();
    mode = "live"; await refresh(page);
    await expect(list).toHaveAttribute("aria-busy", "false");
    await expect(page.getByRole("region", { name: "Relatos registrados", exact: true }).getByRole("alert").filter({ hasText: "resposta" })).toHaveCount(0);
  }
  for (const invalid of ["unavailable", "cursor"]) {
    mode = invalid; await page.getByRole("button", { name: "Carregar mais relatos", exact: true }).click();
    await expect(page.getByRole("region", { name: "Relatos registrados", exact: true }).getByRole("alert")).toBeVisible(); await expect(rows(page)).toHaveCount(20);
    await expect(page.getByText("Nenhum relato encontrado para estes filtros.", { exact: true })).toHaveCount(0);
    mode = "live"; await refresh(page); await expect(list).toHaveAttribute("aria-busy", "false");
    await expect(page.getByRole("region", { name: "Relatos registrados", exact: true }).getByRole("alert")).toHaveCount(0);
  }
  mode = "denied"; await page.getByRole("button", { name: "Carregar mais relatos", exact: true }).click();
  await expect(page.getByRole("region", { name: "Relatos registrados", exact: true }).getByRole("alert").filter({ hasText: "Continuação dos relatos recusada" })).toBeVisible();
  await expect(rows(page)).toHaveCount(0);
  await expect(page.getByText("Última consulta confirmada; aguardando atualização.", { exact: false })).toHaveCount(0);
  await expect(page.getByText("Nenhum relato encontrado para estes filtros.", { exact: true })).toHaveCount(0);
  mode = "live"; await refresh(page); await expect(rows(page)).toHaveCount(20);
  await expect(list).toHaveAttribute("aria-busy", "false");
  await page.unrouteAll({ behavior: "wait" });
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(f.reader.id)},'stock.family.read',false);`);
  await refresh(page); await expect(rows(page)).toHaveCount(1); await expect(rows(page)).toContainText("Relato da equipe para filtro");
  const allowed = await (await page.request.get(`/api/consumption?careRecipientId=${f.patient}`)).json();
  expect(allowed.data).toHaveLength(1); expect(allowed.data[0].location).toBe("CARE_TEAM");
  await page.setViewportSize({ width: 320, height: 900 });
  const searchBounds = await page.getByRole("textbox", { name: "Buscar relato ou material", exact: true }).boundingBox();
  const submitBounds = await page.getByRole("button", { name: "Buscar relatos", exact: true }).boundingBox();
  expect(searchBounds).not.toBeNull();
  expect(submitBounds).not.toBeNull();
  expect(searchBounds!.x + searchBounds!.width).toBeLessThanOrEqual(submitBounds!.x);
  await audit(page, "consumption list scoped320");
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await page.getByRole("main").screenshot({ path: `output/playwright/phase-d/consumption-scoped-list-${info.project.name}.png` });
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(f.reader.id)},'stock.team.read',false);`);
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
    const kind = page.getByRole("button", { name: "Consumos", exact: true });
    const search = page.getByRole("textbox", { name: "Buscar relato ou material", exact: true });
    await search.fill("Gaze da ronda");
    await kind.focus(); await expect(kind).toBeFocused(); await kind.press("Enter");
    await expect(page).toHaveURL(/kind=consumption/); await expect(rows(page)).toHaveCount(1);
    await expect(rows(page)).toContainText("2 unidade de Gaze da ronda"); await expect(kind).toBeFocused();
    const late = page.waitForResponse(response => new URL(response.url()).pathname === "/api/consumption" && new URL(response.url()).searchParams.has("beforeAt"));
    release(); await (await late).finished(); await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect(rows(page)).toHaveCount(1); await expect(kind).toHaveAttribute("aria-pressed", "true"); await expect(search).toHaveValue("Gaze da ronda");
    await page.goBack(); await expect(page).not.toHaveURL(/kind=/); await expect(kind).toHaveAttribute("aria-pressed", "false"); await expect(search).toHaveValue(""); await expect(rows(page)).toHaveCount(20);
    await page.goForward(); await expect(page).toHaveURL(/kind=consumption/); await expect(kind).toHaveAttribute("aria-pressed", "true"); await expect(search).toHaveValue("Gaze da ronda"); await expect(rows(page)).toHaveCount(1);
    await page.reload(); await expect(rows(page)).toHaveCount(1); await expect(search).toHaveValue("Gaze da ronda");
    const code = await rows(page).getByText(/^CON-[A-F0-9]{8}$/).textContent();
    expect(code).toBeTruthy();
    await search.fill(code!);
    await search.press("Enter");
    await expect(page).toHaveURL(/q=CON-/);
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page)).toContainText("2 unidade de Gaze da ronda");
    expect(facts(f.patient)).toBe(before);
  } finally { release?.(); }
});
