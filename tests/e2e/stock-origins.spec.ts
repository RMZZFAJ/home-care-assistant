import { startFocusProbe, attachFocusProbe } from "./focus-diagnostics";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import {
  stockOriginFixture,
  stockOriginState,
} from "../integration/stock-origin-fixtures.mjs";
import { fixtures } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";

test.setTimeout(180_000);
async function login(
  page: Page,
  patient: string,
  role: "adminA" | "professional" = "adminA",
) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures[role].email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, patient);
}
const drawer = (page: Page) =>
  page.getByRole("dialog", { name: "Origem da movimentação", exact: true });
const sourceUrl = (
  f: Awaited<ReturnType<typeof stockOriginFixture>>,
  id: string,
) => `/api/stock/movements/${id}/origin?careRecipientId=${f.patient}`;

test("histórico abre parcela exata, ENT, BAL, consumo e compensação sem perder filtros nem alterar seus fatos", async ({
  page,
}, info) => {
  await startFocusProbe(page);
  const f = await stockOriginFixture(),
    before = stockOriginState(f);
  await login(page, f.patient);
  await page.goto(`/estoque?careRecipientId=${f.patient}`);
  const history = page.getByRole("region", {
    name: "Histórico auditável",
    exact: true,
  });
  await history.getByRole("button", { name: "Filtrar", exact: true }).click();
  await history
    .getByRole("combobox", { name: "Produto", exact: true })
    .selectOption(f.products[0]);
  await history
    .getByRole("button", { name: "Aplicar filtros", exact: true })
    .click();
  const receiptMovement = f.movements.find(
    (m: { reference_type: string; reference_id: string }) =>
      m.reference_type === "purchase_receipt" &&
      m.reference_id === f.receiptIds[1],
  );
  expect(receiptMovement).toBeTruthy();
  const first = await page.request.get(sourceUrl(f, receiptMovement.id));
  expect(first.ok()).toBe(true);
  const result = (await first.json()).data;
  expect(result.kind).toBe("document");
  expect(result.document.id).toBe(f.purchase.id);
  expect(result.receiptId).toBe(f.receiptIds[1]);
  expect(result.receiptId).not.toBe(result.document.id);
  expect(result.movement.quantity).toBe("3.000000");
  let fail = true;
  await page.route("**/api/stock/movements/*/origin?*", async (route) => {
    if (fail) {
      fail = false;
      await route.fulfill({
        status: 503,
        json: { error: "Origem temporariamente indisponível" },
      });
    } else await route.continue();
  });
  // Select by the immutable movement identity without guessing a receipt as a document.
  const row = history
    .locator("tbody tr[data-movement-id]")
    .filter({ has: page.getByText(receiptMovement.id, { exact: true }) });
  const opener = row.getByRole("button", {
    name: "Consultar origem",
    exact: true,
  });
  await opener.click();
  await expect(
    drawer(page).getByText(/Origem temporariamente indisponível/),
  ).toBeVisible();
  await expect(
    drawer(page).getByRole("region", {
      name: "Parcela exata de origem",
      exact: true,
    }),
  ).toHaveCount(0);
  await drawer(page)
    .getByRole("button", {
      name: "Tentar consultar origem novamente",
      exact: true,
    })
    .click();
  const exact = drawer(page).getByRole("region", {
    name: "Parcela exata de origem",
    exact: true,
  });
  await expect(exact).toBeVisible();
  await expect(exact).toContainText("3 unidade");
  await expect(exact).not.toContainText("2 unidade");
  try {
    await expect(
      drawer(page).getByRole("heading", {
        name: "Movimento consultado",
        exact: true,
      }),
    ).toBeFocused();
  } finally {
    await attachFocusProbe(page);
  }
  await page.keyboard.press("Tab");
  await expect(drawer(page).locator(":focus")).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await audit(page, `stock-exact-origin-${width}`);
  }
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.screenshot({
    path: `output/playwright/phase-d/stock-exact-origin-${info.project.name}.png`,
    fullPage: true,
  });
  await drawer(page)
    .getByRole("button", { name: "Fechar edição", exact: true })
    .click();
  await expect(opener).toBeFocused();
  await expect(
    history.getByRole("combobox", { name: "Produto", exact: true }),
  ).toHaveValue(f.products[0]);
  await page.unroute("**/api/stock/movements/*/origin?*");
  for (const [kind, id, target] of [
    ["document", f.delivery.id, f.delivery.id],
    ["bal", f.balance.id, f.balance.id],
    ["consumption", f.reportId, f.reportId],
  ]) {
    const movement = f.movements.find(
      (m: {
        reference_type: string;
        reference_id: string;
        source_location: string;
      }) =>
        m.reference_type === kind &&
        m.reference_id === id &&
        (kind !== "document" || m.source_location === "TRANSIT"),
    );
    expect(movement).toBeTruthy();
    const response = await page.request.get(sourceUrl(f, movement.id));
    expect(response.ok()).toBe(true);
    const origin = (await response.json()).data;
    if (kind === "consumption") {
      expect(origin.kind).toBe("consumption");
      expect(origin.report.id).toBe(target);
      expect(origin.document).toBeUndefined();
    } else {
      expect(origin.kind).toBe("document");
      expect(origin.document.id).toBe(target);
      expect(origin.document.type).toBe(kind === "bal" ? "BAL" : "ENT");
    }
    const item = history
      .locator("tbody tr[data-movement-id]")
      .filter({ has: page.getByText(movement.id, { exact: true }) });
    await item
      .getByRole("button", { name: "Consultar origem", exact: true })
      .click();
    await expect(
      drawer(page).getByRole("region", {
        name:
          kind === "consumption"
            ? "Relato de origem"
            : "Material na ficha de origem",
        exact: true,
      }),
    ).toBeVisible();
    await drawer(page)
      .getByRole("button", { name: "Fechar edição", exact: true })
      .click();
  }
  await history
    .getByRole("combobox", { name: "Produto", exact: true })
    .selectOption(f.products[1]);
  await history
    .getByRole("button", { name: "Aplicar filtros", exact: true })
    .click();
  const compensation = history
    .locator("tbody tr[data-movement-id]")
    .filter({ has: page.getByText(f.compensationId, { exact: true }) });
  await compensation
    .getByRole("button", { name: "Consultar origem", exact: true })
    .click();
  await expect(
    drawer(page).getByRole("heading", {
      name: "Compensação referenciada",
      exact: true,
    }),
  ).toBeVisible();
  await drawer(page)
    .getByText("Identificação do registro", { exact: true })
    .last()
    .click();
  await expect(
    drawer(page).getByText("Movimento: " + f.originalMovementId, {
      exact: true,
    }),
  ).toBeVisible();
  expect(stockOriginState(f)).toBe(before);
});

test("origem aplica RLS do movimento e do recurso, sem converter acesso ao estoque em leitura de COM", async ({
  page,
  browser,
}) => {
  const f = await stockOriginFixture(),
    before = stockOriginState(f),
    credit = f.movements.find(
      (m: { reference_type: string }) =>
        m.reference_type === "purchase_receipt",
    ),
    teamMovement = f.movements.find(
      (m: { reference_type: string }) => m.reference_type === "consumption",
    );
  await login(page, f.patient);
  const url = sourceUrl(f, credit.id);
  sql(
    `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.adminA.id)},'com.read',false);`,
  );
  const restricted = await page.request.get(url);
  expect(restricted.ok()).toBe(true);
  const hidden = (await restricted.json()).data;
  expect(hidden.kind).toBe("unavailable");
  expect(hidden.document).toBeUndefined();
  expect(JSON.stringify(hidden)).not.toContain(f.purchase.id);
  expect(JSON.stringify(hidden)).not.toContain("Informação da compra restrita");
  expect((await page.request.get(sourceUrl(f, f.receiptIds[0]))).status()).toBe(
    404,
  );
  expect((await page.request.get(sourceUrl(f, randomUUID()))).status()).toBe(
    404,
  );
  expect(
    (
      await page.request.get(
        `/api/stock/movements/${credit.id}/origin?careRecipientId=20000000-0000-4000-8000-000000000002`,
      )
    ).status(),
  ).toBe(404);
  const context = await browser.newContext({
    baseURL: new URL(page.url()).origin,
  });
  try {
    const team = await context.newPage();
    await login(team, f.patient, "professional");
    expect((await team.request.get(url)).status()).toBe(404);
    const allowed = await team.request.get(sourceUrl(f, teamMovement.id));
    expect(allowed.ok()).toBe(true);
    expect((await allowed.json()).data.kind).toBe("consumption");
    sql(
      `insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.professional.id)},'stock.team.read',false);`,
    );
    expect(
      (await team.request.get(sourceUrl(f, teamMovement.id))).status(),
    ).toBe(404);
  } finally {
    await context.close();
  }
  expect(stockOriginState(f)).toBe(before);
});
