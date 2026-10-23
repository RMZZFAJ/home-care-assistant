import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { fixtureFile, sql } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";

test.setTimeout(180_000);
test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "wait" });
});
const fixtures = () => JSON.parse(readFileSync(fixtureFile, "utf8"));
async function login(page: Page, role: string, patient: string | null) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures()[role].email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
}
async function post(page: Page, path: string, data: unknown) {
  const response = await page.request.post(path, { data });
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json();
}
async function setup(page: Page) {
  await login(page, "global", null);
  const patient = (
    await post(page, "/api/admin", {
      action: "recipient",
      id: null,
      displayName: "Paciente V4 visual " + randomUUID().slice(0, 8),
      isActive: true,
      isDevelopment: true,
      initialAdministratorEmail: fixtures().adminA.email,
    })
  ).data.id as string;
  for (const role of ["family", "professional", "reader"])
    sql(
      "insert into public.care_recipient_memberships(care_recipient_id,user_id,role) values('" +
        patient +
        "','" +
        fixtures()[role].id +
        "','" +
        role +
        "')",
    );
  await page.getByLabel("Menu do usuário", { exact: true }).click();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await login(page, "adminA", patient);
  const product = (
    await post(page, "/api/admin", {
      action: "product",
      careRecipientId: patient,
      id: null,
      name: "Material V4 visual",
      category: "higiene",
      unit: "unidade",
      aliases: [],
      isActive: true,
    })
  ).data.product_id as string;
  return { patient, product };
}

test("V4: dois usuários ao vivo, duplicidade contextual, ciência automática e compartilhamento do arquivo", async ({
  page,
  browser,
}) => {
  const { patient, product } = await setup(page);
  const settings = (
    await (
      await page.request.get("/api/patient-settings?careRecipientId=" + patient)
    ).json()
  ).data;
  await post(page, "/api/patient-settings", {
    careRecipientId: patient,
    kind: "settings",
    change: { scienceAutomatic: true, scienceByDispatch: false },
    idempotencyKey: randomUUID(),
    expectedVersion: settings.version,
  });
  const familyContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    proContext = await browser.newContext({
      viewport: { width: 1366, height: 900 },
    });
  try {
    const family = await familyContext.newPage(),
      pro = await proContext.newPage();
    await family.addInitScript(() => {
      Object.defineProperty(navigator, "canShare", {
        configurable: true,
        value: () => true,
      });
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: async (data: ShareData) => {
          const file = data.files?.[0];
          (
            window as unknown as {
              sharedPdf?: {
                name: string;
                bytes: number;
                type: string;
                header: string;
              };
            }
          ).sharedPdf = file
            ? {
                name: file.name,
                bytes: file.size,
                type: file.type,
                header: await file.slice(0, 5).text(),
              }
            : undefined;
        },
      });
    });
    await login(family, "family", patient);
    await family.goto("/perfil?careRecipientId=" + patient);
    await family
      .getByRole("checkbox", { name: /Automática por eventos autorizados/ })
      .check();
    await family
      .getByRole("button", { name: "Salvar perfil", exact: true })
      .click();
    await expect(
      family.getByText("Perfil atualizado.", { exact: true }),
    ).toBeVisible();
    await family.goto("/historico?careRecipientId=" + patient);
    await login(pro, "professional", patient);
    const receipt = (
      await post(pro, "/api/requisitions", {
        careRecipientId: patient,
        idempotencyKey: randomUUID(),
        lines: [{ productId: product, currentStock: 0, urgent: true }],
        extraItems: [],
        observations: [],
      })
    ).receipt;
    await expect(
      family.getByRole("link").filter({ hasText: receipt.code }),
    ).toBeVisible({ timeout: 20000 });
    await pro.goto("/fichas/req?careRecipientId=" + patient);
    for (let i = 0; i < 2; i++)
      await pro.getByRole("button", { name: "Avançar", exact: true }).click();
    await pro.getByRole("checkbox", { name: /Material V4 visual/ }).click();
    const duplicate = pro.getByRole("dialog", {
      name: "Este produto já está em uma requisição pendente",
      exact: true,
    });
    await expect(duplicate).toBeVisible();
    await duplicate
      .getByRole("button", { name: receipt.code, exact: true })
      .click();
    const related = pro.getByRole("dialog", {
      name: receipt.code,
      exact: true,
    });
    await expect(
      related.getByText("Material V4 visual", { exact: false }),
    ).toBeVisible();
    await related
      .getByRole("button", { name: "Fechar diálogo", exact: true })
      .click();
    const justification = duplicate.getByLabel(
      "Justificativa da nova requisição",
    );
    await justification.fill("Necessidade revisada após consulta contextual");
    await family.getByRole("link").filter({ hasText: receipt.code }).click();
    await expect(
      family.getByText("Automática · conteúdo exibido", { exact: false }),
    ).toBeVisible({ timeout: 15000 });
    await expect(justification).toHaveValue(
      "Necessidade revisada após consulta contextual",
    );
    await duplicate
      .getByRole("button", { name: "Manter nova requisição", exact: true })
      .click();
    await expect(
      pro.getByRole("checkbox", { name: /Material V4 visual/ }),
    ).toBeChecked();
    await pro.goto("/historico/" + receipt.requisitionId);
    await expect(
      pro.getByText("Automática · conteúdo exibido", { exact: false }),
    ).toBeVisible();
    await expect(
      pro.getByRole("listitem").filter({ hasText: "Material V4 visual" }),
    ).toHaveCount(1);
    await expect(
      family.getByRole("button", { name: "Compartilhar PDF", exact: true }),
    ).toBeEnabled({ timeout: 15000 });
    await family
      .getByRole("button", { name: "Compartilhar PDF", exact: true })
      .click();
    await expect
      .poll(() =>
        family.evaluate(
          () =>
            (window as unknown as { sharedPdf?: { bytes: number } }).sharedPdf
              ?.bytes ?? 0,
        ),
      )
      .toBeGreaterThan(1000);
    expect(
      await family.evaluate(
        () =>
          (window as unknown as { sharedPdf: { header: string } }).sharedPdf
            .header,
      ),
    ).toBe("%PDF-");
    await expect(
      family.getByText("Documento salvo.", { exact: false }).first(),
    ).toBeVisible({ timeout: 12000 });
    for (const device of [family, pro])
      expect(
        await device.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    let trackingRequests = 0;
    await family.route(
      "**/api/documents/" + receipt.requisitionId + "/notifications",
      async (route) => {
        trackingRequests += 1;
        await route.fulfill({
          json: { data: [{ state: "pending", channel: "internal" }] },
        });
      },
    );
    await family.clock.install();
    await family.reload();
    await expect(
      family.getByRole("button", { name: "Compartilhar PDF", exact: true }),
    ).toBeEnabled();
    await expect.poll(() => trackingRequests).toBeGreaterThan(0);
    await family.clock.runFor(11_000);
    await expect(
      family.getByText(
        "Documento salvo. Os avisos continuam sendo processados; consulte o acompanhamento.",
        { exact: true },
      ),
    ).toBeVisible();
    const finishedRequests = trackingRequests;
    await family.clock.runFor(20_000);
    expect(trackingRequests).toBe(finishedRequests);
    await family.unrouteAll({ behavior: "wait" });
  } finally {
    await familyContext.close();
    await proContext.close();
  }
});

test("V4: matrizes móveis, múltiplos canais no contrato visual e proposta global aprovada localmente", async ({
  page,
  browser,
}) => {
  const { patient } = await setup(page);
  await page.setViewportSize({ width: 360, height: 800 });
  // Only the channel catalogue is simulated. Persistence, authorization and policy RPCs are real; no external send is enabled.
  await page.route("**/api/notification-rules?**", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({
      response,
      json: {
        ...body,
        channels: [
          { code: "internal", label: "Aplicativo" },
          { code: "whatsapp", label: "WhatsApp (contrato visual)" },
        ],
      },
    });
  });
  await page.goto("/configuracoes?careRecipientId=" + patient);
  await page
    .getByRole("combobox", { name: "Configurar", exact: true })
    .selectOption("notifications");
  const channel = page.getByRole("checkbox", {
    name: "Requisição emitida · Familiar · WhatsApp (contrato visual)",
    exact: true,
  });
  await channel.check();
  await expect(channel).toBeChecked();
  await expect(
    page.getByRole("checkbox", {
      name: "Requisição emitida · Familiar · Aplicativo",
      exact: true,
    }),
  ).toBeChecked();
  await expect
    .poll(async () => {
      const response = await page.request.get(
        "/api/notification-rules?careRecipientId=" + patient,
      );
      const row = (await response.json()).rules.find(
        (r: { event: string; subject_role: string }) =>
          r.event === "req.issued" && r.subject_role === "family",
      );
      return row?.channels?.length;
    })
    .toBe(2);
  await page
    .getByRole("combobox", { name: "Configurar", exact: true })
    .selectOption("permissions");
  await expect(
    page.getByRole("region", { name: "Matriz de permissões", exact: true }),
  ).toBeVisible();
  const inherited = page
    .getByRole("region", { name: "Matriz de permissões", exact: true })
    .getByRole("combobox")
    .filter({ has: page.locator('option[value="inherit"]') });
  expect(await inherited.count()).toBeGreaterThan(5);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const other = await browser.newContext();
  try {
    const global = await other.newPage();
    await login(global, "global", null);
    await global.goto("/configuracoes?careRecipientId=" + patient);
    await global.getByLabel("Arquivar após conclusão (dias)").fill("9");
    await global
      .getByRole("button", { name: "Registrar política", exact: true })
      .click();
    await expect(
      global.getByText("Proposta global registrada.", { exact: false }),
    ).toBeVisible();
    await page
      .getByRole("combobox", { name: "Configurar", exact: true })
      .selectOption("people");
    await expect(
      page.getByRole("button", { name: "Aprovar proposta", exact: true }),
    ).toBeVisible({ timeout: 20000 });
    await page
      .getByRole("button", { name: "Aprovar proposta", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (
            await (
              await page.request.get(
                "/api/patient-settings?careRecipientId=" + patient,
              )
            ).json()
          ).data.settings.archiveDays,
      )
      .toBe(9);
  } finally {
    await other.close();
  }
});
