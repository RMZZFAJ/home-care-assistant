import { expect, type Page } from "@playwright/test";

export async function assertKeyboardEntry(page: Page, label: string) {
  // BODY focus does not reset the browser's sequential navigation origin.
  // Start from an existing skip link, focusable landmark or first form control,
  // then require a keyboard move into
  // a different accessible element. Never accept merely focusing the origin.
  await page.bringToFront();
  const modal = page.getByRole("dialog").and(page.locator('[aria-modal="true"]')).filter({ visible: true }).last();
  const hasModal = await modal.count() > 0;
  const skip = page.getByRole("link", { name: "Ir para o conteúdo", exact: true });
  const readinessScope = hasModal ? modal : page.getByRole("main", { includeHidden: true }).filter({ visible: true });
  // The runtime barrier deliberately makes the page inert until its version
  // check settles. Focus is rejected while inert; visibility is insufficient.
  await expect.poll(() => readinessScope.evaluateAll(elements => elements.length === 1 && !elements[0].closest('[inert], [aria-hidden="true"]')), {
    message: label + " keyboard entry requires an interactive landmark",
  }).toBe(true);
  const scope = hasModal ? modal : page.getByRole("main").filter({ visible: true });
  const origin = !hasModal && await skip.count() ? skip : await scope.evaluate(element => element.hasAttribute("tabindex")) ? scope : scope
    .locator('a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([data-tabster-dummy])')
    .filter({ visible: true }).first();
  await origin.focus();
  await expect(origin).toBeFocused();
  const element = await origin.elementHandle();
  await page.keyboard.press("Tab");
  await expect.poll(() => page.evaluate(start => {
    const active = document.activeElement;
    return Boolean(active && active !== start && active !== document.body && active !== document.documentElement &&
      !active.hasAttribute("data-tabster-dummy") && !active.closest('[aria-hidden="true"]'));
  }, element), { message: label + " keyboard entry must reach different accessible content" }).toBe(true);
  if (hasModal) await expect.poll(() => modal.evaluate(dialog => dialog.contains(document.activeElement)), { message: label + " keyboard entry must remain in the open modal" }).toBe(true);
  await element?.dispose();
}
