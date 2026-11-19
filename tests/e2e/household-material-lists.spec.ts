import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { fixtures, rpc, setup } from "../integration/v4-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectDeliveryRecipient } from "./delivery-recipient";

const names = ["Material habitual fictício", "Material complementar fictício"];
const original = "Cuidados do dia a dia";
const updated = "Materiais do banho";

async function enterResidence(page: Page, patient: string, email: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  const selected = await page.request.post("/api/context", { data: { careRecipientId: patient } });
  expect(selected.ok(), await selected.text()).toBeTruthy();
}

async function listMethod(page: Page) {
  const button = page.getByRole("button", { name: /^Usar listas frequentes/ });
  await expect(button).toBeVisible({ timeout: 35_000 });
  await expect(page.locator(".hca-activity-overlay")).toHaveCount(0);
  return button;
}

async function showLists(page: Page) {
  const button = await listMethod(page);
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("button", { name: "Organizar listas da casa", exact: true })).toBeEnabled();
}

test("E04-04 organiza uma lista da casa e reutiliza materiais em REQ, COM e ENT", async ({ page }, info) => {
  test.setTimeout(180_000);
  const f = await setup({ catalogue: names.map(name => ({ name, category: "medicamentos", unit: "unidade", aliases: [] })) });
  const administrator = await shiftWorker(f.patient, "admin");
  await page.setViewportSize({ width: 390, height: 760 });
  await enterResidence(page, f.patient, administrator.email);
  await page.goto("/fichas/req");
  await showLists(page);
  await expect(page.getByText("A casa ainda não tem listas frequentes.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Organizar listas da casa", exact: true }).click();
  const manager = page.getByRole("dialog", { name: "Organizar listas", exact: true });
  await manager.getByRole("textbox", { name: /^Nome da nova lista/ }).fill(original);
  await manager.getByRole("button", { name: "Criar lista", exact: true }).click();

  const creator = page.getByRole("dialog", { name: "Materiais da nova lista", exact: true });
  await creator.getByRole("checkbox", { name: new RegExp(names[0]) }).check();
  const packets: unknown[] = [];
  const path = "**/api/catalog/material-lists";
  await page.route(path, async route => {
    if (route.request().method() !== "POST") return route.continue();
    packets.push(route.request().postDataJSON());
    if (packets.length !== 1) return route.continue();
    const result = await route.fetch();
    expect(result.ok(), await result.text()).toBeTruthy();
    await route.abort("failed");
  });
  await creator.getByRole("button", { name: "Criar lista", exact: true }).click();
  await creator.getByRole("button", { name: "Recuperar salvamento", exact: true }).click();
  await expect(manager.getByText("Lista criada na residência.", { exact: true })).toBeVisible();
  expect(packets).toHaveLength(2);
  expect(packets[1]).toEqual(packets[0]);
  expect(await rpc(f.admin, "household_material_lists", { p_patient: f.patient, p_kind: "REQ" })).toHaveLength(1);
  await page.unroute(path);

  await info.attach("E04-04-organizar-listas", { body: await page.screenshot({ animations: "disabled" }), contentType: "image/png" });
  await manager.getByRole("button", { name: "Editar " + original, exact: true }).click();
  const editor = page.getByRole("dialog", { name: "Editar lista", exact: true });
  await editor.getByRole("textbox", { name: /^Nome da lista/ }).fill(updated);
  await expect(editor.getByRole("checkbox", { name: new RegExp(names[0]) })).toBeChecked();
  await editor.getByRole("checkbox", { name: new RegExp(names[1]) }).check();
  await editor.getByRole("button", { name: "Salvar alterações", exact: true }).click();
  await expect(manager.getByText("Lista atualizada.", { exact: true })).toBeVisible();
  await manager.getByRole("button", { name: "Fechar", exact: true }).click();
  const selectedList = page.getByRole("checkbox", { name: new RegExp(updated) });
  await expect(selectedList).toBeChecked();
  await selectedList.scrollIntoViewIfNeeded();
  await info.attach("E04-04-lista-no-acordeao", { body: await page.screenshot({ animations: "disabled" }), contentType: "image/png" });
  await page.getByRole("button", { name: "Avançar", exact: true }).click();
  for (const name of names) await expect(page.getByRole("checkbox", { name: new RegExp(name) })).toBeChecked();
  for (const urgent of await page.getByRole("checkbox", { name: "Reposição urgente", exact: true }).all())
    await expect(urgent).not.toBeChecked();
  const overlapping = "Reserva da casa";
  await rpc(f.admin, "save_household_material_list", {
    p_patient: f.patient, p_kind: "COM", p_id: null, p_revision: null,
    p_name: overlapping, p_products: [f.products[0]], p_key: randomUUID(),
  });

  for (const kind of ["com", "ent"] as const) {
    await page.goto("/fichas/" + kind);
    await listMethod(page);
    if (kind === "com") await page.getByLabel("Forma de aquisição", { exact: false }).selectOption("purchase");
    else await selectDeliveryRecipient(page, "Teste professional", "Recebedor da entrega fictícia");
    await showLists(page);
    await page.getByRole("checkbox", { name: new RegExp(updated) }).check();
    if (kind === "com") await page.getByRole("checkbox", { name: new RegExp(overlapping) }).check();
    await page.getByRole("button", { name: "Avançar", exact: true }).click();
    for (const name of names)
      await expect(page.getByRole("textbox", { name: "Quantidade — " + name, exact: true })).toHaveValue("");
  }

  await page.goto("/transferencias");
  await page.getByRole("combobox", { name: /^Custódia de origem/ }).selectOption("FAMILY");
  await page.getByRole("button", { name: "Preparar declaração", exact: true }).click();
  await page.getByRole("combobox", { name: /^Recebedor físico designado/ }).selectOption(fixtures.professional.id);
  const manualSelection = page.getByRole("textbox", { name: "Justificativa da escolha do recebedor", exact: true });
  if (await manualSelection.isVisible()) await manualSelection.fill("Profissional escolhido para a conferência das listas.");
  await showLists(page);
  await page.getByRole("checkbox", { name: new RegExp(updated) }).check();
  await page.getByRole("button", { name: "Selecionar materiais", exact: true }).click();
  for (const name of names)
    await expect(page.getByRole("textbox", { name: "Quantidade de " + name, exact: true })).toHaveValue("");
});
