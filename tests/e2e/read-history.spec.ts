import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { historyFixture } from "../integration/read-history-fixtures.mjs";
import { actor, fixtures, rpc } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";

test.setTimeout(180_000);
mkdirSync("output/playwright/phase-d", { recursive: true });
const history = (page: Page) => page.getByRole("region", { name: "Histórico de auditoria", exact: true });
async function login(page: Page, patient: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}
test.afterEach(async ({ page }) => { await page.unrouteAll({ behavior: "wait" }); });
const historyUrl = (patient: string) => `/admin?section=audit&careRecipientId=${patient}&auditAction=invitation.created`;

test("D3 histórico alcança evento anterior a201, referência do recurso e período com escopo e largura preservados", async ({ page }, info) => {
  const f = await historyFixture(); await login(page, f.patient); await page.goto(historyUrl(f.patient));
  const panel = history(page), search = panel.getByLabel("Referência do evento ou recurso", { exact: true });
  await expect(panel.getByText("201 eventos encontrados · página 1 de 11", { exact: true })).toBeVisible();
  const ids: string[] = [];
  for (let pageNumber = 1; pageNumber <= 11; pageNumber++) {
    await expect(panel.getByText(`201 eventos encontrados · página ${pageNumber} de 11`, { exact: true })).toBeVisible();
    ids.push(...await panel.locator(".hca-audit-event").evaluateAll(nodes => nodes.map(node => node.querySelector("p:nth-of-type(3) span")!.textContent!)));
    if (pageNumber < 11) await panel.getByRole("button", { name: "Próxima página do histórico", exact: true }).click();
  }
  const oracle = JSON.parse(sql(`select jsonb_agg(id order by created_at desc,id desc) from public.audit_events where metadata->>'care_recipient_id'=${sqlLiteral(f.patient)} and action='invitation.created';`));
  expect(ids).toEqual(oracle); expect(new Set(ids).size).toBe(201); expect(ids.at(-1)).toBe(f.oldest);
  await search.fill(f.resource); await search.press("Enter");
  await expect(panel.getByText("1 evento encontrado · página 1 de 1", { exact: true })).toBeVisible(); await expect(search).toBeFocused();
  await expect(panel.getByRole("listitem", { name: "Evento " + f.oldest.slice(0, 8), exact: true })).toBeVisible();
  await page.reload(); await expect(search).toHaveValue(f.resource); await expect(panel.getByText("1 evento encontrado · página 1 de 1", { exact: true })).toBeVisible();
  for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); await audit(page, "D3 audit history " + width); }
  await page.setViewportSize({ width: 390, height: 900 });
  await panel.getByRole("listitem", { name: "Evento " + f.oldest.slice(0, 8), exact: true }).screenshot({ path: `output/playwright/phase-d/d3-history-card-${info.project.name}.png` });
  await panel.getByRole("button", { name: "Remover Referência: " + f.resource, exact: true }).click();
  await expect(panel.getByLabel("Evento de auditoria", { exact: true })).toHaveValue("invitation.created"); await expect(search).toHaveValue("");
  await panel.getByLabel("Data inicial do histórico", { exact: true }).fill("2026-01-01");
  await panel.getByLabel("Data final do histórico", { exact: true }).fill("2026-01-01"); await panel.getByRole("button", { name: "Consultar histórico", exact: true }).click();
  await expect(panel.getByText("201 eventos encontrados · página 1 de 11", { exact: true })).toBeVisible();
  expect(sql(`select count(*) from public.audit_events where metadata->>'care_recipient_id'=${sqlLiteral(f.patient)} and action='invitation.created';`)).toBe("201");
  for (const query of ["pageSize=101", "pageSize=null", "page=null", "from=2026-02-30"]) {
    const invalid = await page.request.get(`/api/admin?section=audit&careRecipientId=${f.patient}&${query}`); expect(invalid.status(), query).toBe(400);
  }
  expect((await page.request.get(`/api/patient-settings?careRecipientId=${f.patient}&pageSize=51`)).status()).toBe(400);
});

test("D3 histórico distingue demora erro e vazio e ignora resposta antiga mesmo com transporte sem abort", async ({ page }) => {
  const f = await historyFixture();
  const global = await actor("global"), other = await rpc(global, "admin_upsert_recipient", { p_id: null, p_display_name: "Paciente fictício privado de auditoria " + randomUUID().slice(0, 8), p_is_active: true, p_is_development: true });
  sql(`insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(${sqlLiteral(fixtures.global.id)},'private.other.event','patient',${sqlLiteral(other.id)},jsonb_build_object('care_recipient_id',${sqlLiteral(other.id)},'privateMarker','Somente outro paciente'));`);
  await page.addInitScript(() => {
    const native = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, window.location.origin);
      let options = init;
      const state = window as unknown as { hcaNextAuditRetry?: boolean };
      if (url.pathname === "/api/admin" && url.searchParams.get("section") === "audit" && state.hcaNextAuditRetry) {
        state.hcaNextAuditRetry = false;
        const headers = new Headers(init?.headers); headers.set("x-hca-controlled-audit-retry", "1"); options = { ...init, headers };
      }
      return native(input, url.pathname === "/api/admin" && url.searchParams.get("query") === "Resposta antiga sem resultado" ? { ...options, signal: undefined } : options);
    };
  });
  await login(page, f.patient);
  let releaseFirst!: () => void, firstEntered!: () => void, releaseOld!: () => void, oldEntered!: () => void;
  const firstGate = new Promise<void>(resolve => { releaseFirst = resolve; }), enteredFirst = new Promise<void>(resolve => { firstEntered = resolve; });
  const oldGate = new Promise<void>(resolve => { releaseOld = resolve; }), enteredOld = new Promise<void>(resolve => { oldEntered = resolve; });
  let mode: "first" | "error" | "live" = "first";
  await page.route("**/api/admin?*", async route => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("section") !== "audit") return route.continue();
    if (mode === "first") { const response = await route.fetch(); firstEntered(); await firstGate; return route.fulfill({ response }); }
    if (mode === "error") {
      if (route.request().headers()["x-hca-controlled-audit-retry"] === "1") mode = "live";
      else return route.fulfill({ status: 503, json: { code: "DATABASE_UNAVAILABLE", error: "Falha controlada na leitura do histórico" } });
    }
    if (url.searchParams.get("query") === "Resposta antiga sem resultado") { const response = await route.fetch(); oldEntered(); await oldGate; return route.fulfill({ response }); }
    await route.continue();
  });
  try {
    await page.goto(historyUrl(f.patient)); await enteredFirst;
    // A realtime invalidation can start a newer read while the first is held.
    // Hold the entire initial cohort so every pending read models the delay.
    await page.evaluate(() => window.dispatchEvent(new Event("hca:data-changed")));
    const panel = history(page), query = panel.getByLabel("Buscar código de evento ou nome da pessoa", { exact: true });
    await expect(panel.getByText("Consultando histórico…", { exact: true })).toBeVisible();
    await expect(panel.getByText("Nenhum evento corresponde aos filtros consultados.", { exact: true })).toHaveCount(0);
    mode = "live"; releaseFirst(); await expect(panel.getByText("201 eventos encontrados · página 1 de 11", { exact: true })).toBeVisible();
    mode = "error"; await query.fill("Termo sem correspondência"); await query.press("Enter");
    await expect(panel.getByRole("alert")).toContainText("Falha controlada na leitura do histórico");
    await expect(panel.getByText("Nenhum evento corresponde aos filtros consultados.", { exact: true })).toHaveCount(0);
    const retry = panel.getByRole("button", { name: "Consultar histórico novamente", exact: true });
    await page.evaluate(() => {
      const mark = (event: MouseEvent) => {
        if (!(event.target instanceof Element) || event.target.closest("button")?.textContent?.trim() !== "Consultar histórico novamente") return;
        (window as unknown as { hcaNextAuditRetry: boolean }).hcaNextAuditRetry = true;
        document.removeEventListener("click", mark, true);
      };
      document.addEventListener("click", mark, true);
    });
    await retry.click();
    await expect(panel.getByText("Nenhum evento corresponde aos filtros consultados.", { exact: true })).toBeVisible();
    await query.fill("Resposta antiga sem resultado"); await query.press("Enter"); await enteredOld;
    const name = sql(`select full_name from public.profiles where id=${sqlLiteral(fixtures.adminA.id)};`);
    await query.fill(name); await query.press("Enter");
    await expect(panel.getByText("201 eventos encontrados · página 1 de 11", { exact: true })).toBeVisible(); await expect(query).toBeFocused();
    const oldResponse = page.waitForResponse(response => new URL(response.url()).pathname === "/api/admin" && new URL(response.url()).searchParams.get("query") === "Resposta antiga sem resultado");
    releaseOld(); await (await oldResponse).finished();
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect(panel.getByText("201 eventos encontrados · página 1 de 11", { exact: true })).toBeVisible(); await expect(query).toHaveValue(name);
    const denied = await page.request.get(`/api/admin?section=audit&careRecipientId=${other.id}`);
    expect(denied.status()).toBe(404); expect(await denied.text()).not.toContain("Somente outro paciente");
    expect(sql(`select count(*) from public.audit_events where metadata->>'care_recipient_id'=${sqlLiteral(f.patient)} and action='invitation.created';`)).toBe("201");
  } finally { mode = "live"; releaseFirst(); releaseOld(); }
});
