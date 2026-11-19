import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixtures, rpc } from "../integration/v4-fixtures.mjs";
import { purchaseBalanceFixture } from "../integration/purchase-entry-balance-fixtures.mjs";
import { loginDecision } from "./l1-decision-policy";
import { arrivalCard, confirmArrivalReview, openArrivalReview } from "./purchase-arrival-review";

const endpoint = "/api/purchases/arrivals/unlinked";

test("E05-17 E05-18 registra uma doação avulsa, recupera a resposta e vincula a origem ao movimento", async ({ page, browser }, info) => {
  test.setTimeout(120_000);
  const f = await purchaseBalanceFixture(), [manual, scanned] = f.document.lines;
  const barcode = "1234567890128";
  await rpc(f.admin, "catalogue_presentation_command", { p_patient: f.patient, p_id: null, p_version: null,
    p_key: randomUUID(), p_body: { productId: scanned.product_id, barcode, name: "Pacote com quatro unidades", baseQuantity: "4", active: true } });

  await loginDecision(page, fixtures.family.email, f.patient);
  await page.getByRole("button", { name: "Registrar chegada", exact: true }).click();
  const form = page.getByRole("dialog", { name: "Registrar chegada", exact: true });
  await form.getByLabel("Origem", { exact: true }).selectOption("donation");
  const picker = form.getByRole("combobox", { name: "Adicionar material" });
  await picker.fill(manual.name_snapshot);
  await page.getByRole("option", { name: manual.name_snapshot, exact: true }).click();
  await form.getByRole("textbox", { name: new RegExp("Quantidade recebida · " + manual.name_snapshot) }).fill("3");
  await form.getByRole("button", { name: "Ler código", exact: true }).click();
  const scanner = page.getByRole("dialog", { name: "Ler código do material", exact: true });
  await scanner.getByRole("textbox", { name: "Código manual" }).fill(barcode);
  await scanner.getByRole("button", { name: "Identificar" }).click();
  await scanner.getByRole("textbox", { name: "Embalagens recebidas" }).fill("2");
  await scanner.getByRole("button", { name: "Acrescentar quantidade" }).click();
  await expect(form.getByRole("textbox", { name: new RegExp("Quantidade recebida · " + scanned.name_snapshot) })).toHaveValue("8");

  const attempts: string[] = [];
  await page.route("**" + endpoint, async route => {
    if (route.request().method() !== "POST" || !route.request().postDataJSON().intent) return route.continue();
    const response = await route.fetch();
    expect(response.ok(), await response.text()).toBe(true);
    attempts.push(route.request().postDataJSON().key);
    await route.abort("failed");
  });
  const recovered = page.waitForResponse(response => new URL(response.url()).pathname === endpoint &&
    response.request().method() === "POST" && response.request().postDataJSON().intent === null);
  await form.getByRole("button", { name: "Enviar para aprovação" }).click();
  const response = await recovered;
  expect(response.ok(), await response.text()).toBe(true);
  const { data: receipt } = await response.json();
  expect(attempts).toEqual([receipt.key]);
  expect(receipt.result).toMatchObject({ code: "CHE-0001", origin: "donation", state: "pending" });
  const result = page.getByRole("dialog", { name: "Chegada enviada para aprovação", exact: true });
  await expect(result).toContainText(receipt.result.code);
  await result.getByRole("button", { name: "Concluir" }).click();
  const movements = () => sql(`select count(*) from public.stock_movements where reference_type='unlinked_arrival'
    and reference_id=${sqlLiteral(receipt.result.id)}`);
  expect(movements()).toBe("0");

  await page.goto("/estoque");
  await expect(page.getByRole("region", { name: "Saldos e previsões" }).getByRole("button", { name: "Registrar chegada" })).toBeVisible();
  await page.getByRole("button", { name: "Consultar chegada " + receipt.result.code }).click();
  const details = page.getByRole("dialog", { name: "Detalhes da chegada" });
  await expect(details).toContainText("Aguardando aprovação");
  await expect(details).toContainText("Recebidas: 8 unidade");
  const stockSummary = details.locator("summary").filter({ hasText: "Estoque familiar" }).first();
  await expect(stockSummary).toBeVisible();
  expect(await stockSummary.evaluate(node => getComputedStyle(node, "::after").display)).toBe("none");
  if (info.project.use.hasTouch) await info.attach("E05-17 detalhes da chegada avulsa", {
    body: await page.screenshot({ scale: "css", animations: "disabled" }), contentType: "image/png",
  });
  await details.getByRole("button", { name: `Opções de ${manual.name_snapshot}` }).click();
  await page.getByRole("menuitem", { name: "Detalhes do material" }).click();
  const material = page.getByRole("dialog", { name: "Detalhes do material" });
  await expect(material).toContainText(manual.name_snapshot);
  await material.getByRole("button", { name: "Fechar consulta" }).click();
  await details.getByRole("button", { name: "Fechar consulta" }).click();

  const admin = await browser.newContext({
    baseURL: info.project.use.baseURL, viewport: info.project.use.viewport, hasTouch: info.project.use.hasTouch,
    isMobile: info.project.use.isMobile, userAgent: info.project.use.userAgent,
  });
  try {
    const reviewer = await admin.newPage();
    await loginDecision(reviewer, fixtures.adminA.email, f.patient);
    const review = await openArrivalReview(reviewer);
    await expect(arrivalCard(review, receipt.result.id)).toContainText("CHE-0001 · Doação");
    const { result: approved } = await confirmArrivalReview(reviewer, review);
    await expect(approved).toContainText("Chegada aprovada");
    await approved.getByRole("button", { name: "Concluir" }).click();
    await reviewer.goto("/estoque");
    await reviewer.getByRole("region", { name: "Saldos e previsões" }).getByRole("button", { name: "Registrar chegada" }).click();
    const immediate = reviewer.getByRole("dialog", { name: "Registrar chegada" });
    await expect(immediate).toContainText("Aprovação automática · administrador");
    await immediate.getByLabel("Origem", { exact: true }).selectOption("external_purchase");
    await immediate.getByRole("combobox", { name: "Adicionar material" }).fill(scanned.name_snapshot);
    await reviewer.getByRole("option", { name: scanned.name_snapshot, exact: true }).click();
    await immediate.getByRole("textbox", { name: new RegExp("Quantidade recebida · " + scanned.name_snapshot) }).fill("1");
    await immediate.getByRole("button", { name: "Confirmar entrada" }).click();
    const entry = reviewer.getByRole("dialog", { name: "Entrada confirmada" });
    await expect(entry).toContainText("CHE-0002");
    await expect(entry).toContainText("Compra externa");
  } finally { await admin.close(); }
  expect(movements()).toBe("2");

  await page.reload();
  await page.getByRole("button", { name: "Consultar chegada " + receipt.result.code }).click();
  await expect(details).toContainText("Entrada aprovada");
  await details.getByRole("button", { name: "Fechar consulta" }).click();
  const movementId = sql(`select id from public.stock_movements where reference_type='unlinked_arrival'
    and reference_id=${sqlLiteral(receipt.result.id)} and product_id=${sqlLiteral(manual.product_id)}`);
  await page.locator(`[data-movement-id="${movementId}"]`).getByRole("button", { name: "Consultar origem", exact: true }).click();
  const provenance = page.getByRole("dialog", { name: "Origem da movimentação" });
  await expect(provenance.getByRole("region", { name: "Chegada de origem" })).toContainText("CHE-0001 · Chegada avulsa");
});
