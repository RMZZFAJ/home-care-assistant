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
  await page.goto("/fichas/" + req.id);
  await expect(page.locator(".hca-activity-overlay")).toBeVisible();
  await expect(page.locator(".hca-workspace-body .hca-banner:visible")).toHaveCount(0);
  release(); await expect(page.locator(".hca-document-header")).toBeVisible();
  await expect(page.locator(".hca-activity-overlay")).toHaveCount(0); await page.unroute("**/api/context**");
  let change!: () => void; const changing = new Promise<void>(resolve => { change = resolve; });
  await page.route("**/api/context", async route => { if (route.request().method() === "POST") await changing; await route.continue(); });
  await page.getByRole("combobox", { name: "Pessoa assistida", exact: true }).selectOption(b.patient);
  await expect(page.getByRole("heading", { name: "Mudando de paciente", exact: true })).toBeVisible();
  await expect(page.locator(".hca-workspace-body .hca-banner:visible")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Mudar perfil", exact: true })).toHaveCount(0);
  change(); await expect(page.locator(".hca-workspace")).toHaveAttribute("data-context-patient", b.patient);
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
  await page.getByRole("button", { name: "Registrar andamento", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Registrar andamento", exact: true }), text = editor.getByRole("textbox", { name: "Texto do andamento", exact: true });
  await expect(editor.getByLabel("Visibilidade do andamento", { exact: true })).toHaveCount(0);
  await expect(editor.getByRole("textbox", { name: "Código da ficha a vincular", exact: true })).toHaveCount(0);
  await expect(editor.getByRole("textbox", { name: "Nome da pessoa a mencionar", exact: true })).toHaveCount(0);
  await text.fill("Registro privado @Teste");
  const name = sql("select full_name from public.profiles where id=" + q(fixtures.professional.id));
  await editor.getByRole("button", { name: "@" + name, exact: true }).click();
  await text.press("End"); await text.pressSequentially(" #" + otherCode);
  await editor.getByRole("button", { name: new RegExp("^Ficha · " + otherCode + "(?: ·|$)") }).click();
  const committed = page.waitForResponse(response => new URL(response.url()).pathname === "/api/documents/progress-preparations/commit" && response.request().method() === "POST");
  await editor.getByRole("button", { name: "Publicar andamento", exact: true }).click();
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
