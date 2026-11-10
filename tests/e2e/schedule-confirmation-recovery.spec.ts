import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { fixtures, setup } from "../integration/v4-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { auditFromTop } from "./accessibility-audit";
import type { SchedulePacket } from "@/lib/schedules/confirmation";
test.setTimeout(120_000);
async function prepare(page: Page) {
  const f = await setup(),
    worker = await shiftWorker(f.patient);
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, f.patient);
  const name = "Plantão recuperável " + randomUUID().slice(0, 8);
  const type = await page.request.post("/api/schedules", {
    data: {
      careRecipientId: f.patient,
      idempotencyKey: randomUUID(),
      command: {
        action: "type",
        body: { name, startsLocal: "19:00", durationMinutes: 720 },
      },
    },
  });
  expect(type.ok()).toBe(true);
  const id = (await type.json()).data.id;
  await page.goto("/escalas");
  await page
    .getByRole("button", { name: "Nova programação", exact: true })
    .click();
  const form = page.getByRole("dialog", {
    name: "Programação de plantões",
    exact: true,
  });
  await form
    .getByLabel("Profissional", { exact: true })
    .selectOption(worker.id);
  await form.getByLabel("Tipo de plantão", { exact: true }).selectOption(id);
  await form.getByLabel("Repetição", { exact: true }).selectOption("once");
  await form
    .getByLabel("Primeiro dia / âncora", { exact: true })
    .fill("2100-06-01");
  await form
    .getByRole("button", { name: "Revisar alteração", exact: true })
    .click();
  return f;
}
const panel = (page: Page) =>
  page.getByRole("region", { name: "Confirmação de escala", exact: true });
const facts = (patient: string) =>
  Number(
    sql(
      `select count(*) from public.shift_series where care_recipient_id=${q(patient)}`,
    ),
  );
test("agenda recupera a confirmação após recarregar sem reenviar a programação e recusa recibo de outra intenção", async ({
  page,
}, info) => {
  const f = await prepare(page);
  const packets: SchedulePacket[] = [];
  await page.route("**/api/schedules", async (route) => {
    packets.push(route.request().postDataJSON());
    const response = await route.fetch();
    expect(response.ok()).toBe(true);
    await route.abort("failed");
  });
  await page
    .getByRole("dialog", { name: "Revisar escala", exact: true })
    .getByRole("button", { name: "Confirmar gravação", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Consultar confirmação da escala",
      exact: true,
    }),
  ).toBeVisible();
  expect(facts(f.patient)).toBe(1);
  await page.reload();
  await expect(panel(page)).toContainText("Tentativa de escala preservada");
  await expect(
    page.getByRole("button", { name: "Nova programação", exact: true }),
  ).toBeDisabled();
  expect(packets).toHaveLength(1);
  const storageKey = `hca:schedule-confirmation:${fixtures.adminA.id}:${f.patient}`;
  const original = await page.evaluate(
    (key) => sessionStorage.getItem(key),
    storageKey,
  );
  expect(original).toBeTruthy();
  await page.route("**/api/schedules/confirmation?*", async (route) => {
    const response = await route.fetch();
    const body = await response.json();
    await route.fulfill({
      response,
      json: { ...body, idempotencyKey: randomUUID() },
    });
  });
  await panel(page)
    .getByRole("button", {
      name: "Consultar confirmação da escala",
      exact: true,
    })
    .click();
  await expect(panel(page)).toContainText("Não foi possível conferir");
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), storageKey),
  ).toBe(original);
  expect(packets).toHaveLength(1);
  await page.unroute("**/api/schedules/confirmation?*");
  for (const width of [1440, 1150, 850, 500, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(panel(page)).toBeVisible();
    expect(
      await panel(page).evaluate((el) => el.scrollWidth <= el.clientWidth),
    ).toBe(true);
  }
  await auditFromTop(page, "recoverable schedule confirmation");
  await page.screenshot({
    path: `output/playwright/fluent/schedule-recovery-${info.project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
  sql(
    `update public.care_recipients set is_active=false where id=${q(f.patient)}`,
  );
  await page.route("**/api/context", async (route) => {
    if (route.request().method() !== "GET") return route.continue();
    await route.fulfill({
      status: 503,
      json: {
        error: {
          code: "DATABASE_UNAVAILABLE",
          message: "Consulta de contexto indisponível no ensaio controlado.",
        },
      },
    });
  });
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Tentar novamente", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), storageKey),
  ).toBe(original);
  expect(packets).toHaveLength(1);
  await page.unroute("**/api/context");
  await page
    .getByRole("button", { name: "Tentar novamente", exact: true })
    .click();
  await expect(panel(page)).toContainText("Tentativa de escala preservada");
  await panel(page)
    .getByRole("button", {
      name: "Consultar confirmação da escala",
      exact: true,
    })
    .click();
  await expect(panel(page)).toContainText("Confirmação encontrada");
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), storageKey),
  ).toBeNull();
  expect(packets).toHaveLength(1);
  expect(facts(f.patient)).toBe(1);
});
test("agenda só reenvia explicitamente a tentativa não encontrada e preserva envelope divergente", async ({
  page,
}) => {
  const f = await prepare(page);
  const packets: SchedulePacket[] = [];
  await page.route("**/api/schedules", async (route) => {
    packets.push(route.request().postDataJSON());
    await route.abort("failed");
  });
  await page
    .getByRole("dialog", { name: "Revisar escala", exact: true })
    .getByRole("button", { name: "Confirmar gravação", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Consultar confirmação da escala",
      exact: true,
    }),
  ).toBeVisible();
  expect(facts(f.patient)).toBe(0);
  await page.reload();
  await expect(panel(page)).toBeVisible();
  expect(packets).toHaveLength(1);
  await panel(page)
    .getByRole("button", {
      name: "Consultar confirmação da escala",
      exact: true,
    })
    .click();
  await expect(panel(page)).toContainText("Isso não prova");
  await expect(
    panel(page).getByRole("button", {
      name: "Reenviar a mesma tentativa",
      exact: true,
    }),
  ).toBeVisible();
  expect(packets).toHaveLength(1);
  const storageKey = `hca:schedule-confirmation:${fixtures.adminA.id}:${f.patient}`;
  const original = await page.evaluate(
    (key) => sessionStorage.getItem(key)!,
    storageKey,
  );
  const other = JSON.stringify({
    ...JSON.parse(original),
    packet: { ...packets[0], idempotencyKey: randomUUID() },
  });
  await page.evaluate(({ key, value }) => sessionStorage.setItem(key, value), {
    key: storageKey,
    value: other,
  });
  await panel(page)
    .getByRole("button", { name: "Reenviar a mesma tentativa", exact: true })
    .click();
  await expect(panel(page)).toContainText("Há outra tentativa");
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), storageKey),
  ).toBe(other);
  expect(packets).toHaveLength(1);
  await page.evaluate(({ key, value }) => sessionStorage.setItem(key, value), {
    key: storageKey,
    value: original,
  });
  await page.unroute("**/api/schedules");
  await page.route("**/api/schedules", async (route) => {
    packets.push(route.request().postDataJSON());
    await route.continue();
  });
  await panel(page)
    .getByRole("button", { name: "Reenviar a mesma tentativa", exact: true })
    .click();
  await expect(panel(page)).toContainText("Confirmação encontrada");
  expect(packets).toHaveLength(2);
  expect(packets[1]).toEqual(packets[0]);
  expect(facts(f.patient)).toBe(1);
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), storageKey),
  ).toBeNull();
});
