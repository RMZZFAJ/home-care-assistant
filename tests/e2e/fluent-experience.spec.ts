import { test, expect, type Page } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
import { fixtureFile } from "../../scripts/test-environment.mjs";
import { fixturePassword, patientA, patientB } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";

async function login(page: Page, role: string, patient: string | null = patientA) {
  const fixture = JSON.parse(readFileSync(fixtureFile, "utf8"));
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixture[role].email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
}
async function capture(page: Page, name: string, project: string) {
  mkdirSync("output/playwright/fluent", { recursive: true });
  await page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== "running" || animation.effect?.getComputedTiming().iterations === Infinity));
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.screenshot({ path: `output/playwright/fluent/${name}-${project}.png`, fullPage: await page.getByRole("dialog").count() === 0, animations: "disabled" });
}

test.describe("registro SSR Fluent", () => {
  test.use({ javaScriptEnabled: false });
  test("estilos do streaming permanecem no head sem cópias no corpo", async ({ page }) => {
    const response = await page.goto("/login?error=AUTHENTICATION_FAILED");
    expect(response?.ok()).toBe(true);
    await expect(page.locator("head style[data-make-styles-rehydration]")).not.toHaveCount(0);
    await expect(page.locator("body style[data-make-styles-rehydration]")).toHaveCount(0);
  });
});

test("gestão Fluent troca contexto no submenu, mantém navegação e edita perfil sob demanda", async ({ page }, info) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await login(page, "shared");
  await page.getByLabel("Menu do usuário", { exact: true }).click();
  await page.getByRole("menuitem", { name: "Meu perfil e segurança", exact: true }).click();
  await expect(page).toHaveURL(/\/perfil/);
  await expect(page.locator("body style[data-make-styles-rehydration]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Identidade pessoal", exact: true })).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Identidade pessoal", exact: true }).click();
  await expect(page.getByLabel("Nome", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Identidade pessoal", exact: true }).click();
  await expect(page.getByLabel("Nome", { exact: true })).not.toBeVisible();
  await capture(page, "perfil", info.project.name);
  await page.getByLabel("Menu do usuário", { exact: true }).click();
  await page.getByRole("menuitem", { name: "Mudar perfil", exact: true }).click();
  await expect(page.getByRole("menu", { name: "Contextos autorizados", exact: true })).toBeVisible();
  await page.getByRole("menuitem", { name: "← Voltar ao menu", exact: true }).click();
  await expect(page.getByRole("menuitem", { name: "Meu perfil e segurança", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await selectContext(page, patientB);
  await expect(page).toHaveURL(/\/perfil/);
  await expect(page.getByRole("region", { name: "Mudar perfil", exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Abrir navegação", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Navegação principal", exact: true })).toBeVisible();
  await noOverflow(page);
  await capture(page, "menu-gerencial-mobile", info.project.name);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Abrir navegação", exact: true })).toBeFocused();
  expect(failures).toEqual([]);
});

test("documentos comuns, histórico com URL e estoque têm apresentação real em desktop e mobile", async ({ page }, info) => {
  test.setTimeout(120_000);
  const fixture = JSON.parse(readFileSync(fixtureFile, "utf8"));
  const post = async (url: string, data: unknown) => {
    const response = await page.request.post(url, { data });
    const result = await response.json();
    expect(response.ok(), url + " " + String((data as { action?: string }).action ?? "") + " " + response.status() + " " + String(result.code ?? "") + " " + String(result.error ?? "")).toBe(true);
    return result;
  };
  const logout = async () => { await page.getByLabel("Menu do usuário", { exact: true }).click(); await page.getByRole("menuitem", { name: "Sair", exact: true }).click(); await expect(page).toHaveURL(/\/login/); };
  await login(page, "global", null);
  const patient = (await post("/api/admin", { action: "recipient", id: null, displayName: "Homologação visual " + crypto.randomUUID().slice(0, 8), isActive: true, isDevelopment: true, initialAdministratorEmail: fixture.adminA.email })).data.id;
  await logout();
  await login(page, "adminA", patient);
  await post("/api/admin", { action: "adoptProduct", careRecipientId: patient, productId: "fralda" });
  const outside = await page.request.post("/api/admin", { data: { action: "membership", careRecipientId: patient, userId: fixture.professional.id, role: "professional", canManageStock: false, canCountStock: false } });
  expect(outside.status()).toBe(403);
  const invitation = await post("/api/admin", { action: "invitation", careRecipientId: patient, email: fixture.professional.email, role: "professional", canManageStock: false, canCountStock: false });
  await post("/api/stock/movements", { careRecipientId: patient, productId: "fralda", quantity: "10", action: "inbound", reason: "Saldo fictício de homologação visual", idempotencyKey: crypto.randomUUID() });
  const req = (await post("/api/requisitions", { careRecipientId: patient, lines: [{ productId: "fralda", currentStock: 0, urgent: false }], extraItems: [], observations: [], idempotencyKey: crypto.randomUUID() })).receipt;
  const reqData = (await (await page.request.get("/api/requisitions/" + req.requisitionId)).json()).data;
  const com = (await post("/api/documents", { careRecipientId: patient, type: "COM", payload: { origin: "donation", lines: [{ productId: "fralda", quantity: "1" }] }, idempotencyKey: crypto.randomUUID() })).data;
  await logout();
  await login(page, "professional");
  await post("/api/invitations/accept", { token: new URLSearchParams(new URL(invitation.invitationUrl).hash.slice(1)).get("token") });
  await logout();
  await login(page, "adminA", patient);
  let ent = (await post("/api/documents", { careRecipientId: patient, type: "ENT", payload: { source: "FAMILY", destination: "CARE_TEAM", recipientId: fixture.professional.id, lines: [{ productId: "fralda", quantity: "2", requisitionItemIds: [reqData.requisition_items[0].id] }] }, idempotencyKey: crypto.randomUUID() })).data;
  await logout();
  await login(page, "professional", patient);
  ent = (await post("/api/documents/" + ent.id, { action: "receive", expectedVersion: ent.version, body: { divergences: [] }, idempotencyKey: crypto.randomUUID() })).data;
  const bal = (await post("/api/documents", { careRecipientId: patient, type: "BAL", payload: { lines: [{ productId: "fralda", quantity: "2" }] }, idempotencyKey: crypto.randomUUID() })).data;
  await logout();
  await login(page, "adminA", patient);
  for (const [kind, id, code] of [["req", req.requisitionId, req.code], ["com", com.id, com.code], ["ent", ent.id, ent.code], ["bal", bal.id, bal.code]]) {
    await page.setViewportSize({ width: 1366, height: 900 });
    await page.goto("/documentos/" + id);
    await expect(page.getByRole("heading", { name: code, exact: true })).toBeVisible();
    await capture(page, "documento-" + kind + "-desktop", info.project.name);
    await page.setViewportSize({ width: 390, height: 844 });
    await noOverflow(page);
    await capture(page, "documento-" + kind + "-mobile", info.project.name);
  }
  await page.goto("/historico?careRecipientId=" + patient + "&type=ENT&search=" + ent.code);
  await expect(page.getByRole("combobox", { name: "Ficha", exact: true })).toHaveValue("ENT");
  await expect(page.getByLabel("Código ou protocolo", { exact: true })).toHaveValue(ent.code);
  await page.reload();
  await expect(page.getByLabel("Código ou protocolo", { exact: true })).toHaveValue(ent.code);
  await expect(page.getByRole("link").filter({ hasText: ent.code })).toHaveAttribute("href", "/documentos/" + ent.id);
  await capture(page, "historico-filtros-mobile", info.project.name);
  await page.goto("/estoque?careRecipientId=" + patient + "&custody=FAMILY");
  await expect(page.getByRole("heading", { name: "Saldos e previsões", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Consultar Fralda · Família", exact: true })).toBeVisible();
  await noOverflow(page);
  await capture(page, "estoque-mobile", info.project.name);
  await page.getByRole("button", { name: "Consultar Fralda · Família", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByText("Saldo confirmado · unidade", { exact: true })).toBeVisible();
  await capture(page, "estoque-detalhe-mobile", info.project.name);
});

test("operação móvel oferece cinco destinos e caixa de entregas autorizada", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, "professional");
  const navigation = page.getByRole("navigation", { name: "Navegação do plantão", exact: true });
  for (const label of ["Início", "Histórico", "Entregas", "Estoque", "Mais"]) await expect(navigation.getByRole("link", { name: label, exact: true })).toBeVisible();
  await capture(page, "inicio-equipe-mobile", info.project.name);
  await navigation.getByRole("link", { name: "Entregas", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Entregas e recebimentos", exact: true })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Responsável pelas entregas", exact: true })).toHaveValue("own");
  await noOverflow(page);
  const response = await page.request.get(`/api/deliveries?careRecipientId=${patientA}&scope=own`);
  expect(response.ok()).toBeTruthy();
  const context = (await (await page.request.get("/api/context")).json()).data;
  for (const row of (await response.json()).data) expect(row.recipient_id).toBe(context.userId);
  await capture(page, "entregas-equipe-mobile", info.project.name);
});

test("dashboards apresentam tarefas reais por perfil e preservam a custódia autorizada", async ({ page }, info) => {
  for (const role of ["adminA", "family", "supervisor", "professional", "reader"]) {
    await test.step(role, async () => {
      await page.setViewportSize({ width: 1366, height: 900 });
      await login(page, role);
      await expect(page.getByRole("heading", { name: role === "professional" ? "Precisa da sua atenção" : role === "supervisor" ? "Pendências da equipe" : "Ações que precisam de você", exact: true })).toBeVisible();
      const response = await page.request.get("/api/dashboard?careRecipientId=" + patientA);
      expect(response.ok()).toBeTruthy();
      const data = (await response.json()).data;
      expect(Array.isArray(data.pendingTasks)).toBe(true);
      expect(Array.isArray(data.criticalStock)).toBe(true);
      if (role === "professional") {
        expect(data.criticalStock.every((item: { custody: string }) => item.custody === "CARE_TEAM")).toBe(true);
        await expect(page.getByRole("link", { name: "Fazer balanço", exact: true })).toHaveCount(0);
      }
      await noOverflow(page);
      await capture(page, "dashboard-" + role + "-desktop", info.project.name);
      await page.setViewportSize({ width: 390, height: 844 });
      await noOverflow(page);
      await capture(page, "dashboard-" + role + "-mobile", info.project.name);
      await page.getByLabel("Menu do usuário", { exact: true }).click();
      await page.getByRole("menuitem", { name: "Sair", exact: true }).click();
      await expect(page).toHaveURL(/\/login/);
    });
  }
});

test("administração usa listas, painéis de edição e confirmação crítica sem perder o contexto", async ({ page }, info) => {
  await login(page, "adminA");
  await page.goto("/admin?careRecipientId=" + patientA);
  const areas = page.getByRole("navigation", { name: "Áreas administrativas", exact: true });
  await expect(areas).toBeVisible();
  await areas.locator('a[href*="section=catalog"]').click();
  await expect(page.getByRole("table", { name: "Produtos do catálogo", exact: true })).toBeVisible();
  await capture(page, "catalogo-lista", info.project.name);
  await page.getByRole("button", { name: "Novo item", exact: true }).click();
  await page.getByLabel("Nome", { exact: true }).fill("Rascunho visual não gravado");
  await page.getByRole("button", { name: "Fechar edição", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Há alterações ainda não salvas" })).toBeVisible();
  await page.getByRole("button", { name: "Continuar editando", exact: true }).click();
  await expect(page.getByLabel("Nome", { exact: true })).toHaveValue("Rascunho visual não gravado");
  await capture(page, "catalogo-edicao", info.project.name);
  await page.getByRole("button", { name: "Fechar edição", exact: true }).click();
  await page.getByRole("button", { name: "Descartar alterações", exact: true }).click();
  await page.getByRole("button", { name: "Outras áreas", exact: true }).click();
  await page.getByRole("menuitem", { name: "Pessoas e vínculos", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Pessoas e vínculos", exact: true })).toBeVisible();
  await capture(page, "pessoas-lista", info.project.name);
  await page.getByRole("link", { name: "Permissões e alterações com dupla aprovação", exact: true }).click();
  await page.getByRole("navigation", { name: "Áreas da configuração", exact: true }).getByRole("link", { name: "Permissões", exact: true }).click();
  const before = (await (await page.request.get("/api/patient-settings?careRecipientId=" + patientA)).json()).data.version;
  await page.getByRole("searchbox", { name: "Pesquisar permissões", exact: true }).fill("Movimentar e corrigir estoque familiar");
  await page.getByRole("button", { name: /Movimentar e corrigir estoque familiar · Profissional ·/ }).click();
  await page.getByRole("menuitemradio", { name: "Permitir", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Confirmar alteração crítica", exact: true })).toBeVisible();
  expect((await (await page.request.get("/api/patient-settings?careRecipientId=" + patientA)).json()).data.version).toBe(before);
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await capture(page, "permissoes-matriz", info.project.name);
  await page.getByRole("navigation", { name: "Áreas da configuração", exact: true }).getByRole("link", { name: "Notificações", exact: true }).click();
  await expect(page.getByRole("table", { name: "Canais por evento e função", exact: true })).toBeVisible();
  await capture(page, "notificacoes-matriz", info.project.name);
  await page.getByRole("navigation", { name: "Áreas da configuração", exact: true }).getByRole("link", { name: "Regras", exact: true }).click();
  await capture(page, "politicas-resumo", info.project.name);
  await page.getByRole("button", { name: "Editar Encerramento e histórico", exact: true }).click();
  await expect(page.getByLabel("Arquivar após conclusão (dias)", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/unidades?careRecipientId=" + patientA);
  await expect(page.getByRole("table", { name: "Unidades base", exact: true })).toBeVisible();
  await capture(page, "unidades-lista", info.project.name);
  await page.getByRole("button", { name: "Nova unidade", exact: true }).click();
  await expect(page.getByLabel("Código", { exact: true })).toBeVisible();
  await noOverflow(page);
  await capture(page, "unidades-edicao", info.project.name);
});

test("ocorrências e notificações preservam saldos e distinguem estados no aplicativo", async ({ page }, info) => {
  await login(page, "professional");
  const balance = async () => (await (await page.request.get("/api/stock/balances?careRecipientId=" + patientA)).json()).overview;
  const before = await balance();
  await page.goto("/consumo?careRecipientId=" + patientA);
  await expect(page.getByRole("heading", { name: "Relatos registrados", exact: true })).toBeVisible();
  await capture(page, "ocorrencias-lista", info.project.name);
  await page.getByRole("button", { name: "Registrar ocorrência", exact: true }).click();
  await page.getByLabel("O que aconteceu?", { exact: true }).fill("Rascunho visual de ocorrência sem movimentação");
  await noOverflow(page);
  await capture(page, "ocorrencia-edicao", info.project.name);
  await page.getByRole("button", { name: "Fechar edição", exact: true }).click();
  await page.getByRole("button", { name: "Descartar alterações", exact: true }).click();
  expect(await balance()).toEqual(before);
  await page.goto("/notificacoes?careRecipientId=" + patientA);
  await expect(page.getByRole("heading", { name: "Central de notificações", exact: true })).toBeVisible();
  await page.getByRole("checkbox", { name: "Somente não vistas", exact: true }).check();
  await expect(page.getByText("Consultando notificações…", { exact: true })).toHaveCount(0);
  await noOverflow(page);
  await capture(page, "notificacoes-central", info.project.name);
});
