import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { fixtures, actor, rpc, setup } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";

test.setTimeout(180_000);
mkdirSync("output/playwright/phase-d", { recursive: true });
test.afterEach(async ({ page }) => { await page.unrouteAll({ behavior: "wait" }); });
async function login(page: Page, patient: string | null, role = "family") {
  await page.goto("/login"); await page.getByLabel("E-mail", { exact: true }).fill(fixtures[role].email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword); await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible(); await selectContext(page, patient);
}
async function populated() {
  const f = await setup(), family = await actor("family", f.patient);
  const doc = await rpc(family, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity: "1" }] }, p_draft: false });
  const notification = sql(`select id from public.requisition_notifications where document_id=${sqlLiteral(doc.id)} and recipient_user_id=${sqlLiteral(fixtures.family.id)} and channel='internal' limit 1;`);
  expect(notification).toMatch(/^[0-9a-f-]{36}$/);
  return { ...f, doc, notification };
}
const bell = (page: Page) => page.getByRole("region", { name: "Notificações recentes", exact: true });
const center = (page: Page) => page.getByRole("region", { name: "Acompanhamento pessoal", exact: true });

test("D3 sino distingue demora falha e conteúdo e recupera por consulta sem registrar ciência", async ({ page }) => {
  const f = await populated(); await login(page, f.patient);
  const before = sql(`select jsonb_build_object('events',(select count(*) from public.document_events where document_id=${sqlLiteral(f.doc.id)}),'seen',(select seen_at from public.requisition_notifications where id=${sqlLiteral(f.notification)}));`);
  let release!: () => void, entered!: () => void, mode: "delay" | "error" | "live" = "delay";
  const gate = new Promise<void>(resolve => { release = resolve; }), first = new Promise<void>(resolve => { entered = resolve; });
  await page.route("**/api/notifications?*", async route => {
    if (new URL(route.request().url()).searchParams.get("surface") !== "bell") return route.continue();
    if (mode === "delay") { const response = await route.fetch(); entered(); await gate; return route.fulfill({ response }); }
    if (mode === "error") return route.fulfill({ status: 503, json: { code: "DATABASE_UNAVAILABLE", error: "Falha controlada na leitura do sino" } });
    return route.continue();
  });
  try {
    await page.reload(); await first; await page.getByRole("button", { name: /^Notificações/ }).click();
    await expect(bell(page).getByRole("status")).toHaveText("Consultando notificações…");
    await expect(bell(page).getByText("Você está em dia.", { exact: false })).toHaveCount(0);
    release(); await expect(bell(page).getByText(f.doc.code, { exact: true })).toBeVisible();
    mode = "error";
    await page.evaluate(() => window.dispatchEvent(new Event("hca:data-changed")));
    await expect(bell(page).getByRole("alert")).toContainText("Falha controlada na leitura do sino");
    await expect(bell(page).getByText("Você está em dia.", { exact: false })).toHaveCount(0);
    mode = "live"; await bell(page).getByRole("button", { name: "Consultar notificações novamente", exact: true }).click();
    await expect(bell(page).getByText("Última consulta confirmada; aguardando atualização.", { exact: true })).toHaveCount(0);
    await expect(bell(page).getByText(f.doc.code, { exact: true })).toBeVisible();
    await test.info().attach("notification-panel-focusable-elements", { body: JSON.stringify(await bell(page).locator("a,button").evaluateAll(elements => elements.map(element => ({ tag: element.tagName, tabIndex: (element as HTMLElement).tabIndex, explicitTabIndex: element.getAttribute("tabindex"), hidden: Boolean(element.closest('[aria-hidden="true"]')), box: { width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height } }))), null, 2), contentType: "application/json" });
    for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); await page.evaluate(() => window.scrollTo(0, 0)); await audit(page, "D3 notification bell " + width); }
    await page.setViewportSize({ width: 390, height: 900 }); await bell(page).screenshot({ path: `output/playwright/phase-d/d3-notification-panel-${test.info().project.name}.png` });
    expect(sql(`select jsonb_build_object('events',(select count(*) from public.document_events where document_id=${sqlLiteral(f.doc.id)}),'seen',(select seen_at from public.requisition_notifications where id=${sqlLiteral(f.notification)}));`)).toBe(before);
    await page.keyboard.press("Escape"); await expect(page.getByRole("button", { name: /^Notificações/ })).toBeFocused();
  } finally { release(); }
});

test("D3 central distingue demora falha resposta inválida e vazio confirmado e limita leitura à sessão", async ({ page }) => {
  const f = await setup(); await login(page, f.patient);
  let release!: () => void, entered!: () => void, mode: "delay" | "error" | "invalid" | "live" = "delay";
  const gate = new Promise<void>(resolve => { release = resolve; }), first = new Promise<void>(resolve => { entered = resolve; });
  await page.route("**/api/notifications?*", async route => {
    if (new URL(route.request().url()).searchParams.get("surface") !== "center") return route.continue();
    if (mode === "delay") { const response = await route.fetch(); entered(); await gate; return route.fulfill({ response }); }
    if (mode === "error") return route.fulfill({ status: 503, json: { code: "DATABASE_UNAVAILABLE", error: "Falha controlada na leitura da central" } });
    if (mode === "invalid") return route.fulfill({ status: 200, json: { data: [], total: 0 } });
    return route.continue();
  });
  try {
    await page.goto("/notificacoes?careRecipientId=" + f.patient); await first;
    await expect(center(page).getByRole("status")).toHaveText("Consultando notificações…");
    await expect(center(page).getByText("Nenhuma notificação neste filtro.", { exact: true })).toHaveCount(0);
    release(); await expect(center(page).getByText("Nenhuma notificação neste filtro.", { exact: true })).toBeVisible(); mode = "error";
    await center(page).getByRole("button", { name: "Atualizar", exact: true }).click();
    await expect(center(page).getByRole("alert")).toContainText("Falha controlada na leitura da central");
    await expect(center(page).getByText("Nenhuma notificação neste filtro.", { exact: true })).toHaveCount(0);
    mode = "invalid"; await center(page).getByRole("button", { name: "Consultar notificações novamente", exact: true }).click();
    await expect(center(page).getByRole("alert")).toContainText("A resposta da consulta de notificações não pôde ser lida");
    await expect(center(page).getByText("Nenhuma notificação neste filtro.", { exact: true })).toHaveCount(0);
    mode = "live"; await center(page).getByRole("button", { name: "Consultar notificações novamente", exact: true }).click();
    await expect(center(page).getByText("Nenhuma notificação neste filtro.", { exact: true })).toBeVisible();
    const response = await page.request.get("/api/notifications"); expect(response.ok()).toBeTruthy();
    expect(await response.json()).toMatchObject({ availability: "ready", careRecipientId: f.patient, data: [], total: 0, unreadCount: 0 });
    const other = await setup();
    const denied = await page.request.get("/api/notifications?careRecipientId=" + other.patient); expect(denied.status()).toBe(409); expect(await denied.text()).not.toContain(other.patient);
    for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); await audit(page, "D3 notification center " + width); }
  } finally { release(); }
});

test("D3 perfil global informa vínculo necessário sem consulta ampla ou falso em dia", async ({ page, request }) => {
  const f = await setup(); await login(page, f.patient, "global"); await selectContext(page, null);
  await expect(page.getByLabel("Pessoa assistida", { exact: true })).toHaveValue(f.patient);
  expect((await request.get("/api/notifications")).status()).toBe(401);
  const response = await page.request.get("/api/notifications"); expect(response.ok()).toBeTruthy();
  expect(await response.json()).toMatchObject({ data: [], total: 0, unreadCount: 0, availability: "patient_context_required" });
  let reads = 0; page.on("request", request => { if (new URL(request.url()).pathname === "/api/notifications") reads++; });
  await page.getByRole("button", { name: /^Notificações/ }).click();
  await expect(bell(page).getByText("Selecione um vínculo com paciente em Mudar perfil para consultar suas notificações.", { exact: true })).toBeVisible();
  await expect(bell(page).getByText("Você está em dia.", { exact: false })).toHaveCount(0);
  await page.keyboard.press("Escape"); await page.goto("/notificacoes");
  await expect(center(page).getByText("Selecione um vínculo com paciente em Mudar perfil para consultar suas notificações.", { exact: true })).toBeVisible();
  expect(reads).toBe(0);
});
