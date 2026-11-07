import { expect, type Page } from "@playwright/test";

export async function openNavigation(page: Page) {
  const origin = page.url();
  let nav = page.getByRole("navigation", { name: "Navegação principal", exact: true });
  const trigger = page.getByRole("button", { name: "Abrir navegação", exact: true });
  const more = page.getByRole("navigation", { name: "Navegação do plantão", exact: true }).getByRole("link", { name: "Mais", exact: true });
  // isVisible is an immediate observation. Wait for an actual shell variant
  // before selecting its path; hydration may initially expose none of them.
  await expect.poll(async () => await nav.isVisible() || await trigger.isVisible() || await more.isVisible(), {
    message: "An authorized navigation variant must be ready",
  }).toBe(true);
  if (!await nav.isVisible()) {
    if (await trigger.isVisible()) await trigger.click();
    else {
      await more.click();
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
