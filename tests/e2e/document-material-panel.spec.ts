import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { remainingNeedFixture, physicalState, fixtures } from "../integration/remaining-need-fixtures.mjs";
import { rpc } from "../integration/v4-fixtures.mjs";
import { purchaseBalanceCommand, purchaseBalanceFacts, purchaseBalanceFixture } from "../integration/purchase-entry-balance-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { selectDocumentSection } from "./document-sections";

test("material panel retains its linked consultation, search, and focus after a full document visit", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 620 });
  const f = await remainingNeedFixture();
  const before = physicalState(f);
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.professional.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await selectContext(page, f.patient);
  await page.goto(`/fichas/${f.source.id}`);
  await selectDocumentSection(page, "materials");
  const search = page.getByRole("searchbox", { name: "Pesquisar material", exact: true });
  await search.fill("V4 0");
  const list = page.getByRole("list", { name: "Materiais requisitados", exact: true });
  await expect(list.getByRole("listitem")).toHaveCount(1);
  const material = list.getByRole("button", { name: /^Detalhes de Material fictício V4 0/ });
  await expect(material).toContainText("Informado na REQ");
  await material.click();
  const panel = page.getByRole("dialog", { name: "Material fictício V4 0", exact: true });
  await expect(panel.getByRole("heading", { name: "Estoque atual", exact: true })).toBeVisible();
  await expect(panel.getByText("Equipe · disponível", { exact: true })).toBeVisible();
  await expect(panel.getByText("Estoque informado nas requisições", { exact: true })).toBeVisible();
  await info.attach("painel-estoque", { body: await panel.screenshot({ animations: "disabled" }), contentType: "image/png" });
  const tabs = panel.getByRole("tablist", { name: "Consulta do material", exact: true });
  const footerAction = panel.getByRole("button", { name: "Voltar à ficha", exact: true });
  const tabsBefore = await tabs.boundingBox();
  const footerBefore = await footerAction.boundingBox();
  const scroll = panel.getByRole("region", { name: "Conteúdo de Material fictício V4 0", exact: true });
  await scroll.evaluate(element => { element.scrollTop = element.scrollHeight; });
  await expect.poll(() => scroll.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  expect(await tabs.boundingBox()).toEqual(tabsBefore);
  expect(await footerAction.boundingBox()).toEqual(footerBefore);
  await panel.getByRole("tab", { name: "Histórico", exact: true }).click();
  await expect(panel.getByRole("heading", { name: "Movimentações e decisões", exact: true })).toBeVisible();
  await expect(panel.getByRole("button", { name: f.ent.code, exact: true }).first()).toBeVisible();
  await panel.getByRole("tab", { name: "Fichas", exact: true }).click();
  const link = panel.getByRole("button", { name: new RegExp(f.ent.code) });
  await link.click();
  const preview = page.getByRole("dialog", { name: f.ent.code, exact: true });
  await expect(preview).toContainText("Material fictício V4 0");
  await preview.getByRole("link", { name: "Abrir " + f.ent.code, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/fichas/${f.ent.id}`));
  await expect(page.getByRole("tab", { name: "Visão geral", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Voltar ao painel", exact: true }).click();
  await expect(preview).toBeVisible();
  await preview.getByRole("button", { name: "Voltar ao material", exact: true }).click();
  await expect(panel.getByRole("tab", { name: "Fichas", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(link).toBeFocused();
  await panel.getByRole("button", { name: "Voltar à ficha", exact: true }).click();
  await expect(search).toHaveValue("V4 0");
  await expect(material).toBeFocused();
  await page.goto(`/fichas/${f.ent.id}`);
  await expect(page.getByRole("tab", { name: "Visão geral", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Voltar ao painel", exact: true })).toHaveCount(0);
  expect(physicalState(f)).toBe(before);
});

test("material history shows a correction and a separate arrival, then returns to the exact entry", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 700 });
  const f = await purchaseBalanceFixture();
  const line = f.document.lines.find((item: { product_id: string }) => item.product_id === f.products[0]);
  const pending = await purchaseBalanceCommand(f.family, f.document, "receive", {
    lines: [{ lineId: line.id, quantity: "4", expectedQuantity: "6", remainingAction: "wait" }],
  });
  const reason = "Confira as unidades de cada embalagem.";
  const correction = await purchaseBalanceCommand(f.admin, pending, "request_receipt_correction", {
    receiptId: pending.receipts[0].id, reason,
  });
  const { result: arrival } = await rpc(f.family, "unlinked_arrival_command", {
    p_patient: f.patient, p_key: randomUUID(), p_body: { origin: "gift", lines: [{ productId: line.product_id, quantity: "2" }] },
  });
  const before = purchaseBalanceFacts(f);
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.family.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await selectContext(page, f.patient);
  await page.goto(`/fichas/${f.document.id}`);
  await selectDocumentSection(page, "materials");
  await page.getByRole("button", { name: "Detalhes de Material fictício V4 0", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "Material fictício V4 0", exact: true });
  const history = panel.getByRole("tab", { name: "Histórico", exact: true });
  await history.click();
  const correctionEntry = panel.getByRole("listitem").filter({ hasText: reason });
  await expect(correctionEntry).toContainText("Correção solicitada");
  await expect(correctionEntry).toContainText("4 unidade");
  await expect(correctionEntry).toContainText(correction.receipts[0].corrections[0].requesterName);
  const arrivalEntry = panel.getByRole("listitem").filter({ hasText: "Chegada avulsa informada" });
  const arrivalLink = arrivalEntry.getByRole("link", { name: arrival.code, exact: true });
  await expect(arrivalLink).toBeVisible();
  await info.attach("historico-do-material", { body: await panel.screenshot({ animations: "disabled" }), contentType: "image/png" });
  await arrivalLink.click();
  const arrivalDetails = page.getByRole("dialog", { name: "Detalhes da chegada", exact: true });
  await expect(arrivalDetails).toContainText(arrival.code);
  await expect(arrivalDetails).toContainText("Recebidas: 2 unidade");
  await arrivalDetails.getByRole("button", { name: "Voltar ao painel", exact: true }).click();
  await expect(history).toHaveAttribute("aria-selected", "true");
  await expect(arrivalLink).toBeFocused();
  expect(purchaseBalanceFacts(f)).toBe(before);
});
