import { expect, type Page } from "@playwright/test";

export async function openDeliveryRecipient(page: Page) {
  const picker = page.getByRole("dialog", { name: "Escolher recebedor", exact: true });
  await page.getByRole("button", { name: /^(Alterar|Escolher) recebedor$/ }).click();
  await expect(picker).toBeVisible();
  return picker;
}

export async function selectDeliveryRecipient(
  page: Page,
  name: string,
  reason: string,
) {
  const picker = await openDeliveryRecipient(page);
  const field = picker.getByRole("combobox", {
    name: "Destinatário designado",
    exact: true,
  });
  await expect(field).toBeEnabled();
  await field.fill(name);
  await field.press("ArrowDown");
  await page.getByRole("option", { name, exact: true }).or(page.getByRole("option", { name: `${name} · Em plantão`, exact: true })).click();
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
  await picker.getByRole("combobox", { name: "Recebedor físico designado", exact: true }).selectOption(id);
  await picker.getByRole("textbox", { name: "Justificativa da escolha do recebedor", exact: true }).fill(reason);
  await picker.getByRole("button", { name: "Usar recebedor", exact: true }).click();
  await expect(picker).toBeHidden();
}
