import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import {
  fixtureFile,
  sql,
  sqlLiteral,
} from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
test.setTimeout(180000);
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
  expect(response.ok(), (await response.text()).slice(0, 500)).toBeTruthy();
  return response.json();
}
async function setup(page: Page) {
  await login(page, "global", null);
  const patient = (
    await post(page, "/api/admin", {
      action: "recipient",
      id: null,
      displayName: "Regressão V4 fictícia " + randomUUID().slice(0, 8),
      isActive: true,
      isDevelopment: true,
      initialAdministratorEmail: fixtures().global.email,
    })
  ).data.id as string;
  for (const role of ["adminA", "family", "professional"])
    sql(
      "insert into public.care_recipient_memberships(care_recipient_id,user_id,role) values(" +
        sqlLiteral(patient) +
        "," +
        sqlLiteral(fixtures()[role].id) +
        "," +
        sqlLiteral(role === "adminA" ? "admin" : role) +
        ")",
    );
  await selectContext(page, patient);
  const product = (
    await post(page, "/api/admin", {
      action: "product",
      careRecipientId: patient,
      id: null,
      name: "Material regressão V4",
      category: "higiene",
      unit: "unidade",
      aliases: [],
      isActive: true,
    })
  ).data.product_id as string;
  return { patient, product };
}

test("V4 review: matriz reconcilia horários, intervalo, versões e falhas sem sobrescrever alterações", async ({
  page,
  browser,
}) => {
  const { patient } = await setup(page),
    second = await browser.newContext(),
    other = await second.newPage();
  try {
    await login(other, "adminA", patient);
    await page.goto("/configuracoes?careRecipientId=" + patient);
    const governance = async (editor: Page) =>
      (
        await (
          await editor.request.get(
            "/api/patient-settings?careRecipientId=" + patient,
          )
        ).json()
      ).data;
    const revisePolicy = async (change: Record<string, unknown>) =>
      post(other, "/api/patient-settings", {
        careRecipientId: patient,
        kind: "settings",
        change,
        idempotencyKey: randomUUID(),
        expectedVersion: (await governance(other)).version,
      });
    await expect(page.getByText("Arquivamento após 7 dias da conclusão", { exact: true })).toBeVisible();
    await revisePolicy({ archiveDays: 8 });
    await expect(page.getByText("Arquivamento após 8 dias da conclusão", { exact: true })).toBeVisible({ timeout: 45000 });
    await page.getByRole("button", { name: "Editar Comunicação e lembretes", exact: true }).click();
    await page.getByLabel("Primeiro lembrete (horas)", { exact: true }).fill("3");
    await page.getByRole("button", { name: "Registrar política", exact: true }).click();
    await expect.poll(async () => (await governance(page)).settings.reminderHours).toBe(3);
    expect((await governance(page)).settings.archiveDays).toBe(8);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "Editar Encerramento e histórico", exact: true }).click();
    const archiveDays = page.getByLabel("Arquivar após conclusão (dias)", { exact: true });
    await expect(archiveDays).toHaveValue("8");
    await archiveDays.fill("9");
    await revisePolicy({ archiveDays: 10 });
    await expect(page.getByText("Política v" + (await governance(other)).version, { exact: false })).toBeVisible({ timeout: 45000 });
    await expect(archiveDays).toHaveValue("9");
    await page.getByRole("button", { name: "Registrar política", exact: true }).click();
    await expect(page.getByRole("alert").filter({ hasText: "configuração mudou em outra sessão" })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", { name: "Editar Encerramento e histórico", exact: true }).click();
    await expect(archiveDays).toHaveValue("10");
    await archiveDays.fill("11");
    await page.getByRole("button", { name: "Registrar política", exact: true }).click();
    await expect.poll(async () => (await governance(page)).settings.archiveDays).toBe(11);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("navigation", { name: "Áreas da configuração", exact: true }).getByRole("link", { name: "Notificações", exact: true }).click();
    await page.getByRole("button", { name: "Opções de Requisição emitida · Familiar", exact: true }).click();
    const cell = page.getByRole("dialog");
    const start = cell.getByLabel("Início", { exact: true }),
      end = cell.getByLabel("Fim", { exact: true }),
      cooldown = cell.getByLabel("Intervalo mínimo (min)", { exact: true });
    const persisted = async () => {
      const r = await page.request.get(
        "/api/notification-rules?careRecipientId=" + patient,
      );
      return (await r.json()).rules.find(
        (r: { event: string; subject_role: string }) =>
          r.event === "req.issued" && r.subject_role === "family",
      );
    };
    for (const [field, value, key] of [
      [start, "21", "quiet_start"],
      [end, "7", "quiet_end"],
      [start, "", "quiet_start"],
      [end, "", "quiet_end"],
    ] as const) {
      await field.selectOption(value);
      await expect(field).toBeEnabled();
      await expect
        .poll(async () => (await persisted())?.[key])
        .toBe(value === "" ? null : Number(value));
      await expect(field).toHaveValue(value);
    }
    await cooldown.fill("23");
    await cooldown.blur();
    await expect(cooldown).toBeEnabled();
    await expect
      .poll(async () => (await persisted())?.cooldown_minutes)
      .toBe(23);
    await start.selectOption("20");
    await expect(start).toBeEnabled();
    await expect.poll(async () => (await persisted())?.quiet_start).toBe(20);
    expect((await persisted()).cooldown_minutes).toBe(23);
    let conflict = true;
    await page.route("**/api/patient-settings", async (route) => {
      if (route.request().method() === "POST" && conflict) {
        conflict = false;
        // Inject a concurrent server revision while this browser write is paused.
        // The HTTP/Auth integration separately verifies the other editor's authority.
        sql(
          "update public.patient_settings set version=version+1,settings=settings||'{\"archiveDays\":8}'::jsonb where care_recipient_id=" +
            sqlLiteral(patient),
        );
      }
      await route.continue();
    });
    await end.selectOption("6");
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: "configuração mudou em outra sessão" }),
    ).toBeVisible();
    await expect(end).toBeEnabled();
    await expect(end).toHaveValue("");
    expect((await persisted()).quiet_start).toBe(20);
    expect((await persisted()).cooldown_minutes).toBe(23);
    await page.unrouteAll({ behavior: "wait" });
    await end.selectOption("6");
    await expect(end).toBeEnabled();
    await expect.poll(async () => (await persisted())?.quiet_end).toBe(6);
    for (const failure of ["permission", "network"]) {
      let once = true;
      await page.route("**/api/patient-settings", async (route) => {
        if (route.request().method() === "POST" && once) {
          once = false;
          if (failure === "network") await route.abort("failed");
          else
            await route.fulfill({
              status: 403,
              json: {
                code: "FORBIDDEN",
                error: "Permissão recusada no contrato visual de teste.",
              },
            });
        } else await route.continue();
      });
      await start.selectOption("19");
      await expect(page.getByRole("alert").first()).toBeVisible();
      await expect(start).toBeEnabled();
      await expect(start).toHaveValue("20");
      expect((await persisted()).cooldown_minutes).toBe(23);
      await page.unrouteAll({ behavior: "wait" });
    }
  } finally {
    await second.unrouteAll({ behavior: "wait" });
    await second.close();
  }
});

test("V4 review: sino filtra silenciosas antes da página e ficha acompanha estado posterior ao vivo", async ({
  page,
  browser,
}) => {
  const { patient, product } = await setup(page),
    familyContext = await browser.newContext(),
    proContext = await browser.newContext();
  try {
    const family = await familyContext.newPage(),
      pro = await proContext.newPage();
    await login(family, "family", patient);
    await login(pro, "adminA", patient);
    const com = (
      await post(family, "/api/documents", {
        careRecipientId: patient,
        type: "COM",
        payload: { lines: [{ productId: product, quantity: "1" }] },
        idempotencyKey: randomUUID(),
        draft: false,
      })
    ).data;
    const receipt = { requisitionId: com.id, code: com.code };
    await pro.goto("/fichas/" + com.id);
    const row = sql(
      "select id from public.requisition_notifications where document_id=" +
        sqlLiteral(receipt.requisitionId) +
        " and recipient_user_id=" +
        sqlLiteral(fixtures().family.id) +
        " and channel='internal' limit 1",
    );
    sql(
      "update public.requisition_notifications set state='delivered',seen_at=null where id=" +
        sqlLiteral(row),
    );
    sql(
      "insert into public.requisition_notifications(care_recipient_id,document_id,recipient_user_id,recipient_group,recipient_label,channel,state,event_key,silent,created_at) select care_recipient_id,document_id,recipient_user_id,recipient_group,'Silenciosa fictícia','internal','delivered',event_key,true,now()+make_interval(secs=>g) from public.requisition_notifications cross join generate_series(1,25) g where id=" +
        sqlLiteral(row),
    );
    await family.goto("/fichas/" + receipt.requisitionId);
    const statuses = family.getByRole("region", {
      name: "Notificações da ficha",
      exact: true,
    });
    await expect(
      statuses.getByText("Disponível no aplicativo", { exact: false }).first(),
    ).toBeVisible();
    const response = await family.request.get(
      "/api/notifications?surface=bell&careRecipientId=" + patient,
    );
    const inbox = await response.json();
    expect(inbox.total).toBe(1);
    expect(inbox.unreadCount).toBe(1);
    expect(inbox.data[0].id).toBe(row);
    const all = await (
      await family.request.get(
        "/api/notifications?careRecipientId=" + patient + "&pageSize=50",
      )
    ).json();
    expect(all.total).toBe(26);
    await family.getByRole("button", { name: /^Notificações/ }).click();
    const bell = family.getByRole("region", {
      name: "Notificações recentes",
      exact: true,
    });
    await expect(
      bell.getByRole("link").filter({ hasText: receipt.code }),
    ).toHaveCount(1);
    await family.keyboard.press("Escape");
    // Controlled local provider evidence, not an external Meta delivery.
    sql(
      "update public.requisition_notifications set channel='whatsapp',destination='+15555550102',state='read',read_at=now(),provider_reference='local-contract-" +
        row +
        "' where id=" +
        sqlLiteral(row),
    );
    await expect(statuses.getByText("Lida ·", { exact: false })).toBeVisible({
      timeout: 15000,
    });
    await post(family, "/api/notifications", { id: row });
    await expect
      .poll(
        async () =>
          (
            await (
              await family.request.get(
                "/api/notifications?surface=bell&careRecipientId=" + patient,
              )
            ).json()
          ).unreadCount,
      )
      .toBe(0);
    await family.goto("/notificacoes?careRecipientId=" + patient);
    const otherPatient = (
      await (await family.request.get("/api/context")).json()
    ).data.patients.find(
      (p: { id: string; hasMembership: boolean }) =>
        p.id !== patient && p.hasMembership,
    ).id;
    const picker = family.getByLabel("Pessoa assistida", { exact: true });
    await picker.selectOption(otherPatient);
    await expect
      .poll(
        async () =>
          (await (await family.request.get("/api/context")).json()).data
            .activeContext.care_recipient_id,
      )
      .toBe(otherPatient);
    await expect(family.locator(".hca-workspace")).toHaveAttribute("data-context-patient", otherPatient);
    await expect(picker).toBeEnabled();
    await expect(
      family.getByRole("button", { name: /^Notificações/ }),
    ).toBeVisible();
    await family.getByRole("button", { name: /^Notificações/ }).click();
    await expect(
      family
        .getByRole("region", { name: "Notificações recentes", exact: true })
        .getByRole("link")
        .and(family.locator('a[href*="' + receipt.requisitionId + '"]')),
    ).toHaveCount(0);
    await family.keyboard.press("Escape");
    await picker.selectOption(patient);
    await expect
      .poll(
        async () =>
          (await (await family.request.get("/api/context")).json()).data
            .activeContext.care_recipient_id,
      )
      .toBe(patient);
    await expect(family.locator(".hca-workspace")).toHaveAttribute("data-context-patient", patient);
    await expect(picker).toBeEnabled();
    await family.getByRole("button", { name: /^Notificações/ }).click();
    await expect(
      family
        .getByRole("region", { name: "Notificações recentes", exact: true })
        .getByRole("link")
        .filter({ hasText: receipt.code }),
    ).toHaveCount(1);
  } finally {
    await familyContext.unrouteAll({ behavior: "wait" });
    await proContext.unrouteAll({ behavior: "wait" });
    await familyContext.close();
    await proContext.close();
  }
});

test("V4 review: cartão de arquivamento abre exatamente as conclusões contadas", async ({
  page,
  browser,
}) => {
  const { patient, product } = await setup(page),
    familyContext = await browser.newContext(),
    proContext = await browser.newContext();
  try {
    const family = await familyContext.newPage(),
      pro = await proContext.newPage();
    await login(family, "family", patient);
    await login(pro, "professional", patient);
    await post(page, "/api/stock/movements", {
      careRecipientId: patient,
      productId: product,
      quantity: "10",
      action: "inbound",
      reason: "Saldo fictício para a regressão de arquivamento.",
      idempotencyKey: randomUUID(),
    });
    const req = (
      await post(pro, "/api/requisitions", {
        careRecipientId: patient,
        idempotencyKey: randomUUID(),
        lines: [{ productId: product, currentStock: 0, urgent: false }],
        extraItems: [],
        observations: [],
      })
    ).receipt;
    const version = (
      await (
        await family.request.get("/api/requisitions/" + req.requisitionId)
      ).json()
    ).data.progress.version;
    await post(family, "/api/requisitions/" + req.requisitionId + "/science", {
      mode: "express",
      expectedVersion: version,
    });
    const item = (
      await (
        await pro.request.get("/api/requisitions/" + req.requisitionId)
      ).json()
    ).data.requisition_items[0].id;
    const ent = (
      await post(family, "/api/documents", {
        careRecipientId: patient,
        type: "ENT",
        payload: {
          source: "FAMILY",
          destination: "CARE_TEAM",
          recipientId: fixtures().professional.id,
          lines: [
            { productId: product, quantity: "10", requisitionItemIds: [item] },
          ],
        },
        idempotencyKey: randomUUID(),
        draft: false,
      })
    ).data;
    await post(pro, "/api/documents/" + ent.id, {
      action: "receive",
      body: { divergences: [] },
      idempotencyKey: randomUUID(),
      expectedVersion: ent.version,
    });
    const archivePermission = async (enabled: boolean | null) =>
      post(page, "/api/patient-settings", {
        careRecipientId: patient,
        kind: "capability",
        change: {
          capability: "req.archive",
          subjectUser: fixtures().global.id,
          enabled,
        },
        idempotencyKey: randomUUID(),
        expectedVersion: (
          await (
            await page.request.get(
              "/api/patient-settings?careRecipientId=" + patient,
            )
          ).json()
        ).data.version,
      });
    await archivePermission(false);
    await page.goto("/fichas/" + req.requisitionId);
    await expect(
      page.getByRole("heading", { name: req.code, exact: false }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", {
        name: "Revisar arquivamento manual",
        exact: true,
      }),
    ).toHaveCount(0);
    const forbiddenArchive = await page.request.post(
      "/api/requisitions/" + req.requisitionId + "/archive",
      { data: { reason: "Tentativa proibida por capacidade explícita" } },
    );
    expect(forbiddenArchive.status()).toBe(403);
    expect(
      (
        await (
          await page.request.get("/api/dashboard?careRecipientId=" + patient)
        ).json()
      ).data.archivePending,
    ).toBe(0);
    await archivePermission(null);
    await page.goto("/?careRecipientId=" + patient);
    const card = page
      .getByRole("link")
      .filter({ hasText: "Conclusões para revisar e arquivar" });
    await expect(card).toBeVisible();
    await expect(card).toContainText("1");
    expect(
      (
        await (
          await page.request.get("/api/dashboard?careRecipientId=" + patient)
        ).json()
      ).data.archivePending,
    ).toBe(1);
    await expect(
      page
        .getByRole("link")
        .filter({ hasText: "Requisições para sua ciência" }),
    ).toHaveCount(0);
    await card.click();
    await expect(page).toHaveURL(/status=archive_pending/);
    await expect(
      page.getByRole("link").filter({ hasText: req.code }),
    ).toHaveCount(1);
    expect(
      (
        await (
          await page.request.get(
            "/api/documents?careRecipientId=" +
              patient +
              "&type=REQ&status=archive_pending",
          )
        ).json()
      ).total,
    ).toBe(1);
    await post(page, "/api/requisitions/" + req.requisitionId + "/archive", {
      reason: "Conclusão fictícia revisada pelo administrador local.",
    });
    await expect(
      page.getByRole("link").filter({ hasText: req.code }),
    ).toHaveCount(0);
  } finally {
    await familyContext.unrouteAll({ behavior: "wait" });
    await proContext.unrouteAll({ behavior: "wait" });
    await familyContext.close();
    await proContext.close();
  }
});
