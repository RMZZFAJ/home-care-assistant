import { randomUUID } from "node:crypto";
import { expect, test, devices, type Page } from "@playwright/test";
import { fixtures, rpc } from "../integration/v4-fixtures.mjs";
import { consumptionPreparationFixture as fixture } from "../integration/consumption-preparation-fixtures.mjs";
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
  page.getByRole("dialog", { name: "Registrar relato", exact: true });
const panel = (page: Page) =>
  drawer(page).getByRole("region", { name: "Rascunho privado", exact: true });
async function open(page: Page) {
  await page
    .getByRole("button", { name: "Meu preenchimento de relato", exact: true })
    .click();
  await drawer(page)
    .getByLabel("Custódia", { exact: true })
    .selectOption("FAMILY");
}
async function fill(page: Page, text: string) {
  await drawer(page)
    .getByLabel("Tipo", { exact: true })
    .selectOption("consumption");
  await drawer(page).getByLabel("O que aconteceu?", { exact: true }).fill(text);
  const search = drawer(page).getByRole("combobox", {
    name: "Adicionar material",
    exact: true,
  });
  await search.click();
  await expect(search).toBeInViewport({ ratio: 1 });
  await search.fill("Material fictício V4 0");
  await search.press("ArrowDown");
  const option = page
    .getByRole("option")
    .filter({ hasText: "Material fictício V4 0 · unidade" });
  await expect(option).toBeInViewport({ ratio: 1 });
  await expect
    .poll(() =>
      option.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const hit = document.elementFromPoint(
          bounds.x + bounds.width / 2,
          bounds.y + bounds.height / 2,
        );
        return hit === element || Boolean(hit && element.contains(hit));
      }),
    )
    .toBe(true);
  await option.click();
  await drawer(page)
    .getByLabel("Material fictício V4 0 · quantidade em unidade", {
      exact: true,
    })
    .fill("0,5");
}
const facts = (patient: string) =>
  sql(
    `select jsonb_build_object('reports',(select count(*) from public.consumption_reports where care_recipient_id=${q(patient)}),'ledger',(select jsonb_agg(to_jsonb(m) order by m.id) from public.stock_movements m where m.care_recipient_id=${q(patient)}))::text;`,
  );

test("preenchimento de consumo retoma em outra sessão com quantidade incompleta,erro no campo e resultado pessoal exato", async ({
  page,
  browser,
}, info) => {
  const f = await fixture(),
    text =
      "Relato privado preservado entre aparelhos " +
      "contexto extenso ".repeat(30),
    before = facts(f.patient);
  await login(page, f.patient);
  await open(page);
  await fill(page, text);
  await expect(
    drawer(page).getByRole("button", { name: "Revisar relato", exact: true }),
  ).toBeEnabled();
  const saves: unknown[] = [];
  await page.route("**/api/consumption/preparations", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    saves.push(route.request().postDataJSON());
    const r = await route.fetch();
    expect(r.ok(), await r.text()).toBe(true);
    return route.abort("failed");
  });
  await drawer(page)
    .getByRole("button", { name: "Salvar preenchimento privado", exact: true })
    .click();
  await expect(
    panel(page).getByRole("button", {
      name: "Recuperar salvamento ou descarte",
      exact: true,
    }),
  ).toBeVisible();
  expect(facts(f.patient)).toBe(before);
  const separate = await browser.newContext({
      ...devices[info.project.name === "ios" ? "iPhone 13" : "Pixel 7"],
      baseURL: new URL(page.url()).origin,
    }),
    other = await separate.newPage();
  try {
    await login(other, f.patient);
    await open(other);
    await panel(other)
      .getByRole("button", { name: "Continuar rascunho", exact: true })
      .click();
    await expect(
      drawer(other).getByLabel("O que aconteceu?", { exact: true }),
    ).toHaveValue(text);
    const amount = drawer(other).getByLabel(
      "Material fictício V4 0 · quantidade em unidade",
      { exact: true },
    );
    await expect(amount).toHaveValue("0,5");
    await drawer(other)
      .getByRole("button", { name: "Revisar relato", exact: true })
      .click();
    await expect(amount).toBeFocused();
    await expect(drawer(other)).toContainText(
      "Confira a quantidade e a precisão do material indicado.",
    );
    await expect(amount).toHaveValue("0,5");
    await expect(
      drawer(other).getByLabel("O que aconteceu?", { exact: true }),
    ).toHaveValue(text);
    expect(facts(f.patient)).toBe(before);
    await amount.fill("1,000000");
    await drawer(other)
      .getByRole("button", { name: "Revisar relato", exact: true })
      .click();
    const review = other.getByRole("region", {
      name: "Revisão do relato",
      exact: true,
    });
    await expect(review.locator("input,textarea,select")).toHaveCount(0);
    await expect(drawer(other).locator("input,textarea,select")).toHaveCount(0);
    for (const width of [1440, 1150, 850, 500, 320]) {
      await other.setViewportSize({ width, height: 900 });
      await auditFromTop(other, "private consumption review " + width);
      if (width === 1440 || width === 320)
        await info.attach("consumption-private-review" + width, {
          body: await other.screenshot(),
          contentType: "image/png",
        });
    }
    const commands: unknown[] = [];
    await other.route(
      "**/api/consumption/preparations/commit",
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
    await review
      .getByRole("button", {
        name: "Registrar relato sem desconto",
        exact: true,
      })
      .click();
    await expect(
      review.getByRole("button", { name: "Voltar à edição", exact: true }),
    ).toBeDisabled();
    await review
      .getByRole("button", { name: "Recuperar tentativa", exact: true })
      .click();
    await expect(drawer(other)).toHaveCount(0);
    expect(commands).toHaveLength(2);
    expect(commands[0]).toEqual(commands[1]);
    const reports = JSON.parse(
      sql(
        `select jsonb_agg(to_jsonb(r)) from public.consumption_reports r where r.care_recipient_id=${q(f.patient)};`,
      ),
    );
    expect(reports).toHaveLength(1);
    expect(reports[0].body).toBe(text.trim());
    expect(reports[0].lines[0].quantity).toBe("1");
    expect(JSON.parse(facts(f.patient)).ledger).toEqual(
      JSON.parse(before).ledger,
    );
    await other.goto(`/consumo?careRecipientId=${f.patient}`);
    await open(other);
    await expect(panel(other)).toContainText(
      "Este preenchimento já registrou seu resultado.",
    );
    await expect(
      drawer(other).getByLabel("O que aconteceu?", { exact: true }),
    ).toHaveCount(0);
    await expect(
      panel(other).getByRole("link", {
        name: "Consultar relato registrado",
        exact: true,
      }),
    ).toHaveAttribute("href", new RegExp(reports[0].id));
    await auditFromTop(other, "private consumption readonly receipt320");
  } finally {
    await separate.close();
  }
  expect(saves).toHaveLength(1);
});

test("salvar consumo antes da referência conservaNULL até adoção explícita sem sobrescrever a declaração", async ({
  page,
}) => {
  const f = await fixture(),
    before = facts(f.patient);
  let release = false;
  await login(page, f.patient);
  await page.route(
    "**/api/consumption/preparations/reference",
    async (route) => {
      while (!release)
        await new Promise<void>((resolve) => setTimeout(resolve, 20));
      try {
        await route.continue();
      } catch {
        /* The app may abort a superseded reference read. */
      }
    },
  );
  try {
    await open(page);
    await drawer(page)
      .getByLabel("Tipo", { exact: true })
      .selectOption("shortage");
    await drawer(page)
      .getByLabel("O que aconteceu?", { exact: true })
      .fill("Declaração parcial antes de consultar a referência");
    await drawer(page)
      .getByRole("button", {
        name: "Salvar preenchimento privado",
        exact: true,
      })
      .click();
    await expect(panel(page)).toContainText("Salvo no servidor");
    release = true;
    await expect(
      drawer(page).getByRole("region", {
        name: "Comparação de referência do relato",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      drawer(page).getByRole("button", { name: "Revisar relato", exact: true }),
    ).toBeDisabled();
    const saved = await rpc(
      f.admin,
      "consumption_preparation_context",
      f.scope,
    );
    expect(saved.content.reference).toBeNull();
    expect(saved.content.referenceHash).toBeNull();
    expect(facts(f.patient)).toBe(before);
    await drawer(page)
      .getByRole("button", {
        name: "Usar referência atual e revisar complemento",
        exact: true,
      })
      .click();
    await expect(
      drawer(page).getByLabel("O que aconteceu?", { exact: true }),
    ).toHaveValue("Declaração parcial antes de consultar a referência");

    let refusedRead = false;
    await page.route(
      "**/api/consumption/preparations/reference",
      async (route) => {
        if (!refusedRead) {
          refusedRead = true;
          return route.fulfill({
            status: 503,
            json: {
              code: "DATABASE_UNAVAILABLE",
              error: "Consulta fictícia indisponível",
            },
          });
        }
        return route.fallback();
      },
    );
    await drawer(page)
      .getByRole("button", {
        name: "Atualizar referência dos materiais",
        exact: true,
      })
      .click();
    await expect(drawer(page)).toContainText(
      "Atualize esta consulta. Ela não registra relato, decisão ou desconto.",
    );
    await expect(
      drawer(page).getByLabel("O que aconteceu?", { exact: true }),
    ).toHaveValue("Declaração parcial antes de consultar a referência");
    await expect(
      drawer(page).getByRole("button", {
        name: "Recuperar tentativa",
        exact: true,
      }),
    ).toHaveCount(0);
    expect(facts(f.patient)).toBe(before);
    await drawer(page)
      .getByRole("button", {
        name: "Atualizar referência dos materiais",
        exact: true,
      })
      .click();
    await expect(
      drawer(page).getByRole("button", { name: "Revisar relato", exact: true }),
    ).toBeEnabled();
    await drawer(page)
      .getByRole("button", { name: "Revisar relato", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "Revisão do relato", exact: true }),
    ).toBeVisible();
    expect(facts(f.patient)).toBe(before);
  } finally {
    release = true;
    await page.unrouteAll({ behavior: "wait" });
  }
});

test("decisão privada recupera após perda de escrita e inativação e mantém acesso pessoal separado da leitura operacional", async ({
  page,
}) => {
  const f = await fixture("consumption_accept");
  await login(page, f.patient);
  await page.goto(
    `/consumo?careRecipientId=${f.patient}&ref=${f.scope.p_target}&refKind=report`,
  );
  await page
    .getByRole("button", { name: "Conferir consumo", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Revisar confirmação do consumo",
    exact: true,
  });
  await dialog
    .getByRole("button", { name: "Revisar confirmação", exact: true })
    .click();
  const attempts: unknown[] = [];
  await page.route("**/api/consumption/preparations/commit", async (route) => {
    attempts.push(route.request().postDataJSON());
    if (attempts.length === 1) {
      const r = await route.fetch();
      expect(r.ok(), await r.text()).toBe(true);
      sql(
        `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'stock.family.manage',false);update public.care_recipients set is_active=false where id=${q(f.patient)};`,
      );
      return route.abort("failed");
    }
    return route.continue();
  });
  await dialog
    .getByRole("button", { name: "Confirmar consumo e descontar", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Fechar edição", exact: true }),
  ).toBeDisabled();
  const recovery = page
    .getByRole("region", {
      name: "Recuperação pessoal de relato inativo",
      exact: true,
    })
    .getByRole("region", { name: "Conferência do relato", exact: true });
  await expect(dialog).toHaveCount(0);
  await expect(recovery).toContainText(
    "A tentativa preservada foi conferida pelo resultado pessoal já registrado.",
  );
  expect(attempts).toHaveLength(1);
  const original = attempts[0] as {
    careRecipientId: string;
    purpose: string;
    targetResourceId: string;
    draftCommit: { id: string; revision: number };
    referenceHash: string;
    command: unknown;
  };
  const consumed = await rpc(
    f.admin,
    "consumption_preparation_context",
    f.scope,
  );
  expect(consumed.id).toBe(original.draftCommit.id);
  expect(consumed.revision).toBe(original.draftCommit.revision + 1);
  expect(consumed.consumedResult.referenceHash).toBe(original.referenceHash);
  expect(consumed.consumedResult.command).toEqual(original.command);
  const pendingKey = `hca:consumption-preparation-confirmation:${fixtures.adminA.id}:${f.patient}:consumption_accept:${f.scope.p_target}`;
  await expect
    .poll(() => page.evaluate((k) => sessionStorage.getItem(k), pendingKey))
    .toBeNull();
  const after = facts(f.patient);
  await page.reload();
  await expect(recovery).toContainText(
    "Este preenchimento já registrou seu resultado.",
  );
  await expect(
    recovery.getByText("Relato original fictício preservado", { exact: true }),
  ).toBeVisible();
  await expect(
    recovery.getByRole("button", {
      name: "Reconhecer resultado preservado",
      exact: true,
    }),
  ).toBeEnabled();
  expect(facts(f.patient)).toBe(after);

  const alteredKey = randomUUID(),
    altered = {
      ...original,
      idempotencyKey: alteredKey,
      command: {
        ...(original.command as Record<string, unknown>),
        idempotencyKey: alteredKey,
      },
    };
  await page.evaluate(
    ({ key, value }) => sessionStorage.setItem(key, JSON.stringify(value)),
    {
      key: pendingKey,
      value: { version: 1, userId: fixtures.adminA.id, packet: altered },
    },
  );
  await page.reload();
  await expect(recovery).toContainText(
    "Há uma confirmação preservada neste aparelho que ainda não corresponde ao resultado consultado.",
  );
  await expect(
    recovery.getByRole("button", {
      name: "Reconhecer resultado preservado",
      exact: true,
    }),
  ).toBeDisabled();
  await recovery
    .getByRole("button", {
      name: "Recuperar mesma confirmação preservada",
      exact: true,
    })
    .click();
  await expect.poll(() => attempts.length).toBe(2);
  await expect(
    recovery.getByRole("button", {
      name: "Reconhecer resultado preservado",
      exact: true,
    }),
  ).toBeDisabled();
  expect(facts(f.patient)).toBe(after);
  await page.evaluate(
    ({ key, value }) => sessionStorage.setItem(key, JSON.stringify(value)),
    {
      key: pendingKey,
      value: { version: 1, userId: fixtures.adminA.id, packet: original },
    },
  );
  await page.reload();
  await expect
    .poll(() => page.evaluate((k) => sessionStorage.getItem(k), pendingKey))
    .toBeNull();
  await expect(
    recovery.getByRole("button", {
      name: "Reconhecer resultado preservado",
      exact: true,
    }),
  ).toBeEnabled();
  expect(facts(f.patient)).toBe(after);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'stock.family.read',false);`,
  );
  await page
    .getByRole("button", { name: "Atualizar relato", exact: true })
    .click();
  await expect(
    page.getByText("Relato original fictício preservado", {
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    recovery.getByRole("button", {
      name: "Reconhecer resultado preservado",
      exact: true,
    }),
  ).toHaveCount(0);
  expect(facts(f.patient)).toBe(after);
});
