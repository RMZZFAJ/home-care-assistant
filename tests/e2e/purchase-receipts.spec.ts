import { selectDocumentSection, openDocumentMore } from "./document-sections";
import { generatedPdf } from "./generated-pdf";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { setup, actor, rpc, fixtures } from "../integration/v4-fixtures.mjs";
import { fixtureFile, sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit } from "./accessibility-audit";

async function login(page: Page, patient: string, role: "family" | "adminA") {
  const fixture = JSON.parse(readFileSync(fixtureFile, "utf8"));
  await page.context().clearCookies(); await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(fixture[role].email); await page.getByLabel("Senha", { exact: true }).fill(fixturePassword);
  await page.getByRole("button", { name: "Entrar", exact: true }).click(); await expect(page.getByRole("heading", { name: "Visão geral", exact: true })).toBeVisible(); await selectContext(page, patient);
}

test("COM chegada nova começa vazia e a decisão da parcela conserva quantidades declaradas", async ({ page }) => {
  test.setTimeout(150_000);
  const f = await setup(), family = await actor("family", f.patient);
  let document = await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity: "10" }] }, p_key: randomUUID(), p_draft: false });
  const lineId = document.lines[0].id;
  document = await rpc(family, "supply_document_command", { p_id: document.id, p_action: "purchase", p_body: { lines: [{ lineId, quantity: "10" }] }, p_key: randomUUID(), p_version: document.version });
  document = await rpc(f.admin, "supply_document_command", { p_id: document.id, p_action: "receive", p_body: { lines: [{ lineId, quantity: "2" }] }, p_key: randomUUID(), p_version: document.version });
  const initialReceipt = document.receipts[0], initialStock = sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`);
  await login(page, f.patient, "family"); await page.goto("/fichas/" + document.id);
  await selectDocumentSection(page, "workflow");
  await page.getByRole("button", { name: /^(Confirmar recebimento|Informar nova chegada)$/ }).click();
  const field = page.locator(`input[name="${lineId}"]`);
  await expect(field).toHaveValue("");
  await field.fill("1"); await page.getByRole("button", { name: "Revisar operação", exact: true }).click();
  const review = page.getByRole("dialog", { name: "Revisar operação definitiva", exact: true }); await expect(review).toBeVisible();
  await expect(review.getByText("Material fictício V4 0: 1 unidade", { exact: false })).toBeVisible();
  await expect(review.getByText("Registrar esta chegada para conferência, sem entrada no estoque até a validação autorizada.", { exact: false })).toBeVisible();
  await expect(review.locator("input")).toHaveCount(0);
  let arrivalAttempts = 0;
  const arrivalPayloads: unknown[] = [];
  await page.route("**/api/documents/" + document.id, async route => {
    if (route.request().method() !== "POST") { await route.continue(); return; }
    arrivalAttempts++; arrivalPayloads.push(route.request().postDataJSON());
    if (arrivalAttempts === 1) { await route.fetch(); await route.abort("failed"); } else await route.continue();
  });
  await review.getByRole("button", { name: "Confirmar operação", exact: true }).click();
  await expect(review.getByRole("button", { name: "Recuperar tentativa", exact: true })).toBeVisible();
  await expect(review.getByText("O resultado ainda não foi confirmado.", { exact: false })).toBeVisible();
  await expect(review.getByRole("button", { name: "Fechar diálogo", exact: true })).toBeDisabled();
  await review.getByRole("button", { name: "Recuperar tentativa", exact: true }).click(); await expect(review).toHaveCount(0);
  await expect(page.getByRole("heading", { name: document.code, exact: true })).toBeFocused();
  await expect(page.getByText("Chegada registrada e aguardando conferência.", { exact: false })).toBeVisible();
  expect(arrivalPayloads).toHaveLength(2); expect(arrivalPayloads[0]).toEqual(arrivalPayloads[1]);
  expect(sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`)).toBe(initialStock);
  await page.unroute("**/api/documents/" + document.id);
  document = await rpc(f.admin, "operational_document", { p_id: document.id });
  expect(document.receipts).toHaveLength(2);
  const pending = document.receipts.find((receipt: { state: string }) => receipt.state === "pending"); expect(Number(pending.lines[0].quantity)).toBe(1);
  await login(page, f.patient, "adminA"); await page.goto("/fichas/" + document.id);
  await selectDocumentSection(page, "workflow");
  await page.getByRole("button", { name: "Validar recebimento", exact: true }).click();
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Revisar operação", exact: true }) });
  await expect(form.getByRole("heading", { name: "Parcela selecionada", exact: true })).toBeVisible();
  await expect(form.getByText("1 unidade", { exact: true })).toBeVisible(); await expect(form.locator("input")).toHaveCount(0);
  let validationAttempts = 0;
  const validationPayloads: unknown[] = [];
  await page.route("**/api/documents/" + document.id, async route => {
    if (route.request().method() !== "POST") { await route.continue(); return; }
    validationAttempts++; validationPayloads.push(route.request().postDataJSON());
    if (validationAttempts === 1) { await route.fetch(); await route.abort("failed"); } else await route.continue();
  });
  await form.getByRole("button", { name: "Revisar operação", exact: true }).click();
  await review.getByRole("button", { name: "Confirmar operação", exact: true }).click();
  await expect(review.getByRole("button", { name: "Recuperar tentativa", exact: true })).toBeVisible();
  await review.getByRole("button", { name: "Recuperar tentativa", exact: true }).click(); await expect(review).toHaveCount(0);
  await expect(page.getByText("Parcela validada.", { exact: false })).toBeVisible(); expect(validationPayloads).toHaveLength(2); expect(validationPayloads[0]).toEqual(validationPayloads[1]);
  const final = await rpc(f.admin, "operational_document", { p_id: document.id });
  expect(final.receipts.find((receipt: { id: string }) => receipt.id === initialReceipt.id)).toEqual(initialReceipt);
  expect(Number(final.lines[0].accepted_quantity)).toBe(3); expect(final.receipts.find((receipt: { id: string }) => receipt.id === pending.id).validated_by).toBe(fixtures.adminA.id);
  expect(sql(`select sum(quantity)::text from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)} and reference_type='purchase_receipt';`)).toBe("3.000000");
});

test("COM conflito compara a expectativa atual, preserva o motivo e exige nova concordância antes de dispensar", async ({ page }) => {
  test.setTimeout(150_000);
  const f = await setup(), family = await actor("family", f.patient);
  let document = await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity: "10" }] }, p_key: randomUUID(), p_draft: false });
  const lineId = document.lines[0].id;
  for (const p_action of ["purchase", "receive"]) document = await rpc(family, "supply_document_command", { p_id: document.id, p_action, p_body: { lines: [{ lineId, quantity: "2" }] }, p_key: randomUUID(), p_version: document.version });
  const initialStock = sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`);
  await login(page, f.patient, "adminA"); await page.goto("/fichas/" + document.id);
  await selectDocumentSection(page, "workflow");
  await openDocumentMore(page);
  await page.getByRole("button", { name: "Encerrar expectativa restante", exact: true }).click();
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Revisar operação", exact: true }) });
  await form.getByRole("textbox", { name: "Motivo / justificativa", exact: true }).fill("Motivo fictício preservado depois da mudança de versão.");
  const consent = form.getByRole("checkbox", { name: "Conferi o resumo e confirmo dispensar somente a expectativa não adquirida.", exact: true }); await consent.check();
  await form.getByRole("button", { name: "Revisar operação", exact: true }).click();
  const review = page.getByRole("dialog", { name: "Revisar encerramento da expectativa", exact: true }); await expect(review).toBeVisible();
  const newer = await rpc(family, "supply_document_command", { p_id: document.id, p_action: "purchase", p_body: { lines: [{ lineId, quantity: "1" }] }, p_key: randomUUID(), p_version: document.version });
  const payloads: { expectedVersion: number; idempotencyKey: string }[] = [];
  await page.route("**/api/documents/" + document.id, async route => { if (route.request().method() === "POST") payloads.push(route.request().postDataJSON()); await route.continue(); });
  await review.getByRole("button", { name: "Confirmar encerramento da expectativa", exact: true }).click(); await expect(review).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Consultar versão atual da COM", exact: true })).toBeVisible();
  await expect(form.getByRole("textbox", { name: "Motivo / justificativa", exact: true })).toHaveValue("Motivo fictício preservado depois da mudança de versão.");
  expect(Number((await rpc(f.admin, "operational_document", { p_id: document.id })).lines[0].waived_quantity)).toBe(0);
  let historyFault = 403;
  await page.route(`**/api/documents/${document.id}/history?**`, async route => {
    const query = new URL(route.request().url()).searchParams;
    expect(query.get("before")).toBe(String(document.version));
    expect(query.get("version")).toBe(String(newer.version));
    if (historyFault) return route.fulfill({ status: historyFault, contentType: "application/json", body: JSON.stringify(historyFault === 200 ? { data: {} } : { code: "FORBIDDEN", error: "Referência fictícia recusada" }) });
    return route.continue();
  });
  await page.getByRole("button", { name: "Consultar versão atual da COM", exact: true }).click();
  const facts = page.getByRole("region", { name: "Fatos oficiais das referências da operação", exact: true });
  const adopt = page.getByRole("button", { name: "Usar versão atual e revisar novamente", exact: true });
  for (const next of [200, 0]) {
    await expect(facts.getByRole("alert")).toContainText("Não foi possível conferir as referências oficiais");
    await expect(facts.getByRole("article")).toHaveCount(0);
    await expect(adopt).toBeDisabled();
    await expect(form.getByRole("textbox", { name: "Motivo / justificativa", exact: true })).toHaveValue("Motivo fictício preservado depois da mudança de versão.");
    historyFault = next;
    await facts.getByRole("button", { name: "Consultar novamente as referências da operação", exact: true }).click();
  }
  await expect(facts.getByRole("article", { name: `Conteúdo preservado da versão ${newer.version}`, exact: true })).toBeVisible();
  const comparison = page.getByRole("region", { name: "Comparar versões da COM", exact: true });
  await expect(comparison.getByText("8 unidade → 7 unidade", { exact: true })).toBeVisible(); await expect(comparison.locator("input,textarea,select")).toHaveCount(0);
  await page.getByRole("button", { name: "Usar versão atual e revisar novamente", exact: true }).click();
  await expect(consent).not.toBeChecked(); await expect(consent).toBeFocused();
  await expect(form.getByRole("textbox", { name: "Motivo / justificativa", exact: true })).toHaveValue("Motivo fictício preservado depois da mudança de versão.");
  await consent.check(); await form.getByRole("button", { name: "Revisar operação", exact: true }).click();
  await review.getByRole("button", { name: "Confirmar encerramento da expectativa", exact: true }).click(); await expect(review).toHaveCount(0);
  const final = await rpc(f.admin, "operational_document", { p_id: document.id });
  expect(Number(final.lines[0].waived_quantity)).toBe(7); expect(Number(final.lines[0].purchased_quantity)).toBe(3); expect(final.purchaseProgress.physicalPending).toBe(true);
  expect(final.events.filter((event: { action: string }) => event.action === "com.close_expectation")).toHaveLength(1);
  expect(payloads).toHaveLength(2); expect(payloads.map(payload => payload.expectedVersion)).toEqual([document.version, newer.version]); expect(payloads[0].idempotencyKey).not.toBe(payloads[1].idempotencyKey);
  expect(sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`)).toBe(initialStock);
});

test("COM encerra apenas expectativa não adquirida, preserva conferência da parcela e emite PDFs distintos dos dois fatos", async ({ page }, info) => {
  test.setTimeout(150_000);
  const f = await setup(), family = await actor("family", f.patient);
  let document = await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_payload: { origin: "donation", lines: [{ productId: f.products[0], quantity: "10" }] }, p_key: randomUUID(), p_draft: false });
  const lineId = document.lines[0].id;
  for (const p_action of ["purchase", "receive"]) document = await rpc(family, "supply_document_command", { p_id: document.id, p_action, p_body: { lines: [{ lineId, quantity: "2" }] }, p_key: randomUUID(), p_version: document.version });
  const receipt = document.receipts[0], initialStock = sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`);
  await login(page, f.patient, "adminA"); await page.goto("/fichas/" + document.id);
  await selectDocumentSection(page, "workflow");
  await openDocumentMore(page);
  await page.getByRole("button", { name: "Encerrar expectativa restante", exact: true }).click();
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Revisar operação", exact: true }) });
  await expect(form.getByRole("heading", { name: "Expectativa que não será adquirida", exact: true })).toBeVisible();
  await expect(form.locator('input:not([type="checkbox"])')).toHaveCount(0);
  await expect(form.getByText("8 unidade", { exact: true })).toBeVisible();
  await form.getByLabel("Motivo / justificativa", { exact: true }).fill("Encerramento fictício: os 8 restantes não serão adquiridos.");
  const consent = form.getByRole("checkbox", { name: "Conferi o resumo e confirmo dispensar somente a expectativa não adquirida.", exact: true });
  await expect(consent).not.toBeChecked(); await consent.check();
  await form.getByRole("button", { name: "Revisar operação", exact: true }).click();
  const review = page.getByRole("dialog", { name: "Revisar encerramento da expectativa", exact: true });
  await expect(review).toBeVisible(); await expect(review.locator("input,textarea,select")).toHaveCount(0);
  await review.getByRole("button", { name: "Manter restante", exact: true }).click(); await expect(review).toHaveCount(0);
  expect(Number((await rpc(f.admin, "operational_document", { p_id: document.id })).lines[0].waived_quantity)).toBe(0);
  await expect(form.getByRole("textbox", { name: "Motivo / justificativa", exact: true })).toHaveValue("Encerramento fictício: os 8 restantes não serão adquiridos.");
  await form.getByRole("button", { name: "Revisar operação", exact: true }).click();
  for (const width of [1440, 768, 390, 320]) { await page.setViewportSize({ width, height: 900 }); await audit(page, "COM closure review " + width); expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true); }
  mkdirSync("output/playwright/phase-d", { recursive: true }); await page.screenshot({ path: `output/playwright/phase-d/purchase-close-review-${info.project.name}.png`, animations: "disabled" });
  let attempts = 0;
  const payloads: unknown[] = [];
  await page.route("**/api/documents/" + document.id, async route => {
    if (route.request().method() !== "POST") { await route.continue(); return; }
    attempts++; payloads.push(route.request().postDataJSON());
    if (attempts === 1) { await route.fetch(); await route.abort("failed"); } else await route.continue();
  });
  await review.getByRole("button", { name: "Confirmar encerramento da expectativa", exact: true }).click();
  await expect(review.getByRole("button", { name: "Recuperar tentativa", exact: true })).toBeVisible();
  await expect(review.getByRole("button", { name: "Manter restante", exact: true })).toBeDisabled();
  await expect(review.getByText("O resultado ainda não foi confirmado.", { exact: false })).toBeVisible();
  await expect(review.getByRole("button", { name: "Fechar diálogo", exact: true })).toBeDisabled();
  await review.getByRole("button", { name: "Recuperar tentativa", exact: true }).click(); await expect(review).toHaveCount(0);
  expect(payloads).toHaveLength(2); expect(payloads[0]).toEqual(payloads[1]);
  await page.unroute("**/api/documents/" + document.id);
  document = await rpc(f.admin, "operational_document", { p_id: document.id });
  expect(document.purchaseProgress.state).toBe("closed_pending_validation"); expect(Number(document.lines[0].waived_quantity)).toBe(8); expect(Number(document.lines[0].accepted_quantity)).toBe(0);
  expect(sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`)).toBe(initialStock);
  await expect(page.getByText("Expectativa encerrada · parcelas aguardam conferência", { exact: true })).toBeVisible();
  await expect(page.locator(".hca-document-name p")).toHaveText("Doação de insumos");
  expect(await page.locator(".hca-document-header").getByText("Expectativa encerrada · parcelas aguardam conferência", { exact: true }).evaluate(element => {
    const range = document.createRange(); range.selectNodeContents(element);
    const text = range.getBoundingClientRect(), badge = element.getBoundingClientRect();
    return text.top >= badge.top - 1 && text.bottom <= badge.bottom + 1;
  }), "o texto do estado deve caber verticalmente na cápsula a 320 px").toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.locator(".hca-document-header").screenshot({ path: `output/playwright/phase-d/purchase-pending-header-${info.project.name}.png`, animations: "disabled" });
  await expect(page.getByRole("button", { name: "Informar nova chegada", exact: true })).toHaveCount(0);
  const pendingPdf = await generatedPdf(page, `/api/documents/${document.id}/pdf`); expect(pendingPdf.ok()).toBe(true);
  if (info.project.name === "chromium") { mkdirSync("output/pdf/phase-d", { recursive: true }); writeFileSync(`output/pdf/phase-d/purchase-expectation-${document.id}-v${document.version}-pending.pdf`, await pendingPdf.body(), { flag: "wx" }); }
  await page.getByRole("button", { name: "Validar recebimento", exact: true }).click();
  await expect(form.getByText("2 unidade", { exact: true })).toBeVisible(); await expect(form.locator("input")).toHaveCount(0);
  await form.getByRole("button", { name: "Revisar operação", exact: true }).click();
  const decision = page.getByRole("dialog", { name: "Revisar operação definitiva", exact: true }); await decision.getByRole("button", { name: "Confirmar operação", exact: true }).click(); await expect(decision).toHaveCount(0);
  const final = await rpc(f.admin, "operational_document", { p_id: document.id });
  expect(final.purchaseProgress.state).toBe("closed_below_quantity"); expect(Number(final.lines[0].accepted_quantity)).toBe(2); expect(Number(final.lines[0].waived_quantity)).toBe(8);
  expect(final.receipts.find((row: { id: string }) => row.id === receipt.id).state).toBe("approved");
  expect(sql(`select sum(quantity)::text from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)} and reference_type='purchase_receipt';`)).toBe("2.000000");
  await expect(page.getByText("Encerrada com quantidade inferior", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.locator(".hca-document-header").screenshot({ path: `output/playwright/phase-d/purchase-closed-header-${info.project.name}.png`, animations: "disabled" });
  const finalPdf = await generatedPdf(page, `/api/documents/${final.id}/pdf`); expect(finalPdf.ok()).toBe(true);
  expect((await finalPdf.body()).equals(await pendingPdf.body())).toBe(false);
  if (info.project.name === "chromium") writeFileSync(`output/pdf/phase-d/purchase-expectation-${final.id}-v${final.version}-closed.pdf`, await finalPdf.body(), { flag: "wx" });
  await audit(page, "COM closed below quantity 320"); await page.screenshot({ path: `output/playwright/phase-d/purchase-closed-${info.project.name}.png`, fullPage: true, animations: "disabled" });
});

test("COM rejeita a parcela identificada em leitura, preserva declaração e recupera a decisão sem entrada de estoque", async ({ page }) => {
  test.setTimeout(120_000);
  const f = await setup(), family = await actor("family", f.patient);
  let document = await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity: "10" }] }, p_key: randomUUID(), p_draft: false });
  const lineId = document.lines[0].id;
  for (const p_action of ["purchase", "receive"]) document = await rpc(family, "supply_document_command", { p_id: document.id, p_action, p_body: { lines: [{ lineId, quantity: "2" }] }, p_key: randomUUID(), p_version: document.version });
  const original = document.receipts[0], initialStock = sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`);
  await login(page, f.patient, "adminA"); await page.goto("/fichas/" + document.id);
  await selectDocumentSection(page, "workflow");
  await page.getByRole("button", { name: "Rejeitar recebimento", exact: true }).click();
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Revisar operação", exact: true }) });
  await expect(form.getByRole("heading", { name: "Parcela selecionada", exact: true })).toBeVisible(); await expect(form.getByText("2 unidade", { exact: true })).toBeVisible(); await expect(form.locator("input")).toHaveCount(0);
  await form.getByRole("textbox", { name: "Motivo / justificativa", exact: true }).fill("Parcela fictícia rejeitada após conferir a declaração.");
  await form.getByRole("button", { name: "Revisar operação", exact: true }).click();
  const review = page.getByRole("dialog", { name: "Revisar operação definitiva", exact: true }); await expect(review.locator("input,textarea,select")).toHaveCount(0);
  let attempts = 0;
  const payloads: unknown[] = [];
  await page.route("**/api/documents/" + document.id, async route => {
    if (route.request().method() !== "POST") { await route.continue(); return; }
    attempts++; payloads.push(route.request().postDataJSON()); if (attempts === 1) { await route.fetch(); await route.abort("failed"); } else await route.continue();
  });
  await review.getByRole("button", { name: "Confirmar operação", exact: true }).click(); await expect(review.getByRole("button", { name: "Recuperar tentativa", exact: true })).toBeVisible();
  await review.getByRole("button", { name: "Recuperar tentativa", exact: true }).click(); await expect(review).toHaveCount(0);
  await expect(page.getByText("Parcela rejeitada. A declaração original foi preservada, sem entrada desta parcela no estoque.", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Parcela 1 · Rejeitada", exact: true })).toBeVisible(); expect(payloads).toHaveLength(2); expect(payloads[0]).toEqual(payloads[1]);
  const final = await rpc(f.admin, "operational_document", { p_id: document.id }), receipt = final.receipts[0];
  expect(receipt.id).toBe(original.id); expect(receipt.lines).toEqual(original.lines); expect(receipt.submitted_by).toBe(original.submitted_by); expect(receipt.submitted_name).toBe(original.submitted_name);
  expect(receipt.state).toBe("rejected"); expect(receipt.validated_by).toBe(fixtures.adminA.id); expect(Number(final.lines[0].accepted_quantity)).toBe(0);
  expect(final.events.filter((event: { action: string }) => event.action === "com.reject_receipt")).toHaveLength(1);
  expect(sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`)).toBe(initialStock);
});
