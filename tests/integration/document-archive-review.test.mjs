import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { actor, env, rpc } from "./v4-fixtures.mjs";
import { entTerminalFixture, terminalLedger } from "./ent-terminal-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";

const worker = createClient(env.url, env.serviceKey, { auth: { persistSession: false } });
const reference = (client, id) => rpc(client, "document_archive_reference", { p_document: id });
const command = (review, mode = "policy", reason = "") => ({
  p_document: review.documentId, p_key: randomUUID(), p_version: review.version,
  p_reference: review.referenceHash, p_mode: mode, p_reason: reason,
});
const settlement = intent => ({ p_document: intent.p_document, p_key: intent.p_key, p_action: "archive" });

test("archive preparation is admin-only and keeps the official document and stock until a verified PDF exists", async () => {
  const fixture = await entTerminalFixture({ kind: "cancelled" });
  const { admin, doc, owner, patient } = fixture;
  const read = await reference(admin, doc.id);
  assert.equal(read.condition, "cancelled");
  assert.equal(read.canArchive, true);
  const intent = command(read, "other", "Arquivo fictício que aguarda assinatura.");
  assert.equal((await owner.rpc("prepare_document_archive", intent)).error?.code, "42501");
  assert.equal((await owner.rpc("settle_document_archive", settlement(intent))).error?.code, "42501");
  const before = sql(`select content_hash from public.operational_documents where id=${q(doc.id)}`);
  const stock = terminalLedger(patient);
  const [first, second] = await Promise.all([
    rpc(admin, "prepare_document_archive", intent), rpc(admin, "prepare_document_archive", intent),
  ]);
  assert.deepEqual(first, second);
  assert.equal(first.archivedAt, null);
  assert.deepEqual(await rpc(admin, "settle_document_archive", settlement(intent)), {
    state: "prepared", action: "archive", documentId: doc.id, key: intent.p_key, archive: first,
  });
  const candidate = await rpc(worker, "initial_document_pdf", { p_request: first.id, p_action: "reserve" });
  assert.equal(candidate.snapshot.archiveFacts.reason, intent.p_reason);
  assert.equal(candidate.snapshot.archiveFacts.sourceVersion, doc.version);
  assert.equal(candidate.requestedName, "Sistema · PDF consolidado");
  assert.equal(candidate.sourceHash, before);
  assert.equal((await admin.rpc("pdf_issuance", { p_id: candidate.id })).error?.code, "42501");
  assert.deepEqual(await rpc(worker, "pdf_issuance_public", { p_code: candidate.verificationCode }), { found: false });
  assert.equal((await admin.rpc("commit_document_archive", { p_document: doc.id, p_request: first.id })).error?.code, "PT409");
  const after = await reference(admin, doc.id);
  assert.equal(after.version, read.version);
  assert.equal(after.condition, "cancelled");
  assert.equal(terminalLedger(patient), stock);
});

test("a concurrent progress publication changes the archive reference without changing the document version", async () => {
  const { admin, doc, patient } = await entTerminalFixture({ kind: "cancelled" });
  const settingsVersion = Number(sql(`select version from public.patient_settings where care_recipient_id=${q(patient)}`));
  await rpc(admin, "configure_patient_access", {
    p_patient: patient, p_kind: "settings", p_change: { archiveDays: 11 }, p_key: randomUUID(), p_version: settingsVersion,
  });
  const reviewed = await reference(admin, doc.id);
  assert.equal(reviewed.archiveDays, 11);
  const intent = command(reviewed);
  const attempt = await rpc(admin, "prepare_document_archive", intent);
  const professional = await actor("professional", patient);
  await rpc(professional, "document_progress_publish", {
    p_document: doc.id, p_key: randomUUID(),
    p_body: { category: "record", stage: "completion", text: "Andamento fictício posterior à primeira revisão", references: [] },
  });
  const current = await reference(admin, doc.id);
  assert.equal(current.version, reviewed.version);
  assert.notEqual(current.referenceHash, reviewed.referenceHash);
  const closed = await rpc(admin, "settle_document_archive", settlement(intent));
  assert.deepEqual(closed, { state: "not_applied", action: "archive", documentId: doc.id, key: intent.p_key });
  assert.deepEqual(await rpc(admin, "settle_document_archive", settlement(intent)), closed);
  assert.equal((await admin.rpc("prepare_document_archive", intent)).error?.code, "PT409");
  assert.equal((await admin.rpc("prepare_document_archive", { ...intent, p_key: randomUUID() })).error?.code, "PT409");
  assert.equal((await admin.rpc("commit_document_archive", { p_document: doc.id, p_request: attempt.id })).error?.code, "PT409");
  assert.equal((await reference(admin, doc.id)).condition, "cancelled");
});
