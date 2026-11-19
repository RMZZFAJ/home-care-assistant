import { openDocumentAction, openDocumentMore, closeDocumentMore } from "./document-sections";
import { expect, test } from "@playwright/test";
import { PDF } from "@libpdf/core";
import { entOperationFixture, entSend } from "../integration/ent-operation-fixtures.mjs";
import { entTerminalFixture, terminalLedger } from "../integration/ent-terminal-fixtures.mjs";
import { fixtures, rpc } from "../integration/v4-fixtures.mjs";
import { generatedPdf, pdfIssuanceReference } from "./generated-pdf";
import { confirmedOutcome, loginDecision, noPrivateWrites, privateFormCount } from "./l1-decision-policy";

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
