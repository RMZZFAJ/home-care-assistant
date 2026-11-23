import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { setup, fixtures, rpc } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { stockMovement } from "./stock-operation";

test.setTimeout(120_000);
const history = (page: Page) => page.getByRole("region", { name: "Histórico auditável", exact: true });
const rows = (page: Page) => history(page).locator("[data-movement-id]");
const ids = (page: Page) => rows(page).evaluateAll(elements => elements.map(element => element.getAttribute("data-movement-id") ?? ""));
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

test("a reviewed family movement records two materials in one operation and preserves exact origin", async ({ page }) => {
  const f = await setup();
  await login(page, f.patient);
  await page.goto(`/estoque?careRecipientId=${f.patient}&custody=FAMILY`);
  await page.getByRole("button", { name: "Movimentar estoque familiar", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: /^(Movimentar estoque familiar|Confirmar movimentação familiar)$/ });
  await drawer.getByRole("combobox", { name: "Produto", exact: true }).selectOption(f.products[0]);
  await drawer.getByRole("textbox", { name: "Quantidade", exact: true }).fill("4");
  await drawer.getByRole("button", { name: "Adicionar material", exact: true }).click();
  await drawer.getByRole("combobox", { name: "Produto 2", exact: true }).selectOption(f.products[1]);
  await drawer.getByRole("textbox", { name: "Quantidade 2", exact: true }).fill("7");
  await drawer.getByRole("textbox", { name: "Motivo", exact: true }).fill("Reposição após a conferência das duas reservas.");
  await expect(drawer.getByRole("button", { name: /Salvar rascunho/ })).toHaveCount(0);
  await drawer.getByRole("button", { name: "Revisar movimentação", exact: true }).click();
  await expect(drawer.getByText("Após registrar", { exact: true })).toHaveCount(2);
  const saved = page.waitForResponse(response => new URL(response.url()).pathname === "/api/stock/operations" && response.request().method() === "POST");
  await drawer.getByRole("button", { name: "Confirmar", exact: true }).click();
  const response = await saved;
  expect(response.status()).toBe(201);
  const { data } = await response.json();
  const act = page.locator(`[data-stock-act="family:${data.id}"]`);
  await expect(act.locator("summary")).toContainText("2 materiais");
  await expect(act).not.toHaveAttribute("open", "");
  expect(await act.locator("[data-movement-id]").count()).toBe(2);
  const movement = await stockMovement(page, data.movementIds[0]);
  await movement.getByRole("button", { name: /^Consultar origem ·/ }).click();
  const detail = page.getByRole("dialog", { name: "Origem da movimentação" });
  await expect(detail.getByText("Saldo anterior", { exact: true })).toBeVisible();
  await expect(detail.getByText("Saldo posterior", { exact: true })).toBeVisible();
});

test("entrada avulsa revisa a referência alterada e recupera o próprio recibo mesmo sem poder movimentar", async ({ page }, info) => {
  const f = await setup();
  const reason = "Reposição de dois materiais após conferência da família.";
  await login(page, f.patient);
  await page.goto(`/estoque?careRecipientId=${f.patient}&custody=FAMILY`);
  const arrivals = page.getByRole("region", { name: "Chegadas", exact: true });
  await expect(arrivals).toBeVisible();
  await page.getByRole("button", { name: "Movimentar estoque familiar", exact: true }).click();
  const drawer = page.getByRole("dialog", { name: /^(Movimentar estoque familiar|Confirmar movimentação familiar)$/ });
  await drawer.getByRole("combobox", { name: "Produto", exact: true }).selectOption(f.products[0]);
  await drawer.getByRole("textbox", { name: "Quantidade", exact: true }).fill("3");
  await drawer.getByRole("button", { name: "Adicionar material", exact: true }).click();
  await drawer.getByRole("combobox", { name: "Produto 2", exact: true }).selectOption(f.products[1]);
  await drawer.getByRole("textbox", { name: "Quantidade 2", exact: true }).fill("2");
  await drawer.getByRole("textbox", { name: "Motivo", exact: true }).fill(reason);
  await expect(drawer.getByRole("button", { name: /Salvar rascunho/ })).toHaveCount(0);
  expect(await rpc(f.admin, "stock_movement_preparation_context", {
    p_patient: f.patient, p_target: f.patient, p_purpose: "family_movement",
  })).toBeNull();
  await drawer.getByRole("button", { name: "Revisar movimentação", exact: true }).click();
  const confirm = drawer.getByRole("button", { name: "Confirmar", exact: true });
  await expect(confirm).toBeEnabled();
  await rpc(f.admin, "family_stock_movement", {
    p_patient: f.patient, p_product: f.products[0], p_action: "inbound", p_quantity: "1",
    p_reason: "Reposição independente enquanto outra pessoa revisava.", p_key: randomUUID(),
  });
  const before = facts(f.patient);
  await confirm.click();
  await expect(drawer.getByRole("alert")).toContainText("O saldo foi atualizado");
  await expect(drawer.getByText(/^Saldo na referência anterior/)).toHaveCount(2);
  await expect(drawer.getByText(reason, { exact: false })).toBeVisible();
  await expect(confirm).toBeDisabled();
  const viewport = page.viewportSize()!;
  for (const width of [360, 412]) {
    await page.setViewportSize({ width, height: viewport.height });
    const panel = await drawer.boundingBox();
    expect(panel!.y).toBeGreaterThan(0);
    expect(Math.abs(panel!.y + panel!.height - viewport.height)).toBeLessThanOrEqual(1);
    const effects = drawer.locator(".hca-family-stock-effect");
    await expect(effects).toHaveCount(2);
    expect(await effects.evaluateAll(elements => elements.every(element => {
      const [available, after] = element.querySelectorAll("dt");
      const first = available.getBoundingClientRect();
      const second = after.getBoundingClientRect();
      const bounds = element.getBoundingClientRect();
      return first.y === second.y && first.right < second.x && bounds.left >= 0 &&
        bounds.right <= window.innerWidth && element.scrollWidth <= element.clientWidth;
    })), `comparação lado a lado em ${width}px`).toBe(true);
    const capture = info.outputPath(`estoque-familiar-referencia-${width}.png`);
    await drawer.screenshot({ path: capture, animations: "disabled" });
    await info.attach(`Revisão do estoque em ${width} px`, { path: capture, contentType: "image/png" });
  }
  await page.setViewportSize(viewport);
  expect(facts(f.patient)).toBe(before);
  await drawer.getByRole("button", { name: "Usar saldo atualizado", exact: true }).click();
  await expect(confirm).toBeEnabled();
  expect(facts(f.patient)).toBe(before);

  let retries = 0;
  let receipt: { key: string; id: string; movementIds: string[] } | undefined;
  await page.route("**/api/stock/operations", async route => {
    if (route.request().method() !== "POST") return route.continue();
    retries++;
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    receipt = (await response.json()).data;
    return route.abort("failed");
  });
  await confirm.click();
  await expect(page.getByRole("dialog", { name: "Movimentação ainda não confirmada", exact: true })).toBeVisible();
  expect(receipt?.movementIds).toHaveLength(2);
  const committed = facts(f.patient);
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled)
    values (${q(f.patient)},${q(fixtures.adminA.id)},'stock.family.manage',false);
    update public.care_recipients set is_active=false where id=${q(f.patient)};`);
  await page.reload();
  await expect(page.getByRole("button", { name: "Movimentar estoque familiar", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Conferir movimentação enviada", exact: true }).click();
  await expect(arrivals).toHaveCount(0);
  await expect(drawer.getByRole("textbox")).toHaveCount(0);
  const lookup = page.waitForResponse(response => {
    const url = new URL(response.url());
    return url.pathname === "/api/stock/operations" && url.searchParams.get("attemptKey") === receipt?.key;
  });
  await drawer.getByRole("button", { name: "Conferir resultado", exact: true }).click();
  expect((await (await lookup).json()).data).toEqual(receipt);
  await expect(page.getByText("Movimentação encontrada. O lançamento já estava registrado. Nenhuma quantidade foi acrescentada novamente.", { exact: true })).toBeVisible();
  expect(retries).toBe(1);
  expect(facts(f.patient)).toBe(committed);
  await expect(page.locator(`[data-stock-act="family:${receipt?.id}"]`)).toBeVisible();
});

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
