import { openDocumentAction, openDocumentMore, closeDocumentMore } from "./document-sections";
import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { PDF } from "@libpdf/core";
import { entOperationFixture, entSend } from "../integration/ent-operation-fixtures.mjs";
import { entTerminalFixture, terminalLedger } from "../integration/ent-terminal-fixtures.mjs";
import { autonomousReturnFixture } from "../integration/autonomous-return-fixtures.mjs";
import { actor, delivery, fixtures, issue, rpc, setup } from "../integration/v4-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { purchaseBalanceCommand } from "../integration/purchase-entry-balance-fixtures.mjs";
import { generatedPdf, pdfIssuanceReference } from "./generated-pdf";
import { confirmedOutcome, loginDecision, loseDecisionResponse, noPrivateWrites, privateFormCount } from "./l1-decision-policy";
import { arrivalCard, confirmArrivalReview } from "./purchase-arrival-review";
import type { SupplyDocument } from "../../src/types/documents";

test.setTimeout(180_000);

test("administrador reabre uma ENT mantendo a devolução, o cancelamento e o exemplar anterior", async ({ page }, info) => {
  const fixture = await entTerminalFixture({ kind: "cancelled" });
  const { doc, patient } = fixture;
  await loginDecision(page, fixtures.adminA.email, patient);
  await page.goto(`/historico/${doc.id}`);

  const endpoint = `/api/documents/${doc.id}/pdf`;
  const original = await generatedPdf(page, endpoint);
  expect(original.status()).toBe(200);
  const originalBytes = await original.body();
  const originalIssuance = await pdfIssuanceReference(page, doc.id, originalBytes);
  const stock = terminalLedger(patient);
  const drafts = privateFormCount(patient);
  const draftWrites = noPrivateWrites(page);

  await page.getByRole("button", { name: "Reverter cancelamento", exact: true }).click();
  const review = page.getByRole("dialog", { name: "Reverter decisão e reabrir", exact: true });
  await expect(review.getByText("Cancelamento fictício anterior a qualquer aceite pessoal")).toBeVisible();
  await expect(review.getByText("Decisão anterior preservada")).toBeVisible();
  await expect(review.getByText("Retorno registrado", { exact: true })).toBeVisible();
  const confirm = review.getByRole("button", { name: "Reabrir acompanhamento", exact: true });
  await expect(confirm).toBeDisabled();
  await info.attach("revisao-da-reabertura", { body: await page.screenshot(), contentType: "image/png" });
  const reason = "Reabertura fictícia para acompanhar a documentação";
  await review.getByRole("textbox", { name: "Justificativa da reversão" }).fill(reason);
  const decisionEndpoint = `/api/documents/${doc.id}/decisions`;
  const packets = await loseDecisionResponse(page, decisionEndpoint);
  const recoveryKeys: string[] = [];
  await page.route(`**${decisionEndpoint}/reconcile`, async route => {
    recoveryKeys.push(route.request().postDataJSON().key);
    if (recoveryKeys.length > 2) return route.continue();
    await route.fulfill({ status: 503, json: { code: "DATABASE_UNAVAILABLE", error: "Consulta fictícia indisponível." } });
  });
  await confirm.click();
  const failure = page.getByRole("dialog", { name: "Não foi possível reabrir o acompanhamento", exact: true });
  await expect(failure).toHaveAttribute("data-outcome", "uncertain");
  const recover = failure.getByRole("button", { name: "Conferir resultado", exact: true });
  await recover.click();
  await expect.poll(() => recoveryKeys.length).toBe(2);
  await recover.click();

  const success = page.getByRole("dialog", { name: "Acompanhamento reaberto", exact: true });
  await expect(success).toBeVisible();
  expect(packets).toHaveLength(1);
  expect(recoveryKeys).toEqual([recoveryKeys[0], recoveryKeys[0], recoveryKeys[0]]);
  expect(packets[0]).toMatchObject({ key: recoveryKeys[0], intention: { action: "reopen", body: { reason } } });
  await success.getByRole("button", { name: "Voltar à ficha", exact: true }).click();
  await openDocumentMore(page);
  await expect(page.getByRole("menuitem", { name: "Revisar conclusão", exact: true })).toBeVisible();
  await closeDocumentMore(page);
  const currentDetails = await page.request.get(`/api/documents/${doc.id}`);
  expect((await currentDetails.json()).data).toMatchObject({ status: "cancelled", workflow_data: { documentFollowUp: { state: "reopened" } } });
  expect(terminalLedger(patient)).toBe(stock);
  expect(privateFormCount(patient)).toBe(drafts);
  expect(draftWrites).toEqual([]);

  const reopened = await generatedPdf(page, endpoint);
  expect(reopened.status()).toBe(200);
  const bytes = await reopened.body();
  const issued = await pdfIssuanceReference(page, doc.id, bytes);
  expect(issued.version).toBeGreaterThan(originalIssuance.version);
  const signed = await rpc(fixture.admin, "pdf_issuance", { p_id: issued.id });
  expect(signed.validation).toMatchObject({ accepted: true, profile: "PAdES-B-T", wholeFile: true });
  const contents = (await PDF.load(bytes)).extractText().flatMap(part => part.lines.map(line =>
    line.spans.flatMap(span => span.chars.map(character => character.char)).join(""))).join(" ");
  expect(contents).toContain("Acompanhamento reaberto");
  expect(contents).toContain("Cancelamento fictício anterior a qualquer aceite pessoal");
  expect(contents).toContain(reason);
  const preserved = await page.request.get(`${endpoint}?issuance=${originalIssuance.id}`);
  expect(preserved.status()).toBe(200);
  expect((await preserved.body()).equals(originalBytes)).toBe(true);
});

test("falha na conclusão limita as tentativas e preserva a observação na revisão", async ({ page }, info) => {
  const { document, patient } = await entOperationFixture("accepted");
  await page.setViewportSize({ width: 390, height: 844 });
  await loginDecision(page, fixtures.adminA.email, patient);
  const stock = terminalLedger(patient);
  const privateWrites = noPrivateWrites(page);
  const endpoint = `/api/documents/${document.id}/decisions`;
  const packets: { key: string; intention: { body: { reason: string } } }[] = [];
  const correlationId = randomUUID();
  await page.route(`**${endpoint}`, async route => {
    packets.push(route.request().postDataJSON());
    await route.fulfill({ status: 503, json: {
      code: "DATABASE_UNAVAILABLE", correlationId, error: "Detalhe interno fictício da falha.",
    } });
  });
  await page.goto(`/fichas/${document.id}`);
  await openDocumentAction(page, "Revisar conclusão");
  const review = page.getByRole("dialog", { name: "Revisar e concluir", exact: true });
  const observation = "Observação fictícia mantida enquanto a revisão está aberta.";
  await review.getByRole("textbox", { name: "Observação da conclusão" }).fill(observation);
  await review.getByRole("button", { name: "Concluir", exact: true }).click();
  const failure = page.getByRole("dialog", { name: "Não foi possível concluir a ficha", exact: true });
  await expect(failure).toHaveAttribute("data-outcome", "rejected");
  await expect(failure.getByText("A conferência confirmou que esta tentativa não alterou a ficha.", { exact: true })).toBeVisible();
  const retry = failure.getByRole("button", { name: "Tentar novamente", exact: true });
  await retry.click();
  await expect.poll(() => packets.length).toBe(2);
  await retry.click();
  await expect(failure).toBeVisible();
  await expect(retry).toHaveCount(0);
  await expect(failure.getByText("Detalhe interno fictício da falha.")).toHaveCount(0);
  const details = failure.locator("details");
  await expect(details).not.toHaveAttribute("open", "");
  await details.getByText("Detalhes para suporte", { exact: true }).click();
  await expect(details).toContainText(correlationId);
  await expect(details).toContainText("Tentativas de recuperação: 2");
  await expect(failure.getByRole("button", { name: "Copiar detalhes", exact: true })).toHaveCount(2);
  expect(new Set(packets.map(packet => packet.key)).size).toBe(3);
  expect(packets.map(packet => packet.intention.body.reason)).toEqual([observation, observation, observation]);
  expect(await page.evaluate(() => [innerWidth, document.documentElement.scrollWidth])).toEqual([390, 390]);
  await info.attach("falha-conclusao-390", { body: await failure.screenshot({ scale: "css", animations: "disabled" }), contentType: "image/png" });

  await failure.getByRole("button", { name: "Voltar à ficha", exact: true }).click();
  const discard = page.getByRole("dialog", { name: "Sair sem concluir?", exact: true });
  await discard.getByRole("button", { name: "Voltar à revisão", exact: true }).click();
  await expect(failure).toBeVisible();
  await expect(retry).toHaveCount(0);
  await failure.getByRole("button", { name: "Voltar à ficha", exact: true }).click();
  await discard.getByRole("button", { name: "Sair e descartar", exact: true }).click();
  await page.unroute(`**${endpoint}`);
  for (const packet of packets) expect((await page.request.post(endpoint, { data: packet })).status()).toBe(409);
  const facts = await (await page.request.get(`/api/documents/${document.id}?reference=follow-up`)).json();
  expect(facts.data).toMatchObject({ state: "open", canComplete: true });
  expect(privateWrites).toEqual([]);
  expect(terminalLedger(patient)).toBe(stock);
  await openDocumentAction(page, "Revisar conclusão");
  await expect(review.getByRole("textbox", { name: "Observação da conclusão" })).toBeEmpty();
});

test("revisão da ENT exige conferência pessoal e descarta a nota somente após confirmação", async ({ page }, info) => {
  const fixture = await entOperationFixture();
  const { document, patient } = fixture;
  if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 680 });
  await loginDecision(page, fixtures.adminA.email, patient);
  await page.goto(`/historico/${document.id}`);
  await openDocumentAction(page, "Revisar conclusão");
  const review = page.getByRole("dialog", { name: "Revisar e concluir", exact: true });
  await review.getByText("Conferência pessoal pendente", { exact: true }).click();
  await expect(review.getByRole("button", { name: "Concluir", exact: true })).toBeDisabled();
  await expect(review.getByRole("button", { name: "Conferir recebimento", exact: true })).toHaveCount(0);
  const observation = review.getByRole("textbox", { name: "Observação da conclusão" });
  await observation.fill("Nota temporária da revisão pendente");
  await review.getByRole("button", { name: "Consultar ficha", exact: true }).click();
  const discard = page.getByRole("dialog", { name: "Sair sem concluir?", exact: true });
  await discard.getByRole("button", { name: "Voltar à revisão", exact: true }).click();
  await expect(observation).toHaveValue("Nota temporária da revisão pendente");
  await review.getByRole("button", { name: "Consultar ficha", exact: true }).click();
  await discard.getByRole("button", { name: "Sair e descartar", exact: true }).click();
  await expect(review).toHaveCount(0);

  const received = await entSend(fixture.pro, document, "receive", { divergences: [] });
  const stock = terminalLedger(patient);
  await openDocumentAction(page, "Revisar conclusão");
  await expect(observation).toBeEmpty();
  await expect(review.getByText("Recebimento registrado", { exact: true })).toBeVisible();
  await review.getByRole("button", { name: "Concluir", exact: true }).click();
  const success = page.getByRole("dialog", { name: "Ficha concluída", exact: true });
  await success.getByRole("button", { name: "Voltar à ficha", exact: true }).click();
  await expect(page.getByRole("button", { name: "Reverter conclusão", exact: true })).toBeVisible();
  const read = await page.request.get(`/api/documents/${document.id}`);
  expect((await read.json()).data).toMatchObject({
    status: received.status, workflow_data: { acceptedAt: received.workflow_data.acceptedAt, acceptedBy: received.workflow_data.acceptedBy },
  });
  expect(terminalLedger(patient)).toBe(stock);
});

for (const kind of ["ENT", "DEV"] as const) test(`${kind} abre o recebimento e a conciliação pela revisão de conclusão`, async ({ page }, info) => {
  const f = kind === "DEV" ? await autonomousReturnFixture() : null;
  const { patient, admin, products } = f ?? await setup();
  const recipient = f?.recipient ?? await shiftWorker(patient);
  const line = { productId: products[0], quantity: "3" };
  const dispatched = f ? await rpc(f.initiator.client, "create_transfer_declaration", {
    p_patient: patient, p_key: randomUUID(), p_body: {
      mode: "direct", source: "CARE_TEAM", recipientId: recipient.id, originDocumentId: null,
      referenceHash: (await rpc(f.initiator.client, "transfer_preparation", { p_patient: patient, p_source: "CARE_TEAM" })).referenceHash,
      reason: "Recebedor fictício da devolução direta.", lines: [line],
    },
  }) as SupplyDocument : await rpc(admin, "create_supply_document", {
    p_patient: patient, p_type: "ENT", p_key: randomUUID(), p_draft: false, p_payload: {
      source: "FAMILY", destination: "CARE_TEAM", recipientId: recipient.id,
      recipientReason: "Recebedor fictício da entrega direta.", lines: [line],
    },
  }) as SupplyDocument;
  const { id } = dispatched;
  expect(dispatched.kind).toBe(kind);
  await loginDecision(page, recipient.email, patient);
  await page.goto("/fichas/" + id);
  await openDocumentAction(page, "Revisar conclusão");
  const closure = page.getByRole("dialog", { name: "Revisar e concluir", exact: true });
  const receiptShortcut = closure.getByRole("button", { name: "Conferir recebimento", exact: true });
  const observation = closure.getByRole("textbox", { name: "Observação da conclusão", exact: true });
  const note = "Observação temporária antes da conferência pessoal.";
  await observation.fill(note);
  await expect(closure.getByRole("button", { name: "Concluir", exact: true })).toBeDisabled();
  const before = terminalLedger(patient);
  const writes = noPrivateWrites(page);
  await receiptShortcut.click();
  const receiving = page.getByRole("dialog", { name: "Conferir recebimento", exact: true });
  await expect(closure).toHaveCount(0);
  await receiving.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(observation).toHaveValue(note);
  expect(terminalLedger(patient)).toBe(before);

  await receiptShortcut.click();
  await receiving.getByRole("textbox", { name: /^Recebidas de / }).fill("1");
  await receiving.getByRole("button", { name: "Confirmar recebimento", exact: true }).click();
  await confirmedOutcome(page, id, "Registrar diferença");
  await page.unroute(`**/api/documents/${id}/decisions`);
  const received = page.getByRole("dialog", { name: "Recebimento registrado com diferença", exact: true });
  await received.getByRole("button", { name: "Voltar à ficha", exact: true }).click();
  await expect(closure.getByText("Recebimento registrado", { exact: true })).toBeVisible();
  await expect(observation).toHaveValue(note);
  await expect(receiptShortcut).toHaveCount(0);
  const reconcileShortcut = closure.getByRole("button", { name: "Conciliar divergência", exact: true });
  if (info.project.use.hasTouch) {
    await reconcileShortcut.scrollIntoViewIfNeeded();
    await info.attach(`Revisão da ${kind} com conciliação disponível`, { body: await closure.screenshot({ scale: "css", animations: "disabled" }), contentType: "image/png" });
  }

  await reconcileShortcut.click();
  const reconciliation = page.getByRole("dialog", { name: "Resolver diferença de quantidade", exact: true });
  await expect(reconciliation.getByLabel("Quantidade esclarecida")).toHaveValue("2");
  await reconciliation.getByLabel("Como foi conferido?").fill("Duas unidades do segundo volume chegaram depois.");
  await reconciliation.getByRole("button", { name: "Registrar decisão do item", exact: true }).click();
  await page.getByRole("dialog", { name: "Diferença conciliada", exact: true }).getByRole("button", { name: "Voltar à ficha", exact: true }).click();
  await expect(closure.getByText("Quantidades conciliadas", { exact: true })).toBeVisible();
  await expect(observation).toHaveValue(note);
  expect(writes).toEqual([]);

  const current = await rpc(admin, "operational_document", { p_id: id }) as SupplyDocument;
  expect(current.workflow_data.acceptedBy).toBe(recipient.id);
  expect(current.lines.map(item => Number(item.accepted_quantity))).toEqual([3]);
  expect(current.events.filter(event => ["ent.receive", "ent.resolve"].includes(event.action))
    .sort((left, right) => left.version - right.version)
    .map(event => [event.action, event.actorId])).toEqual([["ent.receive", recipient.id], ["ent.resolve", recipient.id]]);
  expect(current.version).toBe(dispatched.version + 2);
  expect(current.workflow_data.documentFollowUp).toEqual(dispatched.workflow_data.documentFollowUp);
});

test("REQ resolve a avaliação da família e retorna à conclusão com a observação preservada", async ({ page }, info) => {
  const { admin, patient, products } = await setup();
  const approver = await shiftWorker(patient, "admin");
  const req = await issue(patient, [products[0]]);
  const sent = await delivery(patient, req, [products[0]], { quantity: "5", requestFulfillment: "complete" });
  const [line] = sent.lines;
  const team = await actor("professional", patient);
  await rpc(team, "supply_document_command", {
    p_id: sent.id, p_action: "receive", p_key: randomUUID(), p_version: sent.version,
    p_body: { countedReceipt: { lines: [{ lineId: line.id, receivedQuantity: "5", reviewReason: "A equipe solicitou a conferência da necessidade." }] } },
  });
  const stock = terminalLedger(patient);
  await loginDecision(page, approver.email, patient);
  await page.goto(`/fichas/${req.id}`);
  await openDocumentAction(page, "Revisar conclusão");
  const review = page.getByRole("dialog", { name: "Revisar e concluir", exact: true });
  const confirm = review.getByRole("button", { name: "Concluir", exact: true });
  const note = review.getByRole("textbox", { name: "Observação da conclusão" });
  const assess = review.getByRole("button", { name: `Avaliar necessidade de ${line.name_snapshot}`, exact: true });
  await expect(assess).toBeVisible();
  await expect(confirm).toBeDisabled();
  if (info.project.use.hasTouch) {
    await page.setViewportSize({ width: 360, height: 844 });
    const path = info.outputPath("E04-12-revisao.png");
    await review.screenshot({ path, scale: "css", animations: "disabled" });
    await info.attach("E04-12 revisão da REQ", { path, contentType: "image/png" });
  }
  await note.fill("Resumo fictício para a conclusão da REQ.");
  await assess.click();
  const assessment = page.getByRole("dialog", { name: "Reavaliar necessidade", exact: true });
  await expect(assessment).toContainText("A equipe solicitou a conferência da necessidade.");
  await assessment.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(note).toHaveValue("Resumo fictício para a conclusão da REQ.");
  await expect(confirm).toBeDisabled();
  await assess.click();
  await expect(assessment.getByRole("button", { name: "Fechar diálogo", exact: true })).toBeFocused();
  const justification = assessment.getByRole("textbox", { name: "Justificativa da avaliação", exact: true });
  const acceptedReason = "O recebido supre a necessidade conferida com a família.";
  await justification.fill(acceptedReason);
  await expect(justification).toHaveValue(acceptedReason);
  await assessment.getByRole("button", { name: "Registrar avaliação", exact: true }).click();
  const approved = page.getByRole("dialog", { name: "Avaliação registrada", exact: true });
  await approved.getByRole("button", { name: "Voltar à ficha", exact: true }).click();
  await expect(note).toHaveValue("Resumo fictício para a conclusão da REQ.");
  await expect(assess).toHaveCount(0);
  await expect(review).toContainText("A ficha já foi concluída.");
  await expect(confirm).toHaveCount(0);
  await review.getByRole("button", { name: "Voltar à ficha", exact: true }).click();
  expect(await rpc(admin, "document_follow_up_reference", { p_id: req.id })).toMatchObject({ state: "completed", decision: { action: "req.completed" } });
  expect(terminalLedger(patient)).toBe(stock);
});

test("ENT abre cada avaliação familiar pendente pela revisão de conclusão", async ({ page, browser }, info) => {
  const { admin, patient, products } = await setup();
  const approver = await shiftWorker(patient, "admin");
  const req = await issue(patient, products);
  const sent = await delivery(patient, req, products, { quantity: "5", requestFulfillment: "complete" }) as SupplyDocument;
  const [first, second] = sent.lines;
  const reason = (name: string) => `A equipe solicitou nova avaliação de ${name} para o próximo plantão.`;
  const team = await actor("professional", patient);
  await entSend(team, sent, "receive", { countedReceipt: { lines: sent.lines.map(line => ({
    lineId: line.id, receivedQuantity: "5", reviewReason: reason(line.name_snapshot),
  })) } });
  const stock = terminalLedger(patient);
  const endpoint = `/api/documents/${sent.id}/fulfillment-review`;
  const url = `/fichas/${sent.id}`;
  await loginDecision(page, approver.email, patient);
  await page.goto(url);

  const teamPage = await browser.newPage({
    baseURL: new URL(page.url()).origin, viewport: page.viewportSize() ?? undefined,
    isMobile: info.project.use.isMobile, hasTouch: info.project.use.hasTouch,
  });
  try {
    await loginDecision(teamPage, fixtures.professional.email, patient);
    await teamPage.goto(url);
    await openDocumentAction(teamPage, "Revisar conclusão");
    const readOnly = teamPage.getByRole("dialog", { name: "Revisar e concluir", exact: true });
    await expect(readOnly).toContainText("Aguardando decisão familiar");
    await expect(readOnly.getByRole("button", { name: /^Avaliar necessidade de / })).toHaveCount(0);
  } finally {
    await teamPage.close();
  }

  await openDocumentAction(page, "Revisar conclusão");
  const closure = page.getByRole("dialog", { name: "Revisar e concluir", exact: true });
  const note = closure.getByRole("textbox", { name: "Observação da conclusão", exact: true });
  const confirm = closure.getByRole("button", { name: "Concluir", exact: true });
  const shortcut = (line: SupplyDocument["lines"][number]) =>
    closure.getByRole("button", { name: `Avaliar necessidade de ${line.name_snapshot}`, exact: true });
  const observation = "Observação da conclusão a preservar durante as duas avaliações.";
  await note.fill(observation);
  await expect(confirm).toBeDisabled();
  const privateWrites = noPrivateWrites(page);
  await shortcut(first).click();
  const evaluation = page.getByRole("dialog", { name: "Reavaliar necessidade", exact: true });
  await expect(evaluation).toContainText(reason(first.name_snapshot));
  await expect(evaluation).toContainText("5 unidade recebidos");
  await evaluation.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(note).toHaveValue(observation);
  await expect(confirm).toBeDisabled();
  expect(terminalLedger(patient)).toBe(stock);

  await shortcut(first).click();
  if (info.project.use.hasTouch) {
    await page.setViewportSize({ width: 390, height: 844 });
    const path = info.outputPath("E06-15-avaliacao-pela-revisao.png");
    await evaluation.screenshot({ path, scale: "css", animations: "disabled" });
    await info.attach("E06-15 avaliação da família", { path, contentType: "image/png" });
  }
  await evaluation.getByRole("button", { name: "Parcialmente", exact: true }).click();
  await evaluation.getByRole("textbox", { name: "Justificativa da avaliação", exact: true })
    .fill("A quantidade recebida cobre apenas parte da necessidade.");
  const packets = await loseDecisionResponse(page, endpoint);
  await evaluation.getByRole("button", { name: "Registrar avaliação", exact: true }).click();
  const recovery = page.getByRole("dialog", { name: "Verificar avaliação familiar", exact: true });
  await expect(recovery.getByRole("button", { name: "Verificar mesma avaliação", exact: true })).toBeEnabled();
  await page.unroute("**" + endpoint);
  expect(packets).toHaveLength(1);
  const recovered = page.waitForResponse(response =>
    new URL(response.url()).pathname === endpoint && response.request().method() === "POST");
  await recovery.getByRole("button", { name: "Verificar mesma avaliação", exact: true }).click();
  const response = await recovered;
  expect(response.ok()).toBe(true);
  expect(response.request().postDataJSON()).toEqual(packets[0]);
  expect(await response.json()).toMatchObject({ recovered: true, lineId: first.id });
  const saved = page.getByRole("dialog", { name: "Avaliação registrada", exact: true });
  await saved.getByRole("button", { name: "Voltar à ficha", exact: true }).click();
  await expect(note).toHaveValue(observation);
  await expect(shortcut(first)).toHaveCount(0);
  await expect(shortcut(second)).toBeVisible();
  await expect(confirm).toBeDisabled();

  await shortcut(second).click();
  await expect(evaluation).toContainText(reason(second.name_snapshot));
  await evaluation.getByRole("button", { name: "Integralmente", exact: true }).click();
  await evaluation.getByRole("textbox", { name: "Justificativa da avaliação", exact: true })
    .fill("A quantidade recebida supre a necessidade deste material.");
  await evaluation.getByRole("button", { name: "Registrar avaliação", exact: true }).click();
  await saved.getByRole("button", { name: "Voltar à ficha", exact: true }).click();
  await expect(note).toHaveValue(observation);
  await expect(closure).toContainText("Necessidade avaliada");
  await expect(confirm).toBeEnabled();
  const current = await rpc(admin, "operational_document", { p_id: sent.id }) as SupplyDocument;
  expect(current.fulfillmentReviews).toMatchObject([
    { lineId: first.id, actorId: approver.id, decision: "partial" },
    { lineId: second.id, actorId: approver.id, decision: "complete" },
  ]);
  expect(current.lines.map(line => Number(line.accepted_quantity))).toEqual([5, 5]);
  expect(terminalLedger(patient)).toBe(stock);
  expect(privateWrites).toEqual([]);
});

test("COM revisa a chegada a partir do bloqueio e retorna à conclusão com a referência atual", async ({ page }, info) => {
  const { admin, patient, products } = await setup();
  const buyer = await shiftWorker(patient, "family");
  const reviewer = await shiftWorker(patient, "admin");
  const planned = await rpc(admin, "create_supply_document", {
    p_patient: patient, p_type: "COM", p_key: randomUUID(), p_draft: false,
    p_payload: { origin: "purchase", lines: [{ productId: products[0], quantity: "6" }] },
  });
  const [line] = planned.lines;
  const purchased = await purchaseBalanceCommand(buyer.client, planned, "purchase", { lines: [{ lineId: line.id, quantity: "6" }] });
  const pending = await purchaseBalanceCommand(buyer.client, purchased, "receive", { lines: [{ lineId: line.id, quantity: "6", expectedQuantity: "6" }] });
  const [receipt] = pending.receipts;
  const initial = terminalLedger(patient);
  await loginDecision(page, reviewer.email, patient);
  await page.goto(`/fichas/${planned.id}`);
  await openDocumentAction(page, "Revisar conclusão");
  const review = page.getByRole("dialog", { name: "Revisar e concluir", exact: true });
  const confirm = review.getByRole("button", { name: "Concluir", exact: true });
  const note = review.getByRole("textbox", { name: "Observação da conclusão" });
  const inspectArrival = review.getByRole("button", { name: "Revisar chegada", exact: true });
  await expect(inspectArrival).toBeVisible();
  await expect(confirm).toBeDisabled();
  if (info.project.use.hasTouch) {
    await page.setViewportSize({ width: 412, height: 844 });
    const path = info.outputPath("E05-12-revisao.png");
    await review.screenshot({ path, scale: "css", animations: "disabled" });
    await info.attach("E05-12 revisão da COM", { path, contentType: "image/png" });
  }
  await note.fill("Resumo fictício para a conclusão da COM.");
  await inspectArrival.click();
  const arrival = page.getByRole("dialog", { name: "Conferir entrada no estoque", exact: true });
  await expect(arrivalCard(arrival, receipt.id)).toBeVisible();
  expect(terminalLedger(patient)).toBe(initial);
  const { result } = await confirmArrivalReview(page, arrival, true);
  await result.getByRole("button", { name: "Concluir", exact: true }).click();
  await expect(note).toHaveValue("Resumo fictício para a conclusão da COM.");
  await expect(inspectArrival).toHaveCount(0);
  await expect(confirm).toBeEnabled();
  const stock = terminalLedger(patient);
  expect(JSON.parse(stock)).toHaveLength(JSON.parse(initial).length + 1);
  await confirm.click();
  await page.getByRole("dialog", { name: "Ficha concluída", exact: true }).getByRole("button", { name: "Voltar à ficha", exact: true }).click();
  expect(await rpc(admin, "document_follow_up_reference", { p_id: planned.id })).toMatchObject({ state: "completed", lastAct: { reason: "Resumo fictício para a conclusão da COM." } });
  expect(terminalLedger(patient)).toBe(stock);
});

test("COM resolve as pendências de autorização, aquisição e chegada pela revisão de conclusão", async ({ page }, info) => {
  const { admin, patient, products } = await setup();
  const family = await shiftWorker(patient, "family");
  const reviewer = await shiftWorker(patient, "admin");
  const planned = await rpc(family.client, "create_supply_document", {
    p_patient: patient, p_type: "COM", p_key: randomUUID(), p_draft: false,
    p_payload: { origin: "purchase", lines: [{ productId: products[0], quantity: "6" }] },
  }) as SupplyDocument;
  const [line] = planned.lines;
  const originalStock = terminalLedger(patient);
  const observation = "Observação de conclusão preservada ao resolver as pendências desta compra.";
  await loginDecision(page, reviewer.email, patient);
  await page.goto(`/fichas/${planned.id}`);
  await openDocumentAction(page, "Revisar conclusão");
  const closure = page.getByRole("dialog", { name: "Revisar e concluir", exact: true });
  const note = closure.getByRole("textbox", { name: "Observação da conclusão", exact: true });
  const confirm = closure.getByRole("button", { name: "Concluir", exact: true });
  const authorize = closure.getByRole("button", { name: "Autorizar a compra", exact: true });
  const writes = noPrivateWrites(page);
  await note.fill(observation);
  await expect(confirm).toBeDisabled();
  await authorize.click();
  const approval = page.getByRole("dialog", { name: "Autorizar a compra", exact: true });
  await approval.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(note).toHaveValue(observation);
  expect(terminalLedger(patient)).toBe(originalStock);
  await authorize.click();
  await approval.getByRole("button", { name: "Autorizar selecionados", exact: true }).click();
  await page.getByRole("dialog", { name: "Compra autorizada", exact: true }).getByRole("button", { name: "Concluir", exact: true }).click();
  await expect(note).toHaveValue(observation);
  await expect(authorize).toHaveCount(0);

  const register = closure.getByRole("button", { name: "Registrar compra", exact: true });
  await register.click();
  const purchase = page.getByRole("dialog", { name: "Registrar compra", exact: true });
  await purchase.getByRole("textbox", { name: `${line.name_snapshot} · ${line.unit_snapshot}`, exact: true }).fill("4");
  await purchase.getByRole("button", { name: "Confirmar compra", exact: true }).click();
  await page.getByRole("dialog", { name: "Compra registrada", exact: true }).getByRole("button", { name: "Concluir", exact: true }).click();
  await expect(note).toHaveValue(observation);
  expect(terminalLedger(patient)).toBe(originalStock);

  const endExpectation = closure.getByRole("button", { name: "Encerrar expectativa restante", exact: true });
  await endExpectation.click();
  const expectation = page.getByRole("dialog", { name: "Encerrar expectativa restante", exact: true });
  const reason = expectation.getByRole("textbox", { name: "Motivo / justificativa", exact: true });
  const waiver = "As duas unidades restantes não serão adquiridas.";
  const prepare = expectation.getByRole("button", { name: "Revisar operação", exact: true });
  await reason.fill(waiver);
  await expectation.getByRole("checkbox", { name: "Conferi o resumo e confirmo dispensar somente a expectativa não adquirida.", exact: true }).check();
  await expect(reason).toHaveValue(waiver);
  await prepare.click();
  const waiverReview = page.getByRole("dialog", { name: "Revisar encerramento da expectativa", exact: true });
  await waiverReview.getByRole("button", { name: "Manter restante", exact: true }).click();
  await expect(reason).toHaveValue(waiver);
  await prepare.click();
  await waiverReview.getByRole("button", { name: "Confirmar encerramento da expectativa", exact: true }).click();
  await expect(note).toHaveValue(observation);
  await expect(endExpectation).toHaveCount(0);
  await expect(confirm).toBeDisabled();
  expect(terminalLedger(patient)).toBe(originalStock);
  const updated = await rpc(admin, "operational_document", { p_id: planned.id }) as SupplyDocument;
  expect(Number(updated.lines[0].waived_quantity)).toBe(2);

  if (info.project.use.hasTouch) {
    const path = info.outputPath("E05-12-registrar-chegada.png");
    await closure.screenshot({ path, scale: "css", animations: "disabled" });
    await info.attach("Revisão após encerrar a expectativa", { path, contentType: "image/png" });
  }
  await closure.getByRole("button", { name: "Registrar chegada", exact: true }).click();
  const arrival = page.getByRole("dialog", { name: "Registrar chegada", exact: true });
  await arrival.locator(`input[name="${line.id}"]`).fill("4");
  await arrival.getByRole("button", { name: "Confirmar entrada", exact: true }).click();
  await page.getByRole("dialog", { name: "Entrada confirmada", exact: true }).getByRole("button", { name: "Concluir", exact: true }).click();
  await expect(note).toHaveValue(observation);
  await expect(page.locator('[role="tab"][aria-selected="true"]')).toHaveText("Visão geral");
  await expect(confirm).toBeEnabled();
  const stock = terminalLedger(patient);
  expect(JSON.parse(stock)).toHaveLength(JSON.parse(originalStock).length + 1);
  await confirm.click();
  await page.getByRole("dialog", { name: "Ficha concluída", exact: true }).getByRole("button", { name: "Voltar à ficha", exact: true }).click();
  expect(await rpc(admin, "document_follow_up_reference", { p_id: planned.id })).toMatchObject({ state: "completed", lastAct: { reason: observation } });
  expect(terminalLedger(patient)).toBe(stock);
  expect(writes).toEqual([]);
});

for (const reassigned of [false, true]) test(`ENT ${reassigned ? "volta à ficha quando outro recebedor foi designado" : "preserva a conferência ao adotar uma versão mais recente"}`, async ({ page }, info) => {
  const { admin, patient, products } = await setup();
  const receiver = await shiftWorker(patient);
  const sent = await rpc(admin, "create_supply_document", {
    p_patient: patient, p_type: "ENT", p_key: randomUUID(), p_draft: false,
    p_payload: { source: "FAMILY", destination: "CARE_TEAM", recipientId: receiver.id,
      recipientReason: "Conferente designada para a entrega fictícia.", lines: [{ productId: products[0], quantity: "3" }] },
  }) as SupplyDocument;
  const [line] = sent.lines;
  const initialStock = terminalLedger(patient);
  const closingNote = "Observação da revisão de conclusão da entrega.";
  const receiptNote = "Recebi duas unidades nesta conferência presencial.";
  await loginDecision(page, receiver.email, patient);
  await page.goto(`/fichas/${sent.id}`);
  await openDocumentAction(page, "Revisar conclusão");
  const closure = page.getByRole("dialog", { name: "Revisar e concluir", exact: true });
  const note = closure.getByRole("textbox", { name: "Observação da conclusão", exact: true });
  const shortcut = closure.getByRole("button", { name: "Conferir recebimento", exact: true });
  await note.fill(closingNote);
  await shortcut.click();
  const receipt = page.getByRole("dialog", { name: "Conferir recebimento", exact: true });
  const observedCount = receipt.getByRole("textbox", { name: `Recebidas de ${line.name_snapshot}`, exact: true });
  await observedCount.fill("2");
  await receipt.getByText("Adicionar observação ao recebimento", { exact: true }).click();
  const observation = receipt.getByRole("textbox", { name: "Sua observação no recebimento", exact: true });
  await observation.fill(receiptNote);
  await receipt.getByRole("button", { name: "Confirmar recebimento", exact: true }).click();

  const endpoint = `/api/documents/${sent.id}/decisions`;
  const attempts: { key: string; intention: { expectedVersion: number } }[] = [];
  let latest = sent;
  await page.route(`**${endpoint}`, async route => {
    if (route.request().method() !== "POST") return route.continue();
    attempts.push(route.request().postDataJSON());
    if (attempts.length !== 1) return route.continue();
    latest = await entSend(admin, sent, "reassign", { recipientId: fixtures.global.id, reason: "Troca durante a conferência presencial." });
    if (!reassigned) latest = await entSend(admin, latest, "reassign", { recipientId: receiver.id, reason: "Recebedora original voltou a ficar disponível." });
    const response = await route.fetch();
    expect([403, 409]).toContain(response.status());
    await route.fulfill({ response });
  });
  const difference = page.getByRole("dialog", { name: "Confirmar diferença no recebimento", exact: true });
  await difference.getByRole("button", { name: "Registrar diferença", exact: true }).click();
  const comparison = page.getByRole("region", { name: "Alterações na conferência", exact: true });
  const checkCurrent = comparison.getByRole("button", { name: "Consultar versão atual", exact: true });
  const adopt = comparison.getByRole("button", { name: reassigned ? "Voltar à ficha atual" : "Usar versão atual e revisar novamente", exact: true });
  await checkCurrent.click();
  await expect(adopt).toBeEnabled();
  await expect(comparison).toContainText(`Agora: ${latest.version}`);
  await expect(receipt.getByRole("button", { name: "Confirmar recebimento", exact: true })).toBeDisabled();
  expect(terminalLedger(patient)).toBe(initialStock);
  if (reassigned) await expect(comparison).toContainText("Pessoa designada para receber");
  if (info.project.use.hasTouch) {
    const path = info.outputPath("referencia-do-recebimento.png");
    await comparison.screenshot({ path, scale: "css", animations: "disabled" });
    await info.attach("Comparação da conferência", { path, contentType: "image/png" });
  }
  await adopt.click();
  expect(attempts).toHaveLength(1);
  if (reassigned) {
    await expect(note).toHaveValue(closingNote);
    await expect(shortcut).toHaveCount(0);
    await expect(closure.getByRole("button", { name: "Concluir", exact: true })).toBeDisabled();
    expect(terminalLedger(patient)).toBe(initialStock);
    return;
  }

  await expect(observedCount).toHaveValue("2");
  await expect(observation).toHaveValue(receiptNote);
  await expect(comparison).toHaveCount(0);
  await receipt.getByRole("button", { name: "Confirmar recebimento", exact: true }).click();
  await difference.getByRole("button", { name: "Registrar diferença", exact: true }).click();
  const result = page.getByRole("dialog", { name: "Recebimento registrado com diferença", exact: true });
  await result.getByRole("button", { name: "Voltar à ficha", exact: true }).click();
  await expect(note).toHaveValue(closingNote);
  expect(attempts.map(attempt => attempt.intention.expectedVersion)).toEqual([sent.version, latest.version]);
  expect(attempts[0].key).not.toBe(attempts[1].key);
  const confirmed = await rpc(admin, "operational_document", { p_id: sent.id }) as SupplyDocument;
  expect(confirmed.events.filter(event => event.action === "ent.receive")).toMatchObject([{ actorId: receiver.id }]);
  expect(Number(confirmed.lines[0].accepted_quantity)).toBe(2);
  expect(JSON.parse(terminalLedger(patient))).toHaveLength(JSON.parse(initialStock).length + 1);
});
