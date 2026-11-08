import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { actor, env, fixtures, rpc, setup } from "../integration/v4-fixtures.mjs";
import { personalReminderFixture, reminderState } from "../integration/notice-reference-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral, pauseLocalAutomationForTests } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";

test.setTimeout(180_000);
const service = createClient(env.url, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
let automation: { id: number; name: string; active: boolean }[] = [];
const owned = new Set<string>();
const ownIncidents = new Set<string>();
test.beforeAll(() => {
  automation = JSON.parse(sql("select coalesce(jsonb_agg(jsonb_build_object('id',jobid,'name',jobname,'active',active)),'[]') from cron.job where jobname in ('hca-operational-lifecycle','hca-notification-worker');"));
  pauseLocalAutomationForTests();
});
test.afterAll(() => { for (const job of automation) sql(`select cron.alter_job(jobid,active=>${job.active}) from cron.job where jobid=${Number(job.id)} and jobname=${sqlLiteral(job.name)};`); });
test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "wait" });
  if (owned.size) sql(`update public.care_recipients set is_active=false where id=any(array[${[...owned].map(sqlLiteral).join(",")}]::uuid[]);`);
  owned.clear();
  if (ownIncidents.size) {
    const global = await actor("global");
    for (const id of ownIncidents) {
      const incident = JSON.parse(sql(`select to_jsonb(i) from private.operations_incidents i where id=${sqlLiteral(id)};`));
      if (incident.state !== "resolved") await rpc(global, "operations_command", { p_environment: incident.environment, p_action: "resolve", p_id: id, p_expected: incident.version, p_payload: { reason: "false_alarm" }, p_key: randomUUID() });
    }
    ownIncidents.clear();
  }
});
async function login(page: Page, name = "global", patient: string | null = null) {
  await page.goto("/login"); await page.getByLabel("E-mail", { exact: true }).fill(fixtures[name].email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword); await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible(); await selectContext(page, patient);
}
const consoleRegion = (page: Page) => page.getByRole("region", { name: "Monitoramento e suporte", exact: true });
async function openConsole(page: Page, environment = "preview") {
  await page.goto("/admin");
  await page.getByRole("navigation", { name: "Áreas administrativas", exact: true }).getByRole("link", { name: /Monitoramento e suporte/ }).click();
  await consoleRegion(page).getByRole("combobox", { name: "Ambiente técnico", exact: true }).selectOption(environment);
  await expect(consoleRegion(page).getByRole("list", { name: "Componentes observados", exact: true })).toBeVisible();
}
async function fault() {
  const key = randomUUID(), receipt = await rpc(service, "record_operations_event", { p_event: { environment: "preview", component: "integrity", code: "INTEGRITY_FAILURE", idempotencyKey: key, correlationId: key, observedAt: new Date().toISOString(), metrics: { sourceCode: "INTEGRITY_PROOF_FAILED", count: 1 } } });
  const id = sql(`select id from private.operations_incidents where last_event_id=${sqlLiteral(receipt.id)};`); ownIncidents.add(id); return id;
}

test("OPS3 suporte global recupera a mesma alteração incerta e preserva histórico sem efeito operacional", async ({ page }) => {
  const id = await fault(); await login(page); await openConsole(page);
  const card = consoleRegion(page).getByRole("article", { name: "Integridade documental recusada", exact: true });
  await expect(card).toContainText(id);
  const business = () => sql("select jsonb_build_object('docs',(select count(*) from public.operational_documents),'science',(select count(*) from public.requisition_science_events),'stock',(select count(*) from public.stock_movements));");
  const before = business(), packets: unknown[] = [];
  let lose = true;
  await page.route("**/api/operations", async route => {
    if (route.request().method() !== "POST") return route.continue();
    packets.push(route.request().postDataJSON());
    if (lose) { lose = false; const response = await route.fetch(); expect(response.ok()).toBeTruthy(); return route.abort("failed"); }
    return route.continue();
  });
  await card.getByRole("button", { name: "Iniciar acompanhamento", exact: true }).click();
  await expect(consoleRegion(page)).toContainText("Resultado incerto");
  await expect(consoleRegion(page).getByRole("combobox", { name: "Ambiente técnico", exact: true })).toBeDisabled();
  expect(sql(`select state from private.operations_incidents where id=${sqlLiteral(id)};`)).toBe("acknowledged");
  await consoleRegion(page).getByRole("button", { name: "Recuperar alteração técnica", exact: true }).click();
  await expect(consoleRegion(page)).toContainText("Confirmação da mesma alteração recuperada.");
  expect(packets).toHaveLength(2); expect(packets[1]).toEqual(packets[0]);
  await expect(card.getByRole("button", { name: "Iniciar acompanhamento", exact: true })).toHaveCount(0);
  await card.getByRole("button", { name: "Histórico completo deste incidente", exact: true }).click();
  const history = page.getByRole("region", { name: "Histórico técnico completo", exact: true });
  await expect(history).toContainText("Acompanhamento iniciado");
  await history.getByRole("button", { name: "Fechar histórico técnico", exact: true }).click();
  await card.getByRole("button", { name: "Encerrar incidente técnico", exact: true }).click();
  await expect(card).toHaveCount(0); expect(business()).toBe(before);
  await consoleRegion(page).getByRole("combobox", { name: "Incidentes", exact: true }).selectOption("resolved");
  await expect(consoleRegion(page).getByRole("article", { name: "Integridade documental recusada", exact: true }).filter({ hasText: id })).toBeVisible();
});

test("OPS3 política usa versão vigente, recusa concorrência e mantém teclado e geometria em quatro larguras", async ({ page }) => {
  await login(page); await openConsole(page, "operator");
  const global = await actor("global"), original = (await rpc(global, "operations_diagnostics", { p_environment: "operator" })).policy;
  try {
    await consoleRegion(page).locator("summary").filter({ hasText: "Limites e severidades por ambiente" }).click();
    const input = consoleRegion(page).getByLabel("Fila: aviso (segundos)", { exact: true });
    await input.fill("122"); await input.press("Tab");
    await expect(consoleRegion(page).getByLabel("Fila: crítico (segundos)", { exact: true })).toBeFocused();
    await consoleRegion(page).getByRole("button", { name: "Guardar política técnica", exact: true }).click();
    await expect(consoleRegion(page)).toContainText("Alteração técnica confirmada.");
    const current = (await rpc(global, "operations_diagnostics", { p_environment: "operator" })).policy;
    expect(current.version).toBe(original.version + 1); expect(current.values.jobWarningSeconds).toBe(122);
    await expect(consoleRegion(page).getByRole("button", { name: "Guardar política técnica", exact: true })).toBeEnabled();
    await rpc(global, "operations_command", { p_environment: "operator", p_action: "configure", p_id: null, p_expected: current.version, p_payload: { policy: { jobWarningSeconds: 123 } }, p_key: randomUUID() });
    await input.fill("124");
    const refusal = page.waitForResponse(response => new URL(response.url()).pathname === "/api/operations" && response.request().method() === "POST");
    await consoleRegion(page).getByRole("button", { name: "Guardar política técnica", exact: true }).click();
    expect((await refusal).status()).toBe(409);
    await expect(consoleRegion(page)).toContainText("O acompanhamento técnico mudou em outra sessão.");
    await expect(input).toHaveValue("124");
    await expect(consoleRegion(page).getByRole("button", { name: "Guardar política técnica", exact: true })).toBeDisabled();
    await expect(consoleRegion(page).getByRole("button", { name: "Usar versão vigente como referência", exact: true })).toBeVisible();
    for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); await audit(page, "OPS3 global policy " + width); }
    await consoleRegion(page).getByRole("button", { name: "Consultar histórico completo de políticas", exact: true }).click();
    await expect(page.getByRole("region", { name: "Histórico técnico completo", exact: true })).toContainText("Política configurada");
  } finally {
    const current = (await rpc(global, "operations_diagnostics", { p_environment: "operator" })).policy;
    await rpc(global, "operations_command", { p_environment: "operator", p_action: "configure", p_id: null, p_expected: current.version, p_payload: { policy: original.values }, p_key: randomUUID() });
  }
});

test("OPS3 leitura distingue falha e resposta inválida, conserva referência anterior e recusa suporte no perfil local", async ({ page }) => {
  await login(page); await openConsole(page);
  let mode = "error";
  await page.route("**/api/operations?*", route => mode === "error" ? route.fulfill({ status: 503, json: { code: "DATABASE_UNAVAILABLE", error: "Consulta técnica controlada indisponível" } }) : mode === "invalid" ? route.fulfill({ status: 200, json: { data: {} } }) : route.continue());
  await consoleRegion(page).getByRole("button", { name: "Atualizar monitoramento", exact: true }).click();
  await expect(consoleRegion(page)).toContainText("Consulta técnica controlada indisponível");
  await expect(consoleRegion(page)).toContainText("Última consulta confirmada preservada.");
  mode = "invalid"; await consoleRegion(page).getByRole("button", { name: "Atualizar monitoramento", exact: true }).click();
  await expect(consoleRegion(page)).toContainText("Resposta técnica sem confirmação reconhecível.");
  await expect(consoleRegion(page).getByRole("list", { name: "Componentes observados", exact: true })).toHaveCount(0);
  mode = "live"; await consoleRegion(page).getByRole("button", { name: "Atualizar monitoramento", exact: true }).click();
  await expect(consoleRegion(page).getByRole("list", { name: "Componentes observados", exact: true })).toBeVisible();
  const f = await setup(); owned.add(f.patient); await page.reload(); await selectContext(page, f.patient);
  await expect(consoleRegion(page)).toHaveCount(0);
  const response = await page.request.get("/api/operations?environment=preview"); expect(response.status()).toBe(403);
  await page.goto("/admin?careRecipientId=" + f.patient);
  await expect(page.getByRole("navigation", { name: "Áreas administrativas", exact: true }).getByRole("link", { name: /Monitoramento e suporte/ })).toHaveCount(0);
});

test("OPS3 impacto pessoal conserva a referência, orienta recuperação e ajuda e não cria ciência", async ({ page }) => {
  const f = await personalReminderFixture(); owned.add(f.patient);
  sql(`update public.requisition_notifications set next_attempt_at=now()-interval '2 hours' where reminder_id=${sqlLiteral(f.reminder)} and channel='internal';`);
  const before = reminderState(f);
  await login(page, "professional", f.patient); await page.goto("/notificacoes?careRecipientId=" + f.patient);
  const impact = page.getByRole("region", { name: "Atrasos e recuperação do acompanhamento", exact: true });
  await expect(impact).toContainText("1 aviso(s) aguardando processamento");
  await expect(impact).toContainText("Um aviso atrasado ou incerto não confirma entrega nem ciência.");
  await expect(impact.getByRole("link", { name: "Guias e ajuda", exact: true })).toHaveAttribute("href", "/guias");
  expect(reminderState(f)).toBe(before);
  const response = await page.request.get("/api/operations?environment=production"); expect(response.status()).toBe(403);
  for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); await audit(page, "OPS3 personal impact " + width); }
  expect(reminderState(f)).toBe(before);
});
