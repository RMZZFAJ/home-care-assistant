import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { setup } from "../integration/v4-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { auditFromTop } from "./accessibility-audit";
import type { SchedulePacket } from "@/lib/schedules/confirmation";
test.setTimeout(120_000);
async function prepare(page: Page) {
  const f = await setup();
  const administrator = await shiftWorker(f.patient, "admin");
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(administrator.email);
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
        body: { name, startsLocal: "19:00:37", durationMinutes: 720 },
      },
    },
  });
  expect(type.ok()).toBe(true);
  const row = (await type.json()).data;
  expect(row.version).toBe(1);
  const legacy: SchedulePacket = {
    careRecipientId: f.patient,
    idempotencyKey: randomUUID(),
    expectedVersion: 1,
    command: {
      action: "type",
      body: {
        id: row.id,
        name: name + " alterado",
        startsLocal: "19:00:37",
        durationMinutes: 720,
        active: true,
      },
    },
  };
  await page.goto("/escalas");
  return { ...f, legacy, ownerId: administrator.id };
}
// Explicit fixture of a packet produced by the earlier UI. Current editors use
// private resource preparations. The native HTTP call and lost-response probes
// stay real, and the current recovery panel must consume that older envelope.
async function submitLegacy(page: Page, packet: SchedulePacket, userId: string) {
  await page.evaluate(
    async ({ packet, userId }) => {
      sessionStorage.setItem(
        `hca:schedule-confirmation:${userId}:${packet.careRecipientId}`,
        JSON.stringify({ version: 1, userId, packet }),
      );
      try {
        await fetch("/api/schedules", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(packet),
        });
      } catch {
        /* The fixture deliberately loses the native response. */
      }
    },
    { packet, userId },
  );
  await page.reload();
}
const panel = (page: Page) =>
  page.getByRole("region", { name: "Confirmação de escala", exact: true });
const confirmationOf = (packet: SchedulePacket) => (url: URL) =>
  url.pathname === "/api/schedules/confirmation" &&
  url.searchParams.get("careRecipientId") === packet.careRecipientId &&
  url.searchParams.get("idempotencyKey") === packet.idempotencyKey;
const facts = (patient: string) =>
  Number(
    sql(
      `select count(*) from public.shift_events where care_recipient_id=${q(patient)} and action='schedule.type' and (after_state->>'version')::integer>1`,
    ),
  );
test("a confirmação do próprio plantão permanece acessível sem leitura da agenda", async ({ page }) => {
  const f = await prepare(page);
  await page.route("**/api/schedules", async route => {
    if (route.request().method() !== "POST") return route.continue();
    const committed = await route.fetch();
    expect(committed.ok()).toBe(true);
    return route.abort("failed");
  }, { times: 1 });
  await submitLegacy(page, f.legacy, f.ownerId);
  expect(facts(f.patient)).toBe(1);
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled)
    values (${q(f.patient)},${q(f.ownerId)},'schedule.read.team',false),
           (${q(f.patient)},${q(f.ownerId)},'schedule.read.own',false)`);
  await page.reload();
  await expect(page.getByText(/^Seu vínculo não permite consultar a agenda/)).toBeVisible();
  await page.getByText("Meus preenchimentos privados da agenda", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Retomar minha programação", exact: true })).toBeVisible();
  await panel(page).getByRole("button", { name: "Consultar confirmação da escala", exact: true }).click();
  await expect(panel(page)).toContainText("Confirmação encontrada");
  expect(facts(f.patient)).toBe(1);
});

test("agenda recupera a confirmação após recarregar sem reenviar a alteração e recusa recibo de outra intenção", async ({
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
  await submitLegacy(page, f.legacy, f.ownerId);
  await expect(
    page.getByRole("button", {
      name: "Consultar confirmação da escala",
      exact: true,
    }),
  ).toBeVisible();
  expect(facts(f.patient)).toBe(1);
  expect(
    sql(
      `select starts_local::text from public.shift_types where care_recipient_id=${q(f.patient)}`,
    ),
  ).toBe("19:00:37");
  await page.reload();
  await expect(panel(page)).toContainText("Tentativa de escala preservada");
  await expect(
    page.getByRole("button", { name: "Nova programação", exact: true }),
  ).toBeDisabled();
  expect(packets).toHaveLength(1);
  const storageKey = `hca:schedule-confirmation:${f.ownerId}:${f.patient}`;
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
  const recovered = page.waitForResponse(response =>
    response.request().method() === "GET" && confirmationOf(f.legacy)(new URL(response.url())),
  );
  await panel(page)
    .getByRole("button", {
      name: "Consultar confirmação da escala",
      exact: true,
    })
    .click();
  const result = await recovered;
  expect(result.status()).toBe(200);
  expect(await result.json()).toMatchObject({
    found: true, userId: f.ownerId, idempotencyKey: f.legacy.idempotencyKey,
  });
  await expect(panel(page)).toContainText("Confirmação encontrada");
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), storageKey),
  ).toBeNull();
  expect(packets).toHaveLength(1);
  expect(facts(f.patient)).toBe(1);
});

test("uma resposta antiga da agenda preserva a referência após uma falha de contexto", async ({ page }) => {
  const f = await prepare(page);
  let submissions = 0;
  await page.route("**/api/schedules", async route => {
    if (route.request().method() !== "POST") return route.continue();
    submissions++;
    const response = await route.fetch();
    expect(response.ok()).toBe(true);
    return route.abort("failed");
  });
  await submitLegacy(page, f.legacy, f.ownerId);
  const key = `hca:schedule-confirmation:${f.ownerId}:${f.patient}`;
  const readReference = () => page.evaluate(key => sessionStorage.getItem(key), key);
  const original = await readReference();
  expect(original).toBeTruthy();
  const consult = panel(page).getByRole("button", { name: "Consultar confirmação da escala", exact: true });
  const held = Promise.withResolvers<void>();
  const confirmation = confirmationOf(f.legacy);
  let received = false;
  await page.route(confirmation, async route => {
    const response = await route.fetch();
    expect(response.ok()).toBe(true);
    received = true;
    await held.promise;
    await route.fulfill({ response });
  });
  try {
    const stale = page.waitForResponse(response => confirmation(new URL(response.url())));
    await consult.click();
    await expect.poll(() => received).toBe(true);
    const context = (url: URL) => url.pathname === "/api/context";
    await page.route(context, route => route.fulfill({
      status: 503,
      json: { code: "DATABASE_UNAVAILABLE", error: "Consulta de contexto indisponível no ensaio." },
    }));
    await page.evaluate(() => window.dispatchEvent(new Event("hca:data-changed")));
    const reloadContext = page.getByRole("button", { name: "Tentar novamente", exact: true });
    await expect(reloadContext).toBeVisible();
    await expect(panel(page)).toHaveCount(0);
    await page.unroute(context);
    await reloadContext.click();
    await expect(consult).toBeEnabled();

    held.resolve();
    expect(await (await stale).finished()).toBeNull();
    await page.evaluate(() => new Promise<void>(done =>
      requestAnimationFrame(() => requestAnimationFrame(() => done())),
    ));
    expect(await readReference()).toBe(original);
    await page.unroute(confirmation);
    await consult.click();
    await expect(panel(page)).toContainText("Confirmação encontrada");
    expect(await readReference()).toBeNull();
    expect(submissions).toBe(1);
    expect(facts(f.patient)).toBe(1);
  } finally {
    held.resolve();
    await page.unrouteAll({ behavior: "wait" });
  }
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
  await submitLegacy(page, f.legacy, f.ownerId);
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
  const storageKey = `hca:schedule-confirmation:${f.ownerId}:${f.patient}`;
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
