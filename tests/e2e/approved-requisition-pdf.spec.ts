import { expect, test, type Page } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { PDF } from "@libpdf/core";
import { PDFDocument, PDFName, PDFHexString } from "pdf-lib";
import { cancellationFixture, awareness, awarenessFacts, rpc, fixtures } from "../integration/cancellation-awareness-fixtures.mjs";
import { complementPacket, createComplementCandidate, loadComplementDocument } from "../integration/document-complements-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
const compact = (text: string) => text.normalize("NFKC").replaceAll(/\s/g, "");
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
async function login(page: Page, email: string, patient: string) {
  await page.goto("/login"); await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible(); await selectContext(page, patient);
}
test.setTimeout(180_000);
test("approved REQ uses native frozen facts, real signature/storage/recovery and a minimal distributed identity while preserving V15", async ({ page, browser }) => {
  const f = await cancellationFixture(), id = f.document.id, childId = await createComplementCandidate(f, "COM");
  const child = await loadComplementDocument(f.admin, childId), facts = await awareness(f.family, id);
  await rpc(f.family, "acknowledge_document_cancellation", { p_id: id, p_event: facts.cancellation.id, p_key: randomUUID() });
  await rpc(f.admin, "link_document_complement", await complementPacket(f.admin, id, childId));
  await login(page, fixtures.adminA.email, f.patient);
  const oldKey = randomUUID();
  await rpc(f.admin, "reserve_pdf_issuance_v15", { p_document: id, p_key: oldKey });
  const oldRequest = await page.request.post(`/api/documents/${id}/issuances`, { data: { idempotencyKey: oldKey } });
  expect(oldRequest.status(), await oldRequest.text()).toBe(200); const oldReceipt = await oldRequest.json(); expect(oldReceipt.rendererRevision).toBe(15);
  const old = await page.request.get(`/api/documents/${id}/pdf?issuance=${oldReceipt.id}`), oldBytes = await old.body(), before = awarenessFacts(id);
  expect(old.status()).toBe(200);
  const key = randomUUID(), reserved = await rpc(f.admin, "reserve_pdf_issuance_v16", { p_document: id, p_key: key });
  const result = await page.request.post(`/api/documents/${id}/issuances`, { data: { idempotencyKey: key } });
  expect(result.status(), await result.text()).toBe(200);
  const receipt = await result.json();
  expect(receipt).toMatchObject({ id: reserved.id, rendererRevision: 16, state: "ready", validation: { accepted: true, profile: "PAdES-B-T", wholeFile: true } });
  const download = `/api/documents/${id}/pdf?issuance=${receipt.id}`, response = await page.request.get(download);
  expect(response.status()).toBe(200); const bytes = await response.body(); expect(digest(bytes)).toBe(receipt.sha256);
  const parsed = await PDFDocument.load(bytes, { updateMetadata: false });
  expect(JSON.parse(parsed.catalog.lookup(PDFName.of("HCAIssuance"), PDFHexString).decodeText())).toEqual({ verificationCode: receipt.verificationCode, requestedAt: receipt.requestedAt });
  const text = compact((await PDF.load(bytes)).extractText().flatMap(p => p.lines.map(l => l.spans.flatMap(s => s.chars.map(c => c.char)).join(""))).join(" "));
  for (const value of [facts.cancellation.reason, "Cancelamento da requisição", "Ciência do cancelamento", child.code, "Autenticidade e verificação", "Não ICP-Brasil", "Confidencialidade e proteção de dados pessoais"]) expect(text).toContain(compact(value));
  for (const internal of [id, receipt.id, reserved.sourceHash, child.protocol]) expect(text).not.toContain(compact(internal));
  expect(await (await page.request.get(download)).body()).toEqual(bytes);
  const recovered = await page.request.post(`/api/documents/${id}/issuances`, { data: { idempotencyKey: key } });
  expect((await recovered.json()).id).toBe(receipt.id);
  expect(await (await page.request.get(`/api/documents/${id}/pdf?issuance=${oldReceipt.id}`)).body()).toEqual(oldBytes);
  expect(awarenessFacts(id)).toBe(before);
  mkdirSync("output/pdf/approved", { recursive: true }); writeFileSync("output/pdf/approved/req-native-signed.pdf", bytes);
  const pro = await browser.newPage({ baseURL: new URL(page.url()).origin });
  try { await login(pro, fixtures.professional.email, f.patient); expect((await pro.request.get(download)).status()).toBe(403); }
  finally { await pro.close(); }
});
