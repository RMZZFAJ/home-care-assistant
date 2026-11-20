import { expect, type Browser, type Locator, type Page } from "@playwright/test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { selectDocumentSection } from "./document-sections";

export async function selectReadyMaterials(page: Page) {
  await expect(page.getByRole("tab", { name: "Materiais", exact: true })).toBeVisible({ timeout: 45_000 });
  await selectDocumentSection(page, "materials");
}

export async function openIssuedMaterials(page: Page, patient: string, id: string, role: "admin" | "family" = "family") {
  // Shared identities accumulate memberships across fixtures. Open the real
  // document with a member whose only residence is the one under test.
  const user = await shiftWorker(patient, role);
  const params = new URLSearchParams({ next: "/fichas/" + id });
  await page.goto("/login?" + params, { waitUntil: "domcontentloaded" });
  await page.getByLabel("E-mail", { exact: true }).fill(user.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(url => url.pathname === "/fichas/" + id, { timeout: 45_000 });
  await selectReadyMaterials(page);
  await expect(page.locator(".hca-workspace")).toHaveAttribute("data-context-patient", patient);
}

export async function mobileMaterialReference(browser: Browser, code: string) {
  const context = await browser.newContext({ viewport: { width: 360, height: 900 } });
  const page = await context.newPage();
  await page.route(/^https?:/, route => route.abort());
  await page.goto(pathToFileURL(resolve("hca-laboratorio-02-v7.html")).href + "#ficha/" + code);
  return { context, page };
}

export async function expectMobileMaterialRow(row: Locator, reference: Page, width: number) {
  await reference.setViewportSize({ width, height: 900 });
  const urgent = await row.getAttribute("data-urgent") === "true";
  const model = reference.locator(urgent ? "#product-app .v7-material.urgent" : "#product-app .v7-material:not(.urgent)").first();
  await expect(model).toBeVisible();
  for (const property of ["display", "background-color", "padding-left", "padding-top", "padding-bottom", "row-gap"] as const) {
    await expect(row).toHaveCSS(property, await model.evaluate((node, property) =>
      getComputedStyle(node).getPropertyValue(property), property));
  }
  const title = model.locator(".v7-material-title > strong");
  for (const property of ["font-size", "font-weight", "color"] as const) {
    await expect(row.locator(".hca-v7-material-title > strong")).toHaveCSS(property,
      await title.evaluate((node, property) => getComputedStyle(node).getPropertyValue(property), property));
  }
  for (const facts of [row, model]) {
    expect(await facts.locator(".hca-v7-material-facts, .v7-material-facts").evaluate(node =>
      getComputedStyle(node).gridTemplateColumns.split(" ").length)).toBe(2);
  }
}
