// API default for new intentions; explicit historical revisions remain unchanged.
export const CURRENT_PDF_REVISION = 16;

import { expect, type Page, type APIRequestContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { PDFDocument, PDFName, PDFHexString } from "pdf-lib";
import { pdfIssuancePageSchema } from "../../src/lib/documents/pdf-issuance";
const intentions = new WeakMap<
  APIRequestContext,
  Map<string, { key: string; issuance?: string }>
>();
/** A test's explicit PDF-generation action. Subsequent reads recover its exact issuance. */
export async function generatedPdf(page: Page, legacyUrl: string, reserveLegacy?: (key: string, version: number) => Promise<unknown>) {
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
    if (reserveLegacy) await reserveLegacy(intention.key, version);
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

/** New operational PDFs distribute only their code/time. Resolve their registered
 * source through the authorized API and actual bytes, never an invented metadata ID. */
export async function pdfIssuanceReference(page: Page, documentId: string, bytes: Uint8Array): Promise<{ id: string; documentId: string; version: number; rendererRevision: number; requestedAt: string; verificationCode: string; sourceHash?: string }> {
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  const raw = JSON.parse(pdf.catalog.lookup(PDFName.of("HCAIssuance"), PDFHexString).decodeText());
  if (typeof raw.id === "string") { expect(raw.rendererRevision).toBeLessThan(16); return raw; }
  expect(Object.keys(raw).sort()).toEqual(["requestedAt", "verificationCode"]);
  let query = "";
  const seen = new Set<string>();
  while (true) {
    expect(seen.has(query), "Issuance pagination must advance").toBe(false); seen.add(query);
    const response = await page.request.get(`/api/documents/${documentId}/issuances` + query);
    expect(response.status(), await response.text()).toBe(200);
    const result = pdfIssuancePageSchema.parse(await response.json()), matches = result.data.filter(row => row.verificationCode === raw.verificationCode);
    expect(matches.length).toBeLessThanOrEqual(1);
    if (matches.length) {
      const row = matches[0];
      expect(row.documentId).toBe(documentId); expect(row.rendererRevision).toBeGreaterThanOrEqual(16);
      expect(row.requestedAt).toBe(raw.requestedAt); expect(row.state).toBe("ready");
      expect(row.sha256).toBe(createHash("sha256").update(bytes).digest("hex"));
      return row;
    }
    if (!result.next) throw new Error("Signed operational code has no authorized matching issuance");
    query = "?" + new URLSearchParams({ before: result.next.at, beforeId: result.next.id });
  }
}
