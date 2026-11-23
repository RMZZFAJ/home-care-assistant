import { expect, type Page } from "@playwright/test";

export const balanceStage = (page: Page, name: string) =>
  page.getByRole("navigation", { name: "Etapas da ficha", exact: true }).getByRole("button", { name, exact: true });

export async function finishBalanceMaterials(page: Page) {
  await expect(balanceStage(page, "Materiais")).toHaveAttribute("aria-current", "step");
  const next = page.getByRole("button", { name: "Avançar", exact: true });
  await next.click();
  await expect(balanceStage(page, "Itens extras")).toHaveAttribute("aria-current", "step");
  await next.click();
  await expect(balanceStage(page, "Observações")).toHaveAttribute("aria-current", "step");
}
