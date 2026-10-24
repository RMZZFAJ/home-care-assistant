import { expect, type Page } from "@playwright/test";

export async function openNavigation(page: Page) {
  const origin = page.url();
  let nav = page.getByRole("navigation", { name: "Navegação principal", exact: true });
  if (!await nav.isVisible()) {
    const trigger = page.getByRole("button", { name: "Abrir navegação", exact: true });
    if (await trigger.isVisible()) await trigger.click();
    else {
      await page.getByRole("navigation", { name: "Navegação do plantão", exact: true }).getByRole("link", { name: "Mais", exact: true }).click();
      nav = page.getByRole("navigation", { name: "Rotina e funções autorizadas", exact: true });
    }
  }
  await expect(nav).toBeVisible();
  for (const group of await nav.locator("details").all()) {
    if (await group.getAttribute("open") === null) await group.locator("summary").click();
  }
  const close = async () => {
    const dialog = page.getByRole("dialog");
    if (await dialog.isVisible()) {
      await page.keyboard.press("Escape");
      await expect(page.getByRole("button", { name: "Abrir navegação", exact: true })).toBeFocused();
    } else if (page.url() !== origin) await page.goBack();
    else await page.getByRole("button", { name: "Recolher navegação", exact: true }).click();
  };
  return { nav, close };
}
