import { openOperationalDocumentAction } from "./document-sections";
import { expect, test, type Locator } from "@playwright/test";
import { PDF } from "@libpdf/core";
import { randomUUID } from "node:crypto";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixtures, rpc } from "../integration/v4-fixtures.mjs";
import { purchaseBalanceCommand, purchaseBalanceFixture } from "../integration/purchase-entry-balance-fixtures.mjs";
import { confirmDecisionAndReconcile, loginDecision, loseDecisionResponse } from "./l1-decision-policy";
import { selectDocumentSection } from "./document-sections";
import { arrivalCard, confirmArrivalReview, openArrivalReview } from "./purchase-arrival-review";
import { generatedPdf } from "./generated-pdf";

async function createPlan(f: Awaited<ReturnType<typeof purchaseBalanceFixture>>, quantity: string) {
  return rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_draft: false,
    p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity }] } });
}

async function coverEarlier(dialog: Locator, material: string, lineId: string, amount: string) {
  await dialog.getByRole("switch", { name: "Cobrir outro planejamento · " + material }).click();
  await dialog.getByRole("combobox", { name: "Planejamento anterior · " + material }).selectOption(lineId);
  await dialog.getByRole("textbox", { name: "Cobertas por esta chegada · " + material }).fill(amount);
}

test("E05-02 associa automaticamente a COM de origem e cobre só a quantidade escolhida da compra anterior", async ({ page }, info) => {
  test.setTimeout(120_000);
  const f = await purchaseBalanceFixture();
  const older = await createPlan(f, "5"), recent = await createPlan(f, "8");
  const [line] = recent.lines;
  const purchase = await purchaseBalanceCommand(f.family, recent, "purchase", { lines: [{ lineId: line.id, quantity: "8" }] });
  await loginDecision(page, fixtures.family.email, f.patient);
  await page.goto("/fichas/" + purchase.id);
  await selectDocumentSection(page, "workflow");
  await openOperationalDocumentAction(page, "Registrar chegada");
  const dialog = page.getByRole("dialog", { name: "Registrar chegada", exact: true });
  await expect(dialog.getByText("Compra de origem", { exact: false })).toContainText(purchase.code);
  await expect(dialog.getByRole("combobox", { name: /Qual compra recebeu/ })).toHaveCount(0);
  const received = dialog.locator(`input[name="${line.id}"]`);
  await received.fill("8");
  const origin = dialog.getByRole("button", { name: purchase.code, exact: true });
  await origin.click();
  const originPanel = page.getByRole("dialog", { name: purchase.code, exact: true });
  await expect(originPanel.getByRole("heading", { name: "Identificação do registro", exact: true })).toBeVisible();
  await originPanel.getByRole("button", { name: "Voltar à origem", exact: true }).click();
  await expect(received).toHaveValue("8");

  const targetUrl = "**/api/purchases/arrivals/targets?**";
  let release!: () => void;
  const hold = new Promise<void>(resolve => { release = resolve; });
  await page.route(targetUrl, async route => {
    await hold;
    await route.fulfill({ status: 503, json: { code: "DEPENDENCY_UNAVAILABLE", error: "Consulta de planejamentos indisponível." } });
  });
  const coverageSwitch = dialog.getByRole("switch", { name: "Cobrir outro planejamento · " + line.name_snapshot });
  const target = dialog.getByRole("combobox", { name: "Planejamento anterior · " + line.name_snapshot });
  const send = dialog.getByRole("button", { name: "Enviar para aprovação", exact: true });
  const endpoint = `/api/documents/${purchase.id}/decisions`;
  const earlyWrites: string[] = [];
  await page.route("**" + endpoint, async route => {
    earlyWrites.push(route.request().method());
    await route.abort();
  });
  try {
    await coverageSwitch.check();
    await expect(dialog.getByText("Consultando planejamentos…", { exact: true })).toBeVisible();
    await send.click();
    expect(await target.evaluate((field: HTMLSelectElement) => field.validity.valueMissing)).toBe(true);
    release();
    await expect(dialog.getByRole("alert")).toContainText("Consulta de planejamentos indisponível.");
    await send.click();
    await expect(coverageSwitch).toBeChecked();
    expect(earlyWrites).toEqual([]);
  } finally { release(); await page.unroute(targetUrl); }
  await dialog.getByRole("button", { name: "Consultar planejamentos novamente" }).click();
  await target.selectOption(older.lines[0].id);
  const coveredAmount = dialog.getByRole("textbox", { name: "Cobertas por esta chegada · " + line.name_snapshot });
  await coveredAmount.fill("6");
  await expect(coveredAmount).toHaveAttribute("aria-invalid", "true");
  await send.click();
  expect(earlyWrites).toEqual([]);
  await page.unroute("**" + endpoint);
  await coveredAmount.fill("3");
  await expect(dialog.getByText(`também cobrem o planejamento da ${older.code}`, { exact: false })).toBeVisible();
  if (info.project.use.hasTouch) await info.attach("E05-02 cobertura a partir da COM", {
    body: await page.screenshot({ scale: "css", animations: "disabled" }), contentType: "image/png",
  });
  const packets = await loseDecisionResponse(page, endpoint);
  await confirmDecisionAndReconcile(page, purchase.id, dialog.getByRole("button", { name: "Enviar para aprovação" }));
  await page.unroute("**" + endpoint);
  expect(packets).toHaveLength(1);
  await page.getByRole("dialog", { name: "Chegada enviada para aprovação" }).getByRole("button", { name: "Concluir" }).click();
  const pending = await rpc(f.admin, "operational_document", { p_id: purchase.id });
  const [receipt] = pending.receipts;
  expect(receipt.lines[0].coverage).toEqual({ documentId: older.id, lineId: older.lines[0].id, quantity: "3" });
  await page.context().clearCookies();
  await loginDecision(page, fixtures.adminA.email, f.patient);
  const review = await openArrivalReview(page);
  await expect(arrivalCard(review, receipt.id).getByRole("link", { name: older.code })).toBeVisible();
  const { result } = await confirmArrivalReview(page, review);
  await expect(result.getByText("Chegada aprovada", { exact: true })).toBeVisible();
  await result.getByRole("button", { name: "Concluir" }).click();
  await page.goto("/fichas/" + older.id);
  await selectDocumentSection(page, "workflow");
  const covered = page.getByRole("region", { name: "Planejamentos cobertos" });
  await expect(covered.getByRole("link", { name: purchase.code })).toBeVisible();
  await expect(covered).toContainText("Cobertura do planejamento: 3 unidade");
  expect(sql(`select count(*) from public.stock_movements where reference_type='purchase_receipt' and reference_id=${sqlLiteral(receipt.id)}`)).toBe("1");
});

test("E05-02 associa uma doação registrada no Estoque e conserva a origem do crédito", async ({ page }, info) => {
  test.setTimeout(120_000);
  const f = await purchaseBalanceFixture(), older = await createPlan(f, "5"), recent = await createPlan(f, "8");
  const [line] = recent.lines;
  await loginDecision(page, fixtures.adminA.email, f.patient);
  await page.goto("/estoque");
  await page.getByRole("region", { name: "Saldos e previsões" }).getByRole("button", { name: "Registrar chegada" }).click();
  const dialog = page.getByRole("dialog", { name: "Registrar chegada" });
  await dialog.getByLabel("Origem", { exact: true }).selectOption("donation");
  await dialog.getByRole("combobox", { name: "Adicionar material" }).fill(line.name_snapshot);
  await page.getByRole("option", { name: line.name_snapshot, exact: true }).click();
  await dialog.getByRole("textbox", { name: new RegExp("Quantidade recebida · " + line.name_snapshot) }).fill("4");
  const association = dialog.getByRole("combobox", { name: `Qual compra recebeu esse material? · ${line.name_snapshot}` });
  await expect(association).toHaveValue("");
  await expect(association.getByRole("option", { name: new RegExp(recent.code + ".*mais recente") })).toHaveCount(1);
  await association.selectOption(line.id);
  await coverEarlier(dialog, line.name_snapshot, older.lines[0].id, "2");
  if (info.project.use.hasTouch) await info.attach("E05-02 cobertura a partir do estoque", {
    body: await page.screenshot({ scale: "css", animations: "disabled" }), contentType: "image/png",
  });
  const sent = page.waitForResponse(response => new URL(response.url()).pathname === "/api/purchases/arrivals/unlinked" &&
    response.request().method() === "POST" && Boolean(response.request().postDataJSON().intent));
  await dialog.getByRole("button", { name: "Confirmar entrada" }).click();
  const returned = await sent;
  expect(returned.ok(), await returned.text()).toBe(true);
  const { data: { result: arrival } } = await returned.json();
  await page.getByRole("dialog", { name: "Entrada confirmada" }).getByRole("button", { name: "Concluir" }).click();
  await page.getByRole("button", { name: "Consultar chegada " + arrival.code }).click();
  const details = page.getByRole("dialog", { name: "Detalhes da chegada" });
  await expect(details).toContainText("chegada associada a uma compra");
  await expect(details.getByRole("link", { name: recent.code })).toBeVisible();
  await expect(details.getByRole("link", { name: older.code })).toBeVisible();
  expect(sql(`select count(*) from public.stock_movements where reference_type='unlinked_arrival' and reference_id=${sqlLiteral(arrival.id)}`)).toBe("1");
  const pdf = await generatedPdf(page, `/api/documents/${recent.id}/pdf`);
  expect(pdf.ok(), await pdf.text()).toBe(true);
  const bytes = await pdf.body();
  const text = (await PDF.load(bytes)).extractText().flatMap(sheet => sheet.lines.map(row =>
    row.spans.flatMap(span => span.chars.map(char => char.char)).join(""))).join(" ").replaceAll(/\s+/g, " ");
  expect(text).toContain("Cobertura de planejamento e chegadas associadas");
  expect(text).toContain("Chegada associada " + arrival.code);
  expect(text).toContain("Planejamento coberto em " + older.code);
  expect(text).toContain("A entrada física consta uma vez, na chegada de origem.");
  expect(text).toContain("1 chegada associada");
  if (info.project.name === "ios") await info.attach("COM associada · PDF assinado", { body: bytes, contentType: "application/pdf" });
});
