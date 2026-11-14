import { expect, test } from "@playwright/test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fixtures } from "../integration/v4-fixtures.mjs";
import { fixturePassword, patientA } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";

test("UIR cabeçalho e navegação seguem o HTML e mantêm contexto utilizável em cinco larguras", async ({ page, browser }, info) => {
  test.setTimeout(120_000);
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.family.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patientA);
  const reference = await browser.newContext();
  try {
    const model = await reference.newPage();
    await model.route(/^https?:/, route => route.abort());
    await model.goto(pathToFileURL(resolve("Home_Care_Assistant_Modelo_Integral.html")).href);
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await model.setViewportSize({ width, height: 900 });
      await page.evaluate(() => window.scrollTo(0, 0));
      const header = page.locator(".app-header");
      for (const property of ["background-color", "border-bottom-color", "color"] as const) {
        const expected = await model.locator(".topbar").evaluate((el, key) => getComputedStyle(el).getPropertyValue(key), property);
        await expect(header).toHaveCSS(property, expected);
      }
      const modelHeight = await model.locator(".topbar").evaluate(el => el.getBoundingClientRect().height);
      // The product adds a separate 51px patient row on mobile; it must stay
      // available rather than hiding context to copy the demonstration header.
      await expect(header).toHaveCSS("height", `${modelHeight + (width <= 850 ? 51 : 0)}px`);
      const patient = page.getByRole("combobox", { name: "Pessoa assistida", exact: true });
      await expect(patient).toBeEnabled();
      await expect(patient).toBeInViewport({ ratio: 1 });
      await expect(page.getByLabel("Menu do usuário", { exact: true })).toBeInViewport({ ratio: 1 });
      await expect(page.getByRole("button", { name: /^Notificações/ })).toBeInViewport({ ratio: 1 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (width > 850) {
        const expected = await model.locator(".sidebar").evaluate(el => getComputedStyle(el).width);
        await expect(page.locator(".hca-desktop-navigation")).toHaveCSS("width", expected);
      } else {
        const trigger = page.getByRole("button", { name: "Abrir navegação", exact: true });
        await trigger.click();
        await expect(page.getByRole("navigation", { name: "Navegação principal", exact: true })).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(trigger).toBeFocused();
      }
      await audit(page, "UIR canonical shell " + width);
      await info.attach("canonical-shell-reference-" + width, { body: await model.screenshot(), contentType: "image/png" });
      await info.attach("current-shell-" + width, { body: await page.screenshot(), contentType: "image/png" });
    }
  } finally { await reference.close(); }
});
