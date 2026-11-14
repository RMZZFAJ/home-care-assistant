import { selectDocumentSection } from "./document-sections";
import { expect, test, type Page } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { actor, env, fixtures, rpc, setup } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { pauseLocalAutomationForTests, sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { attachmentMaxBytes } from "../../src/lib/documents/attachment-attempt";
import { audit, auditFromTop } from "./accessibility-audit";

test.setTimeout(150000);
const owned = new Set<string>();
let automation: { id: number; name: string; active: boolean }[] = [];
test.beforeAll(() => { automation = JSON.parse(sql("select coalesce(jsonb_agg(jsonb_build_object('id',jobid,'name',jobname,'active',active)),'[]') from cron.job where jobname in ('hca-operational-lifecycle','hca-notification-worker')")); pauseLocalAutomationForTests(); });
test.afterAll(() => { for (const job of automation) sql(`select cron.alter_job(jobid,active=>${job.active}) from cron.job where jobid=${job.id} and jobname=${q(job.name)}`); });
test.afterEach(async ({ page }) => { await page.unrouteAll({ behavior: "wait" }); if (owned.size) sql(`update public.care_recipients set is_active=false where id=any(array[${[...owned].map(q).join(",")}]::uuid[])`); owned.clear(); });
const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const rows = (id: string) => JSON.parse(sql(`select coalesce(jsonb_agg(to_jsonb(a) order by created_at),'[]') from public.attachments a where document_id=${q(id)}`));
const facts = (id: string) => sql(`select jsonb_build_object('document',(select jsonb_build_object('status',status,'payload',payload,'workflow',workflow_data) from public.operational_documents where id=${q(id)}),'ledger',(select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]') from public.stock_movements m where care_recipient_id=(select care_recipient_id from public.operational_documents where id=${q(id)})),'science',(select count(*) from public.requisition_science_events where requisition_id=${q(id)}))`);
async function fixture(page: Page) {
  const f = await setup(); owned.add(f.patient); const owner = await actor("family", f.patient);
  const doc = await rpc(owner, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity: "1" }] }, p_key: randomUUID(), p_draft: false });
  await page.goto("/login"); await page.getByLabel("E-mail", { exact: true }).fill(fixtures.family.email); await page.getByLabel("Senha", { exact: true }).fill(fixturePassword); await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible(); await selectContext(page, f.patient);
  await page.goto(`/historico/${doc.id}`);
  await selectDocumentSection(page, "attachments"); await page.getByRole("button", { name: "Adicionar anexo", exact: true }).click(); await expect(page.getByText("Nenhum anexo registrado.", { exact: true })).toBeVisible();
  const source = await sharp({ create: { width: 8, height: 4, channels: 3, background: "#123456" } }).png().toBuffer();
  return { ...f, owner, doc, source, file: { name: "ficha-fisica.png", mimeType: "image/png", buffer: source } };
}
const picker = (page: Page) => page.getByLabel("Adicionar foto ou PDF", { exact: true });
const submit = (page: Page) => page.getByRole("button", { name: /^(Enviar anexo|Recuperar envio do anexo)$/ });
function postKey(body: Buffer | null) { const key = body?.toString("latin1").match(/name="idempotencyKey"\r?\n\r?\n([a-f0-9-]{36})/)?.[1]; expect(key).toBeTruthy(); return key!; }
async function loseConfirmedResponse(page: Page, target: "upload" | "prepareAndAbandon") {
  // Keep the native browser multipart request. WebKit's intercepted request
  // replay can omit file bodies; the fault belongs after the real commit.
  await page.evaluate(target => {
    const nativeFetch = window.fetch.bind(window); let lost = false, abandonLost = false;
    window.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href), method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
      const response = await nativeFetch(input, init);
      if (url.pathname !== "/api/attachments") return response;
      const chosen = method === "POST" && (target === "upload" ? !url.searchParams.has("prepare") : url.searchParams.get("prepare") === "1");
      if (chosen && !lost && response.ok) {
        const body = await response.json(); document.documentElement.dataset.attachmentFaultUpstream = `${response.status}:${body.persistence}`; lost = true;
        return new Response(target === "upload" ? "{" : "{}", { status: response.status, headers: { "content-type": "application/json" } });
      }
      if (target === "prepareAndAbandon" && method === "PATCH" && typeof init?.body === "string" && JSON.parse(init.body).action === "abandon" && !abandonLost && response.ok) {
        const body = await response.json(); document.documentElement.dataset.attachmentAbandonUpstream = `${response.status}:${body.persistence}`; abandonLost = true;
        return new Response("{}", { status: response.status, headers: { "content-type": "application/json" } });
      }
      return response;
    };
  }, target);
}

test("C-FINAL023 anexos ocultam lista recusada e recuperam leitura sem perder arquivo escolhido", async ({ page }) => {
  const f = await fixture(page);
  await picker(page).setInputFiles(f.file); await submit(page).click();
  const link = page.getByRole("link", { name: f.file.name, exact: true });
  await expect(link).toBeVisible(); await page.getByRole("button",{name:"Adicionar anexo",exact:true}).click(); await expect(picker(page)).toBeEnabled();
  const pending = { ...f.file, name: "nova-foto-ainda-nao-enviada.png" };
  await picker(page).setInputFiles(pending); await page.getByRole("button",{name:"Fechar diálogo",exact:true}).click();
  const original = rows(f.doc.id), official = facts(f.doc.id);
  let writes = 0;
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/attachments" && request.method() !== "GET") writes++; });
  const refresh = page.getByRole("button", { name: "Atualizar anexos", exact: true });
  for (const fault of [503, 403, 200]) {
    await page.route("**/api/attachments?**", route => route.fulfill({ status: fault, contentType: "application/json", body: JSON.stringify(fault === 200 ? { data: [{}] } : { error: "Consulta fictícia de anexos indisponível", code: "READ_UNAVAILABLE" }) }), { times: 1 });
    await refresh.focus(); await refresh.press("Enter");
    await expect(page.getByRole("alert").filter({ hasText: /Consulta fictícia de anexos indisponível|A resposta da consulta não pôde ser conferida/ })).toBeVisible();
    await expect(link).toHaveCount(0);
    await expect(page.locator('[aria-invalid="true"]')).toHaveCount(0);
    expect(await picker(page).evaluate(element => (element as HTMLInputElement).files?.[0]?.name)).toBe(pending.name);
    await expect(refresh).toBeFocused(); await refresh.press("Enter");
    await expect(link).toBeVisible(); await expect(picker(page)).toBeEnabled(); await expect(refresh).toBeFocused();
  }
  expect(writes).toBe(0); expect(rows(f.doc.id)).toEqual(original); expect(facts(f.doc.id)).toBe(official);
  for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); /* Audit the resized composition from its start, without retained scroll clipping. */ await page.evaluate(() => window.scrollTo(0, 0)); await audit(page, "immutable attachment read " + width); }
});

test("anexo confirmado com resposta perdida congela escolha e GET recupera o mesmo arquivo sem outro upload", async ({ page }, info) => {
  const f = await fixture(page), before = facts(f.doc.id); let uploadPosts = 0;
  page.on("request", request => { const url = new URL(request.url()); if (url.pathname === "/api/attachments" && request.method() === "POST" && !url.searchParams.has("prepare")) uploadPosts++; });
  await loseConfirmedResponse(page, "upload");
  await picker(page).setInputFiles(f.file); await submit(page).click(); await expect(picker(page)).toBeDisabled();
  await expect(page.getByRole("button", { name: "Recuperar envio do anexo", exact: true })).toBeEnabled();
  await page.getByRole("button",{name:"Fechar diálogo",exact:true}).click(); await expect(page.getByRole("link", { name: f.file.name, exact: true })).toBeVisible();
  await page.getByRole("button",{name:"Recuperar envio do anexo",exact:true}).click();
  expect(await page.evaluate(() => document.documentElement.dataset.attachmentFaultUpstream)).toBe("201:confirmed");
  const [stored] = rows(f.doc.id); expect(stored.state).toBe("ready"); expect(rows(f.doc.id)).toHaveLength(1);
  const different = await sharp({ create: { width: 8, height: 4, channels: 3, background: "#abcdef" } }).png().toBuffer();
  const rejected = await page.request.post("/api/attachments", { headers: { origin: new URL(page.url()).origin }, multipart: { careRecipientId: f.patient, documentId: f.doc.id, idempotencyKey: stored.upload_key, file: { ...f.file, buffer: different } } });
  expect(rejected.status()).toBe(409);
  for (const status of [503, 403]) {
    await page.route("**/api/attachments?**attemptKey=**", route => route.fulfill({ status, contentType: "application/json", body: JSON.stringify({ error: "Consulta fictícia da tentativa indisponível", code: "READ_UNAVAILABLE" }) }), { times: 1 });
    await submit(page).focus(); await submit(page).press("Enter");
    await expect(page.getByRole("alert").filter({ hasText: "Consulta fictícia da tentativa indisponível" })).toBeVisible();
    await expect(picker(page)).toBeDisabled(); await expect(picker(page)).toHaveAttribute("aria-invalid", "false");
    await expect(submit(page)).toBeFocused(); expect(uploadPosts).toBe(1); expect(rows(f.doc.id)).toHaveLength(1);
  }
  await page.getByRole("button", { name: "Recuperar envio do anexo", exact: true }).click(); await expect(picker(page)).toBeEnabled();
  expect(uploadPosts).toBe(1); expect(rows(f.doc.id)).toHaveLength(1); expect(rows(f.doc.id)[0].sha256).toBe(stored.sha256); expect(facts(f.doc.id)).toBe(before);
  const link = page.getByRole("link", { name: f.file.name, exact: true }), download = await page.request.get((await link.getAttribute("href"))!); expect(download.ok()).toBeTruthy(); expect(digest(await download.body())).toBe(stored.sha256);
  await page.getByText("Origem e conversão do arquivo", { exact: true }).click(); await expect(page.getByText(`SHA-256 do original:`, { exact: false })).toContainText(digest(f.source));
  for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 1000 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true); await page.screenshot({ path: `output/phase-d-work/attachment-layout-${info.project.name}-${width}.png`, fullPage: true }); }
});

test("perda antes da reserva conserva arquivo e chave e permite concluir a mesma intenção", async ({ page }) => {
  const f = await fixture(page); const keys: string[] = []; let failed = false;
  await page.route("**/api/attachments**", async route => {
    if (route.request().method() === "POST") {
      keys.push(postKey(route.request().postDataBuffer()));
      if (!failed) { failed = true; await route.abort("failed"); return; }
    }
    await route.continue();
  });
  await picker(page).setInputFiles(f.file); await submit(page).click(); await expect(page.getByRole("button", { name: "Recuperar envio do anexo", exact: true })).toBeEnabled();
  expect(rows(f.doc.id)).toHaveLength(0); await expect(picker(page)).toBeDisabled();
  await submit(page).click(); await expect(page.getByRole("link", { name: f.file.name, exact: true })).toBeVisible(); await expect(picker(page)).toBeEnabled();
  expect(new Set(keys).size).toBe(1); expect(rows(f.doc.id)).toHaveLength(1); expect(rows(f.doc.id)[0].state).toBe("ready");
});

test("reserva preparada permite abandono explícito recuperável sem apagar história ou criar ato operacional", async ({ page }, info) => {
  const f = await fixture(page), before = facts(f.doc.id), version = sql(`select version from public.operational_documents where id=${q(f.doc.id)}`);
  await loseConfirmedResponse(page, "prepareAndAbandon");
  await picker(page).setInputFiles(f.file); await submit(page).click(); await page.getByRole("button",{name:"Fechar diálogo",exact:true}).click(); const abandonButton = page.getByRole("button", { name: "Abandonar tentativa incompleta", exact: true }); await expect(abandonButton).toBeVisible();
  await abandonButton.click(); const dialog=page.getByRole("dialog",{name:"Abandonar tentativa incompleta",exact:true});
  for(const width of [320,390,768,1024,1440]){await page.setViewportSize({width,height:1100});await auditFromTop(page,"abandon reservation modal "+width);expect(await dialog.evaluate(n=>{const r=n.getBoundingClientRect();return r.top>=0&&r.left>=0&&r.bottom<=innerHeight&&r.right<=innerWidth;})).toBe(true);if(width===320)await dialog.screenshot({path:info.outputPath("abandon-modal-320.png"),animations:"disabled"});}
  await page.keyboard.press("Escape");await expect(dialog).toHaveCount(0);await expect(abandonButton).toBeFocused();await abandonButton.press("Enter");
  await page.getByRole("button", { name: "Voltar sem abandonar", exact: true }).click();await expect(abandonButton).toBeFocused();expect(rows(f.doc.id)[0].state).toBe("quarantine");await expect(picker(page)).toBeDisabled();
  await abandonButton.click(); await page.getByRole("button", { name: "Confirmar abandono desta tentativa", exact: true }).click(); await expect(page.getByText(/O abandono não pôde ser confirmado/)).toBeVisible(); expect(rows(f.doc.id)[0].state).toBe("abandoned"); await expect(picker(page)).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.dataset.attachmentFaultUpstream)).toBe("200:prepared"); expect(await page.evaluate(() => document.documentElement.dataset.attachmentAbandonUpstream)).toBe("200:abandoned");
  await page.getByRole("button", { name: "Confirmar abandono desta tentativa", exact: true }).click(); await expect(picker(page)).toBeEnabled();
  await expect(page.getByRole("button",{name:"Atualizar anexos",exact:true})).toBeFocused();
  const [abandoned] = rows(f.doc.id); expect(sql(`select count(*) from public.audit_events where action='attachment.abandoned' and entity_id=${q(abandoned.id)}`)).toBe("1"); expect(sql(`select version from public.operational_documents where id=${q(f.doc.id)}`)).toBe(version); expect(facts(f.doc.id)).toBe(before);
  await page.getByRole("button",{name:"Adicionar anexo",exact:true}).click(); await picker(page).setInputFiles({ ...f.file, name: "nova-ficha.png" }); await submit(page).click(); await expect(page.getByRole("link", { name: "nova-ficha.png", exact: true })).toBeVisible(); expect(rows(f.doc.id)).toHaveLength(2); expect(rows(f.doc.id).filter((row: { state: string }) => row.state === "ready")).toHaveLength(1);
});

test("abandon dialog clears server metadata after native membership denial without abandoning the reservation", async ({page})=>{
  const f=await fixture(page),before=facts(f.doc.id);await loseConfirmedResponse(page,"prepareAndAbandon");
  await picker(page).setInputFiles(f.file);await submit(page).click();await page.getByRole("button",{name:"Fechar diálogo",exact:true}).click();await page.getByRole("button",{name:"Abandonar tentativa incompleta",exact:true}).click();
  const dialog=page.getByRole("dialog",{name:"Abandonar tentativa incompleta",exact:true});await expect(dialog).toContainText(f.file.name);
  await page.route("**/api/attachments",async route=>{if(route.request().method()==="PATCH")sql("update public.care_recipient_memberships set status='revoked' where care_recipient_id="+q(f.patient)+" and user_id="+q(fixtures.family.id));await route.continue();});
  const denied=page.waitForResponse(r=>new URL(r.url()).pathname==="/api/attachments"&&r.request().method()==="PATCH");await dialog.getByRole("button",{name:"Confirmar abandono desta tentativa",exact:true}).click();expect([403,404]).toContain((await denied).status());
  await expect(dialog).toHaveCount(0);await expect(page.locator(".doc-file-title")).toHaveCount(0);expect(rows(f.doc.id)).toHaveLength(1);expect(rows(f.doc.id)[0].state).toBe("quarantine");expect(facts(f.doc.id)).toBe(before);
  expect(sql("select count(*) from public.audit_events where action='attachment.abandoned' and entity_id="+q(rows(f.doc.id)[0].id))).toBe("0");
});

test("PDF com ressalva é recusado com explicação e limite4MB é verificado antes de enviar", async ({ page }) => {
  const f = await fixture(page); let posts = 0;
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/attachments" && request.method() === "POST") posts++; });
  const annotated = await readFile("docs/audits/B/B6/2026-10-30-phase-b6-documents/evidence/attachments/annotation-source.pdf");
  await picker(page).setInputFiles({ name: "ficha-com-ressalva.pdf", mimeType: "application/pdf", buffer: annotated }); await submit(page).click(); await expect(page.getByText(/Este PDF contém anotações ou campos/)).toBeVisible(); await expect(picker(page)).toBeEnabled(); expect(rows(f.doc.id)).toHaveLength(0);
  expect(await picker(page).evaluate((element: HTMLInputElement) => element.files?.[0]?.name)).toBe("ficha-com-ressalva.pdf");
  const sent = posts; await picker(page).setInputFiles({ ...f.file, buffer: Buffer.alloc(attachmentMaxBytes + 1) }); await submit(page).click(); await expect(page.getByText("Selecione um arquivo de até 4 MB.", { exact: true })).toBeVisible(); await expect(picker(page)).toBeFocused(); await expect(picker(page)).toHaveAttribute("aria-invalid", "true"); expect(posts).toBe(sent); expect(rows(f.doc.id)).toHaveLength(0);
  const oversized = await page.request.post("/api/attachments?prepare=1", { headers: { origin: new URL(page.url()).origin }, multipart: { careRecipientId: f.patient, documentId: f.doc.id, idempotencyKey: randomUUID(), file: { ...f.file, buffer: Buffer.alloc(attachmentMaxBytes + 1) } } }); expect(oversized.status()).toBe(413); expect(rows(f.doc.id)).toHaveLength(0);
});

test("upload concluído no Storage é recuperado após recarga sem arquivo local e vinculado uma única vez", async ({ page }) => {
  const f = await fixture(page), before = facts(f.doc.id), key = randomUUID(), token = randomUUID(), worker = createClient(env.url, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const bytes = await sharp(f.source).rotate().resize(4096, 4096, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer(), hash = digest(bytes);
  const a = await rpc(f.owner, "prepare_attachment_attempt", { p_patient: f.patient, p_document: f.doc.id, p_movement: null, p_filename: f.file.name, p_mime: "image/jpeg", p_bytes: bytes.length, p_key: key, p_source_hash: digest(f.source), p_source_bytes: f.source.length, p_source_mime: "image/png", p_hash: hash, p_transformation: "image-normalized-v1" });
  await rpc(worker, "attest_attachment_source", { p_id: a.id, p_actor: fixtures.family.id, p_source_hash: digest(f.source), p_source_bytes: f.source.length, p_source_mime: "image/png", p_hash: hash, p_transformation: "image-normalized-v1" });
  await rpc(f.owner, "begin_attachment_upload", { p_id: a.id, p_source_hash: digest(f.source), p_hash: hash, p_token: token }); const result = await f.owner.storage.from("patient-evidence").upload(a.object_path, bytes, { contentType: "image/jpeg", upsert: false }); expect(result.error).toBeNull();
  await page.reload(); await expect(page.getByText("Resultado do envio pendente", { exact: false })).toBeVisible();
  await expect(picker(page)).toBeDisabled(); await expect(page.getByRole("button",{name:"Adicionar anexo",exact:true})).toBeDisabled();
  await expect(page.getByRole("button", { name: "Abandonar tentativa incompleta", exact: true })).toHaveCount(0); await page.getByRole("button", { name: "Consultar e recuperar tentativa", exact: true }).click(); await expect(page.getByRole("link", { name: f.file.name, exact: true })).toBeVisible();
  await expect(picker(page)).toBeEnabled();
  expect(rows(f.doc.id)).toHaveLength(1); expect(rows(f.doc.id)[0].sha256).toBe(hash); expect(sql(`select count(*) from public.document_events where document_id=${q(f.doc.id)} and action='attachment.bound' and body->'event'->>'attachmentId'=${q(a.id)}`)).toBe("1"); expect(facts(f.doc.id)).toBe(before);
});

test("retomada após recarga confere o original e a recuperação recusa bytes divergentes do Storage", async ({ page }) => {
  const f = await fixture(page), before = facts(f.doc.id), worker = createClient(env.url, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const bytes = await sharp(f.source).rotate().resize(4096, 4096, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer(), hash = digest(bytes);
  async function prepare(key: string, filename: string) {
    const a = await rpc(f.owner, "prepare_attachment_attempt", { p_patient: f.patient, p_document: f.doc.id, p_movement: null, p_filename: filename, p_mime: "image/jpeg", p_bytes: bytes.length, p_key: key, p_source_hash: digest(f.source), p_source_bytes: f.source.length, p_source_mime: "image/png", p_hash: hash, p_transformation: "image-normalized-v1" });
    await rpc(worker, "attest_attachment_source", { p_id: a.id, p_actor: fixtures.family.id, p_source_hash: digest(f.source), p_source_bytes: f.source.length, p_source_mime: "image/png", p_hash: hash, p_transformation: "image-normalized-v1" }); return a;
  }
  const key = randomUUID(), a = await prepare(key, f.file.name);
  await page.reload(); await expect(picker(page)).toBeDisabled();
  await page.getByRole("button", { name: "Retomar envio", exact: true }).click(); const originalPicker = page.getByLabel("Arquivo original para retomar", { exact: true });
  await originalPicker.setInputFiles({ ...f.file, buffer: Buffer.from("outros bytes") }); await expect(page.getByText(/Este arquivo não corresponde ao original/)).toBeVisible(); expect(rows(f.doc.id)).toHaveLength(1); expect(rows(f.doc.id)[0].state).toBe("quarantine");
  await originalPicker.setInputFiles({ ...f.file, name: "copia-renomeada.dat", mimeType: "application/octet-stream" }); await expect(page.getByRole("link", { name: f.file.name, exact: true })).toBeVisible(); expect(rows(f.doc.id)).toHaveLength(1); expect(rows(f.doc.id)[0].id).toBe(a.id); expect(rows(f.doc.id)[0].upload_key).toBe(key);
  const corrupted = await prepare(randomUUID(), "divergencia-ficticia.png");
  await rpc(f.owner, "begin_attachment_upload", { p_id: corrupted.id, p_source_hash: digest(f.source), p_hash: hash, p_token: randomUUID() }); const inserted = await f.owner.storage.from("patient-evidence").upload(corrupted.object_path, Buffer.from("bytes divergentes controlados"), { contentType: "image/jpeg", upsert: false }); expect(inserted.error).toBeNull();
  await page.getByRole("button", { name: "Atualizar anexos", exact: true }).click(); await page.getByRole("button", { name: "Consultar e recuperar tentativa", exact: true }).click(); await expect(page.getByText(/O arquivo encontrado diverge desta tentativa/)).toBeVisible();
  expect(rows(f.doc.id).find((row: { id: string }) => row.id === corrupted.id).state).toBe("quarantine"); expect(sql(`select count(*) from public.document_events where document_id=${q(f.doc.id)} and action='attachment.bound' and body->'event'->>'attachmentId'=${q(corrupted.id)}`)).toBe("0"); expect(rows(f.doc.id).filter((row: { state: string }) => row.state === "ready")).toHaveLength(1); expect(facts(f.doc.id)).toBe(before);
});

test("timeout nativo30s depois do commit conserva a intenção e recupera ready sem novo upload", async ({ page }) => {
  const f = await fixture(page), before = facts(f.doc.id); let uploads = 0;
  page.on("request", request => { const url = new URL(request.url()); if (url.pathname === "/api/attachments" && request.method() === "POST" && !url.searchParams.has("prepare")) uploads++; });
  await page.evaluate(() => {
    const nativeFetch = window.fetch.bind(window); let held = false;
    window.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href), response = await nativeFetch(input, init);
      if (!held && url.pathname === "/api/attachments" && init?.method === "POST" && !url.searchParams.has("prepare") && response.ok) {
        held = true; const body = await response.json(); document.documentElement.dataset.attachmentTimeoutUpstream = `${response.status}:${body.persistence}`;
        return new Promise<Response>((_resolve, reject) => { const signal = init.signal; if (!signal) { reject(new Error("Timeout fixture requires the native request signal")); return; } const fail = () => reject(signal.reason); if (signal.aborted) fail(); else signal.addEventListener("abort", fail, { once: true }); });
      }
      return response;
    };
  });
  await picker(page).setInputFiles(f.file); const started = Date.now(); await submit(page).click();
  await expect(page.getByRole("button", { name: "Recuperar envio do anexo", exact: true })).toBeEnabled({ timeout: 45000 });
  expect(Date.now() - started).toBeGreaterThanOrEqual(29_000); expect(await page.evaluate(() => document.documentElement.dataset.attachmentTimeoutUpstream)).toBe("201:confirmed");
  await expect(page.getByText("Não foi possível confirmar o envio. Recupere a mesma tentativa para consultar o resultado.", { exact: true })).toBeVisible(); await expect(picker(page)).toBeDisabled();
  const [stored] = rows(f.doc.id); expect(stored.state).toBe("ready"); await submit(page).click(); await expect(picker(page)).toBeEnabled();
  expect(uploads).toBe(1); expect(rows(f.doc.id)).toHaveLength(1); expect(rows(f.doc.id)[0].sha256).toBe(stored.sha256); expect(facts(f.doc.id)).toBe(before);
  const link = page.getByRole("link", { name: f.file.name, exact: true }), downloaded = await page.request.get((await link.getAttribute("href"))!); expect(downloaded.ok()).toBeTruthy(); expect(digest(await downloaded.body())).toBe(stored.sha256);
});
