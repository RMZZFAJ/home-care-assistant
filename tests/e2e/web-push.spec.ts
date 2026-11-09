import { test, expect, type Page } from "@playwright/test";
import { createECDH, createHash, randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync } from "node:fs";
import {
  setup,
  issue,
  rpc,
  fixtures,
  env,
} from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";
import { processWebPush } from "../../src/lib/server/web-push";

test.setTimeout(180000);
test.use({ serviceWorkers: "allow" });
const owned = new Set<string>();
const panel = (page: Page) =>
  page.getByRole("region", { name: "Avisos neste aparelho", exact: true });
function subscription() {
  const key = createECDH("prime256v1");
  key.generateKeys();
  const value = {
    endpoint: "https://fcm.googleapis.com/wp/synthetic-browser-" + randomUUID(),
    expirationTime: null,
    keys: {
      p256dh: key.getPublicKey().toString("base64url"),
      auth: randomBytes(16).toString("base64url"),
    },
  };
  owned.add(createHash("sha256").update(value.endpoint).digest("hex"));
  return value;
}
test.afterEach(async () => {
  for (const fingerprint of owned) {
    const id = sql(
      `select id from private.web_push_devices where fingerprint=${sqlLiteral(fingerprint)} and user_id=${sqlLiteral(fixtures.family.id)};`,
    );
    if (!id) continue;
    const client = createClient(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    expect(
      (
        await client.auth.signInWithPassword({
          email: fixtures.family.email,
          password: fixturePassword,
        })
      ).error,
    ).toBeNull();
    await rpc(client, "web_push_device_command", {
      p_id: id,
      p_action: "revoke",
    });
  }
  owned.clear();
});
async function adapter(
  page: Page,
  value: ReturnType<typeof subscription>,
  outcome: "granted" | "denied",
) {
  await page.addInitScript(
    ({ value, outcome }) => {
      const state = {
        permission: "default" as NotificationPermission,
        requests: 0,
        subscriptions: 0,
        active: false,
        key: null as ArrayBuffer | null,
      };
      (
        window as unknown as { hcaPushCapability: typeof state }
      ).hcaPushCapability = state;
      const current = {
        endpoint: value.endpoint,
        expirationTime: null,
        options: {
          get applicationServerKey() {
            return state.key;
          },
        },
        toJSON: () => value,
        unsubscribe: async () => {
          state.active = false;
          return true;
        },
      };
      const manager = {
        getSubscription: async () => (state.active ? current : null),
        subscribe: async (options: PushSubscriptionOptionsInit) => {
          state.subscriptions++;
          state.active = true;
          state.key = Uint8Array.from(
            options.applicationServerKey as Uint8Array,
          ).buffer;
          return current;
        },
      };
      Object.defineProperty(window, "Notification", {
        configurable: true,
        value: class {
          static get permission() {
            return state.permission;
          }
          static requestPermission() {
            state.requests++;
            state.permission = outcome;
            return Promise.resolve(outcome);
          }
        },
      });
      Object.defineProperty(window, "PushManager", {
        configurable: true,
        value: class {},
      });
      Object.defineProperty(
        ServiceWorkerRegistration.prototype,
        "pushManager",
        { configurable: true, get: () => manager },
      );
    },
    { value, outcome },
  );
}
async function openProfile(page: Page, patient: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.family.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
  await page.goto("/perfil");
  await page
    .getByRole("button", { name: "Avisos neste aparelho", exact: true })
    .click();
  await expect(
    panel(page).getByRole("button", {
      name: "Ativar avisos neste aparelho",
      exact: true,
    }),
  ).toBeVisible();
}
test("Web Push liga consentimento real de API, evento interno, worker controlado e destino Auth sem ciência ou cruzamento de aparelhos", async ({
  page,
}, info) => {
  const f = await setup(),
    first = subscription(),
    second = subscription();
  const deviceLabel = "Navegador fictício " + randomUUID().slice(0, 8);
  const otherDeviceLabel = "Outro aparelho fictício " + randomUUID().slice(0, 8);
  await adapter(page, first, "granted");
  await openProfile(page, f.patient);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { hcaPushCapability: { requests: number } })
          .hcaPushCapability.requests,
    ),
  ).toBe(0);
  await panel(page)
    .getByLabel("Nome do aparelho (opcional)", { exact: true })
    .fill(deviceLabel);
  await panel(page)
    .getByRole("button", { name: "Ativar avisos neste aparelho", exact: true })
    .click();
  await expect(
    panel(page).getByText(
      "Avisos vinculados a esta conta neste aparelho. Isso não confirma entrega, ciência ou recebimento físico.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { hcaPushCapability: { requests: number } })
          .hcaPushCapability.requests,
    ),
  ).toBe(1);
  const owner = createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  expect(
    (
      await owner.auth.signInWithPassword({
        email: fixtures.family.email,
        password: fixturePassword,
      })
    ).error,
  ).toBeNull();
  const other = await rpc(owner, "subscribe_web_push", {
    p_subscription: second,
    p_label: otherDeviceLabel,
    p_key_version: "ephemeral-push-test-v1",
  });
  await panel(page)
    .getByRole("button", { name: "Consultar aparelhos novamente", exact: true })
    .click();
  await expect(
    panel(page).getByText(otherDeviceLabel, { exact: true }),
  ).toBeVisible();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await audit(page, "push-profile");
  }
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await page.screenshot({
    path: `output/playwright/phase-d/web-push-devices-${info.project.name}.png`,
    fullPage: true,
  });
  const doc = await issue(f.patient, [f.products[0]]);
  const notice = sql(
    `select id from public.requisition_notifications where document_id=${sqlLiteral(doc.id)} and recipient_user_id=${sqlLiteral(fixtures.family.id)} and channel='internal';`,
  );
  expect(notice).toMatch(/^[a-f0-9-]{36}$/);
  const service = createClient(env.url, env.serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    }),
    worker = randomUUID();
  if (
    sql(
      `select state from public.requisition_notifications where id=${sqlLiteral(notice)};`,
    ) !== "delivered"
  ) {
    sql(
      `update public.requisition_notifications set state='processing',leased_by=${sqlLiteral(worker)},lease_expires_at=clock_timestamp()+interval '2 minutes' where id=${sqlLiteral(notice)} and state='pending';`,
    );
    expect(
      await rpc(service, "validate_notification_job", {
        p_id: notice,
        p_worker_id: worker,
      }),
    ).toBe(true);
    await rpc(service, "complete_notification_job", {
      p_id: notice,
      p_worker_id: worker,
      p_state: "delivered",
    });
  }
  const delivered: string[] = [];
  const result = await processWebPush(service, {
    keyVersion: "ephemeral-push-test-v1",
    send: async (sub, id) => {
      expect([first.endpoint, second.endpoint]).toContain(sub.endpoint);
      delivered.push(id);
      return { state: "accepted" };
    },
  });
  expect(result.accepted).toBe(2);
  expect(delivered).toHaveLength(2);
  const beforeEvents = sql(
    `select count(*) from public.document_events where document_id=${sqlLiteral(doc.id)};`,
  );
  await page.goto("/notificacoes?push=" + delivered[0]);
  const arrival = page.getByRole("region", {
    name: "Aviso aberto neste aparelho",
    exact: true,
  });
  await expect(
    arrival.getByRole("link", { name: "Abrir destino do aviso", exact: true }),
  ).toBeVisible();
  await arrival
    .getByRole("link", { name: "Abrir destino do aviso", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp("/historico/" + doc.id));
  await expect(page.getByRole("main")).toContainText(
    sql(
      `select code from public.operational_documents where id=${sqlLiteral(doc.id)};`,
    ),
  );
  expect(
    sql(
      `select count(*) from public.document_events where document_id=${sqlLiteral(doc.id)};`,
    ),
  ).toBe(beforeEvents);
  const apiDevices = await (await page.request.get("/api/push/devices")).json();
  expect(JSON.stringify(apiDevices)).not.toContain(first.endpoint);
  expect(JSON.stringify(apiDevices)).not.toContain(first.keys.auth);
  await page.goto("/perfil");
  await page
    .getByRole("button", { name: "Avisos neste aparelho", exact: true })
    .click();
  await panel(page)
    .getByRole("button", {
      name: "Desativar avisos de " + deviceLabel,
      exact: true,
    })
    .click();
  await expect(
    panel(page)
      .getByRole("listitem")
      .filter({ has: page.getByText(deviceLabel, { exact: true }) })
      .getByText("Desativado", { exact: true }),
  ).toBeVisible();
  expect(
    sql(
      `select state from private.web_push_devices where id=${sqlLiteral(other.id)};`,
    ),
  ).toBe("active");
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { hcaPushCapability: { active: boolean } })
          .hcaPushCapability.active,
    ),
  ).toBe(false);
});
test("Web Push negado não repete pedido, não inscreve e mantém a central e o fallback sem suporte", async ({
  page,
}) => {
  const f = await setup(),
    value = subscription();
  await adapter(page, value, "denied");
  await openProfile(page, f.patient);
  await panel(page)
    .getByRole("button", { name: "Ativar avisos neste aparelho", exact: true })
    .click();
  await expect(
    panel(page).getByText(
      "Permissão não concedida. Suas pendências continuam na central de notificações.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    panel(page).getByRole("button", {
      name: "Ativar avisos neste aparelho",
      exact: true,
    }),
  ).toBeDisabled();
  await panel(page)
    .getByRole("button", { name: "Consultar aparelhos novamente", exact: true })
    .click();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { hcaPushCapability: { requests: number } })
          .hcaPushCapability.requests,
    ),
  ).toBe(1);
  expect(
    sql(
      `select count(*) from private.web_push_devices where fingerprint=${sqlLiteral(createHash("sha256").update(value.endpoint).digest("hex"))};`,
    ),
  ).toBe("0");
  await page.evaluate(() => {
    Object.defineProperty(window, "PushManager", {
      configurable: true,
      value: undefined,
    });
  });
  await panel(page)
    .getByRole("button", { name: "Consultar aparelhos novamente", exact: true })
    .click();
  await expect(
    panel(page).getByText(/Este navegador não oferece avisos neste modo/),
  ).toBeVisible();
  await expect(
    panel(page).getByRole("button", {
      name: "Ativar avisos neste aparelho",
      exact: true,
    }),
  ).toHaveCount(0);
  await audit(page, "push-unavailable");
  await page.goto("/notificacoes");
  await expect(
    page.getByRole("heading", { name: "Central de notificações", exact: true }),
  ).toBeVisible();
});

test("preparação recusada explica a falha, bloqueia permissão Push e recupera o worker real sem reinstalar", async ({ page }) => {
  const f = await setup(), value = subscription();
  await adapter(page, value, "granted");
  await page.addInitScript(() => {
    const state = { blocked: true, calls: 0 };
    (window as unknown as { hcaRegistrationGate: typeof state }).hcaRegistrationGate = state;
    const original = ServiceWorkerContainer.prototype.register;
    ServiceWorkerContainer.prototype.register = function (...args) {
      state.calls++;
      return state.blocked ? Promise.reject(new DOMException("Controlled Preview registration denial", "SecurityError")) : original.apply(this, args);
    };
  });
  await openProfile(page, f.patient);
  await expect(panel(page).getByRole("button", { name: "Ativar avisos neste aparelho", exact: true })).toBeDisabled();
  expect(await page.evaluate(() => (window as unknown as { hcaPushCapability: { requests: number; subscriptions: number } }).hcaPushCapability)).toMatchObject({ requests: 0, subscriptions: 0 });
  await page.getByRole("button", { name: "Aplicativo neste aparelho", exact: true }).click();
  const app = page.getByRole("region", { name: "Aplicativo neste aparelho", exact: true });
  await expect(app.getByRole("alert").filter({ hasText: "Não foi possível iniciar a preparação" })).toBeVisible();
  const attempts = await page.evaluate(() => (window as unknown as { hcaRegistrationGate: { calls: number } }).hcaRegistrationGate.calls);
  await app.getByRole("button", { name: "Consultar atualizações", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { hcaRegistrationGate: { calls: number } }).hcaRegistrationGate.calls)).toBeGreaterThan(attempts);
  await expect(app.getByRole("alert").filter({ hasText: "Não foi possível iniciar a preparação" })).toBeVisible();
  const clock = await page.evaluate(() => performance.timeOrigin);
  await page.evaluate(() => { (window as unknown as { hcaRegistrationGate: { blocked: boolean } }).hcaRegistrationGate.blocked = false; });
  await app.getByRole("button", { name: "Tentar preparar orientação offline novamente", exact: true }).click();
  await expect(app.getByText("Orientação pública disponível para falta de conexão.", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(clock);
  expect(await page.evaluate(() => matchMedia("(display-mode: standalone)").matches)).toBe(false);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 950 });
    // Reflow must start this visual task at its actual section, rather than
    // preserving a previous viewport's arbitrary mid-control scroll offset.
    await app.evaluate(element => element.scrollIntoView({ block: "start" }));
    await audit(page, "PWA-preparation-recovery-" + width);
  }
  const activate = panel(page).getByRole("button", { name: "Ativar avisos neste aparelho", exact: true });
  await expect(activate).toBeEnabled();
  expect(await page.evaluate(() => (window as unknown as { hcaPushCapability: { requests: number } }).hcaPushCapability.requests)).toBe(0);
  await activate.click();
  await expect(panel(page).getByText(/^Avisos vinculados a esta conta neste aparelho/)).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { hcaPushCapability: { requests: number; subscriptions: number } }).hcaPushCapability)).toMatchObject({ requests: 1, subscriptions: 1 });
  expect(sql(`select count(*) from private.web_push_devices where fingerprint=${sqlLiteral(createHash("sha256").update(value.endpoint).digest("hex"))} and user_id=${sqlLiteral(fixtures.family.id)} and state='active';`)).toBe("1");
});
