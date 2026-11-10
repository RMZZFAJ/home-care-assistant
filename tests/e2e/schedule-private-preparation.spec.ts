import { test, expect, type Page, type Browser } from "@playwright/test";
import {
  schedulePreparationFixture as fixture,
  saveSchedulePreparation,
  scheduleNativeFacts,
  scheduleDocumentFacts,
  fixtures,
  sql,
  q,
  shiftCommand,
} from "../integration/schedule-preparation-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";
test.setTimeout(150_000);
async function peerContext(browser: Browser) {
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
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
  await page.goto("/escalas");
  await expect(
    page.getByRole("heading", { name: "Escalas e plantões", exact: true }),
  ).toBeVisible();
}
const dialog = (page: Page, name = "Tipo de plantão") =>
  page.getByRole("dialog", { name, exact: true });
const panel = (page: Page) =>
  page.getByRole("region", { name: "Rascunho privado", exact: true });
const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });
async function open(page: Page, series = false, own = false) {
  if (own) {
    await page
      .getByText("Meus preenchimentos privados da agenda", { exact: true })
      .click();
    await button(
      page,
      series ? "Retomar minha programação" : "Retomar meu tipo de plantão",
    ).click();
  } else
    await button(
      page,
      series ? "Nova programação" : "Novo tipo de plantão",
    ).click();
  await expect(panel(page)).toBeVisible();
  await expect(button(page, "Atualizar preenchimento privado")).toBeEnabled();
}
async function fillType(page: Page, name: string) {
  await dialog(page).getByLabel("Nome do plantão", { exact: true }).fill(name);
  await dialog(page).getByLabel("Início local", { exact: true }).fill("07:00");
  await dialog(page)
    .getByLabel("Duração em minutos", { exact: true })
    .fill("720");
  await dialog(page)
    .getByLabel("Disponível para novas escalas", { exact: true })
    .uncheck();
}
async function review(page: Page) {
  await button(page, "Revisar alteração").click();
  await expect(dialog(page, "Revisar escala")).toBeVisible();
  await expect(button(page, "Confirmar gravação")).toBeEnabled();
}
const frozen = (page: Page) => dialog(page, "Recuperar confirmação da escala");
async function privateSaved(page: Page, revision: number) {
  await button(page, "Salvar preenchimento privado").click();
  await expect(panel(page)).toContainText("Revisão " + revision);
}
test("tipo privado retoma entre sessões,compara CAS e continua consultável sem permissão de escrita", async ({
  page,
  browser,
}, info) => {
  const f = await fixture(),
    before = scheduleNativeFacts(f),
    documents = scheduleDocumentFacts(f);
  await login(page, f.patient);
  await open(page);
  await fillType(page, "Tipo inicial privado");
  await privateSaved(page, 1);
  const context = await peerContext(browser),
    peer = await context.newPage();
  try {
    await login(peer, f.patient);
    await open(peer);
    await expect(panel(peer)).toContainText("Tipo inicial privado");
    await expect(dialog(peer).locator("input,select,textarea")).toHaveCount(0);
    await button(peer, "Continuar rascunho").click();
    await expect(
      dialog(peer).getByLabel("Disponível para novas escalas", { exact: true }),
    ).not.toBeChecked();
    await dialog(peer)
      .getByLabel("Nome do plantão", { exact: true })
      .fill("Versão salva na outra sessão");
    await privateSaved(peer, 2);
    await dialog(page)
      .getByLabel("Nome do plantão", { exact: true })
      .fill("Minha edição antes do conflito");
    await button(page, "Salvar preenchimento privado").click();
    await expect(
      panel(page).getByRole("region", { name: "Minha edição", exact: true }),
    ).toContainText("Minha edição antes do conflito");
    await expect(
      panel(page).getByRole("region", {
        name: "Versão salva no servidor",
        exact: true,
      }),
    ).toContainText("Versão salva na outra sessão");
    await expect(panel(page).locator("input,select,textarea")).toHaveCount(0);
    await button(page, "Manter minha edição para salvar nova revisão").click();
    await privateSaved(page, 3);
    for (const width of [1440, 1150, 850, 500, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await dialog(page).evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      await audit(page, "private schedule type " + width);
    }
    await info.attach("schedule private 320", {
      body: await dialog(page).screenshot(),
      contentType: "image/png",
    });
    expect(scheduleNativeFacts(f)).toBe(before);
    expect(scheduleDocumentFacts(f)).toBe(documents);
    sql(
      `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'schedule.types.manage',false)`,
    );
    await page.reload();
    await expect(button(page, "Novo tipo de plantão")).toHaveCount(0);
    await open(page, false, true);
    await expect(panel(page)).toContainText("Minha edição antes do conflito");
    await expect(button(page, "Continuar rascunho")).toBeDisabled();
    await expect(dialog(page).locator("input,select,textarea")).toHaveCount(0);
    await button(page, "Descartar este preenchimento").click();
    await dialog(page, "Descartar rascunho privado")
      .getByRole("button", {
        name: "Confirmar descarte do rascunho",
        exact: true,
      })
      .click();
    await expect(panel(page)).not.toContainText(
      "Minha edição antes do conflito",
    );
    expect(scheduleNativeFacts(f)).toBe(before);
  } finally {
    await context.close();
  }
});
test("programação parcial sobrevive ao recarregamento e publicação perdida é consultada sem escrita nem exposição após revogação", async ({
  page,
}) => {
  const f = await fixture("schedule_series_create"),
    before = scheduleDocumentFacts(f);
  await login(page, f.patient);
  await open(page, true);
  const form = dialog(page, "Programação de plantões");
  await form
    .getByLabel("Observações", { exact: true })
    .fill("Minha programação pessoal preservada");
  await form.getByLabel("Primeiro dia / âncora", { exact: true }).fill("");
  await button(page, "Guardar rascunho e fechar").click();
  await expect(form).toHaveCount(0);
  await page.reload();
  await open(page, true, true);
  await expect(panel(page)).toContainText(
    "Minha programação pessoal preservada",
  );
  await expect(form.locator("input,select,textarea")).toHaveCount(0);
  await button(page, "Continuar rascunho").click();
  await expect(
    form.getByLabel("Primeiro dia / âncora", { exact: true }),
  ).toHaveValue("");
  await form
    .getByLabel("Profissional", { exact: true })
    .selectOption(f.pro!.id);
  await form
    .getByLabel("Tipo de plantão", { exact: true })
    .selectOption(f.typ.id);
  await form.getByLabel("Repetição", { exact: true }).selectOption("once");
  await form
    .getByLabel("Primeiro dia / âncora", { exact: true })
    .fill("2100-03-01");
  await form.getByLabel("Fuso horário", { exact: true }).selectOption("UTC");
  let posts = 0;
  await page.route("**/api/schedules/preparations/commit", async (route) => {
    posts++;
    const response = await route.fetch();
    expect(response.ok()).toBe(true);
    await route.abort("failed");
  });
  await review(page);
  await button(page, "Confirmar gravação").click();
  await expect(frozen(page)).toBeVisible();
  await expect(button(page, "Conferir tentativa sem reenviar")).toBeEnabled();
  expect(JSON.parse(scheduleNativeFacts(f)).series).toHaveLength(1);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) select ${q(f.patient)},${q(fixtures.adminA.id)},v,false from unnest(array['schedule.manage.team','schedule.manage.own','schedule.propose']) v;update public.care_recipients set is_active=false where id=${q(f.patient)};`,
  );
  await page.reload();
  await open(page, true, true);
  await expect(panel(page)).toContainText(
    "Minha programação pessoal preservada",
  );
  await expect(panel(page)).toContainText("Programação");
  await expect(
    button(page, "Reconhecer resultado e começar outro preenchimento"),
  ).toBeEnabled();
  expect(posts).toBe(1);
  expect(scheduleDocumentFacts(f)).toBe(before);
  const frozenContext = await (await page.request.get("/api/context")).json();
  await page.route("**/api/context", (route) =>
    route.fulfill({ json: frozenContext }),
  );
  sql(
    `update public.care_recipient_memberships set status='revoked' where care_recipient_id=${q(f.patient)} and user_id=${q(fixtures.adminA.id)};`,
  );
  const response = page.waitForResponse(
    (r) =>
      r.url().includes("/api/schedules/preparations?") &&
      r.request().method() === "GET",
  );
  await button(page, "Atualizar preenchimento privado").click();
  const denied = await response;
  expect(denied.status()).toBe(404);
  expect((await denied.json()).code).toBe("NOT_FOUND");
  await expect(panel(page)).not.toContainText(
    "Minha programação pessoal preservada",
  );
  await expect(
    button(page, "Reconhecer resultado e começar outro preenchimento"),
  ).toHaveCount(0);
  expect(posts).toBe(1);
  expect(JSON.parse(scheduleNativeFacts(f)).series).toHaveLength(1);
  await page.unroute("**/api/context");
});
test("conclusão em outra sessão preserva edição original após reconhecimento perdido e recarregamento", async ({
  page,
  browser,
}) => {
  const f = await fixture();
  await login(page, f.patient);
  await open(page);
  await fillType(page, "Minha edição ainda não publicada");
  let posts = 0;
  await page.route("**/api/schedules/preparations/commit", async (route) => {
    posts++;
    await route.abort("failed");
  });
  await review(page);
  await button(page, "Confirmar gravação").click();
  await expect(button(page, "Conferir tentativa sem reenviar")).toBeEnabled();
  expect(JSON.parse(scheduleNativeFacts(f)).types).toHaveLength(0);
  const context = await peerContext(browser),
    peer = await context.newPage();
  try {
    await login(peer, f.patient);
    await open(peer);
    await button(peer, "Continuar rascunho").click();
    await dialog(peer)
      .getByLabel("Nome do plantão", { exact: true })
      .fill("Tipo concluído na outra sessão");
    await review(peer);
    await button(peer, "Confirmar gravação").click();
    await expect(peer.getByRole("dialog")).toHaveCount(0);
    await button(page, "Conferir tentativa sem reenviar").click();
    await expect(frozen(page)).toContainText("impede esta tentativa");
    expect(posts).toBe(1);
    await button(page, "Manter minha edição para novo preenchimento").click();
    await expect(panel(page)).toContainText("Tipo concluído na outra sessão");
    await expect(
      page.getByRole("region", {
        name: "Minha edição preservada",
        exact: true,
      }),
    ).toContainText("Minha edição ainda não publicada");
    await page.route("**/api/schedules/preparations", async (route) => {
      if (
        route.request().method() !== "POST" ||
        route.request().postDataJSON().action !== "acknowledge"
      )
        return route.continue();
      const response = await route.fetch();
      expect(response.ok()).toBe(true);
      await route.abort("failed");
    });
    await button(page, "Reconhecer resultado e manter minha edição").click();
    await expect(
      button(page, "Recuperar reconhecimento do resultado"),
    ).toBeEnabled();
    await page.reload();
    await page.unroute("**/api/schedules/preparations");
    await open(page, false, true);
    await button(page, "Recuperar reconhecimento do resultado").click();
    await expect(
      dialog(page).getByLabel("Nome do plantão", { exact: true }),
    ).toHaveValue("Minha edição ainda não publicada");
    await privateSaved(page, 1);
    expect(posts).toBe(1);
    const types = JSON.parse(scheduleNativeFacts(f)).types;
    expect(types).toHaveLength(1);
    expect(types[0].name).toBe("Tipo concluído na outra sessão");
    expect(
      await page.evaluate(
        () =>
          Object.keys(sessionStorage).filter((k) =>
            k.startsWith("hca:schedule-creation:"),
          ).length,
      ),
    ).toBe(0);
  } finally {
    await context.close();
  }
});
test("mudança do tipo prova tentativa não aplicada sem alterar revisão privada e exige adoção explícita", async ({
  page,
}) => {
  const f = await fixture("schedule_series_create");
  await saveSchedulePreparation(f);
  await login(page, f.patient);
  await open(page, true);
  await button(page, "Continuar rascunho").click();
  let posts = 0;
  await page.route("**/api/schedules/preparations/commit", async (route) => {
    posts++;
    if (posts === 1) await route.abort("failed");
    else await route.continue();
  });
  await review(page);
  await button(page, "Confirmar gravação").click();
  await expect(button(page, "Conferir tentativa sem reenviar")).toBeEnabled();
  await shiftCommand(
    f.admin,
    f.patient,
    "type",
    {
      id: f.typ.id,
      name: "Tipo alterado após revisão",
      startsLocal: "09:00",
      durationMinutes: 720,
      active: true,
    },
    f.typ.version,
  );
  await button(page, "Conferir tentativa sem reenviar").click();
  await expect(frozen(page)).toContainText("impede esta tentativa");
  expect(posts).toBe(1);
  expect(JSON.parse(scheduleNativeFacts(f)).series).toHaveLength(0);
  await button(page, "Manter minha edição para novo preenchimento").click();
  await expect(
    button(page, "Adotar versão atual do tipo, mantendo meu preenchimento"),
  ).toBeVisible();
  await button(
    page,
    "Adotar versão atual do tipo, mantendo meu preenchimento",
  ).click();
  await expect(
    dialog(page, "Programação de plantões").getByLabel("Observações", {
      exact: true,
    }),
  ).toHaveValue("Texto pessoal fictício");
  await review(page);
  await button(page, "Confirmar gravação").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(posts).toBe(2);
  const facts = JSON.parse(scheduleNativeFacts(f));
  expect(facts.series).toHaveLength(1);
  expect(facts.shifts).toHaveLength(1);
  expect(facts.shifts[0].starts_at).toContain("09:00:00");
  expect(facts.series[0].notes).toBe("Texto pessoal fictício");
});
