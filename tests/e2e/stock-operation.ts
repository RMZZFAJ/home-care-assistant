import { expect, type Locator, type Page } from "@playwright/test";

export async function stockMovement(page: Page, id: string): Promise<Locator> {
  const row = page.locator(`[data-movement-id="${id}"]`);
  const operation = page.locator("[data-stock-act]").filter({ has: row });
  await expect(operation).toBeVisible();
  if (await operation.getAttribute("open") === null) await operation.locator("summary").click();
  await expect(row).toBeVisible();
  return row;
}
