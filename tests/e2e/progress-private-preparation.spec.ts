import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import {
  progressPreparationFixture as fixture,
  fixtures,
  actor,
  rpc,
  sql,
  q,
} from "../integration/progress-preparation-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
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
async function login(page: Page, patient: string, email = fixtures.family.email) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
}
async function open(page: Page, id: string) {
  await page.goto("/documentos/" + id);
  await selectDocumentSection(page, "progress");
  await expect(
    page.getByRole("button", { name: /^(Novo andamento|Recuperar preenchimento de andamento)$/ }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: /^(Novo andamento|Recuperar preenchimento de andamento)$/ })
    .click();
}
async function showEditor(page: Page) {
 if (await page.getByRole("dialog", { name: /Novo andamento|Recuperar publicação de andamento/ }).count() === 0) await page.getByRole("button", { name: /^(Novo andamento|Recuperar publicação|Recuperar preenchimento de andamento)$/ }).click();
}
const editor = (page: Page) =>
  page.getByRole("dialog", { name: "Novo andamento", exact: true });
const privatePanel = (page: Page) =>
  page.getByRole("region", { name: "Rascunho privado", exact: true });
const notes = (id: string) =>
  Number(
    sql(
      `select count(*) from private.document_progress_notes where document_id=${q(id)}`,
    ),
  );

test("Andamento guarda categoria e etapa antes do texto e descarta a audiência do rascunho anterior", async ({ page }) => {
  const f = await fixture();
  const family = await shiftWorker(f.patient, "family");
  await login(page, f.patient, family.email);
  await open(page, f.id);
  const dialog = editor(page);
  const text = dialog.getByRole("textbox", { name: "Texto do andamento", exact: true });
  const category = dialog.getByLabel("Categoria", { exact: true });
  const stage = dialog.getByLabel("Etapa relacionada (opcional)", { exact: true });
  const saved = dialog.getByText("Último rascunho salvo.", { exact: true });
  const close = page.getByRole("dialog", { name: "Sair sem publicar o andamento?", exact: true });
  const choice = page.getByRole("dialog", { name: "Continuar seu rascunho?", exact: true });

  await expect(dialog.getByRole("button", { name: "Salvar preenchimento privado", exact: true })).toBeDisabled();
  await category.selectOption("contact");
  await stage.selectOption("family_science");
  await expect(saved).toBeVisible();
  await dialog.getByRole("button", { name: "Fechar diálogo", exact: true }).click();
  await close.getByRole("button", { name: "Guardar e sair", exact: true }).click();
  await expect(close).toHaveCount(0);
  await expect(dialog).toHaveCount(0);
  await open(page, f.id);
  await choice.getByRole("button", { name: "Continuar rascunho", exact: true }).click();
  await expect(category).toHaveValue("contact");
  await expect(stage).toHaveValue("family_science");
  await expect(text).toHaveValue("");

  const professionalName = sql("select full_name from public.profiles where id=" + q(fixtures.professional.id));
  await text.fill("Rascunho com menção @Teste");
  await dialog.getByRole("button", { name: "@" + professionalName, exact: true }).click();
  const removeMention = dialog.getByRole("button", { name: "Remover menção a " + professionalName, exact: true });
  await expect(removeMention).toBeVisible();
  await dialog.getByRole("button", { name: "Guardar rascunho e fechar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await showEditor(page);
  await choice.getByRole("button", { name: "Descartar e começar novamente", exact: true }).click();
  await expect(text).toHaveValue("");
  await expect(removeMention).toHaveCount(0);
  expect(notes(f.id)).toBe(0);

  const body = "Novo registro privado sem menção.";
  await text.fill(body);
  await dialog.getByRole("button", { name: "Registrar andamento", exact: true }).click();
  await expect(page.getByText(/^Andamento publicado\./)).toBeVisible();
  await expect(dialog).toHaveCount(0);
  const own = await rpc(family.client, "document_progress", { p_document: f.id, p_filter: "manual" });
  expect(own.total).toBe(1);
  expect(own.data[0]).toMatchObject({ text: body, mentions: [], visibility: "family" });
  const professional = await actor("professional", f.patient);
  const other = await rpc(professional, "document_progress", { p_document: f.id, p_filter: "manual" });
  expect(other.total).toBe(0);
});

test("último Andamento também fica guardado ao fechar voluntariamente, retoma quatro campos e resolve CAS sem publicar", async ({ page, browser }) => {
 const f = await fixture(); await login(page, f.patient); await open(page, f.id);
 const text = editor(page).getByRole("textbox", { name: "Texto do andamento", exact: true });
 await text.fill("Último preenchimento guardado ao sair.");
 await editor(page).getByLabel("Categoria", { exact: true }).selectOption("contact");
 await editor(page).getByLabel("Etapa relacionada (opcional)", { exact: true }).selectOption("family_science");
 await expect(editor(page).getByRole("button", { name: "Guardar rascunho e fechar", exact: true })).toBeEnabled();
 await text.press("Escape");
 const close = page.getByRole("dialog", { name: "Sair sem publicar o andamento?", exact: true }); await expect(close).toBeVisible();
 await close.getByRole("button", { name: "Voltar ao preenchimento", exact: true }).click(); await expect(text).toHaveValue("Último preenchimento guardado ao sair.");
 await expect(close).toHaveCount(0);
 await editor(page).getByRole("button", { name: "Fechar diálogo", exact: true }).click();
 await expect(close).toBeVisible();
 await close.getByRole("button", { name: "Guardar e sair", exact: true }).click(); await expect(editor(page)).toHaveCount(0);
 expect(notes(f.id)).toBe(0);
 const device = await peerContext(browser), peer = await device.newPage();
 try {
  await login(peer, f.patient); await open(peer, f.id); const choice = peer.getByRole("dialog", { name: "Continuar seu rascunho?", exact: true }); await expect(choice).toBeVisible();
  await choice.getByRole("button", { name: "Continuar rascunho", exact: true }).click();
  await expect(editor(peer).getByLabel("Categoria", { exact: true })).toHaveValue("contact");
  await expect(editor(peer).getByLabel("Etapa relacionada (opcional)", { exact: true })).toHaveValue("family_science");
  await expect(editor(peer).getByRole("textbox", { name: "Texto do andamento", exact: true })).toHaveValue("Último preenchimento guardado ao sair.");
  await open(page, f.id); await page.getByRole("button", { name: "Continuar rascunho", exact: true }).click();
  await editor(peer).getByRole("textbox", { name: "Texto do andamento", exact: true }).fill("Texto salvo pela outra sessão.");
  await editor(peer).getByRole("button", { name: "Salvar preenchimento privado", exact: true }).click(); await expect(peer.getByText("Último rascunho salvo.", { exact: true })).toBeVisible();
  await editor(page).getByRole("textbox", { name: "Texto do andamento", exact: true }).fill("Minha edição diante do conflito.");
  await editor(page).getByRole("button", { name: "Salvar preenchimento privado", exact: true }).click();
  await expect(privatePanel(page)).toContainText("Seu texto continua preservado aqui"); await expect(privatePanel(page)).toContainText("Texto salvo pela outra sessão.");
  await privatePanel(page).getByText("Consultar meu texto preservado", { exact: true }).click(); await expect(privatePanel(page)).toContainText("Minha edição diante do conflito.");
  await privatePanel(page).getByRole("button", { name: "Continuar minha edição", exact: true }).click(); await editor(page).getByRole("button", { name: "Salvar preenchimento privado", exact: true }).click();
  await expect(page.getByText("Último rascunho salvo.", { exact: true })).toBeVisible(); expect(notes(f.id)).toBe(0); await audit(page, "L1 retomada simples de Andamento");
  await editor(page).getByRole("button", { name: "Guardar rascunho e fechar", exact: true }).click(); await expect(editor(page)).toHaveCount(0); await open(page, f.id); await page.getByRole("button", { name: "Descartar e começar novamente", exact: true }).click();
  await expect(editor(page).getByRole("textbox", { name: "Texto do andamento", exact: true })).toHaveValue(""); expect(notes(f.id)).toBe(0);
 } finally { await device.close(); }
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
      name: "Verificar salvamento",
      exact: true,
    }),
  ).toBeEnabled();
  expect(notes(f.id)).toBe(0);
  await privatePanel(page)
    .getByRole("button", {
      name: "Verificar salvamento",
      exact: true,
    })
    .click();
  await expect(page.getByText("Último rascunho salvo.", { exact: true })).toBeVisible();
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
    .getByRole("button", { name: "Registrar andamento", exact: true })
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
  await selectDocumentSection(page, "progress");
  await showEditor(page);
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
  await selectDocumentSection(page, "progress");
  await showEditor(page);
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
  sql(
    `update public.care_recipient_memberships set status='revoked' where care_recipient_id=${q(f.patient)} and user_id=${q(fixtures.family.id)}`,
  );
  // Realtime may remove the refresh control as soon as membership is revoked.
  // Observe before revoking and use the normal read invalidation signal;
  // the request, session and database authorization remain real.
  await page.evaluate(() => window.dispatchEvent(new Event("hca:data-changed")));
  expect((await page.request.get(`/api/documents/${f.id}/progress`)).status()).toBe(403);
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
  await selectDocumentSection(page, "progress");
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
    .getByRole("button", { name: "Registrar andamento", exact: true })
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
    await peer
      .getByRole("button", { name: "Continuar rascunho", exact: true })
      .click();
    await editor(peer)
      .getByRole("textbox", { name: "Texto do andamento", exact: true })
      .fill(other);
    const peerPublication = peer.waitForResponse(response => new URL(response.url()).pathname === "/api/documents/progress-preparations/commit" && response.request().method() === "POST");
    await editor(peer)
      .getByRole("button", { name: "Registrar andamento", exact: true })
      .click();
    const confirmed = await peerPublication; expect(confirmed.status(), await confirmed.text()).toBe(200);
    await expect(peer.locator(".hca-activity-overlay")).toHaveCount(0);
    await expect(editor(peer)).toHaveCount(0);
    const published = peer.getByRole("region", { name: "Andamentos da ficha", exact: true }).getByRole("article").filter({ hasText: other });
    await expect(published).toContainText("Teste family");
    await expect(published.locator("time")).toHaveAttribute("datetime", /.+/);
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
        name: /^(Recuperar reconhecimento do resultado|Verificar salvamento)$/,
      }),
    ).toBeEnabled();
    await page.reload();
    await selectDocumentSection(page, "progress");
    await page.unroute("**/api/documents/progress-preparations");
    await showEditor(page);
    await privatePanel(page)
      .getByRole("button", {
        name: /^(Recuperar reconhecimento do resultado|Verificar salvamento)$/,
        exact: true,
      })
      .click();
    await showEditor(page);
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
