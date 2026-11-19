import { openOperationalDocumentAction } from "./document-sections";
import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { setup, actor, rpc, fixtures } from "../integration/v4-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { loginDecision, noPrivateWrites, privateFormCount, confirmedOutcome } from "./l1-decision-policy";
import { selectDocumentSection } from "./document-sections";
import { audit } from "./accessibility-audit";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
test.setTimeout(150_000);
test("COM libera a compra do item identificado enquanto o extra aguarda cadastro", async ({ page }, info) => {
  const f = await setup();
  const buyer = await shiftWorker(f.patient, "family");
  const extra = { id: randomUUID(), name: "Forro térmico fictício", category: "higiene", unit: "unidade", quantity: "2" };
  const doc = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_draft: false,
    p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity: "2" }], pendingExtras: [extra] },
  });
  await loginDecision(page, buyer.email, f.patient);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/fichas/" + doc.id);
  await expect(page.getByRole("region", { name: "Próximo passo sugerido", exact: true }))
    .toContainText("Registrar a aquisição dos materiais");
  await selectDocumentSection(page, "materials");
  const pending = page.getByRole("region", { name: "Materiais com cadastro pendente", exact: true });
  await expect(pending.getByText(extra.name, { exact: true })).toBeVisible();
  await openOperationalDocumentAction(page, "Registrar compra realizada");
  const editor = page.getByRole("dialog", { name: "Registrar compra", exact: true });
  const line = doc.lines[0];
  await expect(editor.getByText(extra.name, { exact: true })).toHaveCount(0);
  await editor.getByRole("textbox", { name: line.name_snapshot + " · " + line.unit_snapshot, exact: true }).fill("2");
  await info.attach("E05-compra-com-extra-pendente", { body: await page.screenshot({ animations: "disabled" }), contentType: "image/png" });
  const submitted = page.waitForResponse(response => response.request().method() === "POST" &&
    new URL(response.url()).pathname === "/api/documents/" + doc.id + "/decisions");
  await editor.getByRole("button", { name: "Confirmar compra", exact: true }).click();
  const receipt = await submitted;
  expect(receipt.ok(), await receipt.text()).toBe(true);
  const saved = await rpc(f.admin, "operational_document", { p_id: doc.id });
  expect(saved.purchaseProgress.identificationPending).toBe(true);
  expect(saved.payload.pendingExtras).toEqual([extra]);
  expect(Number(saved.lines[0].purchased_quantity)).toBe(2);
});

test("COM aprovação, aquisição e chegada são atos separados sem rascunhos e cada resposta perdida é conferida uma vez", async ({ page }) => {
 const f = await setup(), family = await actor("family", f.patient), writes = noPrivateWrites(page);
 let doc = await rpc(family, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity: "2" }] }, p_key: randomUUID(), p_draft: false });
 await loginDecision(page, fixtures.adminA.email, f.patient);
 for (const label of ["Aprovar itens", "Registrar compra realizada", "Registrar chegada"]) {
  await page.goto("/fichas/" + doc.id); await selectDocumentSection(page, "workflow"); if (label === "Aprovar itens") await page.getByRole("button", { name: label, exact: true }).click();
  else await openOperationalDocumentAction(page, label);
  await page.locator(`input[name="${doc.lines[0].id}"]`).fill(label === "Aprovar itens" ? "2" : "1");
  await expect(page.getByRole("button", { name: "Salvar preenchimento privado", exact: true })).toHaveCount(0);
  const isPurchase = label === "Registrar compra realizada";
  const isArrival = label === "Registrar chegada";
  if (!isPurchase && !isArrival) await page.getByRole("button", { name: "Revisar operação", exact: true }).click();
  await audit(page, "COM ato sem rascunho");
  await confirmedOutcome(page, doc.id, isPurchase ? "Confirmar compra" : isArrival ? "Confirmar entrada" : "Confirmar operação");
  if (isPurchase) {
   const result = page.getByRole("dialog", { name: "Compra registrada", exact: true });
   await expect(result.getByText("Aguardando entrega da loja", { exact: true })).toBeVisible();
   await result.getByRole("button", { name: "Concluir", exact: true }).click();
  }
  if (isArrival) await page.getByRole("dialog", { name: "Entrada confirmada", exact: true })
   .getByRole("button", { name: "Concluir", exact: true }).click();
  await page.unroute(`**/api/documents/${doc.id}/decisions`);
  doc = await rpc(f.admin, "operational_document", { p_id: doc.id });
 }
 expect(privateFormCount(f.patient)).toBe("0"); expect(writes).toEqual([]);
 expect(sql(`select purchased_quantity=1 from public.document_lines where id=${q(doc.lines[0].id)}`)).toBe("t");
});

test("COM compra mista da família preserva a previsão e recupera uma chegada pendente", async ({ page }, info) => {
  const f = await setup(), writes = noPrivateWrites(page);
  const doc = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_draft: false,
    p_payload: { origin: "purchase", lines: f.products.map(productId => ({ productId, quantity: "10" })) },
  });
  const [inHand, online] = doc.lines;
  await loginDecision(page, fixtures.family.email, f.patient);
  await page.goto("/fichas/" + doc.id);
  await selectDocumentSection(page, "workflow");
  await openOperationalDocumentAction(page, "Registrar compra realizada");
  const editor = page.getByRole("dialog", { name: "Registrar compra", exact: true });
  const qty = (line: typeof inHand) => editor.getByRole("textbox", { name: line.name_snapshot + " · " + line.unit_snapshot, exact: true });
  const timing = (line: typeof inHand) => editor.getByRole("switch", { name: "Já está em mãos · " + line.name_snapshot, exact: true });
  const date = (line: typeof inHand) => editor.getByLabel("Previsão da loja · " + line.name_snapshot, { exact: true });
  await qty(inHand).fill("3");
  await qty(online).fill("4");
  await timing(inHand).press("Space");
  await expect(timing(inHand)).toBeChecked();
  await expect(timing(online)).not.toBeChecked();
  await expect(date(inHand)).toBeHidden();
  await date(online).fill("2027-01-19");
  await expect(editor.getByText("A chegada aguarda aprovação do administrador.", { exact: true })).toBeVisible();
  await editor.getByRole("button", { name: "Opções de " + inHand.name_snapshot, exact: true }).click();
  await page.getByRole("menuitem", { name: "Detalhes do material", exact: true }).click();
  const material = page.getByRole("dialog", { name: "Detalhes do material", exact: true });
  await expect(material.getByRole("heading", { name: inHand.name_snapshot, exact: true })).toBeVisible();
  await material.getByRole("button", { name: "Fechar diálogo", exact: true }).click();
  await expect(qty(inHand)).toHaveValue("3");
  await expect(date(online)).toHaveValue("2027-01-19");
  await audit(page, "COM compra mista");
  if (info.project.use.hasTouch) {
    const path = info.outputPath("compra-mista-edicao.png");
    await page.screenshot({ path, animations: "disabled", scale: "css" });
    await info.attach("Compra mista — edição", { path, contentType: "image/png" });
  }

  await confirmedOutcome(page, doc.id, "Confirmar compra");
  const result = page.getByRole("dialog", { name: "Compra registrada", exact: true });
  await expect(result.getByText("Previsão da loja 19/01/2027", { exact: true })).toBeVisible();
  await expect(result.getByText("Chegada aguardando aprovação do administrador", { exact: true })).toBeVisible();
  await audit(page, "COM resultado da compra mista");
  if (info.project.use.hasTouch) {
    const path = info.outputPath("compra-mista-resultado.png");
    await page.screenshot({ path, animations: "disabled", scale: "css" });
    await info.attach("Compra mista — resultado", { path, contentType: "image/png" });
  }
  await result.getByRole("button", { name: "Concluir", exact: true }).click();
  await expect(result).toHaveCount(0);
  const persisted = await rpc(f.admin, "operational_document", { p_id: doc.id });
  expect(persisted.receipts.map((receipt: { state: string; lines: unknown[]; }) => [receipt.state, receipt.lines]))
    .toEqual([["pending", [{ lineId: inHand.id, quantity: "3" }]]]);
  expect(persisted.purchaseSchedule).toEqual([expect.objectContaining({ lineId: online.id, expectedDate: "2027-01-19" })]);
  await page.reload();
  await selectDocumentSection(page, "workflow");
  await page.getByText("Previsões informadas pela loja", { exact: true }).click();
  await expect(page.getByText(/^Previsão 19\/01\/2027/)).toBeVisible();
  expect(writes).toEqual([]);
});
