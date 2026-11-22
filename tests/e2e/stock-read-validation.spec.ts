import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { setup, fixtures, rpc } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";

test.setTimeout(180_000);
test.afterEach(async ({ page }) => { await page.unrouteAll({ behavior: "wait" }); });

async function login(page: Page, patient: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}
const state = (patient: string) => sql(`select encode(sha256(convert_to(jsonb_build_object(
  'ledger',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(patient)}),
  'documents',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id=${q(patient)})
)::text,'UTF8')),'hex');`);
const region = (page: Page, name: string) => page.getByRole("region", { name, exact: true });

test("stock rejects malformed balances and transit, preserves the last verified read and recovers without writes", async ({ page }) => {
  const f = await setup();
  const delivery = await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "ENT", p_key: randomUUID(),
    p_payload: { source: "FAMILY", destination: "CARE_TEAM", recipientId: fixtures.professional.id,
      recipientReason: "Entrega fictícia para validar a leitura do trânsito", lines: [{ productId: f.products[0], quantity: "4" }] } });
  const before = state(f.patient);
  await login(page, f.patient);
  const writes: string[] = [];
  page.on("request", request => {
    if (request.method() !== "GET" && /^\/api\/(stock|documents)/.test(new URL(request.url()).pathname)) writes.push(request.url());
  });
  let mode: "live" | "incomplete" | "number" | "patient" | "custody" | "emptyTransit" | "invalidTransit" = "live";
  await page.route("**/api/stock/balances?**", async route => {
    const response = await route.fetch();
    const body = await response.json();
    if (mode === "incomplete") return route.fulfill({ response, json: { overview: [] } });
    if (mode === "number") body.overview[0].family.confirmed = "NaN";
    if (mode === "patient") body.careRecipientId = fixtures.professional.id;
    if (mode === "custody") body.custody = "CARE_TEAM";
    if (mode === "emptyTransit") body.transit = [];
    if (mode === "invalidTransit") body.transit = null;
    return route.fulfill({ response, json: body });
  });
  await page.goto(`/estoque?careRecipientId=${f.patient}&custody=FAMILY`);
  const balances = region(page, "Saldos e previsões");
  const row = balances.getByRole("row", { name: "Material fictício V4 0 · Família", exact: true });
  await expect(row).toContainText("26");
  for (const invalid of ["incomplete", "number", "patient", "custody"] as const) {
    mode = invalid;
    await balances.getByRole("button", { name: "Atualizar saldos", exact: true }).click();
    await expect(balances.getByRole("alert")).toContainText("resposta");
    await expect(balances.getByText("Última consulta válida", { exact: false })).toBeVisible();
    await expect(row).toContainText("26");
    await expect(balances.getByText("Nenhum produto encontrado", { exact: true })).toHaveCount(0);
  }
  mode = "live";
  await balances.getByRole("button", { name: "Atualizar saldos", exact: true }).click();
  await expect(balances.getByRole("alert")).toHaveCount(0);
  await balances.getByRole("combobox", { name: "Custódia", exact: true }).selectOption("TRANSIT");
  await expect(balances.getByRole("link", { name: delivery.code, exact: true })).toBeVisible();
  await expect(balances.getByText("4 unidade", { exact: true })).toHaveCount(2);
  mode = "emptyTransit";
  await balances.getByRole("button", { name: "Atualizar saldos", exact: true }).click();
  await expect(balances.getByText("Nenhuma entrega em trânsito", { exact: true })).toBeVisible();
  mode = "invalidTransit";
  await balances.getByRole("button", { name: "Atualizar saldos", exact: true }).click();
  await expect(balances.getByRole("alert")).toContainText("resposta");
  await expect(balances.getByText("Nenhuma entrega em trânsito", { exact: true })).toHaveCount(0);
  mode = "live";
  await balances.getByRole("button", { name: "Atualizar saldos", exact: true }).click();
  await expect(balances.getByRole("link", { name: delivery.code, exact: true })).toBeVisible();
  expect(writes).toEqual([]);
  expect(state(f.patient)).toBe(before);
});

test("stock history refuses incomplete totals and foreign page or filter responses while keeping independent balances", async ({ page }) => {
  const f = await setup();
  for (let index = 0; index < 21; index++) {
    await rpc(f.admin, "family_stock_movement", { p_patient: f.patient, p_product: f.products[0], p_action: "inbound",
      p_quantity: "1", p_reason: "Evento fictício para paginação verificada", p_key: randomUUID() });
  }
  const before = state(f.patient);
  await login(page, f.patient);
  let mode: "incomplete" | "live" | "count" | "number" | "page" | "filter" = "incomplete";
  await page.route("**/api/stock/movements?**", async route => {
    const response = await route.fetch();
    const body = await response.json();
    if (mode === "incomplete") return route.fulfill({ response, json: { data: [] } });
    if (mode === "count") body.total = 0;
    if (mode === "number") body.data[0].quantity = "Infinity";
    if (mode === "page") body.page = 1;
    if (mode === "filter") body.filters.productId = null;
    return route.fulfill({ response, json: body });
  });
  await page.goto(`/estoque?careRecipientId=${f.patient}&custody=FAMILY`);
  const history = region(page, "Histórico auditável"), balances = region(page, "Saldos e previsões");
  await expect(history.getByRole("alert")).toContainText("resposta");
  await expect(history.getByText("Sem movimentações neste filtro", { exact: true })).toHaveCount(0);
  await expect(balances.getByRole("row", { name: "Material fictício V4 0 · Família", exact: true })).toContainText("51");
  mode = "live";
  await history.getByRole("button", { name: "Atualizar histórico", exact: true }).click();
  await expect(history.locator("tbody tr[data-movement-id]")).toHaveCount(20);
  for (const invalid of ["count", "number"] as const) {
    mode = invalid;
    await history.getByRole("button", { name: "Atualizar histórico", exact: true }).click();
    await expect(history.getByRole("alert")).toContainText("resposta");
    await expect(history.locator("tbody tr[data-movement-id]")).toHaveCount(20);
  }
  mode = "page";
  await history.getByRole("navigation", { name: "Páginas das movimentações", exact: true }).getByRole("button", { name: "Próxima", exact: true }).click();
  await expect(history.getByRole("alert")).toContainText("resposta");
  await expect(history.locator("tbody tr[data-movement-id]")).toHaveCount(0);
  mode = "live";
  await history.getByRole("button", { name: "Atualizar histórico", exact: true }).click();
  await expect(history.locator("tbody tr[data-movement-id]")).toHaveCount(3);
  await history.getByRole("button", { name: "Filtrar", exact: true }).click();
  await history.getByRole("combobox", { name: "Produto", exact: true }).selectOption(f.products[1]);
  mode = "filter";
  await history.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect(history.getByRole("alert")).toContainText("resposta");
  await expect(history.locator("tbody tr[data-movement-id]")).toHaveCount(0);
  mode = "live";
  await history.getByRole("button", { name: "Atualizar histórico", exact: true }).click();
  await expect(history.locator("tbody tr[data-movement-id]")).toHaveCount(1);
  await expect(history.getByText("Sem movimentações neste filtro", { exact: true })).toHaveCount(0);
  expect(state(f.patient)).toBe(before);
});
