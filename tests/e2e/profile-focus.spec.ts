import { test, expect } from "@playwright/test";
import { fixtures } from "../integration/v4-fixtures.mjs";
import { fixturePassword, patientA } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";

test("Perfil conserva o destino de teclado quando callbacks de foco chegam depois da navegação", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.family.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patientA);
  await page.evaluate(() => {
    // Delay ordinary frame callbacks uniformly, reproducing a busy frame queue.
    // Keyboard events and the menu's actual focus management remain real.
    const native = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => native(() => native(callback));
  });
  for (let attempt = 0; attempt < 6; attempt++) {
    await page.getByRole("button", { name: /^Notificações/ }).click();
    await expect(page.getByRole("region", { name: "Notificações recentes", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByLabel("Menu do usuário", { exact: true }).click();
    await expect(page.getByRole("menuitem", { name: "Meu perfil e segurança", exact: true })).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect(page.getByRole("menuitem", { name: "Mudar paciente ou função", exact: true })).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(page.getByRole("menuitem", { name: "Meu perfil e segurança", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByLabel("Menu do usuário", { exact: true })).toBeFocused();
  }
});
