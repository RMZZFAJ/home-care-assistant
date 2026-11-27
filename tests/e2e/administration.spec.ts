import { selectDocumentSection } from "./document-sections";
import { pressWorkspaceControl } from "./workspace-controls";
import { selectContext } from "./auth-context";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { setup } from "../integration/v4-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { membershipRow, openMembershipDetails } from "./membership-panel";
import {
  assertLocalProject,
  sql,
  fixtureFile,
} from "../../scripts/test-environment.mjs";

type Fixture = { id: string; email: string };

test.describe("administração integrada no ambiente local", () => {
  test.beforeAll(() => {
    if (process.env.HCA_E2E_LOCAL !== "1")
      throw new Error("The verified local browser environment is required.");
    assertLocalProject();
  });
  test.setTimeout(120_000);

  function fixtures(): Record<string, Fixture> {
    assertLocalProject();
    if (process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321")
      throw new Error(
        "Only the verified local development backend is authorized.",
      );
    return JSON.parse(readFileSync(fixtureFile, "utf8"));
  }

  async function login(page: Page, name = "global") {
    await page.goto("/login");
    await page
      .getByLabel("E-mail", { exact: true })
      .fill(fixtures()[name].email);
    await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Visão geral" }).first(),
    ).toBeVisible();
    await selectContext(
      page,
      name === "global" ? null : "20000000-0000-4000-8000-000000000001",
    );
    if (name === "global") {
      await expect(page.getByRole("button", { name: /^Paciente atual/ })).toBeEnabled();
    } else {
      await expect(page.getByRole("combobox", { name: "Pessoa assistida", exact: true })).toBeVisible();
    }
  }

  async function createPatient(page: Page) {
    await selectContext(page, null);
    const response = await page.request.post("/api/admin", {
      data: {
        action: "recipient",
        id: null,
        displayName: `Paciente administrativo ${randomUUID().slice(0, 8)}`,
        isActive: true,
        isDevelopment: true,
        initialAdministratorEmail: fixtures().global.email,
      },
    });
    expect(response.ok()).toBeTruthy();
    const result = await response.json();
    expect(result.data.id).toBeTruthy();
    const patient = result.data.id as string;
    for (const role of ["adminA", "shared", "professional"])
      sql(
        `insert into public.care_recipient_memberships(care_recipient_id,user_id,role) values('${patient}','${fixtures()[role].id}','${role === "adminA" ? "admin" : role === "shared" ? "reader" : "professional"}') on conflict do nothing;`,
      );
    await page.goto(`/admin?careRecipientId=${patient}`);
    await selectContext(page, patient);
    return patient;
  }

  async function section(page: Page, patientId: string, name: string) {
    await page.goto(`/admin?careRecipientId=${patientId}`);
    await selectContext(page, patientId);
    const navigation = page.getByRole("navigation", { name: "Áreas administrativas", exact: true });
    if (name === "Convites") {
      await navigation.getByRole("link", { name: /^Pessoas e convites/ }).click();
      await page.getByRole("navigation", { name: "Pessoas e convites", exact: true }).getByRole("link", { name: /^Convites/ }).click();
    } else if (name === "Destinatários") {
      await navigation.getByRole("link", { name: /^Regras e destinatários/ }).click();
      await page.getByRole("navigation", { name: "Áreas da configuração", exact: true }).getByRole("link", { name: "Avisos", exact: true }).click();
    } else {
      const areas: Record<string, string> = { "Catálogo": "catalog", "Vínculos": "memberships", "Importação histórica": "import" };
      await navigation.locator('a[href*="section=' + areas[name] + '"]').click();
    }
    await expect(page.getByText("Carregando", { exact: false })).toHaveCount(0);
  }

  async function submit(page: Page, name: string, action: string) {
    const pending = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/admin" &&
        response.request().method() === "POST" &&
        response.request().postDataJSON().action === action,
    );
    await page.getByRole("button", { name, exact: true }).click();
    const response = await pending;
    expect(response.ok()).toBeTruthy();
    return response.json();
  }

  test("catálogo edita nomes alternativos e inativa preservando a identidade", async ({
    page,
  }) => {
    await login(page);
    const patientId = await createPatient(page);
    const originalName = `Material administrativo ${randomUUID().slice(0, 8)}`;
    const finalName = `${originalName} revisado`;
    await section(page, patientId, "Catálogo");
    await page.getByRole("button", { name: "Novo item", exact: true }).click();
    const creation = page.getByRole("dialog", { name: "Novo material", exact: true });
    const initialName = creation.getByRole("textbox", { name: "Nome do material", exact: true });
    await expect(initialName).toBeEditable();
    await initialName.focus();
    await expect(initialName).toBeFocused();
    await initialName.pressSequentially(originalName);
    await expect(initialName).toHaveValue(originalName);
    await page
      .getByRole("combobox", { name: "Tipo de material", exact: true })
      .selectOption("higiene");
    await page.getByLabel("Unidade de controle", { exact: true }).selectOption("pacote");
    await page
      .getByLabel("Nomes alternativos", { exact: true })
      .fill("Material auxiliar, Apoio operacional");
    const record = async (editor: Locator, name: string, action: "Adicionar material" | "Salvar cadastro", result: string) => {
      await expect(editor.getByRole("textbox", { name: "Nome do material", exact: true })).toHaveValue(name);
      await editor.getByRole("button", { name: "Revisar material", exact: true }).press("Enter");
      const confirmation = page.getByRole("dialog", { name: action + "?", exact: true });
      await expect(confirmation).toBeVisible();
      const [response] = await Promise.all([
        page.waitForResponse(response => new URL(response.url()).pathname === "/api/admin/catalogue-actions" && response.request().method() === "POST"),
        confirmation.getByRole("button", { name: action, exact: true }).press("Enter"),
      ]);
      expect(response.ok()).toBe(true);
      await page.getByRole("dialog", { name: result, exact: true }).getByRole("button", { name: "Concluir", exact: true }).click();
      return response.json();
    };
    const created = await record(creation, originalName, "Adicionar material", "Material adicionado");
    expect(created).toMatchObject({ state: "recorded", purpose: "create" });
    const productId = created.outcome.productId as string;
    expect(productId).toBeTruthy();
    await expect(creation).toBeHidden();
    await page.locator("[data-product-id]").filter({ hasText: originalName }).click();
    await page.getByRole("dialog", { name: originalName, exact: true }).getByRole("button", { name: /^Editar cadastro/ }).click();
    const edition = page.getByRole("dialog", { name: "Editar material", exact: true });
    await expect(edition).toBeVisible();
    await expect(
      page.getByLabel("Nomes alternativos", {
        exact: true,
      }),
    ).toHaveValue("Material auxiliar, Apoio operacional");
    await page.getByLabel("Nome do material", { exact: true }).fill(finalName);
    await page
      .getByLabel("Nomes alternativos", { exact: true })
      .fill("Material auxiliar revisado, Apoio operacional");
    await record(edition, finalName, "Salvar cadastro", "Cadastro atualizado");
    const material = page.getByRole("dialog", { name: finalName, exact: true });
    await expect(edition).toHaveCount(0);
    await pressWorkspaceControl(page, material.getByRole("button", { name: /^Situação e sucessor/ }));
    const identity = page.getByRole("dialog", { name: "Situação do material", exact: true });
    await expect(identity).toBeVisible();
    await identity.getByRole("button", { name: "Inativar material", exact: true }).click();
    const identityEditor = page.getByRole("dialog", { name: "Inativar material", exact: true });
    await identityEditor.getByLabel("Motivo da decisão", { exact: true }).fill("Identidade preservada durante a revisão do cadastro.");
    await identityEditor.getByRole("button", { name: "Revisar efeito", exact: true }).click();
    await page.getByRole("dialog", { name: "Confirmar efeito no catálogo?", exact: true })
      .getByRole("button", { name: "Confirmar decisão", exact: true }).click();
    await page.getByRole("dialog", { name: "Situação registrada", exact: true })
      .getByRole("button", { name: "Concluir", exact: true }).click();
    await expect(identity).toHaveCount(0);
    await material.getByRole("button", { name: "Voltar", exact: true }).click();
    await page.getByRole("combobox", { name: "Situação dos produtos", exact: true }).selectOption("inactive");
    const article = page.locator("[data-product-id]").filter({ hasText: finalName });
    await expect(article.getByText("Inativo", { exact: true })).toBeVisible();
    await expect(article).toContainText("pacote");
    const all = await (
      await page.request.get(
        `/api/catalog?careRecipientId=${patientId}&includeInactive=true`,
      )
    ).json();
    expect(all.data).toHaveLength(1);
    expect(all.data[0]).toMatchObject({
      id: productId,
      name: finalName,
      is_active: false,
      unit: "pacote",
      aliases: ["Material auxiliar revisado", "Apoio operacional"],
    });
    const available = await (
      await page.request.get(`/api/catalog?careRecipientId=${patientId}`)
    ).json();
    expect(available.data).toHaveLength(0);
  });

  test("administrador local revoga um vínculo sem alterar acesso da mesma conta a outro paciente", async ({
    page,
  }) => {
    await login(page);
    const firstPatient = await createPatient(page);
    const secondPatient = await createPatient(page);
    const shared = fixtures().shared;
    for (const [patientId, role] of [
      [firstPatient, "professional"],
      [secondPatient, "reader"],
    ]) {
      await section(page, patientId, "Vínculos");
      await page.getByRole("button", { name: "Vincular pessoa", exact: true }).click();
      await page
        .getByRole("combobox", { name: "Conta a vincular", exact: true })
        .selectOption(shared.id);
      await page
        .getByRole("combobox", { name: "Função na residência", exact: true })
        .selectOption(role);
      await page.getByRole("button", { name: "Revisar vínculo", exact: true }).click();
      await page.getByRole("dialog", { name: "Confirmar vínculo?", exact: true }).getByRole("button", { name: "Salvar vínculo", exact: true }).click();
      await page.getByRole("dialog", { name: "Vínculo atualizado", exact: true }).getByRole("button", { name: "Concluir", exact: true }).click();
      await expect(membershipRow(page, "Teste shared")).toBeVisible();
    }
    await page.goto(`/admin?careRecipientId=${firstPatient}`);
    await selectContext(page, firstPatient);
    const localAdmin = await page.request.post("/api/admin", {
      data: {
        action: "membership",
        careRecipientId: firstPatient,
        userId: fixtures().adminA.id,
        role: "admin",
        canManageStock: true,
        canCountStock: true,
      },
    });
    expect(localAdmin.ok()).toBeTruthy();
    await page.getByLabel("Menu do usuário", { exact: true }).click();
    await page.getByRole("menuitem", { name: "Sair", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await login(page, "adminA");
    await section(page, firstPatient, "Vínculos");
    await expect(
      page.getByRole("button", { name: "Contas globais", exact: true }),
    ).toHaveCount(0);
    const member = await openMembershipDetails(page, "Teste shared");
    const revoked = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/admin/memberships" &&
        response.request().method() === "POST" &&
        response.request().postDataJSON().purpose === "membershipStatus",
    );
    await member.getByRole("button", { name: /^Revisar desligamento/ }).click();
    await page.getByRole("dialog", { name: "Revisar desligamento", exact: true }).getByRole("button", { name: "Revogar vínculo", exact: true }).click();
    await page.getByRole("button", { name: "Revogar agora", exact: true }).click();
    expect((await revoked).ok()).toBeTruthy();
    await page.getByRole("dialog", { name: "Vínculo revogado", exact: true }).getByRole("button", { name: "Concluir", exact: true }).click();
    await expect(membershipRow(page, "Teste shared").getByText("Revogado", { exact: true })).toBeVisible();
    const forbidden = await page.request.get(
      `/api/admin?section=memberships&careRecipientId=${secondPatient}`,
    );
    expect(forbidden.status()).toBe(404);
    await page.getByLabel("Menu do usuário", { exact: true }).click();
    await page.getByRole("menuitem", { name: "Sair", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await login(page, "shared");
    const context = await (await page.request.get("/api/context")).json();
    expect(context.data.isGlobalAdmin).toBe(false);
    expect(
      context.data.patients.some(
        (patient: { id: string }) => patient.id === firstPatient,
      ),
    ).toBe(false);
    expect(
      context.data.patients.find(
        (patient: { id: string }) => patient.id === secondPatient,
      ),
    ).toMatchObject({ role: "reader" });
    const first = await page.request.get(
      `/api/catalog?careRecipientId=${firstPatient}`,
    );
    expect(first.status()).toBe(404);
    await page.goto(`/historico?careRecipientId=${secondPatient}`);
    await selectContext(page, secondPatient);
    const second = await page.request.get(
      `/api/catalog?careRecipientId=${secondPatient}`,
    );
    expect(second.ok()).toBeTruthy();
  });

  test("convite é criado, reemitido e revogado pela interface", async ({
    page,
  }, info) => {
    await login(page);
    const patientId = await createPatient(page);
    const email = `paula.${randomUUID().slice(0, 8)}@example.invalid`;
    await section(page, patientId, "Convites");
    const nextCommand = (action: string) => page.waitForResponse(response =>
      new URL(response.url()).pathname === "/api/admin/invitations" && response.request().method() === "POST" && response.request().postDataJSON().intent?.action === action);
    await page.getByRole("button", { name: "Novo convite", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Novo convite", exact: true });
    await editor.getByLabel("E-mail do destinatário", { exact: true }).fill(email);
    await editor.getByRole("combobox", { name: "Função neste paciente", exact: true }).selectOption("family");
    const creation = nextCommand("create");
    await editor.getByRole("button", { name: "Criar convite", exact: true }).click();
    const creationResponse = await creation;
    expect(creationResponse.ok()).toBeTruthy();
    const created = await creationResponse.json();
    const success = page.getByRole("dialog", { name: "Convite criado", exact: true });
    await expect(success.getByLabel("Link", { exact: true })).toHaveValue(created.invitationUrl);
    expect(new URL(created.invitationUrl).origin).toBe(
      process.env.NEXT_PUBLIC_APP_URL,
    );
    expect(new URL(created.invitationUrl).hash).toMatch(/^#token=/);
    expect(created.invitation).not.toHaveProperty("token_hash");
    await success.getByRole("button", { name: "Concluir", exact: true }).click();
    const row = page.getByRole("list", { name: "Convites da residência", exact: true }).getByRole("button").filter({ hasText: email });
    await expect(row).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Pessoas e convites", exact: true }).getByRole("link", { name: /^Convites/ })).toContainText("1");
    const evidence = "output/playwright/l4-residencia";
    mkdirSync(evidence, { recursive: true });
    for (const width of [360, 412]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
      await page.screenshot({ path: `${evidence}/app-invitations-${info.project.name}-${width}.png`, scale: "css" });
    }
    await row.click();
    const details = page.getByRole("dialog", { name: "Convite da residência", exact: true });
    await details.getByRole("button", { name: "Reemitir link", exact: true }).click();
    const rotation = nextCommand("reissue");
    await page.getByRole("dialog", { name: "Reemitir convite?", exact: true }).getByRole("button", { name: "Reemitir convite", exact: true }).click();
    const rotatedResponse = await rotation;
    expect(rotatedResponse.ok()).toBeTruthy();
    const rotated = await rotatedResponse.json();
    expect(rotated.invitationUrl).not.toBe(created.invitationUrl);
    const replacement = page.getByRole("dialog", { name: "Novo link disponível", exact: true });
    await expect(replacement.getByLabel("Link", { exact: true })).toHaveValue(rotated.invitationUrl);
    const expiredLink = new URLSearchParams(new URL(created.invitationUrl).hash.slice(1)).get("token");
    const oldPreview = await page.request.post("/api/invitations/preview", { data: { token: expiredLink } });
    expect((await oldPreview.json()).data).toEqual({ state: "invalid" });
    await replacement.getByRole("button", { name: "Concluir", exact: true }).click();
    await row.click();
    await details.getByRole("button", { name: "Revogar", exact: true }).click();
    const revocation = nextCommand("revoke");
    await page.getByRole("dialog", { name: "Revogar convite?", exact: true }).getByRole("button", { name: "Revogar convite", exact: true }).click();
    expect((await revocation).ok()).toBeTruthy();
    await expect(
      page.getByRole("dialog", { name: "Convite revogado", exact: true }),
    ).toBeVisible();
    const persisted = await (
      await page.request.get(
        `/api/admin/invitations?careRecipientId=${patientId}`,
      )
    ).json();
    expect(persisted.data).toHaveLength(1);
    expect(persisted.data[0]).toMatchObject({
      id: created.invitation.id,
      email,
      role: "family",
      status: "revoked",
    });
    expect(persisted.data[0]).not.toHaveProperty("token_hash");
  });

  test("E10-02 recupera convite após perder a resposta sem gerar um segundo link", async ({ page }) => {
    const syncDuringEntry: string[] = [];
    const entry = page.waitForResponse(response => {
      const url = new URL(response.url());
      return url.pathname === "/api/context" && url.searchParams.get("view") === "entry";
    });
    page.on("request", request => {
      const path = new URL(page.url()).pathname;
      if (new URL(request.url()).pathname === "/api/sync" && ["/login", "/acesso/continuar"].includes(path)) syncDuringEntry.push(path);
    });
    await login(page);
    expect(syncDuringEntry).toEqual([]);
    const entryResponse = await entry;
    expect(entryResponse.status()).toBe(200);
    const { data: entryContext } = await entryResponse.json();
    expect(entryContext.isGlobalAdmin).toBe(true);
    expect(entryContext.patients).toEqual([]);
    expect(entryContext).not.toHaveProperty("avatarUrl");
    const patientId = await createPatient(page);
    const email = `residencia-${randomUUID()}@example.invalid`;
    await section(page, patientId, "Convites");
    await page.getByRole("button", { name: "Novo convite", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Novo convite", exact: true });
    await editor.getByLabel("E-mail do destinatário", { exact: true }).fill(email);
    let original: { careRecipientId: string; key: string; intent: object } | undefined;
    await page.route("**/api/admin/invitations", async route => {
      if (route.request().method() !== "POST") { await route.continue(); return; }
      original = route.request().postDataJSON();
      expect((await route.fetch()).status()).toBe(200);
      await route.abort();
    });
    await editor.getByRole("button", { name: "Criar convite", exact: true }).click();
    const failure = page.getByRole("dialog", { name: "Não foi possível confirmar o convite", exact: true });
    await expect(failure).toBeVisible();
    await page.unroute("**/api/admin/invitations");
    await page.reload();
    await page.getByRole("button", { name: "Conferir resultado", exact: true }).click();
    const request = page.waitForRequest(req => req.method() === "POST" && new URL(req.url()).pathname === "/api/admin/invitations");
    await failure.getByRole("button", { name: "Conferir resultado", exact: true }).click();
    expect((await request).postDataJSON()).toEqual({ careRecipientId: patientId, key: original?.key, intent: null });
    const result = page.getByRole("dialog", { name: "Convite criado", exact: true });
    await expect(result.getByText(/Para encaminhar um link, reemita/)).toBeVisible();
    await expect(result.getByLabel("Link", { exact: true })).toHaveCount(0);
    const replay = await page.request.post("/api/admin/invitations", { data: original });
    expect(replay.ok()).toBeTruthy();
    expect(await replay.json()).not.toHaveProperty("invitationUrl");
    const { data } = await (await page.request.get(`/api/admin/invitations?careRecipientId=${patientId}`)).json();
    expect(data).toHaveLength(1);
    expect(data[0]).toMatchObject({ email, status: "pending" });
  });

  test("seletores administrativos salvam destinatário e limites por produto e custódia", async ({
    page,
  }) => {
    await login(page);
    const patientId = await createPatient(page);
    const userId = fixtures().professional.id;
    expect(
      (
        await page.request.post("/api/admin", {
          data: {
            action: "adoptProduct",
            careRecipientId: patientId,
            productId: "fralda",
          },
        })
      ).ok(),
    ).toBeTruthy();
    expect(
      (
        await page.request.post("/api/admin", {
          data: {
            action: "membership",
            careRecipientId: patientId,
            userId,
            role: "professional",
            canManageStock: false,
            canCountStock: true,
          },
        })
      ).ok(),
    ).toBeTruthy();
    await section(page, patientId, "Destinatários");
    const recipients = page.getByRole("region", { name: "Destinatários", exact: true });
    await recipients.getByRole("button", { name: "Adicionar", exact: true }).click();
    const recipient = page.getByRole("dialog", { name: "Adicionar destinatário", exact: true });
    await recipient.getByRole("combobox", { name: "Pessoa vinculada", exact: true }).selectOption({ label: "Teste professional" });
    await recipient.getByRole("combobox", { name: "Canal", exact: true }).selectOption("internal");
    await recipient.getByRole("combobox", { name: "Grupo", exact: true }).selectOption("family");
    await recipient.getByRole("switch", { name: "Receber alertas da equipe", exact: true }).check();
    await recipient.getByRole("button", { name: "Salvar destinatário", exact: true }).click();
    await page.getByRole("dialog", { name: "Destinatário registrado", exact: true }).getByRole("button", { name: "Concluir", exact: true }).click();
    await expect(recipients.getByRole("button", { name: /Teste professional.*Família.*Aplicativo/ })).toBeVisible();
    const settings = await (await page.request.get(`/api/admin?section=notificationRecipients&careRecipientId=${patientId}`)).json();
    expect(settings.data).toHaveLength(1);
    expect(settings.data[0]).toMatchObject({
      recipient_user_id: userId, recipient_group: "family", channel: "internal", is_enabled: true, include_team_alerts: true,
    });
    await page.getByRole("navigation", { name: "Áreas da configuração", exact: true }).getByRole("link", { name: "Estoque", exact: true }).click();
    await page.getByRole("button", { name: "Adicionar limite", exact: true }).click();
    const limit = page.getByRole("dialog", { name: "Limite de estoque", exact: true });
    await limit.getByRole("combobox", { name: "Material", exact: true }).selectOption({ label: "Fralda" });
    await limit.getByRole("combobox", { name: "Estoque", exact: true }).selectOption("CARE_TEAM");
    await limit.getByRole("textbox", { name: "Avisar estoque baixo a partir de", exact: true }).fill("5");
    await limit.getByRole("textbox", { name: "Avisar estoque crítico a partir de", exact: true }).fill("2");
    await limit.getByRole("switch", { name: "Regra habilitada", exact: true }).check();
    await limit.getByRole("button", { name: "Salvar limite", exact: true }).click();
    await page.getByRole("dialog", { name: "Limite registrado", exact: true }).getByRole("button", { name: "Concluir", exact: true }).click();
    await expect(page.getByRole("button", { name: /Fralda.*Equipe.*baixo: 5.*crítico: 2.*Ativo/ })).toBeVisible();
    const alerts = await (await page.request.get(`/api/admin?section=alerts&careRecipientId=${patientId}`)).json();
    expect(alerts.data).toHaveLength(1);
    expect(alerts.data[0]).toMatchObject({ product_id: "fralda", location: "CARE_TEAM", low_threshold: 5, critical_threshold: 2, is_enabled: true });
  });

  test("importação histórica revisada preserva itens extras e estoque desconhecido no comprovante", async ({
    page,
  }) => {
    await login(page);
    const patientId = await createPatient(page);
    expect(
      (
        await page.request.post("/api/admin", {
          data: {
            action: "adoptProduct",
            careRecipientId: patientId,
            productId: "fralda",
          },
        })
      ).ok(),
    ).toBeTruthy();
    const physicalProtocol = Number(
      sql(
        "select coalesce(max(physical_protocol),0)+1 from public.historical_requisition_imports",
      ),
    );
    const protocol = `HC-${String(physicalProtocol).padStart(6, "0")}`;
    const customName = `Nome físico comprovado ${randomUUID().slice(0, 8)}`;
    const rows = [
      {
        physicalProtocol,
        careRecipientId: patientId,
        lines: [{ productId: "fralda", currentStock: null, urgent: false }],
        extraItems: [{ customName, currentStock: null, urgent: true }],
        observations: ["Origem fictícia revisada para o teste de importação."],
      },
    ];
    await section(page, patientId, "Importação histórica");
    await expect(
      page.getByRole("button", {
        name: "Confirmar importação revisada",
        exact: true,
      }),
    ).toBeDisabled();
    await page
      .getByLabel("Lote JSON", { exact: true })
      .fill(JSON.stringify(rows));
    const preview = await submit(page, "Pré-validar lote", "historicalImport");
    expect(preview.data).toMatchObject({
      preview: true,
      total: 1,
      valid: 1,
      report: [
        {
          physicalProtocol,
          status: "valid",
          unknownStockItems: 2,
          customItems: 1,
        },
      ],
    });
    await expect(
      page.getByText("Pré-validação concluída.", { exact: true }),
    ).toBeVisible();
    const before = await (
      await page.request.get(
        `/api/requisitions?careRecipientId=${patientId}&protocol=${protocol}`,
      )
    ).json();
    expect(before.total).toBe(0);
    const committed = await submit(
      page,
      "Confirmar importação revisada",
      "historicalImport",
    );
    expect(committed.data).toMatchObject({
      total: 1,
      imported: 1,
      rejected: 0,
      replayed: false,
    });
    await expect(
      page.getByText(
        "Importação processada. Revise o relatório por registro.",
        { exact: true },
      ),
    ).toBeVisible();
    const after = await (
      await page.request.get(
        `/api/requisitions?careRecipientId=${patientId}&protocol=${protocol}`,
      )
    ).json();
    expect(after.total).toBe(1);
    expect(after.data[0]).toMatchObject({
      protocol,
      is_historical: true,
      created_at: null,
      requester_name_snapshot: null,
      status: null,
    });
    const detail = await (
      await page.request.get(`/api/requisitions/${after.data[0].id}`)
    ).json();
    expect(detail.receipt.lines).toMatchObject([
      { productId: "fralda", currentStock: null, stockObservation: "legacy_unclassified" },
    ]);
    expect(detail.receipt.extraItems).toMatchObject([
      { name: customName, currentStock: null, urgent: true, stockObservation: "legacy_unclassified" },
    ]);
    expect(
      detail.data.requisition_items.find(
        (item: { custom_name: string | null }) =>
          item.custom_name === customName,
      ).product_id,
    ).toBeNull();
    expect(detail.data.requisition_notifications).toHaveLength(0);
    await page.goto(`/historico?careRecipientId=${patientId}`);
    await page
      .getByRole("link")
      .filter({ has: page.getByText(protocol, { exact: true }) })
      .click();
    await expect(
      page.getByRole("heading", { name: protocol, exact: true }),
    ).toBeVisible();
    const metadata = page.locator(".hca-document-meta > div");
    await expect(
      metadata
        .filter({ has: page.locator("dt", { hasText: /^Registro original$/ }) })
        .locator("dd"),
    ).toHaveText("Data original desconhecida");
    await selectDocumentSection(page, "history");
    await page.getByRole("button", { name: "Linha do tempo", exact: true }).click();
  await page.getByRole("button", { name: "Comparar versões", exact: true }).click();
    await expect(page.getByRole("article", { name: /^Conteúdo preservado da versão \d+$/ })).toBeVisible();
    await expect(
      metadata
        .filter({ has: page.locator("dt", { hasText: /^Solicitante$/ }) })
        .locator("dd"),
    ).toHaveText("Solicitante desconhecido");
    await selectDocumentSection(page, "materials");
    const materials = page.getByRole("list", { name: "Materiais requisitados", exact: true });
    const materialRows = materials.getByRole("listitem");
    await expect(materialRows).toHaveCount(2);
    await expect(
      materials
        .locator("strong")
        .filter({ hasText: new RegExp("^" + customName + "$") }),
    ).toBeVisible();
    for (const item of await materialRows.all()) {
      await expect(item.getByText("Não informado no registro legado", { exact: true })).toBeVisible();
    }
    await selectDocumentSection(page, "communications");

    await expect(page.getByText("Nenhuma comunicação registrada para esta ficha.", { exact: true })).toBeVisible();
    const retry = await page.request.post("/api/admin", {
      data: { action: "historicalImport", rows, preview: false },
    });
    expect(retry.ok()).toBeTruthy();
    expect((await retry.json()).data).toMatchObject({
      batchId: committed.data.batchId,
      imported: 1,
      replayed: true,
    });
    expect(
      (
        await (
          await page.request.get(
            `/api/requisitions?careRecipientId=${patientId}&protocol=${protocol}`,
          )
        ).json()
      ).total,
    ).toBe(1);
  });

  test("sugestões por alias e grafia ambígua só associam o produto após escolha explícita", async ({
    page,
  }, info) => {
    test.setTimeout(180_000);
    const { patient: patientId, products: [productId] } = await setup({
      catalogue: [
        { name: "Gaze", aliases: ["Compressa alternativa"], category: "higiene", unit: "pacote" },
        { name: "Gaza", aliases: [], category: "dieta", unit: "pacote" },
      ],
    });
    const writer = await shiftWorker(patientId);
    await page.goto("/login");
    await page.getByLabel("E-mail", { exact: true }).fill(writer.email);
    await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page.waitForURL(url => url.pathname === "/");
    await page.goto(`/fichas/req?careRecipientId=${patientId}`);
    const next = page.getByRole("button", { name: /^(Selecionar materiais|Continuar)$/ });
    await next.click();
    await page
      .getByRole("button", { name: "Item extra", exact: true })
      .click();
    const extra = page.getByRole("dialog", { name: "Adicionar item extra", exact: true });
    const name = extra.getByRole("textbox", { name: "Nome do material", exact: true });
    await name.fill("compressa alternativa");
    await expect(extra.getByText("É um destes materiais?", { exact: true })).toBeVisible();
    await info.attach("extra-req-sugestoes", { body: await extra.screenshot(), contentType: "image/png" });
    await expect(
      page.getByRole("button", { name: /^Usar item do catálogo:/ }),
    ).toHaveCount(1);
    await name.fill("gazi");
    await expect(
      page.getByRole("button", { name: /^Usar item do catálogo:/ }),
    ).toHaveCount(2);
    await extra.getByRole("combobox", { name: "Informação do estoque da equipe" }).selectOption("observed");
    await extra.getByLabel("Estoque atual", { exact: false }).fill("3");
    await page
      .getByRole("checkbox", { name: "Reposição urgente", exact: true })
      .check();
    await extra.getByRole("textbox", { name: "Detalhes para identificar", exact: true }).fill("Usar no kit do plantão.");
    await page
      .getByRole("button", { name: /^Usar item do catálogo: Gaze \(pacote\)/ })
      .click();
    await expect(extra).toHaveCount(0);
    const gaze = page.locator(".hca-wizard-material").filter({ has: page.getByRole("checkbox", { name: "Gaze", exact: false }) });
    await expect(gaze.getByLabel("Estoque atual · pacote", { exact: true })).toHaveValue("3");
    await expect(gaze.locator("label.hca-wizard-material-urgent")).toHaveCSS("color", "rgb(157, 48, 67)");
    await next.click();
    const diet = page.getByRole("button", { name: /^Dieta/, pressed: true });
    await expect(diet).toBeVisible();
    await next.click();
    await expect(page.getByText("Nenhum item extra incluído.", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Adicionar item extra", exact: true }).click();
    await name.fill("Gaza");
    await extra.getByRole("button", { name: /^Usar item do catálogo: Gaza \(pacote\)/ }).click();
    await expect(diet).toBeVisible();
    await page.getByRole("checkbox", { name: /^Gaza\b/ }).uncheck();
    const details = "Usar no kit da noite.";
    await expect.poll(async () => {
      const response = await page.request.get(`/api/drafts?careRecipientId=${patientId}&kind=REQ`);
      const saved = (await response.json()).data;
      return { observations: saved?.content?.observations, lines: saved?.content?.lines?.length, stage: saved?.navigation?.stage };
    }).toEqual({ observations: ["Usar no kit do plantão."], lines: 1, stage: "dieta" });
    await page.reload();
    await expect(page.getByRole("dialog", { name: "Continuar o preenchimento?" })).toContainText("Gaze");
    await page.getByRole("button", { name: "Continuar rascunho", exact: true }).click();
    await expect(diet).toBeVisible();
    await next.click();
    await expect(page.getByText("Nenhum item extra incluído.", { exact: true })).toBeVisible();
    await next.click();
    const observation = page.locator(".hca-issuance-observations textarea");
    await expect(observation).toHaveValue("Usar no kit do plantão.");
    await observation.fill(details);
    await page.getByRole("button", { name: "Revisar ficha", exact: true }).click();
    const reviewMaterial = page.locator(".hca-material-review li").filter({
      has: page.locator("strong").filter({ hasText: /^Gaze$/ }),
    });
    await expect(reviewMaterial).toHaveCount(1);
    await expect(reviewMaterial.locator("xpath=ancestor::section[1]").getByRole("heading", { name: "Higiene", exact: true })).toBeVisible();
    await expect(reviewMaterial.getByText("Gaze", { exact: true })).toBeVisible();
    await expect(reviewMaterial.getByText("Estoque atual da equipe: 3 pacote", { exact: true })).toBeVisible();
    await expect(reviewMaterial.getByText("Urgente", { exact: true })).toBeVisible();
    await expect(page.getByText(details, { exact: true })).toBeVisible();
    await reviewMaterial.getByRole("button", { name: "Editar material Gaze", exact: true }).click();
    await expect(page.getByLabel("Estoque atual · pacote", { exact: true })).toBeFocused();
    await expect(page.getByLabel("Estoque atual · pacote", { exact: true })).toHaveValue("3");
    await next.click();
    await next.click();
    await next.click();
    await page.getByRole("button", { name: "Revisar ficha", exact: true }).click();
    await expect(page.getByRole("button", { name: "Editar itens extras", exact: true })).toBeVisible();
    const pending = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/requisitions" &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Emitir requisição", exact: true })
      .click();
    const response = await pending;
    expect(response.ok()).toBeTruthy();
    const persisted = await response.json();
    expect(persisted.receipt.lines).toMatchObject([
      { productId, productName: "Gaze", currentStock: 3, urgent: true },
    ]);
    expect(persisted.receipt.lines).toHaveLength(1);
    expect(persisted.receipt.lines[0].catalogueExtra).toBeFalsy();
    expect(persisted.receipt.extraItems).toHaveLength(0);
    const issued = page.getByRole("dialog", { name: "Requisição emitida", exact: true });
    await expect(issued).toBeVisible({ timeout: 65_000 });
    const pdf = await page.request.get((await issued.getByRole("link", { name: "Baixar PDF", exact: true }).getAttribute("href"))!);
    expect(pdf.status()).toBe(200);
    const retiredByAnotherTab = Promise.withResolvers<void>();
    await page.route("**/api/drafts", async route => {
      const request = route.request();
      if (request.method() !== "POST" || request.postDataJSON().action !== "acknowledge") return route.continue();
      const otherTab = await route.fetch({ postData: { ...request.postDataJSON(), idempotencyKey: randomUUID() } });
      try {
        expect(otherTab.ok(), await otherTab.text()).toBe(true);
        const stale = await route.fetch();
        expect(stale.status()).toBe(409);
        await route.fulfill({ response: stale });
        retiredByAnotherTab.resolve();
      } catch (reason) {
        retiredByAnotherTab.reject(reason);
        throw reason;
      }
    });
    await page.goto(`/fichas/req?careRecipientId=${patientId}`);
    await retiredByAnotherTab.promise;
    await expect(page.getByRole("button", { name: "Selecionar materiais", exact: true })).toBeEnabled();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
