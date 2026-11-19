import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { fixtures, issue, rpc, setup } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { selectDocumentSection } from "./document-sections";
import { loginDecision } from "./l1-decision-policy";
import { pdfIssuanceReference } from "./generated-pdf";

test.setTimeout(120_000);

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
