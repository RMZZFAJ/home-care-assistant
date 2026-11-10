import { test, expect, type Locator } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { setup, fixtures } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";

test.setTimeout(120_000);

async function keyboard(button: Locator) {
  await button.focus();
  await expect(button).toBeFocused();
  await button.press("Enter");
}

for (const width of [390, 1440]) test(`RecordDrawer ${width}: continuar, descartar, Escape e salvar conservam foco e intenção`, async ({ page }) => {
  const f = await setup();
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.global.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, f.patient);
  await page.goto(`/admin?careRecipientId=${f.patient}&section=catalog`);
  const opener = page.getByRole("button", { name: "Novo item", exact: true });
  const drawer = page.getByRole("dialog", { name: "Adicionar item exclusivo deste paciente", exact: true });
  const name = drawer.getByLabel("Nome", { exact: true });
  const count = () => sql(`select count(*) from public.care_recipient_products where care_recipient_id=${sqlLiteral(f.patient)};`);
  const before = count(), value = "Material teclado " + randomUUID().slice(0, 8);
  await keyboard(opener);
  await name.fill(value);
  await page.keyboard.press("Escape");
  const warning = drawer.getByRole("alert");
  await expect(warning).toContainText("Há alterações ainda não salvas");
  await keyboard(warning.getByRole("button", { name: "Continuar editando", exact: true }));
  await expect(name).toBeFocused();
  await expect(name).toHaveValue(value);
  expect(count()).toBe(before);
  await expect(warning).toHaveCount(0);
  await page.keyboard.press("Escape");
  const continueEditing = warning.getByRole("button", { name: "Continuar editando", exact: true });
  await expect(continueEditing).toBeVisible();
  await continueEditing.focus();
  await expect(continueEditing).toBeFocused();
  // Controlled UI change: the former control becomes unavailable while the
  // warning is open. Returning must choose visible editable content.
  await name.evaluate(element => { element.setAttribute("hidden", ""); });
  // A focus trap can recover to the fieldset after its active input disappears.
  // That container must not displace the first available editable control.
  const form = drawer.locator("fieldset").first();
  await form.focus();
  await expect(form).toBeFocused();
  await keyboard(continueEditing);
  await expect(drawer.getByRole("combobox", { name: "Categoria", exact: true })).toBeFocused();
  await name.evaluate(element => { element.removeAttribute("hidden"); });
  await expect(name).toHaveValue(value);
  await keyboard(drawer.getByRole("button", { name: "Fechar edição", exact: true }));
  await keyboard(warning.getByRole("button", { name: "Descartar alterações", exact: true }));
  await expect(drawer).toHaveCount(0);
  await expect(opener).toBeFocused();
  expect(count()).toBe(before);
  await keyboard(opener);
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(opener).toBeFocused();
  await keyboard(opener);
  await name.fill(value);
  await drawer.getByRole("combobox", { name: "Categoria", exact: true }).selectOption("higiene");
  await drawer.getByLabel("Unidade", { exact: true }).fill("pacote");
  await page.keyboard.press("Escape");
  await expect(warning).toBeVisible();
  let release!: () => void, started!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  const received = new Promise<void>(resolve => { started = resolve; });
  await page.route("**/api/admin", async route => {
    if (route.request().method() === "POST" && route.request().postDataJSON().action === "product") {
      started(); await pending;
    }
    await route.continue();
  });
  const saved = page.waitForResponse(r => new URL(r.url()).pathname === "/api/admin" && r.request().method() === "POST" && r.request().postDataJSON().action === "product");
  try {
    await keyboard(drawer.getByRole("button", { name: "Salvar item", exact: true }));
    await received;
    await expect(drawer.getByRole("button", { name: "Fechar edição", exact: true })).toBeDisabled();
    await expect(warning.getByRole("button", { name: "Descartar alterações", exact: true })).toBeDisabled();
    await expect(warning.getByRole("button", { name: "Continuar editando", exact: true })).toBeDisabled();
    expect(count()).toBe(before);
  } finally { release(); }
  expect((await saved).status()).toBe(200);
  await expect(drawer).toHaveCount(0);
  // Confirmation closes the editor before the outer busy fieldset is enabled.
  // Its stable contextual heading is the explicit destination for that gap.
  const heading = page.getByRole("heading", { name: "Catálogo do paciente", exact: true });
  await expect.poll(async () => (await opener.evaluate(element => element === document.activeElement)) || (await heading.evaluate(element => element === document.activeElement)), { message: "Saved catalogue returns to its enabled opener or its explicit contextual heading" }).toBe(true);
  expect(Number(count())).toBe(Number(before) + 1);
  await expect(page.getByRole("cell", { name: value, exact: true })).toBeVisible();
});
