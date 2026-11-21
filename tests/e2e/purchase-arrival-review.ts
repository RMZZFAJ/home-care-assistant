import { expect, type Locator, type Page } from "@playwright/test";
import { loseDecisionResponse } from "./l1-decision-policy";

export const arrivalReviewEndpoint = "/api/purchases/arrivals/review";

export async function openArrivalReview(page: Page) {
  await page.getByRole("button", { name: "Conferir chegadas", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: /^(Conferir entrada no estoque|Conferir chegadas)$/ });
  await expect(dialog).toBeVisible();
  return dialog;
}

export function arrivalCard(dialog: Locator, id: string) {
  return dialog.locator(`article[data-receipt-id="${id}"]`);
}

export async function chooseArrivalAction(card: Locator, action: "Abrir pendência" | "Recusar chegada", reason: string) {
  await card.getByRole("button", { name: /Opções da chegada/ }).click();
  await card.page().getByRole("menuitem", { name: action, exact: true }).click();
  await card.getByRole("textbox", { name: action === "Abrir pendência" ? "O que precisa ser corrigido?" : "Motivo da recusa", exact: true }).fill(reason);
}

export async function confirmArrivalReview(page: Page, dialog: Locator, lostResponse = false) {
  const packets = lostResponse ? await loseDecisionResponse(page, arrivalReviewEndpoint) : null;
  const path = arrivalReviewEndpoint + (lostResponse ? "/reconcile" : "");
  const confirmation = page.waitForResponse(response => new URL(response.url()).pathname === path && response.request().method() === "POST");
  await dialog.getByRole("button", { name: "Confirmar decisões", exact: true }).click();
  const response = await confirmation;
  expect(response.ok(), await response.text()).toBe(true);
  const receipt = (await response.json()).data;
  expect(receipt).toMatchObject({ state: "recorded", key: response.request().postDataJSON().key });
  if (lostResponse) { expect(packets).toHaveLength(1); await page.unroute("**" + arrivalReviewEndpoint); }
  await expect(page.locator(".hca-activity-overlay")).toHaveCount(0);
  const result = page.getByRole("dialog", { name: /^(Decisões registradas|Resultado da conferência)$/ });
  await expect(result).toBeVisible();
  return { result, receipt };
}
