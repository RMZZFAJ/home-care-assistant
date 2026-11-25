import { test, expect, type Page, type Locator } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { createECDH, randomBytes, randomUUID } from "node:crypto";
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
  await selectContext(page, patient);
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
}
const consoleRegion = (page: Page) => page.getByRole("region", { name: "Central técnica", exact: true });
async function openConsole(page: Page, environment = "preview") {
  await page.goto("/admin");
  await page.getByRole("navigation", { name: "Áreas administrativas", exact: true }).getByRole("link", { name: /Central técnica/ }).click();
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
  const f=await personalReminderFixture();owned.add(f.patient);
  const curve=createECDH("prime256v1");curve.generateKeys();
  const device=await rpc(f.pro.client,"subscribe_web_push",{p_subscription:{endpoint:"https://fcm.googleapis.com/wp/technical-e2e-"+randomUUID(),expirationTime:null,keys:{p256dh:curve.getPublicKey().toString("base64url"),auth:randomBytes(16).toString("base64url")}},p_label:"Private technical fixture",p_key_version:"test-v1"});
  const notice=sql(`select id from public.requisition_notifications where reminder_id=${sqlLiteral(f.reminder)} limit 1;`);
  try {
    const push=sql(`insert into private.web_push_deliveries(notice_id,device_id,recipient_user_id,state,attempts,dispatch_started_at,last_error,created_at)
      values(${sqlLiteral(notice)},${sqlLiteral(device.id)},${sqlLiteral(f.pro.id)},'uncertain',1,now(),'PRIVATE_PUSH_ERROR',now()+interval '200 years')
      on conflict(notice_id,device_id) do update set state='uncertain',attempts=1,dispatch_started_at=now(),last_error='PRIVATE_PUSH_ERROR',created_at=excluded.created_at returning id;`);
    sql(`insert into private.web_push_attempts(delivery_id,ordinal,lease_token,worker_id,started_at,completed_at,outcome,error_code)
      values(${sqlLiteral(push)},1,gen_random_uuid(),gen_random_uuid(),now()-interval '1 minute',now(),'uncertain','PRIVATE_ATTEMPT_ERROR');`);
    await login(page);await openConsole(page,"preview");
    await consoleRegion(page).getByRole("tab",{name:"Eventos e envios",exact:true}).click();
    const scope=page.getByRole("region",{name:"Tentativas de avisos no banco compartilhado",exact:true});
    await expect(scope).toHaveCount(0);
    await consoleRegion(page).getByRole("button",{name:"Consultar banco compartilhado",exact:true}).click();
    await expect(consoleRegion(page).getByRole("combobox",{name:"Ambiente técnico",exact:true})).toHaveValue("shared_database");
    const response=await page.request.get("/api/operations/notifications?source=web_push&page=1");expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect((await page.request.get("/api/operations/notifications?source=web_push&source=notices")).status()).toBe(400);
    const expected=(await response.json()).data;expect(expected.environment).toBe("shared_database");
    await expect.poll(()=>scope.locator("li[data-technical-notification]").evaluateAll(nodes=>nodes.map(node=>node.getAttribute("data-technical-notification")))).toEqual(expected.data.map((row:{id:string})=>row.id));
    const before=sql("select jsonb_build_object('stock',(select count(*) from public.stock_movements),'science',(select count(*) from public.requisition_science_events),'notices',(select count(*) from public.requisition_notifications),'attempts',(select count(*) from private.web_push_attempts));");
    const writes:string[]=[];page.on("request",request=>{if(new URL(request.url()).pathname.startsWith("/api/operations")&&request.method()!=="GET")writes.push(request.method());});
    await expect(scope).not.toContainText("PRIVATE_");await expect(scope.locator("input,textarea")).toHaveCount(0);
    await expect(scope.getByRole("button",{name:/Reprocessar|Confirmar|Autorizar|Restaurar/})).toHaveCount(0);
    for(const width of [320,360,412,1440]){await page.setViewportSize({width,height:900});await auditFromTop(page,"technical attempts "+width);}
    await page.bringToFront();await page.setViewportSize({width:390,height:844});
    const opener=scope.locator(`li[data-technical-notification="${push}"]`).getByRole("button");
    await opener.click();
    const attempt=page.getByRole("dialog",{name:`Web Push · ${push.slice(0,8)}`,exact:true});
    await expect(attempt).toContainText("Tentativa 1 · Resultado incerto");
    await expect(attempt).not.toContainText("PRIVATE_");
    await attempt.locator("summary").filter({ hasText: "Referência técnica" }).click();
    await expect(attempt.getByText(push,{exact:true})).toBeVisible();
    await audit(page,"technical attempt details 390");
    await attempt.getByRole("button",{name:"Voltar às tentativas",exact:true}).click();
    await expect(opener).toBeFocused();
    let mode="error";
    await page.route("**/api/operations/notifications?*",async route=>{
      if(mode==="error")return route.fulfill({status:503,json:{error:"Consulta de tentativas controlada indisponível."}});
      // A wrong page remains structurally valid for empty and populated databases.
      // Changing source alone also invalidates nonempty rows, reaching a different check.
      if(mode==="mismatch") {const result=await route.fetch();const body=await result.json();body.data.page+=1;return route.fulfill({response:result,json:body});}
      return route.continue();
    });
    const refresh=scope.getByRole("button",{name:"Atualizar tentativas",exact:true});
    const readFailure=page.getByRole("dialog",{name:"Não foi possível consultar as tentativas",exact:true});
    // WebKit does not focus a native button on pointer click on every platform.
    // Establish keyboard focus before testing its preservation across read failure.
    await refresh.focus();await expect(refresh).toBeFocused();await refresh.press("Enter");
    await expect(readFailure).toContainText("Consulta de tentativas controlada indisponível.");
    await readFailure.getByRole("button",{name:"Voltar",exact:true}).click();await expect(refresh).toBeFocused();
    await expect(scope).toContainText("Última consulta confirmada preservada");
    mode="mismatch";await refresh.click();await expect(readFailure).toContainText("As tentativas não correspondem à consulta atual. Consulte novamente.");
    await readFailure.getByRole("button",{name:"Voltar",exact:true}).click();
    await expect.poll(()=>scope.locator("li[data-technical-notification]").evaluateAll(nodes=>nodes.map(node=>node.getAttribute("data-technical-notification")))).toEqual(expected.data.map((row:{id:string})=>row.id));
    await expect(opener).toBeDisabled();
    await refresh.click();await expect(readFailure).toBeVisible();
    mode="live";await readFailure.getByRole("button",{name:"Consultar novamente",exact:true}).click();await expect(readFailure).toHaveCount(0);
    await scope.getByRole("combobox",{name:"Fonte das tentativas",exact:true}).selectOption("notices");
    const legacy=scope.locator("li[data-technical-notification]").first().getByRole("button");
    await legacy.click();
    const legacyDialog=page.getByRole("dialog",{name:/Aviso interno|WhatsApp|E-mail/});
    await expect(legacyDialog).toContainText("sem histórico individual completo");
    await legacyDialog.getByRole("button",{name:"Voltar às tentativas",exact:true}).click();
    expect(writes).toEqual([]);expect(sql("select jsonb_build_object('stock',(select count(*) from public.stock_movements),'science',(select count(*) from public.requisition_science_events),'notices',(select count(*) from public.requisition_notifications),'attempts',(select count(*) from private.web_push_attempts));")).toBe(before);
    await selectContext(page,f.patient);expect((await page.request.get("/api/operations/notifications?source=notices")).status()).toBe(403);
    await expect(scope).toHaveCount(0);
  } finally {
    await rpc(f.pro.client,"web_push_device_command",{p_id:device.id,p_action:"revoke"});
  }
});

test("E12-07 technical overview matches the L4 reference and keeps navigation read-only", async ({ page, browser }, info) => {
  test.setTimeout(900_000);
  const id = await fault(); await login(page); await openConsole(page);
  const business = () => sql("select jsonb_build_object('commands',(select count(*) from private.operations_commands),'stock',(select count(*) from public.stock_movements),'science',(select count(*) from public.requisition_science_events));");
  const before = business(), viewport = page.viewportSize(), writes: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/operations" && request.method() !== "GET") writes.push(request.method()); });
  const reference = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  try {
    await expect(page.getByRole("heading", { level: 1, name: "Central técnica", exact: true })).toHaveCount(1);
    await expect(page.getByRole("heading", { name: "Administração", exact: true })).toHaveCount(0);
    const navigation = page.getByRole("button", { name: "Outras áreas", exact: true });
    await navigation.click();
    await expect(page.getByRole("menuitem", { name: "Administração", exact: true })).toHaveAttribute("href", "/admin");
    await page.keyboard.press("Escape");
    await expect(navigation).toBeFocused();
    const model = await reference.newPage(); await model.route(/^https?:/, route => route.abort());
    await model.goto(pathToFileURL(resolve("hca-laboratorio-04-v2-aprovado.html")).href + "#E12-07/overview");
    const frame = model.locator("#device-frame"), scope = consoleRegion(page);
    const referenceWidth = model.getByRole("combobox", { name: "Visualização", exact: true });
    await referenceWidth.selectOption("360");
    await frame.getByLabel(/^Ambiente técnico/).selectOption("preview");
    await expect(frame.getByRole("heading", { name: "Central técnica", exact: true })).toBeVisible();
    const expected = ["Aplicação", "Banco", "Fila de avisos", "Emissão e assinatura", "Cópias de segurança", "Ensaios de recuperação"];
    for (const text of expected) {
      await expect(frame.getByRole("heading", { name: text, exact: true })).toBeVisible();
      await expect(scope.getByRole("heading", { name: text, exact: true })).toBeVisible();
    }
    for (const width of [320, 360, 390, 412, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await auditFromTop(page, "technical overview " + width);
      if (width === 360 || width === 412) {
        await referenceWidth.selectOption(String(width));
        const footer = scope.locator(".hca-technical-footer");
        const button = footer.getByRole("button", { name: "Atualizar monitoramento", exact: true });
        const footerBox = await footer.boundingBox(), buttonBox = await button.boundingBox();
        if (!footerBox || !buttonBox) throw new Error("O rodapé técnico ou o botão de atualização não foi exibido.");
        expect(buttonBox.width).toBeLessThan(footerBox.width);
        expect(Math.abs(buttonBox.x + buttonBox.width - footerBox.x - footerBox.width)).toBeLessThan(2);
        await info.attach("L4-central-" + width, { body: await frame.screenshot(), contentType: "image/png" });
        await info.attach("central-" + width, { body: await page.screenshot(), contentType: "image/png" });
      }
    }
    await page.bringToFront();
    if (viewport) await page.setViewportSize(viewport);
    const opener = scope.locator('[data-technical-incident="' + id + '"]').getByRole("button", { name: /^Investigar incidente/ });
    await opener.click();
    const dialog = page.getByRole("dialog", { name: "Integridade documental recusada", exact: true });
    await expect(dialog).toContainText(id);
    const reason = dialog.getByRole("combobox", { name: "Motivo do acompanhamento", exact: true });
    await reason.selectOption("waiting_dependency");
    await page.getByRole("button", { name: "Fechar edição", exact: true }).click();
    const exit = page.getByRole("dialog", { name: "Sair sem concluir?", exact: true });
    await exit.getByRole("button", { name: "Sair e descartar", exact: true }).click();
    await expect(dialog).toBeHidden(); await expect(opener).toBeFocused();
    await opener.click(); await expect(reason).toHaveValue("investigating");
    await page.getByRole("button", { name: "Fechar edição", exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(scope.getByRole("link", { name: /^Criar nova residência/ })).toHaveAttribute("href", "/preparar-residencia");
    await expect(scope.getByRole("link", { name: /^Consultar contas globais/ })).toHaveAttribute("href", "/admin?section=profiles");
    await scope.getByRole("tab", { name: "Continuidade", exact: true }).click();
    const guide = scope.getByRole("region", { name: "Roteiro de recuperação do serviço", exact: true });
    await expect(guide.getByRole("heading", { name: "Backup e recuperação", exact: true })).toBeVisible();
    await audit(page, "technical continuity");
    expect(writes).toEqual([]); expect(business()).toBe(before);
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

test("GUI04 roteiro liga cópia e ensaio reais, distingue falha e ambiente e nunca restaura pelo painel", async ({ page, browser }, info) => {
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
  await expect(guide).toContainText("Cópia e ensaio compatíveis");
  await expect(guide).toContainText(archiveId);
  await expect(guide).not.toContainText(manifestSha256);
  await expect(guide).toContainText("dependem da validação operacional de recuperação");
  await expect(guide.locator("input,select,textarea")).toHaveCount(0);
  await expect(guide.getByRole("button")).toHaveCount(2);
  const recordsButton = guide.getByRole("button", { name: /^Consultar os registros/ });
  const evidence = page.getByRole("dialog", { name: "Evidências de continuidade", exact: true });
  for (const width of [320, 360, 412, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 }); await auditFromTop(page, "GUI04 recovery " + width);
    if (width === 360 || width === 412) await info.attach("continuity-" + width, { body: await page.screenshot(), contentType: "image/png" });
  }
  await page.bringToFront(); await page.setViewportSize({ width: 390, height: 844 });
  const reference = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  try {
    const model = await reference.newPage(); await model.route(/^https?:/, route => route.abort());
    await model.goto(pathToFileURL(resolve("hca-laboratorio-04-v2-aprovado.html")).href + "#E12-08/compatible");
    const frame = model.locator("#device-frame");
    for (const width of [360, 412]) {
      await model.getByRole("combobox", { name: "Visualização", exact: true }).selectOption(String(width));
      await expect(frame.getByText("Cópia e ensaio compatíveis", { exact: true })).toBeVisible();
      await info.attach("L4-continuity-" + width, { body: await frame.screenshot(), contentType: "image/png" });
    }
  } finally { await reference.close(); }
  await page.bringToFront(); await recordsButton.click();
  await expect(evidence).toContainText(manifestSha256); await expect(evidence).toContainText("custódia do operador");
  await audit(page, "GUI04 evidence 390");
  await evidence.getByRole("button", { name: "Voltar", exact: true }).click(); await expect(recordsButton).toBeFocused();
  const policyButton = guide.getByRole("button", { name: /^Política de continuidade/ });
  await policyButton.click();
  const policy = page.getByRole("dialog", { name: "Política de continuidade", exact: true });
  await expect(policy).toContainText("7 cópias diárias e 4 semanais"); await expect(policy).toContainText("Até 8 horas");
  await policy.getByRole("button", { name: "Voltar", exact: true }).click(); await expect(policyButton).toBeFocused();
  const refresh = consoleRegion(page).getByRole("button", { name: "Atualizar monitoramento", exact: true });
  await record("recovery", "RECOVERY_PROBE_VERIFIED", { ...metrics, manifestSha256: "b".repeat(64) });
  await refresh.click(); await expect(guide).toContainText("Cópia e ensaio ainda não conciliados");
  await record("recovery", "RECOVERY_FAILURE", {}); await refresh.click();
  await expect(guide).toContainText("Ensaio de recuperação não confirmado");
  let mode = "error";
  await page.route("**/api/operations?*", async route => {
    if (mode === "error") return route.fulfill({ status: 503, json: { code: "DATABASE_UNAVAILABLE", error: "Consulta técnica GUI04 indisponível" } });
    if (mode === "wrong-scope") { const response = await route.fetch(); const body = await response.json(); body.data.environment = "preview"; return route.fulfill({ response, json: body }); }
    return route.continue();
  });
  const readFailure = page.getByRole("dialog", { name: "Não foi possível consultar o ambiente técnico", exact: true });
  await refresh.click(); await expect(readFailure).toContainText("Consulta técnica GUI04 indisponível");
  await readFailure.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(guide).toHaveCount(0); await expect(refresh).toBeFocused();
  mode = "wrong-scope"; await refresh.click(); await expect(readFailure).toContainText("Resposta técnica sem confirmação reconhecível");
  await readFailure.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(guide).toHaveCount(0); await expect(consoleRegion(page).getByRole("list", { name: "Componentes observados", exact: true })).toHaveCount(0);
  mode = "live"; await refresh.click(); await expect(guide).toBeVisible();
  await expect(guide).toContainText("Ensaio de recuperação não confirmado");
  await consoleRegion(page).getByRole("tab", { name: "Eventos e envios", exact: true }).click();
  const eventButton = consoleRegion(page).getByRole("region", { name: "Eventos recentes", exact: true }).getByRole("button", { name: /^Ensaio de recuperação não confirmado/ }).first();
  await eventButton.click();
  const event = page.getByRole("dialog", { name: "Ensaio de recuperação não confirmado", exact: true });
  await expect(event).toContainText("Desenvolvimento local"); await expect(event).toContainText("Correlação");
  await event.getByRole("button", { name: "Voltar aos eventos", exact: true }).click(); await expect(eventButton).toBeFocused();
  await consoleRegion(page).getByRole("tab", { name: "Continuidade", exact: true }).click();
  await consoleRegion(page).getByRole("combobox", { name: "Ambiente técnico", exact: true }).selectOption("preview");
  await expect(guide).toBeVisible(); await expect(guide).not.toContainText(archiveId);
  await recordsButton.click(); await expect(evidence).toContainText("Preview"); await expect(evidence).not.toContainText(manifestSha256);
  expect(writes).toEqual([]); expect(business()).toBe(before);
});

test("E12-07 recupera decisão sem reenviar o comando e exige nova revisão do incidente", async ({ page }) => {
  const id = await fault(); await login(page); await openConsole(page);
  const scope = consoleRegion(page), card = scope.locator('[data-technical-incident="' + id + '"]');
  const business = () => sql("select jsonb_build_object('docs',(select count(*) from public.operational_documents),'science',(select count(*) from public.requisition_science_events),'stock',(select count(*) from public.stock_movements));");
  const before = business(), packets: { action: string; idempotencyKey: string; reason?: string }[] = [];
  await page.route("**/api/operations", async route => {
    if (route.request().method() !== "POST") return route.continue();
    const packet = route.request().postDataJSON();
    packets.push(packet);
    if (packets.length === 1) {
      const response = await route.fetch(); expect(response.ok()).toBeTruthy();
      return route.abort("failed");
    }
    if (packets.length === 2) return route.fulfill({ status: 503, json: { code: "DATABASE_UNAVAILABLE", error: "Comprovante temporariamente indisponível" } });
    if (packet.action === "resolve" && packets.filter(value => value.action === "resolve").length === 1)
      expect(await fault()).toBe(id);
    return route.continue();
  });
  const open = card.getByRole("button", { name: /^Investigar incidente/ });
  const decision = page.getByRole("dialog", { name: "Integridade documental recusada", exact: true });
  const failure = page.getByRole("dialog", { name: "Resultado da decisão técnica a conferir", exact: true });
  const success = page.getByRole("dialog", { name: "Acompanhamento registrado", exact: true });
  await open.click();
  await decision.getByRole("button", { name: "Iniciar acompanhamento", exact: true }).click();
  await expect(failure).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Ambiente técnico", exact: true, includeHidden: true })).toBeDisabled();
  expect(sql(`select state from private.operations_incidents where id=${sqlLiteral(id)};`)).toBe("acknowledged");
  await failure.getByRole("button", { name: "Conferir resultado", exact: true }).click();
  await expect(failure).toContainText("Comprovante temporariamente indisponível");
  const metadata = await page.evaluate(() => {
    const key = Object.keys(sessionStorage).find(key => key.startsWith("hca:operations-intent:"));
    return key ? JSON.parse(sessionStorage.getItem(key) ?? "null") : null;
  });
  expect(metadata.attempts).toBe(1);
  expect(Object.keys(metadata).sort()).toEqual(["action", "attempts", "environment", "expectedActorId", "expectedVersion", "idempotencyKey", "incidentId"]);
  await page.reload();
  await scope.getByRole("button", { name: "Conferir decisão", exact: true }).click();
  await expect(success).toContainText("O comprovante da mesma decisão foi localizado.");
  await success.getByRole("button", { name: "Voltar à central técnica", exact: true }).click();
  await expect(card).toContainText("Em acompanhamento");
  expect(packets.slice(0, 3).map(packet => packet.action)).toEqual(["acknowledge", "recover", "recover"]);
  expect(packets.slice(0, 3).every(packet => packet.idempotencyKey === packets[0].idempotencyKey)).toBe(true);
  expect(packets.slice(1, 3).every(packet => packet.reason === undefined)).toBe(true);

  await open.click();
  await decision.getByRole("button", { name: /^Histórico do incidente/ }).click();
  const history = page.getByRole("region", { name: "Histórico técnico completo", exact: true });
  await expect(history.getByRole("heading", { name: "Acompanhamento iniciado", exact: true })).toHaveCount(1);
  await page.getByRole("button", { name: "Voltar ao incidente", exact: true }).click();
  await decision.getByRole("combobox", { name: "Motivo do encerramento", exact: true }).selectOption("reviewed_history");
  const confirm = page.getByRole("dialog", { name: "Encerrar este incidente?", exact: true });
  const confirmation = confirm.getByRole("button", { name: "Encerrar incidente", exact: true });
  await decision.getByRole("button", { name: "Encerrar incidente técnico", exact: true }).click();
  await confirmation.click();
  await decision.getByRole("button", { name: "Conferir atualização", exact: true }).click();
  const comparison = page.getByRole("dialog", { name: "Situação atual do incidente", exact: true });
  await expect(comparison).toContainText("Ocorrências atuais");
  await comparison.getByRole("button", { name: "Usar situação atual", exact: true }).click();
  await expect(decision.getByRole("combobox", { name: "Motivo do encerramento", exact: true })).toHaveValue("reviewed_history");
  await decision.getByRole("button", { name: "Encerrar incidente técnico", exact: true }).click();
  await confirmation.click();
  await page.getByRole("dialog", { name: "Incidente encerrado", exact: true }).getByRole("button", { name: "Voltar à central técnica", exact: true }).click();
  await expect(card).toHaveCount(0); expect(business()).toBe(before);
  await expect(scope.getByRole("button", { name: "Atualizar monitoramento", exact: true })).toBeFocused();
  await scope.getByRole("combobox", { name: "Incidentes", exact: true }).selectOption("resolved");
  await expect(card).toBeVisible();
});

test("E12-07 política exige confirmação e compara mudanças concorrentes antes de adotar", async ({ page }) => {
  await login(page); await openConsole(page, "operator");
  const global = await actor("global"), original = (await rpc(global, "operations_diagnostics", { p_environment: "operator" })).policy;
  try {
    const open = consoleRegion(page).getByRole("button", { name: /^Limites e severidades/ });
    await open.click();
    const drawer = page.getByRole("dialog", { name: "Limites e severidades", exact: true });
    const severity = drawer.getByLabel("Severidade padrão: Aplicação", { exact: true });
    await expect(severity).toBeHidden();
    await drawer.getByText("Severidade por componente", { exact: true }).filter({ visible: true }).click();
    await expect(severity).toBeVisible();
    const input = drawer.getByLabel("Processamento · atenção", { exact: true });
    await input.fill("124"); await input.press("Tab");
    await expect(drawer.getByLabel("Processamento · crítico", { exact: true })).toBeFocused();
    await drawer.getByRole("button", { name: "Revisar política", exact: true }).click();
    const confirm = page.getByRole("dialog", { name: "Aplicar esta política técnica?", exact: true });
    expect((await rpc(global, "operations_diagnostics", { p_environment: "operator" })).policy.version).toBe(original.version);
    await rpc(global, "operations_command", { p_environment: "operator", p_action: "configure", p_id: null, p_expected: original.version,
      p_payload: { policy: { jobWarningSeconds: 123, jobCriticalSeconds: original.values.jobCriticalSeconds + 1 } }, p_key: randomUUID() });
    const refusal = page.waitForResponse(response => new URL(response.url()).pathname === "/api/operations" && response.request().method() === "POST");
    await confirm.getByRole("button", { name: "Confirmar política", exact: true }).click();
    expect((await refusal).status()).toBe(409);
    await drawer.getByRole("button", { name: "Conferir atualização", exact: true }).click();
    const compare = page.getByRole("dialog", { name: "Política técnica atualizada", exact: true });
    await expect(compare).toContainText("Valor vigente");
    await expect(compare).toContainText("123"); await expect(compare).toContainText("124");
    await compare.getByRole("button", { name: "Usar versão vigente como referência", exact: true }).click();
    await expect(input).toHaveValue("124");
    await expect(drawer.getByLabel("Processamento · crítico", { exact: true })).toHaveValue(String(original.values.jobCriticalSeconds + 1));
    for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); await audit(page, "L4 technical policy " + width); }
    await page.bringToFront(); await page.setViewportSize({ width: 390, height: 844 });
    await drawer.getByRole("button", { name: "Revisar política", exact: true }).click();
    await confirm.getByRole("button", { name: "Confirmar política", exact: true }).click();
    await page.getByRole("dialog", { name: "Política técnica atualizada", exact: true }).getByRole("button", { name: "Voltar à central técnica", exact: true }).click();
    const current = (await rpc(global, "operations_diagnostics", { p_environment: "operator" })).policy;
    expect(current.version).toBe(original.version + 2); expect(current.values.jobWarningSeconds).toBe(124);
    expect(current.values.jobCriticalSeconds).toBe(original.values.jobCriticalSeconds + 1);
    await open.click();
    await drawer.getByRole("button", { name: /^Histórico das políticas/ }).click();
    await expect(page.getByRole("region", { name: "Histórico técnico completo", exact: true }).getByRole("heading", { name: "Política configurada", exact: true }).first()).toBeVisible();
  } finally {
    const current = (await rpc(global, "operations_diagnostics", { p_environment: "operator" })).policy;
    await rpc(global, "operations_command", { p_environment: "operator", p_action: "configure", p_id: null, p_expected: current.version, p_payload: { policy: original.values }, p_key: randomUUID() });
  }
});

test("OPS3 leitura distingue falha e resposta inválida, conserva referência anterior e recusa suporte no perfil local", async ({ page }) => {
  await login(page); await openConsole(page);
  let mode = "error";
  await page.route("**/api/operations?*", route => mode === "error" ? route.fulfill({ status: 503, json: { code: "DATABASE_UNAVAILABLE", error: "Consulta técnica controlada indisponível" } }) : mode === "invalid" ? route.fulfill({ status: 200, json: { data: {} } }) : route.continue());
  const failure = page.getByRole("dialog", { name: "Não foi possível consultar o ambiente técnico", exact: true });
  await consoleRegion(page).getByRole("button", { name: "Atualizar monitoramento", exact: true }).click();
  await expect(failure).toContainText("Consulta técnica controlada indisponível");
  await failure.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(consoleRegion(page)).toContainText("A última consulta deste ambiente continua disponível.");
  mode = "invalid"; await consoleRegion(page).getByRole("button", { name: "Atualizar monitoramento", exact: true }).click();
  await expect(failure).toContainText("Resposta técnica sem confirmação reconhecível");
  await failure.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(consoleRegion(page).getByRole("list", { name: "Componentes observados", exact: true })).toHaveCount(0);
  mode = "live"; await consoleRegion(page).getByRole("button", { name: "Atualizar monitoramento", exact: true }).click();
  await expect(consoleRegion(page).getByRole("list", { name: "Componentes observados", exact: true })).toBeVisible();
  const f = await setup(); owned.add(f.patient); await page.reload(); await selectContext(page, f.patient);
  await expect(consoleRegion(page)).toHaveCount(0);
  const response = await page.request.get("/api/operations?environment=preview"); expect(response.status()).toBe(403);
  await page.goto("/admin?careRecipientId=" + f.patient);
  await expect(page.getByRole("navigation", { name: "Áreas administrativas", exact: true }).getByRole("link", { name: /Central técnica/ })).toHaveCount(0);
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
