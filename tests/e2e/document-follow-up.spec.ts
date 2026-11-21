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
import { confirmedOutcome, loginDecision, noPrivateWrites, privateFormCount } from "./l1-decision-policy";
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
  await confirmedOutcome(page, doc.id, "Reabrir acompanhamento");

  const success = page.getByRole("dialog", { name: "Acompanhamento reaberto", exact: true });
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
  await assessment.getByRole("textbox", { name: "Justificativa da avaliação" }).fill("O recebido supre a necessidade conferida com a família.");
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
