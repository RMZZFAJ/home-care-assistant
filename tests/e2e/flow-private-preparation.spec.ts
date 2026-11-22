import { randomUUID } from "node:crypto";
import { expect, test, devices, type Page } from "@playwright/test";
import { fixtures, rpc } from "../integration/v4-fixtures.mjs";
import { flowPreparationFixture as fixture } from "../integration/flow-preparation-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { auditFromTop } from "./accessibility-audit";
test.setTimeout(180_000);
async function login(page: Page, patient: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
  await page.goto(`/consumo?careRecipientId=${patient}`);
}
const drawer = (page: Page) =>
  page.getByRole("dialog", { name: "Revisão do Flow", exact: true });
const panel = (page: Page) =>
  drawer(page).getByRole("region", { name: "Rascunho privado", exact: true });
const amount = (page: Page) =>
  drawer(page).getByRole("textbox", { name: /Quantidade conferida/ });
const own = (page: Page) =>
  page.getByRole("region", {
    name: "Meus preenchimentos e resultados do Flow",
    exact: true,
  });
const facts = (patient: string) =>
  JSON.parse(
    sql(
      `select jsonb_build_object('reports',(select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]'::jsonb) from public.consumption_reports r where r.care_recipient_id=${q(patient)}),'ledger',(select coalesce(jsonb_agg(to_jsonb(m) order by m.id),'[]'::jsonb) from public.stock_movements m where m.care_recipient_id=${q(patient)}))::text;`,
    ),
  );
async function open(page: Page) {
  await page
    .getByRole("button", { name: "Conferir sugestão", exact: true })
    .click();
  await expect(
    drawer(page).getByRole("button", {
      name: "Revisar e registrar relato",
      exact: true,
    }),
  ).toBeEnabled();
}

test("Flow privado retoma em outra sessão,preserva quantidade incompleta e recupera o mesmo ato sem descontar estoque", async ({
  page,
  browser,
}, info) => {
  const f = await fixture(),
    before = facts(f.patient),
    text =
      "Minha declaração do Flow entre aparelhos " +
      "contexto preservado ".repeat(35),
    saves: unknown[] = [],
    firstNative: unknown[] = [];
  await login(page, f.patient);
  await open(page);
  await drawer(page)
    .getByLabel("Descrição conferida", { exact: true })
    .fill(text);
  await amount(page).fill("0,5");
  await page.route("**/api/whatsapp/flows/preparations", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    saves.push(route.request().postDataJSON());
    if (saves.length === 1) {
      const r = await route.fetch();
      expect(r.ok(), await r.text()).toBe(true);
      return route.abort("failed");
    }
    return route.continue();
  });
  await page.route(
    "**/api/whatsapp/flows/preparations/commit",
    async (route) => {
      firstNative.push(route.request().postDataJSON());
      return route.continue();
    },
  );
  await drawer(page)
    .getByRole("button", { name: "Salvar preenchimento privado", exact: true })
    .click();
  await expect(
    panel(page).getByRole("button", {
      name: "Recuperar salvamento ou descarte",
      exact: true,
    }),
  ).toBeVisible();
  expect(facts(f.patient)).toEqual(before);
  const separate = await browser.newContext({
      ...devices[info.project.name === "ios" ? "iPhone 13" : "Pixel 7"],
      baseURL: new URL(page.url()).origin,
    }),
    other = await separate.newPage(),
    commands: unknown[] = [];
  try {
    await login(other, f.patient);
    await other
      .getByRole("button", { name: "Conferir sugestão", exact: true })
      .click();
    await panel(other)
      .getByRole("button", { name: "Continuar revisão do Flow", exact: true })
      .click();
    await expect(
      drawer(other).getByLabel("Descrição conferida", { exact: true }),
    ).toHaveValue(text);
    await expect(amount(other)).toHaveValue("0,5");
    await drawer(other)
      .getByRole("button", { name: "Revisar e registrar relato", exact: true })
      .click();
    await expect(amount(other)).toBeFocused();
    await expect(drawer(other)).toContainText(
      "Confira a quantidade e a precisão deste material.",
    );
    await expect(amount(other)).toHaveValue("0,5");
    expect(facts(f.patient)).toEqual(before);
    await amount(other).fill("1,000000");
    await drawer(other)
      .getByRole("button", { name: "Revisar e registrar relato", exact: true })
      .click();
    await expect(
      other.getByRole("region", {
        name: "Conferência da revisão do Flow",
        exact: true,
      }),
    ).toBeVisible();
    await expect(drawer(other).locator("input,textarea,select")).toHaveCount(0);
    for (const width of [1440, 1150, 850, 500, 320]) {
      await other.setViewportSize({ width, height: 900 });
      await info.attach("flow-responsive-context" + width, {
        body: JSON.stringify(
          await other.evaluate(() => ({
            innerWidth: window.innerWidth,
            clientWidth: document.documentElement.clientWidth,
            screenWidth: screen.width,
            visualWidth: visualViewport?.width,
            mobileMedia: matchMedia("(max-width:850px)").matches,
            smallMedia: matchMedia("(max-width:500px)").matches,
            profileDisplay: document.querySelector(".hca-profile-identity")
              ? getComputedStyle(
                  document.querySelector(".hca-profile-identity")!,
                ).display
              : null,
            headerDisplay: document.querySelector(".app-header")
              ? getComputedStyle(document.querySelector(".app-header")!).display
              : null,
            bodyStyle: document.body.getAttribute("style"),
            rootStyle: document.documentElement.getAttribute("style"),
          })),
        ),
        contentType: "application/json",
      });
      await auditFromTop(other, "private Flow review " + width);
      if (width === 1440 || width === 320)
        await info.attach("flow-private-review" + width, {
          body: await other.screenshot(),
          contentType: "image/png",
        });
    }
    await other.route(
      "**/api/whatsapp/flows/preparations/commit",
      async (route) => {
        commands.push(route.request().postDataJSON());
        if (commands.length === 1) {
          const r = await route.fetch();
          expect(r.ok(), await r.text()).toBe(true);
          return route.abort("failed");
        }
        return route.continue();
      },
    );
    await drawer(other)
      .getByRole("button", { name: "Confirmar relato conferido", exact: true })
      .click();
    await drawer(other)
      .getByRole("button", { name: "Recuperar revisão", exact: true })
      .click();
    await expect(drawer(other)).toHaveCount(0);
    await expect(
      other.getByRole("heading", {
        name: "Relatos recebidos por Flow",
        exact: true,
      }),
    ).toBeFocused();
    expect(commands).toHaveLength(2);
    expect(commands[0]).toEqual(commands[1]);
    const after = facts(f.patient);
    expect(after.reports).toHaveLength(1);
    expect(after.reports[0].body).toBe(text.trim());
    expect(after.reports[0].lines[0].quantity).toBe("1");
    expect(after.ledger).toEqual(before.ledger);
    await other.goto(`/consumo?careRecipientId=${f.patient}`);
    await own(other)
      .getByRole("button", { name: "Consultar resultado do Flow", exact: true })
      .click();
    await expect(panel(other)).toContainText(
      "Relato encaminhado à conferência autorizada",
    );
    await expect(drawer(other).locator("input,textarea,select")).toHaveCount(0);
    await expect(
      panel(other).getByRole("link", {
        name: "Abrir relato resultante",
        exact: true,
      }),
    ).toHaveAttribute("href", new RegExp(after.reports[0].id));
    await auditFromTop(other, "private Flow result320");
    expect(commands).toHaveLength(2);
  } finally {
    await separate.close();
  }
  await panel(page)
    .getByRole("button", {
      name: "Recuperar salvamento ou descarte",
      exact: true,
    })
    .click();
  await expect(panel(page)).toContainText(
    "Relato encaminhado à conferência autorizada",
  );
  expect(saves).toHaveLength(2);
  expect(saves[0]).toEqual(saves[1]);
  expect(firstNative).toHaveLength(0);
  expect(facts(f.patient).reports).toHaveLength(1);
});

test("Flow salvo antes da referência mantémNULL e uma alteração de origem exige comparação explícita sem trocar a declaração", async ({
  page,
}) => {
  const f = await fixture(),
    before = facts(f.patient),
    text = "Minha revisão antes da consulta e depois da alteração de origem";
  let release = false;
  await login(page, f.patient);
  await page.route(
    "**/api/whatsapp/flows/preparations/reference",
    async (route) => {
      while (!release)
        await new Promise<void>((resolve) => setTimeout(resolve, 20));
      try {
        await route.continue();
      } catch {
        /* Superseded read may be aborted by the app. */
      }
    },
  );
  try {
    await page
      .getByRole("button", { name: "Conferir sugestão", exact: true })
      .click();
    await expect(
      drawer(page).getByLabel("Descrição conferida", { exact: true }),
    ).toBeVisible();
    await drawer(page)
      .getByLabel("Descrição conferida", { exact: true })
      .fill(text);
    await amount(page).fill("1");
    await drawer(page)
      .getByRole("button", {
        name: "Salvar preenchimento privado",
        exact: true,
      })
      .click();
    await expect(panel(page)).toContainText("Salvo no servidor");
    release = true;
    const adopt = drawer(page).getByRole("button", {
      name: "Usar referência atual sem trocar minha declaração",
      exact: true,
    });
    await expect(adopt).toBeVisible();
    await expect(
      drawer(page).getByRole("button", {
        name: "Revisar e registrar relato",
        exact: true,
      }),
    ).toBeDisabled();
    const saved = await rpc(f.admin, "flow_preparation_context", f.scope);
    expect(saved.content.reference).toBeNull();
    expect(saved.content.referenceHash).toBeNull();
    expect(facts(f.patient)).toEqual(before);
    await adopt.click();
    await drawer(page)
      .getByRole("button", { name: "Revisar e registrar relato", exact: true })
      .click();
    await expect(
      page.getByRole("region", {
        name: "Conferência da revisão do Flow",
        exact: true,
      }),
    ).toBeVisible();
    sql(
      `update public.flow_submissions set body=body||'{"text":"Outra origem recebida após a revisão"}'::jsonb where id=${q(f.scope.p_target)};`,
    );
    await drawer(page)
      .getByRole("button", { name: "Confirmar relato conferido", exact: true })
      .click();
    await expect(
      drawer(page).getByLabel("Descrição conferida", { exact: true }),
    ).toHaveValue(text);
    await expect(drawer(page)).toContainText(
      "Outra origem recebida após a revisão",
    );
    await expect(drawer(page)).not.toContainText("nova contagem");
    expect(facts(f.patient)).toEqual(before);
    await adopt.click();
    await drawer(page)
      .getByRole("button", { name: "Revisar e registrar relato", exact: true })
      .click();
    await drawer(page)
      .getByRole("button", { name: "Confirmar relato conferido", exact: true })
      .click();
    await expect(drawer(page)).toHaveCount(0);
    const after = facts(f.patient);
    expect(after.reports).toHaveLength(1);
    expect(after.reports[0].body).toBe(text);
    expect(after.ledger).toEqual(before.ledger);
  } finally {
    release = true;
  }
});

test("Flow pessoal permanece recuperável sem catálogo,escrita ou paciente ativo e não apaga envelope divergente", async ({
  page,
}) => {
  const f = await fixture(false),
    before = facts(f.patient),
    key = `hca:flow-preparation-confirmation:${fixtures.adminA.id}:${f.patient}:${f.scope.p_target}`;
  let original: Record<string, unknown> | undefined;
  const commands: unknown[] = [];
  await login(page, f.patient);
  await page
    .getByRole("button", { name: "Descartar sugestão", exact: true })
    .click();
  await drawer(page)
    .getByRole("button", { name: "Revisar descarte da sugestão", exact: true })
    .click();
  await page.route(
    "**/api/whatsapp/flows/preparations/commit",
    async (route) => {
      original = route.request().postDataJSON();
      commands.push(original);
      const r = await route.fetch();
      expect(r.ok(), await r.text()).toBe(true);
      await page.evaluate(
        ({ key, value }) => sessionStorage.setItem(key, JSON.stringify(value)),
        {
          key,
          value: {
            version: 1,
            userId: fixtures.adminA.id,
            packet: { ...original, idempotencyKey: randomUUID() },
          },
        },
      );
      sql(
        `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'consumption.report',false),(${q(f.patient)},${q(fixtures.adminA.id)},'stock.team.read',false),(${q(f.patient)},${q(fixtures.adminA.id)},'stock.family.read',false);update public.care_recipients set is_active=false where id=${q(f.patient)};`,
      );
      return route.abort("failed");
    },
  );
  await drawer(page)
    .getByRole("button", {
      name: "Confirmar descarte da sugestão",
      exact: true,
    })
    .click();
  await expect(
    drawer(page).getByRole("button", {
      name: "Recuperar revisão",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await own(page)
    .getByRole("button", { name: "Consultar resultado do Flow", exact: true })
    .click();
  await expect(panel(page)).toContainText(
    "Sugestão descartada pelo próprio autor",
  );
  await expect(
    drawer(page).getByRole("button", {
      name: "Recuperar revisão",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    panel(page).getByRole("button", {
      name: "Reconhecer resultado do Flow",
      exact: true,
    }),
  ).toBeDisabled();
  expect(
    await page.evaluate((k) => sessionStorage.getItem(k), key),
  ).not.toBeNull();
  expect(commands).toHaveLength(1);
  await page.evaluate(
    ({ key, value }) => sessionStorage.setItem(key, JSON.stringify(value)),
    {
      key,
      value: { version: 1, userId: fixtures.adminA.id, packet: original },
    },
  );
  await page.reload();
  await own(page)
    .getByRole("button", { name: "Consultar resultado do Flow", exact: true })
    .click();
  await expect(drawer(page)).toContainText("Nenhum novo envio foi realizado");
  await expect
    .poll(() => page.evaluate((k) => sessionStorage.getItem(k), key))
    .toBeNull();
  await expect(
    panel(page).getByRole("button", {
      name: "Reconhecer resultado do Flow",
      exact: true,
    }),
  ).toBeEnabled();
  expect(facts(f.patient)).toEqual(before);
  expect(commands).toHaveLength(1);
  await expect(drawer(page)).toContainText(
    "Sugestão original fictícia do Flow",
  );
  // Hold only the previously authorized shell snapshot so the child must
  // enforce the real revocation itself, before a live parent refresh unmounts it.
  const shellBeforeRevocation = await (
    await page.request.get("/api/context")
  ).json();
  await page.route("**/api/context", (route) =>
    route.request().method() === "GET"
      ? route.fulfill({ json: shellBeforeRevocation })
      : route.continue(),
  );
  sql(
    `update public.care_recipient_memberships set status='revoked' where care_recipient_id=${q(f.patient)} and user_id=${q(fixtures.adminA.id)};`,
  );
  const revokedRead = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      new URL(response.url()).pathname === "/api/whatsapp/flows/preparations",
  );
  await drawer(page)
    .getByRole("button", {
      name: "Atualizar preenchimento pessoal",
      exact: true,
    })
    .click();
  const denied = await revokedRead;
  expect(denied.status()).toBe(404);
  expect((await denied.json()).code).toBe("NOT_FOUND");
  await expect(
    drawer(page).getByText("Sugestão original fictícia do Flow", {
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    panel(page).getByRole("button", {
      name: "Reconhecer resultado do Flow",
      exact: true,
    }),
  ).toHaveCount(0);
  expect(facts(f.patient)).toEqual(before);
  expect(commands).toHaveLength(1);
  await page.unroute("**/api/context");
});
