import { expect, test, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { fixtures, issue, rpc, setup } from "../integration/v4-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectDocumentSection } from "./document-sections";
import { loginDecision } from "./l1-decision-policy";
import { pdfIssuanceReference } from "./generated-pdf";

test.setTimeout(120_000);

const auxiliaryRoute = /\/api\/documents\/[^/]+\/issuances\/initial(?:\?.*)?$/;
const material = "Material fictício do PDF inicial";

function expectAuxiliarySequence(calls: string[], writes: string[]) {
  // The file tab can also read the same status while the result opens.
  expect(calls.filter(call => call !== "read")).toEqual(writes);
  let previous = -1;
  for (const write of writes) {
    const current = calls.indexOf(write, previous + 1);
    expect(calls.slice(previous + 1, current)).toContain("read");
    previous = current;
  }
  expect(calls.slice(previous + 1)).toContain("read");
}

async function issuePurchaseFromWizard(page: Page) {
  const { patient } = await setup({ catalogue: [{ name: material, category: "medicamentos", unit: "unidade", aliases: [] }] });
  const user = await shiftWorker(patient, "family");
  await loginDecision(page, user.email, patient);
  await page.goto("/fichas/com");
  await page.getByRole("button", { name: "Selecionar materiais", exact: true }).click();
  await page.getByRole("checkbox", { name: material + " unidade", exact: true }).check();
  await page.getByLabel("Quantidade — " + material, { exact: true }).fill("2");
  for (const label of ["Continuar", "Continuar", "Revisar ficha"])
    await page.getByRole("button", { name: label, exact: true }).click();
  const commit = page.waitForResponse(response => new URL(response.url()).pathname === "/api/documents" && response.request().method() === "POST");
  await page.getByRole("button", { name: "Emitir compra", exact: true }).click();
  const response = await commit;
  expect(response.ok(), await response.text()).toBe(true);
  const { data } = await response.json();
  return { patient, documentId: data.id as string, version: data.version as number };
}

test("COM emitida identifica a falha nos avisos e mantém o diagnóstico após duas recuperações", async ({ page }, info) => {
  const calls: string[] = [], correlationId = randomUUID();
  await page.route(auxiliaryRoute, async route => {
    if (route.request().method() === "GET") { calls.push("read"); return route.continue(); }
    if (new URL(route.request().url()).searchParams.get("phase") !== "notices") {
      calls.push("sign");
      return route.continue();
    }
    calls.push("notices");
    return route.fulfill({ status: 503, json: { code: "DATABASE_UNAVAILABLE", correlationId, error: "Detalhe fictício interno" } });
  });
  const { patient, documentId, version } = await issuePurchaseFromWizard(page);
  const result = page.getByRole("dialog", { name: "Compra emitida", exact: true });
  const recovery = result.getByRole("button", { name: "Recuperar avisos e PDF", exact: true });
  const support = result.locator("details").filter({ hasText: "Detalhes para suporte" });
  await expect(result).toContainText("O processamento dos avisos e o PDF de emissão ainda precisam ser confirmados.");
  await expect(result.getByRole("link", { name: "Baixar PDF", exact: true })).toHaveCount(0);
  await expect(support).not.toHaveAttribute("open", "");
  for (let attempt = 0; attempt < 2; attempt++) await recovery.click();
  const copy = result.locator(".hca-issuance-actions").getByRole("button", { name: "Copiar detalhes", exact: true });
  await expect(copy).toBeVisible();
  expectAuxiliarySequence(calls, ["notices", "notices", "notices"]);
  await expect(recovery).toHaveCount(0);
  await support.getByText("Detalhes para suporte", { exact: true }).click();
  const diagnostic = support.locator("pre");
  await expect(diagnostic).toContainText("Operação: Processar avisos da emissão");
  await expect(diagnostic).toContainText("Referência: " + correlationId);
  await expect(diagnostic).toContainText("Tentativas de recuperação: 2");
  await expect(diagnostic).not.toContainText("Detalhe fictício interno");
  await copy.click();
  await expect(result.getByText(/^(Diagnóstico copiado\.|Selecione e copie o diagnóstico\.)$/)).toHaveCount(1);
  await info.attach("emissao-confirmada-com-avisos-pendentes", { body: await page.screenshot(), contentType: "image/png" });
  await result.getByRole("button", { name: "Acompanhar ficha", exact: true }).click();
  await expect(page).toHaveURL(url => url.pathname === "/fichas/" + documentId);
  expect(sql(`select count(*) || ':' || max(version) from public.operational_documents where care_recipient_id=${q(patient)} and type='COM'`)).toBe(`1:${version}`);
  expect(sql(`select count(*) from private.pdf_issuances where document_id=${q(documentId)}`)).toBe("0");
});

test("COM reencontra o mesmo PDF inicial após perder as respostas dos avisos e da assinatura", async ({ page }) => {
  const calls: string[] = [], statuses: { id: string; state: string; issuanceId: string | null }[] = [];
  await page.route(auxiliaryRoute, async route => {
    if (route.request().method() === "GET") { calls.push("read"); return route.continue(); }
    const isNotices = new URL(route.request().url()).searchParams.get("phase") === "notices";
    calls.push(isNotices ? "notices" : "sign");
    const response = await route.fetch();
    expect(response.ok(), await response.text()).toBe(true);
    statuses.push(await response.json());
    await route.abort("failed");
  });
  const { patient, documentId, version } = await issuePurchaseFromWizard(page);
  const result = page.getByRole("dialog", { name: "Compra emitida", exact: true });
  const download = result.getByRole("link", { name: "Baixar PDF", exact: true });
  await expect(download).toBeVisible({ timeout: 70_000 });
  expectAuxiliarySequence(calls, ["notices", "sign"]);
  const [notices, signed] = statuses;
  expect(signed).toMatchObject({ id: notices.id, state: "ready", issuanceId: expect.any(String) });
  await expect(download).toHaveAttribute("href", `/api/documents/${documentId}/pdf?issuance=${signed.issuanceId}`);
  const artifact = await page.request.get((await download.getAttribute("href"))!);
  expect(artifact.ok()).toBe(true);
  expect((await pdfIssuanceReference(page, documentId, await artifact.body())).id).toBe(signed.issuanceId);
  expect(sql(`select count(*) from private.pdf_issuances where initial_request_id=${q(signed.id)}`)).toBe("1");
  expect(sql(`select count(*) || ':' || max(version) from public.operational_documents where care_recipient_id=${q(patient)} and type='COM'`)).toBe(`1:${version}`);
});

test("worker signs the queued initial PDF with system authorship and keeps the official COM unchanged", async ({ page }, info) => {
  const { admin, patient, products } = await setup();
  const draft = await rpc(admin, "create_supply_document", {
    p_patient: patient, p_type: "COM", p_draft: false, p_key: randomUUID(),
    p_payload: { origin: "purchase", lines: [{ productId: products[0], quantity: "1" }] },
  });
  await loginDecision(page, fixtures.adminA.email, patient);
  await page.goto(`/historico/${draft.id}`);
  await selectDocumentSection(page, "files");
  const heading = page.getByRole("heading", { name: "Arquivos gerados", exact: true });
  expect((await heading.boundingBox())?.height).toBeLessThan(45);
  await expect(page.getByRole("link", { name: "Baixar PDF inicial", exact: true })).toHaveCount(0);
  await expect(page.getByText("A ficha está emitida. O PDF inicial ficará disponível após a assinatura e a conferência.")).toBeVisible();

  // Only prioritize this new fixture while retaining the rest of the local queue.
  sql(`update private.initial_document_pdf_requests set next_attempt_at='-infinity' where document_id=${q(draft.id)}`);
  const response = await page.request.post("/api/notifications/worker", {
    headers: { authorization: "Bearer local-test-worker-only" },
  });
  expect(response.status(), await response.text()).toBe(200);
  expect((await response.json()).data.externalConfigured).toBe(false);
  await page.getByRole("button", { name: "Atualizar arquivos", exact: true }).click();
  const download = page.getByRole("link", { name: "Baixar PDF inicial", exact: true });
  await expect(download).toBeVisible();
  await download.scrollIntoViewIfNeeded();
  await info.attach("pdf-inicial-assinado", { body: await page.screenshot(), contentType: "image/png" });
  const artifact = await page.request.get((await download.getAttribute("href"))!);
  expect(artifact.status()).toBe(200);
  const identity = await pdfIssuanceReference(page, draft.id, await artifact.body());
  const issued = await rpc(admin, "pdf_issuance", { p_id: identity.id });
  expect(issued).toMatchObject({
    requestedBy: null,
    requestedName: "Sistema · emissão inicial",
    version: draft.version,
    validation: { accepted: true, profile: "PAdES-B-T", wholeFile: true },
    snapshot: { createdBy: fixtures.adminA.id },
  });
  expect(sql(`select version from public.operational_documents where id=${q(draft.id)}`)).toBe(String(draft.version));
});

test("lost initial PDF response is recovered through the same signed REQ exemplar", async ({ page }) => {
  const { admin, patient, products } = await setup();
  const req = await issue(patient, [products[0]]);
  const endpoint = `/api/documents/${req.id}/issuances/initial`;
  await loginDecision(page, fixtures.adminA.email, patient);
  await page.goto(`/historico/${req.id}`);
  await selectDocumentSection(page, "files");
  let persisted: { id: string; issuanceId: string } | undefined;
  await page.route("**" + endpoint, async route => {
    if (route.request().method() !== "POST") return route.continue();
    const response = await route.fetch();
    expect(response.status(), await response.text()).toBe(200);
    persisted = await response.json();
    await route.abort("failed");
  });
  await page.getByRole("button", { name: "Recuperar PDF inicial", exact: true }).click();
  const download = page.getByRole("link", { name: "Baixar PDF inicial", exact: true });
  await expect(download).toBeVisible();
  await expect(page.getByText(/Ainda não foi possível confirmar o PDF inicial/)).toHaveCount(0);
  expect(await download.getAttribute("href")).toContain(persisted!.issuanceId);
  const repeated = await page.request.post(endpoint);
  expect(await repeated.json()).toMatchObject(persisted!);
  expect(sql(`select count(*) from private.pdf_issuances where initial_request_id=${q(persisted!.id)}`)).toBe("1");
  const unchanged = await rpc(admin, "requisition_progress", { p_id: req.id });
  expect(unchanged.version).toBe(1);
});
