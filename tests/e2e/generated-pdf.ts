import { expect, type Page, type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
const intentions = new WeakMap<
  APIRequestContext,
  Map<string, { key: string; issuance?: string }>
>();
/** A test's explicit PDF-generation action. Subsequent reads recover its exact issuance. */
export async function generatedPdf(page: Page, legacyUrl: string) {
  const url = new URL(legacyUrl, "http://local.test"),
    match = /^\/api\/documents\/([0-9a-f-]{36})\/pdf$/.exec(url.pathname);
  if (!match) throw new Error("Expected a known document PDF path");
  const id = match[1];
  const detail = await page.request.get(`/api/documents/${id}`);
  expect(detail.ok(), await detail.text()).toBe(true);
  const version = Number(
      url.searchParams.get("version") ?? (await detail.json()).data.version,
    ),
    scope = `${id}:${version}`;
  let stored = intentions.get(page.request);
  if (!stored) {
    stored = new Map();
    intentions.set(page.request, stored);
  }
  let intention = stored.get(scope);
  if (!intention) {
    intention = { key: randomUUID() };
    stored.set(scope, intention);
  }
  if (!intention.issuance) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const response = await page.request.post(
        `/api/documents/${id}/issuances`,
        { data: { idempotencyKey: intention.key, version } },
      );
      expect([200, 202], await response.text()).toContain(response.status());
      const row = await response.json();
      if (row.state === "ready") {
        intention.issuance = row.id;
        break;
      }
      await page.waitForTimeout(500);
    }
    expect(
      intention.issuance,
      "The explicit generation must actually reach ready",
    ).toBeTruthy();
  }
  return page.request.get(
    `/api/documents/${id}/pdf?issuance=${intention.issuance}`,
  );
}
