import type { Page } from "@playwright/test";

export function selectMaterialCategory(page: Page, category = "Higiene") {
  return page.getByRole("navigation", { name: "Tipos de material", exact: true })
    .getByRole("button", { name: new RegExp("^" + category) }).click();
}
