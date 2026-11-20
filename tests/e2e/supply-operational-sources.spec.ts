import { selectMaterialCategory } from "./material-category";
import { openOperationalDocumentAction, selectDocumentSection } from "./document-sections";
import { selectDeliveryRecipient } from "./delivery-recipient";
import { expect, test, type Page } from "@playwright/test";
import { fixtures, issue, rpc, setup } from "../integration/v4-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import {
  purchaseBalanceArrival, purchaseBalanceCommand, purchaseBalanceFixture,
} from "../integration/purchase-entry-balance-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { loginDecision } from "./l1-decision-policy";
import { audit } from "./accessibility-audit";

const next = (page: Page) => page.getByRole("button", { name: /^(Selecionar materiais|Continuar|Revisar ficha)$/ }).click();
const material = (page: Page) => page.getByRole("checkbox", { name: /^Material fictício V4 0/ });
const count = (page: Page) => page.getByLabel("Quantidade — Material fictício V4 0", { exact: true });

test("L2 COM recupera o mesmo extra do catálogo e emite uma única linha para ele", async ({ page }, info) => {
  test.setTimeout(150_000);
  const name = "Complemento fictício de higiene";
  const f = await setup({ catalogue: [
    { name: "Medicamento fictício da compra", category: "medicamentos", unit: "unidade", aliases: [] },
    { name, category: "higiene", unit: "unidade", aliases: ["Curativo auxiliar"] },
  ] });
  const admin = await shiftWorker(f.patient, "admin");
  await loginDecision(page, admin.email, f.patient);
  await page.setViewportSize({ width: 390, height: 760 });
  await page.goto("/fichas/com");
  const stages = page.getByRole("navigation", { name: "Etapas da COM", exact: true });
  await expect(stages.getByRole("button")).toHaveText([/Confirmação/, /Materiais/, /Extras/, /Observações/, /Revisão/]);
  await next(page);
  await expect(page.getByRole("button", { name: /^Medicamentos/, pressed: true })).toBeVisible();
  await page.getByRole("button", { name: "Item extra", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Adicionar item extra", exact: true });
  await picker.getByRole("textbox", { name: "Nome do material", exact: true }).fill("curativo auxiliar");
  await picker.getByRole("button", { name: `Usar item do catálogo: ${name} (unidade)`, exact: true }).click();
  await expect(picker).toHaveCount(0);
  await selectMaterialCategory(page);
  await expect(page.getByRole("checkbox", { name: name + " unidade", exact: true })).toHaveCount(0);
  await next(page);
  const extra = page.getByLabel("Quantidade — " + name, { exact: true });
  const saved = page.waitForResponse(response => response.request().method() === "POST" &&
    new URL(response.url()).pathname === "/api/drafts" &&
    response.request().postDataJSON().content?.form?.quantities?.[f.products[1]] === "2");
  await extra.fill("2");
  const receipt = await saved;
  expect(receipt.ok(), await receipt.text()).toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "Continuar rascunho", exact: true }).click();
  await expect(stages.getByRole("button", { name: "Extras", exact: true })).toHaveAttribute("aria-current", "step");
  await expect(extra).toHaveValue("2");
  await info.attach("E05-extra-restaurado", { body: await page.screenshot({ animations: "disabled" }), contentType: "image/png" });
  await next(page);
  const observation = "A caixa será entregue em dois volumes.";
  const addObservation = page.getByRole("button", { name: "Adicionar observação", exact: true });
  await addObservation.click();
  await page.getByLabel("Observação 1", { exact: true }).fill(observation);
  await addObservation.click();
  await next(page);
  await expect(page.getByLabel("Observação 2", { exact: true })).toBeFocused();
  await info.attach("E05-observacoes-numeradas", { body: await page.screenshot({ animations: "disabled" }), contentType: "image/png" });
  await page.getByRole("button", { name: "Remover observação 2", exact: true }).click();
  await next(page);
  const review = page.getByRole("region", { name: "Itens extras", exact: true });
  await expect(review.getByText(name, { exact: true })).toHaveCount(1);
  await expect(review.getByText("2 unidade", { exact: true })).toBeVisible();
  await expect(page.getByText(observation, { exact: true })).toBeVisible();
  const submission = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/documents");
  await page.getByRole("button", { name: "Emitir compra", exact: true }).click();
  const response = await submission;
  expect(response.ok(), await response.text()).toBe(true);
  const { data: document } = await response.json();
  expect(document.payload.observations).toEqual([observation]);
  expect(document.lines).toMatchObject([
    { product_id: f.products[1], quantity: expect.anything(), metadata: { catalogueExtra: "true" } },
  ]);
});

test("L2 COM emite o extra pendente e identifica o material na mesma ficha sem entrada de estoque", async ({ page }, info) => {
  test.setTimeout(150_000);
  const f = await setup(), admin = await shiftWorker(f.patient, "admin");
  const name = "Protetor de tecido reforçado fictício";
  const details = "Acabamento lavável para reposição de teste.";
  const stock = () => sql(`select jsonb_agg(to_jsonb(m) order by m.id) from public.stock_movements m where care_recipient_id=${q(f.patient)}`);
  const before = stock();
  await loginDecision(page, admin.email, f.patient);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/fichas/com");
  await next(page);
  await page.getByRole("button", { name: "Item extra", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Adicionar item extra", exact: true });
  await picker.getByRole("textbox", { name: "Nome do material", exact: true }).fill(name);
  await picker.getByRole("textbox", { name: "Quantidade", exact: true }).fill("2");
  await picker.getByRole("button", { name: "Adicionar material", exact: true }).click();
  const unit = picker.getByRole("combobox", { name: "Unidade de medida", exact: true });
  await expect(unit).toBeFocused();
  await unit.selectOption("unidade");
  await expect(unit).not.toHaveAttribute("aria-invalid", "true");
  await picker.getByRole("textbox", { name: "Detalhes para identificar", exact: true }).fill(details);
  await info.attach("E05-modal-extra-pendente", { body: await picker.screenshot({ animations: "disabled" }), contentType: "image/png" });
  await picker.getByRole("button", { name: "Adicionar material", exact: true }).click();
  await next(page);
  await expect(page.getByText(name, { exact: true })).toHaveCount(1);
  await expect(page.getByText("Cadastro pendente", { exact: true })).toBeVisible();
  const edit = page.getByRole("button", { name: "Editar " + name, exact: true });
  await edit.click();
  const editDialog = page.getByRole("dialog", { name: "Editar item extra", exact: true });
  await expect(editDialog.getByRole("textbox", { name: "Detalhes para identificar", exact: true })).toHaveValue(details);
  await editDialog.getByRole("button", { name: "Salvar alteração", exact: true }).click();
  await next(page);
  await next(page);
  const review = page.getByRole("region", { name: "Itens extras", exact: true });
  await expect(review.getByText(name, { exact: true })).toHaveCount(1);
  await expect(review.getByText("2 unidade · Cadastro pendente", { exact: true })).toBeVisible();
  const request = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/documents");
  await page.getByRole("button", { name: "Emitir compra", exact: true }).click();
  const response = await request;
  expect(response.ok(), await response.text()).toBe(true);
  const { data: document } = await response.json();
  expect(document.lines).toEqual([]);
  expect(document.payload.pendingExtras).toMatchObject([{ name, unit: "unidade", quantity: "2", details }]);
  expect(stock()).toBe(before);
  const issued = page.getByRole("dialog", { name: "Compra emitida", exact: true });
  const download = issued.getByRole("link", { name: "Baixar PDF", exact: true });
  await expect(download).toBeVisible();
  expect((await page.request.get((await download.getAttribute("href"))!)).status()).toBe(200);
  await issued.getByRole("button", { name: "Acompanhar ficha", exact: true }).click();
  await selectDocumentSection(page, "materials");
  const pending = page.getByRole("region", { name: "Materiais com cadastro pendente", exact: true });
  await expect(pending.getByText(name, { exact: true })).toBeVisible();
  const catalogued = await rpc(f.admin, "admin_upsert_recipient_product", {
    p_care_recipient_id: f.patient, p_product_id: null, p_name: name,
    p_category: "higiene", p_unit: "unidade", p_aliases: [], p_is_active: true,
  });
  await pending.getByRole("button", { name: "Identificar " + name, exact: true }).click();
  const identify = page.getByRole("dialog", { name: "Identificar material extra", exact: true });
  await identify.getByRole("combobox", { name: "Produto correspondente", exact: true }).fill(name);
  await page.getByRole("option", { name: name + " · unidade", exact: true }).click();
  const identified = page.waitForResponse(response => response.request().method() === "POST" &&
    new URL(response.url()).pathname === "/api/documents/" + document.id &&
    response.request().postDataJSON().action === "resolve_purchase_extra");
  await identify.getByRole("button", { name: "Confirmar identificação", exact: true }).click();
  const identifiedResponse = await identified;
  expect(identifiedResponse.ok(), await identifiedResponse.text()).toBe(true);
  expect((await identifiedResponse.json()).data.lines).toMatchObject([{ product_id: catalogued.product_id, name_snapshot: name }]);
  await expect(page.getByRole("button", { name: "Detalhes de " + name, exact: true })).toBeVisible();
  await expect(pending).toHaveCount(0);
  const current = await page.request.get("/api/documents/" + document.id);
  expect((await current.json()).data.lines).toMatchObject([{ product_id: catalogued.product_id, name_snapshot: name }]);
  expect(stock()).toBe(before);
});

test("L2 COM mantém o vínculo geral após desfazer importação e conserva a quantidade editada", async ({ page }, info) => {
  test.setTimeout(120_000);
  const f = await setup();
  const admin = await shiftWorker(f.patient, "admin");
  const req = await issue(f.patient, [f.products[0]]);
  const code = sql(`select code from public.operational_documents where id=${q(req.id)}`);
  await loginDecision(page, admin.email, f.patient);
  await page.goto(`/fichas/com?requisitionId=${req.id}`);
  const origin = page.getByRole("region", { name: "Fichas vinculadas", exact: true });
  await expect(page.getByLabel("Forma de aquisição", { exact: false })).toHaveCount(0);
  await expect(origin.getByRole("button", { name: code, exact: true })).toBeVisible();
  await expect(origin).toContainText("Materiais elegíveis trazidos");
  await expect(origin.getByRole("button", { name: "Alterar", exact: true })).toHaveCount(1);
  await next(page);
  await selectMaterialCategory(page);
  await expect(material(page)).toBeChecked();
  await expect(count(page)).toHaveValue("");
  await count(page).fill("3");
  await page.getByRole("button", { name: "Voltar", exact: true }).click();
  await origin.getByRole("button", { name: "Alterar", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Vincular fichas", exact: true });
  await dialog.getByRole("button", { name: "BAL", exact: true }).click();
  await expect(dialog.getByText("Nenhuma ficha disponível para este vínculo.")).toBeVisible();
  await dialog.getByRole("button", { name: "REQ", exact: true }).click();
  await expect(dialog.getByRole("checkbox", { name: "Vincular " + code, exact: true })).toBeChecked();
  const bring = dialog.getByRole("checkbox", { name: /Importar materiais/ });
  await expect(bring).toBeChecked();
  await audit(page, "L2 seletor de fichas de origem");
  await page.screenshot({ path: `output/playwright/l2-supply-origin-picker-${info.project.name}.png`, scale: "css" });
  await bring.uncheck();
  await dialog.getByRole("button", { name: "Aplicar vínculos" }).click();
  await expect(origin.getByRole("button", { name: code, exact: true })).toBeVisible();
  await expect(origin).toContainText("sem importar materiais");
  await next(page);
  await selectMaterialCategory(page);
  await expect(material(page)).toBeChecked();
  await expect(count(page)).toHaveValue("3");
  const menuTrigger = page.getByRole("button", { name: "Mais ações de Material fictício V4 0", exact: true });
  async function openMaterialOrigin() {
    await menuTrigger.click();
    await page.getByRole("menuitem", { name: "Vincular a uma ficha", exact: true }).click();
    return page.getByRole("dialog", { name: "Vincular este material", exact: true });
  }
  await material(page).uncheck();
  await expect(page.getByRole("button", { name: "Vincular a uma ficha", exact: true })).toHaveCount(0);
  const itemOrigin = await openMaterialOrigin();
  await itemOrigin.getByRole("checkbox", { name: "Vincular " + code, exact: true }).check();
  await expect(itemOrigin.getByRole("checkbox", { name: /Importar materiais/ })).toHaveCount(0);
  await itemOrigin.getByRole("button", { name: "Aplicar vínculos" }).click();
  await expect(menuTrigger).toBeFocused();
  await expect(material(page)).toBeChecked();
  await expect(material(page)).toHaveAccessibleName(/Vinculado à REQ/);
  await expect(count(page)).toHaveValue("");
  await count(page).fill("3");
  await expect(count(page)).toHaveValue("3");
  const removeItemOrigin = await openMaterialOrigin();
  await removeItemOrigin.getByRole("checkbox", { name: "Vincular " + code, exact: true }).uncheck();
  await removeItemOrigin.getByRole("button", { name: "Aplicar vínculos" }).click();
  await expect(material(page)).not.toHaveAccessibleName(/Vinculado à REQ/);
  for (let index = 0; index < 3; index++) await next(page);
  const pending = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/documents");
  await page.getByRole("button", { name: "Emitir compra", exact: true }).click();
  const response = await pending;
  expect(response.ok(), await response.text()).toBe(true);
  const result = (await response.json()).data;
  expect(result.payload.acquisitionMode).toBe("planned");
  expect(result.payload.origin).toBeUndefined();
  expect(result.originDocuments).toMatchObject([{ documentId: req.id, general: true, productIds: [] }]);
  expect(result.lines[0].requisitionItemIds).toEqual([]);
});

test("L2 Preparar entrega parte da COM e traz apenas a quantidade da chegada aprovada", async ({ page }, info) => {
  test.setTimeout(120_000);
  const f = await purchaseBalanceFixture();
  const admin = await shiftWorker(f.patient, "admin");
  const sourceLine = f.document.lines.find((line: { product_id: string }) => line.product_id === f.products[0]);
  const arrival = await purchaseBalanceArrival(f, f.document, [{ lineId: sourceLine.id, quantity: "5" }]);
  const com = await purchaseBalanceCommand(f.admin, arrival.document, "validate_receipt", { receiptId: arrival.receipt.id });
  await loginDecision(page, admin.email, f.patient);
  await page.goto("/documentos/" + com.id);
  await openOperationalDocumentAction(page, "Preparar entrega");
  const origin = page.getByRole("region", { name: "Fichas vinculadas", exact: true });
  await expect(origin.getByRole("button", { name: com.code, exact: true })).toBeVisible();
  await page.screenshot({ path: `output/playwright/l2-ent-from-com-${info.project.name}.png`, scale: "css" });
  await selectDeliveryRecipient(page, "Teste professional", "Destinatário indicado pela família para esta entrega.");
  await expect(page.getByText("Último rascunho salvo.", { exact: true })).toBeVisible();
  const draft = JSON.parse(sql(`select content from private.creation_drafts
    where care_recipient_id=${q(f.patient)} and kind='ENT' and purpose='create' and state='active'`));
  expect(draft.form.quantities).toEqual({ [f.products[0]]: "5" });
  expect(draft.sources).toEqual([{ documentId: com.id, general: true, productIds: [f.products[0]] }]);
  expect(draft.form.recipientId).toBe(fixtures.professional.id);
  await page.reload();
  await page.getByRole("button", { name: "Continuar rascunho", exact: true }).click();
  await expect(origin.getByRole("button", { name: com.code, exact: true })).toBeVisible();
  expect(sql(`select count(*) from public.operational_documents where care_recipient_id=${q(f.patient)} and type='ENT'`)).toBe("0");
});
