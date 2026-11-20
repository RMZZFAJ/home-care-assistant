import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixtures, rpc } from "../integration/v4-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { purchaseBalanceArrival, purchaseBalanceCommand, purchaseBalanceFixture } from "../integration/purchase-entry-balance-fixtures.mjs";
import { confirmDecisionAndReconcile, loginDecision, loseDecisionResponse } from "./l1-decision-policy";
import { selectDocumentSection } from "./document-sections";
import { generatedPdf } from "./generated-pdf";
import { arrivalCard, chooseArrivalAction, confirmArrivalReview, openArrivalReview } from "./purchase-arrival-review";

test("COM devolve a mesma chegada ao autor e credita só o que foi reenviado e aprovado", async ({ page }, info) => {
  test.setTimeout(100_000);
  const f = await purchaseBalanceFixture(), [line] = f.document.lines;
  const pending = await purchaseBalanceCommand(f.family, f.document, "receive", { lines: [
    { lineId: line.id, quantity: "4", expectedQuantity: "6", remainingAction: "wait" },
  ] }, randomUUID());
  const [receipt] = pending.receipts;
  const stockEntries = () => sql(`select count(*) from public.stock_movements where reference_type='purchase_receipt' and reference_id=${sqlLiteral(receipt.id)};`);
  const path = `/fichas/${pending.id}`;
  const note = "Confira as unidades por embalagem.";
  await loginDecision(page, fixtures.adminA.email, f.patient);
  await page.goto(path);
  await selectDocumentSection(page, "workflow");
  const request = await openArrivalReview(page);
  await chooseArrivalAction(arrivalCard(request, receipt.id), "Abrir pendência", note);
  const { result: requested } = await confirmArrivalReview(page, request);
  await expect(requested.getByText("Correção solicitada", { exact: true })).toBeVisible();
  await requested.getByRole("button", { name: "Concluir" }).click();
  await expect(page.getByRole("button", { name: "Corrigir chegada", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Conferir chegadas", exact: true })).toHaveCount(0);
  expect(stockEntries()).toBe("0");
  const pdf = await generatedPdf(page, `/api/documents/${pending.id}/pdf`);
  expect(pdf.ok(), await pdf.text()).toBe(true);
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

  await page.context().clearCookies();
  await loginDecision(page, fixtures.family.email, f.patient);
  await page.goto(path);
  await selectDocumentSection(page, "workflow");
  await page.getByRole("button", { name: "Corrigir chegada", exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Corrigir chegada", exact: true });
  await expect(editor.getByText(note, { exact: true })).toBeVisible();
  const quantity = editor.getByRole("textbox", { name: /^Quantidade corrigida/ });
  await expect(quantity).toHaveValue("4");
  if (info.project.use.hasTouch) await info.attach("E05-10 correção da chegada", { body: await page.screenshot({ scale: "css", animations: "disabled" }), contentType: "image/png" });
  await editor.getByRole("button", { name: "Detalhes de " + line.name_snapshot, exact: true }).click();
  const details = page.getByRole("dialog", { name: "Detalhes do material", exact: true });
  await expect(details).toBeVisible();
  await details.getByRole("button", { name: "Fechar diálogo", exact: true }).click();
  await expect(details).toHaveCount(0);
  await quantity.fill("5");
  const endpoint = `/api/documents/${pending.id}/decisions`;
  const packets = await loseDecisionResponse(page, endpoint);
  await confirmDecisionAndReconcile(page, pending.id, editor.getByRole("button", { name: "Reenviar para aprovação", exact: true }));
  await page.getByRole("dialog", { name: "Chegada reenviada", exact: true }).getByRole("button", { name: "Concluir" }).click();
  expect(packets).toHaveLength(1);
  expect(stockEntries()).toBe("0");
  const after = await rpc(f.admin, "operational_document", { p_id: pending.id });
  expect(after.receipts).toHaveLength(1);
  expect(after.receipts[0]).toMatchObject({ id: receipt.id, state: "pending", lines: [{ quantity: "5" }] });
  expect(after.receipts[0].corrections[0]).toMatchObject({ reason: note, previousLines: [{ quantity: "4" }], correctedLines: [{ quantity: "5" }] });
  const credited = await purchaseBalanceCommand(f.admin, after, "validate_receipt", { receiptId: receipt.id });
  expect(credited.receipts[0].state).toBe("approved");
  expect(stockEntries()).toBe("1");
});

test("COM aberta compara a quantidade corrigida de uma chegada antes de atualizar", async ({ page }, info) => {
  test.setTimeout(120_000);
  const f = await purchaseBalanceFixture(), [line, otherLine] = f.document.lines;
  const declaration = { lineId: line.id, quantity: "4", expectedQuantity: "6", remainingAction: "wait" };
  const pending = await purchaseBalanceCommand(f.family, f.document, "receive", { lines: [declaration] });
  const [receipt] = pending.receipts;
  const awaiting = await purchaseBalanceCommand(f.admin, pending, "request_receipt_correction", {
    receiptId: receipt.id, reason: "Revise a unidade da embalagem.",
  });
  const other = await purchaseBalanceArrival(f, awaiting, [{ lineId: otherLine.id, quantity: "6" }]);
  const reviewer = await shiftWorker(f.patient, "admin");
  const path = `/fichas/${awaiting.id}`;
  await page.goto("/login?next=" + encodeURIComponent(path));
  await page.getByLabel("E-mail", { exact: true }).fill(reviewer.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(url => url.pathname === path);
  await expect(page.locator(".hca-workspace")).toHaveAttribute("data-context-patient", f.patient);
  await selectDocumentSection(page, "materials");
  await expect(page.getByRole("tabpanel")).toContainText(line.name_snapshot);
  await expect(page.locator(".hca-document-freshness")).toHaveCount(0);

  await purchaseBalanceCommand(f.family, other.document, "resubmit_receipt", {
    receiptId: receipt.id, lines: [{ ...declaration, quantity: "5" }],
  });
  await page.evaluate(() => window.dispatchEvent(new Event("hca:data-changed")));
  const banner = page.locator(".hca-document-freshness");
  const opener = banner.getByRole("button", { name: "Ver o que mudou", exact: true });
  await expect(banner.getByRole("status")).toHaveText("A quantidade da chegada mudou.");
  await opener.click();
  const comparison = page.getByRole("dialog", { name: "A quantidade recebida mudou", exact: true });
  const amount = comparison.locator("dl > div").filter({ hasText: "Quantidade informada na chegada" });
  await expect(amount.locator("del")).toContainText("Antes: 4 ");
  await expect(amount.locator("strong")).toContainText("Agora: 5 ");
  await expect(comparison.getByText("Quantidade recebida no estoque familiar", { exact: false })).toHaveCount(0);
  if (info.project.use.hasTouch) await info.attach("E05-15 chegada atualizada", { body: await comparison.screenshot({ scale: "css", animations: "disabled" }), contentType: "image/png" });
  await comparison.getByRole("button", { name: "Consultar compra", exact: true }).click();
  await expect(comparison).toHaveCount(0);
  await expect(opener).toBeFocused();
  await opener.click();
  await comparison.getByRole("button", { name: "Revisar chegada", exact: true }).click();
  const review = page.getByRole("dialog", { name: "Conferir entrada no estoque", exact: true });
  await expect(arrivalCard(review, receipt.id)).toContainText(/5\s+unidade.*informados/);
  await expect(arrivalCard(review, other.receipt.id)).toHaveCount(0);
  await expect(review.getByRole("button", { name: "Confirmar decisões", exact: true })).toBeEnabled();
  await review.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(opener).toBeFocused();
  await page.getByRole("button", { name: "Atualizar ficha", exact: true }).click();
  await expect(banner).toHaveCount(0);
  expect(sql(`select count(*) from public.stock_movements where reference_type='purchase_receipt'
    and reference_id in (${sqlLiteral(receipt.id)}, ${sqlLiteral(other.receipt.id)});`)).toBe("0");
});
