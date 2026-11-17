import { expect, type Page } from "@playwright/test";

/** A restored native details element may already be open after navigation. */
export async function openSchedulePrivateArea(page: Page) {
  await page.bringToFront();
  const summary = page.getByText("Meus preenchimentos privados da agenda", { exact: true });
  const details = summary.locator("..");
  await expect(summary).toBeVisible();
  if (!await details.evaluate(element => element.hasAttribute("open"))) {
    await summary.scrollIntoViewIfNeeded();
    await summary.focus(); await expect(summary).toBeFocused();
    await summary.press("Enter");
  }
  await expect(details).toHaveAttribute("open", "");
}
