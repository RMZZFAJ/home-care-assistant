import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import {
  progressPreparationFixture as fixture,
  fixtures,
  sql,
  q,
} from "../integration/progress-preparation-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { selectDocumentSection } from "./document-sections";
import { audit } from "./accessibility-audit";
test.setTimeout(150_000);
async function peerContext(browser: import("@playwright/test").Browser) {
  const use = test.info().project.use;
  return browser.newContext({
    baseURL: use.baseURL,
    viewport: use.viewport,
    deviceScaleFactor: use.deviceScaleFactor,
    isMobile: use.isMobile,
    hasTouch: use.hasTouch,
    userAgent: use.userAgent,
    extraHTTPHeaders: use.extraHTTPHeaders,
    serviceWorkers: "block",
  });
}
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
async function open(page: Page, id: string) {
  await page.goto("/documentos/" + id);
  await selectDocumentSection(page, "overview");
  await expect(
    page.getByRole("button", { name: "Registrar andamento", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Registrar andamento", exact: true })
    .click();
}
const editor = (page: Page) =>
  page.getByRole("dialog", { name: "Registrar andamento", exact: true });
const privatePanel = (page: Page) =>
  page.getByRole("region", { name: "Rascunho privado", exact: true });
const notes = (id: string) =>
  Number(
    sql(
      `select count(*) from private.document_progress_notes where document_id=${q(id)}`,
    ),
  );
test("andamento privado retoma em outra sessão e compara CAS sem publicar texto ou perder a edição própria", async ({
  page,
  browser,
}, info) => {
  const f = await fixture();
  await login(page, f.patient);
  await open(page, f.id);
  await editor(page)
    .getByRole("textbox", { name: "Texto do andamento", exact: true })
    .fill("Texto inicial privado entre aparelhos");
  await editor(page)
    .getByLabel("Categoria", { exact: true })
    .selectOption("contact");
  await editor(page)
    .getByLabel("Etapa relacionada (opcional)", { exact: true })
    .selectOption("family_science");
  await editor(page)
    .getByRole("button", { name: "Salvar preenchimento privado", exact: true })
    .click();
  await expect(privatePanel(page)).toContainText("Revisão 1");
  expect(notes(f.id)).toBe(0);
  const use = test.info().project.use;
  const peerContext = await browser.newContext({
    baseURL: use.baseURL,
    viewport: use.viewport,
    deviceScaleFactor: use.deviceScaleFactor,
    isMobile: use.isMobile,
    hasTouch: use.hasTouch,
    userAgent: use.userAgent,
    extraHTTPHeaders: use.extraHTTPHeaders,
    serviceWorkers: "block",
  });
  const peer = await peerContext.newPage();
  try {
    await login(peer, f.patient);
    await open(peer, f.id);
    await expect(privatePanel(peer)).toContainText(
      "Texto inicial privado entre aparelhos",
    );
    await expect(editor(peer).getByRole("textbox")).toHaveCount(0);
    await editor(peer)
      .getByRole("button", { name: "Continuar rascunho", exact: true })
      .click();
    await expect(
      editor(peer).getByLabel("Categoria", { exact: true }),
    ).toHaveValue("contact");
    await expect(
      editor(peer).getByLabel("Etapa relacionada (opcional)", { exact: true }),
    ).toHaveValue("family_science");
    await editor(peer)
      .getByRole("textbox", { name: "Texto do andamento", exact: true })
      .fill("Versão salva pela outra sessão");
    await editor(peer)
      .getByRole("button", {
        name: "Salvar preenchimento privado",
        exact: true,
      })
      .click();
    await expect(privatePanel(peer)).toContainText("Revisão 2");
    await editor(page)
      .getByRole("textbox", { name: "Texto do andamento", exact: true })
      .fill("Minha edição local antes do conflito");
    await editor(page)
      .getByRole("button", {
        name: "Salvar preenchimento privado",
        exact: true,
      })
      .click();
    await expect(privatePanel(page)).toContainText("Sua edição foi preservada");
    await expect(
      privatePanel(page).getByRole("region", {
        name: "Minha edição",
        exact: true,
      }),
    ).toContainText("Minha edição local antes do conflito");
    await expect(
      privatePanel(page).getByRole("region", {
        name: "Versão salva no servidor",
        exact: true,
      }),
    ).toContainText("Versão salva pela outra sessão");
    await privatePanel(page)
      .getByRole("button", {
        name: "Manter minha edição para salvar nova revisão",
        exact: true,
      })
      .click();
    await expect(
      editor(page).getByRole("textbox", {
        name: "Texto do andamento",
        exact: true,
      }),
    ).toHaveValue("Minha edição local antes do conflito");
    await editor(page)
      .getByRole("button", {
        name: "Salvar preenchimento privado",
        exact: true,
      })
      .click();
    await expect(privatePanel(page)).toContainText("Revisão 3");
    expect(notes(f.id)).toBe(0);
    for (const width of [1440, 1150, 850, 500, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await editor(page).evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      await audit(page, "private progress editor " + width);
    }
    await info.attach("andamento privado 320", {
      body: await editor(page).screenshot(),
      contentType: "image/png",
    });
  } finally {
    await peerContext.close();
  }
});
test("save privado e publicação perdidos preservam pacotes distintos,envelope divergente e recuperação sem escrita", async ({
  page,
}) => {
  const f = await fixture();
  await login(page, f.patient);
  await open(page, f.id);
  const text = "Texto pessoal preservado sem publicação automática";
  await editor(page)
    .getByRole("textbox", { name: "Texto do andamento", exact: true })
    .fill(text);
  let saves = 0;
  await page.route("**/api/documents/progress-preparations", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    saves++;
    if (saves === 1) {
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      return route.abort("failed");
    }
    return route.continue();
  });
  await editor(page)
    .getByRole("button", { name: "Salvar preenchimento privado", exact: true })
    .click();
  await expect(
    privatePanel(page).getByRole("button", {
      name: "Recuperar salvamento ou descarte",
      exact: true,
    }),
  ).toBeEnabled();
  expect(notes(f.id)).toBe(0);
  await privatePanel(page)
    .getByRole("button", {
      name: "Recuperar salvamento ou descarte",
      exact: true,
    })
    .click();
  await expect(privatePanel(page)).toContainText("Revisão 1");
  expect(saves).toBe(2);
  await page.unroute("**/api/documents/progress-preparations");
  const packets: unknown[] = [];
  await page.route(
    "**/api/documents/progress-preparations/commit",
    async (route) => {
      packets.push(route.request().postDataJSON());
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      await route.abort("failed");
    },
  );
  await editor(page)
    .getByRole("button", { name: "Publicar andamento", exact: true })
    .click();
  const frozen = page.getByRole("dialog", {
    name: "Recuperar publicação de andamento",
    exact: true,
  });
  await expect(
    frozen.getByRole("button", {
      name: "Recuperar a mesma publicação",
      exact: true,
    }),
  ).toBeEnabled();
  expect(notes(f.id)).toBe(1);
  const storageKey = `hca:progress:${fixtures.family.id}:${f.id}`;
  const original = await page.evaluate(
      (key) => sessionStorage.getItem(key)!,
      storageKey,
    ),
    foreign = JSON.stringify({
      ...JSON.parse(original),
      pending: { ...JSON.parse(original).pending, key: randomUUID() },
    });
  await page.evaluate(({ key, value }) => sessionStorage.setItem(key, value), {
    key: storageKey,
    value: foreign,
  });
  sql(
    `insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${q(f.patient)},'document.progress.create',${q(fixtures.family.id)},false)`,
  );
  await page.reload();
  await selectDocumentSection(page, "overview");
  await expect(privatePanel(page)).toContainText("Andamento publicado por");
  await expect(
    privatePanel(page).getByRole("button", {
      name: "Reconhecer resultado e iniciar outro andamento",
      exact: true,
    }),
  ).toBeDisabled();
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), storageKey),
  ).toBe(foreign);
  expect(packets).toHaveLength(1);
  await page.evaluate(({ key, value }) => sessionStorage.setItem(key, value), {
    key: storageKey,
    value: original,
  });
  await page.reload();
  await selectDocumentSection(page, "overview");
  await expect(privatePanel(page)).toContainText(text);
  await expect(
    privatePanel(page).getByRole("button", {
      name: "Reconhecer resultado e iniciar outro andamento",
      exact: true,
    }),
  ).toBeEnabled();
  expect(
    await page.evaluate((key) => sessionStorage.getItem(key), storageKey),
  ).toBeNull();
  expect(packets).toHaveLength(1);
  expect(notes(f.id)).toBe(1);
  const denied = page.waitForResponse(response => new URL(response.url()).pathname === `/api/documents/${f.id}/progress` && response.request().method() === "GET" && response.status() === 403);
  sql(
    `update public.care_recipient_memberships set status='revoked' where care_recipient_id=${q(f.patient)} and user_id=${q(fixtures.family.id)}`,
  );
  // Realtime may remove the refresh control as soon as membership is revoked.
  // Observe before revoking and use the normal read invalidation signal;
  // the request, session and database authorization remain real.
  await page.evaluate(() => window.dispatchEvent(new Event("hca:data-changed")));
  await denied;
  await expect(page.getByText(text, { exact: true })).toHaveCount(0);
  expect(packets).toHaveLength(1);
});
test("referência legada de publicação ainda recupera o mesmo POST nativo após perda de resposta", async ({
  page,
}) => {
  const f = await fixture();
  await login(page, f.patient);
  await open(page, f.id);
  const packet = {
    key: randomUUID(),
    content: {
      category: "record",
      stage: null,
      text: "Pacote nativo anterior à preparação privada",
      references: [],
    },
  };
  await page.evaluate(({ key, value }) => sessionStorage.setItem(key, value), {
    key: `hca:progress:${fixtures.family.id}:${f.id}`,
    value: JSON.stringify({ content: packet.content, pending: packet }),
  });
  await page.reload();
  await selectDocumentSection(page, "overview");
  await page
    .getByRole("button", { name: "Recuperar publicação", exact: true })
    .click();
  const frozen = page.getByRole("dialog", {
    name: "Recuperar publicação de andamento",
    exact: true,
  });
  const packets: unknown[] = [];
  await page.route(`**/api/documents/${f.id}/progress`, async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    packets.push(route.request().postDataJSON());
    if (packets.length === 1) {
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      return route.abort("failed");
    }
    return route.continue();
  });
  await frozen
    .getByRole("button", { name: "Recuperar a mesma publicação", exact: true })
    .click();
  await expect(
    frozen.getByRole("button", {
      name: "Recuperar a mesma publicação",
      exact: true,
    }),
  ).toBeEnabled();
  expect(notes(f.id)).toBe(1);
  await frozen
    .getByRole("button", { name: "Recuperar a mesma publicação", exact: true })
    .click();
  await expect(frozen).toHaveCount(0);
  expect(packets).toHaveLength(2);
  expect(packets[1]).toEqual(packets[0]);
  expect(packets[0]).toEqual(packet);
  expect(notes(f.id)).toBe(1);
});
test("outra sessão conclui a preparação durante resultado incerto e a edição original sobrevive ao reconhecimento perdido", async ({
  page,
  browser,
}) => {
  const f = await fixture();
  await login(page, f.patient);
  await open(page, f.id);
  const local = "Minha edição original ainda não publicada",
    other = "Texto concluído pela outra sessão";
  await editor(page)
    .getByRole("textbox", { name: "Texto do andamento", exact: true })
    .fill(local);
  const requests: unknown[] = [];
  await page.route(
    "**/api/documents/progress-preparations/commit",
    async (route) => {
      requests.push(route.request().postDataJSON());
      await route.abort("failed");
    },
  );
  await editor(page)
    .getByRole("button", { name: "Publicar andamento", exact: true })
    .click();
  const frozen = page.getByRole("dialog", {
    name: "Recuperar publicação de andamento",
    exact: true,
  });
  await expect(
    frozen.getByRole("button", {
      name: "Conferir tentativa sem reenviar",
      exact: true,
    }),
  ).toBeEnabled();
  expect(notes(f.id)).toBe(0);
  const context = await peerContext(browser),
    peer = await context.newPage();
  try {
    await login(peer, f.patient);
    await open(peer, f.id);
    await editor(peer)
      .getByRole("button", { name: "Continuar rascunho", exact: true })
      .click();
    await editor(peer)
      .getByRole("textbox", { name: "Texto do andamento", exact: true })
      .fill(other);
    await editor(peer)
      .getByRole("button", { name: "Publicar andamento", exact: true })
      .click();
    await expect(editor(peer)).toHaveCount(0);
    await expect(
      peer
        .getByRole("tabpanel", { name: "Visão geral", exact: true })
        .getByRole("region", { name: "Rascunho privado", exact: true }),
    ).toContainText("Andamento publicado por");
    expect(notes(f.id)).toBe(1);
    await frozen
      .getByRole("button", {
        name: "Conferir tentativa sem reenviar",
        exact: true,
      })
      .click();
    await expect(frozen).toContainText("Esta tentativa não foi aplicada");
    expect(requests).toHaveLength(1);
    await frozen
      .getByRole("button", {
        name: "Manter minha edição para novo preenchimento",
        exact: true,
      })
      .click();
    await expect(privatePanel(page)).toContainText(other);
    await page.route(
      "**/api/documents/progress-preparations",
      async (route) => {
        if (
          route.request().method() !== "POST" ||
          route.request().postDataJSON().action !== "acknowledge"
        )
          return route.continue();
        const response = await route.fetch();
        expect(response.ok()).toBe(true);
        await route.abort("failed");
      },
    );
    await privatePanel(page)
      .getByRole("button", {
        name: "Reconhecer resultado e continuar minha edição",
        exact: true,
      })
      .click();
    await expect(
      privatePanel(page).getByRole("button", {
        name: "Recuperar reconhecimento do resultado",
        exact: true,
      }),
    ).toBeEnabled();
    await page.reload();
    await selectDocumentSection(page, "overview");
    await page.unroute("**/api/documents/progress-preparations");
    await privatePanel(page)
      .getByRole("button", {
        name: "Recuperar reconhecimento do resultado",
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("button", { name: "Registrar andamento", exact: true }),
    ).toBeEnabled();
    await page
      .getByRole("button", { name: "Registrar andamento", exact: true })
      .click();
    await expect(
      editor(page).getByRole("textbox", {
        name: "Texto do andamento",
        exact: true,
      }),
    ).toHaveValue(local);
    expect(notes(f.id)).toBe(1);
    expect(requests).toHaveLength(1);
  } finally {
    await context.close();
  }
});
