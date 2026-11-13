import { selectProfileSection } from "./profile-sections";
import { test, expect, type Page, type Route } from "@playwright/test";
import { randomUUID, createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { setup, actor, rpc, fixtures, env } from "../integration/v4-fixtures.mjs";
import { sourceFactsFixture } from "../integration/pdf-source-facts-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";
import { generatedPdf } from "./generated-pdf";

test.setTimeout(180000);
test.use({ serviceWorkers: "allow" });
test.afterEach(async ({ page }) => {
  if (!page.isClosed()) await page.unrouteAll({ behavior: "wait" });
});
const pwa = (page: Page) =>
  page.getByRole("region", { name: "Aplicativo neste aparelho", exact: true });
async function login(page: Page, patient: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.family.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
}
async function profile(page: Page, patient: string) {
  await page.goto("/perfil?careRecipientId=" + patient);
  await selectProfileSection(page, "notices");
  await expect(
    pwa(page).getByText(
      "Orientação pública disponível para falta de conexão.",
      { exact: true },
    ),
  ).toBeVisible();
}
const cachePaths = (page: Page) =>
  page.evaluate(async () => {
    const paths: string[] = [];
    for (const name of await caches.keys())
      if (name.startsWith("hca-public-pwa-"))
        for (const request of await (await caches.open(name)).keys())
          paths.push(new URL(request.url).pathname);
    return paths.sort();
  });

test("PWA real oferece manifesto, ícones e fallback público sem cache de API, ficha ou PDF privado", async ({
  page,
  context,
}, info) => {
  const f = await sourceFactsFixture();
  await login(page, f.patient);
  await profile(page, f.patient);
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller?.state))
    .toBe("activated");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "/manifest.webmanifest",
  );
  const manifest = await page.request.get("/manifest.webmanifest");
  expect(manifest.status()).toBe(200);
  const model = readFileSync("Home_Care_Assistant_Modelo_Integral.html", "utf8");
  const theme = /<meta name="theme-color" content="([^"]+)"/.exec(model)![1];
  const background = /--bg:([^;]+)/.exec(model)![1];
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", theme);
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute("content", "light");
  expect(await manifest.json()).toMatchObject({
    id: "/",
    name: "Home Care Assistant",
    scope: "/",
    start_url: "/",
    display: "standalone",
    lang: "pt-BR",
    theme_color: theme,
    background_color: background,
  });
  for (const size of [192, 512]) {
    const icon = await page.request.get(`/pwa/icon-${size}.png`);
    expect(icon.status()).toBe(200);
    expect(await sharp(await icon.body()).metadata()).toMatchObject({
      width: size,
      height: size,
      format: "png",
    });
  }
  const sw = await page.request.get("/service-worker.js");
  expect(sw.headers()["cache-control"]).toContain("no-store");
  expect(sw.headers()["service-worker-allowed"]).toBe("/");
  expect(
    await page.evaluate(async () => (await fetch("/api/profile")).status),
  ).toBe(200);
  expect(await page.evaluate(async () => (await fetch("/perfil")).status)).toBe(
    200,
  );
  const pdf = await generatedPdf(page, `/api/documents/${f.doc.id}/pdf`),
    bytes = await pdf.body();
  const browserPdf = await page.evaluate(async (url) => {
    const response = await fetch(url),
      bytes = await response.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return {
      status: response.status,
      sha256: [...new Uint8Array(digest)]
        .map((v) => v.toString(16).padStart(2, "0"))
        .join(""),
    };
  }, pdf.url());
  expect(browserPdf).toEqual({
    status: 200,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  });
  expect(await cachePaths(page)).toEqual([
    "/offline.html",
    "/pwa/apple-180.png",
    "/pwa/icon-192.png",
    "/pwa/icon-512.png",
  ]);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 950 });
    await audit(page, "PWA settings " + width);
  }
  // Chromium may keep worker-owned fetches online while the frame is offline.
  // Abort that real network leg; the real worker must still read its own cache.
  const blockedWorkerNavigations: string[] = [];
  const offlineWorkerNetwork = (route: Route) => {
    if (route.request().serviceWorker()) {
      blockedWorkerNavigations.push(new URL(route.request().url()).pathname);
      return route.abort("internetdisconnected");
    }
    return route.continue();
  };
  await context.route("**/*", offlineWorkerNetwork);
  await context.setOffline(true);
  const offlineNavigation = await page.goto(`/historico/${f.doc.id}`);
  expect(offlineNavigation?.fromServiceWorker()).toBe(true);
  // Only Chromium exposes worker-owned requests to Playwright routing.
  // WebKit's native offline transition is proved below by the real fallback,
  // absent private content/API access, and successful online reconnection.
  if (info.project.name !== "ios")
    expect(blockedWorkerNavigations).toContain(`/historico/${f.doc.id}`);
  await info.attach("offline-navigation-delivery", { body: JSON.stringify({
    fromServiceWorker: offlineNavigation?.fromServiceWorker(), status: offlineNavigation?.status(),
    cacheControl: offlineNavigation?.headers()["cache-control"],
  }), contentType: "application/json" });
  await expect(
    page.getByRole("heading", {
      name: "Sem conexão com o aplicativo",
      exact: true,
    }),
  ).toBeVisible();
  expect(await page.locator("body").innerText()).not.toContain(f.doc.code);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", theme);
  const referenceBackground = await page.evaluate(color => {
    const style = document.createElement("div").style;
    style.backgroundColor = color;
    return style.backgroundColor;
  }, background);
  await expect(page.locator("body")).toHaveCSS("background-color", referenceBackground);
  expect(
    await page.evaluate(() =>
      fetch("/api/profile").then(
        () => "unexpected-response",
        () => "offline",
      ),
    ),
  ).toBe("offline");
  await audit(page, "PWA public offline", "Sem conexão · Home Care Assistant");
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await page.screenshot({
    path: `output/playwright/phase-d/pwa-offline-${info.project.name}.png`,
    fullPage: true,
  });
  await context.unroute("**/*", offlineWorkerNetwork);
  await context.setOffline(false);
  await page
    .getByRole("link", { name: "Tentar abrir novamente", exact: true })
    .click();
  await expect(page.getByRole("main")).toContainText(f.doc.code);
  expect(await cachePaths(page)).toEqual([
    "/offline.html",
    "/pwa/apple-180.png",
    "/pwa/icon-192.png",
    "/pwa/icon-512.png",
  ]);
});

test("PWA conserva edição em offline, falha e incompatibilidade e só libera após consulta real compatível", async ({
  page,
  context,
}) => {
  const f = await setup(),
    marker = "Edição fictícia ainda não salva " + randomUUID();
  await login(page, f.patient);
  await profile(page, f.patient);
  await selectProfileSection(page, "identity");
  const name = page.getByRole("textbox", { name: "Nome", exact: true });
  await name.fill(marker);
  const input = page.locator('input[name="name"]');
  await page.evaluate(() => {
    // Network routing around a real service worker differs by browser engine.
    // Faults enter at the HTTP consumer; live recovery still uses native fetch.
    const scope = window as typeof window & {
      hcaRuntimeFault?: string;
      hcaRuntimeFaultCount?: number;
      hcaRuntimeWrites?: number;
    };
    const native = window.fetch.bind(window);
    scope.hcaRuntimeFault = "live";
    scope.hcaRuntimeFaultCount = 0;
    scope.hcaRuntimeWrites = 0;
    window.fetch = (input, init) => {
      const url = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input.url,
        window.location.href,
      );
      const mode = scope.hcaRuntimeFault;
      const method = (
        init?.method ?? (input instanceof Request ? input.method : "GET")
      ).toUpperCase();
      if (
        url.origin === location.origin &&
        url.pathname.startsWith("/api/") &&
        !["GET", "HEAD", "OPTIONS"].includes(method)
      )
        scope.hcaRuntimeWrites = (scope.hcaRuntimeWrites ?? 0) + 1;
      if (url.pathname !== "/api/runtime" || mode === "live")
        return native(input, init);
      scope.hcaRuntimeFaultCount = (scope.hcaRuntimeFaultCount ?? 0) + 1;
      return Promise.resolve(
        new Response(
          mode === "malformed"
            ? "{"
            : JSON.stringify(
                mode === "protocol"
                  ? { state: "ready", protocol: 2, schema: 1 }
                  : { state: mode },
              ),
          {
            status: mode === "malformed" || mode === "protocol" ? 200 : 503,
            headers: { "content-type": "application/json" },
          },
        ),
      );
    };
  });
  const banner = page.locator(
    'section[aria-label="Conexão e versão do aplicativo"]',
  );
  for (const failure of [
    "unavailable",
    "incompatible",
    "malformed",
    "protocol",
  ]) {
    if (failure === "unavailable") {
      await page.getByLabel("Menu do usuário", { exact: true }).click();
      await page
        .getByRole("menuitem", { name: "Mudar perfil", exact: true })
        .click();
    }
    const previousInjections = await page.evaluate((failure) => {
      const scope = window as typeof window & {
        hcaRuntimeFault?: string;
        hcaRuntimeFaultCount?: number;
      };
      scope.hcaRuntimeFault = failure;
      const previous = scope.hcaRuntimeFaultCount ?? 0;
      window.dispatchEvent(new Event("online"));
      return previous;
    }, failure);
    await expect(banner).toContainText(
      ["incompatible", "protocol"].includes(failure)
        ? "não são compatíveis"
        : "Não foi possível confirmar",
    );
    expect(await input.inputValue()).toBe(marker);
    expect(
      await input.evaluate((element) => Boolean(element.closest("[inert]"))),
    ).toBe(true);
    expect(
      await page.evaluate(
        () =>
          (window as typeof window & { hcaRuntimeFaultCount?: number })
            .hcaRuntimeFaultCount ?? 0,
      ),
    ).toBeGreaterThan(previousInjections);
    if (failure === "unavailable") {
      const menu = page.getByRole("menu", {
        name: "Contextos autorizados",
        exact: true,
      });
      await menu.getByRole("menuitemradio", { checked: true }).click();
      await expect(menu.getByRole("alert")).toContainText(
        "A ação não foi enviada",
      );
      expect(
        await page.evaluate(
          () =>
            (window as typeof window & { hcaRuntimeWrites?: number })
              .hcaRuntimeWrites,
        ),
      ).toBe(0);
      expect(await input.inputValue()).toBe(marker);
      await page.keyboard.press("Escape");
      await expect(menu).toHaveCount(0);
    }
    await page.evaluate(() => {
      (window as typeof window & { hcaRuntimeFault?: string }).hcaRuntimeFault =
        "live";
    });
    await banner
      .getByRole("button", {
        name: "Consultar conexão e versão novamente",
        exact: true,
      })
      .click();
    await expect(name).toBeVisible();
    await expect(name).toHaveValue(marker);
  }
  await context.setOffline(true);
  await expect(banner).toContainText("Sem conexão");
  expect(await input.inputValue()).toBe(marker);
  await context.setOffline(false);
  await expect(name).toBeVisible();
  await expect(name).toHaveValue(marker);
  expect(
    sql(
      `select full_name from public.profiles where id=${sqlLiteral(fixtures.family.id)};`,
    ),
  ).not.toBe(marker);
});

test("PWA sem confirmação de atualização aguarda abas, preserva edição e recupera rascunho após reabrir", async ({
  page,
  context,
}, info) => {
  const f = await setup(),
    owner = await actor("family", f.patient);
  const body = {
    form: {
      quantities: { [f.products[0]]: "1," },
      notes: "Rascunho PWA fictício",
      origin: "donation",
      source: "FAMILY",
      recipientId: "",
    },
    links: {},
    materials: f.products.map((id, i) => ({
      id,
      name: "Material fictício V4 " + i,
      unit: "unidade",
      quantityDecimals: 0,
    })),
    context: {
      documentId: null,
      documentVersion: null,
      requisitionId: null,
      recipientName: "",
    },
  };
  const saved = await rpc(owner, "supply_draft_command", {
    p_patient: f.patient,
    p_kind: "COM",
    p_purpose: "create",
    p_target: null,
    p_id: null,
    p_expected: null,
    p_body: { action: "save", content: body },
    p_key: randomUUID(),
  });
  const official = () =>
    sql(
      `select jsonb_build_object('documents',(select count(*) from public.operational_documents where care_recipient_id=${sqlLiteral(f.patient)}),'stock',(select count(*) from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)}));`,
    );
  const before = official();
  await login(page, f.patient);
  const peer = await context.newPage();
  async function resume(tab: Page) {
    await tab.goto(`/fichas/com?careRecipientId=${f.patient}`);
    await tab
      .getByRole("region", { name: "Rascunho privado", exact: true })
      .getByRole("button", { name: "Continuar rascunho", exact: true })
      .click();
    for (let i = 0; i < 2; i++)
      await tab.getByRole("button", { name: /^Avançar$|^Revisar$/ }).click();
    return tab.getByRole("textbox", {
      name: "Quantidade — Material fictício V4 0",
      exact: true,
    });
  }
  try {
    const first = await resume(page),
      other = await resume(peer);
    await expect(first).toHaveValue("1,");
    await other.fill("2,");
    const clock = await peer.evaluate(() => performance.timeOrigin);
    // Actual browser lifecycle, controlled new script URL; no fake worker state.
    await peer.evaluate(async () => {
      await navigator.serviceWorker.register(
        "/service-worker.js?update=" + crypto.randomUUID(),
        { scope: "/", updateViaCache: "none" },
      );
    });
    await expect
      .poll(() =>
        peer.evaluate(async () =>
          Boolean((await navigator.serviceWorker.getRegistration())?.waiting),
        ),
      )
      .toBe(true);
    await expect(
      peer.getByText(
        /^Atualização pronta neste aparelho\./,
      ),
    ).toBeVisible();
    await expect(other).toHaveValue("2,");
    await expect(first).toHaveValue("1,");
    expect(await peer.evaluate(() => performance.timeOrigin)).toBe(clock);
    mkdirSync("output/playwright/phase-d", { recursive: true });
    await peer.setViewportSize({ width: 320, height: 950 });
    await audit(peer, "PWA waiting update preserves draft");
    await peer.screenshot({
      path: `output/playwright/phase-d/pwa-update-${info.project.name}.png`,
      fullPage: true,
    });
    await page.close();
    expect(
      await peer.evaluate(async () =>
        Boolean((await navigator.serviceWorker.getRegistration())?.waiting),
      ),
    ).toBe(true);
    await peer
      .getByRole("button", { name: "Salvar rascunho", exact: true })
      .click();
    await expect(
      peer.getByText(
        "Salvo no servidor. Este preenchimento ainda não foi emitido.",
        { exact: true },
      ),
    ).toBeVisible();
    await peer.close();
    const reopened = await context.newPage();
    try {
      await expect(await resume(reopened)).toHaveValue("2,");
      expect(
        sql(
          `select content#>>'{form,quantities,${f.products[0]}}' from private.creation_drafts where id=${sqlLiteral(saved.id)};`,
        ),
      ).toBe("2,");
      expect(official()).toBe(before);
    } finally {
      await reopened.close();
    }
  } finally {
    if (!peer.isClosed()) await peer.close();
  }
});

test("PWA oferece instalação somente por gesto e mantém web quando o worker não está disponível", async ({
  page,
}) => {
  const f = await setup();
  await login(page, f.patient);
  await profile(page, f.patient);
  for (const outcome of ["dismissed", "accepted"] as const) {
    await page.evaluate((outcome) => {
      const state = window as typeof window & { hcaInstallCalls?: number };
      state.hcaInstallCalls = 0;
      const event = new Event("beforeinstallprompt", { cancelable: true });
      Object.defineProperties(event, {
        prompt: {
          value: async () => {
            state.hcaInstallCalls = (state.hcaInstallCalls ?? 0) + 1;
          },
        },
        userChoice: { value: Promise.resolve({ outcome }) },
      });
      window.dispatchEvent(event);
    }, outcome);
    expect(
      await page.evaluate(
        () =>
          (window as typeof window & { hcaInstallCalls?: number })
            .hcaInstallCalls,
      ),
    ).toBe(0);
    await pwa(page)
      .getByRole("button", { name: "Instalar aplicativo", exact: true })
      .click();
    await expect(
      pwa(page).getByText(
        outcome === "dismissed"
          ? "Instalação adiada. O aplicativo web continua disponível."
          : "Pedido aceito. Confira a instalação no navegador.",
        { exact: true },
      ),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () =>
          (window as typeof window & { hcaInstallCalls?: number })
            .hcaInstallCalls,
      ),
    ).toBe(1);
    await expect(
      pwa(page).getByText("Aplicativo instalado neste aparelho.", {
        exact: true,
      }),
    ).toHaveCount(0);
  }
  await page.addInitScript(() => {
    Reflect.deleteProperty(Navigator.prototype, "serviceWorker");
  });
  await page.reload();
  await selectProfileSection(page, "notices");
  await expect(
    pwa(page).getByText(
      "A instalação e a orientação offline não estão disponíveis neste navegador. As funções web continuam disponíveis.",
      { exact: true },
    ),
  ).toBeVisible();
  await selectProfileSection(page, "identity");
  await expect(
    page.getByRole("textbox", { name: "Nome", exact: true }),
  ).toBeEditable();
});


test("PWA keeps an open edit after real session revocation but never caches it or replays it after reconnection", async ({ page, context }) => {
  const f = await setup(), marker = "Edição privada fictícia " + randomUUID();
  await login(page, f.patient); await profile(page, f.patient);
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.state)).toBe("activated");
  await selectProfileSection(page, "identity");
  const name = page.getByRole("textbox", { name: "Nome", exact: true }); await name.fill(marker);
  // Read only this browser's real fixture session through the public SSR adapter.
  // The bearer stays in the Node test process and is never printed or injected.
  const inspector = createServerClient(env.url, env.anonKey, { cookies: { getAll: () => context.cookies(), setAll: () => {} } });
  const claims = await inspector.auth.getClaims();
  expect(claims.error).toBeNull(); expect(claims.data?.claims.sub).toBe(fixtures.family.id);
  const session = await inspector.auth.getSession();
  expect(session.error).toBeNull(); expect(session.data.session).not.toBeNull();
  const service = createClient(env.url, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const revoked = await service.auth.admin.signOut(session.data.session!.access_token, "local");
  expect(revoked.error).toBeNull();
  expect(await page.evaluate(async () => (await fetch("/api/profile", { cache: "no-store" })).status)).toBe(401);
  await expect(name).toHaveValue(marker);
  expect(await cachePaths(page)).toEqual(["/offline.html", "/pwa/apple-180.png", "/pwa/icon-192.png", "/pwa/icon-512.png"]);
  await context.setOffline(true); await page.goto("/perfil");
  await expect(page.getByRole("heading", { name: "Sem conexão com o aplicativo", exact: true })).toBeVisible();
  expect(await page.locator("body").innerText()).not.toContain(marker);
  await context.setOffline(false);
  await page.getByRole("link", { name: "Tentar abrir novamente", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Entrar", exact: true })).toBeVisible();
  expect(sql("select full_name from public.profiles where id=" + sqlLiteral(fixtures.family.id) + ";")).not.toBe(marker);
  expect(await cachePaths(page)).toEqual(["/offline.html", "/pwa/apple-180.png", "/pwa/icon-192.png", "/pwa/icon-512.png"]);
});
