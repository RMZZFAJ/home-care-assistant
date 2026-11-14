import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { setup, fixtures, rpc } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";

test.setTimeout(120_000);
const history = (page: Page) => page.getByRole("region", { name: "Histórico auditável", exact: true });
const rows = (page: Page) => history(page).locator("tbody tr[data-movement-id]");
const ids = (page: Page) => rows(page).locator("details p.break-all").allTextContents();
const expected = (patient: string, product?: string): string[] => JSON.parse(sql(`select jsonb_agg(id::text order by created_at desc,id desc) from public.stock_movements where care_recipient_id=${q(patient)} and (source_location='FAMILY' or destination_location='FAMILY')${product ? ` and product_id=${q(product)}` : ""};`));
const facts = (patient: string) => sql(`select jsonb_build_object('stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(patient)}),'documents',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id=${q(patient)}));`);
async function login(page: Page, patient: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.adminA.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}
async function traverse(page: Page, order: string[]) {
  const read: string[] = [];
  const navigation = history(page).getByRole("navigation", { name: "Páginas das movimentações", exact: true });
  for (let offset = 0; offset < order.length; offset += 20) {
    const slice = order.slice(offset, offset + 20);
    await expect.poll(() => ids(page)).toEqual(slice);
    read.push(...await ids(page));
    await expect(navigation.getByRole("button", { name: "Anterior", exact: true })).toBeEnabled({ enabled: offset > 0 });
    const next = navigation.getByRole("button", { name: "Próxima", exact: true });
    if (offset + 20 < order.length) await next.click();
    else await expect(next).toBeDisabled();
  }
  expect(read).toEqual(order);
  expect(new Set(read).size).toBe(order.length);
}

test("stock history visits more than100 native movements in exact order, resets filters and preserves facts", async ({ page }) => {
  const f = await setup();
  for (let index = 0; index < 101; index++) {
    await rpc(f.admin, "family_stock_movement", { p_patient: f.patient, p_product: f.products[index % 2], p_action: "inbound", p_quantity: "1", p_reason: `Histórico amplo fictício ${index}`, p_key: randomUUID() });
  }
  const order = expected(f.patient), before = facts(f.patient);
  expect(order.length).toBeGreaterThan(100);
  await page.addInitScript(() => {
    const native = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url, location.origin);
      return native(input, url.pathname === "/api/stock/movements" ? { ...init, signal: undefined } : init);
    };
  });
  await login(page, f.patient);
  const writes: string[] = [];
  page.on("request", request => {
    if (new URL(request.url()).pathname.startsWith("/api/") && request.method() !== "GET") writes.push(request.url());
  });
  await page.goto(`/estoque?careRecipientId=${f.patient}&custody=FAMILY`);
  await traverse(page, order);
  await history(page).getByRole("button", { name: "Filtrar", exact: true }).click();
  let release!: () => void, entered!: () => void;
  const held = new Promise<void>(resolve => { release = resolve; });
  const ready = new Promise<void>(resolve => { entered = resolve; });
  let first = true;
  await page.route("**/api/stock/movements?*", async route => {
    if (first && new URL(route.request().url()).searchParams.get("productId") === f.products[0]) {
      first = false;
      const response = await route.fetch();
      entered();
      await held;
      return route.fulfill({ response });
    }
    return route.continue();
  });
  const oldResponse = page.waitForResponse(response => new URL(response.url()).pathname === "/api/stock/movements" && new URL(response.url()).searchParams.get("productId") === f.products[0]);
  const day = sql(`select (max(created_at) at time zone 'America/Sao_Paulo')::date::text from public.stock_movements where care_recipient_id=${q(f.patient)};`);
  const productOrder = expected(f.patient, f.products[1]);
  expect(productOrder.length).toBeGreaterThanOrEqual(50);
  try {
    await history(page).getByRole("combobox", { name: "Produto", exact: true }).selectOption(f.products[0]);
    await history(page).getByRole("button", { name: "Aplicar filtros", exact: true }).click();
    await ready;
    await expect(history(page)).toHaveAttribute("aria-busy", "true");
    await history(page).getByRole("combobox", { name: "Produto", exact: true }).selectOption(f.products[1]);
    await history(page).getByLabel("De", { exact: true }).fill(day);
    await history(page).getByLabel("Até", { exact: true }).fill(day);
    await history(page).getByRole("button", { name: "Aplicar filtros", exact: true }).click();
    await traverse(page, productOrder);
  } finally { release(); }
  await (await oldResponse).finished();
  await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await expect.poll(() => ids(page)).toEqual(productOrder.slice(Math.floor((productOrder.length - 1) / 20) * 20));
  await page.unroute("**/api/stock/movements?*");
  await history(page).getByLabel("De", { exact: true }).fill("2099-01-01");
  await history(page).getByLabel("Até", { exact: true }).fill("2099-01-02");
  await history(page).getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect(history(page).getByText("Sem movimentações neste filtro", { exact: true })).toBeVisible();
  await expect(rows(page)).toHaveCount(0);
  await history(page).getByRole("combobox", { name: "Produto", exact: true }).selectOption("");
  await history(page).getByLabel("De", { exact: true }).fill("");
  await history(page).getByLabel("Até", { exact: true }).fill("");
  // A real-time refresh still uses the applied filters, without restoring
  // their old defaults over the user's new, unapplied field values.
  const revalidated = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === "/api/stock/movements" && url.searchParams.get("from") === "2099-01-01";
  });
  await page.evaluate(() => window.dispatchEvent(new Event("hca:data-changed")));
  await (await revalidated).finished();
  await expect(history(page)).toHaveAttribute("aria-busy", "false");
  await expect(history(page).getByRole("combobox", { name: "Produto", exact: true })).toHaveValue("");
  await expect(history(page).getByLabel("De", { exact: true })).toHaveValue("");
  await expect(history(page).getByLabel("Até", { exact: true })).toHaveValue("");
  await history(page).getByRole("button", { name: "Aplicar filtros", exact: true }).click();
  await expect.poll(() => ids(page)).toEqual(order.slice(0, 20));
  expect(facts(f.patient)).toBe(before);
  expect(writes).toEqual([]);
});
