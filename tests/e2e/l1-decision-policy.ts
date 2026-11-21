import { expect, type Locator, type Page } from "@playwright/test";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";

export async function loginDecision(page: Page, email: string, patient: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}
export function privateFormCount(patient: string) {
  return sql(`select (select count(*) from private.creation_drafts where care_recipient_id=${q(patient)})+(select count(*) from private.balance_preparations where care_recipient_id=${q(patient)})`);
}
export function noPrivateWrites(page: Page) {
  const writes: string[] = [];
  page.on("request", request => {
    const path = new URL(request.url()).pathname;
    if (request.method() === "POST" && ["/api/drafts", "/api/balances/preparations"].includes(path)) writes.push(path);
  });
  return writes;
}
export async function loseDecisionResponse(page: Page, endpoint: string) {
  const packets: unknown[] = [];
  await page.route("**" + endpoint, async route => {
    if (route.request().method() !== "POST") return route.continue();
    packets.push(route.request().postDataJSON());
    const response = await route.fetch();
    expect(response.ok(), await response.text()).toBe(true);
    await route.abort("failed");
  });
  return packets;
}
/** A lost official reply is settled automatically; no second act is sent. */
export async function confirmDecisionAndReconcile(page: Page, id: string, confirm: Locator, endpoint = `/api/documents/${id}/decisions`) {
  const response = page.waitForResponse(row => new URL(row.url()).pathname === endpoint.split("?")[0] + "/reconcile" && row.request().method() === "POST");
  await confirm.click();
  const settled = await response;
  expect(settled.ok(), await settled.text()).toBe(true);
  const key = settled.request().postDataJSON().key;
  expect((await settled.json()).data).toMatchObject({ state: "applied", documentId: id, key });
  await expect(page.locator(".hca-activity-overlay")).toHaveCount(0);
}
export async function confirmedOutcome(page: Page, id: string, confirm: string, endpoint = `/api/documents/${id}/decisions`) {
  const packets = await loseDecisionResponse(page, endpoint);
  const reconciled = page.waitForResponse(response => new URL(response.url()).pathname === endpoint.split("?")[0] + "/reconcile" && response.request().method() === "POST");
  await page.getByRole("button", { name: confirm, exact: true }).click();
  const receipt = await reconciled;
  expect(receipt.ok(), await receipt.text()).toBe(true);
  expect((await receipt.json()).data.state).toBe("applied");
  await expect(page.locator(".hca-activity-overlay")).toHaveCount(0);
  expect(packets).toHaveLength(1);
}
export async function discardDecision(page: Page, fieldName: string, text: string) {
  const field = page.getByRole("textbox", { name: fieldName, exact: true });
  await field.fill(text);
  await field.press("Escape");
  const confirmation = page.getByRole("dialog", { name: "Sair sem concluir?", exact: true });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole("button", { name: "Voltar ao preenchimento", exact: true }).click();
  await expect(field).toHaveValue(text);
  await field.press("Escape");
  await confirmation.getByRole("button", { name: "Sair e descartar", exact: true }).click();
  await expect(confirmation).toHaveCount(0);
}
