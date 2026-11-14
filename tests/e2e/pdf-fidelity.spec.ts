import { selectDocumentSection } from "./document-sections";
import { test, expect, type Page } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PDF } from "@libpdf/core";
import { fidelityDeliveryFixture, fidelityPurchaseFixture, fidelityRequisitionFixture, fidelityBalanceInitialFixture, recountFidelityBalance, fidelityLedger } from "../integration/pdf-fidelity-fixtures.mjs";
import { historicalSourceFixture } from "../integration/pdf-source-facts-fixtures.mjs";
import { legacyBalance } from "../integration/bal-review-fixtures.mjs";
import { rpc, fixtures, actor } from "../integration/v4-fixtures.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { selectContext } from "./auth-context";
import { generatedPdf, pdfIssuanceReference } from "./generated-pdf";

test.setTimeout(180000);
const root = "output/pdf/phase-d/" + (process.env.HCA_E2E_DIAGNOSTIC === "true" ? "fidelity-diagnostic" : "fidelity");
const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const compact = (value: string) => value.normalize("NFKC").replaceAll(/\s/g, "").toLocaleLowerCase("pt-BR");
type Row = { label: string; file: string; code: string; publicRoot: string; issuanceId: string; documentId: string; version: number; rendererRevision: number; sha256: string; sourceHash: string; expectedText: string[]; absentText: string[]; sourceFacts: unknown; documentFacts: unknown };
let rows: Row[] = [];
test.beforeEach(() => { rows = []; });
test.afterEach(async ({ page }, info) => {
  if (info.project.name !== "chromium" || !rows.length) return;
  mkdirSync(root, { recursive: true });
  const path = root + (info.status === "passed" ? "/CORPUS.json" : "/FAILED_CORPUS-" + randomUUID() + ".json");
  const prior: Row[] = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : [];
  const observed = rows.map(row => ({ ...row, viewPath: new URL(page.url()).pathname }));
  writeFileSync(path, JSON.stringify([...prior, ...observed], null, 2) + "\n");
});
async function login(page: Page, patient: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixtures.family.email);
  await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  await selectContext(page, patient);
}
async function inspectPdf(page: Page, f: { patient: string; owner: SupabaseClient }, documentId: string, label: string, response: import("@playwright/test").APIResponse, expectedText: string[], absentText: string[] = []) {
  expect(response.status(), label).toBe(200);
  const bytes = await response.body();
  const identity = await pdfIssuanceReference(page, documentId, bytes);
  await rpc(f.owner, "select_active_context", { p_patient: f.patient });
  const frozen = await rpc(f.owner, "pdf_issuance", { p_id: identity.id });
  expect(frozen).toMatchObject({ state: "ready", sha256: digest(bytes), validation: { accepted: true, wholeFile: true, profile: "PAdES-B-T" } });
  const parsedPages = (await PDF.load(bytes)).extractText();
  const extracted = compact(parsedPages.flatMap(p => p.lines.map(line => line.spans.flatMap(span => span.chars.map(char => char.char)).join(""))).join(" "));
  if (identity.rendererRevision >= 16) {
    const operationalLabels: Record<string,string> = { "Atendimento com aceite positivo registrado": "Aceite positivo registrado", "Sem aceite positivo registrado": "Sem aceite positivo", "COMPRA DE INSUMOS DA FAMÍLIA": "Compra de materiais", "DOAÇÃO DE INSUMOS À FAMÍLIA": "Doação de materiais", "Horário da informação desconhecido": "Horário da informação histórica desconhecido" };
    const technicalIds = expectedText.filter(value => /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value));
    absentText = [...absentText, ...technicalIds];
    expectedText = expectedText.filter(value => !technicalIds.includes(value)).map(value => operationalLabels[value] ?? value);
  }
  // Multi-line cells are read by column: adjacent stock timestamps are not part of the attendance field.
  const attendance = identity.rendererRevision >= 16 && frozen.snapshot.type === "REQ" ? compact(parsedPages.map(p => p.lines.flatMap(l => l.spans.flatMap(s => s.chars)).filter(c => c.bbox.x >= 446.4 && c.bbox.x < 564).sort((a,b) => b.baseline - a.baseline || a.bbox.x - b.bbox.x).map(c => c.char).join("")).join(" ")) : "";
  const heading = identity.rendererRevision >= 16 ? compact(parsedPages.map(p => p.lines.flatMap(l => l.spans.flatMap(s => s.chars)).filter(c => c.bbox.x >= 31.75 && c.bbox.x < 222.75).sort((a,b) => b.baseline - a.baseline || a.bbox.x - b.bbox.x).map(c => c.char).join("")).join(" ")) : "";
  for (const fact of expectedText) expect(extracted + attendance + heading, label + ": " + fact).toContain(compact(fact));
  for (const fact of absentText) expect(extracted + attendance, label + ": forbidden " + fact).not.toContain(compact(fact));
  const repeated = await page.request.get(`/api/documents/${documentId}/pdf?issuance=${identity.id}`);
  expect(repeated.status()).toBe(200); expect((await repeated.body()).equals(bytes)).toBe(true);
  expect(sql(`select content_hash from public.document_events where document_id=${sqlLiteral(documentId)} and version=${identity.version};`)).toBe(frozen.sourceHash);
  if (test.info().project.name === "chromium") {
    mkdirSync(root, { recursive: true });
    const policyFile = process.env.HCA_PDF_TRUST_POLICY_FILE;
    if (!policyFile) throw new Error("Guarded runner must supply its ephemeral public trust fixture");
    const pem = JSON.parse(readFileSync(policyFile, "utf8")).roots[0].pem as string;
    const publicRoot = "public-root-" + digest(Buffer.from(pem)).slice(0, 16) + ".crt";
    if (existsSync(root + "/" + publicRoot)) expect(readFileSync(root + "/" + publicRoot, "utf8")).toBe(pem);
    else writeFileSync(root + "/" + publicRoot, pem, { flag: "wx" });
    const file = label + "-" + identity.id + ".pdf"; writeFileSync(root + "/" + file, bytes, { flag: "wx" });
    rows.push({ label, file, code: frozen.snapshot.code, publicRoot, issuanceId: identity.id, documentId, version: identity.version, rendererRevision: identity.rendererRevision, sha256: digest(bytes), sourceHash: frozen.sourceHash, expectedText, absentText, sourceFacts: frozen.snapshot.sourceFacts, documentFacts: frozen.snapshot.documentFacts ?? null });
  }
  return { identity, frozen, bytes, extracted };
}
const issue = (page: Page, f: { patient: string; owner: SupabaseClient }, id: string, version: number, label: string, expected: string[], absent: string[] = []) =>
  generatedPdf(page, `/api/documents/${id}/pdf?version=${version}`).then(response => inspectPdf(page, f, id, label, response, expected, absent));

test("REQ leva observação zero/decimal/desconhecida, tempo e atendimento por item ao PDF atual e conserva a versão anterior e a origem legada", async ({ page }) => {
  const f = await fidelityRequisitionFixture(), legacy = await historicalSourceFixture(); await login(page, f.patient);
  await page.goto(`/historico/${f.doc.id}`);
  await selectDocumentSection(page, "workflow");
  const before = fidelityLedger(f.patient);
  const values = ["0 unidade (observado)", "1,234567 mL (observado)", "Não sei informar", "Não informado", "Registro no rascunho (horário do dispositivo)", "FIM DA OBSERVAÇÃO REQ"];
  const old = await issue(page, f, f.doc.id, f.initial.version, "req-before-acceptance", [...values, "Sem aceite positivo registrado"], ["Atendimento com aceite positivo registrado"]);
  await issue(page, f, f.doc.id, f.doc.version, "req-current", [...values, "Atendimento com aceite positivo registrado", "Sem aceite positivo registrado"]);
  expect(fidelityLedger(f.patient)).toBe(before);
  await page.goto("/historico");
  await selectContext(page, legacy.patient);
  await page.goto(`/historico/${legacy.doc.id}`);
  await selectDocumentSection(page, "workflow");
  await issue(page, legacy, legacy.doc.id, legacy.doc.version, "req-legacy", ["REQUISIÇÃO HISTÓRICA DE MATERIAIS", "Horário da informação desconhecido", "Atendimento não apurado na origem histórica"]);
  await page.goto("/historico");
  await selectContext(page, f.patient);
  await page.goto(`/historico/${f.doc.id}`);
  await selectDocumentSection(page, "workflow");
  const same = await page.request.get(`/api/documents/${f.doc.id}/pdf?issuance=${old.identity.id}`);
  expect(same.status()).toBe(200); expect((await same.body()).equals(old.bytes)).toBe(true);
});

test("ENT preserva a avaria original e separa devolução e falta por evento, autor e versão sem alterar o ledger ao emitir", async ({ page }) => {
  const f = await fidelityDeliveryFixture(); await login(page, f.patient); await page.goto(`/fichas/${f.doc.id}`);
  await selectDocumentSection(page, "workflow");
  const before = fidelityLedger(f.patient);
  await issue(page, f, f.doc.id, f.versions.received.version, "ent-received", [f.note, "Material avariado"], ["Devolução à origem", "Falta ou perda conciliada"]);
  const returned = await issue(page, f, f.doc.id, f.versions.returned.version, "ent-returned", [f.note, "Devolução à origem", "Uma unidade avariada foi devolvida à origem."], ["Outra unidade faltante foi conciliada sem inventar devolução."]);
  const current = await issue(page, f, f.doc.id, f.doc.version, "ent-missing", [f.note, "Devolução à origem", "Falta ou perda conciliada", "Outra unidade faltante foi conciliada sem inventar devolução."]);
  expect(current.frozen.snapshot.documentFacts.deliveryResolutions).toHaveLength(2);
  const same = await page.request.get(`/api/documents/${f.doc.id}/pdf?issuance=${returned.identity.id}`);
  expect((await same.body()).equals(returned.bytes)).toBe(true); expect(fidelityLedger(f.patient)).toBe(before);
});

test("COM distingue as três situações de parcela, proveniência, compra/doação e recupera uma reserva controlada V6 com assinatura real", async ({ page }) => {
  const f = await fidelityPurchaseFixture(); await login(page, f.patient); await page.goto(`/fichas/${f.doc.id}`);
  await selectDocumentSection(page, "workflow");
  await expect(page.getByText("Compra de insumos", { exact: true })).toBeVisible();
  const before = fidelityLedger(f.patient);
  const current = await issue(page, f, f.doc.id, f.doc.version, "com-receipts", ["COMPRA DE INSUMOS DA FAMÍLIA", "Aguardando conferência", "Recebimento rejeitado", "Recebimento validado", f.rejectedId, f.approvedId, f.pendingId, "Registro de chegada rejeitado; não comprova entrada de material."]);
  expect(current.frozen.snapshot.documentFacts.purchaseReceiptEvents).toHaveLength(5);
  const oldId = randomUUID(), oldKey = randomUUID();
  // Controlled V6 reservation, not a fake ready record or signed artifact.
  sql(`insert into private.pdf_issuances(id,document_id,version,care_recipient_id,requested_by,requested_name,requested_session,requested_at,idempotency_key,request_hash,verification_code,renderer_revision,representation,source_hash,snapshot,object_path) select ${sqlLiteral(oldId)},document_id,version,care_recipient_id,requested_by,requested_name,requested_session,requested_at,${sqlLiteral(oldKey)},encode(extensions.digest(jsonb_build_array('pdf-issuance',document_id,version)::text,'sha256'),'hex'),upper(encode(extensions.gen_random_bytes(16),'hex')),6,representation,source_hash,(select e.body from public.document_events e where e.document_id=private.pdf_issuances.document_id and e.version=private.pdf_issuances.version),'issuances/'||document_id||'/'||${sqlLiteral(oldId)}||'.pdf' from private.pdf_issuances where id=${sqlLiteral(current.identity.id)};`);
  const recovered = await page.request.post(`/api/documents/${f.doc.id}/issuances`, { timeout: 60_000, data: { idempotencyKey: oldKey, version: f.doc.version } });
  expect(recovered.status(), await recovered.text()).toBe(503);
  expect((await recovered.json()).error.code).toBe("CONTENT_INVALID");
  expect((await page.request.get(`/api/documents/${f.doc.id}/pdf?issuance=${oldId}`)).status()).toBe(404);
  expect(sql(`select state from private.pdf_issuances where id=${sqlLiteral(oldId)}`)).not.toBe("ready");
  const donation = await rpc(f.owner, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_draft: false, p_payload: { origin: "donation", lines: [{ productId: f.products[0], quantity: "1" }] } });
  await page.goto(`/fichas/${donation.id}`);
  await selectDocumentSection(page, "workflow"); await expect(page.getByText("Doação de insumos", { exact: true })).toBeVisible();
  await issue(page, f, donation.id, donation.version, "com-donation", ["DOAÇÃO DE INSUMOS À FAMÍLIA"]);
  expect(fidelityLedger(f.patient)).toBe(before);
});

test("BAL identifica primeira contagem e reconto, conserva parecer e aprovação antiga sem apresentá-los como vigentes e mantém o exemplar anterior", async ({ page }) => {
  const legacy = await legacyBalance({ policy: "optional" }), legacyOwner = await actor("family", legacy.patient);
  const first = await fidelityBalanceInitialFixture(); await login(page, first.patient); await page.goto(`/fichas/${first.doc.id}`);
  await selectDocumentSection(page, "workflow");
  await expect(page.getByText("Balanço do estoque da equipe · primeira contagem desta ficha", { exact: true })).toBeVisible();
  const old = await issue(page, first, first.doc.id, first.doc.version, "bal-first", ["PRIMEIRA CONTAGEM DESTA FICHA", "Primeira contagem desta ficha, sem afirmar primeira contagem da residência."]);
  const f = await recountFidelityBalance(first), before = fidelityLedger(f.patient);
  await page.reload(); await expect(page.getByText("Reconto do estoque da equipe", { exact: true })).toBeVisible();
  await issue(page, f, f.doc.id, f.doc.version, "bal-recount", ["RECONTO DO ESTOQUE DA EQUIPE", "Parecer independente da primeira contagem preservada.", "Registro de contagem anterior; não é parecer vigente da contagem atual.", "Aprovação de contagem anterior; não é aprovação vigente da contagem atual.", "Nova contagem física com autoria e política próprias."]);
  const same = await page.request.get(`/api/documents/${f.doc.id}/pdf?issuance=${old.identity.id}`);
  expect(same.status()).toBe(200); expect((await same.body()).equals(old.bytes)).toBe(true); expect(fidelityLedger(f.patient)).toBe(before);
  await page.goto("/historico");
  await selectContext(page, legacy.patient);
  await page.goto(`/fichas/${legacy.document.id}`);
  await selectDocumentSection(page, "workflow");
  await expect(page.getByText("Balanço do estoque da equipe · contexto de plantão não preservado", { exact: true })).toBeVisible();
  await issue(page, { patient: legacy.patient, owner: legacyOwner }, legacy.document.id, legacy.document.version, "bal-legacy", ["CONTEXTO DE PLANTÃO NÃO PRESERVADO", "Revisão facultativa"]);
});
