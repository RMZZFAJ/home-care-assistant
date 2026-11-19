import { selectMaterialCategory } from "./material-category";
import { openOperationalDocumentAction } from "./document-sections";
import { expect, test, type Page } from "@playwright/test";
import { fixtures, issue, setup } from "../integration/v4-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import {
  purchaseBalanceArrival, purchaseBalanceCommand, purchaseBalanceFixture,
} from "../integration/purchase-entry-balance-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { loginDecision } from "./l1-decision-policy";
import { audit } from "./accessibility-audit";

const next = (page: Page) => page.getByRole("button", { name: /^(Avançar|Revisar)$/ }).click();
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
  await page.getByLabel("Forma de aquisição", { exact: false }).selectOption("purchase");
  await next(page);
  await expect(page.getByRole("button", { name: /^Medicamentos/, pressed: true })).toBeVisible();
  await page.getByRole("button", { name: "Item extra", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Adicionar item extra", exact: true });
  await picker.getByRole("combobox", { name: "Material do catálogo", exact: true }).fill("curativo auxiliar");
  await page.getByRole("option", { name: name + " · unidade", exact: true }).click();
  await expect(picker).toHaveCount(0);
  await selectMaterialCategory(page);
  await expect(page.getByRole("checkbox", { name: name + " unidade", exact: true })).toHaveCount(0);
  await next(page);
  const extra = page.getByLabel("Quantidade — " + name, { exact: true });
  await extra.fill("2");
  const saved = page.waitForResponse(response => response.request().method() === "POST" &&
    new URL(response.url()).pathname === "/api/drafts" &&
    response.request().postDataJSON().content?.form?.quantities?.[f.products[1]] === "2");
  await page.getByRole("button", { name: "Salvar rascunho", exact: true }).click();
  const receipt = await saved;
  expect(receipt.ok(), await receipt.text()).toBe(true);
  await page.reload();
  await page.getByRole("button", { name: "Continuar rascunho", exact: true }).click();
  await expect(stages.getByRole("button", { name: "Extras", exact: true })).toHaveAttribute("aria-current", "step");
  await expect(extra).toHaveValue("2");
  await info.attach("E05-extra-restaurado", { body: await page.screenshot({ animations: "disabled" }), contentType: "image/png" });
  await next(page);
  await next(page);
  const review = page.getByRole("region", { name: "Itens extras", exact: true });
  await expect(review.getByText(name, { exact: true })).toHaveCount(1);
  await expect(review.getByText("2 unidade", { exact: true })).toBeVisible();
  const submission = page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/documents");
  await page.getByRole("button", { name: "Confirmar e concluir", exact: true }).click();
  const response = await submission;
  expect(response.ok(), await response.text()).toBe(true);
  expect((await response.json()).data.lines).toMatchObject([
    { product_id: f.products[1], quantity: expect.anything(), metadata: { catalogueExtra: "true" } },
  ]);
});

test("L2 COM mantém o vínculo geral após desfazer importação e conserva a quantidade editada", async ({ page }, info) => {
  const f = await setup();
  const req = await issue(f.patient, [f.products[0]]);
  const code = sql(`select code from public.operational_documents where id=${q(req.id)}`);
  await loginDecision(page, fixtures.adminA.email, f.patient);
  await page.goto(`/fichas/com?requisitionId=${req.id}`);
  const origin = page.getByRole("region", { name: "Fichas vinculadas", exact: true });
  await expect(origin.getByRole("button", { name: code, exact: true })).toBeVisible();
  await expect(origin).toContainText("Materiais elegíveis trazidos");
  await page.getByLabel("Forma de aquisição").selectOption("purchase");
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
  async function openMaterialOrigin() {
    await page.getByRole("button", { name: "Mais ações de Material fictício V4 0", exact: true }).click();
    await page.getByRole("menuitem", { name: "Vincular a uma ficha", exact: true }).click();
    return page.getByRole("dialog", { name: "Vincular este material", exact: true });
  }
  const itemOrigin = await openMaterialOrigin();
  await itemOrigin.getByRole("checkbox", { name: "Vincular " + code, exact: true }).check();
  await itemOrigin.getByRole("button", { name: "Aplicar vínculos" }).click();
  await expect(material(page)).toHaveAccessibleName(/Vinculado à REQ/);
  await expect(count(page)).toHaveValue("3");
  const removeItemOrigin = await openMaterialOrigin();
  await removeItemOrigin.getByRole("checkbox", { name: "Vincular " + code, exact: true }).uncheck();
  await removeItemOrigin.getByRole("button", { name: "Aplicar vínculos" }).click();
  await expect(material(page)).not.toHaveAccessibleName(/Vinculado à REQ/);
  for (let index = 0; index < 3; index++) await next(page);
  const pending = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/documents");
  await page.getByRole("button", { name: "Confirmar e concluir", exact: true }).click();
  const response = await pending;
  expect(response.ok(), await response.text()).toBe(true);
  const result = (await response.json()).data;
  expect(result.originDocuments).toMatchObject([{ documentId: req.id, general: true, productIds: [] }]);
  expect(result.lines[0].requisitionItemIds).toEqual([]);
});

test("L2 Preparar entrega parte da COM e traz apenas a quantidade da chegada aprovada", async ({ page }, info) => {
  const f = await purchaseBalanceFixture();
  const sourceLine = f.document.lines.find((line: { product_id: string }) => line.product_id === f.products[0]);
  const arrival = await purchaseBalanceArrival(f, f.document, [{ lineId: sourceLine.id, quantity: "5" }]);
  const com = await purchaseBalanceCommand(f.admin, arrival.document, "validate_receipt", { receiptId: arrival.receipt.id });
  await loginDecision(page, fixtures.adminA.email, f.patient);
  await page.goto("/documentos/" + com.id);
  await openOperationalDocumentAction(page, "Preparar entrega");
  const origin = page.getByRole("region", { name: "Fichas vinculadas", exact: true });
  await expect(origin.getByRole("button", { name: com.code, exact: true })).toBeVisible();
  await page.screenshot({ path: `output/playwright/l2-ent-from-com-${info.project.name}.png`, scale: "css" });
  await page.getByRole("button", { name: "Salvar rascunho", exact: true }).click();
  await expect(page.getByText("Último rascunho salvo.", { exact: true })).toBeVisible();
  const draft = JSON.parse(sql(`select content from private.creation_drafts
    where care_recipient_id=${q(f.patient)} and kind='ENT' and purpose='create' and state='active'`));
  expect(draft.form.quantities).toEqual({ [f.products[0]]: "5" });
  expect(draft.sources).toEqual([{ documentId: com.id, general: true, productIds: [f.products[0]] }]);
  await page.reload();
  await page.getByRole("button", { name: "Continuar rascunho", exact: true }).click();
  await expect(origin.getByRole("button", { name: com.code, exact: true })).toBeVisible();
  expect(sql(`select count(*) from public.operational_documents where care_recipient_id=${q(f.patient)} and type='ENT'`)).toBe("0");
});
