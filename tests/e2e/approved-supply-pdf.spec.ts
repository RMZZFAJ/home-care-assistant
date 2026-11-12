import { expect, test, type Page } from "@playwright/test";
import { randomUUID, createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PDF } from "@libpdf/core";
import { PDFDocument, PDFName, PDFHexString } from "pdf-lib";
import { purchaseBalanceFixture, purchaseBalanceArrival, purchaseBalanceCommand, purchaseBalanceFacts, otherPurchaseEntry } from "../integration/purchase-entry-balance-fixtures.mjs";
import { autonomousReturnFixture, declaredAutonomousReturn, transferCommand, transferState, rpc } from "../integration/autonomous-return-fixtures.mjs";
import { regularizationPdfFixture, regularizationLedger } from "../integration/pdf-regularization-fixtures.mjs";
import { setup, fixtures } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { selectDocumentSection } from "./document-sections";

test.setTimeout(180_000);
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
const compact = (value: string) => value.normalize("NFKC").replaceAll(/\s/g, "");
const stock = (patient: string, product: string) => sql(`select private.stock_quantity(${q(patient)},${q(product)},'FAMILY')`);
async function login(page: Page, patient: string) {
  await page.goto("/login"); await page.getByLabel("E-mail", { exact: true }).fill(fixtures.adminA.email); await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click(); await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible(); await selectContext(page, patient);
}
async function issueFromUi(page: Page, id: string, label: string) {
  await page.goto("/documentos/" + id); await selectDocumentSection(page, "files");
  const pending = page.waitForResponse(response => new URL(response.url()).pathname === `/api/documents/${id}/issuances` && response.request().method() === "POST");
  await page.getByRole("button", { name: "Gerar PDF", exact: true }).click();
  const created = await pending; expect(created.status(), await created.text()).toBe(200); const row = await created.json();
  expect(row).toMatchObject({ rendererRevision: 16, state: "ready", validation: { accepted: true, wholeFile: true, profile: "PAdES-B-T", signerTrust: "internal", timestampTrust: "internal" } });
  const url = `/api/documents/${id}/pdf?issuance=${row.id}`;
  await expect(page.getByRole("region", { name: "Arquivos gerados", exact: true }).locator('a[download][href="' + url + '"]')).toBeVisible();
  const download = await page.request.get(url); expect(download.status()).toBe(200); const bytes = await download.body(); expect(digest(bytes)).toBe(row.sha256);
  expect(await (await page.request.get(url)).body()).toEqual(bytes);
  const recovered = await page.request.post(`/api/documents/${id}/issuances`, { data: created.request().postDataJSON() });
  expect(recovered.status()).toBe(200); expect((await recovered.json()).id).toBe(row.id);
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  expect(JSON.parse(pdf.catalog.lookup(PDFName.of("HCAIssuance"), PDFHexString).decodeText())).toEqual({ verificationCode: row.verificationCode, requestedAt: row.requestedAt });
  const text = compact((await PDF.load(bytes)).extractText().flatMap(p => p.lines.map(l => l.spans.flatMap(s => s.chars.map(c => c.char)).join(""))).join(" "));
  expect(text).toContain(compact("Autenticidade e verificação")); expect(text).toContain(compact("Não ICP-Brasil"));
  expect(text).not.toContain(row.id); expect(text).not.toContain(id);
  mkdirSync("output/pdf/approved", { recursive: true }); writeFileSync(`output/pdf/approved/${label}-native-signed.pdf`, bytes);
  const trust = process.env.HCA_PDF_TRUST_POLICY_FILE; if (!trust) throw Error("Guarded test trust required");
  writeFileSync("output/pdf/approved/public-root.crt", JSON.parse(readFileSync(trust, "utf8")).roots[0].pem);
  return { row, bytes, text };
}

test("approved COM emits through its UI with distinct parcels and each material's historical entry balance after later stock movements", async ({ page }) => {
  const f = await purchaseBalanceFixture(), a = f.document.lines.find((line: { product_id: string }) => line.product_id === f.products[0]), b = f.document.lines.find((line: { product_id: string }) => line.product_id === f.products[1]);
  const arrival = await purchaseBalanceArrival(f, f.document, [{ lineId: a.id, quantity: "2" }, { lineId: b.id, quantity: "4" }]);
  const first = await purchaseBalanceCommand(f.admin, arrival.document, "validate_receipt", { receiptId: arrival.receipt.id }), expectedB = stock(f.patient, f.products[1]);
  await otherPurchaseEntry(f, "5"); const later = await purchaseBalanceArrival(f, first, [{ lineId: a.id, quantity: "1" }], f.admin), expectedA = stock(f.patient, f.products[0]);
  await otherPurchaseEntry(f, "1"); expect(stock(f.patient, f.products[0])).not.toBe(expectedA); expect(stock(f.patient, f.products[1])).not.toBe(expectedB);
  const before = purchaseBalanceFacts(f); await login(page, f.patient); const result = await issueFromUi(page, later.document.id, "com");
  const frozen = await rpc(f.admin, "pdf_issuance", { p_id: result.row.id });
  expect(Number(frozen.snapshot.purchaseEntryBalances.find((line: { lineId: string }) => line.lineId === a.id).quantity)).toBe(Number(expectedA));
  expect(Number(frozen.snapshot.purchaseEntryBalances.find((line: { lineId: string }) => line.lineId === b.id).quantity)).toBe(Number(expectedB));
  for (const value of ["Compra de materiais", "Chegadas e validação por parcela", "Entrada validada", "Saldo após entrada"]) expect(result.text).toContain(compact(value));
  expect(purchaseBalanceFacts(f)).toBe(before);
});

test("approved donation uses its own title and real validated arrival without inventing a purchase or payment", async ({ page }) => {
  const f = await setup(); let d = await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_draft: false, p_payload: { origin: "donation", lines: [{ productId: f.products[0], quantity: "2" }], notes: "Doação real do cenário fictício, sem pagamento." } });
  d = await purchaseBalanceCommand(f.admin, d, "purchase", { lines: [{ lineId: d.lines[0].id, quantity: "2" }] });
  const arrived = await purchaseBalanceArrival({ ...f, family: f.admin }, d, [{ lineId: d.lines[0].id, quantity: "2" }], f.admin);
  await login(page, f.patient); const result = await issueFromUi(page, arrived.document.id, "donation");
  expect(result.text).toContain(compact("Doação de materiais")); expect(result.text).toContain(compact("Declarado")); expect(result.text).not.toContain(compact("Compra de materiais"));
});

test("approved BAL shows the actual application and original count in a signed UI emission without a receipt seal or another stock write", async ({ page }) => {
  const f = await setup(); sql(`insert into public.patient_settings(care_recipient_id,settings) values(${q(f.patient)},'{"balReview":"optional"}'::jsonb) on conflict(care_recipient_id) do update set settings=public.patient_settings.settings||'{"balReview":"optional"}'::jsonb`);
  const d = await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "BAL", p_key: randomUUID(), p_draft: false, p_payload: { lines: f.products.map((productId: string) => ({ productId, quantity: "2" })), notes: "Contagem física preservada para a nova composição." } });
  const before = regularizationLedger(f.patient); await login(page, f.patient); const result = await issueFromUi(page, d.id, "bal");
  const frozen = await rpc(f.admin, "pdf_issuance", { p_id: result.row.id });
  expect(frozen.snapshot.balanceApplication.state).toBe("applied"); expect(frozen.snapshot.balanceApplication.lines.every((line: { quantity: string }) => Number(line.quantity) === 2)).toBe(true);
  for (const value of ["Balanço do estoque da equipe", "Saldo após balanço", "Revisão facultativa", "Contagem física preservada"]) expect(result.text).toContain(compact(value));
  expect(result.text).not.toContain(compact("FAMÍLIA CIENTE")); expect(regularizationLedger(f.patient)).toBe(before);
});

test("approved ENT preserves personal receipt and administrative settlement as separate facts in the signed UI file", async ({ page }) => {
  const f = await regularizationPdfFixture(), before = regularizationLedger(f.patient); await login(page, f.patient);
  const result = await issueFromUi(page, f.doc.id, "ent");
  for (const value of [f.reason, f.basis, f.item.proposal.proposedName, f.item.proposal.reviewerName, "Encerramento administrativo não substitui aceite pessoal", "Regularização administrativa"]) expect(result.text).toContain(compact(value));
  const frozen = await rpc(f.admin, "pdf_issuance", { p_id: result.row.id });
  expect(frozen.snapshot.deliveryRegularization.cases[0].before_snapshot.acceptedBy).toBe(f.item.before_snapshot.acceptedBy);
  expect(regularizationLedger(f.patient)).toBe(before);
});

test("approved autonomous return preserves declaration, agreement and partial family receipt without an original ENT", async ({ page }) => {
  const f = await autonomousReturnFixture(), declaration = await declaredAutonomousReturn(f);
  const agreement = await transferCommand(f.counterparty.client, declaration.document.id, "agree", declaration.document.version, { reason: "Concordância familiar própria, sem aceite físico." }); expect(agreement.error).toBeNull();
  const dispatch = await transferCommand(f.initiator.client, agreement.data.id, "dispatch", agreement.data.version); expect(dispatch.error).toBeNull();
  const d = await rpc(f.recipient.client, "supply_document_command", { p_id: dispatch.data.id, p_action: "receive", p_version: dispatch.data.version, p_key: randomUUID(), p_body: { divergences: [{ lineId: dispatch.data.lines[0].id, acceptedQuantity: "3", problem: "shortage", notes: "Recebi três das cinco unidades devolvidas." }] } });
  const before = transferState(f); await login(page, f.patient); const result = await issueFromUi(page, d.id, "return");
  expect((await PDFDocument.load(result.bytes)).getTitle()).toContain("Devolução de materiais");
  for (const value of ["Devolução autônoma da equipe para a família", "sem entrega de origem vinculada", "Juliana, responsável pela devolução", "Ana, concordância familiar", "Bruno, recebimento familiar", "Recebi três das cinco unidades devolvidas."]) expect(result.text).toContain(compact(value));
  expect(result.text).toContain(compact("Conferência pessoal: Bruno, recebimento familiar"));
  const table = (await PDF.load(result.bytes)).extractText()[0].lines.flatMap(line => line.spans.flatMap(span => span.chars)).filter(char => char.bbox.x >= 478.4 && char.bbox.x < 564).map(char => char.char).join("");
  expect(compact(table)).toContain("2unidade");
  expect(transferState(f)).toBe(before);
});
