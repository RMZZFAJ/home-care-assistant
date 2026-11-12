import { test, expect, type Page, type Locator } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { actor, env, fixtures, rpc, setup } from "../integration/v4-fixtures.mjs";
import { personalReminderFixture, reminderState } from "../integration/notice-reference-fixtures.mjs";
import { historyFixture } from "../integration/read-history-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral, pauseLocalAutomationForTests } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { audit, auditFromTop } from "./accessibility-audit";

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

const referenceUrl = pathToFileURL(resolve("Home_Care_Assistant_Modelo_Integral.html")).href;
async function compare(actual: Locator, model: Locator, properties: string[]) {
  const expected = await model.evaluate((node, keys) => Object.fromEntries(keys.map(key => [key, getComputedStyle(node).getPropertyValue(key)])), properties);
  for (const [property, value] of Object.entries(expected)) await expect(actual).toHaveCSS(property, value);
}

test("NOT05 global attempt consultation keeps real source, minimizes data and recovers without granting patient actions",async({page})=>{
  test.setTimeout(240_000);
  const f=await setup();owned.add(f.patient);await login(page);await openConsole(page,"shared_database");
  await consoleRegion(page).getByRole("tab",{name:"Eventos e política",exact:true}).click();
  const scope=page.getByRole("region",{name:"Tentativas de avisos no banco compartilhado",exact:true});
  const response=await page.request.get("/api/operations/notifications?source=web_push&page=1");expect(response.status()).toBe(200);
  const expected=(await response.json()).data;expect(expected.environment).toBe("shared_database");
  await expect.poll(()=>scope.locator("li[data-technical-notification]").evaluateAll(nodes=>nodes.map(node=>node.getAttribute("data-technical-notification")))).toEqual(expected.data.map((row:{id:string})=>row.id));
  const before=sql("select jsonb_build_object('stock',(select count(*) from public.stock_movements),'science',(select count(*) from public.requisition_science_events),'notices',(select count(*) from public.requisition_notifications),'attempts',(select count(*) from private.web_push_attempts));");
  const writes:string[]=[];page.on("request",request=>{if(new URL(request.url()).pathname.startsWith("/api/operations")&&request.method()!=="GET")writes.push(request.method());});
  await expect(scope).not.toContainText("PRIVATE_");await expect(scope.locator("input,textarea")).toHaveCount(0);
  await expect(scope.getByRole("button",{name:/Reprocessar|Confirmar|Autorizar|Restaurar/})).toHaveCount(0);
  for(const width of [320,1440]){await page.setViewportSize({width,height:900});await auditFromTop(page,"technical attempts "+width);}
  let mode="error";
  await page.route("**/api/operations/notifications?*",async route=>{
    if(mode==="error")return route.fulfill({status:503,json:{error:"Consulta de tentativas controlada indisponível."}});
    if(mode==="mismatch") {const result=await route.fetch();const body=await result.json();body.data.source="notices";return route.fulfill({response:result,json:body});}
    return route.continue();
  });
  const refresh=scope.getByRole("button",{name:"Atualizar tentativas",exact:true});await refresh.click();
  await expect(scope.getByRole("alert")).toContainText("Consulta de tentativas controlada indisponível.");await expect(refresh).toBeFocused();
  await expect(scope).toContainText("Última consulta confirmada preservada");
  mode="mismatch";await refresh.click();await expect(scope.getByRole("alert")).toContainText("Consulta de tentativas sem confirmação reconhecível.");
  await expect.poll(()=>scope.locator("li[data-technical-notification]").evaluateAll(nodes=>nodes.map(node=>node.getAttribute("data-technical-notification")))).toEqual(expected.data.map((row:{id:string})=>row.id));
  mode="live";await refresh.click();await expect(scope.getByRole("alert")).toHaveCount(0);
  await scope.getByRole("combobox",{name:"Fonte das tentativas",exact:true}).selectOption("notices");
  await expect(scope.locator("li[data-technical-notification]").first()).toBeVisible();await expect(scope).toContainText("sem histórico individual completo");
  expect(writes).toEqual([]);expect(sql("select jsonb_build_object('stock',(select count(*) from public.stock_movements),'science',(select count(*) from public.requisition_science_events),'notices',(select count(*) from public.requisition_notifications),'attempts',(select count(*) from private.web_push_attempts));")).toBe(before);
  await selectContext(page,f.patient);expect((await page.request.get("/api/operations/notifications?source=notices")).status()).toBe(403);
  await expect(scope).toHaveCount(0);
});

test("15 technical overview and continuity follow the approved model without a command by navigation", async ({ page, browser }, info) => {
  // Ten whole-page axe scans plus reference rendering and native navigation.
  // The first WebKit run exhausted the old aggregate budget during scan 3.
  test.setTimeout(600_000);
  const id = await fault(); await login(page); await openConsole(page);
  const before = sql("select jsonb_build_object('commands',(select count(*) from private.operations_commands),'stock',(select count(*) from public.stock_movements),'science',(select count(*) from public.requisition_science_events));");
  const writes: string[] = []; page.on("request", r => { if (new URL(r.url()).pathname === "/api/operations" && r.method() !== "GET") writes.push(r.method()); });
  const reference = await browser.newContext();
  try {
    const model = await reference.newPage(); await model.route(/^https?:/, route => route.abort()); await model.goto(referenceUrl + "#suporte/overview"); await model.locator("#roleSelect").selectOption("global");
    const scope = consoleRegion(page), component = scope.locator(".hca-observation-card").first();
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 }); await model.setViewportSize({ width, height: 900 }); await model.screenshot();
      await compare(component, model.locator(".card.metric").first(), ["border-radius", "border-top-color", "padding-top", "padding-left", "min-height"]);
      await compare(component.locator(".hca-observation-value"), model.locator(".metric .value").first(), ["font-size", "font-weight", "letter-spacing"]);
      const expectedColumns = await model.locator(".cards4").evaluate(node => getComputedStyle(node).gridTemplateColumns.split(" ").length);
      expect(await scope.locator(".hca-observation-grid").evaluate(node => getComputedStyle(node).gridTemplateColumns.split(" ").length)).toBe(expectedColumns);
      await compare(scope.getByRole("tab", { name: "Visão técnica", exact: true }), model.getByRole("tab", { name: "Visão técnica", exact: true }), ["font-size", "font-weight", "padding-top", "padding-left", "border-bottom-color"]);
      await auditFromTop(page, "technical overview " + width);
    }
    await info.attach("technical-overview", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
    const card = scope.getByRole("article", { name: "Integridade documental recusada", exact: true }).filter({ hasText: id });
    const opener = card.getByRole("button", { name: "Investigar incidente", exact: true }); await opener.click();
    const dialog = page.getByRole("dialog", { name: "Integridade documental recusada", exact: true }); await expect(dialog).toContainText(id);
    await dialog.getByRole("combobox", { name: "Motivo do acompanhamento", exact: true }).selectOption("waiting_dependency");
    await page.keyboard.press("Escape"); await expect(dialog).toHaveCount(0); await expect(opener).toBeFocused();
    await opener.click(); await expect(dialog.getByRole("combobox", { name: "Motivo do acompanhamento", exact: true })).toHaveValue("waiting_dependency");
    await dialog.getByRole("button", { name: "Fechar diálogo", exact: true }).click();
    await scope.getByRole("tab", { name: "Continuidade", exact: true }).click(); await model.goto(referenceUrl + "#suporte/continuidade");
    const guide = scope.getByRole("region", { name: "Roteiro de recuperação do serviço", exact: true }); await expect(guide).toBeVisible();
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 }); await model.setViewportSize({ width, height: 900 }); await model.screenshot();
      await compare(guide.locator(".hca-operations-card").first(), model.locator(".card.pad").first(), ["border-radius", "border-top-color", "padding-top", "padding-left"]);
      await compare(guide.getByRole("heading", { name: "Backup e recuperação", exact: true }), model.locator(".card.pad h2").first(), ["font-size", "font-weight", "line-height"]);
      expect(await guide.locator(".hca-recovery-grid").evaluate(node => getComputedStyle(node).gridTemplateColumns.split(" ").length)).toBe(width <= 850 ? 1 : 2);
      await auditFromTop(page, "technical continuity " + width);
    }
    await info.attach("technical-continuity", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
    await scope.getByRole("tab", { name: "Eventos e política", exact: true }).click();
    await scope.getByText("Limites e severidades por ambiente", { exact: true }).click();
    const input = scope.getByLabel("Fila: aviso (segundos)", { exact: true }); await input.fill("125");
    await scope.getByRole("tab", { name: "Residências e contas", exact: true }).click();
    await expect(scope.getByRole("link", { name: "Preparar residência", exact: true })).toHaveAttribute("href", "/admin?section=patient");
    await expect(scope.getByRole("link", { name: "Consultar contas globais", exact: true })).toHaveAttribute("href", "/admin?section=profiles");
    await page.goBack(); await expect(input).toHaveValue("125");
    expect(writes).toEqual([]); expect(sql("select jsonb_build_object('commands',(select count(*) from private.operations_commands),'stock',(select count(*) from public.stock_movements),'science',(select count(*) from public.requisition_science_events));")).toBe(before);
  } finally { await reference.close(); }
});

test("15 audit and uncertain-notification review retain canonical records and require the explicit command", async ({ page, browser }, info) => {
  test.setTimeout(600_000);
  const reads:{path:string;status?:number;event:string}[]=[];
  page.on("request",request=>{const path=new URL(request.url()).pathname;if(["/api/runtime","/api/context","/api/admin"].includes(path))reads.push({path,event:"request"});});
  page.on("response",response=>{const path=new URL(response.url()).pathname;if(["/api/runtime","/api/context","/api/admin"].includes(path))reads.push({path,event:"response",status:response.status()});});
  const f = await historyFixture(); owned.add(f.patient); await login(page, "adminA", f.patient);
  await page.goto("/admin?section=audit&careRecipientId=" + f.patient);
  const panel = page.getByRole("region", { name: "Histórico de auditoria", exact: true });
  try { await expect(panel.locator("li[data-audit-id]").first()).toBeVisible(); }
  catch(error){await info.attach("technical-audit-readiness",{body:JSON.stringify(reads),contentType:"application/json"});throw error;}
  const reference = await browser.newContext();
  try {
    const model = await reference.newPage(); await model.route(/^https?:/, route => route.abort()); await model.goto(referenceUrl + "#pessoas/pessoas");
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 }); await model.setViewportSize({ width, height: 900 }); await model.screenshot();
      await compare(panel.locator("li[data-audit-id]").first(), model.locator(".record").first(), ["padding-top", "padding-left", "column-gap", "border-bottom-color"]);
      await auditFromTop(page, "technical audit " + width);
    }
    const reminder = randomUUID();
    sql(`insert into public.operational_reminders(id,care_recipient_id,user_id,kind,period,expected_at) values(${sqlLiteral(reminder)},${sqlLiteral(f.patient)},${sqlLiteral(fixtures.professional.id)},'shift',current_date,now());select private.enqueue_notice(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.professional.id)},'shift.reminder',p_reminder=>${sqlLiteral(reminder)});update public.requisition_notifications set state='uncertain' where reminder_id=${sqlLiteral(reminder)};`);
    await page.goto("/admin?section=notifications&careRecipientId=" + f.patient);
    const queue = page.getByRole("region", { name: "Acompanhamento de notificações", exact: true });
    const before = sql(`select jsonb_agg(to_jsonb(n) order by id) from public.requisition_notifications n where reminder_id=${sqlLiteral(reminder)};`);
    const writes: string[] = []; page.on("request", r => { if (new URL(r.url()).pathname === "/api/admin/notifications" && r.method() !== "GET") writes.push(r.method()); });
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 }); await model.setViewportSize({ width, height: 900 }); await model.screenshot();
      await compare(queue.locator("li").first(), model.locator(".record").first(), ["padding-top", "padding-left", "column-gap"]);
      await auditFromTop(page, "technical notification " + width);
    }
    await queue.getByText("Conciliação de resultado incerto", { exact: true }).click();
    const opener = queue.getByRole("button", { name: "Revisar conciliação e nova tentativa", exact: true }); await opener.click();
    const dialog = page.getByRole("dialog", { name: "Autorizar nova tentativa", exact: true });
    await expect(dialog).toContainText("consultei o provedor"); await expect(dialog.getByRole("button", { name: "Confirmar conciliação e tentar novamente", exact: true })).toBeEnabled();
    await audit(page, "technical uncertain-notification dialog");
    await dialog.getByRole("button", { name: "Voltar sem autorizar", exact: true }).click(); await expect(opener).toBeFocused();
    expect(writes).toEqual([]); expect(sql(`select jsonb_agg(to_jsonb(n) order by id) from public.requisition_notifications n where reminder_id=${sqlLiteral(reminder)};`)).toBe(before);
    await info.attach("technical-notification", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
    const notificationId = sql(`select id from public.requisition_notifications where reminder_id=${sqlLiteral(reminder)};`);
    await opener.click();
    const confirmed = page.waitForResponse(response => new URL(response.url()).pathname === "/api/admin/notifications" && response.request().method() === "POST");
    await dialog.getByRole("button", { name: "Confirmar conciliação e tentar novamente", exact: true }).click();
    const result = await confirmed; expect(result.status()).toBe(200);
    expect(result.request().postDataJSON()).toEqual({action:"retry",careRecipientId:f.patient,notificationId,confirmUncertain:true});
    await expect(dialog).toHaveCount(0); expect(writes).toEqual(["POST"]);
    expect(sql(`select state from public.requisition_notifications where id=${sqlLiteral(notificationId)};`)).toBe("pending");
  } finally { await reference.close(); }
});

test("GUI04 roteiro liga cópia e ensaio reais, distingue falha e ambiente e nunca restaura pelo painel", async ({ page }) => {
  const archiveId = randomUUID(), manifestSha256 = "a".repeat(64);
  const metrics = { archiveId, manifestSha256, files: 12, bytes: 3456 };
  let sequence = 0;
  const start = Date.now();
  async function record(component: "backup" | "recovery", code: string, values: typeof metrics | Record<string, never>) {
    const key = randomUUID();
    const receipt = await rpc(service, "record_operations_event", { p_event: { environment: "local", component, code, idempotencyKey: key, correlationId: key, observedAt: new Date(start + sequence++ * 1000).toISOString(), metrics: values } });
    if (code === "RECOVERY_FAILURE") {
      const id = sql(`select id from private.operations_incidents where last_event_id=${sqlLiteral(receipt.id)};`);
      ownIncidents.add(id);
    }
  }
  await record("backup", "BACKUP_VERIFIED", metrics); await record("recovery", "RECOVERY_PROBE_VERIFIED", metrics);
  const business = () => sql("select jsonb_build_object('docs',(select count(*) from public.operational_documents),'science',(select count(*) from public.requisition_science_events),'stock',(select count(*) from public.stock_movements),'outbox',(select count(*) from public.requisition_notifications));");
  const before = business(), writes: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/operations" && request.method() !== "GET") writes.push(request.method()); });
  await login(page); await openConsole(page, "local");
  await consoleRegion(page).getByRole("tab", { name: "Continuidade", exact: true }).click();
  const guide = consoleRegion(page).getByRole("region", { name: "Roteiro de recuperação do serviço", exact: true });
  await expect(guide).toContainText("Registros compatíveis da mesma cópia.");
  await expect(guide).toContainText(archiveId); await expect(guide).toContainText(manifestSha256);
  await expect(guide).toContainText("não é um inventário completo"); await expect(guide).toContainText("dependem da validação operacional de recuperação");
  await expect(guide.locator("input,select,textarea,button")).toHaveCount(0);
  for (const width of [320, 390, 768, 1024, 1440]) { await page.setViewportSize({ width, height: 900 }); await audit(page, "GUI04 recovery " + width); }
  const refresh = consoleRegion(page).getByRole("button", { name: "Atualizar monitoramento", exact: true });
  await record("recovery", "RECOVERY_PROBE_VERIFIED", { ...metrics, manifestSha256: "b".repeat(64) });
  await refresh.click(); await expect(guide).toContainText("ainda não confirmados neste recorte");
  await record("recovery", "RECOVERY_FAILURE", {}); await refresh.click();
  await expect(guide).toContainText("Ensaio de recuperação não confirmado");
  let mode = "error";
  await page.route("**/api/operations?*", async route => {
    if (mode === "error") return route.fulfill({ status: 503, json: { code: "DATABASE_UNAVAILABLE", error: "Consulta técnica GUI04 indisponível" } });
    if (mode === "wrong-scope") { const response = await route.fetch(); const body = await response.json(); body.data.environment = "preview"; return route.fulfill({ response, json: body }); }
    return route.continue();
  });
  await refresh.click(); await expect(consoleRegion(page)).toContainText("Consulta técnica GUI04 indisponível");
  await expect(guide).toHaveCount(0); await expect(refresh).toBeFocused();
  mode = "wrong-scope"; await refresh.click(); await expect(consoleRegion(page)).toContainText("Resposta técnica sem confirmação reconhecível.");
  await expect(guide).toHaveCount(0); await expect(consoleRegion(page).getByRole("list", { name: "Componentes observados", exact: true })).toHaveCount(0);
  mode = "live"; await refresh.click(); await expect(guide).toBeVisible();
  await expect(guide).toContainText("Ensaio de recuperação não confirmado");
  await consoleRegion(page).getByRole("combobox", { name: "Ambiente técnico", exact: true }).selectOption("preview");
  await expect(guide).toContainText("Ambiente: Preview"); await expect(guide).not.toContainText(archiveId);
  expect(writes).toEqual([]); expect(business()).toBe(before);
});

test("OPS3 suporte global recupera a mesma alteração incerta e preserva histórico sem efeito operacional", async ({ page }) => {
  const id = await fault(); await login(page); await openConsole(page);
  const card = consoleRegion(page).getByRole("article", { name: "Integridade documental recusada", exact: true });
  await expect(card).toContainText(id);
  const business = () => sql("select jsonb_build_object('docs',(select count(*) from public.operational_documents),'science',(select count(*) from public.requisition_science_events),'stock',(select count(*) from public.stock_movements));");
  const before = business(), packets: unknown[] = [];
  let lose = true, failRead = false;
  await page.route("**/api/operations?*",route=>{if(failRead){failRead=false;return route.fulfill({status:503,json:{error:"Consulta de incidente controlada indisponível."}});}return route.continue();});
  await page.route("**/api/operations", async route => {
    if (route.request().method() !== "POST") return route.continue();
    packets.push(route.request().postDataJSON());
    if (lose) { lose = false; const response = await route.fetch(); expect(response.ok()).toBeTruthy(); return route.abort("failed"); }
    return route.continue();
  });
  await card.getByRole("button", { name: "Investigar incidente", exact: true }).click();
  const decision = page.getByRole("dialog", { name: "Integridade documental recusada", exact: true });
  await decision.getByRole("button", { name: "Iniciar acompanhamento", exact: true }).click();
  await expect(decision).toContainText("Resultado incerto");
  await expect(page.getByRole("combobox", { name: "Ambiente técnico", exact: true, includeHidden: true })).toBeDisabled();
  expect(sql(`select state from private.operations_incidents where id=${sqlLiteral(id)};`)).toBe("acknowledged");
  failRead=true;
  await decision.getByRole("button", { name: "Recuperar alteração técnica", exact: true }).click();
  await expect(decision).toContainText("Confirmação da mesma alteração recuperada.");
  await expect(decision).toContainText("Consulta de incidente controlada indisponível.");
  await expect(decision.getByRole("button",{name:"Encerrar incidente técnico",exact:true})).toBeDisabled();
  await decision.getByRole("button", { name: "Fechar diálogo", exact: true }).click();
  await consoleRegion(page).getByRole("button",{name:"Atualizar monitoramento",exact:true}).click();
  expect(packets).toHaveLength(2); expect(packets[1]).toEqual(packets[0]);
  await expect(card).toContainText("Em acompanhamento");
  await card.getByRole("button", { name: "Histórico completo deste incidente", exact: true }).click();
  const history = page.getByRole("region", { name: "Histórico técnico completo", exact: true });
  await expect(history).toContainText("Acompanhamento iniciado");
  await history.getByRole("button", { name: "Fechar histórico técnico", exact: true }).click();
  await card.getByRole("button", { name: "Investigar incidente", exact: true }).click();
  await decision.getByRole("button", { name: "Encerrar incidente técnico", exact: true }).click();
  await expect(card).toHaveCount(0); expect(business()).toBe(before);
  await expect(consoleRegion(page).getByRole("button",{name:"Atualizar monitoramento",exact:true})).toBeFocused();
  await consoleRegion(page).getByRole("combobox", { name: "Incidentes", exact: true }).selectOption("resolved");
  await expect(consoleRegion(page).getByRole("article", { name: "Integridade documental recusada", exact: true }).filter({ hasText: id })).toBeVisible();
});

test("OPS3 política usa versão vigente, recusa concorrência e mantém teclado e geometria em quatro larguras", async ({ page }) => {
  await login(page); await openConsole(page, "operator");
  await consoleRegion(page).getByRole("tab", { name: "Eventos e política", exact: true }).click();
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

test("NOT05 confirmed retry restores focus to the surviving record after its action disappears",async({page})=>{
  const f=await personalReminderFixture();owned.add(f.patient);
  const label="Conciliação de foco "+randomUUID();
  const id=sql(`update public.requisition_notifications set state='uncertain',recipient_label=${sqlLiteral(label)} where reminder_id=${sqlLiteral(f.reminder)} returning id;`);
  await login(page,"adminA",f.patient);await page.goto("/admin?section=notifications&careRecipientId="+f.patient);
  const queue=page.getByRole("region",{name:"Acompanhamento de notificações",exact:true});
  const row=queue.getByRole("listitem").filter({has:page.getByRole("heading",{name:label+" · internal",exact:true})});
  await row.getByText("Conciliação de resultado incerto",{exact:true}).click();
  await row.getByRole("button",{name:"Revisar conciliação e nova tentativa",exact:true}).click();
  const dialog=page.getByRole("dialog",{name:"Autorizar nova tentativa",exact:true});
  await dialog.getByRole("button",{name:"Confirmar conciliação e tentar novamente",exact:true}).click();
  await expect(dialog).toHaveCount(0);await expect(row).toContainText("Pendente");
  expect(sql(`select state from public.requisition_notifications where id=${sqlLiteral(id)};`)).toBe("pending");
  await expect(row).toBeFocused();
});
