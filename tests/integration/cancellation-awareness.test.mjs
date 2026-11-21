import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { cancellationFixture, awareness, awarenessFacts, actor, rpc, fixtures } from "./cancellation-awareness-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { patientB } from "../../scripts/test-constants.mjs";
import { whileRowWaits, whileAdvisoryWaits } from "./lock-barrier.mjs";
import { setup, issue } from "./v4-fixtures.mjs";

for (const type of ["REQ", "COM", "ENT", "BAL"]) test(type + " cancellation requires its own personal awareness without changing issued material, original SCI or stock", async () => {
  const f = await cancellationFixture(type), id = f.document.id, before = awarenessFacts(id);
  const source = await awareness(f.family, id);
  assert.equal(f.document.status, "cancelled"); assert.equal(source.state, "pending"); assert.equal(source.eligible, true);
  assert.equal(source.personalAcknowledgement, null); assert.equal(source.totalAcknowledgements, 0);
  assert.equal(awarenessFacts(id), before, "A read must not acknowledge the cancellation");
  const p = { p_id: id, p_event: source.cancellation.id, p_key: randomUUID() };
  assert.equal((await f.family.rpc("acknowledge_document_cancellation", { ...p, p_event: randomUUID() })).error?.code, "PT409");
  const pro = await actor("professional", f.patient);
  assert.equal((await pro.rpc("acknowledge_document_cancellation", { ...p, p_key: randomUUID() })).error?.code, "42501");
  const results = await Promise.all([p, { ...p, p_key: randomUUID() }].map(packet => rpc(f.family, "acknowledge_document_cancellation", packet)));
  for (const result of results) {
    assert.equal(result.state, "acknowledged"); assert.equal(result.totalAcknowledgements, 1);
    assert.equal(result.personalAcknowledgement.actorId, fixtures.family.id);
  }
  assert.equal(awarenessFacts(id), before);
  assert.equal((await awareness(f.family, id)).cancellation.id, source.cancellation.id);
  const after = await rpc(f.family, "operational_document", { p_id: id });
  assert.deepEqual(after.payload, f.beforeCancel.payload);
  assert.equal(after.status, "cancelled"); assert.equal(after.version, f.document.version + 1);
  assert.equal(after.events.at(-1).action, type.toLowerCase() + ".cancellation_acknowledged");
  assert.equal((await rpc(f.family, "acknowledge_document_cancellation", p)).personalAcknowledgement.id, results[0].personalAcknowledgement.id);
  const committedKey = sql(`select idempotency_key from public.document_events where id=${q(results[0].personalAcknowledgement.id)}`);
  assert.equal((await f.family.rpc("acknowledge_document_cancellation", { ...p, p_key: committedKey, p_event: randomUUID() })).error?.code, "23505");
  assert.equal(awarenessFacts(id), before);
});

test("cancellation awareness uses current read and family authority, allowing only own-key recovery after science loss", async () => {
  const f = await cancellationFixture(), id = f.document.id, source = await awareness(f.family, id);
  const p = { p_id: id, p_event: source.cancellation.id, p_key: randomUUID() };
  const result = await rpc(f.family, "acknowledge_document_cancellation", p);
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.family.id)},'req.science',false)`);
  assert.equal((await rpc(f.family, "acknowledge_document_cancellation", p)).personalAcknowledgement.id, result.personalAcknowledgement.id);
  assert.equal((await f.family.rpc("acknowledge_document_cancellation", { ...p, p_key: randomUUID() })).error?.code, "42501");
  const outside = await actor("adminB", patientB);
  assert.equal((await outside.rpc("document_cancellation_awareness", { p_id: id })).error?.code, "42501");
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.family.id)},'req.read',false)`);
  assert.equal((await f.family.rpc("document_cancellation_awareness", { p_id: id })).error?.code, "42501");
  assert.equal((await f.family.rpc("acknowledge_document_cancellation", p)).error?.code, "42501");
  assert.equal(sql("select has_function_privilege('anon','public.document_cancellation_awareness(uuid)','EXECUTE') or has_function_privilege('service_role','public.acknowledge_document_cancellation(uuid,uuid,uuid)','EXECUTE') or has_function_privilege('authenticated','private.document_cancellation_awareness(uuid)','EXECUTE')"), "f");
});

test("cancellation awareness rechecks family authority after a real document lock wait", { timeout: 45000 }, async () => {
  const f = await cancellationFixture(), source = await awareness(f.family, f.document.id), before = awarenessFacts(f.document.id);
  const result = await whileRowWaits("operational_documents", f.document.id, "acknowledge_document_cancellation",
    () => f.family.rpc("acknowledge_document_cancellation", { p_id: f.document.id, p_event: source.cancellation.id, p_key: randomUUID() }),
    () => sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.family.id)},'req.science',false)`));
  assert.equal(result.error?.code, "42501"); assert.equal(awarenessFacts(f.document.id), before);
  assert.equal((await awareness(f.family, f.document.id)).totalAcknowledgements, 0);
});

test("cancellation awareness rolls back its event, version and queued notices after late authority loss", async () => {
  const f = await cancellationFixture(), id = f.document.id, source = await awareness(f.family, id);
  const before = awarenessFacts(id), notices = sql(`select count(*) from public.requisition_notifications where document_id=${q(id)}`);
  sql(`create function private.test_cancellation_awareness_authority() returns trigger language plpgsql security definer set search_path='' as $$begin
    if new.document_id=${q(id)}::uuid and new.action='req.cancellation_acknowledged' then
      insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.family.id)},'req.science',false);
    end if;return new;end;$$;
    revoke all on function private.test_cancellation_awareness_authority() from public,anon,authenticated,service_role;
    create trigger test_cancellation_awareness_authority after insert on public.document_events for each row execute function private.test_cancellation_awareness_authority();`);
  try {
    const result = await f.family.rpc("acknowledge_document_cancellation", { p_id: id, p_event: source.cancellation.id, p_key: randomUUID() });
    assert.equal(result.error?.code, "42501");
    assert.equal(awarenessFacts(id), before);
    assert.equal((await rpc(f.family, "operational_document", { p_id: id })).version, f.document.version);
    assert.equal((await awareness(f.family, id)).totalAcknowledgements, 0);
    assert.equal(sql(`select count(*) from public.requisition_notifications where document_id=${q(id)}`), notices);
  } finally { sql("drop trigger test_cancellation_awareness_authority on public.document_events;drop function private.test_cancellation_awareness_authority();"); }
});

test("cancellation awareness follows the patient stock lock order and rechecks authority after waiting", { timeout: 45000 }, async () => {
  const f = await cancellationFixture(), id = f.document.id, source = await awareness(f.family, id), before = awarenessFacts(id);
  const result = await whileAdvisoryWaits("stock:" + f.patient,
    () => f.family.rpc("acknowledge_document_cancellation", { p_id: id, p_event: source.cancellation.id, p_key: randomUUID() }),
    () => sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.family.id)},'req.science',false)`));
  assert.equal(result.error?.code, "42501"); assert.equal(awarenessFacts(id), before);
  assert.equal((await awareness(f.family, id)).totalAcknowledgements, 0);
});

test("a mandatory internal cancellation request survives disabled optional notices without manufacturing SCI", async () => {
  const f = await setup(), family = await actor("family", f.patient);
  const original = sql(`select notification_preferences from public.profiles where id=${q(fixtures.family.id)}`);
  try {
    sql(`update public.profiles set notification_preferences=notification_preferences||'{"internal":false}'::jsonb where id=${q(fixtures.family.id)};
      insert into public.notification_event_rules(care_recipient_id,event,subject_role,channels,include_pdf,cooldown_minutes)
      values(${q(f.patient)},'req.status','family',array[]::text[],false,120)
      on conflict(care_recipient_id,event,subject_role) do update set channels=array[]::text[],cooldown_minutes=120;`);
    const d = await issue(f.patient, [f.products[0]]);
    await rpc(f.admin, "transition_requisition_status", { p_requisition_id: d.id, p_to_status: "cancelled", p_reason: "Aviso próprio obrigatório, sem canais opcionais." });
    assert.equal(sql(`select count(*) from public.requisition_notifications where document_id=${q(d.id)} and event_key='req.status' and channel='internal' and recipient_user_id=${q(fixtures.family.id)}`), "1");
    const pending = await awareness(family, d.id);
    assert.equal(pending.state, "pending"); assert.equal(pending.totalAcknowledgements, 0);
    assert.equal(sql(`select count(*) from public.requisition_science_events where requisition_id=${q(d.id)}`), "0");
  } finally { sql(`update public.profiles set notification_preferences=${q(original)}::jsonb where id=${q(fixtures.family.id)}`); }
});
