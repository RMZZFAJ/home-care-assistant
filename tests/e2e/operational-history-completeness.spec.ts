import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { actor, fixtures, rpc, setup } from "../integration/v4-fixtures.mjs";
import { historyFixture } from "../integration/read-history-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { auditFromTop } from "./accessibility-audit";

test.setTimeout(180_000);
test.afterEach(async ({ page }) => page.unrouteAll({ behavior: "wait" }));
async function login(page: Page, patient: string, role: "adminA" | "professional" = "adminA") {
  await page.goto("/login"); await page.getByLabel("E-mail", { exact: true }).fill(fixtures[role].email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword); await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible(); await selectContext(page, patient);
}
const auditPanel = (page: Page) => page.getByRole("region", { name: "Histórico de auditoria", exact: true });
const schedulePanel = (page: Page) => page.getByRole("region", { name: "Histórico da agenda", exact: true });
const ids = (panel: ReturnType<typeof auditPanel>, attribute: string) => panel.locator(`li[${attribute}]`).evaluateAll((nodes, key) => nodes.map(node => node.getAttribute(key)), attribute);
const auditFacts = (patient: string) => sql(`select encode(sha256(convert_to(jsonb_agg(to_jsonb(a) order by id)::text,'UTF8')),'hex') from public.audit_events a where metadata->>'care_recipient_id'=${q(patient)};`);

test("audit history binds every read to patient and filters,retains valid same-scope data and clears denied content", async ({ page }) => {
  const f = await historyFixture(); await login(page, f.patient); const before = auditFacts(f.patient);
  let mode = "live";
  await page.route("**/api/admin?*", async route => {
    if (new URL(route.request().url()).searchParams.get("section") !== "audit") return route.continue();
    if (mode === "unavailable") return route.fulfill({ status: 503, json: { code: "UNAVAILABLE", error: "Auditoria temporariamente indisponível" } });
    if (mode === "denied") return route.fulfill({ status: 403, json: { code: "FORBIDDEN", error: "Consulta de auditoria recusada" } });
    const response = await route.fetch(), body = await response.json();
    if (mode === "patient") body.careRecipientId = randomUUID();
    if (mode === "rowPatient") body.data[0].metadata.care_recipient_id = randomUUID();
    if (mode === "page") body.page++;
    if (mode === "filter") body.filters.action = "other";
    if (mode === "short") body.data.pop();
    if (mode === "duplicate") body.data[1] = body.data[0];
    return route.fulfill({ response, json: body });
  });
  await page.goto(`/admin?section=audit&careRecipientId=${f.patient}&auditAction=invitation.created&auditPage=2`);
  const panel = auditPanel(page), expected: string[] = JSON.parse(sql(`select jsonb_agg(id order by created_at desc,id desc) from (select id,created_at from public.audit_events where metadata->>'care_recipient_id'=${q(f.patient)} and action='invitation.created' order by created_at desc,id desc offset 20 limit 20)a;`));
  await expect.poll(() => ids(panel, "data-audit-id")).toEqual(expected);
  for (const invalid of ["patient", "rowPatient", "page", "filter", "short", "duplicate", "unavailable"]) {
    mode = invalid; await panel.getByRole("button", { name: "Atualizar histórico", exact: true }).click();
    await expect(panel.getByRole("alert")).toBeVisible(); await expect.poll(() => ids(panel, "data-audit-id")).toEqual(expected);
    await expect(panel.getByRole("button", { name: "Próxima página do histórico", exact: true })).toBeDisabled();
    mode = "live"; await panel.getByRole("button", { name: "Atualizar histórico", exact: true }).click(); await expect(panel.getByRole("alert")).toHaveCount(0);
  }
  const search = panel.getByRole("searchbox", { name: "Buscar código de evento ou nome da pessoa", exact: true });
  await search.fill("Sem correspondência fictícia"); await search.press("Enter"); await expect(page).toHaveURL(/auditQuery=/);
  await expect(panel.getByText("Nenhum evento corresponde aos filtros consultados.", { exact: true })).toBeVisible(); await expect(search).toBeFocused();
  await page.goBack(); await expect(page).toHaveURL(/auditPage=2/); await expect(search).toHaveValue(""); await expect.poll(() => ids(panel, "data-audit-id")).toEqual(expected);
  mode = "denied"; await panel.getByRole("button", { name: "Atualizar histórico", exact: true }).click(); await expect(panel.getByRole("alert")).toBeVisible();
  await expect.poll(() => ids(panel, "data-audit-id")).toEqual([]); expect(auditFacts(f.patient)).toBe(before);
  mode = "live"; await page.unrouteAll({ behavior: "wait" });
  sql(`insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${q(f.patient)},'audit.read',${q(fixtures.adminA.id)},false);`);
  try { expect((await page.request.get(`/api/admin?section=audit&careRecipientId=${f.patient}`)).status()).toBe(403); }
  finally { sql(`delete from public.capability_overrides where care_recipient_id=${q(f.patient)} and capability='audit.read' and subject_user=${q(fixtures.adminA.id)};`); }
});

// Synthetic historical rows only;these do not prove actual shift changes or attendance.
async function scheduleFixture() {
  const f = await setup(), oldest = randomUUID();
  sql(`insert into public.care_recipient_memberships(care_recipient_id,user_id,role) values(${q(f.patient)},${q(fixtures.supervisor.id)},'supervisor');
    insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${q(f.patient)},'schedule.read.team',${q(fixtures.professional.id)},false),(${q(f.patient)},'schedule.read.own',${q(fixtures.professional.id)},true);
    insert into public.shift_events(id,care_recipient_id,professional_id,action,reason,actor_id,created_at)
    select case when n=1 then ${q(oldest)}::uuid else gen_random_uuid() end,${q(f.patient)},case when n<=101 then ${q(fixtures.professional.id)}::uuid else ${q(fixtures.supervisor.id)}::uuid end,
      'schedule.change',case when n=1 then 'Evento antigo %_ literal' else 'Motivo histórico '||n end,${q(fixtures.adminA.id)},case when n=1 then '2026-01-01T12:00:00Z'::timestamptz else '2026-02-01T12:00:00Z'::timestamptz+make_interval(secs=>n/3) end from generate_series(1,201)n;
    insert into public.shift_events(care_recipient_id,professional_id,action,reason,actor_id) values(${q(f.patient)},null,'schedule.type','Evento geral da equipe',${q(fixtures.adminA.id)});`);
  const oracle = (own = false): string[] => JSON.parse(sql(`select jsonb_agg(id order by created_at desc,id desc) from public.shift_events where care_recipient_id=${q(f.patient)}${own ? ` and professional_id=${q(fixtures.professional.id)}` : ""};`));
  return { ...f, oldest, oracle };
}
const scheduleFacts = (patient: string) => sql(`select encode(sha256(convert_to(jsonb_build_object(
  'events',(select jsonb_agg(to_jsonb(e) order by id) from public.shift_events e where care_recipient_id=${q(patient)}),
  'shifts',(select jsonb_agg(to_jsonb(e) order by id) from public.scheduled_shifts e where care_recipient_id=${q(patient)}),
  'series',(select jsonb_agg(to_jsonb(e) order by id) from public.shift_series e where care_recipient_id=${q(patient)}),
  'stock',(select jsonb_agg(to_jsonb(e) order by id) from public.stock_movements e where care_recipient_id=${q(patient)}))::text,'UTF8')),'hex');`);

test("schedule history reaches all202 events beyond the old100 limit with original authors and URL filters", async ({ page }, info) => {
  const f = await scheduleFixture(); await login(page, f.patient); const before = scheduleFacts(f.patient), all = f.oracle(); expect(all).toHaveLength(202);
  const legacy = await (await page.request.get(`/api/schedules?careRecipientId=${f.patient}&from=2026-11-01&until=2026-11-30`)).json();
  expect(legacy.data.events).toHaveLength(100); expect(legacy.data.events.some((row: { id: string }) => row.id === f.oldest)).toBe(false);
  const writes: string[] = []; page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/schedules") && request.method() !== "GET") writes.push(request.url()); });
  await page.goto(`/escalas?careRecipientId=${f.patient}`); await page.locator("summary").filter({ hasText: /^Histórico de mudanças$/ }).click();
  const panel = schedulePanel(page), seen: string[] = [];
  for (let offset = 0; offset < all.length; offset += 20) {
    await expect.poll(() => ids(panel, "data-schedule-event-id")).toEqual(all.slice(offset, offset + 20)); seen.push(...await ids(panel, "data-schedule-event-id") as string[]);
    const next = panel.getByRole("button", { name: "Próxima página de mudanças", exact: true });
    if (offset + 20 < all.length) await next.click(); else await expect(next).toBeDisabled();
  }
  expect(seen).toEqual(all); expect(seen.at(-1)).toBe(f.oldest);
  const search = panel.getByRole("searchbox", { name: "Buscar motivo da alteração", exact: true });
  await search.fill("Evento antigo"); await search.press("Enter"); await expect(page).toHaveURL(/scheduleHistoryQuery=/); await expect(search).toBeFocused();
  await expect.poll(() => ids(panel, "data-schedule-event-id")).toEqual([f.oldest]); await page.reload(); await expect(search).toHaveValue("Evento antigo");
  await expect.poll(() => ids(panel, "data-schedule-event-id")).toEqual([f.oldest]);
  const literal = await (await page.request.get(`/api/schedules/events?careRecipientId=${f.patient}&query=${encodeURIComponent('%_')}`)).json(); expect(literal.data.map((row: { id: string }) => row.id)).toEqual([f.oldest]);
  const day = await (await page.request.get(`/api/schedules/events?careRecipientId=${f.patient}&from=2026-01-01&to=2026-01-01`)).json(); expect(day.data.map((row: { id: string }) => row.id)).toEqual([f.oldest]);
  for (const query of ["from=2026-02-30", "from=2026-02-02&to=2026-02-01", "pageSize=101", "reference=invalid"]) expect((await page.request.get(`/api/schedules/events?careRecipientId=${f.patient}&${query}`)).status()).toBe(400);
  await page.goBack(); await expect(page).toHaveURL(/scheduleHistoryPage=11/); await expect(search).toHaveValue(""); await expect.poll(() => ids(panel, "data-schedule-event-id")).toEqual(all.slice(200));
  await page.setViewportSize({ width: 320, height: 900 }); await auditFromTop(page, "schedule oldest history320");
  mkdirSync("output/playwright/phase-d", { recursive: true });
  const bounds = await panel.boundingBox(); expect(bounds).not.toBeNull();
  // Keep the known top origin;scrolling this tall element under a fixed header
  // would capture that header over the form instead of the document region.
  await page.screenshot({ path: `output/playwright/phase-d/schedule-history-oldest-${info.project.name}.png`, fullPage: true, clip: bounds! });
  expect(scheduleFacts(f.patient)).toBe(before); expect(writes).toEqual([]);
});

test("schedule personal history enforces real own RLS and rejects stale or inconsistent results without replay", async ({ page, request }) => {
  const f = await scheduleFixture(); await login(page, f.patient, "professional"); const before = scheduleFacts(f.patient), own = f.oracle(true); expect(own).toHaveLength(101);
  expect((await request.get(`/api/schedules/events?careRecipientId=${f.patient}`)).status()).toBe(401);
  let mode = "live", release = () => {}, entered = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; }), held = new Promise<void>(resolve => { entered = resolve; });
  await page.route("**/api/schedules/events?*", async route => {
    if (mode === "unavailable") return route.fulfill({ status: 503, json: { code: "UNAVAILABLE", error: "Histórico pessoal temporariamente indisponível" } });
    const response = await route.fetch(); if (!response.ok()) return route.fulfill({ response }); const body = await response.json();
    if (mode === "delay") { entered(); await gate; return route.fulfill({ response }); }
    if (mode === "patient") body.careRecipientId = randomUUID();
    if (mode === "reader") body.readerId = randomUUID();
    if (mode === "foreignRow") body.data[0].professional_id = fixtures.supervisor.id;
    if (mode === "page") body.page++;
    if (mode === "filter") body.filters.action = "other";
    if (mode === "short") body.data.pop();
    if (mode === "duplicate") body.data[1] = body.data[0];
    return route.fulfill({ response, json: body });
  });
  try {
    await page.goto(`/escalas?careRecipientId=${f.patient}&scheduleHistoryPage=6`); const panel = schedulePanel(page);
    await expect.poll(() => ids(panel, "data-schedule-event-id")).toEqual([f.oldest]);
    const ownRead = await (await page.request.get(`/api/schedules/events?careRecipientId=${f.patient}&pageSize=100`)).json();
    expect(ownRead.scope).toBe("own"); expect(ownRead.total).toBe(101); expect(ownRead.data.every((row: { professional_id: string }) => row.professional_id === fixtures.professional.id)).toBe(true);
    for (const invalid of ["patient", "reader", "foreignRow", "page", "filter", "short", "unavailable"]) {
      mode = invalid; await panel.getByRole("button", { name: "Atualizar mudanças", exact: true }).click(); await expect(panel.getByRole("alert")).toBeVisible();
      await expect.poll(() => ids(panel, "data-schedule-event-id")).toEqual([f.oldest]);
      mode = "live"; await panel.getByRole("button", { name: "Atualizar mudanças", exact: true }).click(); await expect(panel.getByRole("alert")).toHaveCount(0);
    }
    mode = "delay"; await panel.getByRole("button", { name: "Atualizar mudanças", exact: true }).click(); await held;
    mode = "live"; const search = panel.getByRole("searchbox", { name: "Buscar motivo da alteração", exact: true });
    await search.fill("Motivo histórico"); await search.press("Enter"); await expect.poll(() => ids(panel, "data-schedule-event-id")).toEqual(own.slice(0, 20)); release();
    mode = "duplicate"; await panel.getByRole("button", { name: "Atualizar mudanças", exact: true }).click(); await expect(panel.getByRole("alert")).toBeVisible();
    await expect.poll(() => ids(panel, "data-schedule-event-id")).toEqual(own.slice(0, 20));
    mode = "unavailable"; await search.fill("Nenhuma alteração fictícia"); await search.press("Enter"); await expect(panel.getByRole("alert")).toBeVisible();
    await expect.poll(() => ids(panel, "data-schedule-event-id")).toEqual([]); await expect(panel.getByText("Nenhuma alteração corresponde aos filtros consultados.", { exact: true })).toHaveCount(0);
    mode = "live"; await panel.getByRole("button", { name: "Atualizar mudanças", exact: true }).click(); await expect(panel.getByText("Nenhuma alteração corresponde aos filtros consultados.", { exact: true })).toBeVisible();
    expect(scheduleFacts(f.patient)).toBe(before);
    sql(`update public.capability_overrides set enabled=false where care_recipient_id=${q(f.patient)} and subject_user=${q(fixtures.professional.id)} and capability='schedule.read.own';`);
    await panel.getByRole("button", { name: "Atualizar mudanças", exact: true }).click(); await expect(panel.getByRole("alert")).toBeVisible();
    await expect.poll(() => ids(panel, "data-schedule-event-id")).toEqual([]);
    expect((await page.request.get(`/api/schedules/events?careRecipientId=${f.patient}`)).status()).toBe(403);
    const foreign = await rpc(await actor("global"), "admin_upsert_recipient", { p_id: null, p_display_name: "Histórico privado fictício", p_is_active: true, p_is_development: true });
    expect((await page.request.get(`/api/schedules/events?careRecipientId=${foreign.id}`)).status()).toBe(404);
  } finally { release(); }
});
