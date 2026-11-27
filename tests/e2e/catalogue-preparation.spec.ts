import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixtures, rpc, setup } from "../integration/v4-fixtures.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";
import { pressWorkspaceControl } from "./workspace-controls";

test("E10-07 organiza por tipo, compara duplicata e recupera cadastro sem retomar campos", async ({ page }, info) => {
  test.setTimeout(150_000);
  const { admin, patient, products } = await setup();
  const item = "Compressa para curativo " + randomUUID().slice(0, 8);
  const count = () => Number(sql(`select count(*) from public.care_recipient_products where care_recipient_id=${sqlLiteral(patient)};`));
  const drafts = () => Number(sql(`select count(*) from private.catalogue_preparations where patient_id=${sqlLiteral(patient)};`));
  const ledger = () => sql(`select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]') from public.stock_movements m where care_recipient_id=${sqlLiteral(patient)};`);
  const before = count(), stock = ledger();

  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.global.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
  await page.goto(`/admin?careRecipientId=${patient}&section=catalog`);
  const listing = page.getByRole("region", { name: "Produtos do catálogo", exact: true });
  const types = page.getByRole("group", { name: "Tipos de material" });
  await types.getByRole("button", { name: "Dieta", exact: true }).click();
  await expect(listing.getByRole("heading", { name: "Nenhum material encontrado" })).toBeVisible();
  await types.getByRole("button", { name: "Higiene", exact: true }).click();
  await expect(listing.getByRole("heading", { name: "Higiene" })).toBeVisible();
  const search = page.getByRole("searchbox", { name: "Pesquisar catálogo", exact: true });
  for (const width of [360, 412]) {
    await page.setViewportSize({ width, height: 840 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(width);
    await expect(search).toHaveCSS("padding-inline-start", "38px");
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const path = info.outputPath(`catalogo-${width}.png`);
    await page.screenshot({ path, scale: "css", animations: "disabled" });
    await info.attach(`catalogo-${width}`, { path, contentType: "image/png" });
  }
  await audit(page, "E10-07 catálogo por tipo");

  const opener = page.getByRole("button", { name: "Novo item", exact: true });
  const editor = page.getByRole("dialog", { name: "Novo material", exact: true });
  const name = editor.getByLabel("Nome do material", { exact: true });
  const description = editor.getByLabel("Descrição operacional", { exact: true });
  const review = editor.getByRole("button", { name: "Revisar material", exact: true });
  async function open() { await opener.click(); await expect(name).toBeVisible(); }

  await open();
  await name.fill("Rascunho descartado");
  await description.fill("Descrição em andamento");
  await editor.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.getByRole("dialog", { name: "Sair sem concluir?", exact: true }).getByRole("button", { name: "Sair e descartar", exact: true }).click();
  await expect(editor).toHaveCount(0);
  await open();
  await expect(name).toHaveValue("");
  await expect(description).toHaveValue("");
  expect(drafts()).toBe(0);

  await name.fill("Material fictício V4 0");
  await review.click();
  const comparison = page.getByRole("dialog", { name: "Este material já está no catálogo?", exact: true });
  await expect(comparison).toContainText("Material fictício V4 0");
  await expect(comparison).toContainText("unidade");
  for (const width of [360, 412]) {
    await page.setViewportSize({ width, height: 840 });
    await expect.poll(() => page.evaluate(() => innerWidth)).toBe(width);
    const path = info.outputPath(`duplicata-${width}.png`);
    await page.screenshot({ path, scale: "css", animations: "disabled" });
    await info.attach(`duplicata-${width}`, { path, contentType: "image/png" });
  }
  await comparison.getByRole("button", { name: "Usar este cadastro", exact: true }).click();
  const detail = page.getByRole("dialog", { name: "Material fictício V4 0", exact: true });
  await expect(detail).toContainText(products[0]);
  await detail.getByRole("button", { name: "Voltar", exact: true }).click();
  expect(count()).toBe(before);

  const attempts: { key: string; intent: unknown }[] = [];
  await page.route("**/api/admin/catalogue-actions", async route => {
    if (route.request().method() !== "POST") return route.continue();
    const packet = route.request().postDataJSON();
    attempts.push(packet);
    if (!packet.intent) return route.continue();
    expect((await route.fetch()).status()).toBe(200);
    await route.abort("failed");
  });
  await open();
  await name.fill(item);
  await review.click();
  await page.getByRole("dialog", { name: "Adicionar material?", exact: true })
    .getByRole("button", { name: "Adicionar material", exact: true }).click();
  const interrupted = page.getByRole("dialog", { name: "A resposta do catálogo não chegou", exact: true });
  await expect(interrupted.getByRole("button", { name: "Conferir resultado", exact: true })).toBeEnabled();
  expect(count()).toBe(before + 1);
  const retained = await page.evaluate(() => Object.keys(sessionStorage).filter(key => key.startsWith("hca:catalogue-action:")).map(key => JSON.parse(sessionStorage.getItem(key)!)));
  expect(retained).toHaveLength(1);
  expect(retained[0]).toEqual({ pointer: expect.objectContaining({ key: attempts[0].key }), lookups: 0 });
  expect(retained[0].pointer).not.toHaveProperty("intent");
  await page.reload();
  await expect(listing.getByText(item, { exact: true })).toBeVisible();
  await pressWorkspaceControl(page, page.getByRole("button", { name: "Conferir resultado pendente", exact: true }));
  await interrupted.getByRole("button", { name: "Conferir resultado", exact: true }).click();
  await page.getByRole("dialog", { name: "Material adicionado", exact: true }).getByRole("button", { name: "Concluir", exact: true }).click();
  await expect(listing.getByText(item, { exact: true })).toBeVisible();
  expect(attempts).toHaveLength(2);
  expect(attempts[1]).toEqual({ ...attempts[0], intent: null });
  expect(count()).toBe(before + 1);
  expect(ledger()).toBe(stock);
  expect(drafts()).toBe(0);

  await page.unrouteAll({ behavior: "wait" });
  await listing.getByRole("button", { name: /^Material fictício V4 0/ }).click();
  await detail.getByRole("button", { name: /^Editar cadastro/ }).click();
  const editing = page.getByRole("dialog", { name: "Editar material", exact: true });
  const note = editing.getByLabel("Descrição operacional", { exact: true });
  const localNote = "Edição preservada ao consultar a referência";
  await expect(note).toBeEditable();
  await note.fill(localNote);
  await expect(note).toHaveValue(localNote);
  await expect(editing.getByLabel("Unidade de controle", { exact: true })).toBeDisabled();
  await rpc(admin, "admin_upsert_recipient_product", {
    p_care_recipient_id: patient, p_product_id: products[0], p_name: "Material fictício V4 0",
    p_category: "higiene", p_unit: "unidade", p_aliases: [], p_is_active: true, p_description: "Descrição da outra sessão",
  });
  const reviewEdit = editing.getByRole("button", { name: "Revisar material", exact: true });
  const saveEdit = page.getByRole("dialog", { name: "Salvar cadastro?", exact: true }).getByRole("button", { name: "Salvar cadastro", exact: true });
  await reviewEdit.click(); await saveEdit.click();
  const rejected = page.getByRole("dialog", { name: "Não foi possível registrar no catálogo", exact: true });
  await rejected.getByRole("button", { name: "Conferir cadastro atual", exact: true }).click();
  await editing.getByRole("button", { name: "Conferir alteração", exact: true }).click();
  const current = page.getByRole("dialog", { name: "O cadastro foi atualizado", exact: true });
  await expect(current).toContainText("Descrição da outra sessão");
  await current.getByRole("button", { name: "Usar referência atual", exact: true }).click();
  await expect(note).toHaveValue(localNote);
  await reviewEdit.click(); await saveEdit.click();
  await page.getByRole("dialog", { name: "Cadastro atualizado", exact: true }).getByRole("button", { name: "Concluir", exact: true }).click();
  await expect(detail).toContainText(localNote);
  expect(ledger()).toBe(stock);
  expect(drafts()).toBe(0);
});
