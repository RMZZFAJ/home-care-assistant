import { openDocumentMore, closeDocumentMore } from "./document-sections";
import { openDocumentAction } from "./document-sections";
import { selectDocumentSection } from "./document-sections";
import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { entOperationFixture } from "../integration/ent-operation-fixtures.mjs";
import { entTerminalFixture, terminalLedger } from "../integration/ent-terminal-fixtures.mjs";
import { shiftWorker } from "../integration/shift-fixtures.mjs";
import { fixtures, rpc } from "../integration/v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { loginDecision } from "./l1-decision-policy";
import type { DocumentArchiveCommand } from "../../src/lib/documents/document-archive";

test.setTimeout(120_000);

test("Concluir e arquivar passa pelas duas revisões e permite restaurar a ENT sem mudar seu PDF", async ({ page }, info) => {
  test.setTimeout(180_000);
  const { document, patient } = await entOperationFixture("accepted");
  const administrator = await shiftWorker(patient, "admin");
  if (info.project.name === "mobile") await page.setViewportSize({ width: 320, height: 670 });
  await page.bringToFront();
  await loginDecision(page, administrator.email, patient);
  const stock = terminalLedger(patient);
  await page.goto(`/fichas/${document.id}`);
  await expect(page.getByRole("heading", { name: document.code, exact: true })).toBeVisible();
  await expect(page.locator(".hca-activity-overlay")).toHaveCount(0);
  await openDocumentAction(page, "Revisar conclusão");
  const conclusion = page.getByRole("dialog", { name: "Revisar e concluir", exact: true });
  await expect(conclusion.getByText("Arquivamento em 7 dias", { exact: true })).toBeVisible();
  await conclusion.getByRole("button", { name: "Concluir e arquivar", exact: true }).click();
  const archive = page.getByRole("dialog", { name: "Arquivar ficha", exact: true });
  await expect(archive.getByText("Ficha concluída ou cancelada", { exact: true })).toBeVisible();
  const endpoint = `/api/documents/${document.id}/lifecycle/archive`;
  expect(await (await page.request.get(endpoint)).json()).toMatchObject({ condition: "completed", archive: null });
  await info.attach("revisao-do-arquivamento", { body: await archive.screenshot(), contentType: "image/png" });
  const archiveReason = archive.getByRole("combobox", { name: "Motivo do arquivamento", exact: true });
  const archiveButton = archive.getByRole("button", { name: "Arquivar e consolidar PDF", exact: true });
  await expect(archiveReason).toHaveValue("policy");
  await archiveReason.selectOption("other");
  await expect(archiveButton).toBeDisabled();
  const reason = "Arquivo fictício após conferência do acompanhamento.";
  const reasonField = archive.getByRole("textbox", { name: "Descreva o motivo", exact: true });
  await reasonField.fill(reason);
  await reasonField.scrollIntoViewIfNeeded();
  await expect(reasonField).toBeInViewport();
  await info.attach("motivo-do-arquivamento", { body: await archive.screenshot(), contentType: "image/png" });
  const commands: DocumentArchiveCommand[] = [];
  let appliedStatus: number | undefined;
  await page.route(`**${endpoint}`, async route => {
    if (route.request().method() !== "POST") return route.continue();
    commands.push(route.request().postDataJSON());
    if (commands.length !== 1) return route.continue();
    appliedStatus = (await route.fetch()).status();
    await route.abort();
  });
  await archiveButton.click();
  const failure = page.getByRole("dialog", { name: "Não foi possível arquivar a ficha", exact: true });
  await expect(failure).toBeVisible({ timeout: 65_000 });
  await expect.poll(() => appliedStatus).toBe(200);
  await failure.getByRole("button", { name: "Conferir resultado", exact: true }).click();
  const archived = page.getByRole("dialog", { name: "Ficha arquivada", exact: true });
  await expect(archived).toBeVisible({ timeout: 65_000 });
  expect(commands).toEqual([commands[0], commands[0]]);
  await page.unroute(`**${endpoint}`);
  await archived.getByRole("button", { name: "Concluir", exact: true }).click();
  await openDocumentMore(page);
  await expect(page.getByRole("menuitem", { name: "Revisar conclusão", exact: true })).toHaveCount(0);
  await closeDocumentMore(page);
  await selectDocumentSection(page, "progress");
  await expect(page.getByRole("button", { name: "Novo andamento", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Revisar encerramento", exact: true }).click();
  const review = page.getByRole("dialog", { name: "Confirmar encerramento", exact: true });
  await expect(review.getByText(reason, { exact: true })).toBeVisible();
  const link = review.getByRole("link", { name: "Baixar PDF consolidado", exact: true });
  const url = (await link.getAttribute("href"))!;
  const original = await page.request.get(url);
  expect(original.status()).toBe(200);
  await info.attach("confirmacao-do-encerramento", { body: await review.screenshot(), contentType: "image/png" });
  await review.getByRole("button", { name: "Reverter arquivamento", exact: true }).click();
  const reverse = page.getByRole("dialog", { name: "Reverter arquivamento", exact: true });
  await reverse.getByRole("textbox", { name: "Motivo da reversão" }).fill("Acompanhamento fictício restaurado após o arquivo.");
  await reverse.getByRole("button", { name: "Reverter arquivamento", exact: true }).click();
  await page.getByRole("dialog", { name: "Arquivamento revertido", exact: true }).getByRole("button", { name: "Concluir", exact: true }).click();
  await selectDocumentSection(page, "progress");
  await expect(page.getByRole("button", { name: "Novo andamento", exact: true })).toBeEnabled();
  expect(await (await page.request.get(endpoint)).json()).toMatchObject({ condition: "completed", archive: null });
  const preserved = await page.request.get(url);
  expect(preserved.status()).toBe(200);
  expect((await preserved.body()).equals(await original.body())).toBe(true);
  expect(terminalLedger(patient)).toBe(stock);
});

test("falha de arquivamento mantém a mesma tentativa e oferece diagnóstico após duas recuperações", async ({ page }, info) => {
  const { patient, doc } = await entTerminalFixture({ kind: "cancelled" });
  const endpoint = `/api/documents/${doc.id}/lifecycle/archive`;
  await page.setViewportSize({ width: 390, height: 844 });
  await loginDecision(page, fixtures.adminA.email, patient);
  const stock = terminalLedger(patient);
  const commands: DocumentArchiveCommand[] = [];
  const correlation = randomUUID();
  await page.route(`**${endpoint}`, async route => {
    if (route.request().method() !== "POST") return route.continue();
    commands.push(route.request().postDataJSON());
    await route.fulfill({ status: 503, json: {
      code: "PERSISTENCE_UNCONFIRMED", correlationId: correlation, error: "Mensagem fictícia que não pertence ao diagnóstico.",
    } });
  });
  await page.goto(`/fichas/${doc.id}`);
  await openDocumentAction(page, "Arquivar ficha");
  const archive = page.getByRole("dialog", { name: "Arquivar ficha", exact: true });
  await archive.getByRole("button", { name: "Arquivar e consolidar PDF", exact: true }).click();
  const failure = page.getByRole("dialog", { name: "Não foi possível arquivar a ficha", exact: true });
  const recover = failure.getByRole("button", { name: "Conferir resultado", exact: true });
  await recover.click();
  await expect.poll(() => commands.length).toBe(2);
  await recover.click();
  await expect(failure).toBeVisible();
  await expect(recover).toHaveCount(0);
  await expect(failure.getByText("Mensagem fictícia que não pertence ao diagnóstico.")).toHaveCount(0);
  const details = failure.locator("details");
  await expect(details).not.toHaveAttribute("open", "");
  await expect(failure.getByRole("button", { name: "Copiar detalhes", exact: true })).toBeVisible();
  await details.getByText("Detalhes para suporte", { exact: true }).click();
  await expect(details).toContainText("PERSISTENCE_UNCONFIRMED");
  await expect(details).toContainText(correlation);
  await expect(details).toContainText("Tentativas de recuperação: 2");
  expect(commands).toEqual([commands[0], commands[0], commands[0]]);
  expect(await page.evaluate(() => [innerWidth, document.documentElement.scrollWidth])).toEqual([390, 390]);
  await info.attach("arquivamento-sem-confirmacao-390", { body: await failure.screenshot({ scale: "css" }), contentType: "image/png" });
  await failure.getByRole("button", { name: "Voltar à ficha", exact: true }).click();
  await page.getByRole("dialog", { name: "Sair antes de conferir o resultado?", exact: true })
    .getByRole("button", { name: "Voltar à ficha", exact: true }).click();
  expect(await (await page.request.get(endpoint)).json()).toMatchObject({ condition: "cancelled", archive: null });
  expect(terminalLedger(patient)).toBe(stock);
});

test("residence deadline archives a cancelled ENT with one signed PDF and leaves the decision to the administrator", async ({ page }) => {
  const { admin, patient, doc } = await entTerminalFixture({ kind: "cancelled" });
  const endpoint = `/api/documents/${doc.id}/lifecycle/archive`;
  const stock = terminalLedger(patient);
  const count = () => sql(`select count(*) from private.document_archive_attempts where document_id=${q(doc.id)} and prepared_by is null`);
  const runWorker = () => page.request.post("/api/notifications/worker", {
    headers: { authorization: "Bearer local-test-worker-only" },
  });
  // This connection-local setting changes only the timestamp of the new
  // synthetic event. The production immutability guard remains enabled.
  const moveFixtureClock = (days: number) => sql(`begin;
    set local session_replication_role='replica';
    update public.document_events set created_at=now()-make_interval(days=>${q(String(days))}::integer)
      where document_id=${q(doc.id)} and action in ('ent.cancel','ent.consent_cancel') and body->>'status'='cancelled';
    commit;`);
  await loginDecision(page, fixtures.adminA.email, patient);
  const settingsVersion = Number(sql(`select version from public.patient_settings where care_recipient_id=${q(patient)}`));
  await rpc(admin, "configure_patient_access", {
    p_patient: patient, p_kind: "settings", p_change: { archiveDays: 11 }, p_key: randomUUID(), p_version: settingsVersion,
  });
  const before = await page.request.get(endpoint);
  expect(await before.json()).toMatchObject({ condition: "cancelled", archiveDays: 11, archive: null });
  expect((await admin.rpc("claim_scheduled_document_archives", { p_limit: 1 })).error?.code).toBe("42501");
  moveFixtureClock(8);
  const notYetDue = await runWorker();
  expect(notYetDue.status(), await notYetDue.text()).toBe(200);
  expect(count()).toBe("0");

  moveFixtureClock(80_000);
  const processed = await runWorker();
  expect(processed.status(), await processed.text()).toBe(200);
  expect(count()).toBe("1");
  const readArchive = async () => (await page.request.get(endpoint)).json();
  let result = await readArchive();
  if (!result.archive) {
    // The shared test stack may have an older queue. Prioritize only the
    // request actually scheduled for this fixture and process it normally.
    sql(`update private.initial_document_pdf_requests q set next_attempt_at='-infinity'
      from private.document_archive_attempts a
      where q.id=a.id and a.document_id=${q(doc.id)} and a.prepared_by is null and a.archived_at is null`);
    const drained = await runWorker();
    expect(drained.status(), await drained.text()).toBe(200);
    result = await readArchive();
  }
  expect(result).toMatchObject({
    condition: "archived", canDecide: true,
    archive: { automatic: true, actorName: "Sistema", previousState: "cancelled", decision: null },
  });
  await page.goto(`/fichas/${doc.id}`);
  await page.getByRole("button", { name: "Revisar encerramento", exact: true }).click();
  const review = page.getByRole("dialog", { name: "Confirmar encerramento", exact: true });
  await expect(review.getByText("Arquivamento automático pelo prazo da residência")).toBeVisible();
  const href = await review.getByRole("link", { name: "Baixar PDF consolidado", exact: true }).getAttribute("href");
  expect(href).toContain(result.archive.issuanceId);
  const download = await page.request.get(href!);
  expect(download.status()).toBe(200);
  const issued = await rpc(admin, "pdf_issuance", { p_id: result.archive.issuanceId });
  expect(issued).toMatchObject({
    validation: { accepted: true, profile: "PAdES-B-T", wholeFile: true },
    snapshot: { archiveFacts: { actorName: "Sistema", previousState: "cancelled" } },
  });
  await review.getByRole("button", { name: "Confirmar encerramento definitivo", exact: true }).click();
  await page.getByRole("dialog", { name: "Encerramento confirmado", exact: true }).getByRole("button", { name: "Concluir", exact: true }).click();
  expect(count()).toBe("1");
  expect((await (await page.request.get(href!)).body()).equals(await download.body())).toBe(true);
  expect(terminalLedger(patient)).toBe(stock);
});
