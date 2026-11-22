import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { progressPreparationFixture as fixture, progressFacts, actor, rpc, fixtures, sql, q } from "./progress-preparation-fixtures.mjs";
import { whileRowWaits } from "./lock-barrier.mjs";

const packet = (f, publication) => ({ p_document: f.id, p_key: randomUUID(), p_body: { ...f.content.note, ...(publication ? { publication } : {}) } });

test("family defaults are private, explicit public and collective attempts are refused without operational effects", async () => {
  const f = await fixture(), before = progressFacts(f);
  const published = await rpc(f.family, "document_progress_publish", packet(f));
  assert.equal(published.note.visibility, "family");
  const professional = await actor("professional", f.patient);
  assert.equal((await rpc(professional, "document_progress", { p_document: f.id, p_filter: "manual" })).total, 0);
  const publicAttempt = packet(f, { relevance: "normal", mentions: [], visibility: "public" });
  assert.equal((await f.family.rpc("document_progress_publish", publicAttempt)).error?.code, "42501");
  const allAttempt = packet(f); allAttempt.p_body.text = "Informação para @todos";
  assert.equal((await f.family.rpc("document_progress_publish", allAttempt)).error?.code, "22023");
  assert.equal(progressFacts(f), before);
  assert.equal(sql("select has_function_privilege('authenticated','private.progress_family_writer(uuid)','execute')"), "f");
});

test("an individually mentioned team member reads only that private note and loses access when document read is revoked", async () => {
  const f = await fixture();
  await rpc(f.family, "document_progress_publish", packet(f));
  const published = await rpc(f.family, "document_progress_publish", packet(f, { relevance: "attention", mentions: [fixtures.professional.id], visibility: "family" }));
  const professional = await actor("professional", f.patient);
  const feed = await rpc(professional, "document_progress", { p_document: f.id, p_filter: "manual" });
  assert.equal(feed.total, 1); assert.equal(feed.data[0].id, published.note.id);
  sql(`insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${q(f.patient)},'req.read',${q(fixtures.professional.id)},false)`);
  assert.equal((await professional.rpc("document_progress", { p_document: f.id })).error?.code, "42501");
});

test("a previously public receipt remains recoverable after its author becomes family; a new public publication is denied", async () => {
  const f = await fixture(), professional = await actor("professional", f.patient);
  const p = packet(f, { relevance: "normal", mentions: [], visibility: "public" });
  const original = await rpc(professional, "document_progress_publish", p);
  sql(`update public.care_recipient_memberships set role='family' where care_recipient_id=${q(f.patient)} and user_id=${q(fixtures.professional.id)}`);
  const recovered = await rpc(professional, "document_progress_publish", p);
  assert.equal(recovered.recovered, true); assert.equal(recovered.note.id, original.note.id);
  assert.equal(recovered.note.visibility, "public");
  assert.equal((await professional.rpc("document_progress_publish", { ...p, p_key: randomUUID() })).error?.code, "42501");
});

test("family authority is rechecked after a late author-profile wait before committing the private note", async () => {
  const f = await fixture(), before = progressFacts(f), p = packet(f);
  const result = await whileRowWaits("profiles", fixtures.family.id, "document_progress_publish",
    () => f.family.rpc("document_progress_publish", p),
    () => sql(`update public.care_recipient_memberships set role='professional' where care_recipient_id=${q(f.patient)} and user_id=${q(fixtures.family.id)}`));
  assert.equal(result.error?.code, "42501");
  assert.equal(sql("select count(*) from private.document_progress_notes where document_id=" + q(f.id)), "0");
  assert.equal(progressFacts(f), before);
});
