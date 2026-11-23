import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { setup, fixtures, rpc } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";

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

test("stock rejects malformed balances and transit, preserves the last verified read and recovers without writes", async ({ page }, info) => {
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
  let mode: "live" | "incomplete" | "number" | "patient" | "custody" | "emptyTransit" | "invalidTransit" | "unavailable" | "denied" = "live";
  const reference = randomUUID();
  await page.route("**/api/stock/balances?**", async route => {
    if (mode === "unavailable") return route.fulfill({ status: 503, json: { error: "Falha controlada ao consultar saldos.", code: "DATABASE_UNAVAILABLE", correlationId: reference } });
    if (mode === "denied") return route.fulfill({ status: 403, json: { error: "Consulta indisponível para o vínculo atual.", code: "FORBIDDEN" } });
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
  const row = balances.getByRole("region", { name: "Material fictício V4 0 · Família", exact: true });
  const refresh = page.getByRole("button", { name: "Atualizar saldos", exact: true });
  const failure = page.getByRole("dialog", { name: "Não foi possível consultar o estoque", exact: true });
  const back = failure.getByRole("button", { name: "Voltar ao estoque", exact: true });
  await expect(row).toContainText("26");
  for (const invalid of ["incomplete", "number", "patient", "custody"] as const) {
    mode = invalid;
    await refresh.click();
    await expect(failure).toContainText("resposta");
    await back.click();
    await expect(refresh).toBeFocused();
    await expect(balances.getByRole("alert")).toContainText("resposta");
    await expect(balances).toHaveAttribute("aria-busy", "false");
    await expect(balances.getByText("Última consulta válida", { exact: false })).toBeVisible();
    await expect(row).toContainText("26");
    await expect(balances.getByText("Nenhum material encontrado", { exact: true })).toHaveCount(0);
  }
  mode = "unavailable";
  await refresh.click();
  await expect(failure).toContainText("Falha controlada ao consultar saldos.");
  for (const width of [360, 412]) {
    await page.setViewportSize({ width, height: 860 });
    await audit(page, "falha de consulta do estoque em " + width);
    const path = info.outputPath(`estoque-falha-${width}.png`);
    await failure.screenshot({ path, scale: "css", animations: "disabled" });
    await info.attach(`estoque-falha-${width}`, { path, contentType: "image/png" });
  }
  const retry = failure.getByRole("button", { name: "Consultar novamente", exact: true });
  for (let attempts = 1; attempts <= 2; attempts++) {
    const rejected = page.waitForResponse(response => new URL(response.url()).pathname === "/api/stock/balances" && response.status() === 503);
    await retry.click();
    await rejected;
  }
  await expect(retry).toHaveCount(0);
  await expect(failure.locator("footer").getByRole("button", { name: "Copiar detalhes", exact: true })).toBeVisible();
  await failure.locator("summary").click();
  await expect(failure.locator("pre")).toContainText(reference);
  await expect(failure.locator("pre")).toContainText("Tentativas de consulta: 2");
  await back.click();
  await expect(refresh).toBeFocused();
  await expect(row).toContainText("26");

  mode = "denied";
  await refresh.click();
  const denied = page.getByRole("dialog", { name: "Acesso indisponível", exact: true });
  await expect(denied).toContainText("Consulta indisponível para o vínculo atual.");
  await denied.getByRole("button", { name: "Voltar ao estoque", exact: true }).click();
  await expect(row).toHaveCount(0);
  await expect(balances.getByText("Última consulta válida", { exact: false })).toHaveCount(0);

  mode = "live";
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/stock/balances?**", async route => {
    await gate;
    await route.continue();
  }, { times: 1 });
  const loading = page.getByRole("dialog", { name: "Atualizando estoque", exact: true });
  try {
    await refresh.click();
    await expect(loading).toContainText("Consultando os saldos disponíveis.");
    await expect(loading.getByRole("list", { name: "Etapas da operação" })).toHaveCount(0);
  } finally {
    release();
  }
  await expect(loading).toHaveCount(0);
  await expect(balances.getByRole("alert")).toHaveCount(0);
  await expect(row).toContainText("26");
  const opener = balances.getByRole("button", { name: "Em trânsito", exact: true });
  const transit = page.getByRole("dialog", { name: "Materiais em trânsito", exact: true });
  const close = transit.getByRole("button", { name: "Fechar", exact: true });
  await opener.click();
  await expect(transit.getByRole("button", { name: delivery.code, exact: true })).toBeVisible();
  await expect(transit.getByText("4 unidade", { exact: true })).toHaveCount(2);
  mode = "emptyTransit";
  await close.click();
  await expect(opener).toBeFocused();
  await opener.click();
  await expect(transit.getByText("Nenhuma transferência em trânsito", { exact: true })).toBeVisible();
  mode = "invalidTransit";
  await close.click();
  await opener.click();
  await expect(transit.getByRole("alert")).toContainText("resposta");
  await expect(transit.getByText("Nenhuma transferência em trânsito", { exact: true })).toHaveCount(0);
  mode = "live";
  await transit.getByRole("button", { name: "Atualizar consulta", exact: true }).click();
  await expect(transit.getByRole("button", { name: delivery.code, exact: true })).toBeVisible();
  await close.click();
  await expect(opener).toBeFocused();
  await expect(row).toContainText("26");
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
    if (mode === "number") body.data[0].rows[0].quantity = "Infinity";
    if (mode === "page") body.page = 1;
    if (mode === "filter") body.filters.productId = null;
    return route.fulfill({ response, json: body });
  });
  await page.goto(`/estoque?careRecipientId=${f.patient}&custody=FAMILY`);
  const history = region(page, "Histórico auditável"), balances = region(page, "Saldos e previsões");
  await expect(history.getByRole("alert")).toContainText("resposta");
  await expect(history.getByText("Sem movimentações neste filtro", { exact: true })).toHaveCount(0);
  await expect(balances.getByRole("region", { name: "Material fictício V4 0 · Família", exact: true })).toContainText("51");
  mode = "live";
  await history.getByRole("button", { name: "Atualizar histórico", exact: true }).click();
  await expect(history.locator("[data-stock-act]")).toHaveCount(20);
  for (const invalid of ["count", "number"] as const) {
    mode = invalid;
    await history.getByRole("button", { name: "Atualizar histórico", exact: true }).click();
    await expect(history.getByRole("alert")).toContainText("resposta");
    await expect(history.locator("[data-stock-act]")).toHaveCount(20);
  }
  mode = "page";
  await history.getByRole("navigation", { name: "Páginas das movimentações", exact: true }).getByRole("button", { name: "Próxima", exact: true }).click();
  await expect(history.getByRole("alert")).toContainText("resposta");
  await expect(history.locator("[data-stock-act]")).toHaveCount(0);
  mode = "live";
  await history.getByRole("button", { name: "Atualizar histórico", exact: true }).click();
  await expect(history.locator("[data-stock-act]")).toHaveCount(3);
  await history.getByRole("button", { name: "Filtrar", exact: true }).click();
  await history.getByRole("combobox", { name: "Produto", exact: true }).selectOption(f.products[1]);
  mode = "filter";
  await history.getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect(history.getByRole("alert")).toContainText("resposta");
  await expect(history.locator("[data-stock-act]")).toHaveCount(0);
  mode = "live";
  await history.getByRole("button", { name: "Atualizar histórico", exact: true }).click();
  await expect(history.locator("[data-stock-act]")).toHaveCount(1);
  await expect(history.getByText("Sem movimentações neste filtro", { exact: true })).toHaveCount(0);
  expect(state(f.patient)).toBe(before);
});
