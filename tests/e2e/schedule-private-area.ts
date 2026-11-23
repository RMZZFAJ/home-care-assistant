import { expect, type Page } from "@playwright/test";

export async function openScheduleTypeSettings(page: Page) {
  const route = new URL(page.url());
  if (route.pathname !== "/configuracoes" || route.searchParams.get("area") !== "schedules") {
    await page.getByRole("button", { name: "Ações da agenda", exact: true }).click();
    await page.getByRole("menuitem", { name: "Tipos de plantão · configurações", exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "Configurações de plantões", exact: true })).toBeVisible();
}

/** A restored native details element may already be open after navigation. */
export async function openSchedulePrivateArea(page: Page) {
  await page.bringToFront();
  const settings = new URL(page.url()).searchParams.get("area") === "schedules";
  const summary = page.getByText(settings ? "Meus preenchimentos de tipos de plantão" : "Meus preenchimentos privados da agenda", { exact: true });
  const details = summary.locator("..");
  await expect(summary).toBeVisible();
  if (!await details.evaluate(element => element.hasAttribute("open"))) {
    await summary.scrollIntoViewIfNeeded();
    await summary.focus(); await expect(summary).toBeFocused();
    await summary.press("Enter");
  }
  await expect(details).toHaveAttribute("open", "");
}
