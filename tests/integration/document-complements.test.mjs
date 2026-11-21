import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setup, issue, actor, rpc, fixtures } from "./v4-fixtures.mjs";
import { cancellationFixture, awarenessFacts } from "./cancellation-awareness-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { whileAdvisoryWaits } from "./lock-barrier.mjs";
import { createComplementCandidate as child, loadComplementDocument as doc, readComplementLinks as links, complementPacket as packet, complementFrozenEvents as frozenEvents } from "./document-complements-fixtures.mjs";

for (const type of ["REQ", "COM", "ENT", "BAL"]) test(type + " accepts a newer issued complement while preserving cancellation, original material, SCI and stock", async () => {
  const f = await cancellationFixture(type), sourceId = f.document.id, childId = await child(f, type);
  const p = await packet(f.admin, sourceId, childId), beforeSource = awarenessFacts(sourceId), beforeChild = awarenessFacts(childId);
  const oldEvents = JSON.parse(frozenEvents(sourceId));
  const empty = await links(f.admin, sourceId); assert.equal(empty.total, 0);
  const candidates = await rpc(f.admin, "document_complement_candidates", { p_id: sourceId, p_type: type });
  assert.ok(candidates.documents.some(d => d.id === childId));
  const result = await rpc(f.admin, "link_document_complement", p);
  assert.equal(result.link.document.id, childId); assert.equal(result.link.reason, p.p_reason); assert.equal(result.recovered, false);
  assert.equal(awarenessFacts(sourceId), beforeSource); assert.equal(awarenessFacts(childId), beforeChild);
  const after = await doc(f.admin, sourceId); assert.equal(after.status, "cancelled"); assert.equal(after.version, p.p_source_version + 1);
  assert.equal((await doc(f.admin, childId)).version, p.p_child_version + 1);
  const events = JSON.parse(frozenEvents(sourceId)); assert.deepEqual(events.slice(0, oldEvents.length), oldEvents);
  assert.deepEqual(events.at(-1).body.event, { relationId: result.link.id });
  assert.equal((await links(f.admin, childId)).links[0].role, "source");
  assert.equal((await links(f.admin, sourceId)).links[0].role, "supplement");
  assert.equal((await rpc(f.admin, "link_document_complement", p)).link.id, result.link.id);
});

test("cross-type complement masks an unauthorized financial peer, including its reason and author", async () => {
  const f = await setup(), sourceId = (await issue(f.patient, f.products)).id, childId = await child(f, "COM");
  await rpc(f.admin, "link_document_complement", await packet(f.admin, sourceId, childId));
  const pro = await actor("professional", f.patient), view = await links(pro, sourceId);
  assert.equal(view.total, 1); assert.deepEqual(Object.keys(view.links[0]).sort(), ["accessible", "id", "role"]);
  assert.equal(view.links[0].accessible, false);
  assert.equal((await pro.rpc("document_complements", { p_id: childId })).error?.code, "42501");
  const all = await links(f.admin, sourceId); assert.equal(all.links[0].document.type, "COM");
  assert.equal((await pro.rpc("link_document_complement", await packet(f.admin, sourceId, childId))).error?.code, "42501");
});

test("duplicate concurrency recovers one immutable relation; stale, changed and backwards intentions are rejected", async () => {
  const f = await setup(), sourceId = (await issue(f.patient, f.products)).id, childId = await child(f, "COM");
  const p = await packet(f.admin, sourceId, childId), result = await Promise.all([rpc(f.admin, "link_document_complement", p), rpc(f.admin, "link_document_complement", p)]);
  assert.equal(result[0].link.id, result[1].link.id); assert.equal(result.filter(x => x.recovered).length, 1);
  assert.equal((await links(f.admin, sourceId)).total, 1);
  assert.equal((await f.admin.rpc("link_document_complement", { ...p, p_reason: "Outra intenção com a mesma identidade." })).error?.code, "23505");
  const newer = await child(f, "COM"), stale = await packet(f.admin, sourceId, newer);
  assert.equal((await f.admin.rpc("link_document_complement", { ...stale, p_source_version: stale.p_source_version - 1 })).error?.code, "PT409");
  assert.equal((await f.admin.rpc("link_document_complement", await packet(f.admin, childId, sourceId))).error?.code, "22023");
  assert.equal((await f.admin.rpc("link_document_complement", { ...stale, p_child: sourceId })).error?.code, "22023");
  assert.throws(() => sql(`update private.document_complements set reason='Alteração indevida' where id=${q(result[0].link.id)}`), /confirmed event is immutable/);
});

test("same-patient, issuer authority, pagination and closed grants are enforced by real Auth", async () => {
  const f = await setup(), other = await setup(), sourceId = (await issue(f.patient, f.products)).id, otherId = await child(other, "COM");
  const otherDoc = await doc(other.admin, otherId); await actor("adminA", f.patient);
  const sourceDoc = await doc(f.admin, sourceId);
  assert.equal((await f.admin.rpc("link_document_complement", { p_source: sourceId, p_child: otherId, p_source_version: sourceDoc.version, p_child_version: otherDoc.version, p_reason: "Outro paciente não é permitido.", p_key: randomUUID() })).error?.code, "42501");
  const childId = await child(f, "COM"), family = await actor("family", f.patient);
  assert.equal((await family.rpc("link_document_complement", await packet(f.admin, sourceId, childId))).error?.code, "42501");
  assert.equal((await f.admin.rpc("document_complements", { p_id: sourceId, p_page: 0 })).error?.code, "22023");
  const blankReason = { ...(await packet(f.admin, sourceId, childId)), p_reason: " \t\n " };
  assert.equal((await f.admin.rpc("link_document_complement", blankReason)).error?.code, "22023");
  assert.equal((await f.admin.rpc("document_complement_candidates", { p_id: sourceId, p_type: "REQ", p_size: 51 })).error?.code, "22023");
  assert.equal(sql("select has_table_privilege('authenticated','private.document_complements','INSERT') or has_table_privilege('service_role','private.document_complements','SELECT') or has_function_privilege('anon','public.link_document_complement(uuid,uuid,integer,integer,text,uuid)','EXECUTE') or has_function_privilege('service_role','public.document_complements(uuid,integer,integer)','EXECUTE') or has_function_privilege('authenticated','private.document_complement_view(private.document_complements,uuid)','EXECUTE')"), "f");
});

test("current authority is rechecked after the native stock lock; own-key recovery needs reads but not retained creation authority", { timeout: 45000 }, async () => {
  const f = await setup(), sourceId = (await issue(f.patient, f.products)).id, childId = await child(f, "COM");
  const p = await packet(f.admin, sourceId, childId);
  const result = await whileAdvisoryWaits("stock:" + f.patient,
    () => f.admin.rpc("link_document_complement", p),
    () => sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'com.create',false)`));
  assert.equal(result.error?.code, "42501"); assert.equal((await links(f.admin, sourceId)).total, 0);
  sql(`update public.capability_overrides set enabled=true where care_recipient_id=${q(f.patient)} and subject_user=${q(fixtures.adminA.id)} and capability='com.create'`);
  const committed = await rpc(f.admin, "link_document_complement", p);
  sql(`update public.capability_overrides set enabled=false where care_recipient_id=${q(f.patient)} and subject_user=${q(fixtures.adminA.id)} and capability='com.create'`);
  assert.equal((await rpc(f.admin, "link_document_complement", p)).link.id, committed.link.id);
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'req.read',false)`);
  assert.equal((await f.admin.rpc("link_document_complement", p)).error?.code, "42501");
});

test("own lookup waits for the same transaction boundary and never creates a relation or science", { timeout: 45000 }, async () => {
  const f = await setup(), sourceId = (await issue(f.patient, f.products)).id, childId = await child(f, "COM");
  const p = await packet(f.admin, sourceId, childId), before = awarenessFacts(sourceId);
  const missing = await whileAdvisoryWaits("stock:" + f.patient,
    () => f.admin.rpc("document_complement_attempt", { p_source: sourceId, p_key: p.p_key }), () => {});
  assert.ifError(missing.error); assert.equal(missing.data.state, "not_found"); assert.equal(awarenessFacts(sourceId), before);
  const written = await rpc(f.admin, "link_document_complement", p);
  const own = await rpc(f.admin, "document_complement_attempt", { p_source: sourceId, p_key: p.p_key });
  assert.equal(own.state, "confirmed"); assert.equal(own.result.link.id, written.link.id);
  const timeline = await rpc(f.admin, "document_progress", { p_document: sourceId });
  assert.ok(timeline.data.some(e => e.action === "req.complement_added"));
  const family = await actor("family", f.patient);
  assert.equal((await rpc(family, "document_complement_attempt", { p_source: sourceId, p_key: p.p_key })).state, "not_found");
  assert.equal(awarenessFacts(sourceId), before);
  for (let index = 0; index < 2; index++) { const extra = await child(f, "COM"); await rpc(f.admin, "link_document_complement", await packet(f.admin, sourceId, extra)); }
  const pages = await Promise.all([1, 2].map(p_page => rpc(f.admin, "document_complements", { p_id: sourceId, p_page, p_size: 2 })));
  assert.equal(pages[0].total, 3); assert.equal(pages[0].links.length, 2); assert.equal(pages[1].links.length, 1);
  assert.equal(new Set(pages.flatMap(page => page.links.map(link => link.id))).size, 3);
});

test("late authority loss rolls back both versions, both events and the formal relation", async () => {
  const f = await setup(), sourceId = (await issue(f.patient, f.products)).id, childId = await child(f, "COM");
  const p = await packet(f.admin, sourceId, childId), sourceEvents = frozenEvents(sourceId), childEvents = frozenEvents(childId);
  sql(`create function private.test_complement_authority() returns trigger language plpgsql security definer set search_path='' as $$begin
   if new.document_id=${q(childId)}::uuid and new.action='com.complement_linked' then
    insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'com.create',false);
   end if;return new;end;$$;
   revoke all on function private.test_complement_authority() from public,anon,authenticated,service_role;
   create trigger test_complement_authority after insert on public.document_events for each row execute function private.test_complement_authority();`);
  try {
    assert.equal((await f.admin.rpc("link_document_complement", p)).error?.code, "42501");
    assert.equal((await links(f.admin, sourceId)).total, 0);
    assert.equal((await doc(f.admin, sourceId)).version, p.p_source_version); assert.equal((await doc(f.admin, childId)).version, p.p_child_version);
    assert.equal(frozenEvents(sourceId), sourceEvents); assert.equal(frozenEvents(childId), childEvents);
  } finally { sql("drop trigger test_complement_authority on public.document_events;drop function private.test_complement_authority();"); }
});
