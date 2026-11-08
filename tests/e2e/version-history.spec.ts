import { expect, test, type Page } from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { PDFDocument, PDFHexString, PDFName } from "pdf-lib";
import { versionHistoryFixture, historyHashes } from "../integration/version-history-fixtures.mjs";
import { fidelityDeliveryFixture, fidelityRequisitionFixture, fidelityBalanceInitialFixture, fidelityLedger } from "../integration/pdf-fidelity-fixtures.mjs";
import { actor, fixtures } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { generatedPdf } from "./generated-pdf";
import { audit } from "./accessibility-audit";

test.setTimeout(180_000);
const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
async function login(page: Page, patient?: string, email = fixtures.family.email) {
  await page.goto("/login"); await page.getByLabel("E-mail", { exact: true }).fill(email); await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click(); await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible();
  if (patient) await selectContext(page, patient);
}
const comparison = (page: Page) => page.getByRole("region", { name: "Comparação de versões", exact: true });
const frozen = (page: Page, version: number) => page.getByRole("article", { name: `Conteúdo preservado da versão ${version}`, exact: true });
test.afterEach(async ({ page }) => { await page.unrouteAll({ behavior: "wait" }); });

test("Histórico COM compara snapshots, não usa nome/catálogo posterior e conserva o arquivo e a seleção ao voltar", async ({ page, browser }, info) => {
  const f = await versionHistoryFixture(); await login(page, f.patient); await page.goto(`/fichas/${f.doc.id}`);
  const oldFile = await generatedPdf(page, `/api/documents/${f.doc.id}/pdf?version=${f.approved.version}`);
  expect(oldFile.status()).toBe(200); const bytes = await oldFile.body(), hash = digest(bytes), fileUrl = oldFile.url();
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  const fileIdentity = JSON.parse(pdf.catalog.lookup(PDFName.of("HCAIssuance"), PDFHexString).decodeText());
  expect(fileIdentity.version).toBe(f.approved.version); expect(pdf.getSubject()).toContain("Representação de versão histórica");
  const count = sql(`select count(*) from private.pdf_issuances where document_id=${sqlLiteral(f.doc.id)};`), ledger = fidelityLedger(f.patient);
  const deniedWriter = await f.writer.client.from("document_events").select("id").eq("document_id", f.doc.id);
  expect(deniedWriter.error).toBeNull(); expect(deniedWriter.data).toEqual([]);
  await page.getByRole("button", { name: "Versões e integridade", exact: true }).click();
  await page.getByRole("button", { name: `Consultar versão ${f.approved.version}`, exact: true }).click();
  await expect(frozen(page, f.approved.version)).toContainText(f.oldName); await expect(frozen(page, f.approved.version)).toContainText(f.oldProduct);
  await expect(frozen(page, f.approved.version)).not.toContainText(f.newName); await expect(frozen(page, f.approved.version)).not.toContainText(f.newProduct);
  const api = await page.request.get(`/api/documents/${f.doc.id}/history?version=${f.approved.version}`);
  expect(api.status(), await api.text()).toBe(200); expect(api.headers()["cache-control"]).toContain("no-store");
  const facts = (await api.json()).data;
  const oracle = JSON.parse(sql(`select jsonb_build_object('hash',content_hash,'name',actor_name,'quantity',body#>>'{lines,0,approved_quantity}') from public.document_events where document_id=${sqlLiteral(f.doc.id)} and version=${f.approved.version};`));
  expect(facts.selected.hash).toBe(oracle.hash); expect(facts.selected.actorName).toBe(oracle.name);
  expect(fileIdentity.sourceHash).toBe(oracle.hash);
  writeFileSync(info.outputPath("version-binding.json"), JSON.stringify({ documentId: f.doc.id, selectedVersion: f.approved.version, beforeVersion: f.initial.version, fileVersion: fileIdentity.version, fileSubject: pdf.getSubject(), sourceHash: oracle.hash, sha256: hash, identityMatchesFrozenEvent: true }) + "\n");
  expect(oracle.quantity).toMatch(/^2(?:\.0+)?$/); expect(facts.selected.facts.find((v: { key: string }) => v.key.endsWith("/approved_quantity")).value).toBe("2");
  const delta = comparison(page).getByRole("listitem").filter({ has: page.getByRole("heading", { name: `Materiais · ${f.oldProduct} · Quantidade aprovada`, exact: true }) });
  await expect(delta).toContainText("Antes · versão " + f.initial.version); await expect(delta).toContainText("Depois · versão " + f.approved.version); await expect(delta).toContainText("2");
  await expect(comparison(page).locator("textarea,input")).toHaveCount(0);
  for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 900 }); await audit(page, "D4 version history " + width); }
  await page.setViewportSize({ width: 390, height: 900 }); mkdirSync("output/playwright/phase-d", { recursive: true });
  await comparison(page).screenshot({ path: `output/playwright/phase-d/version-history-${info.project.name}.png` });
  await comparison(page).getByRole("link", { name: `Consultar arquivos da versão ${f.approved.version}`, exact: true }).click();
  await expect(page.getByRole("heading", { name: /Versão de origem/ })).toContainText(String(f.approved.version));
  const same = await page.request.get(fileUrl); expect(same.status()).toBe(200); expect(digest(await same.body())).toBe(hash);
  await page.getByRole("link", { name: "Voltar ao acompanhamento", exact: true }).click();
  await expect(comparison(page).getByRole("combobox", { name: "Versão consultada", exact: true })).toHaveValue(String(f.approved.version));
  await expect(frozen(page, f.approved.version)).toContainText(f.oldName);
  expect(historyHashes(f.doc.id)).toBe(f.hashes); expect(fidelityLedger(f.patient)).toBe(ledger);
  expect(sql(`select count(*) from private.pdf_issuances where document_id=${sqlLiteral(f.doc.id)};`)).toBe(count);
  for (const query of ["version=999999", "version=2&before=2", "version=1&before=2"]) expect((await page.request.get(`/api/documents/${f.doc.id}/history?${query}`)).status()).toBe(404);
  for (const query of ["version=null", "version=0", "version=1&version=2", "version=2&before=NaN"]) expect((await page.request.get(`/api/documents/${f.doc.id}/history?${query}`)).status()).toBe(400);
  const other = await browser.newContext({ baseURL: new URL(page.url()).origin }), otherPage = await other.newPage();
  try {
    expect((await otherPage.request.get(new URL(`/api/documents/${f.doc.id}/history?version=1`, page.url()).href)).status()).toBe(401);
    await login(otherPage, undefined, fixtures.adminB.email);
    const denied = await otherPage.request.get(`/api/documents/${f.doc.id}/history?version=1`); expect(denied.status()).toBe(403); expect(await denied.text()).not.toContain(f.oldName);
  } finally { await other.close(); }
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.family.id)},'com.read',false);`);
  expect((await page.request.get(`/api/documents/${f.doc.id}/history?version=2`)).status()).toBe(403);
  await page.reload(); await expect(page.getByText(f.oldName, { exact: false })).toHaveCount(0);
});

test("Histórico ENT separa motivo e ressalva por versão, recupera erro da seção e mantém foco de seleção durante demora", async ({ page }) => {
  const f = await fidelityDeliveryFixture(), hashes = historyHashes(f.doc.id); await login(page, f.patient); await page.goto(`/fichas/${f.doc.id}?historyVersion=${f.doc.version}`);
  await expect(frozen(page, f.doc.version)).toContainText(f.note); await expect(frozen(page, f.doc.version)).toContainText("Falta ou perda conciliada");
  await expect(comparison(page)).toContainText("Uma unidade avariada foi devolvida à origem.");
  const url = `**/api/documents/${f.doc.id}/history?*`;
  await page.route(url, route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Consulta fictícia temporariamente indisponível", correlationId: "history-controlled" }) }), { times: 1 });
  await comparison(page).getByRole("button", { name: "Atualizar histórico desta seção", exact: true }).click();
  await expect(comparison(page)).toContainText("Atualize esta seção"); await expect(comparison(page).locator("[aria-invalid],textarea,input")).toHaveCount(0);
  const retry = comparison(page).getByRole("button", { name: "Atualizar histórico desta seção", exact: true }); await retry.focus(); await retry.press("Enter");
  await expect(frozen(page, f.doc.version)).toBeVisible(); await expect(retry).toBeFocused();
  let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(url, async route => { await gate; await route.continue(); }, { times: 1 });
  const selector = comparison(page).getByRole("combobox", { name: "Versão consultada", exact: true }); await selector.focus(); await selector.selectOption(String(f.versions.returned.version));
  try { await expect(comparison(page).getByRole("status")).toContainText("Consultando"); await expect(selector).toBeFocused(); await expect(frozen(page, f.doc.version)).toHaveCount(0); }
  finally { release(); }
  await expect(frozen(page, f.versions.returned.version)).toContainText("Devolução à origem");
  await expect(frozen(page, f.versions.returned.version)).not.toContainText("Outra unidade faltante foi conciliada sem inventar devolução.");
  await expect(selector).toBeFocused(); await expect(page).toHaveURL(new RegExp(`historyVersion=${f.versions.returned.version}`));
  expect(historyHashes(f.doc.id)).toBe(hashes);
});

test("Histórico REQ e BAL usa a mesma leitura congelada, preserva decimal, observação desconhecida e contagem", async ({ page }) => {
  const req = await fidelityRequisitionFixture(), bal = await fidelityBalanceInitialFixture(); await login(page, req.patient);
  await page.goto(`/historico/${req.doc.id}?historyVersion=${req.doc.version}`);
  await expect(frozen(page, req.doc.version)).toContainText("1,234567"); await expect(frozen(page, req.doc.version)).toContainText("Não sabe informar"); await expect(frozen(page, req.doc.version)).toContainText("Não preenchido");
  await expect(frozen(page, req.doc.version)).toContainText("FIM DA OBSERVAÇÃO REQ");
  const reqFacts = await page.request.get(`/api/documents/${req.doc.id}/history?version=${req.initial.version}`); expect(reqFacts.status(), await reqFacts.text()).toBe(200);
  expect((await reqFacts.json()).data.selected.version).toBe(req.initial.version);
  await page.goto(`/fichas/${bal.doc.id}?historyVersion=${bal.doc.version}`); await selectContext(page, bal.patient);
  await expect(frozen(page, bal.doc.version)).toContainText("Contagem");
  const balFacts = await page.request.get(`/api/documents/${bal.doc.id}/history?version=${bal.doc.version}`); expect(balFacts.status(), await balFacts.text()).toBe(200);
  expect((await balFacts.json()).data.selected.type).toBe("BAL");
});

test("Histórico permite leitura autorizada sem capacidades de compra e recusa comando sem alterar a ficha", async ({ page }) => {
  const f = await versionHistoryFixture();
  for (const [capability, enabled] of [["com.read", true], ["com.create", false], ["com.approve", false], ["com.purchase", false]] as const)
    sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.family.id)},${sqlLiteral(capability)},${enabled});`);
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.professional.id)},'com.read',true);`);
  const clinical = await actor("professional", f.patient);
  expect((await clinical.rpc("operational_document", { p_id: f.doc.id })).error?.code).toBe("42501");
  const clinicalRows = await clinical.from("document_events").select("id").eq("document_id", f.doc.id); expect(clinicalRows.error).toBeNull(); expect(clinicalRows.data).toEqual([]);
  await login(page, f.patient); await page.goto(`/fichas/${f.doc.id}?historyVersion=${f.approved.version}`);
  await expect(frozen(page, f.approved.version)).toContainText(f.oldName); await expect(frozen(page, f.approved.version)).toContainText(f.oldProduct);
  const read = await page.request.get(`/api/documents/${f.doc.id}/history?version=${f.approved.version}`); expect(read.status(), await read.text()).toBe(200);
  const denied = await page.request.post(`/api/documents/${f.doc.id}`, { data: { action: "purchase", body: { lines: [{ lineId: f.doc.lines[0].id, quantity: "1" }] }, idempotencyKey: randomUUID(), expectedVersion: f.doc.version } });
  expect(denied.status(), await denied.text()).toBe(403); expect(historyHashes(f.doc.id)).toBe(f.hashes);
  await expect(comparison(page).locator("textarea,input")).toHaveCount(0);
});
