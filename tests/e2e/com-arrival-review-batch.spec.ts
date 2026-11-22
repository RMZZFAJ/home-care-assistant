import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { fixtures, rpc } from "../integration/v4-fixtures.mjs";
import { purchaseBalanceCommand, purchaseBalanceFixture } from "../integration/purchase-entry-balance-fixtures.mjs";
import { loginDecision, noPrivateWrites } from "./l1-decision-policy";
import { arrivalCard, chooseArrivalAction, confirmArrivalReview, openArrivalReview } from "./purchase-arrival-review";

test("Início, Estoque e ficha conferem as mesmas chegadas, com resultados por parcela", async ({ page }, info) => {
  test.setTimeout(120_000);
  const f = await purchaseBalanceFixture(), effects = noPrivateWrites(page);
  const first = await purchaseBalanceCommand(f.family, f.document, "receive", { lines: [
    { lineId: f.document.lines[0].id, quantity: "4", expectedQuantity: "6", remainingAction: "wait" },
  ] });
  const a = await purchaseBalanceCommand(f.family, first, "receive", { lines: [
    { lineId: first.lines[1].id, quantity: "6", expectedQuantity: "6" },
  ] });
  const created = await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "COM",
    p_payload: { origin: "purchase", lines: [{ productId: first.lines[0].product_id, quantity: "6" }] }, p_key: randomUUID(), p_draft: false });
  const bought = await purchaseBalanceCommand(f.admin, created, "purchase", { lines: [{ lineId: created.lines[0].id, quantity: "6" }] });
  const b = await purchaseBalanceCommand(f.family, bought, "receive", { lines: [{ lineId: bought.lines[0].id, quantity: "2", expectedQuantity: "6", remainingAction: "short" }] });
  const [approve, leave] = a.receipts, [returnToAuthor] = b.receipts;
  await loginDecision(page, fixtures.adminA.email, f.patient);
  const home = await openArrivalReview(page);
  await expect(arrivalCard(home, approve.id)).toBeVisible();
  await expect(arrivalCard(home, returnToAuthor.id)).toBeVisible();
  await home.getByRole("button", { name: "Voltar", exact: true }).click();

  await page.goto(`/fichas/${a.id}`);
  const individual = await openArrivalReview(page);
  await expect(arrivalCard(individual, approve.id)).toBeVisible();
  await expect(arrivalCard(individual, returnToAuthor.id)).toHaveCount(0);
  await individual.getByRole("button", { name: "Voltar", exact: true }).click();

  await page.goto("/estoque");
  const stock = await openArrivalReview(page);
  await expect(stock.getByRole("region", { name: `Chegadas de ${a.code}` })).toBeVisible();
  await expect(stock.getByRole("region", { name: `Chegadas de ${b.code}` })).toBeVisible();
  if (info.project.use.hasTouch) await info.attach("E05-11 conferência de chegadas", { body: await page.screenshot({ scale: "css", animations: "disabled" }), contentType: "image/png" });
  await arrivalCard(stock, leave.id).getByRole("switch").click();
  await expect(arrivalCard(stock, leave.id)).toHaveAttribute("data-inactive", "true");
  await chooseArrivalAction(arrivalCard(stock, returnToAuthor.id), "Abrir pendência", "Confira a segunda embalagem.");
  const { result, receipt } = await confirmArrivalReview(page, stock, true);
  await expect(result.getByText("Chegada aprovada", { exact: true })).toHaveCount(1);
  await expect(result.getByText("Correção solicitada", { exact: true })).toHaveCount(1);
  expect(receipt.results).toEqual(expect.arrayContaining([
    expect.objectContaining({ receiptId: approve.id, status: "approved" }),
    expect.objectContaining({ receiptId: returnToAuthor.id, status: "correction_requested" }),
  ]));
  expect(receipt.results).toHaveLength(2);
  expect((await rpc(f.admin, "operational_document", { p_id: a.id })).receipts.find((item: { id: string }) => item.id === leave.id).state).toBe("pending");
  expect(effects).toEqual([]);
});
