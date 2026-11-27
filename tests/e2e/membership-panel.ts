import type { Page } from "@playwright/test";

export function membershipRow(page: Page, name: string) {
  return page.getByRole("list", { name: "Pessoas vinculadas", exact: true })
    .getByRole("button").filter({ has: page.getByText(name, { exact: true }) });
}

export async function openMembershipDetails(page: Page, name: string) {
  await membershipRow(page, name).click();
  return page.getByRole("dialog", { name, exact: true });
}
