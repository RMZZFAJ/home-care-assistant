import { expect, type Page } from "@playwright/test";

export async function assertKeyboardEntry(page: Page, label: string) {
  // BODY focus does not reset the browser's sequential navigation origin.
  // Start from the real skip link/landmark, then require a keyboard move into
  // a different accessible element. Never accept merely focusing the origin.
  await page.bringToFront();
  const skip = page.getByRole("link", { name: "Ir para o conteúdo", exact: true });
  const origin = await skip.count() ? skip : page.getByRole("main");
  await origin.focus();
  await expect(origin).toBeFocused();
  const element = await origin.elementHandle();
  await page.keyboard.press("Tab");
  await expect.poll(() => page.evaluate(start => {
    const active = document.activeElement;
    return Boolean(active && active !== start && active !== document.body && active !== document.documentElement &&
      !active.hasAttribute("data-tabster-dummy") && !active.closest('[aria-hidden="true"]'));
  }, element), { message: label + " keyboard entry must reach different accessible content" }).toBe(true);
  await element?.dispose();
}
