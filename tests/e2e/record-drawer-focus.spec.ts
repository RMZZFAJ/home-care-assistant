import { test, expect, type Locator, type Route } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { setup, fixtures } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";

test.setTimeout(120_000);

async function keyboard(button: Locator) {
  await expect(button).toBeEnabled();
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
  const drawer = page.getByRole("dialog", { name: "Novo material", exact: true });
  const name = drawer.getByLabel("Nome do material", { exact: true });
  const count = () => sql(`select count(*) from public.care_recipient_products where care_recipient_id=${sqlLiteral(f.patient)};`);
  const before = count(), value = "Material teclado " + randomUUID().slice(0, 8);
  await expect(opener).toBeEnabled();
  await opener.focus();
  await expect(opener).toBeFocused();
  let releaseRead!: () => void, readStarted!: () => void;
  const heldRead = new Promise<void>(resolve => { releaseRead = resolve; });
  const receivedRead = new Promise<void>(resolve => { readStarted = resolve; });
  const holdCatalogue = async (route: Route) => {
    const url = new URL(route.request().url());
    if (route.request().method() === "GET" && url.searchParams.get("section") === "catalog" && url.searchParams.get("careRecipientId") === f.patient) {
      readStarted();
      await heldRead;
    }
    await route.continue();
  };
  await page.route("**/api/admin?**", holdCatalogue);
  try {
    // This is the same invalidation sent by the live synchronization channel.
    // A retained read must block commands without dropping keyboard focus.
    await page.evaluate(() => window.dispatchEvent(new Event("hca:data-changed")));
    await receivedRead;
    await expect(opener).toBeDisabled();
    await expect(opener).toBeFocused();
    expect(await opener.evaluate(element => (element as HTMLButtonElement).disabled)).toBe(false);
    await page.keyboard.press("Enter");
    await opener.evaluate(element => (element as HTMLButtonElement).click());
    await expect(drawer).toHaveCount(0);
    expect(count()).toBe(before);
  } finally {
    releaseRead();
    await page.unrouteAll({ behavior: "wait" });
  }
  await expect(opener).toBeEnabled();
  await expect(opener).toBeFocused();
  const referenceRoute = "**/api/admin/catalogue-actions?**purpose=create**";
  let releaseReference!: () => void;
  const referenceGate = new Promise<void>(resolve => { releaseReference = resolve; });
  await page.route(referenceRoute, async route => {
    await referenceGate;
    await route.continue();
  });
  const focusReturns = await opener.evaluateHandle(node => {
    const button = node as HTMLButtonElement;
    const originalFocus = button.focus;
    let calls = 0;
    button.focus = function (options) {
      calls++;
      return originalFocus.call(this, options);
    };
    return {
      count: () => calls,
      restore: () => { button.focus = originalFocus; },
    };
  });
  try {
    await keyboard(opener);
    await expect(drawer.getByText("Consultando o catálogo…", { exact: true })).toBeVisible();
    const openings = await focusReturns.evaluate(probe => probe.count());
    releaseReference();
    await expect(name).toBeEditable();
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    expect(await focusReturns.evaluate(probe => probe.count()), "Opening the editor must not return focus to its trigger").toBe(openings);
  } finally {
    releaseReference();
    await page.unroute(referenceRoute);
    await focusReturns.evaluate(probe => probe.restore());
    await focusReturns.dispose();
  }
  await name.fill(value);
  await page.keyboard.press("Escape");
  const warning = page.getByRole("dialog", { name: "Sair sem concluir?", exact: true });
  await expect(warning).toContainText("O preenchimento desta ação será descartado");
  await keyboard(warning.getByRole("button", { name: "Voltar ao preenchimento", exact: true }));
  await expect(name).toBeFocused();
  await expect(name).toHaveValue(value);
  expect(count()).toBe(before);
  await expect(warning).toHaveCount(0);
  await page.keyboard.press("Escape");
  const continueEditing = warning.getByRole("button", { name: "Voltar ao preenchimento", exact: true });
  await expect(continueEditing).toBeVisible();
  await continueEditing.focus();
  await expect(continueEditing).toBeFocused();
  // Controlled UI change: the former control becomes unavailable while the
  // warning is open. Returning must choose visible editable content.
  const nameBehindDialog = page.getByRole("dialog", { name: "Novo material", exact: true, includeHidden: true }).getByLabel("Nome do material", { exact: true });
  await nameBehindDialog.evaluate(element => { element.setAttribute("hidden", ""); });
  await keyboard(continueEditing);
  await expect(drawer.getByRole("combobox", { name: "Tipo de material", exact: true })).toBeFocused();
  await name.evaluate(element => { element.removeAttribute("hidden"); });
  await expect(name).toHaveValue(value);
  await keyboard(drawer.getByRole("button", { name: "Fechar edição", exact: true }));
  await keyboard(warning.getByRole("button", { name: "Sair e descartar", exact: true }));
  await expect(drawer).toHaveCount(0);
  await expect(opener).toBeFocused();
  expect(count()).toBe(before);
  await keyboard(opener);
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  await expect(opener).toBeFocused();
  await keyboard(opener);
  await name.fill(value);
  await drawer.getByRole("combobox", { name: "Tipo de material", exact: true }).selectOption("higiene");
  await drawer.getByLabel("Unidade de controle", { exact: true }).selectOption("pacote");
  let release!: () => void, started!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  const received = new Promise<void>(resolve => { started = resolve; });
  await page.route("**/api/admin/catalogue-actions", async route => {
    if (route.request().method() === "POST" && route.request().postDataJSON().purpose === "create") {
      started(); await pending;
    }
    await route.continue();
  });
  const saved = page.waitForResponse(r => new URL(r.url()).pathname === "/api/admin/catalogue-actions" && r.request().method() === "POST" && r.request().postDataJSON().purpose === "create");
  try {
    await keyboard(drawer.getByRole("button", { name: "Revisar material", exact: true }));
    await keyboard(page.getByRole("dialog", { name: "Adicionar material?", exact: true }).getByRole("button", { name: "Adicionar material", exact: true }));
    await received;
    await expect(page.getByRole("dialog", { name: "Conferindo a alteração do catálogo", exact: true })).toBeVisible();
    await expect(page.getByRole("dialog", { name: "Adicionar material?", exact: true })).toHaveCount(0);
    expect(count()).toBe(before);
  } finally { release(); }
  expect((await saved).status()).toBe(200);
  await keyboard(page.getByRole("dialog", { name: "Material adicionado", exact: true }).getByRole("button", { name: "Concluir", exact: true }));
  await expect(drawer).toHaveCount(0);
  // Confirmation closes the editor before the outer busy fieldset is enabled.
  // Its stable contextual heading is the explicit destination for that gap.
  const heading = page.getByRole("heading", { name: "Catálogo", exact: true });
  await expect.poll(async () => (await opener.evaluate(element => element === document.activeElement)) || (await heading.evaluate(element => element === document.activeElement)), { message: "Saved catalogue returns to its enabled opener or its explicit contextual heading" }).toBe(true);
  expect(Number(count())).toBe(Number(before) + 1);
  await expect(page.locator("[data-product-id]").filter({ hasText: value })).toBeVisible();
});
