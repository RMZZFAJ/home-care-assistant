import { selectProfileSection } from "./profile-sections";
import { test, expect, type Page, type Response as BrowserResponse, type TestInfo } from "@playwright/test";
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
import { audit, auditFromTop } from "./accessibility-audit";
import { processWebPush } from "../../src/lib/server/web-push";

test.setTimeout(180000);
test.use({ serviceWorkers: "allow" });
const owned = new Set<string>();
const panel = (page: Page) =>
  page.getByRole("dialog", { name: "Avisos neste aparelho", exact: true });
const devicesPanel = (page: Page) => page.getByRole("region", { name: "Aparelhos com avisos", exact: true });
const deviceSheet = (page: Page, name = "Este aparelho") => page.getByRole("dialog", { name, exact: true });
const activate = (page: Page) => panel(page).getByRole("button", { name: /^(Ativar neste aparelho|Concluir ativação)$/ });
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
    const row = sql(
      `select jsonb_build_object('id',id,'userId',user_id) from private.web_push_devices where fingerprint=${sqlLiteral(fingerprint)};`,
    );
    if (!row) continue;
    const device = JSON.parse(row) as { id: string; userId: string };
    const account = [fixtures.family, fixtures.professional].find(value => value.id === device.userId);
    if (!account) throw new Error("Unexpected owner of the synthetic Push endpoint");
    const id = device.id;
    const client = createClient(env.url, env.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    expect(
      (
        await client.auth.signInWithPassword({
          email: account.email,
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
  persistBrowserState = false,
) {
  await page.addInitScript(
    ({ value, outcome, persistBrowserState }) => {
      const storageKey = "fixture-browser-push:" + value.endpoint;
      const persisted = persistBrowserState ? JSON.parse(sessionStorage.getItem(storageKey) ?? "null") : null;
      const state = {
        permission: (persisted?.permission ?? "default") as NotificationPermission,
        requests: 0,
        subscriptions: 0,
        active: Boolean(persisted?.active),
        key: persisted?.key ? Uint8Array.from(persisted.key).buffer : null,
      };
      const persist = () => {
        if (persistBrowserState) sessionStorage.setItem(storageKey, JSON.stringify({
          permission: state.permission, active: state.active,
          key: state.key ? Array.from(new Uint8Array(state.key)) : null,
        }));
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
          persist();
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
          persist();
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
            persist();
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
    { value, outcome, persistBrowserState },
  );
}
async function openPushPanel(page: Page) {
  await page.getByRole("button", { name: /^Avisos do aplicativo/ }).press("Enter");
  await expect(panel(page)).toBeVisible();
}

async function acceptPush(page: Page, label?: string) {
  await expect(activate(page)).toBeEnabled();
  await activate(page).press("Enter");
  const dialog = page.getByRole("dialog", { name: "Ativar avisos neste aparelho?", exact: true });
  if (label) await dialog.getByLabel("Nome do aparelho (opcional)", { exact: true }).fill(label);
  await dialog.getByRole("checkbox", { name: /^Quero receber avisos/ }).check();
  await dialog.getByRole("button", { name: "Continuar ativação", exact: true }).press("Enter");
}

async function concludePush(page: Page, title: string) {
  const dialog = page.getByRole("dialog", { name: title, exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Concluir", exact: true }).press("Enter");
  await expect(dialog).toBeHidden();
}

async function openCurrentTest(page: Page, label = "Este aparelho") {
  await panel(page).getByRole("button", { name: "Enviar um teste pessoal", exact: true }).press("Enter");
  await expect(deviceSheet(page, label)).toBeVisible();
}

async function capturePushPanel(page: Page, info: TestInfo, name: string) {
  const directory = "output/playwright/l4-device-panels";
  mkdirSync(directory, { recursive: true });
  for (const width of [360, 412]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({ path: `${directory}/produto-${name}-${width}-${info.project.name}.png` });
  }
}

async function openProfile(page: Page, patient: string, openNoticesDirectly = false) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.family.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
  await page.goto(openNoticesDirectly ? "/perfil?profileTab=notices" : "/perfil");
  if (!openNoticesDirectly) await selectProfileSection(page, "notices");
  await openPushPanel(page);
  await expect(activate(page)).toBeVisible();
}

type DiagnosticRequest = { method: string; search: string; body: string | null };
type DiagnosticResponse = { waitForAbort: true } | { json: unknown; status?: number; headers?: Record<string, string> };

async function openControlledPersonalTest(page: Page, reply: (request: DiagnosticRequest) => DiagnosticResponse) {
  const fixture = await setup();
  await adapter(page, subscription(), "granted", true);
  // The browser simulates the provider response and its availability flag.
  // The local app still enrolls the real Auth session with external sending off.
  await page.exposeFunction("hcaFixturePushTest", reply);
  await page.addInitScript(() => {
    const fetchFromApp = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : input, location.origin);
      if (url.origin === location.origin && url.pathname === "/api/push/test") {
        const fixture = (window as typeof window & {
          hcaFixturePushTest: (request: DiagnosticRequest) => Promise<DiagnosticResponse>;
        }).hcaFixturePushTest;
        const plan = await fixture({
          method: init?.method ?? "GET", search: url.search,
          body: typeof init?.body === "string" ? init.body : null,
        });
        if ("waitForAbort" in plan) return new Promise<Response>((_resolve, reject) => {
          const signal = init?.signal;
          const abort = () => reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
          if (signal?.aborted) abort();
          else signal?.addEventListener("abort", abort, { once: true });
        });
        return Response.json(plan.json, { status: plan.status, headers: plan.headers });
      }
      const response = await fetchFromApp(input, init);
      if (!response.ok || url.pathname !== "/api/push/devices" || url.searchParams.get("context") !== "consent")
        return response;
      return Response.json({ ...await response.json(), deliveryEnabled: true });
    };
  });
  await openProfile(page, fixture.patient, true);
  await acceptPush(page);
  await concludePush(page, "Inscrição confirmada");
  await openCurrentTest(page);
  const start = deviceSheet(page).getByRole("button", { name: "Enviar teste", exact: true });
  await expect(start).toBeEnabled();
  return start;
}

test("L4 teste pessoal limita a espera a 30 segundos e consulta a mesma chave duas vezes", async ({ page }, info) => {
  const posted: { deviceId: string; idempotencyKey: string }[] = [];
  const checked: URLSearchParams[] = [];
  const start = await openControlledPersonalTest(page, request => {
    if (request.method === "POST") {
      posted.push(JSON.parse(request.body ?? "{}"));
      return { waitForAbort: true };
    }
    checked.push(new URLSearchParams(request.search));
    return { json: { data: checked.length === 1
      ? { id: randomUUID(), state: "processing", requestedAt: new Date().toISOString(), code: null }
      : null } };
  });

  await page.clock.install();
  await start.click();
  const waiting = deviceSheet(page).getByRole("status").filter({ hasText: "Aguardando o serviço" });
  await expect(waiting).toBeVisible();
  await expect.poll(() => posted.length).toBe(1);
  await capturePushPanel(page, info, "teste");
  await page.clock.fastForward(24_000);
  await expect(waiting).toBeVisible();
  await info.attach("teste-pessoal-em-espera", { body: await page.screenshot(), contentType: "image/png" });
  await page.clock.fastForward(6_100);
  const timeout = page.getByRole("dialog", { name: "O teste não respondeu a tempo", exact: true });
  const unconfirmed = page.getByRole("dialog", { name: "Não foi possível confirmar o teste", exact: true });
  await expect(timeout).toBeVisible();
  for (const width of [360, 412]) {
    await page.setViewportSize({ width, height: 900 });
    await auditFromTop(page, `E11-07 prazo de teste em ${width} px`);
    await info.attach(`teste-pessoal-prazo-${width}`, { body: await page.screenshot(), contentType: "image/png" });
  }
  for (let index = 0; index < 2; index++) {
    await (index === 0 ? timeout : unconfirmed).getByRole("button", { name: "Conferir este teste", exact: true }).press("Enter");
    await expect.poll(() => checked.length).toBe(index + 1);
    await expect(unconfirmed).toBeVisible();
  }
  await expect(unconfirmed.getByRole("button", { name: "Copiar detalhes", exact: true })).toBeVisible();
  await expect(unconfirmed.getByText("Copie os detalhes e avise o responsável pelo sistema.")).toBeVisible();
  await unconfirmed.getByRole("button", { name: "Voltar", exact: true }).press("Enter");
  await expect(unconfirmed).toBeHidden();
  await page.reload();
  await expect(page.getByRole("tab", { name: "Avisos e aplicativo", exact: true })).toHaveAttribute("aria-selected", "true");
  await openPushPanel(page);
  await openCurrentTest(page);
  await deviceSheet(page).getByRole("button", { name: "Ver detalhes do teste", exact: true }).press("Enter");
  await expect(unconfirmed).toBeVisible();
  expect(checked.map(params => [params.get("deviceId"), params.get("idempotencyKey")]))
    .toEqual(Array.from({ length: 2 }, () => [posted[0].deviceId, posted[0].idempotencyKey]));
  expect(posted).toHaveLength(1);
});

test("L4 teste pessoal respeita Retry-After e só confirma aceitação pelo serviço", async ({ page }) => {
  const keys: string[] = [];
  const start = await openControlledPersonalTest(page, request => {
    expect(request.method).toBe("POST");
    keys.push(JSON.parse(request.body ?? "{}").idempotencyKey);
    if (keys.length === 1)
      return { status: 429, headers: { "Retry-After": "95" }, json: { code: "RATE_LIMITED", error: "Aguarde." } };
    return { json: { data: { id: randomUUID(), state: "accepted", requestedAt: new Date().toISOString(), code: null } } };
  });

  await page.clock.install();
  await start.click();
  const limited = page.getByRole("dialog", { name: "Limite de testes atingido" });
  await expect(limited).toBeVisible();
  await limited.getByRole("button", { name: "Voltar", exact: true }).press("Enter");
  await expect(limited).toBeHidden();
  await page.clock.fastForward(60_000);
  await expect(start).toBeDisabled();
  await page.clock.fastForward(36_000);
  await expect(start).toBeEnabled();
  expect(keys).toHaveLength(1);
  await start.click();
  const accepted = page.getByRole("dialog", { name: "Teste aceito pelo serviço" });
  await expect(accepted).toBeVisible();
  await expect(accepted.getByText(/a aceitação ainda não confirma a exibição/i)).toBeVisible();
  expect(keys).toHaveLength(2);
  expect(keys[0]).not.toBe(keys[1]);
});

test("Web Push liga consentimento real de API, evento interno, worker controlado e destino Auth sem ciência ou cruzamento de aparelhos", async ({
  page,
}, info) => {
  const f = await setup(),
    first = subscription(),
    second = subscription();
  const deviceLabel = "Navegador fictício " + randomUUID().slice(0, 8);
  const otherDeviceLabel = "Outro aparelho fictício " + randomUUID().slice(0, 8);
  await adapter(page, first, "granted", true);
  await openProfile(page, f.patient);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { hcaPushCapability: { requests: number } })
          .hcaPushCapability.requests,
    ),
  ).toBe(0);
  await acceptPush(page, deviceLabel);
  await concludePush(page, "Inscrição confirmada");
  await expect(panel(page).getByText("Confirmada para a sessão atual", { exact: true })).toBeVisible();
  await openCurrentTest(page, deviceLabel);
  await expect(deviceSheet(page, deviceLabel).getByRole("button", { name: "Enviar teste", exact: true })).toBeDisabled();
  await deviceSheet(page, deviceLabel).getByRole("button", { name: "Voltar", exact: true }).press("Enter");
  // The guarded local runner keeps external delivery off; enrollment is not delivery proof.
  const consent = await (await page.request.get("/api/push/devices?context=consent")).json();
  const thisDevice = consent.devices.find((device: { fingerprint: string }) => device.fingerprint === createHash("sha256").update(first.endpoint).digest("hex"));
  expect(consent.deliveryEnabled).toBe(false);
  const disabledTest = await page.request.post("/api/push/test", { data: { deviceId: thisDevice.id, idempotencyKey: randomUUID(), contextReference: consent.contextReference } });
  expect(disabledTest.status()).toBe(503);
  expect((await disabledTest.json()).code).toBe("PUSH_NOT_CONFIGURED");
  const lookup = await page.request.get("/api/push/test", { params: { deviceId: thisDevice.id, idempotencyKey: randomUUID() } });
  expect(lookup.status()).toBe(200);
  expect(lookup.headers()["cache-control"]).toBe("no-store");
  expect(await lookup.json()).toEqual({ data: null });
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
  await panel(page).getByRole("button", { name: "Ver dispositivos", exact: true }).press("Enter");
  await expect(page.getByRole("tab", { name: "Dispositivos", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(
    devicesPanel(page).getByText(otherDeviceLabel, { exact: true }),
  ).toBeVisible();
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));
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
  await page.goto("/perfil?profileTab=devices");
  await devicesPanel(page).getByRole("button", { name: new RegExp(deviceLabel) }).press("Enter");
  const device = deviceSheet(page, deviceLabel);
  await expect(device).toBeVisible();
  const renamed = deviceLabel + " atualizado";
  await device.getByRole("textbox", { name: "Nome do aparelho", exact: true }).fill(renamed);
  await device.getByRole("button", { name: "Salvar nome", exact: true }).press("Enter");
  await concludePush(page, "Nome do aparelho atualizado");
  const renamedSheet = deviceSheet(page, renamed);
  await expect(renamedSheet).toBeVisible();
  await page.evaluate(() => {
    const realFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const receipt = await realFetch(input, init);
      const url = new URL(input instanceof Request ? input.url : input, location.origin);
      if (receipt.ok && url.pathname === "/api/push/devices" && init?.method === "PATCH" &&
        typeof init.body === "string" && JSON.parse(init.body).action === "pause")
        throw new TypeError("Failed to fetch after confirmed synthetic pause");
      return receipt;
    };
  });
  await renamedSheet.getByRole("button", { name: "Pausar por 8 horas", exact: true }).press("Enter");
  await page.getByRole("dialog", { name: "Pausar avisos por 8 horas?", exact: true })
    .getByRole("button", { name: "Pausar por 8 horas", exact: true }).press("Enter");
  await page.getByRole("dialog", { name: "O resultado dos avisos ainda não foi confirmado", exact: true })
    .getByRole("button", { name: "Conferir resultado", exact: true }).press("Enter");
  await concludePush(page, "Avisos pausados");
  await expect(renamedSheet.getByText("Uma pausa nos avisos", { exact: true })).toBeVisible();
  await capturePushPanel(page, info, "pausa");
  expect(sql(`select count(*) from private.web_push_device_events where device_id=${sqlLiteral(thisDevice.id)} and event='pause';`)).toBe("1");
  await renamedSheet.getByRole("button", { name: "Retomar avisos", exact: true }).press("Enter");
  await page.getByRole("dialog", { name: "Retomar os avisos?", exact: true })
    .getByRole("button", { name: "Retomar avisos", exact: true }).press("Enter");
  await concludePush(page, "Avisos retomados");
  await renamedSheet.getByRole("button", { name: "Revogar inscrição", exact: true }).press("Enter");
  await page.getByRole("dialog", { name: "Revogar esta inscrição?", exact: true })
    .getByRole("button", { name: "Revogar inscrição", exact: true }).press("Enter");
  await concludePush(page, "Inscrição revogada");
  await renamedSheet.getByRole("button", { name: "Voltar", exact: true }).press("Enter");
  await expect(
    devicesPanel(page)
      .getByRole("listitem")
      .filter({ has: page.getByText(renamed, { exact: true }) })
      .getByText("Revogado", { exact: true }),
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
}, info) => {
  const f = await setup(),
    value = subscription();
  await adapter(page, value, "denied");
  await openProfile(page, f.patient);
  await page.bringToFront();
  await activate(page).scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(async () =>
    (await navigator.serviceWorker.getRegistration("/"))?.active?.state,
  )).toBe("activated");
  await expect(activate(page)).toBeEnabled();
  await acceptPush(page);
  await expect.poll(() => page.evaluate(() =>
    (window as unknown as { hcaPushCapability: { requests: number } }).hcaPushCapability.requests,
  )).toBe(1);
  await expect(panel(page).getByText("Permissão bloqueada", { exact: true })).toBeVisible();
  await capturePushPanel(page, info, "bloqueio");
  await expect(activate(page)).toHaveCount(0);
  await panel(page)
    .getByRole("button", { name: "Conferir permissão", exact: true })
    .press("Enter");
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
    .getByRole("button", { name: "Conferir permissão", exact: true })
    .press("Enter");
  await expect(
    panel(page).getByText("Este navegador não oferece avisos", { exact: true }),
  ).toBeVisible();
  await expect(activate(page)).toHaveCount(0);
  await auditFromTop(page, "push-unavailable");
  await panel(page).getByRole("link", { name: "Abrir central", exact: true }).press("Enter");
  await expect(
    page.getByRole("heading", { name: "Avisos", exact: true }),
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
  await expect(activate(page)).toBeDisabled();
  expect(await page.evaluate(() => (window as unknown as { hcaPushCapability: { requests: number; subscriptions: number } }).hcaPushCapability)).toMatchObject({ requests: 0, subscriptions: 0 });
  await panel(page).getByRole("button", { name: "Voltar", exact: true }).press("Enter");
  await page.getByRole("button", { name: /^Aplicativo Instalação e preparação/ }).click();
  const app = page.getByRole("dialog", { name: "Aplicativo neste aparelho", exact: true });
  const failure = page.getByRole("dialog", { name: "Falha na preparação", exact: true });
  await expect(failure).toContainText("Confira a conexão e o acesso a este endereço");
  await failure.getByRole("button", { name: "Entendi", exact: true }).click();
  const attempts = await page.evaluate(() => (window as unknown as { hcaRegistrationGate: { calls: number } }).hcaRegistrationGate.calls);
  await app.getByRole("button", { name: "Verificar atualizações", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { hcaRegistrationGate: { calls: number } }).hcaRegistrationGate.calls)).toBeGreaterThan(attempts);
  await expect(failure).toBeVisible();
  await failure.getByRole("button", { name: "Entendi", exact: true }).click();
  const clock = await page.evaluate(() => performance.timeOrigin);
  await page.evaluate(() => { (window as unknown as { hcaRegistrationGate: { blocked: boolean } }).hcaRegistrationGate.blocked = false; });
  await app.getByRole("button", { name: "Conferir preparação", exact: true }).click();
  const prepared = page.getByRole("dialog", { name: "Aplicativo preparado", exact: true });
  await expect(prepared).toBeVisible();
  await prepared.getByRole("button", { name: "Entendi", exact: true }).click();
  await expect(app.getByText("Orientação pública disponível para falta de conexão.", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(clock);
  expect(await page.evaluate(() => matchMedia("(display-mode: standalone)").matches)).toBe(false);
  const checkUpdates = app.getByRole("button", { name: "Verificar atualizações", exact: true });
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 950 });
    // Audit the page at its known origin, then check the actual update target
    // at a separate, reachable scroll position.
    await auditFromTop(page, "PWA-preparation-recovery-" + width);
    await checkUpdates.evaluate(element => element.scrollIntoView({ block: "center" }));
    await checkUpdates.focus();
    await expect(checkUpdates).toBeFocused();
    await expect.poll(() => checkUpdates.evaluate(element => {
      const bounds = element.getBoundingClientRect();
      return [-11, 11].every(offset => element.contains(document.elementFromPoint(
        bounds.left + bounds.width / 2, bounds.top + bounds.height / 2 + offset,
      )));
    })).toBe(true);
  }
  await app.getByRole("button", { name: "Voltar", exact: true }).click();
  await openPushPanel(page);
  await expect(activate(page)).toBeEnabled();
  expect(await page.evaluate(() => (window as unknown as { hcaPushCapability: { requests: number } }).hcaPushCapability.requests)).toBe(0);
  await acceptPush(page);
  await concludePush(page, "Inscrição confirmada");
  expect(await page.evaluate(() => (window as unknown as { hcaPushCapability: { requests: number; subscriptions: number } }).hcaPushCapability)).toMatchObject({ requests: 1, subscriptions: 1 });
  expect(sql(`select count(*) from private.web_push_devices where fingerprint=${sqlLiteral(createHash("sha256").update(value.endpoint).digest("hex"))} and user_id=${sqlLiteral(fixtures.family.id)} and state='active';`)).toBe("1");
});


for (const account of ["professional", "family"] as const) test("Web Push refuses a permission result from another account session while the original tab remains open: " + account, async ({ page, context }) => {
  const f = await setup(), value = subscription();
  await adapter(page, value, "granted");
  await openProfile(page, f.patient);
  await expect(activate(page)).toBeEnabled();
  await page.evaluate(() => {
    const permission = Notification.requestPermission.bind(Notification);
    (Notification as unknown as { requestPermission: () => Promise<NotificationPermission> }).requestPermission = () => new Promise(resolve => {
      (window as unknown as { releasePushPermission: () => void }).releasePushPermission = () => { void permission().then(resolve); };
    });
  });
  await page.bringToFront();
  await acceptPush(page);
  await expect.poll(() => page.evaluate(() => typeof (window as unknown as { releasePushPermission?: unknown }).releasePushPermission)).toBe("function");
  const originalContext = await (await page.request.get("/api/push/devices?context=consent")).json();
  expect(originalContext.contextReference).toMatch(/^[a-f0-9]{64}$/);
  const peer = await context.newPage();
  await peer.goto("/login");
  await peer.getByLabel("E-mail", { exact: true }).fill(fixtures[account].email);
  await peer.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await peer.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(peer.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  const automatic: BrowserResponse[] = [];
  const observe = (response: BrowserResponse) => { if (response.url().endsWith("/api/push/devices") && response.request().method() === "POST") automatic.push(response); };
  page.on("response", observe);
  await page.evaluate(() => (window as unknown as { releasePushPermission: () => void }).releasePushPermission());
  // Account refresh can unmount the old panel before its permission result.
  // Otherwise its own request must be refused; neither path can enroll the peer.
  const refreshedProfile = (await (await page.request.get("/api/profile")).json()).data;
  // A different account remounts its own settings; the same account with a
  // new session must retain the explicit stale-consent refusal.
  const rejected = page.getByRole("dialog", { name: "Não foi possível concluir a alteração dos avisos", exact: true });
  await expect.poll(async () => (account !== "family" && (await page.getByLabel("Menu do usuário", { exact: true }).textContent())?.includes(refreshedProfile.full_name)) || await rejected.isVisible()).toBe(true);
  page.off("response", observe);
  for (const rejected of automatic) {
    expect(rejected.status(), await rejected.text()).toBe(409);
    expect(await rejected.json()).toMatchObject({ code: "VERSION_CONFLICT" });
  }
  const refused = await page.request.post("/api/push/devices", { data: { subscription: value, label: "Stale permission reference", consent: true, contextReference: originalContext.contextReference } });
  expect(refused.status(), await refused.text()).toBe(409);
  expect(await refused.json()).toMatchObject({ code: "VERSION_CONFLICT" });
  const fingerprint = createHash("sha256").update(value.endpoint).digest("hex");
  expect(sql("select count(*) from private.web_push_devices where fingerprint=" + sqlLiteral(fingerprint) + ";")).toBe("0");
  if (account === "family") await expect(rejected).toContainText("sessão");
  const legacy = await (await page.request.get("/api/push/devices")).json();
  expect(legacy).not.toHaveProperty("contextReference");
  await page.reload();
  await openPushPanel(page);
  await expect(activate(page)).toBeEnabled();
  await acceptPush(page);
  await concludePush(page, "Inscrição confirmada");
  const device = JSON.parse(sql("select jsonb_build_object('id',id,'userId',user_id,'state',state) from private.web_push_devices where fingerprint=" + sqlLiteral(fingerprint) + ";"));
  expect(device).toMatchObject({ userId: fixtures[account].id, state: "active" });
  const staleCommand = await page.request.patch("/api/push/devices", { data: { id: device.id, action: "revoke", contextReference: originalContext.contextReference } });
  expect(staleCommand.status()).toBe(409);
  expect(sql("select state from private.web_push_devices where id=" + sqlLiteral(device.id) + ";")).toBe("active");
  await peer.close();
});
