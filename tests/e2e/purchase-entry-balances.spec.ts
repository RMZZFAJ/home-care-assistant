import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { purchaseBalanceFixture, purchaseBalanceArrival, purchaseBalanceCommand, otherPurchaseEntry, purchaseBalanceFacts } from "../integration/purchase-entry-balance-fixtures.mjs";
import { fixtures } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { selectDocumentSection } from "./document-sections";
import { auditFromTop } from "./accessibility-audit";
import { generatedPdf } from "./generated-pdf";
import { formatBrazilDate } from "@/lib/receipt";

test.setTimeout(180_000);
test.afterEach(async ({ page }) => page.unrouteAll({ behavior: "wait" }));
test("COM shows each material's last validated family balance, distinct parcels and secure recovery without stock writes", async ({ page }, info) => {
  const f = await purchaseBalanceFixture();
  const a = f.document.lines.find((line: { product_id: string }) => line.product_id === f.products[0]);
  const b = f.document.lines.find((line: { product_id: string }) => line.product_id === f.products[1]);
  await page.goto("/login"); await page.getByLabel("E-mail", { exact: true }).fill(fixtures.family.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, f.patient); await page.goto("/fichas/" + f.document.id);
  await selectDocumentSection(page, "materials");
  const table = page.getByRole("table", { name: "Materiais da compra ou doação", exact: true });
  const row = (id: string) => table.locator('[data-material-line-id="' + id + '"]');
  const balance = (id: string) => row(id).locator('[data-label="Saldo após última entrada"]');
  const refresh = page.getByRole("button", { name: "Atualizar ficha", exact: true });
  async function refreshCopy(expectedVersion?: number) {
    await expect(refresh).toBeEnabled();
    await refresh.focus(); await expect(refresh).toBeFocused();
    const read = page.waitForResponse(response => new URL(response.url()).pathname === "/api/documents/" + f.document.id && response.request().method() === "GET");
    await refresh.press("Enter"); const response = await read; await response.finished();
    await expect(refresh).toHaveAttribute("aria-busy", "false");
    if (expectedVersion !== undefined) expect((await response.json()).data.version).toBe(expectedVersion);
  }
  await expect(balance(a.id)).toHaveText("Sem entrada validada");
  await expect(balance(b.id)).toHaveText("Sem entrada validada");
  const arrival = await purchaseBalanceArrival(f, f.document, [{ lineId: a.id, quantity: "2" }, { lineId: b.id, quantity: "4" }]);
  await refreshCopy();
  await expect(balance(a.id)).toHaveText("Sem entrada validada");
  const first = await purchaseBalanceCommand(f.admin, arrival.document, "validate_receipt", { receiptId: arrival.receipt.id });
  await otherPurchaseEntry(f, "5");
  const later = await purchaseBalanceArrival(f, first, [{ lineId: a.id, quantity: "1" }], f.admin);
  await otherPurchaseEntry(f, "1");
  const before = purchaseBalanceFacts(f), writes: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/documents/" + f.document.id && request.method() === "POST") writes.push(request.method()); });
  // A live invalidation can start between focus and Enter. Hold that read so
  // explicit refresh must replace it, rather than silently lose the intent.
  const target = "**/api/documents/" + f.document.id;
  let holdFirst = true, entered!: () => void, release!: () => void;
  const backgroundRead = new Promise<void>(resolve => { entered = resolve; });
  const backgroundGate = new Promise<void>(resolve => { release = resolve; });
  await page.route(target, async route => {
    if (route.request().method() === "GET" && holdFirst) {
      holdFirst = false; entered(); await backgroundGate;
      // The replacement explicitly cancels this older intercepted request.
      await route.abort("aborted").catch(() => undefined);
    } else await route.continue();
  });
  try {
    await page.evaluate(() => window.dispatchEvent(new Event("hca:data-changed")));
    await backgroundRead;
    await expect(refresh).toHaveAttribute("aria-busy", "true");
    await expect(refresh).toBeEnabled();
    await expect(balance(a.id)).toHaveText("Sem entrada validada");
    await refreshCopy(later.document.version);
  } finally { release(); await page.unroute(target); }
  await expect(balance(a.id).locator("strong")).toHaveText("38 unidade");
  await expect(balance(b.id).locator("strong")).toHaveText("34 unidade");
  await expect(row(a.id).locator('[data-label="Validado"]')).toHaveText("3 unidade");
  await expect(row(b.id).locator('[data-label="Validado"]')).toHaveText("4 unidade");
  await expect(balance(a.id)).toContainText("Parcela 2 · entrada de 1 unidade");
  await expect(balance(b.id)).toContainText("Parcela 1 · entrada de 4 unidade");
  await expect(balance(a.id)).toContainText(formatBrazilDate(later.receipt.validated_at));
  await expect(balance(b.id)).toContainText(formatBrazilDate(first.receipts.find((receipt: { id: string }) => receipt.id === arrival.receipt.id).validated_at));
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 940 });
    const header = await page.locator(".app-header").evaluate(element => {
      const box = element.getBoundingClientRect();
      const context = element.querySelector(".header-context")!.getBoundingClientRect();
      return { height: box.height, containsContext: context.top >= box.top && context.bottom <= box.bottom };
    });
    expect(header, "cabeçalho e contexto " + width).toEqual({ height: width <= 850 ? 104 : 65, containsContext: true });
    await auditFromTop(page, "com-entry-balances-" + width);
    await info.attach("com-header-" + width, { body: await page.locator(".app-header").screenshot({ animations: "disabled" }), contentType: "image/png" });
  }
  mkdirSync("output/playwright/phase-d", { recursive: true });
  await table.screenshot({ path: "output/playwright/phase-d/com-entry-balances-" + info.project.name + ".png", animations: "disabled" });
  await selectDocumentSection(page, "workflow");
  const parcels = page.getByRole("region", { name: "Parcelas de chegada", exact: true });
  await expect(parcels.getByRole("heading", { name: "Parcela 1 · Validada", exact: true })).toBeVisible();
  await expect(parcels.getByRole("heading", { name: "Parcela 2 · Validada", exact: true })).toBeVisible();
  const pdf = await generatedPdf(page, "/api/documents/" + f.document.id + "/pdf"); expect(pdf.status()).toBe(200);
  mkdirSync("output/pdf/phase-d", { recursive: true });
  writeFileSync("output/pdf/phase-d/com-entry-balances-" + info.project.name + ".pdf", await pdf.body());
  expect(purchaseBalanceFacts(f)).toBe(before); expect(writes).toEqual([]);
  sql("insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(" + q(f.patient) + "," + q(fixtures.family.id) + ",'stock.family.read',false)");
  await selectDocumentSection(page, "materials");
  await refreshCopy();
  await expect(balance(a.id)).toContainText("Acesso restrito"); await expect(balance(b.id)).toContainText("Acesso restrito");
  expect((await page.request.get(pdf.url())).status()).toBe(403);
  await page.route(target, async route => {
    if (route.request().method() !== "GET") return route.continue();
    const response = await route.fetch(), body = await response.json();
    body.data.purchaseEntryBalances[0].entry.eventId = randomUUID();
    return route.fulfill({ response, json: body });
  });
  await refreshCopy();
  await expect(page.getByRole("tabpanel", { name: "Materiais", exact: true }).getByRole("alert")).toContainText("Não foi possível conferir o saldo das entradas");
  await expect(balance(a.id)).toHaveText("Saldo não conferido");
  await page.unrouteAll({ behavior: "wait" });
  await refreshCopy();
  await expect(balance(a.id)).toContainText("Acesso restrito");
  expect(purchaseBalanceFacts(f)).toBe(before); expect(writes).toEqual([]);
});
