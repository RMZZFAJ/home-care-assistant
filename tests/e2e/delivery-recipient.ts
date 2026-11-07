import { expect, type Page } from "@playwright/test";

export async function selectDeliveryRecipient(
  page: Page,
  name: string,
  reason: string,
) {
  const field = page.getByRole("combobox", {
    name: "Destinatário designado",
    exact: true,
  });
  await expect(field).toBeEnabled();
  await field.fill(name);
  await field.press("ArrowDown");
  await page.getByRole("option", { name, exact: true }).click();
  const explanation = page.getByRole("textbox", {
    name: "Justificativa da escolha do recebedor",
    exact: true,
  });
  if (await explanation.isVisible()) await explanation.fill(reason);
}
