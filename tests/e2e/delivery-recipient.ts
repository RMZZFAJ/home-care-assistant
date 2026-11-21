import { expect, type Locator, type Page } from "@playwright/test";

export async function openDeliveryRecipient(page: Page) {
  const picker = page.getByRole("dialog", { name: "Escolher quem receberá", exact: true });
  await page.getByRole("button", { name: /^(Alterar|Escolher) recebedor$/ }).click();
  await expect(picker).toBeVisible();
  return picker;
}

export function recipientOption(picker: Locator, name: string) {
  return picker.getByRole("radio", { name, exact: true });
}

export async function selectDeliveryRecipient(
  page: Page,
  name: string,
  reason: string,
) {
  const picker = await openDeliveryRecipient(page);
  await recipientOption(picker, name).check();
  const explanation = picker.getByRole("textbox", {
    name: "Justificativa da escolha do recebedor",
    exact: true,
  });
  if (await explanation.isVisible()) {
    if (!reason) return;
    await explanation.fill(reason);
  }
  await picker.getByRole("button", { name: "Usar recebedor", exact: true }).click();
  await expect(picker).toBeHidden();
}

export async function selectReturnRecipient(page: Page, id: string, reason: string) {
  const picker = await openDeliveryRecipient(page);
  await picker.locator(`input[type=radio][value="${id}"]`).check();
  await picker.getByRole("textbox", { name: "Justificativa da escolha do recebedor", exact: true }).fill(reason);
  await picker.getByRole("button", { name: "Usar recebedor", exact: true }).click();
  await expect(picker).toBeHidden();
}
