import { openOperationalDocumentAction } from "./document-sections";
import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { setup, issue, rpc, fixtures } from "../integration/v4-fixtures.mjs";
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

test("COM aprovação, aquisição e chegada são atos separados sem rascunhos e cada resposta perdida é conferida uma vez", async ({ page }, info) => {
 const f = await setup(), family = await shiftWorker(f.patient, "family"), approver = await shiftWorker(f.patient, "admin");
 const writes = noPrivateWrites(page);
 const req = await issue(f.patient, [f.products[0]]);
 let doc = await rpc(family.client, "create_supply_document", {
  p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_draft: false,
  p_payload: {
   origin: "purchase", lines: f.products.map(productId => ({
    productId, quantity: "3",
    ...(productId === f.products[0] ? { requisitionItemIds: [req.lines[0].id] } : {}),
   })),
   sources: [{ documentId: req.id, general: false, productIds: [f.products[0]] }],
  },
 });
 const approvedLine = doc.lines.find((line: { product_id: string }) => line.product_id === f.products[0]);
 const excludedLine = doc.lines.find((line: { product_id: string }) => line.product_id === f.products[1]);
 const stock = () => sql(`select count(*) from public.stock_movements where care_recipient_id=${q(f.patient)}`);
 const initialStock = stock();
 await loginDecision(page, approver.email, f.patient);
 for (const label of ["Aprovar itens", "Registrar compra realizada", "Registrar chegada"]) {
  await page.goto("/fichas/" + doc.id); await selectDocumentSection(page, "workflow"); if (label === "Aprovar itens") await page.getByRole("button", { name: label, exact: true }).click();
  else await openOperationalDocumentAction(page, label);
  const isApproval = label === "Aprovar itens";
  if (isApproval) {
   const editor = page.getByRole("dialog", { name: "Autorizar a compra", exact: true });
   const confirm = editor.getByRole("button", { name: "Autorizar selecionados", exact: true });
   const selection = (name: string) => editor.getByRole("switch", { name: `Autorizar · ${name}`, exact: true });
   const qty = (line: typeof approvedLine) => editor.getByRole("textbox", { name: `${line.name_snapshot} · ${line.unit_snapshot}`, exact: true });
   if (info.project.use.hasTouch) {
    for (const width of [360, 412]) {
     await page.setViewportSize({ width, height: 844 });
     await expect(confirm).toBeInViewport();
     await info.attach(`E05-06-${width}`, { body: await page.screenshot({ animations: "disabled", scale: "css" }), contentType: "image/png" });
    }
   }
   await expect(qty(approvedLine)).toHaveValue("3");
   await editor.getByRole("button", { name: `Opções de ${approvedLine.name_snapshot}`, exact: true }).click();
   await page.getByRole("menuitem", { name: "Detalhes do material", exact: true }).click();
   const details = page.getByRole("dialog", { name: "Detalhes do material", exact: true });
   await expect(details.getByRole("heading", { name: approvedLine.name_snapshot, exact: true })).toBeVisible();
   await details.getByRole("button", { name: "Fechar diálogo", exact: true }).click();
   const origin = doc.originDocuments[0].code;
   await editor.getByRole("button", { name: origin, exact: true }).click();
   const reference = page.getByRole("dialog", { name: origin, exact: true });
   await reference.getByRole("button", { name: "Voltar à origem", exact: true }).click();
   await qty(approvedLine).fill("2");
   await selection(excludedLine.name_snapshot).uncheck();
   await expect(qty(excludedLine)).toBeHidden();
   await selection(approvedLine.name_snapshot).uncheck();
   await expect(editor.getByRole("button", { name: "Recusar todos", exact: true })).toBeVisible();
   await selection(approvedLine.name_snapshot).check();
   await expect(qty(approvedLine)).toHaveValue("2");
   await confirm.click();
   await expect(editor.getByText(`Informe o motivo do ajuste de ${approvedLine.name_snapshot}.`, { exact: true })).toBeVisible();
   await editor.getByRole("textbox", { name: `Motivo do ajuste · ${approvedLine.name_snapshot}`, exact: true }).fill("Quantidade conferida pela família.");
   await confirm.click();
   await expect(editor.getByText("Informe o motivo da recusa dos materiais desmarcados.", { exact: true })).toBeVisible();
   await editor.getByRole("textbox", { name: "Motivo dos materiais desmarcados", exact: true }).fill("Material indisponível para esta compra.");
  } else await page.locator(`input[name="${approvedLine.id}"]`).fill("1");
  await expect(page.getByRole("button", { name: "Salvar preenchimento privado", exact: true })).toHaveCount(0);
  const isPurchase = label === "Registrar compra realizada";
  const isArrival = label === "Registrar chegada";
  await audit(page, "COM ato sem rascunho");
  await confirmedOutcome(page, doc.id, isPurchase ? "Confirmar compra" : isArrival ? "Confirmar entrada" : "Autorizar selecionados");
  if (isApproval) {
   const result = page.getByRole("dialog", { name: "Compra autorizada", exact: true });
   await expect(result.getByText(approvedLine.name_snapshot, { exact: true })).toBeVisible();
   await expect(result.getByText(`2 ${approvedLine.unit_snapshot}`, { exact: true })).toBeVisible();
   await expect(result.getByText(excludedLine.name_snapshot, { exact: true })).toHaveCount(0);
   await result.getByRole("button", { name: "Concluir", exact: true }).click();
   const confirmed = await rpc(f.admin, "operational_document", { p_id: doc.id });
   expect(confirmed.lines.map((line: typeof approvedLine) => [line.id, Number(line.quantity), Number(line.approved_quantity), Number(line.purchased_quantity), Number(line.accepted_quantity)]))
    .toEqual(expect.arrayContaining([[approvedLine.id, 3, 2, 0, 0], [excludedLine.id, 3, 0, 0, 0]]));
   expect(confirmed.events.filter((event: { action: string }) => event.action === "com.approve")).toMatchObject([{ actorId: approver.id }]);
   expect(stock()).toBe(initialStock);
  }
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
 expect(sql(`select purchased_quantity=1 from public.document_lines where id=${q(approvedLine.id)}`)).toBe("t");
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
  await expect(result.getByText("Estoque familiar", { exact: true })).toHaveCount(0);
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

test("E05-20 a compra mista mostra o saldo da parcela creditada e a previsão da loja", async ({ page }, info) => {
  const f = await setup();
  const buyer = await shiftWorker(f.patient, "admin");
  const doc = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_draft: false,
    p_payload: { origin: "purchase", lines: f.products.map(productId => ({ productId, quantity: "10" })) },
  });
  const [inHand, online] = doc.lines;
  const stock = (productId: string) => Number(sql(`select private.stock_quantity(${q(f.patient)},${q(productId)},'FAMILY')`));
  const before = stock(inHand.product_id), onlineBefore = stock(online.product_id);
  expect(before).toBeGreaterThan(0);
  await loginDecision(page, buyer.email, f.patient);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/fichas/" + doc.id);
  await selectDocumentSection(page, "materials");
  await openOperationalDocumentAction(page, "Registrar compra realizada");
  const form = page.getByRole("dialog", { name: "Registrar compra", exact: true });
  await form.getByRole("textbox", { name: inHand.name_snapshot + " · " + inHand.unit_snapshot, exact: true }).fill("3");
  await form.getByRole("textbox", { name: online.name_snapshot + " · " + online.unit_snapshot, exact: true }).fill("4");
  await form.getByRole("switch", { name: "Já está em mãos · " + inHand.name_snapshot, exact: true }).check();
  await form.getByLabel("Previsão da loja · " + online.name_snapshot, { exact: true }).fill("2027-01-19");
  await confirmedOutcome(page, doc.id, "Confirmar compra");

  const result = page.getByRole("dialog", { name: "Compra registrada", exact: true });
  const received = result.getByRole("listitem").filter({ hasText: inHand.name_snapshot });
  const future = result.getByRole("listitem").filter({ hasText: online.name_snapshot });
  await expect(received).toContainText("Chegada validada e incorporada ao estoque familiar");
  await expect(future).toContainText("Previsão da loja 19/01/2027 · Estoque sem alteração");
  await expect(future.getByText("Estoque familiar", { exact: true })).toHaveCount(0);
  await received.getByText("Estoque familiar", { exact: true }).click();
  for (const [label, amount] of [["Antes da entrada", before], ["Entrada confirmada", 3], ["Depois da entrada", before + 3]] as const) {
    const fact = received.getByText(label, { exact: true }).locator("..");
    await expect(fact.locator("dd")).toHaveText(`${amount} ${inHand.unit_snapshot}`);
  }
  if (info.project.use.hasTouch) await info.attach("E05-20 saldo da parcela", {
    body: await result.screenshot({ animations: "disabled", scale: "css" }), contentType: "image/png",
  });
  const persisted = await rpc(f.admin, "operational_document", { p_id: doc.id });
  expect(persisted.receipts).toMatchObject([{ state: "approved", lines: [{ lineId: inHand.id, quantity: "3" }] }]);
  expect(persisted.purchaseEntryBalances).toContainEqual(expect.objectContaining({ lineId: inHand.id, state: "known", entry: expect.objectContaining({ receiptId: persisted.receipts[0].id }) }));
  expect(stock(inHand.product_id)).toBe(before + 3);
  expect(stock(online.product_id)).toBe(onlineBefore);

  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled)
    values(${q(f.patient)},${q(buyer.id)},'stock.family.read',false)`);
  await page.evaluate(() => window.dispatchEvent(new Event("hca:profile-updated")));
  await expect(received.getByText("Acesso ao estoque familiar restrito.", { exact: true })).toBeVisible();
  await expect(received.getByText("Antes da entrada", { exact: true })).toHaveCount(0);
  await expect(received.getByText("Depois da entrada", { exact: true })).toHaveCount(0);
});
