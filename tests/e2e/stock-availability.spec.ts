import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { setup, fixtures } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";

test.setTimeout(120_000);

async function login(page: Page, patient: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
}

test("estoque isola saldos válidos da falha inicial do histórico e recupera sem alterar o ledger", async ({
  page,
}, info) => {
  const f = await setup();
  const before = sql(
    `select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`,
  );
  await login(page, f.patient);
  let unavailable = true;
  await page.route("**/api/stock/movements?**", (route) =>
    unavailable
      ? route.fulfill({
          status: 503,
          json: {
            error: "Histórico indisponível no ensaio controlado.",
            code: "SERVICE_UNAVAILABLE",
          },
        })
      : route.continue(),
  );
  await page.goto("/estoque?careRecipientId=" + f.patient + "&custody=FAMILY");
  const balances = page.getByRole("region", {
    name: "Saldos e previsões",
    exact: true,
  });
  const history = page.getByRole("region", {
    name: "Histórico auditável",
    exact: true,
  });
  await expect(
    page.getByText("Histórico indisponível no ensaio controlado.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    balances
      .getByRole("row", {
        name: "Material fictício V4 0 · Família",
        exact: true,
      })
      .or(
        balances.getByRole("article", {
          name: "Material fictício V4 0 · Família",
          exact: true,
        }),
      ),
  ).toContainText("30");
  await expect(
    balances.getByText("Nenhum produto encontrado", { exact: true }),
  ).toHaveCount(0);
  await expect(
    history.getByText("Sem movimentações neste filtro", { exact: true }),
  ).toHaveCount(0);
  await expect(
    history.getByText("Histórico ainda não consultado com sucesso.", {
      exact: true,
    }),
  ).toBeVisible();
  const independent = await page.request.get(
    "/api/stock/balances?careRecipientId=" + f.patient,
  );
  expect(independent.ok()).toBe(true);
  expect((await independent.json()).overview).toHaveLength(2);
  unavailable = false;
  await history
    .getByRole("button", { name: "Atualizar histórico", exact: true })
    .click();
  await expect(
    history.getByText("Saldo fictício controlado de homologação V4", {
      exact: true,
    }),
  ).toHaveCount(2);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 940 });
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement)
        document.activeElement.blur();
      window.scrollTo(0, 0);
    });
    await audit(page, "stock-independent-" + width);
  }
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await page.screenshot({
    path: `output/playwright/phase-d/stock-independent-${f.patient}-${info.project.name}.png`,
    fullPage: true,
    animations: "disabled",
  });
  expect(
    sql(
      `select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`,
    ),
  ).toBe(before);
});

test("estoque distingue indisponibilidade de vazio e conserva somente consultas anteriores do mesmo filtro", async ({
  page,
}) => {
  const f = await setup();
  await login(page, f.patient);
  let stockFailure = true,
    historyFailure = false;
  await page.route("**/api/stock/balances?**", (route) =>
    stockFailure
      ? route.fulfill({
          status: 503,
          json: { error: "Saldos indisponíveis no ensaio controlado." },
        })
      : route.continue(),
  );
  await page.route("**/api/stock/movements?**", (route) =>
    historyFailure
      ? route.fulfill({
          status: 503,
          json: { error: "Histórico indisponível no ensaio controlado." },
        })
      : route.continue(),
  );
  await page.goto("/estoque?careRecipientId=" + f.patient + "&custody=FAMILY");
  const balances = page.getByRole("region", {
    name: "Saldos e previsões",
    exact: true,
  });
  const history = page.getByRole("region", {
    name: "Histórico auditável",
    exact: true,
  });
  await expect(
    balances.getByText("Saldos indisponíveis no ensaio controlado.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    balances.getByText("Saldos ainda não consultados com sucesso.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    balances.getByText("Nenhum produto encontrado", { exact: true }),
  ).toHaveCount(0);
  await expect(
    history.getByText("Saldo fictício controlado de homologação V4", {
      exact: true,
    }),
  ).toHaveCount(2);
  historyFailure = true;
  await history
    .getByRole("button", { name: "Atualizar histórico", exact: true })
    .click();
  await expect(
    history.getByText("Histórico indisponível no ensaio controlado.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    history.getByText("Última consulta válida", { exact: false }),
  ).toBeVisible();
  await expect(
    history.getByText("Saldo fictício controlado de homologação V4", {
      exact: true,
    }),
  ).toHaveCount(2);
  stockFailure = false;
  await balances
    .getByRole("button", { name: "Atualizar saldos", exact: true })
    .click();
  await expect(
    balances
      .getByRole("row", {
        name: "Material fictício V4 0 · Família",
        exact: true,
      })
      .or(
        balances.getByRole("article", {
          name: "Material fictício V4 0 · Família",
          exact: true,
        }),
      ),
  ).toContainText("30");
  stockFailure = true;
  await balances
    .getByRole("button", { name: "Atualizar saldos", exact: true })
    .click();
  await expect(
    balances.getByText("Saldos indisponíveis no ensaio controlado.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    balances.getByText("Última consulta válida", { exact: false }),
  ).toBeVisible();
  await expect(
    balances
      .getByRole("row", {
        name: "Material fictício V4 0 · Família",
        exact: true,
      })
      .or(
        balances.getByRole("article", {
          name: "Material fictício V4 0 · Família",
          exact: true,
        }),
      ),
  ).toContainText("30");
  // A failure under another custody must not label old FAMILY data as CARE_TEAM.
  await page
    .getByRole("combobox", { name: "Custódia", exact: true })
    .selectOption("CARE_TEAM");
  await expect(
    balances.getByText("Saldos ainda não consultados com sucesso.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    balances.getByRole("row", { name: /Material fictício/ }),
  ).toHaveCount(0);
  await expect(
    history.getByText("Histórico ainda não consultado com sucesso.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    history.getByText("Sem movimentações neste filtro", { exact: true }),
  ).toHaveCount(0);
  stockFailure = false;
  historyFailure = false;
  await balances
    .getByRole("button", { name: "Atualizar saldos", exact: true })
    .click();
  await history
    .getByRole("button", { name: "Atualizar histórico", exact: true })
    .click();
  await expect(
    history.getByText("Sem movimentações neste filtro", { exact: true }),
  ).toBeVisible();
  await expect(
    balances
      .getByRole("row", {
        name: "Material fictício V4 0 · Equipe",
        exact: true,
      })
      .or(
        balances.getByRole("article", {
          name: "Material fictício V4 0 · Equipe",
          exact: true,
        }),
      ),
  ).toContainText("0");
});
