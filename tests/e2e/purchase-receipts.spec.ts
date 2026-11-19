import { expectNoOperationalDocumentAction } from "./document-sections";
import { openOperationalDocumentAction } from "./document-sections";
import { confirmDecisionAndReconcile } from "./l1-decision-policy";
import { selectDocumentSection, openDocumentMore } from "./document-sections";
import { generatedPdf } from "./generated-pdf";
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { setup, actor, rpc, fixtures } from "../integration/v4-fixtures.mjs";
import { fixtureFile, sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";
import { selectContext } from "./auth-context";
import { audit, auditFromTop } from "./accessibility-audit";
import { arrivalCard, chooseArrivalAction, confirmArrivalReview, openArrivalReview } from "./purchase-arrival-review";

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
  await openOperationalDocumentAction(page, "Registrar chegada");
  const field = page.locator(`input[name="${lineId}"]`);
  await expect(field).toHaveValue("");
  await field.fill("1");
  const arrival = page.getByRole("dialog", { name: "Registrar chegada", exact: true });
  await expect(arrival.getByText("Restam 7 unidade", { exact: true })).toBeVisible();
  await expect(arrival.getByText("A família poderá usar essas quantidades após a aprovação do administrador.", { exact: false })).toBeVisible();
  await arrival.getByRole("combobox", { name: "Destino da falta · Material fictício V4 0", exact: true }).selectOption("short");
  let arrivalAttempts = 0;
  const arrivalPayloads: unknown[] = [];
  await page.route("**/api/documents/" + document.id + "/decisions", async route => {
    if (route.request().method() !== "POST") { await route.continue(); return; }
    arrivalAttempts++; arrivalPayloads.push(route.request().postDataJSON());
    if (arrivalAttempts === 1) { await route.fetch(); await route.abort("failed"); } else await route.continue();
  });
  await confirmDecisionAndReconcile(page, document.id, arrival.getByRole("button", { name: "Enviar para aprovação", exact: true }));
  const result = page.getByRole("dialog", { name: "Chegada enviada para aprovação", exact: true });
  await expect(result.getByText("Falta informada para conferência", { exact: true })).toBeVisible();
  await result.getByRole("button", { name: "Concluir", exact: true }).click();
  await expect(arrival).toHaveCount(0);
  await expect(page.locator(".hca-activity-overlay")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: document.code, exact: true })).toBeFocused();
  await expect(page.getByText("Chegada registrada e aguardando conferência.", { exact: false })).toBeVisible();
  expect(arrivalPayloads).toHaveLength(1);
  expect(sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`)).toBe(initialStock);
  await page.unroute("**/api/documents/" + document.id + "/decisions");
  document = await rpc(f.admin, "operational_document", { p_id: document.id });
  expect(document.receipts).toHaveLength(2);
  const pending = document.receipts.find((receipt: { state: string }) => receipt.state === "pending"); expect(Number(pending.lines[0].quantity)).toBe(1);
  await login(page, f.patient, "adminA"); await page.goto("/fichas/" + document.id);
  await selectDocumentSection(page, "workflow");
  const review = await openArrivalReview(page);
  const card = arrivalCard(review, pending.id);
  await expect(card.getByText("1 unidade informados", { exact: true })).toBeVisible(); await expect(card.getByRole("textbox")).toHaveCount(0);
  await expect(card.getByText("Entrega encerrada com falta de 7 unidade.", { exact: true })).toBeVisible();
  const approval = await confirmArrivalReview(page, review, true);
  await expect(approval.result.getByText("Chegada aprovada", { exact: true })).toBeVisible();
  expect(approval.receipt.results).toMatchObject([{ receiptId: pending.id, status: "approved" }]);
  await approval.result.getByRole("button", { name: "Concluir", exact: true }).click();
  const final = await rpc(f.admin, "operational_document", { p_id: document.id });
  expect(final.receipts.find((receipt: { id: string }) => receipt.id === initialReceipt.id)).toEqual(initialReceipt);
  expect(Number(final.lines[0].accepted_quantity)).toBe(3); expect(final.receipts.find((receipt: { id: string }) => receipt.id === pending.id).validated_by).toBe(fixtures.adminA.id);
  expect(Number(final.purchaseProgress.lines[0].closedShortQuantity)).toBe(7);
  expect(sql(`select sum(quantity)::text from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)} and reference_type='purchase_receipt';`)).toBe("3.000000");
});

test("COM chegada combina código e preenchimento manual e exige confirmação do excedente", async ({ page }, info) => {
  test.setTimeout(150_000);
  const f = await setup();
  const created = await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "COM",
    p_payload: { origin: "purchase", lines: f.products.map(productId => ({ productId, quantity: "6" })) },
    p_key: randomUUID(), p_draft: false,
  });
  const [scanned, manual] = created.lines;
  const document = await rpc(f.admin, "supply_document_command", { p_id: created.id, p_action: "purchase",
    p_body: { lines: created.lines.map((line: { id: string }) => ({ lineId: line.id, quantity: "6" })) },
    p_key: randomUUID(), p_version: created.version,
  });
  await rpc(f.admin, "catalogue_presentation_command", {
    p_patient: f.patient, p_id: null, p_version: null, p_key: randomUUID(), p_body: {
      productId: scanned.product_id, barcode: "1234567890128", name: "Pacote com quatro unidades", baseQuantity: "4", active: true,
    },
  });
  await login(page, f.patient, "adminA"); await page.goto("/fichas/" + document.id);
  await selectDocumentSection(page, "workflow");
  await openOperationalDocumentAction(page, "Registrar chegada");
  const arrival = page.getByRole("dialog", { name: "Registrar chegada", exact: true });
  await arrival.getByRole("button", { name: "Ler código", exact: true }).click();
  const reader = page.getByRole("dialog", { name: "Ler código", exact: true });
  await reader.getByLabel("Código manual").fill("1234567890128");
  await reader.getByRole("button", { name: "Identificar", exact: true }).click();
  await expect(reader.getByText("4 unidade por embalagem", { exact: true })).toBeVisible();
  await reader.getByRole("textbox", { name: "Embalagens", exact: true }).fill("2");
  await reader.getByRole("button", { name: "Usar quantidade", exact: true }).click();
  await expect(arrival.locator(`input[name="${scanned.id}"]`)).toHaveValue("8");
  await arrival.getByRole("switch", { name: "Chegou · " + manual.name_snapshot, exact: true }).click();
  await arrival.locator(`input[name="${manual.id}"]`).fill("4");
  await expect(arrival.getByText("Restam 2 unidade", { exact: true })).toBeVisible();
  const scannedCard = arrival.locator("article").filter({ has: page.getByRole("heading", { name: scanned.name_snapshot, exact: true }) });
  await scannedCard.getByText("Estoque familiar", { exact: true }).click();
  await expect(scannedCard.getByText("Disponíveis hoje: 30 unidade · Com esta entrada: 38 unidade", { exact: true })).toBeVisible();
  const confirm = arrival.getByRole("button", { name: "Confirmar entrada", exact: true });
  await confirm.click();
  await expect(arrival.getByText("Confirme o excedente de " + scanned.name_snapshot, { exact: true })).toBeVisible();
  await arrival.getByRole("checkbox", { name: "Conferi 2 unidade a mais.", exact: true }).check();
  await audit(page, "COM chegada mista scanner");
  if (info.project.use.hasTouch) await info.attach("E05-09 chegada", { body: await page.screenshot({ scale: "css", animations: "disabled" }), contentType: "image/png" });
  await confirm.click();
  const result = page.getByRole("dialog", { name: "Entrada confirmada", exact: true });
  await expect(result.getByText("Aguardando nova entrega", { exact: true })).toBeVisible();
  await result.getByRole("button", { name: "Concluir", exact: true }).click();
  const read = await rpc(f.admin, "operational_document", { p_id: document.id });
  expect(read.receipts[0].lines).toEqual([
    expect.objectContaining({ lineId: scanned.id, quantity: "8", expectedQuantity: "6", excessConfirmed: true }),
    expect.objectContaining({ lineId: manual.id, quantity: "4", expectedQuantity: "6", remainingAction: "wait" }),
  ]);
  const pdf = await generatedPdf(page, "/api/documents/" + document.id + "/pdf");
  expect(pdf.ok(), await pdf.text()).toBe(true);
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
});

test("COM registra a falta sem anunciar entrada quando nenhuma unidade chega", async ({ page }) => {
  test.setTimeout(90_000);
  const f = await setup(), family = await actor("family", f.patient);
  const created = await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "COM",
    p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity: "6" }] },
    p_key: randomUUID(), p_draft: false,
  });
  const line = created.lines[0];
  const document = await rpc(f.admin, "supply_document_command", { p_id: created.id, p_action: "purchase",
    p_body: { lines: [{ lineId: line.id, quantity: "6" }] }, p_key: randomUUID(), p_version: created.version,
  });
  const pending = await rpc(family, "supply_document_command", { p_id: document.id, p_action: "receive",
    p_body: { lines: [{ lineId: line.id, quantity: "0", expectedQuantity: "6", remainingAction: "wait" }] },
    p_key: randomUUID(), p_version: document.version,
  });
  await login(page, f.patient, "adminA");
  await page.goto("/fichas/" + document.id);
  await selectDocumentSection(page, "workflow");
  const review = await openArrivalReview(page);
  const approved = await confirmArrivalReview(page, review);
  await expect(approved.result.getByText("Chegada aprovada sem movimentação de estoque", { exact: true })).toBeVisible();
  await approved.result.getByRole("button", { name: "Concluir", exact: true }).click();

  await openOperationalDocumentAction(page, "Registrar chegada");
  const arrival = page.getByRole("dialog", { name: "Registrar chegada", exact: true });
  await arrival.locator(`input[name="${line.id}"]`).fill("0");
  await arrival.getByRole("combobox", { name: "Destino da falta · " + line.name_snapshot, exact: true }).selectOption("short");
  await arrival.getByRole("button", { name: "Confirmar entrada", exact: true }).click();
  const result = page.getByRole("dialog", { name: "Conferência registrada", exact: true });
  await expect(result.getByText("A conferência foi registrada sem movimentação de estoque.", { exact: true })).toBeVisible();
  await expect(result.getByText("Falta registrada", { exact: true })).toBeVisible();
  await result.getByRole("button", { name: "Concluir", exact: true }).click();
  await expect(page.getByText("Conferência registrada sem movimentação de estoque.", { exact: true })).toBeVisible();
  await expect(page.getByText(/Não foi possível conferir o saldo das entradas/)).toHaveCount(0);
  await expect(page.getByText("Sem entrada validada", { exact: true }).first()).toHaveCount(1);
  const read = await rpc(f.admin, "operational_document", { p_id: document.id });
  expect(read.receipts.find((receipt: { id: string }) => receipt.id === pending.receipts[0].id).state).toBe("approved");
  expect(Number(read.purchaseProgress.lines[0].closedShortQuantity)).toBe(6);
  expect(sql(`select count(*) from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)} and reference_type='purchase_receipt';`)).toBe("0");
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
  await page.getByRole("menuitem", { name: "Encerrar expectativa restante", exact: true }).click();
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Revisar operação", exact: true }) });
  await form.getByRole("textbox", { name: "Motivo / justificativa", exact: true }).fill("Motivo fictício preservado depois da mudança de versão.");
  const consent = form.getByRole("checkbox", { name: "Conferi o resumo e confirmo dispensar somente a expectativa não adquirida.", exact: true }); await consent.check();
  await form.getByRole("button", { name: "Revisar operação", exact: true }).click();
  const review = page.getByRole("dialog", { name: "Revisar encerramento da expectativa", exact: true }); await expect(review).toBeVisible();
  const newer = await rpc(family, "supply_document_command", { p_id: document.id, p_action: "purchase", p_body: { lines: [{ lineId, quantity: "1" }] }, p_key: randomUUID(), p_version: document.version });
  const payloads: { intention: { expectedVersion: number }; key: string }[] = [];
  await page.route("**/api/documents/" + document.id + "/decisions", async route => { if (route.request().method() === "POST") payloads.push(route.request().postDataJSON()); await route.continue(); });
  await review.getByRole("button", { name: "Confirmar encerramento da expectativa", exact: true }).click(); await expect(review).toHaveCount(0);
  await expect(page.locator(".hca-activity-overlay")).toHaveCount(0);
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
  await expect(page.locator(".hca-activity-overlay")).toHaveCount(0);
  const final = await rpc(f.admin, "operational_document", { p_id: document.id });
  expect(Number(final.lines[0].waived_quantity)).toBe(7); expect(Number(final.lines[0].purchased_quantity)).toBe(3); expect(final.purchaseProgress.physicalPending).toBe(true);
  expect(final.events.filter((event: { action: string }) => event.action === "com.close_expectation")).toHaveLength(1);
  expect(payloads).toHaveLength(2); expect(payloads.map(payload => payload.intention.expectedVersion)).toEqual([document.version, newer.version]); expect(payloads[0].key).not.toBe(payloads[1].key);
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
  await page.getByRole("menuitem", { name: "Encerrar expectativa restante", exact: true }).click();
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
  await expect(page.locator(".hca-activity-overlay")).toHaveCount(0);
  expect(Number((await rpc(f.admin, "operational_document", { p_id: document.id })).lines[0].waived_quantity)).toBe(0);
  await expect(form.getByRole("textbox", { name: "Motivo / justificativa", exact: true })).toHaveValue("Encerramento fictício: os 8 restantes não serão adquiridos.");
  await form.getByRole("button", { name: "Revisar operação", exact: true }).click();
  await expect(review).toBeVisible();
  for (const width of [1440, 768, 390, 320]) { await page.setViewportSize({ width, height: 900 }); await audit(page, "COM closure review " + width); expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true); }
  mkdirSync("output/playwright/phase-d", { recursive: true }); await page.screenshot({ path: `output/playwright/phase-d/purchase-close-review-${info.project.name}.png`, animations: "disabled" });
  let attempts = 0;
  const payloads: unknown[] = [];
  await page.route("**/api/documents/" + document.id + "/decisions", async route => {
    if (route.request().method() !== "POST") { await route.continue(); return; }
    attempts++; payloads.push(route.request().postDataJSON());
    if (attempts === 1) { await route.fetch(); await route.abort("failed"); } else await route.continue();
  });
  await confirmDecisionAndReconcile(page, document.id, review.getByRole("button", { name: "Confirmar encerramento da expectativa", exact: true })); await expect(review).toHaveCount(0);
  await expect(page.locator(".hca-activity-overlay")).toHaveCount(0);
  expect(payloads).toHaveLength(1);
  await page.unroute("**/api/documents/" + document.id + "/decisions");
  document = await rpc(f.admin, "operational_document", { p_id: document.id });
  expect(document.purchaseProgress.state).toBe("closed_pending_validation"); expect(Number(document.lines[0].waived_quantity)).toBe(8); expect(Number(document.lines[0].accepted_quantity)).toBe(0);
  expect(sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`)).toBe(initialStock);
  await expect(page.getByRole("region", { name: "Resumo da ficha", exact: true }).getByText("Expectativa encerrada · parcelas aguardam conferência", { exact: true })).toBeVisible();
  await expect(page.locator(".hca-document-name p")).toHaveText("Doação de insumos");
  expect(await page.locator(".hca-document-header").getByText("Expectativa encerrada · parcelas aguardam conferência", { exact: true }).evaluate(element => {
    const range = document.createRange(); range.selectNodeContents(element);
    const text = range.getBoundingClientRect(), badge = element.getBoundingClientRect();
    return text.top >= badge.top - 1 && text.bottom <= badge.bottom + 1;
  }), "o texto do estado deve caber verticalmente na cápsula a 320 px").toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await page.locator(".hca-document-header").screenshot({ path: `output/playwright/phase-d/purchase-pending-header-${info.project.name}.png`, animations: "disabled" });
  await expectNoOperationalDocumentAction(page, "Registrar chegada");
  const pendingPdf = await generatedPdf(page, `/api/documents/${document.id}/pdf`); expect(pendingPdf.ok()).toBe(true);
  if (info.project.name === "chromium") { mkdirSync("output/pdf/phase-d", { recursive: true }); writeFileSync(`output/pdf/phase-d/purchase-expectation-${document.id}-v${document.version}-pending.pdf`, await pendingPdf.body(), { flag: "wx" }); }
  const arrivalReview = await openArrivalReview(page);
  await expect(arrivalCard(arrivalReview, receipt.id).getByText("2 unidade informados", { exact: true })).toBeVisible();
  await expect(arrivalReview.getByRole("textbox")).toHaveCount(0);
  const validated = await confirmArrivalReview(page, arrivalReview);
  await validated.result.getByRole("button", { name: "Concluir", exact: true }).click();
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
  // This is a whole-page check. WebKit's retained scroll after focus restoration
  // can otherwise leave an ordinary link partially behind the sticky header.
  await auditFromTop(page, "COM closed below quantity 320"); await page.screenshot({ path: `output/playwright/phase-d/purchase-closed-${info.project.name}.png`, fullPage: true, animations: "disabled" });
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
  const review = await openArrivalReview(page);
  const card = arrivalCard(review, original.id);
  await expect(card.getByText("2 unidade informados", { exact: true })).toBeVisible();
  await expect(card.getByRole("textbox")).toHaveCount(0);
  await chooseArrivalAction(card, "Recusar chegada", "Parcela fictícia rejeitada após conferir a declaração.");
  const rejected = await confirmArrivalReview(page, review, true);
  await expect(rejected.result.getByText("Chegada recusada", { exact: true })).toBeVisible();
  expect(rejected.receipt.results).toMatchObject([{ receiptId: original.id, status: "rejected" }]);
  await rejected.result.getByRole("button", { name: "Concluir", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Parcela 1 · Rejeitada", exact: true })).toBeVisible();
  const final = await rpc(f.admin, "operational_document", { p_id: document.id }), receipt = final.receipts[0];
  expect(receipt.id).toBe(original.id); expect(receipt.lines).toEqual(original.lines); expect(receipt.submitted_by).toBe(original.submitted_by); expect(receipt.submitted_name).toBe(original.submitted_name);
  expect(receipt.state).toBe("rejected"); expect(receipt.validated_by).toBe(fixtures.adminA.id); expect(Number(final.lines[0].accepted_quantity)).toBe(0);
  expect(final.events.filter((event: { action: string }) => event.action === "com.reject_receipt")).toHaveLength(1);
  expect(sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)};`)).toBe(initialStock);
});
