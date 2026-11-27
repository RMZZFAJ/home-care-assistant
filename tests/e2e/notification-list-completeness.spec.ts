import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { adjustCapability, fixtures, actor, issue, rpc, setup } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { auditFromTop } from "./accessibility-audit";

test.setTimeout(180_000);
test.afterEach(async ({ page }) => page.unrouteAll({ behavior: "wait" }));
const center = (page: Page) => page.getByRole("region", { name: "Acompanhamento pessoal", exact: true });
const readError = (page: Page) => page.getByRole("dialog", { name: "Não foi possível consultar os avisos", exact: true });
const unreadFilter = (page: Page) => center(page).getByRole("button", { name: "Não vistos", exact: true });
const ids = (page: Page) => center(page).locator("li[data-notification-id]").evaluateAll(nodes => nodes.map(node => node.getAttribute("data-notification-id")));
async function populated() {
  const f = await setup(), family = await actor("family", f.patient);
  const doc = await rpc(family, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity: "1" }] }, p_draft: false });
  const notification = sql(`select id from public.requisition_notifications where document_id=${q(doc.id)} and recipient_user_id=${q(fixtures.family.id)} and channel='internal' limit 1;`);
  expect(notification).toMatch(/^[0-9a-f-]{36}$/);
  sql(`update public.requisition_notifications set created_at='2026-01-01T00:00:00Z',seen_at=null where id=${q(notification)};
    insert into public.requisition_notifications(care_recipient_id,document_id,recipient_user_id,recipient_group,recipient_label,channel,state,event_key,silent,created_at,seen_at)
    select care_recipient_id,document_id,recipient_user_id,recipient_group,'Aviso de teste','internal','delivered',event_key,g%5=0,'2026-01-02T00:00:00Z'::timestamptz+make_interval(secs=>g/3),case when g%4=0 then now() else null end
    from public.requisition_notifications cross join generate_series(1,101)g where id=${q(notification)};`);
  const oracle = (unread = false, bell = false): string[] => JSON.parse(sql(`select jsonb_agg(id::text order by created_at desc,id) from public.requisition_notifications where care_recipient_id=${q(f.patient)} and recipient_user_id=${q(fixtures.family.id)}${unread ? " and seen_at is null" : ""}${bell ? " and not silent" : ""};`));
  return { ...f, doc, notification, oracle };
}
async function login(page: Page, patient: string) {
  await page.goto("/login"); await page.getByLabel("E-mail", { exact: true }).fill(fixtures.family.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword); await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible(); await selectContext(page, patient);
}
const facts = (patient: string, includeNotifications = true) => sql(`select encode(sha256(convert_to(jsonb_build_object(
  'documents',(select jsonb_agg(to_jsonb(t) order by id) from public.operational_documents t where care_recipient_id=${q(patient)}),
  'events',(select jsonb_agg(to_jsonb(t) order by id) from public.document_events t where care_recipient_id=${q(patient)}),
  'stock',(select jsonb_agg(to_jsonb(t) order by id) from public.stock_movements t where care_recipient_id=${q(patient)})
  ${includeNotifications ? `,'notifications',(select jsonb_agg(to_jsonb(t) order by id) from public.requisition_notifications t where care_recipient_id=${q(patient)})` : ""})::text,'UTF8')),'hex');`);

test("notification history reaches every old notice,restores page and unread filter and marks only the explicitly selected notice", async ({ page }, info) => {
  const f = await populated(), all = f.oracle(); expect(all).toHaveLength(102); expect(all.at(-1)).toBe(f.notification);
  const before = facts(f.patient), officialBefore = facts(f.patient, false);
  await login(page, f.patient);
  const writes: string[] = []; page.on("request", request => { if (new URL(request.url()).pathname === "/api/notifications" && request.method() === "POST") writes.push(request.postData() ?? ""); });
  await page.goto(`/notificacoes?careRecipientId=${f.patient}`);
  const seen: string[] = [];
  for (let offset = 0; offset < all.length; offset += 20) {
    await expect.poll(() => ids(page)).toEqual(all.slice(offset, offset + 20)); seen.push(...await ids(page) as string[]);
    const next = center(page).getByRole("button", { name: "Próxima", exact: true });
    if (offset + 20 < all.length) await next.click(); else await expect(next).toBeDisabled();
  }
  expect(seen).toEqual(all); await expect(page).toHaveURL(/page=6/);
  await page.reload(); await expect.poll(() => ids(page)).toEqual(all.slice(100));
  await unreadFilter(page).click(); await expect(page).toHaveURL(/unread=true/);
  const unread = f.oracle(true); await expect.poll(() => ids(page)).toEqual(unread.slice(0, 20));
  await page.goBack(); await expect(page).toHaveURL(/page=6.*unread=false/); await expect.poll(() => ids(page)).toEqual(all.slice(100));
  await expect(unreadFilter(page)).toHaveAttribute("aria-pressed", "false");
  const bellResponse = await page.request.get(`/api/notifications?careRecipientId=${f.patient}&pageSize=8&surface=bell`);
  expect(bellResponse.ok()).toBeTruthy(); const bell = await bellResponse.json();
  expect(bell.data.map((row: { id: string }) => row.id)).toEqual(f.oracle(false, true).slice(0, 8));
  expect(bell.total).toBe(f.oracle(false, true).length); expect(bell.unreadCount).toBe(f.oracle(true, true).length);
  expect((await page.request.get(`/api/notifications?careRecipientId=${randomUUID()}`)).status()).toBe(409);
  await page.setViewportSize({ width: 320, height: 900 }); await auditFromTop(page, "notification oldest page320");
  mkdirSync("output/playwright/phase-d", { recursive: true }); await center(page).screenshot({ path: `output/playwright/phase-d/notification-oldest-${info.project.name}.png` });
  expect(facts(f.patient)).toBe(before); expect(writes).toEqual([]);
  await center(page).locator(`li[data-notification-id="${f.notification}"]`).getByRole("button", { name: "Marcar como vista", exact: true }).click();
  await expect(center(page).locator(`li[data-notification-id="${f.notification}"]`).getByText("Vista no aplicativo", { exact: true })).toBeVisible();
  expect(writes).toHaveLength(1); expect(JSON.parse(writes[0])).toEqual({ id: f.notification });
  expect(sql(`select count(*) from public.requisition_notifications where document_id=${q(f.doc.id)} and seen_at is not null;`)).toBe("26");
  expect(facts(f.patient, false)).toBe(officialBefore);
});

test("notification history rejects mismatched or incomplete reads and ignores late results after changing filters", async ({ page }) => {
  const f = await populated(), all = f.oracle(), before = facts(f.patient); await login(page, f.patient);
  // Keep the injected responses tied to the test's reads. A late channel
  // subscription can otherwise start a refresh before the intended click.
  await page.addInitScript(() => {
    if (window.location.pathname === "/notificacoes")
      window.addEventListener("hca:data-changed", event => event.stopImmediatePropagation(), true);
  });
  let mode = "live", release = () => {}, entered = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; }), held = new Promise<void>(resolve => { entered = resolve; });
  await page.route("**/api/notifications?*", async route => {
    if (new URL(route.request().url()).searchParams.get("surface") !== "center") return route.continue();
    const responseMode = mode;
    if (responseMode === "unavailable") return route.fulfill({ status: 503, json: { code: "UNAVAILABLE", error: "Histórico de avisos temporariamente indisponível" } });
    if (responseMode === "denied") return route.fulfill({ status: 403, json: { code: "FORBIDDEN", error: "Consulta de avisos recusada" } });
    const response = await route.fetch(), body = await response.json();
    if (responseMode === "delay") { entered(); await gate; return route.fulfill({ response }); }
    if (responseMode === "page") body.page++;
    if (responseMode === "size") body.pageSize++;
    if (responseMode === "filter") body.unread = !body.unread;
    if (responseMode === "surface") body.surface = "bell";
    if (responseMode === "patient") body.careRecipientId = randomUUID();
    if (responseMode === "short") body.data.pop();
    if (responseMode === "duplicate") body.data[1] = body.data[0];
    return route.fulfill({ response, json: body });
  });
  try {
    await page.goto(`/notificacoes?careRecipientId=${f.patient}&page=2`); const expected = all.slice(20, 40);
    await expect.poll(() => ids(page)).toEqual(expected);
    for (const invalid of ["page", "size", "filter", "surface", "patient", "short", "duplicate", "unavailable"]) {
      mode = invalid; await center(page).getByRole("button", { name: "Atualizar", exact: true }).click();
      await expect(readError(page).getByRole("alert")).toBeVisible();
      await expect(readError(page)).toContainText("Última consulta confirmada em");
      await readError(page).getByRole("button", { name: "Voltar aos avisos", exact: true }).click();
      await expect.poll(() => ids(page)).toEqual(expected);
      await expect(center(page).getByRole("button", { name: "Próxima", exact: true })).toBeDisabled();
      for (const action of await center(page).getByRole("button", { name: "Marcar como vista", exact: true }).all()) await expect(action).toBeDisabled();
      await expect(center(page).getByText("Nenhuma notificação neste filtro.", { exact: true })).toHaveCount(0);
      mode = "live"; await center(page).getByRole("button", { name: "Atualizar", exact: true }).click();
      await expect(center(page).getByRole("button", { name: "Próxima", exact: true })).toBeEnabled();
      await expect(center(page).getByRole("alert")).toHaveCount(0);
    }
    mode = "delay"; await center(page).getByRole("button", { name: "Atualizar", exact: true }).click(); await held;
    mode = "live"; await unreadFilter(page).click();
    await expect.poll(() => ids(page)).toEqual(f.oracle(true).slice(0, 20)); release();
    await expect.poll(() => ids(page)).toEqual(f.oracle(true).slice(0, 20)); await expect(center(page).getByRole("status")).toHaveCount(0);
    mode = "unavailable"; await center(page).getByRole("button", { name: "Todos", exact: true }).click();
    await expect(readError(page).getByRole("alert")).toBeVisible(); await expect.poll(() => ids(page)).toEqual([]);
    await expect(center(page).getByText("Nenhuma notificação neste filtro.", { exact: true })).toHaveCount(0);
    mode = "live"; await readError(page).getByRole("button", { name: "Consultar notificações novamente", exact: true }).click(); await expect.poll(() => ids(page)).toEqual(all.slice(0, 20));
    mode = "denied"; await center(page).getByRole("button", { name: "Atualizar", exact: true }).click();
    await expect(readError(page).getByRole("alert")).toBeVisible(); await expect.poll(() => ids(page)).toEqual([]);
    expect(facts(f.patient)).toBe(before);
  } finally { release(); }
});

test("inbox combines label search, type and live tasks before pagination", async ({ page, browser }, info) => {
  const f = await populated();
  const req = await issue(f.patient, f.products);
  const code = sql(`select code from public.operational_documents where id=${q(req.id)};`);
  await login(page, f.patient);
  await page.goto(`/notificacoes?careRecipientId=${f.patient}&page=6`);
  await expect(page.getByRole("heading", { level: 1, name: "Avisos", exact: true })).toBeVisible();
  const search = center(page).getByRole("searchbox", { name: "Buscar aviso ou ficha", exact: true });
  await expect(search).toHaveCSS("padding-left", "38px");
  const impact = page.getByRole("region", { name: "Atrasos e recuperação do acompanhamento", exact: true });
  expect((await impact.boundingBox())!.y).toBeGreaterThan((await search.boundingBox())!.y);
  await expect(center(page).getByRole("button", { name: "Anterior", exact: true })).toBeEnabled();
  await center(page).getByRole("button", { name: "Com ação", exact: true }).click();
  await expect(page).toHaveURL(/page=1.*tasks=true/);
  const open = center(page).getByRole("button", { name: `Ver aviso de ${code}`, exact: true }).first();
  await expect(open).toBeVisible();
  const reference = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  try {
    const model = await reference.newPage();
    await model.route(/^https?:/, route => route.abort());
    await model.goto(pathToFileURL(resolve("hca-laboratorio-04-v2-aprovado.html")).href + "#E11-04/unseen");
    const frame = model.locator("#device-frame");
    for (const width of [360, 412]) {
      await model.getByRole("combobox", { name: "Visualização", exact: true }).selectOption(String(width));
      await expect(frame.getByPlaceholder("Buscar aviso ou ficha")).toBeVisible();
      await info.attach(`L4-avisos-${width}`, { body: await frame.screenshot(), contentType: "image/png" });
      await page.setViewportSize({ width, height: 900 });
      await auditFromTop(page, `E11-04 inbox ${width}`);
      await info.attach(`avisos-${width}`, { body: await page.screenshot(), contentType: "image/png" });
      if (info.project.name === "chromium") {
        await model.locator(".e11-notice-open").first().click();
        const taskHeading = "Sua ciência está pendente";
        await expect(frame.getByRole("heading", { name: taskHeading, exact: true })).toBeVisible();
        await open.click();
        const notice = page.getByRole("dialog", { name: code, exact: true });
        await expect(notice.getByRole("heading", { name: "Na ficha", exact: true })).toBeVisible();
        await expect(notice.getByRole("heading", { name: taskHeading, exact: true })).toBeVisible();
        await expect(notice.getByText("Não visto", { exact: true })).toBeVisible();
        await expect(notice.getByText(/emitiu uma requisição de materiais para/)).toBeVisible();
        const panel = notice.getByRole("region", { name: "Conteúdo de " + code, exact: true });
        await expect.poll(() => panel.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true);
        await auditFromTop(page, `E11-04 painel de aviso ${width}`);
        await info.attach(`L4-painel-aviso-${width}`, { body: await frame.screenshot({ path: info.outputPath(`laboratorio-${width}.png`) }), contentType: "image/png" });
        await info.attach(`painel-aviso-${width}`, { body: await page.screenshot({ path: info.outputPath(`produto-${width}.png`), animations: "disabled" }), contentType: "image/png" });
        await notice.getByRole("button", { name: "Voltar", exact: true }).click();
        await expect(open).toBeFocused();
        await frame.getByRole("button", { name: "Voltar", exact: true }).click();
      }
    }
  } finally {
    await reference.close();
    await page.bringToFront();
  }
  await search.fill(code.toLowerCase());
  await expect.poll(() => new URL(page.url()).searchParams.get("q")).toBe(code.toLowerCase());
  await expect(open).toBeVisible();
  await center(page).getByRole("button", { name: "Filtrar avisos", exact: true }).click();
  const filters = page.getByRole("dialog", { name: "Filtrar avisos", exact: true });
  await filters.getByRole("combobox", { name: "Tipo de ficha", exact: true }).selectOption("BAL");
  await filters.getByRole("button", { name: "Aplicar filtro", exact: true }).click();
  await expect(center(page).getByText("Nenhum aviso encontrado", { exact: true })).toBeVisible();
  await expect(open).toHaveCount(0);
  await page.goBack();
  await expect(open).toBeVisible();
  await open.click();
  const details = page.getByRole("dialog", { name: code, exact: true });
  await expect(details.getByRole("region", { name: "Ação na ficha", exact: true })).toContainText("Confirmar ciência na requisição");
  const labelSearch = await page.request.get(`/api/notifications?careRecipientId=${f.patient}&q=requisicao+emitida&kind=REQ`);
  expect(labelSearch.ok()).toBe(true);
  expect(await labelSearch.json()).toMatchObject({ data: expect.arrayContaining([expect.objectContaining({ document_id: req.id })]) });
});

test("notification detail discards a row received before its destination permission was withdrawn", async ({ page }) => {
  const f = await populated();
  const before = facts(f.patient);
  await login(page, f.patient);
  await page.goto(`/notificacoes?careRecipientId=${f.patient}&page=6`);
  const row = center(page).locator(`li[data-notification-id="${f.notification}"]`);
  const open = row.getByRole("button", { name: `Ver aviso de ${f.doc.code}`, exact: true });
  await expect(open).toBeVisible();
  let release = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  // Hold automatic list refreshes to reproduce a click on an already rendered row.
  await page.route("**/api/notifications?*", async route => {
    if (!new URL(route.request().url()).searchParams.has("noticeId")) await gate;
    await route.continue();
  });
  try {
    await adjustCapability(f.admin, f.patient, {
      capability: "com.read", enabled: false, subjectUser: fixtures.family.id, reviewedRole: "family",
    });
    const detail = page.waitForResponse(response => new URL(response.url()).searchParams.get("noticeId") === f.notification);
    await open.click();
    expect((await detail).status()).toBe(404);
    const denied = page.getByRole("dialog", { name: "Aviso indisponível", exact: true });
    await expect(denied.getByRole("alert")).toHaveText("Este aviso não está disponível no vínculo selecionado.");
    await expect(denied.getByText(f.doc.code)).toHaveCount(0);
    await expect(denied.getByRole("button", { name: /Abrir/ })).toHaveCount(0);
    await denied.getByRole("button", { name: "Voltar aos avisos", exact: true }).click();
    await expect(center(page).getByRole("searchbox", { name: "Buscar aviso ou ficha", exact: true })).toBeFocused();
    await expect(page.getByRole("button", { name: "Notificações", exact: true })).toBeVisible();
    release();
    await expect(row).toHaveCount(0);
    const bell = await page.request.get(`/api/notifications?careRecipientId=${f.patient}&surface=bell`);
    expect(await bell.json()).toMatchObject({ data: [], total: 0, unreadCount: 0 });
    expect(facts(f.patient)).toBe(before);
  } finally {
    release();
  }
});
