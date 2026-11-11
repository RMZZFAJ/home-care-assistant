import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { setup, fixtures } from "../integration/v4-fixtures.mjs";
import { shiftCommand, shiftWorker } from "../integration/shift-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { auditFromTop } from "./accessibility-audit";

test.setTimeout(150_000);
test.afterEach(async ({ page }) => page.unrouteAll({ behavior: "wait" }));
const cards = (page: Page) => page.locator("article.hca-shift-card").filter({ visible: true });
const ids = (page: Page) => cards(page).evaluateAll(nodes => nodes.map(node => node.getAttribute("data-shift-id")));
const facts = (patient: string) => sql(`select encode(sha256(convert_to(jsonb_build_object('shifts',(select jsonb_agg(to_jsonb(s) order by id) from public.scheduled_shifts s where care_recipient_id=${q(patient)}),'series',(select jsonb_agg(to_jsonb(s) order by id) from public.shift_series s where care_recipient_id=${q(patient)}),'types',(select jsonb_agg(to_jsonb(s) order by id) from public.shift_types s where care_recipient_id=${q(patient)}),'changes',(select jsonb_agg(to_jsonb(s) order by id) from public.shift_change_requests s where care_recipient_id=${q(patient)}),'events',(select jsonb_agg(to_jsonb(s) order by id) from public.shift_events s where care_recipient_id=${q(patient)}),'assignments',(select jsonb_agg(to_jsonb(s) order by id) from public.bal_assignments s where care_recipient_id=${q(patient)}))::text,'UTF8')),'hex');`);
async function login(page: Page, patient: string, email = fixtures.adminA.email) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}
async function prepare(large = true) {
  const f = await setup(), first = await shiftWorker(f.patient), other = await shiftWorker(f.patient);
  const names = { first: "Pessoa principal " + first.id.slice(0, 8), other: "Outra pessoa " + other.id.slice(0, 8) };
  sql(`update public.profiles set full_name=${q(names.first)} where id=${q(first.id)};update public.profiles set full_name=${q(names.other)} where id=${q(other.id)};`);
  const series = (professionalId: string, shiftTypeId: string, day: string, recurrence = "once", until = day) => shiftCommand(f.admin, f.patient, "series", { professionalId, shiftTypeId, timezone: "America/Sao_Paulo", recurrence, weekdays: recurrence === "weekly" ? [0, 1, 2, 3, 4, 5, 6] : [], anchorDate: day, validUntil: until, notes: "Programação fictícia para conferir a lista completa" });
  let typeId = "";
  for (const hour of large ? ["06:00", "10:00", "14:00", "18:00"] : ["18:00"]) {
    const type = await shiftCommand(f.admin, f.patient, "type", { name: "Plantão " + hour, startsLocal: hour, durationMinutes: 15 });
    typeId = type.id; await series(first.id, type.id, large ? "2100-06-01" : "2100-06-15", large ? "weekly" : "once", large ? "2100-06-30" : "2100-06-15");
  }
  const carry = await shiftCommand(f.admin, f.patient, "type", { name: "Noturno iniciado antes do mês", startsLocal: "23:30", durationMinutes: 120 });
  await series(first.id, carry.id, "2100-05-31");
  await series(other.id, typeId, "2100-06-15");
  await series(first.id, typeId, "2100-07-01");
  return { ...f, first, other, names, carry };
}
test("schedule list includes a carry-in shift and more than100 occurrences in the authorized month", async ({ page }, info) => {
  const f = await prepare(), before = facts(f.patient);
  const oracle: string[] = JSON.parse(sql(`select jsonb_agg(id::text order by starts_at,id) from public.scheduled_shifts where care_recipient_id=${q(f.patient)} and starts_at<('2100-07-01'::timestamp at time zone timezone) and ends_at>('2100-06-01'::timestamp at time zone timezone);`));
  expect(oracle).toHaveLength(122);
  await login(page, f.patient);
  const writes: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/schedules" && request.method() !== "GET") writes.push(request.url()); });
  await page.goto(`/escalas?careRecipientId=${f.patient}`);
  await page.getByLabel("Data de referência", { exact: true }).fill("2100-06-15");
  await page.getByLabel("Visualização", { exact: true }).selectOption("month");
  const response = await page.request.get(`/api/schedules?careRecipientId=${f.patient}&from=2100-06-01&until=2100-06-30`);
  expect(response.ok()).toBe(true); expect((await response.json()).data.shifts.map((row: { id: string }) => row.id)).toEqual(oracle);
  await expect(page.getByRole("article", { name: f.carry.name + " · " + f.names.first, exact: true }).filter({ visible: true })).toHaveCount(1);
  await expect.poll(() => ids(page)).toEqual(oracle);
  await page.getByLabel("Profissional", { exact: true }).selectOption(f.other.id);
  await expect(cards(page)).toHaveCount(1); await expect(cards(page)).toContainText(f.names.other);
  await page.getByLabel("Situação", { exact: true }).selectOption("cancelled"); await expect(cards(page)).toHaveCount(0);
  await page.getByLabel("Profissional", { exact: true }).selectOption(""); await page.getByLabel("Situação", { exact: true }).selectOption("");
  await expect.poll(() => ids(page)).toEqual(oracle);
  await page.getByRole("group", { name: "Período da escala", exact: true }).getByRole("button", { name: "Próximo mês", exact: true }).click();
  await expect(cards(page)).toHaveCount(1); await expect(cards(page)).toContainText("01/07/2100");
  await page.getByRole("group", { name: "Período da escala", exact: true }).getByRole("button", { name: "Mês anterior", exact: true }).click();
  await expect.poll(() => ids(page)).toEqual(oracle);
  await page.setViewportSize({ width: 320, height: 900 });
  mkdirSync("output/playwright/phase-d", { recursive: true });
  const carryCard = page.getByRole("article", { name: f.carry.name + " · " + f.names.first, exact: true }).filter({ visible: true });
  await expect(carryCard).toContainText("Iniciado no período anterior.");
  await carryCard.screenshot({ path: `output/playwright/phase-d/schedule-carry-in-${info.project.name}.png` });
  await page.getByLabel("Profissional", { exact: true }).selectOption(f.other.id);
  await auditFromTop(page, "schedule complete month scoped320");
  await page.getByRole("main").screenshot({ path: `output/playwright/phase-d/schedule-scoped-list-${info.project.name}.png` });
  expect(facts(f.patient)).toBe(before); expect(writes).toEqual([]);
});

test("schedule list rejects incomplete reads,isolates periods and clears denied data without enabling stale actions", async ({ page }) => {
  const f = await prepare(false), before = facts(f.patient);
  await login(page, f.patient);
  await page.addInitScript(() => { const native = window.fetch.bind(window); window.fetch = (input, init) => { const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, location.origin); return native(input, url.pathname === "/api/schedules" ? { ...init, signal: undefined } : init); }; });
  let mode = "live", release!: () => void, entered!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; }), held = new Promise<void>(resolve => { entered = resolve; });
  await page.route("**/api/schedules?*", async route => {
    if (mode === "unavailable") return route.fulfill({ status: 503, json: { code: "UNAVAILABLE", error: "Agenda fictícia temporariamente indisponível" } });
    if (mode === "denied") return route.fulfill({ status: 403, json: { code: "FORBIDDEN", error: "Consulta da agenda recusada" } });
    const response = await route.fetch(), body = await response.json();
    if (mode === "incomplete") return route.fulfill({ response, json: { data: {} } });
    if (mode === "patient") body.careRecipientId = fixtures.reader.id;
    if (mode === "period") body.period.until = "2100-07-01";
    if (mode === "nested") body.data.types[0].care_recipient_id = fixtures.reader.id;
    if (mode === "duplicate") body.data.shifts[1] = body.data.shifts[0];
    if (mode === "window") { body.data.shifts[0].starts_at = "2099-06-01T12:00:00Z"; body.data.shifts[0].ends_at = "2099-06-01T13:00:00Z"; }
    if (mode === "zone") body.data.shifts[0].timezone = "not/a-zone";
    if (mode === "held" && new URL(route.request().url()).searchParams.get("from") === "2100-06-01") { entered(); await gate; }
    return route.fulfill({ response, json: body });
  });
  const refresh = page.getByRole("button", { name: "Atualizar escala", exact: true });
  const alerts = page.getByRole("main").getByRole("alert").filter({ hasText: /agenda|escala/i });
  try {
    await page.goto(`/escalas?careRecipientId=${f.patient}`);
    await page.getByLabel("Data de referência", { exact: true }).fill("2100-06-15"); await expect(cards(page)).toHaveCount(2);
    for (const invalid of ["incomplete", "patient", "period", "nested", "duplicate", "window", "zone"]) {
      mode = invalid; await refresh.click(); await expect(alerts).toBeVisible(); await expect(cards(page)).toHaveCount(2);
      await expect(page.getByText("Última consulta preservada; ações aguardam atualização.", { exact: false })).toBeVisible();
      for (const action of await page.getByRole("button", { name: "Alterar plantão", exact: true }).all()) await expect(action).toBeDisabled();
      await expect(page.getByRole("button", { name: "Novo tipo de plantão", exact: true })).toBeDisabled();
      mode = "live"; await refresh.click(); await expect(alerts).toHaveCount(0);
    }
    mode = "unavailable"; await refresh.click(); await expect(alerts).toContainText("temporariamente indisponível"); await expect(cards(page)).toHaveCount(2);
    mode = "live"; await refresh.click(); await expect(alerts).toHaveCount(0);
    mode = "held"; await page.getByLabel("Visualização", { exact: true }).selectOption("month"); await held;
    await expect(cards(page)).toHaveCount(0);
    await page.getByLabel("Data de referência", { exact: true }).fill("2100-07-15"); await expect(cards(page)).toHaveCount(1); await expect(cards(page)).toContainText("01/07/2100");
    const old = page.waitForResponse(response => new URL(response.url()).pathname === "/api/schedules" && new URL(response.url()).searchParams.get("from") === "2100-06-01");
    release(); await (await old).finished(); await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect(cards(page)).toHaveCount(1); await expect(cards(page)).toContainText("01/07/2100"); await expect(page.getByLabel("Data de referência", { exact: true })).toHaveValue("2100-07-15");
    mode = "unavailable"; await page.getByRole("group", { name: "Período da escala", exact: true }).getByRole("button", { name: "Próximo mês", exact: true }).click();
    await expect(alerts).toBeVisible(); await expect(cards(page)).toHaveCount(0);
    await expect(page.getByText("Última consulta preservada; ações aguardam atualização.", { exact: false })).toHaveCount(0);
    await expect(page.getByText("Sem programação no dia.", { exact: true })).toHaveCount(0);
    mode = "live"; await refresh.click(); await expect(alerts).toHaveCount(0); await expect(cards(page)).toHaveCount(0);
    await expect(page.getByText("Sem programação no dia.", { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await page.getByLabel("Data de referência", { exact: true }).fill("2100-06-15"); await expect(cards(page)).toHaveCount(3);
    mode = "denied"; await refresh.click(); await expect(alerts).toContainText("Consulta da agenda recusada"); await expect(cards(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Novo tipo de plantão", exact: true })).toBeDisabled();
    await page.unroute("**/api/schedules?*");
    sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'schedule.read.team',false),(${q(f.patient)},${q(fixtures.adminA.id)},'schedule.read.own',false);`);
    expect((await page.request.get(`/api/schedules?careRecipientId=${f.patient}&from=2100-06-01&until=2100-06-30`)).status()).toBe(403);
    await page.reload(); await expect(cards(page)).toHaveCount(0); await expect(page.getByText("Seu vínculo não permite consultar a agenda.", { exact: false })).toBeVisible();
    expect(facts(f.patient)).toBe(before);
  } finally { release?.(); }
});

test("schedule list keeps own scope under real Auth and rejects foreign patients and invalid ranges", async ({ page }) => {
  const f = await prepare(false), before = facts(f.patient);
  await login(page, f.patient, f.first.email);
  await page.goto(`/escalas?careRecipientId=${f.patient}`);
  await page.getByLabel("Data de referência", { exact: true }).fill("2100-06-15"); await expect(cards(page)).toHaveCount(1);
  await expect(cards(page)).toContainText(f.names.first); await expect(page.getByLabel("Profissional", { exact: true })).toHaveCount(0);
  const url = `/api/schedules?careRecipientId=${f.patient}&from=2100-06-01&until=2100-06-30`;
  const result = await (await page.request.get(url)).json(); expect(result.data.shifts).toHaveLength(2);
  expect(result.data.shifts.every((row: { professional_id: string }) => row.professional_id === f.first.id)).toBe(true);
  expect((await page.request.get(url.replace(f.patient, fixtures.reader.id))).status()).toBe(404);
  for (const range of ["from=2100-06-30&until=2100-06-01", "from=2100-06-01&until=2100-07-14", "from=invalid&until=2100-06-01"])
    expect((await page.request.get(`/api/schedules?careRecipientId=${f.patient}&${range}`)).status()).toBe(400);
  expect(facts(f.patient)).toBe(before);
});
