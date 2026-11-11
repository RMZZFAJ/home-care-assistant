import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { setup, fixtures, actor, rpc } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { auditFromTop } from "./accessibility-audit";

test.setTimeout(180_000);
test.afterEach(async ({ page }) => page.unrouteAll({ behavior: "wait" }));
const region = (page: Page) => page.getByRole("region", { name: "Propostas de configuração", exact: true });
const ids = (page: Page) => region(page).locator("article[data-proposal-id]").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-proposal-id")));
async function populated() {
  const f = await setup(), global = await actor("global");
  const original = await rpc(global, "configure_patient_access", { p_patient: f.patient, p_kind: "settings", p_change: { patientShortName: "Pendência antiga001" }, p_key: randomUUID(), p_version: 1 });
  sql(`update public.access_change_requests set created_at='2026-01-01T00:00:00Z' where id=${q(original.id)};
    insert into public.access_change_requests(care_recipient_id,kind,proposed,base_version,status,proposed_by,idempotency_key,created_at,decided_at)
    select care_recipient_id,kind,jsonb_build_object('patientShortName','Pendência antiga'||lpad(n::text,3,'0')),base_version,'pending',proposed_by,gen_random_uuid(),'2026-01-02T00:00:00Z'::timestamptz+make_interval(secs=>n/3),null
    from public.access_change_requests cross join generate_series(2,101)n where id=${q(original.id)};
    insert into public.access_change_requests(care_recipient_id,kind,proposed,base_version,status,proposed_by,idempotency_key,created_at,decided_at)
    select care_recipient_id,kind,jsonb_build_object('archiveDays',n),base_version,'rejected',proposed_by,gen_random_uuid(),'2026-02-01T00:00:00Z'::timestamptz+make_interval(secs=>n/3),now()
    from public.access_change_requests cross join generate_series(1,101)n where id=${q(original.id)};`);
  const oracle = (all = false): string[] => JSON.parse(sql(`select jsonb_agg(id::text order by created_at desc,id desc) from public.access_change_requests where care_recipient_id=${q(f.patient)}${all ? "" : " and status in ('pending','awaiting_acceptance')"};`));
  return { ...f, original, oracle };
}
async function login(page: Page, patient: string) {
  await page.goto("/login"); await page.getByLabel("E-mail", { exact: true }).fill(fixtures.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword); await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible(); await selectContext(page, patient);
}
const facts = (patient: string) => sql(`select encode(sha256(convert_to(jsonb_build_object(
  'requests',(select jsonb_agg(to_jsonb(t) order by id) from public.access_change_requests t where care_recipient_id=${q(patient)}),
  'settings',(select to_jsonb(t) from public.patient_settings t where care_recipient_id=${q(patient)}),
  'members',(select jsonb_agg(to_jsonb(t) order by user_id) from public.care_recipient_memberships t where care_recipient_id=${q(patient)}),
  'overrides',(select jsonb_agg(to_jsonb(t) order by id) from public.capability_overrides t where care_recipient_id=${q(patient)}),
  'stock',(select jsonb_agg(to_jsonb(t) order by id) from public.stock_movements t where care_recipient_id=${q(patient)}))::text,'UTF8')),'hex');`);

test("proposal history reaches101 pending requests behind resolved history and preserves filters,focus,Back and official facts", async ({ page }, info) => {
  const f = await populated(), open = f.oracle(), all = f.oracle(true); expect(open).toHaveLength(101); expect(all).toHaveLength(202); expect(open.at(-1)).toBe(f.original.id);
  const before = facts(f.patient); await login(page, f.patient);
  const writes: string[] = []; page.on("request", request => { if (new URL(request.url()).pathname === "/api/patient-settings" && request.method() === "POST") writes.push(request.url()); });
  await page.goto(`/configuracoes?careRecipientId=${f.patient}&area=people`);
  await expect.poll(() => ids(page)).toEqual(open.slice(0, 20));
  const refreshed = page.waitForResponse(response => new URL(response.url()).pathname === "/api/patient-settings" && new URL(response.url()).searchParams.get("changesOnly") === "true");
  await region(page).getByRole("button", { name: "Consultar propostas", exact: true }).click();
  expect((await refreshed).status()).toBe(200);
  await expect(page).toHaveURL(/proposalStatus=open/);
  const traverse = async (oracle: string[]) => {
    const seen: string[] = [];
    for (let offset = 0; offset < oracle.length; offset += 20) {
      await expect.poll(() => ids(page)).toEqual(oracle.slice(offset, offset + 20)); seen.push(...await ids(page) as string[]);
      const next = region(page).getByRole("button", { name: "Próxima página de propostas", exact: true });
      if (offset + 20 < oracle.length) await next.click(); else await expect(next).toBeDisabled();
    }
    expect(seen).toEqual(oracle);
  };
  await traverse(open);
  await region(page).getByLabel("Situação da proposta", { exact: true }).selectOption("all"); await region(page).getByRole("button", { name: "Consultar propostas", exact: true }).click();
  await expect(page).toHaveURL(/proposalStatus=all/); await traverse(all);
  const search = region(page).getByRole("searchbox", { name: "Buscar proposta por referência ou conteúdo", exact: true });
  await search.fill(f.original.id); await search.press("Enter"); await expect(page).toHaveURL(/proposalQuery=/);
  await expect(search).toBeFocused(); await expect.poll(() => ids(page)).toEqual([f.original.id]);
  await page.reload(); await expect(search).toHaveValue(f.original.id); await expect.poll(() => ids(page)).toEqual([f.original.id]);
  await page.goBack(); await expect(page).toHaveURL(/proposalPage=11/); await expect(search).toHaveValue(""); await expect.poll(() => ids(page)).toEqual(all.slice(200));
  await page.setViewportSize({ width: 320, height: 900 }); await auditFromTop(page, "proposal old history320");
  mkdirSync("output/playwright/phase-d", { recursive: true }); await region(page).screenshot({ path: `output/playwright/phase-d/proposal-oldest-${info.project.name}.png` });
  expect(facts(f.patient)).toBe(before); expect(writes).toEqual([]);
});

test("proposal history refuses wrong reads,retains only the current selection and suspends stale decisions", async ({ page }) => {
  const f = await populated(), open = f.oracle(), before = facts(f.patient); await login(page, f.patient);
  let mode = "live", release = () => {}, entered = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; }), held = new Promise<void>(resolve => { entered = resolve; });
  await page.route("**/api/patient-settings?*", async route => {
    if (new URL(route.request().url()).searchParams.get("changesOnly") !== "true") return route.continue();
    if (mode === "unavailable") return route.fulfill({ status: 503, json: { code: "UNAVAILABLE", error: "Propostas temporariamente indisponíveis" } });
    if (mode === "denied") return route.fulfill({ status: 403, json: { code: "FORBIDDEN", error: "Consulta de propostas recusada" } });
    const response = await route.fetch(), body = await response.json();
    if (mode === "delay") { entered(); await gate; return route.fulfill({ response }); }
    if (mode === "incomplete") return route.fulfill({ response, json: { changes: [] } });
    if (mode === "patient") body.careRecipientId = randomUUID();
    if (mode === "rowPatient") body.changes[0].care_recipient_id = randomUUID();
    if (mode === "page") body.page++;
    if (mode === "filter") body.status = "all";
    if (mode === "query") body.query = "Other";
    if (mode === "short") body.changes.pop();
    if (mode === "duplicate") body.changes[1] = body.changes[0];
    return route.fulfill({ response, json: body });
  });
  try {
    await page.goto(`/configuracoes?careRecipientId=${f.patient}&area=people&proposalPage=2`); await expect.poll(() => ids(page)).toEqual(open.slice(20, 40));
    for (const invalid of ["incomplete", "patient", "rowPatient", "page", "filter", "query", "short", "duplicate", "unavailable"]) {
      mode = invalid; await region(page).getByRole("button", { name: "Atualizar propostas", exact: true }).click();
      await expect(region(page).getByRole("alert")).toBeVisible(); await expect.poll(() => ids(page)).toEqual(open.slice(20, 40));
      await expect(region(page).getByRole("button", { name: "Próxima página de propostas", exact: true })).toBeDisabled();
      for (const button of await region(page).getByRole("button", { name: /^(Aprovar|Rejeitar) proposta$/ }).all()) await expect(button).toBeDisabled();
      mode = "live"; await region(page).getByRole("button", { name: "Atualizar propostas", exact: true }).click(); await expect(region(page).getByRole("alert")).toHaveCount(0);
    }
    const search = region(page).getByRole("searchbox", { name: "Buscar proposta por referência ou conteúdo", exact: true });
    mode = "delay"; await region(page).getByRole("button", { name: "Atualizar propostas", exact: true }).click(); await held;
    mode = "live"; await search.fill(f.original.id); await search.press("Enter"); await expect(page).toHaveURL(/proposalQuery=/);
    await expect.poll(() => ids(page)).toEqual([f.original.id]); release(); await expect.poll(() => ids(page)).toEqual([f.original.id]);
    mode = "unavailable"; await search.fill("Sem resultado fictício"); await search.press("Enter"); await expect(region(page).getByRole("alert")).toBeVisible();
    await expect.poll(() => ids(page)).toEqual([]); await expect(region(page).getByText("Nenhuma proposta corresponde aos filtros consultados.", { exact: true })).toHaveCount(0);
    mode = "live"; await region(page).getByRole("button", { name: "Atualizar propostas", exact: true }).click();
    await expect(region(page).getByText("Nenhuma proposta corresponde aos filtros consultados.", { exact: true })).toBeVisible();
    await region(page).getByRole("button", { name: "Limpar filtros de propostas", exact: true }).click(); await expect.poll(() => ids(page)).toEqual(open.slice(0, 20));
    mode = "denied"; await region(page).getByRole("button", { name: "Atualizar propostas", exact: true }).click(); await expect(region(page).getByRole("alert")).toBeVisible();
    await expect.poll(() => ids(page)).toEqual([]); expect(facts(f.patient)).toBe(before);
  } finally { release(); }
});
