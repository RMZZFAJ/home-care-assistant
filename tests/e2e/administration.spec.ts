import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { assertLocalProject, fixtureFile } from "../../scripts/test-environment.mjs";

type Fixture = { id: string; email: string };

test.describe("administração integrada no ambiente local", () => {
  test.skip(process.env.HCA_E2E_LOCAL !== "1", "Use o runner que verifica o banco local de desenvolvimento.");
  test.setTimeout(120_000);

  function fixtures(): Record<string, Fixture> {
    assertLocalProject();
    if (process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321") throw new Error("Only the verified local development backend is authorized.");
    return JSON.parse(readFileSync(fixtureFile, "utf8"));
  }

  async function login(page: Page, name = "global") {
    await page.goto("/login");
    await page.getByLabel("E-mail", { exact: true }).fill(fixtures()[name].email);
    await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Visão geral" }).first()).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Pessoa assistida", exact: true })).toBeVisible();
  }

  async function createPatient(page: Page) {
    const response = await page.request.post("/api/admin", { data: { action: "recipient", id: null, displayName: `Paciente administrativo ${randomUUID().slice(0, 8)}`, isActive: true, isDevelopment: true } });
    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.data.id).toBeTruthy();
    return result.data.id as string;
  }

  async function section(page: Page, patientId: string, name: string) {
    await page.goto(`/admin?careRecipientId=${patientId}`);
    await page.getByRole("combobox", {name:"Seção administrativa",exact:true}).selectOption({label:name});
    await expect(page.getByText("Carregando", { exact: false })).toHaveCount(0);
  }

  async function submit(page: Page, name: string, action: string) {
    const pending = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/admin" && response.request().method() === "POST" && response.request().postDataJSON().action === action);
    await page.getByRole("button", { name, exact: true }).click();
    const response = await pending;
    expect(response.ok()).toBeTruthy();
    return response.json();
  }

  test("catálogo edita nomes alternativos e inativa preservando a identidade", async ({ page }) => {
    await login(page);
    const patientId = await createPatient(page);
    const originalName = `Material administrativo ${randomUUID().slice(0, 8)}`;
    const finalName = `${originalName} revisado`;
    await section(page, patientId, "Catálogo");
    await page.getByLabel("Nome", { exact: true }).fill(originalName);
    await page.getByRole("combobox", { name: "Categoria", exact: true }).selectOption("higiene");
    await page.getByLabel("Unidade", { exact: true }).fill("pacote");
    await page.getByLabel("Nomes alternativos, separados por vírgula", { exact: true }).fill("Material auxiliar, Apoio operacional");
    const created = await submit(page, "Salvar item", "product");
    const productId = created.data.product_id as string;
    expect(productId).toBeTruthy();
    await expect(page.getByRole("heading", { name: originalName, exact: true })).toBeVisible();
    await page.getByRole("button", { name: `Editar ${originalName}`, exact: true }).click();
    await expect(page.getByLabel("Nomes alternativos, separados por vírgula", { exact: true })).toHaveValue("Material auxiliar, Apoio operacional");
    await page.getByLabel("Nome", { exact: true }).fill(finalName);
    await page.getByLabel("Nomes alternativos, separados por vírgula", { exact: true }).fill("Material auxiliar revisado, Apoio operacional");
    await page.getByRole("checkbox", { name: "Item ativo", exact: true }).uncheck();
    await submit(page, "Salvar item", "product");
    const article = page.getByRole("article").filter({ has: page.getByRole("heading", { name: finalName, exact: true }) });
    await expect(article.getByText("higiene · pacote · Inativo", { exact: true })).toBeVisible();
    const all = await (await page.request.get(`/api/catalog?careRecipientId=${patientId}&includeInactive=true`)).json();
    expect(all.data).toHaveLength(1);
    expect(all.data[0]).toMatchObject({ id: productId, name: finalName, is_active: false, unit: "pacote", aliases: ["Material auxiliar revisado", "Apoio operacional"] });
    const available = await (await page.request.get(`/api/catalog?careRecipientId=${patientId}`)).json();
    expect(available.data).toHaveLength(0);
  });

  test("administrador local revoga um vínculo sem alterar acesso da mesma conta a outro paciente", async ({ page }) => {
    await login(page);
    const firstPatient = await createPatient(page);
    const secondPatient = await createPatient(page);
    const shared = fixtures().shared;
    for (const [patientId, role] of [[firstPatient, "professional"], [secondPatient, "reader"]]) {
      await section(page, patientId, "Vínculos");
      await page.getByRole("combobox", { name: "Conta vinculada", exact: true }).selectOption(shared.id);
      await page.getByRole("combobox", { name: "Função neste paciente", exact: true }).selectOption(role);
      await submit(page, "Salvar vínculo", "membership");
      await expect(page.getByRole("listitem").filter({ has: page.getByText("Teste shared", { exact: true }) })).toBeVisible();
    }
    const localAdmin = await page.request.post("/api/admin", { data: { action: "membership", careRecipientId: firstPatient, userId: fixtures().adminA.id, role: "admin", canManageStock: true, canCountStock: true } });
    expect(localAdmin.ok()).toBeTruthy();
    await page.getByLabel("Menu do usuário",{exact:true}).click();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
    await login(page, "adminA");
    await section(page, firstPatient, "Vínculos");
    await expect(page.getByRole("button", { name: "Contas globais", exact: true })).toHaveCount(0);
    const member = page.getByRole("listitem").filter({ has: page.getByText("Teste shared", { exact: true }) });
    const revoked = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/admin" && response.request().method() === "POST" && response.request().postDataJSON().action === "membershipStatus");
    await member.getByRole("button", { name: "Revogar", exact: true }).click();
    expect((await revoked).ok()).toBeTruthy();
    await expect(page.getByText("Estado do vínculo atualizado.", { exact: true })).toBeVisible();
    await expect(page.getByRole("listitem").filter({ has: page.getByText("Teste shared", { exact: true }) }).getByText("Profissional · Revogado", { exact: true })).toBeVisible();
    const forbidden = await page.request.get(`/api/admin?section=memberships&careRecipientId=${secondPatient}`);
    expect(forbidden.status()).toBe(404);
    await page.getByLabel("Menu do usuário",{exact:true}).click();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
    await login(page, "shared");
    const context = await (await page.request.get("/api/context")).json();
    expect(context.data.isGlobalAdmin).toBe(false);
    expect(context.data.patients.some((patient: { id: string }) => patient.id === firstPatient)).toBe(false);
    expect(context.data.patients.find((patient: { id: string }) => patient.id === secondPatient)).toMatchObject({ role: "reader" });
    const first = await page.request.get(`/api/catalog?careRecipientId=${firstPatient}`);
    expect(first.status()).toBe(404);
    const second = await page.request.get(`/api/catalog?careRecipientId=${secondPatient}`);
    expect(second.ok()).toBeTruthy();
  });

  test("convite é criado, reemitido e revogado pela interface", async ({ page }) => {
    await login(page);
    const patientId = await createPatient(page);
    const email = `manual-${randomUUID()}@example.invalid`;
    await section(page, patientId, "Convites");
    await page.getByLabel("E-mail do convidado", { exact: true }).fill(email);
    await page.getByRole("combobox", { name: "Função neste paciente", exact: true }).selectOption("family");
    const created = await submit(page, "Criar convite", "invitation");
    await expect(page.getByLabel("Link", { exact: true })).toHaveValue(created.invitationUrl);
    expect(new URL(created.invitationUrl).origin).toBe(process.env.NEXT_PUBLIC_APP_URL);
    expect(new URL(created.invitationUrl).hash).toMatch(/^#token=/);
    expect(created.data).not.toHaveProperty("token_hash");
    const row = page.getByRole("listitem").filter({ has: page.getByText(email, { exact: true }) });
    await expect(row).toBeVisible();
    const rotation = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/admin" && response.request().method() === "POST" && response.request().postDataJSON().action === "resendInvitation");
    await row.getByRole("button", { name: "Reemitir link", exact: true }).click();
    const rotatedResponse = await rotation;
    expect(rotatedResponse.ok()).toBeTruthy();
    const rotated = await rotatedResponse.json();
    expect(rotated.invitationUrl).not.toBe(created.invitationUrl);
    await expect(page.getByLabel("Link", { exact: true })).toHaveValue(rotated.invitationUrl);
    const revocation = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/admin" && response.request().method() === "POST" && response.request().postDataJSON().action === "revokeInvitation");
    await row.getByRole("button", { name: "Revogar", exact: true }).click();
    expect((await revocation).ok()).toBeTruthy();
    await expect(page.getByText("Convite revogado.", { exact: true })).toBeVisible();
    const persisted = await (await page.request.get(`/api/admin?section=invitations&careRecipientId=${patientId}`)).json();
    expect(persisted.data).toHaveLength(1);
    expect(persisted.data[0]).toMatchObject({ id: created.data.id, email, role: "family", status: "revoked" });
    expect(persisted.data[0]).not.toHaveProperty("token_hash");
  });

  test("seletores administrativos salvam destinatário e limites por produto e custódia", async ({ page }) => {
    await login(page);
    const patientId = await createPatient(page);
    const userId = fixtures().professional.id;
    expect((await page.request.post("/api/admin", { data: { action: "adoptProduct", careRecipientId: patientId, productId: "fralda" } })).ok()).toBeTruthy();
    expect((await page.request.post("/api/admin", { data: { action: "membership", careRecipientId: patientId, userId, role: "professional", canManageStock: false, canCountStock: true } })).ok()).toBeTruthy();
    await section(page, patientId, "Destinatários");
    await page.getByRole("combobox", { name: "Conta destinatária", exact: true }).selectOption({ label: "Teste professional" });
    await page.getByRole("combobox", { name: "Grupo", exact: true }).selectOption("family");
    await page.getByRole("combobox", { name: "Canal", exact: true }).selectOption("internal");
    await page.getByRole("checkbox", { name: "Família: receber também alertas da equipe", exact: true }).check();
    await submit(page, "Salvar destinatário", "notificationRecipient");
    await expect(page.getByText("Destinatário de notificações salvo.", { exact: true })).toBeVisible();
    await expect(page.getByText("Teste professional · family · internal", { exact: true })).toBeVisible();
    const settings = await (await page.request.get(`/api/admin?section=notificationRecipients&careRecipientId=${patientId}`)).json();
    expect(settings.data).toHaveLength(1);
    expect(settings.data[0]).toMatchObject({ recipient_user_id: userId, recipient_group: "family", channel: "internal", is_enabled: true, include_team_alerts: true });
    await page.getByRole("combobox",{name:"Seção administrativa",exact:true}).selectOption({label:"Alertas"});
    await page.getByRole("combobox", { name: "Item do catálogo", exact: true }).selectOption({ label: "Fralda" });
    await page.getByRole("combobox", { name: "Custódia", exact: true }).selectOption("CARE_TEAM");
    await page.getByLabel("Limite baixo", { exact: true }).fill("5");
    await page.getByLabel("Limite crítico", { exact: true }).fill("2");
    await page.getByRole("checkbox", { name: "Regra habilitada", exact: true }).check();
    await submit(page, "Salvar regra", "alertRule");
    await expect(page.getByText("Fralda · CARE_TEAM · baixo: 5 · crítico: 2 · habilitada", { exact: true })).toBeVisible();
    const alerts = await (await page.request.get(`/api/admin?section=alerts&careRecipientId=${patientId}`)).json();
    expect(alerts.data).toHaveLength(1);
    expect(alerts.data[0]).toMatchObject({ product_id: "fralda", location: "CARE_TEAM", low_threshold: 5, critical_threshold: 2, is_enabled: true });
  });

  test("importação histórica revisada preserva itens extras e estoque desconhecido no comprovante", async ({ page }, testInfo) => {
    await login(page);
    const patientId = await createPatient(page);
    expect((await page.request.post("/api/admin", { data: { action: "adoptProduct", careRecipientId: patientId, productId: "fralda" } })).ok()).toBeTruthy();
    const physicalProtocol = testInfo.project.name === "mobile" ? 10 : 9;
    const protocol = `HC-${String(physicalProtocol).padStart(6, "0")}`;
    const customName = `Nome físico comprovado ${randomUUID().slice(0, 8)}`;
    const rows = [{ physicalProtocol, careRecipientId: patientId, lines: [{ productId: "fralda", currentStock: null, urgent: false }], extraItems: [{ customName, currentStock: null, urgent: true }], observations: ["Origem fictícia revisada para o teste de importação."] }];
    await section(page, patientId, "Importação histórica");
    await expect(page.getByRole("button", { name: "Confirmar importação revisada", exact: true })).toBeDisabled();
    await page.getByLabel("Lote JSON", { exact: true }).fill(JSON.stringify(rows));
    const preview = await submit(page, "Pré-validar lote", "historicalImport");
    expect(preview.data).toMatchObject({ preview: true, total: 1, valid: 1, report: [{ physicalProtocol, status: "valid", unknownStockItems: 2, customItems: 1 }] });
    await expect(page.getByText("Pré-validação concluída.", { exact: true })).toBeVisible();
    const before = await (await page.request.get(`/api/requisitions?careRecipientId=${patientId}&protocol=${protocol}`)).json();
    expect(before.total).toBe(0);
    const committed = await submit(page, "Confirmar importação revisada", "historicalImport");
    expect(committed.data).toMatchObject({ total: 1, imported: 1, rejected: 0, replayed: false });
    await expect(page.getByText("Importação processada. Revise o relatório por registro.", { exact: true })).toBeVisible();
    const after = await (await page.request.get(`/api/requisitions?careRecipientId=${patientId}&protocol=${protocol}`)).json();
    expect(after.total).toBe(1);
    expect(after.data[0]).toMatchObject({ protocol, is_historical: true, created_at: null, requester_name_snapshot: null, status: null });
    const detail = await (await page.request.get(`/api/requisitions/${after.data[0].id}`)).json();
    expect(detail.receipt.lines).toMatchObject([{ productId: "fralda", currentStock: null }]);
    expect(detail.receipt.extraItems).toMatchObject([{ name: customName, currentStock: null, urgent: true }]);
    expect(detail.data.requisition_items.find((item: { custom_name: string | null }) => item.custom_name === customName).product_id).toBeNull();
    expect(detail.data.requisition_notifications).toHaveLength(0);
    await page.goto(`/historico?careRecipientId=${patientId}`);
    await page.getByRole("link").filter({ has: page.getByText(protocol, { exact: true }) }).click();
    await expect(page.getByRole("heading", { name: protocol, exact: true })).toBeVisible();
    await expect(page.getByText("Data: Data original desconhecida", { exact: true })).toBeVisible();
    await expect(page.getByText("Solicitante: Solicitante desconhecido", { exact: true })).toBeVisible();
    await expect(page.getByText(customName, { exact: true })).toBeVisible();
    await expect(page.getByText("Estoque desconhecido", { exact: false })).toHaveCount(2);
    await expect(page.getByText("Nenhuma notificação configurada.", { exact: true })).toBeVisible();
    const retry = await page.request.post("/api/admin", { data: { action: "historicalImport", rows, preview: false } });
    expect(retry.ok()).toBeTruthy();
    expect((await retry.json()).data).toMatchObject({ batchId: committed.data.batchId, imported: 1, replayed: true });
    expect((await (await page.request.get(`/api/requisitions?careRecipientId=${patientId}&protocol=${protocol}`)).json()).total).toBe(1);
  });

  test("sugestões por alias e grafia ambígua só associam o produto após escolha explícita", async ({ page }) => {
    await login(page);
    const patientId = await createPatient(page);
    let productId = "";
    for (const [name, aliases] of [["Gaze", ["Compressa alternativa"]], ["Gaza", []]] as const) {
      const response = await page.request.post("/api/admin", { data: { action: "product", careRecipientId: patientId, id: null, name, category: "higiene", unit: "pacote", aliases, description: null, sortOrder: 0, isActive: true } });
      expect(response.ok()).toBeTruthy();
      const saved = await response.json();
      if (name === "Gaze") productId = saved.data.product_id;
    }
    expect(productId).toBeTruthy();
    await page.goto(`/fichas/req?careRecipientId=${patientId}`);
    for (let step = 0; step < 4; step++) await page.getByRole("button", { name: "Avançar", exact: true }).click();
    await page.getByRole("button", { name: "+ Incluir novo item", exact: true }).click();
    await page.getByLabel("Nome", { exact: true }).fill("compressa alternativa");
    await expect(page.getByText("Nome alternativo reconhecido no catálogo.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Remover item 1", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Usar item do catálogo:/ })).toHaveCount(1);
    await page.getByLabel("Nome", { exact: true }).fill("gazi");
    await expect(page.getByText("Correspondência ambígua: há mais de um item possível. Escolha explicitamente o correto.", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Usar item do catálogo:/ })).toHaveCount(2);
    await page.getByLabel("Estoque atual", { exact: true }).fill("3");
    await page.getByRole("checkbox", { name: "Reposição urgente", exact: true }).check();
    await expect(page.getByRole("button", { name: "Remover item 1", exact: true })).toBeVisible();
    await page.getByRole("button", { name: /^Usar item do catálogo: Gaze \(pacote\)/ }).click();
    await expect(page.getByRole("button", { name: "Remover item 1", exact: true })).toHaveCount(0);
    for (let step = 0; step < 2; step++) await page.getByRole("button", { name: "Continuar", exact: true }).click();
    await expect(page.getByText("Gaze — estoque atual: 3 (urgente)", { exact: true })).toBeVisible();
    const pending = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/requisitions" && response.request().method() === "POST");
    await page.getByRole("button", { name: "Concluir requisição", exact: true }).click();
    const response = await pending;
    expect(response.ok()).toBeTruthy();
    const persisted = await response.json();
    expect(persisted.receipt.lines).toMatchObject([{ productId, productName: "Gaze", currentStock: 3, urgent: true }]);
    expect(persisted.receipt.extraItems).toHaveLength(0);
    await expect(page.getByRole("heading", { name: "Comprovante oficial", exact: true })).toBeVisible();
  });
});
