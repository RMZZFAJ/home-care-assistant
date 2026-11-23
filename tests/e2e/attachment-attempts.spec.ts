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
const submit = (page: Page) => page.getByRole("button", { name: /^(Enviar anexo|Conferir envio|Tentar novamente)$/ });
const add = (page: Page) => page.getByRole("button", { name: "Adicionar anexo", exact: true });
const close = (page: Page) => page.getByRole("button", { name: "Fechar diálogo", exact: true });
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

test("anexos ocultam lista recusada e cada nova abertura começa com uma seleção vazia", async ({ page }, info) => {
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
  const supportReference = randomUUID();
  const faultBody = { error: "Consulta fictícia de anexos indisponível", code: "READ_UNAVAILABLE", correlationId: supportReference };
  for (const fault of [503, 403, 200]) {
    await page.route("**/api/attachments?**", route => route.fulfill({ status: fault, json: fault === 200 ? { data: [{}] } : faultBody }), { times: 1 });
    await refresh.focus(); await refresh.press("Enter");
    const failure = page.getByRole("dialog", { name: fault === 403 ? "Acesso indisponível" : "Não foi possível consultar os anexos", exact: true });
    const message = /Consulta fictícia de anexos indisponível|A resposta da consulta não pôde ser conferida/;
    await expect(failure).toBeVisible();
    await expect(failure).toContainText(message);
    await expect(page.locator("a").filter({ hasText: f.file.name })).toHaveCount(0);
    if (fault === 503) {
      for (const width of [360, 412]) {
        await page.setViewportSize({ width, height: 860 });
        await audit(page, "falha na consulta dos anexos em " + width);
        const path = info.outputPath(`anexos-falha-${width}.png`);
        await failure.screenshot({ path, scale: "css", animations: "disabled" });
        await info.attach(`anexos-falha-${width}`, { path, contentType: "image/png" });
      }
      await failure.getByRole("button", { name: "Consultar novamente", exact: true }).click();
    } else {
      await failure.getByRole("button", { name: "Voltar aos arquivos", exact: true }).click();
      await expect(page.getByRole("alert").filter({ hasText: message })).toBeVisible();
      await expect(page.locator('[aria-invalid="true"]')).toHaveCount(0);
      await expect(picker(page)).toHaveCount(0);
      await expect(refresh).toBeFocused(); await refresh.press("Enter");
    }
    await expect(link).toBeVisible(); await expect(add(page)).toBeEnabled(); await expect(refresh).toBeFocused();
  }

  await page.route("**/api/attachments?**", route => route.fulfill({ status: 503, json: faultBody }), { times: 3 });
  await refresh.click();
  const exhausted = page.getByRole("dialog", { name: "Não foi possível consultar os anexos", exact: true });
  const retry = exhausted.getByRole("button", { name: "Consultar novamente", exact: true });
  await expect(exhausted).toBeVisible();
  for (let attempts = 1; attempts <= 2; attempts++) {
    const rejected = page.waitForResponse(response => new URL(response.url()).pathname === "/api/attachments" && response.status() === 503);
    await retry.click();
    await rejected;
  }
  await expect(retry).toHaveCount(0);
  await expect(exhausted.locator("footer").getByRole("button", { name: "Copiar detalhes", exact: true })).toBeVisible();
  await exhausted.locator("summary").click();
  await expect(exhausted.locator("pre")).toContainText(supportReference);
  await expect(exhausted.locator("pre")).toContainText("Tentativas de consulta: 2");
  await exhausted.getByRole("button", { name: "Voltar aos arquivos", exact: true }).click();
  await expect(refresh).toBeFocused();
  await refresh.press("Enter");
  await expect(link).toBeVisible();
  expect(writes).toBe(0); expect(rows(f.doc.id)).toEqual(original); expect(facts(f.doc.id)).toBe(official);
  await add(page).click();
  expect(await picker(page).evaluate(element => (element as HTMLInputElement).files?.length)).toBe(0);
  await close(page).click();
  for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); /* Audit the resized composition from its start, without retained scroll clipping. */ await page.evaluate(() => window.scrollTo(0, 0)); await audit(page, "immutable attachment read " + width); }
});

test("anexo confirmado com resposta perdida congela escolha e GET recupera o mesmo arquivo sem outro upload", async ({ page }, info) => {
  const f = await fixture(page), before = facts(f.doc.id); let uploadPosts = 0;
  f.file.name = "ficha física março.png";
  page.on("request", request => { const url = new URL(request.url()); if (url.pathname === "/api/attachments" && request.method() === "POST" && !url.searchParams.has("prepare")) uploadPosts++; });
  await loseConfirmedResponse(page, "upload");
  await picker(page).setInputFiles(f.file); await submit(page).click(); await expect(picker(page)).toBeDisabled();
  await expect(page.getByRole("button", { name: "Conferir envio", exact: true })).toBeEnabled();
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
  await submit(page).click(); await expect(picker(page)).toHaveCount(0);
  expect(uploadPosts).toBe(1); expect(rows(f.doc.id)).toHaveLength(1); expect(rows(f.doc.id)[0].sha256).toBe(stored.sha256); expect(facts(f.doc.id)).toBe(before);
  const card = page.locator(`[data-file-id="${stored.id}"]`);
  const author = sql(`select full_name from public.profiles where id=${q(stored.uploaded_by)}`);
  await expect(card.getByText(`Adicionado por ${author}`, { exact: false })).toBeVisible();
  expect(Date.parse((await card.locator("time").getAttribute("datetime"))!)).toBe(Date.parse(stored.confirmed_at));
  const view = (await card.getByRole("link", { name: `Visualizar ${f.file.name}`, exact: true }).getAttribute("href"))!;
  expect(await card.getByRole("link", { name: f.file.name, exact: true }).getAttribute("href")).toBe(view);
  const opened = await page.request.get(view);
  expect(opened.ok()).toBe(true);
  expect(digest(await opened.body())).toBe(stored.sha256);
  const download = (await card.getByRole("link", { name: `Baixar ${f.file.name}`, exact: true }).getAttribute("href"))!;
  const downloadRedirect = await page.request.get(download, { maxRedirects: 0 });
  expect(downloadRedirect.status()).toBe(307);
  const downloadLocation = new URL(downloadRedirect.headers().location);
  expect(downloadLocation.searchParams.get("download")).toBe("ficha física março.jpg");
  const downloaded = await page.request.get(downloadLocation.href);
  expect(downloaded.ok()).toBe(true);
  expect(downloaded.headers()["content-disposition"]).toMatch(/^attachment;/i);
  expect(digest(await downloaded.body())).toBe(stored.sha256);
  const other = await rpc(f.owner, "create_supply_document", { p_patient: f.patient, p_type: "COM",
    p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity: "1" }] }, p_key: randomUUID(), p_draft: false });
  const mismatched = new URL(view, page.url());
  mismatched.searchParams.set("documentId", other.id);
  const refused = await page.request.get(mismatched.href, { maxRedirects: 0 });
  expect(refused.status()).toBe(404);
  expect(refused.headers().location).toBeUndefined();
  const details = card.getByRole("button", { name: `Detalhes do anexo ${f.file.name}`, exact: true });
  await details.click();
  const drawer = page.getByRole("dialog", { name: "Detalhes do anexo", exact: true });
  await drawer.getByText("Origem e conversão do arquivo", { exact: true }).click();
  await expect(drawer.getByText(`SHA-256 do original:`, { exact: false })).toContainText(digest(f.source));
  for (const width of [360, 412]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(drawer.getByRole("button", { name: "Voltar aos arquivos", exact: true })).toBeVisible();
    expect(await drawer.evaluate(panel => panel.scrollWidth <= panel.clientWidth + 1)).toBe(true);
    await drawer.screenshot({ path: info.outputPath(`detalhes-anexo-${width}.png`), animations: "disabled" });
  }
  await drawer.getByRole("button", { name: "Voltar aos arquivos", exact: true }).click();
  await expect(details).toBeFocused();
  for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 1000 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true); await page.screenshot({ path: `output/phase-d-work/attachment-layout-${info.project.name}-${width}.png`, fullPage: true }); }
  const accessFilter = `care_recipient_id=${q(f.patient)} and subject_user=${q(stored.uploaded_by)} and capability='com.read'`;
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled)
    values(${q(f.patient)},${q(stored.uploaded_by)},'com.read',false)`);
  try {
    const denied = await page.request.get(view, { maxRedirects: 0 });
    expect(denied.status()).toBe(403);
    expect(denied.headers().location).toBeUndefined();
  } finally {
    sql(`delete from public.capability_overrides where ${accessFilter}`);
  }
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
  await picker(page).setInputFiles(f.file); await submit(page).click(); await expect(page.getByRole("button", { name: "Conferir envio", exact: true })).toBeEnabled();
  expect(rows(f.doc.id)).toHaveLength(0); await expect(picker(page)).toBeDisabled();
  await submit(page).click(); await expect(page.getByRole("link", { name: f.file.name, exact: true })).toBeVisible(); await expect(picker(page)).toHaveCount(0);
  expect(new Set(keys).size).toBe(1); expect(rows(f.doc.id)).toHaveLength(1); expect(rows(f.doc.id)[0].state).toBe("ready");
});

test("fechar o modal encerra a reserva sem fila e preserva o histórico", async ({ page }, info) => {
  const f = await fixture(page), before = facts(f.doc.id), version = sql("select version from public.operational_documents where id=" + q(f.doc.id));
  await loseConfirmedResponse(page, "prepareAndAbandon");
  await picker(page).setInputFiles(f.file); await submit(page).click();
  await expect(page.getByRole("button", { name: "Conferir envio", exact: true })).toBeEnabled();
  const dialog = page.getByRole("dialog", { name: "Adicionar anexo", exact: true });
  for (const width of [360, 412]) {
    await page.setViewportSize({ width, height: 1000 });
    await auditFromTop(page, "attachment upload at " + width);
    await dialog.screenshot({ path: info.outputPath("attachment-modal-" + width + ".png") });
  }
  await close(page).click();
  await expect(dialog).toHaveCount(0);
  await expect(add(page)).toBeFocused();
  await expect.poll(() => rows(f.doc.id).map((row: { state: string }) => row.state)).toEqual(["abandoned"]);
  await expect(page.getByRole("button", { name: "Retomar envio", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.dataset.attachmentFaultUpstream)).toBe("200:prepared");
  expect(await page.evaluate(() => document.documentElement.dataset.attachmentAbandonUpstream)).toBe("200:abandoned");
  const [abandoned] = rows(f.doc.id);
  expect(sql("select count(*) from public.audit_events where action='attachment.abandoned' and entity_id=" + q(abandoned.id))).toBe("1");
  expect(sql("select version from public.operational_documents where id=" + q(f.doc.id))).toBe(version);
  expect(facts(f.doc.id)).toBe(before);
  await add(page).click();
  expect(await picker(page).evaluate(element => (element as HTMLInputElement).files?.length)).toBe(0);
  await picker(page).setInputFiles({ ...f.file, name: "nova-ficha.png" });
  await submit(page).click();
  await expect(page.getByRole("link", { name: "nova-ficha.png", exact: true })).toBeVisible();
  expect(rows(f.doc.id)).toHaveLength(2);
  expect(rows(f.doc.id).filter((row: { state: string }) => row.state === "ready")).toHaveLength(1);
});

test("o modal libera uma reserva incompleta preservada após recarregar a ficha", async ({ page }) => {
  const f = await fixture(page), before = facts(f.doc.id);
  const reservation = await page.request.post("/api/attachments?prepare=1", {
    headers: { origin: new URL(page.url()).origin },
    multipart: { careRecipientId: f.patient, documentId: f.doc.id, idempotencyKey: randomUUID(), file: f.file },
  });
  expect(reservation.ok(), await reservation.text()).toBe(true);
  const [pending] = rows(f.doc.id);
  expect(pending.state).toBe("quarantine");

  await page.reload();
  await selectDocumentSection(page, "attachments");
  await expect(page.getByText("Nenhum anexo registrado.", { exact: true })).toBeVisible();
  await expect(page.getByText(f.file.name, { exact: true })).toHaveCount(0);
  await add(page).click();
  const upload = page.getByRole("dialog", { name: "Adicionar anexo", exact: true });
  await expect(upload.getByText(f.file.name, { exact: true })).toHaveCount(0);
  const release = upload.getByRole("button", { name: "Liberar vagas de envios incompletos", exact: true });
  await release.click();
  await expect(upload).toBeVisible();
  await expect(release).toHaveCount(0);
  await expect(upload.getByText("Vagas liberadas. Você pode selecionar um arquivo para enviar.", { exact: true })).toBeVisible();
  await expect(picker(page)).toBeEnabled();
  expect(rows(f.doc.id).map(({ id, state }: { id: string; state: string }) => ({ id, state })))
    .toEqual([{ id: pending.id, state: "abandoned" }]);
  expect(facts(f.doc.id)).toBe(before);
});

test("revogação ao fechar a seleção preserva a reserva sem abandonar sem autorização", async ({ page }) => {
  const f = await fixture(page), before = facts(f.doc.id);
  await loseConfirmedResponse(page, "prepareAndAbandon");
  await picker(page).setInputFiles(f.file); await submit(page).click();
  await expect(page.getByRole("button", { name: "Conferir envio", exact: true })).toBeEnabled();
  let revoked = false;
  await page.route("**/api/attachments", async route => {
    if (route.request().method() === "PATCH" && !revoked) {
      revoked = true;
      sql("update public.care_recipient_memberships set status='revoked' where care_recipient_id=" + q(f.patient) + " and user_id=" + q(fixtures.family.id));
    }
    await route.continue();
  });
  const denied = page.waitForResponse(reply => new URL(reply.url()).pathname === "/api/attachments" && reply.request().method() === "PATCH");
  await close(page).click(); expect([403, 404]).toContain((await denied).status());
  await expect(picker(page)).toHaveCount(0);
  await expect(page.locator(".doc-file-title")).toHaveCount(0);
  expect(rows(f.doc.id)).toHaveLength(1); expect(rows(f.doc.id)[0].state).toBe("quarantine"); expect(facts(f.doc.id)).toBe(before);
  expect(sql("select count(*) from public.audit_events where action='attachment.abandoned' and entity_id=" + q(rows(f.doc.id)[0].id))).toBe("0");
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
  await page.reload();
  await expect(page.getByRole("link", { name: f.file.name, exact: true })).toBeVisible();
  await expect(picker(page)).toHaveCount(0);
  await expect(add(page)).toBeEnabled();
  await expect(page.getByRole("button", { name: "Consultar e recuperar tentativa", exact: true })).toHaveCount(0);
  expect(rows(f.doc.id)).toHaveLength(1); expect(rows(f.doc.id)[0].sha256).toBe(hash); expect(sql(`select count(*) from public.document_events where document_id=${q(f.doc.id)} and action='attachment.bound' and body->'event'->>'attachmentId'=${q(a.id)}`)).toBe("1"); expect(facts(f.doc.id)).toBe(before);
});

test("nova seleção encontra o mesmo arquivo e a reconciliação rejeita divergência no armazenamento", async ({ page }) => {
  const f = await fixture(page), before = facts(f.doc.id), worker = createClient(env.url, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const bytes = await sharp(f.source).rotate().resize(4096, 4096, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer(), hash = digest(bytes);
  async function prepare(key: string, filename: string) {
    const a = await rpc(f.owner, "prepare_attachment_attempt", { p_patient: f.patient, p_document: f.doc.id, p_movement: null, p_filename: filename, p_mime: "image/jpeg", p_bytes: bytes.length, p_key: key, p_source_hash: digest(f.source), p_source_bytes: f.source.length, p_source_mime: "image/png", p_hash: hash, p_transformation: "image-normalized-v1" });
    await rpc(worker, "attest_attachment_source", { p_id: a.id, p_actor: fixtures.family.id, p_source_hash: digest(f.source), p_source_bytes: f.source.length, p_source_mime: "image/png", p_hash: hash, p_transformation: "image-normalized-v1" }); return a;
  }
  const key = randomUUID(), a = await prepare(key, f.file.name);
  await page.reload();
  await expect(add(page)).toBeEnabled();
  await expect(page.getByRole("button", { name: "Retomar envio", exact: true })).toHaveCount(0);
  await add(page).click();
  expect(await picker(page).evaluate(element => (element as HTMLInputElement).files?.length)).toBe(0);
  await picker(page).setInputFiles({ ...f.file, name: "copia-renomeada.png" });
  await submit(page).click();
  await expect(page.getByRole("link", { name: f.file.name, exact: true })).toBeVisible();
  expect(rows(f.doc.id)).toHaveLength(1); expect(rows(f.doc.id)[0].id).toBe(a.id);
  const aliases = JSON.parse(sql("select jsonb_agg(request_key) from private.document_attachment_request_keys where attachment_id=" + q(a.id)));
  expect(aliases).toHaveLength(1);
  const [freshKey] = aliases;
  expect(freshKey).not.toBe(key);
  const lookup = await page.request.get("/api/attachments?" + new URLSearchParams({ careRecipientId: f.patient, documentId: f.doc.id, attemptKey: freshKey }));
  expect(lookup.status()).toBe(200);
  expect((await lookup.json()).data[0].id).toBe(a.id);

  const corrupted = await prepare(randomUUID(), "divergencia-ficticia.png");
  await rpc(f.owner, "begin_attachment_upload", { p_id: corrupted.id, p_source_hash: digest(f.source), p_hash: hash, p_token: randomUUID() });
  const inserted = await f.owner.storage.from("patient-evidence").upload(corrupted.object_path, Buffer.from("bytes divergentes controlados"), { contentType: "image/jpeg", upsert: false });
  expect(inserted.error).toBeNull();
  const recovery = page.waitForResponse(reply => reply.request().method() === "PATCH" && reply.url().endsWith("/api/attachments"));
  await page.getByRole("button", { name: "Atualizar anexos", exact: true }).click();
  expect((await recovery).status()).toBe(409);
  await expect(page.getByText("divergencia-ficticia.png", { exact: true })).toHaveCount(0);
  expect(rows(f.doc.id).find((row: { id: string }) => row.id === corrupted.id).state).toBe("quarantine");
  expect(sql("select count(*) from public.document_events where document_id=" + q(f.doc.id) + " and action='attachment.bound' and body->'event'->>'attachmentId'=" + q(corrupted.id))).toBe("0");
  expect(rows(f.doc.id).filter((row: { state: string }) => row.state === "ready")).toHaveLength(1);
  expect(facts(f.doc.id)).toBe(before);
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
  await expect(page.getByRole("button", { name: "Conferir envio", exact: true })).toBeEnabled({ timeout: 45000 });
  expect(Date.now() - started).toBeGreaterThanOrEqual(29_000); expect(await page.evaluate(() => document.documentElement.dataset.attachmentTimeoutUpstream)).toBe("201:confirmed");
  await expect(page.getByText("Não foi possível confirmar o envio. Recupere a mesma tentativa para consultar o resultado.", { exact: true })).toBeVisible(); await expect(picker(page)).toBeDisabled();
  const [stored] = rows(f.doc.id); expect(stored.state).toBe("ready"); await submit(page).click(); await expect(picker(page)).toHaveCount(0);
  expect(uploads).toBe(1); expect(rows(f.doc.id)).toHaveLength(1); expect(rows(f.doc.id)[0].sha256).toBe(stored.sha256); expect(facts(f.doc.id)).toBe(before);
  const link = page.getByRole("link", { name: f.file.name, exact: true }), downloaded = await page.request.get((await link.getAttribute("href"))!); expect(downloaded.ok()).toBeTruthy(); expect(digest(await downloaded.body())).toBe(stored.sha256);
});
