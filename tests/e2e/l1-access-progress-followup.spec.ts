import { openOperationalDocumentAction } from "./document-sections";
import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { setup, issue, actor, rpc, fixtures } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { getTestEnvironment, sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { auditFromTop } from "./accessibility-audit";

test.setTimeout(150_000);
async function login(page: Page, email: string, patient?: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  if (patient) await selectContext(page, patient);
  await expect(page.locator(".hca-activity-overlay")).toHaveCount(0);
}

test("recuperação reaproveita o e-mail e só envia depois da confirmação na segunda tela", async ({ page }) => {
  let sends = 0;
  await page.route("**/auth/v1/recover**", async route => { sends++; await route.fulfill({ status: 200, contentType: "application/json", body: "{}" }); });
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill("recuperacao-ficticia@example.invalid");
  await page.getByRole("button", { name: "Esqueci minha senha", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Recuperar seu acesso", exact: true })).toBeVisible();
  await expect(page.getByLabel("E-mail", { exact: true })).toHaveValue("recuperacao-ficticia@example.invalid");
  await expect(page.getByLabel("Senha", { exact: true })).toHaveCount(0);
  expect(sends).toBe(0); expect(page.url()).not.toContain("example.invalid");
  await page.getByRole("button", { name: "Solicitar link de recuperação", exact: true }).click();
  await expect(page.getByText("Se o e-mail estiver autorizado, você receberá instruções de recuperação.", { exact: true })).toBeVisible();
  expect(sends).toBe(1); await auditFromTop(page, "L1 recuperação em segunda tela");
});

test("um único vínculo entra na visão geral sem montar o seletor nem retomar uma ficha antiga", async ({ page }) => {
  const f = await setup(), env = getTestEnvironment();
  const auth = createClient(env.url, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const email = `vinculo-unico-${randomUUID()}@example.invalid`;
  const created = await auth.auth.admin.createUser({ email, password: fixturePassword, email_confirm: true, user_metadata: { full_name: "Pessoa fictícia com um vínculo" } });
  expect(created.error).toBeNull(); const userId = created.data.user!.id;
  sql(`insert into public.profiles(id,full_name) values(${q(userId)},'Pessoa fictícia com um vínculo')`);
  sql(`insert into public.care_recipient_memberships(care_recipient_id,user_id,role) values(${q(f.patient)},${q(userId)},'family')`);
  await page.addInitScript(() => {
    const state = window as unknown as { chooserWasMounted: boolean }; state.chooserWasMounted = false;
    new MutationObserver(() => { if (document.querySelector('[aria-label="Mudar perfil"]')) state.chooserWasMounted = true; }).observe(document, { childList: true, subtree: true });
  });
  await login(page, email);
  await expect(page.locator(".hca-workspace")).toHaveAttribute("data-context-patient", f.patient);
  await expect(page.getByRole("region", { name: "Mudar perfil", exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { chooserWasMounted: boolean }).chooserWasMounted)).toBe(false);
  expect(new URL(page.url()).pathname).toBe("/");
});

test("abrir ficha e trocar paciente exibem somente a sobreposição e seguem diretamente ao destino", async ({ page }) => {
  const a = await setup(), req = await issue(a.patient, a.products), b = await setup();
  await login(page, fixtures.family.email, a.patient);
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/context**", async route => {
    if (route.request().method() === "GET" && new URL(route.request().url()).searchParams.get("documentId") === req.id) await gate;
    await route.continue();
  });
  try {
    await page.goto("/fichas/" + req.id);
    await expect(page.locator(".hca-activity-overlay")).toBeVisible();
    await expect(page.getByRole("list", { name: "Etapas da operação", exact: true })).toHaveCount(0);
    await expect(page.locator(".hca-workspace-body .hca-banner:visible")).toHaveCount(0);
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
  await expect(page.locator(".hca-document-header")).toBeVisible();
  await expect(page.locator(".hca-activity-overlay")).toHaveCount(0);
  let authorize!: () => void;
  let loadContext!: () => void;
  let selectionSent = false;
  const authorizationGate = new Promise<void>(resolve => { authorize = resolve; });
  const contextGate = new Promise<void>(resolve => { loadContext = resolve; });
  await page.route("**/api/context", async route => {
    if (route.request().method() === "POST") {
      await authorizationGate;
      selectionSent = true;
    } else if (selectionSent) await contextGate;
    await route.continue();
  });
  try {
    await page.getByRole("combobox", { name: "Pessoa assistida", exact: true }).selectOption(b.patient);
    const stages = page.getByRole("list", { name: "Etapas da operação", exact: true });
    const current = stages.locator('li[aria-current="step"]');
    await expect(current).toHaveText("Validando o vínculo escolhido");
    await expect(page.locator(".hca-workspace-body .hca-banner:visible")).toHaveCount(0);
    await expect(page.getByRole("region", { name: "Mudar perfil", exact: true })).toHaveCount(0);

    authorize();
    await expect(current).toHaveText("Consultando o espaço do paciente");
    await expect(stages.getByText("Concluída.", { exact: true })).toHaveCount(1);
    await expect(page.locator(".hca-workspace-body .hca-banner:visible")).toHaveCount(0);
  } finally {
    authorize();
    loadContext();
    await page.unrouteAll({ behavior: "wait" });
  }
  await expect(page.locator(".hca-workspace")).toHaveAttribute("data-context-patient", b.patient);
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await expect(page.locator(".hca-activity-overlay")).toHaveCount(0);
  expect(new URL(page.url()).pathname).toBe("/");
});

test("Mais usa menu e identificação separada; família menciona por @ e referencia por # em andamento privado", async ({ page }) => {
  const f = await setup(), req = await issue(f.patient, [f.products[0]]), other = await issue(f.patient, [f.products[1]]);
  const code = sql("select code from public.operational_documents where id=" + q(req.id));
  const otherCode = sql("select code from public.operational_documents where id=" + q(other.id));
  await login(page, fixtures.family.email, f.patient); await page.goto("/fichas/" + req.id);
  const more = page.getByRole("button", { name: "Mais opções da ficha", exact: true });
  await more.click(); const menu = page.getByRole("menu", { name: "Ações da ficha", exact: true });
  await expect(menu.getByRole("menuitem", { name: "Compartilhar link da ficha", exact: true })).toBeVisible();
  await expect(menu.getByText(req.id, { exact: true })).toHaveCount(0);
  await menu.getByRole("menuitem", { name: "Compartilhar link da ficha", exact: true }).click();
  const sharing = page.getByRole("dialog", { name: "Compartilhar ficha", exact: true });
  await expect(sharing.getByRole("textbox", { name: "Link da ficha", exact: true })).toHaveValue(new URL("/fichas/" + req.id, page.url()).href);
  await expect(sharing.locator(".share-icon")).toHaveCSS("width", "48px");
  await auditFromTop(page, "L1 compartilhamento da ficha");
  await sharing.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(more).toBeFocused(); await more.click();
  await menu.getByRole("menuitem", { name: "Protocolo e identificação", exact: true }).click();
  const identity = page.getByRole("dialog", { name: "Protocolo e identificação", exact: true });
  await expect(identity.getByText(req.id, { exact: true })).toBeVisible(); await expect(identity.getByText(code, { exact: true })).toBeVisible();
  await identity.getByRole("button", { name: "Fechar diálogo", exact: true }).click(); await expect(more).toBeFocused();
  const fab = page.getByRole("button", { name: "Ações da ficha", exact: true });
  await fab.press("Enter");
  const operations = page.getByRole("menu", { name: "Ações operacionais", exact: true });
  await expect(operations).toBeVisible();
  await operations.press("Escape");
  await expect(fab).toBeFocused();
  await openOperationalDocumentAction(page, "Novo andamento");
  await expect(page.getByRole("tab", { name: "Andamentos", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("dialog", { name: "Novo andamento", exact: true })).toHaveCount(0);
  const newProgress = page.getByRole("button", { name: "Novo andamento", exact: true });
  await expect(newProgress).toBeFocused();
  await newProgress.click();
  const editor = page.getByRole("dialog", { name: "Novo andamento", exact: true }), text = editor.getByRole("textbox", { name: "Texto do andamento", exact: true });
  await expect(editor.getByRole("switch")).toHaveCount(0);
  await expect(editor.getByRole("textbox", { name: "Código da ficha a vincular", exact: true })).toHaveCount(0);
  await expect(editor.getByRole("textbox", { name: "Nome da pessoa a mencionar", exact: true })).toHaveCount(0);
  await text.fill("Registro privado @Teste");
  const name = sql("select full_name from public.profiles where id=" + q(fixtures.professional.id));
  const mention = editor.getByRole("button", { name: "@" + name, exact: true });
  await mention.focus();await expect(mention).toBeFocused();
  // A busy rendering frame must not move the caret back into text typed later.
  const releaseFrames = await page.evaluateHandle(() => {
    const request = window.requestAnimationFrame.bind(window), cancel = window.cancelAnimationFrame.bind(window);
    const queued = new Map<number, FrameRequestCallback>();let sequence = 0;
    window.requestAnimationFrame = callback => { const id = --sequence;queued.set(id, callback);return id; };
    window.cancelAnimationFrame = id => { if (!queued.delete(id)) cancel(id); };
    return () => { window.requestAnimationFrame = request;window.cancelAnimationFrame = cancel;for (const callback of queued.values()) request(callback);queued.clear(); };
  });
  try {
    await mention.press("Enter");
    await text.press("End");await text.pressSequentially(" #" + otherCode);
  } finally { await releaseFrames.evaluate(release => release());await releaseFrames.dispose(); }
  await page.evaluate(() => new Promise<void>(done => requestAnimationFrame(() => requestAnimationFrame(() => done()))));
  const expectedText = "Registro privado @" + name + "  #" + otherCode;
  await expect(text).toHaveValue(expectedText);
  expect(await text.evaluate((element: HTMLTextAreaElement) => element.selectionStart)).toBe(expectedText.length);
  await editor.getByRole("button", { name: new RegExp("^Ficha · " + otherCode + "(?: ·|$)") }).click();
  const committed = page.waitForResponse(response => new URL(response.url()).pathname === "/api/documents/progress-preparations/commit" && response.request().method() === "POST");
  await editor.getByRole("button", { name: "Registrar andamento", exact: true }).click();
  const confirmed = await committed; expect(confirmed.status(), await confirmed.text()).toBe(200);
  await expect(page.locator(".hca-activity-overlay")).toHaveCount(0);
  await expect(editor).toHaveCount(0);
  const professional = await actor("professional", f.patient);
  const result = await rpc(professional, "document_progress", { p_document: req.id, p_filter: "manual" });
  expect(result.total).toBe(1); expect(result.data[0].visibility).toBe("family");
  expect(result.data[0].mentions[0].id).toBe(fixtures.professional.id);
  expect(result.data[0].references[0].id).toBe(other.id);
  await auditFromTop(page, "L1 Andamento privado com menção individual");
});
