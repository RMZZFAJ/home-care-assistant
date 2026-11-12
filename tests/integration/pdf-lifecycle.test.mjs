import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { cancellationFixture, awarenessFacts, rpc, fixtures } from "./cancellation-awareness-fixtures.mjs";
import { createComplementCandidate, complementPacket } from "./document-complements-fixtures.mjs";
import { actor, setup } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { whileAdvisoryWaits } from "./lock-barrier.mjs";
const reserve = (client, id, version = null, key = randomUUID()) => rpc(client, "reserve_pdf_issuance_v15", { p_document: id, p_version: version, p_key: key });

for (const type of ["REQ", "COM", "ENT", "BAL"]) test(type + " V15 freezes cancellation, its own awareness and formal links at the selected version", async () => {
  const f = await cancellationFixture(type), id = f.document.id, childId = await createComplementCandidate(f, "COM");
  const before = awarenessFacts(id), early = await reserve(f.admin, id, f.beforeCancel.version);
  assert.equal(early.rendererRevision, 15); assert.equal(early.snapshot.lifecycleFacts.cancellation.state, "not_cancelled");
  assert.equal(early.snapshot.lifecycleFacts.complements.length, 0);
  const pending = await reserve(f.admin, id), c = pending.snapshot.lifecycleFacts.cancellation;
  assert.equal(c.state, "recorded"); assert.equal(c.acknowledgements.length, 0); assert.ok(c.act.reason.includes("Cancelamento"));
  await rpc(f.family, "acknowledge_document_cancellation", { p_id: id, p_event: c.act.id, p_key: randomUUID() });
  const packet = await complementPacket(f.admin, id, childId);
  const link = await rpc(f.admin, "link_document_complement", packet);
  const current = await reserve(f.admin, id), facts = current.snapshot.lifecycleFacts;
  assert.equal(facts.version, current.version); assert.equal(facts.documentId, id);
  assert.equal(facts.cancellation.acknowledgements.length, 1); assert.equal(facts.cancellation.acknowledgements[0].actorId, fixtures.family.id);
  assert.equal(facts.complements[0].id, link.link.id); assert.equal(facts.complements[0].accessible, true);
  assert.equal(facts.complements[0].document.version, packet.p_child_version); assert.equal(facts.complements[0].document.id, childId);
  const reverse = await reserve(f.admin, childId); assert.equal(reverse.snapshot.lifecycleFacts.complements[0].role, "source");
  const historical = await reserve(f.admin, id, pending.version); assert.deepEqual(historical.snapshot.lifecycleFacts, pending.snapshot.lifecycleFacts);
  const repeated = await rpc(f.admin, "reserve_pdf_issuance_v15", { p_document: id, p_version: null, p_key: sql(`select idempotency_key from private.pdf_issuances where id=${q(pending.id)}`) });
  assert.equal(repeated.id, pending.id); assert.deepEqual(repeated.snapshot, pending.snapshot);
  if (type === "BAL") { assert.ok(current.snapshot.balanceApplication); assert.ok(Array.isArray(current.snapshot.balanceReviewCorrections)); }
  if (type === "COM") assert.ok(Array.isArray(current.snapshot.purchaseEntryBalances));
  assert.equal(awarenessFacts(id), before);
  mkdirSync("output/phase-d-work/pdf-lifecycle-native", { recursive: true });
  writeFileSync("output/phase-d-work/pdf-lifecycle-native/" + type + ".json", JSON.stringify(current));
});

test("V15 redacts an unreadable financial peer and blocks all recovery paths for an earlier known copy after revocation", async () => {
  const f = await cancellationFixture(), id = f.document.id, childId = await createComplementCandidate(f, "COM");
  await rpc(f.admin, "link_document_complement", await complementPacket(f.admin, id, childId));
  const key = randomUUID(), known = await reserve(f.admin, id, null, key), pro = await actor("professional", f.patient);
  const redacted = await reserve(pro, id), link = redacted.snapshot.lifecycleFacts.complements[0];
  assert.equal(link.accessible, false); assert.deepEqual(Object.keys(link).sort(), ["accessible", "eventId", "id", "role", "version"]);
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'com.read',false)`);
  assert.equal((await f.admin.rpc("pdf_issuance", { p_id: known.id })).error?.code, "42501");
  for (const name of ["reserve_pdf_issuance_v14", "reserve_pdf_issuance_v15"])
    assert.equal((await f.admin.rpc(name, { p_document: id, p_key: key, p_version: null })).error?.code, "42501");
  const newCopy = await reserve(f.admin, id); assert.equal(newCopy.snapshot.lifecycleFacts.complements[0].accessible, false);
  assert.deepEqual(JSON.parse(sql(`select snapshot from private.pdf_issuances where id=${q(known.id)}`)), known.snapshot);
});

test("V15 retains older intentions and serializes concurrent own-key reservation with current authority", { timeout: 45000 }, async () => {
  const f = await cancellationFixture("COM"), id = f.document.id, key = randomUUID();
  const old = await rpc(f.admin, "reserve_pdf_issuance_v14", { p_document: id, p_version: null, p_key: key });
  const recovered = await reserve(f.admin, id, null, key); assert.equal(recovered.rendererRevision, 13); assert.deepEqual(recovered.snapshot, old.snapshot);
  const fresh = randomUUID(), pair = await Promise.all([reserve(f.admin, id, null, fresh), reserve(f.admin, id, null, fresh)]);
  assert.equal(pair[0].id, pair[1].id); assert.equal(pair[0].rendererRevision, 15);
  const waitingKey = randomUUID();
  const denied = await whileAdvisoryWaits("pdf-issuance:" + fixtures.adminA.id + ":" + waitingKey,
    () => f.admin.rpc("reserve_pdf_issuance_v15", { p_document: id, p_version: null, p_key: waitingKey }),
    () => sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'com.read',false)`));
  assert.equal(denied.error?.code, "42501");
  assert.equal(sql("select has_function_privilege('anon','public.reserve_pdf_issuance_v15(uuid,uuid,integer)','EXECUTE') or has_function_privilege('service_role','public.reserve_pdf_issuance_v15(uuid,uuid,integer)','EXECUTE') or has_function_privilege('authenticated','private.document_pdf_lifecycle(uuid,integer)','EXECUTE')"), "f");
});

test("V15 rolls back a newly frozen known reference when peer access is lost after insertion", async () => {
 const f = await cancellationFixture(), id = f.document.id, childId = await createComplementCandidate(f, "COM");
 await rpc(f.admin, "link_document_complement", await complementPacket(f.admin, id, childId));
 const key = randomUUID();
 sql(`create function private.test_pdf_lifecycle_authority() returns trigger language plpgsql security definer set search_path='' as $$begin
  if new.document_id=${q(id)}::uuid then insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled)
   values(${q(f.patient)},${q(fixtures.adminA.id)},'com.read',false);end if;return new;end;$$;
  revoke all on function private.test_pdf_lifecycle_authority() from public,anon,authenticated,service_role;
  create trigger test_pdf_lifecycle_authority after insert on private.pdf_issuances for each row execute function private.test_pdf_lifecycle_authority();`);
 try {
  const result = await f.admin.rpc("reserve_pdf_issuance_v15", { p_document: id, p_version: null, p_key: key });
  assert.equal(result.error?.code, "42501");
  assert.equal(sql(`select count(*) from private.pdf_issuances where idempotency_key=${q(key)}`), "0");
 } finally { sql("drop trigger test_pdf_lifecycle_authority on private.pdf_issuances;drop function private.test_pdf_lifecycle_authority();"); }
});

test("V15 retains the already applied BAL balance and its independent stock provenance", async () => {
 const f = await setup();
 sql(`insert into public.patient_settings(care_recipient_id,settings) values(${q(f.patient)},'{"balReview":"optional"}'::jsonb) on conflict(care_recipient_id) do update set settings=public.patient_settings.settings||'{"balReview":"optional"}'::jsonb`);
 const d = await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "BAL", p_key: randomUUID(), p_draft: false, p_payload: { lines: f.products.map(productId => ({ productId, quantity: "2" })), notes: "Aplicação facultativa própria preservada na nova revisão." } });
 const before = awarenessFacts(d.id), row = await reserve(f.admin, d.id);
 assert.equal(row.snapshot.balanceApplication.state, "applied");
 assert.ok(row.snapshot.balanceApplication.lines.every(l => l.state === "known" && Number(l.quantity) === 2));
 assert.equal(row.snapshot.lifecycleFacts.cancellation.state, "not_cancelled");
 assert.equal(awarenessFacts(d.id), before);
});
