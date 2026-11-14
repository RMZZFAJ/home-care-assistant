import { expect, test, type Page } from "@playwright/test";
import { setup, rpc, fixtures } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit, auditFromTop } from "./accessibility-audit";

test.setTimeout(240_000);
const names = Array.from(
  { length: 101 },
  (_, i) =>
    `Material canônico ${String(i + 1).padStart(3, "0")} ` +
    "IdentificaçãoExtensa".repeat(5),
);
let fixture: Awaited<ReturnType<typeof setup>>, before: string;
const physicalState = (patient: string) =>
  sql(
    `select jsonb_build_object('ledger',(select encode(sha256(convert_to(coalesce(jsonb_agg(to_jsonb(m) order by m.id),'[]'::jsonb)::text,'UTF8')),'hex') from public.stock_movements m where care_recipient_id=${q(patient)}),'documents',(select count(*) from public.operational_documents where care_recipient_id=${q(patient)}))::text;`,
  );

test.beforeAll(async () => {
  fixture = await setup({
    catalogue: names.slice(0, 100).map((name) => ({
      name,
      category: "higiene",
      unit: "unidade",
      aliases: [],
    })),
  });
  // The native RPC adds a real101st identity beyond the scale fixture's100-item batch.
  const extra = await rpc(fixture.admin, "admin_upsert_recipient_product", {
    p_care_recipient_id: fixture.patient,
    p_product_id: null,
    p_name: names[100],
    p_category: "higiene",
    p_unit: "unidade",
    p_aliases: [],
    p_is_active: true,
  });
  fixture.products.push(extra.product_id);
  sql(
    `insert into public.stock_alert_rules(care_recipient_id,product_id,location,low_threshold,critical_threshold,is_enabled) values(${q(fixture.patient)},${q(fixture.products[0])},'FAMILY',31,0,true),(${q(fixture.patient)},${q(fixture.products[1])},'FAMILY',30,0,true),(${q(fixture.patient)},${q(fixture.products[2])},'FAMILY',0,0,true);update public.care_recipient_products set is_active=false where care_recipient_id=${q(fixture.patient)} and product_id=${q(fixture.products[0])};`,
  );
  before = physicalState(fixture.patient);
});

async function login(page: Page, role: "adminA" | "professional") {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures[role].email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Visão geral", exact: true }),
  ).toBeVisible();
  await selectContext(page, fixture.patient);
}
const balances = (page: Page) =>
  page.getByRole("region", { name: "Saldos e previsões", exact: true });
const table = (page: Page) =>
  balances(page).getByRole("table", {
    name: "Saldos por produto e custódia",
    exact: true,
  });
const row = (page: Page, index: number, custody = "Família") =>
  table(page).getByRole("row", {
    name: names[index] + " · " + custody,
    exact: true,
  });

test("estoque canônico conserva101 materiais,filtra saldo exato e mantém mínimo,situação e detalhes nas cinco larguras", async ({
  page,
}, info) => {
  await login(page, "adminA");
  const writes: string[] = [];
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      /\/api\/(stock|documents)/.test(new URL(request.url()).pathname)
    )
      writes.push(new URL(request.url()).pathname);
  });
  await page.goto(`/estoque?careRecipientId=${fixture.patient}&custody=FAMILY`);
  await expect(
    balances(page)
      .getByRole("status")
      .filter({ hasText: "101 saldos neste filtro" }),
  ).toBeVisible();
  const response = await page.request.get(
    `/api/stock/balances?careRecipientId=${fixture.patient}`,
  );
  expect(response.ok()).toBe(true);
  const overview = (await response.json()).overview;
  expect(overview).toHaveLength(101);
  expect(
    overview.find(
      (p: { productId: string }) => p.productId === fixture.products[0],
    ).active,
  ).toBe(false);
  const reached: string[] = [];
  const pages = balances(page).getByRole("navigation", {
    name: "Páginas dos saldos",
    exact: true,
  });
  for (let number = 1; number <= 7; number++) {
    await expect(pages).toContainText(`${number} / 7`);
    reached.push(
      ...(await table(page)
        .getByRole("row", { name: /^Material canônico/ })
        .evaluateAll((rows) => rows.map((r) => r.getAttribute("aria-label")!))),
    );
    if (number < 7)
      await pages.getByRole("button", { name: "Próxima", exact: true }).click();
  }
  expect(reached).toHaveLength(101);
  expect(new Set(reached)).toEqual(
    new Set(names.map((name) => name + " · Família")),
  );
  await balances(page)
    .getByRole("textbox", { name: "Buscar produto", exact: true })
    .fill(names[1]);
  await expect(row(page, 1)).toContainText("No mínimo");
  await expect(pages).toHaveCount(0);
  await balances(page)
    .getByRole("textbox", { name: "Buscar produto", exact: true })
    .fill("");
  await expect(pages).toContainText("1 / 7");
  const filter = balances(page).getByRole("combobox", {
    name: "Filtro de saldo",
    exact: true,
  });
  await filter.selectOption("low");
  await expect(
    table(page).getByRole("row", { name: /^Material canônico/ }),
  ).toHaveCount(2);
  await expect(row(page, 0)).toContainText("Abaixo do mínimo");
  await expect(row(page, 0)).toContainText("Inativo");
  await expect(row(page, 1)).toContainText("No mínimo");
  await filter.selectOption("zero");
  await expect(
    table(page).getByRole("row", { name: /^Material canônico/ }),
  ).toHaveCount(1);
  await expect(row(page, 100)).toContainText(
    "Saldo zero · mínimo não definido",
  );
  const opener = row(page, 100).getByRole("button", {
    name: "Consultar " + names[100] + " · Família",
    exact: true,
  });
  for (const width of [1440, 1150, 850, 500, 320]) {
    await page.setViewportSize({ width, height: 940 });
    await expect(row(page, 100)).toHaveCSS(
      "display",
      width <= 850 ? "grid" : "table-row",
    );
    await expect(
      table(page).getByRole("columnheader", { name: "Mínimo", exact: true }),
    ).toHaveCount(1);
    await expect(
      row(page, 100)
        .getByRole("cell")
        .filter({ hasText: /^Não definido$/ }),
    ).toBeVisible();
    await auditFromTop(page, `stock-canonical-${width}`);
    if (width === 1440 || width === 320)
      await info.attach(`stock-canonical-${info.project.name}-${width}`, {
        body: await balances(page)
          .locator(".hca-stock-results")
          .screenshot({ animations: "disabled" }),
        contentType: "image/png",
      });
  }
  await opener.click();
  const detail = page.getByRole("dialog", {
    name: names[100] + " · Família",
    exact: true,
  });
  await expect(
    detail
      .locator(".hca-stock-available")
      .getByText("0 unidade", { exact: true }),
  ).toBeVisible();
  for (const label of [
    "Entrada em trânsito",
    "Projeção após entradas previstas",
    "Consumo extraordinário confirmado · 30 dias",
    "Divergência pendente",
  ]) {
    await expect(
      detail.locator("dt").filter({ hasText: label }).locator("+ dd"),
    ).toHaveText("0 unidade");
  }
  await expect(detail.getByText("Não definido", { exact: true })).toBeVisible();
  await audit(page, "stock-canonical-detail320");
  await page.keyboard.press("Escape");
  await expect(detail).toHaveCount(0);
  await expect(opener).toBeFocused();
  expect(writes).toEqual([]);
  expect(physicalState(fixture.patient)).toBe(before);
});

test("filtro de estoque conserva autorização real da equipe e não revela saldo familiar", async ({
  page,
}) => {
  await login(page, "professional");
  await page.goto(
    `/estoque?careRecipientId=${fixture.patient}&custody=CARE_TEAM`,
  );
  const response = await page.request.get(
    `/api/stock/balances?careRecipientId=${fixture.patient}`,
  );
  expect(response.ok()).toBe(true);
  const overview = (await response.json()).overview;
  expect(overview).toHaveLength(101);
  expect(
    overview.every(
      (p: { family: unknown; team: unknown }) =>
        p.family === null && p.team !== null,
    ),
  ).toBe(true);
  await expect(
    balances(page)
      .getByRole("combobox", { name: "Custódia", exact: true })
      .getByRole("option", { name: "Família", exact: true }),
  ).toHaveCount(0);
  await balances(page)
    .getByRole("combobox", { name: "Filtro de saldo", exact: true })
    .selectOption("zero");
  await expect(
    balances(page)
      .getByRole("status")
      .filter({ hasText: "101 saldos neste filtro" }),
  ).toBeVisible();
  await expect(row(page, 0, "Equipe")).toContainText("0 unidade");
  await expect(
    table(page).getByRole("row", { name: / · Família$/ }),
  ).toHaveCount(0);
  const denied = await page.request.post("/api/stock/movements", {
    data: {
      careRecipientId: fixture.patient,
      productId: fixture.products[0],
      action: "inbound",
      quantity: "1",
      reason: "Tentativa fictícia sem autoridade familiar",
      idempotencyKey: crypto.randomUUID(),
    },
  });
  expect(denied.status()).toBe(403);
  expect(physicalState(fixture.patient)).toBe(before);
});
