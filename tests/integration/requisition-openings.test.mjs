import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { setup, actor, rpc, issue, fixtures, env } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { whileAdvisoryWaits } from "./lock-barrier.mjs";

const count = id => Number(sql(`select count(*) from public.requisition_openings where requisition_id=${sqlLiteral(id)};`));
const recordArgs = (id, opening) => ({ p_id: id, p_material_identity: opening.materialIdentity, p_version: opening.version, p_key: randomUUID() });
const evidence = patient => sql(`select jsonb_build_object('events',(select jsonb_agg(to_jsonb(e) order by document_id,version) from public.document_events e where care_recipient_id=${sqlLiteral(patient)}),'documents',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id=${sqlLiteral(patient)}),'science',(select jsonb_agg(to_jsonb(s) order by id) from public.requisition_science_events s where care_recipient_id=${sqlLiteral(patient)}),'ledger',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(patient)}));`);

test("REQ openings distinguish inert reads, one concurrent replay, a new opening and SCI without changing document/ledger", async () => {
  const f = await setup(), req = await issue(f.patient, [f.products[0]]), reader = await actor("reader", f.patient), family = await actor("family", f.patient);
  const opening = await rpc(reader, "requisition_opening_context", { p_id: req.id });
  assert.ifError((await reader.from("requisition_items").select("id").eq("requisition_id", req.id)).error);
  await rpc(reader, "requisition_progress", { p_id: req.id });
  assert.equal(count(req.id), 0, "Preflight/data GETs are not observable openings");
  const before = evidence(f.patient), args = recordArgs(req.id, opening);
  const [first, retry] = await Promise.all([rpc(reader, "record_requisition_opening", args), rpc(reader, "record_requisition_opening", args)]);
  assert.equal(first.id, retry.id); assert.equal(count(req.id), 1);
  assert.equal(first.user_id, fixtures.reader.id); assert.equal(first.origin, "application_foreground_display_report");
  assert.equal(first.material_identity, opening.materialIdentity); assert.ok(first.actor_name); assert.ok(first.recorded_at);
  assert.equal(evidence(f.patient), before, "Opening is not SCI, physical act, notification or technical version");
  assert.ok((await reader.rpc("record_requisition_opening", { ...args, p_material_identity: "0".repeat(64) })).error);
  assert.ok((await reader.rpc("record_requisition_opening", { ...args, p_version: opening.version + 100 })).error);
  await rpc(reader, "record_requisition_opening", { ...args, p_key: randomUUID() }); assert.equal(count(req.id), 2);
  const aware = await rpc(family, "acknowledge_requisition", { p_id: req.id, p_mode: "express", p_version: opening.version, p_material_identity: opening.materialIdentity });
  assert.equal(count(req.id), 2, "SCI alone does not fabricate an opening"); assert.ok(aware.version > opening.version);
  assert.equal((await rpc(reader, "record_requisition_opening", args)).id, first.id);
  assert.equal((await reader.rpc("record_requisition_opening", { ...args, p_version: aware.version })).error?.code, "23505");
  assert.ok((await reader.from("requisition_openings").update({ actor_name: "Forged" }).eq("id", first.id)).error);
  assert.throws(() => sql(`update public.requisition_openings set actor_name='Forged' where id=${sqlLiteral(first.id)};`), /immutable/);
});

test("REQ opening authorization and RLS reject another patient, global identity without a local membership and direct writes", async () => {
  const f = await setup(), req = await issue(f.patient, [f.products[0]]), reader = await actor("reader", f.patient);
  const opening = await rpc(reader, "requisition_opening_context", { p_id: req.id }), args = recordArgs(req.id, opening);
  await rpc(reader, "record_requisition_opening", args);
  const other = await setup(); await actor("reader", other.patient);
  assert.equal((await reader.rpc("record_requisition_opening", { ...args, p_key: randomUUID() })).error?.code, "42501");
  const visible = await reader.from("requisition_openings").select("id").eq("requisition_id", req.id); assert.ifError(visible.error); assert.deepEqual(visible.data, []);
  sql(`delete from public.care_recipient_memberships where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.global.id)};`);
  const global = await actor("global");
  assert.equal((await global.rpc("record_requisition_opening", { ...args, p_key: randomUUID() })).error?.code, "42501");
  assert.equal((await global.rpc("acknowledge_requisition", { p_id: req.id, p_mode: "express", p_version: opening.version, p_material_identity: opening.materialIdentity })).error?.code, "42501");
  assert.equal(sql(`select count(*) from public.requisition_science_events where requisition_id=${sqlLiteral(req.id)};`), "0");
  assert.deepEqual((await global.from("requisition_openings").select("id").eq("requisition_id", req.id)).data, []);
  await actor("reader", f.patient);
  assert.ok((await reader.from("requisition_openings").insert({ requisition_id: req.id, care_recipient_id: f.patient, user_id: fixtures.family.id, material_identity: opening.materialIdentity, reference_version: opening.version, opening_key: randomUUID() })).error);
  const anon = createClient(env.url, env.anonKey, { auth: { persistSession: false } });
  assert.ok((await anon.from("requisition_openings").select("id")).error);
  assert.equal(count(req.id), 1);
});

test("REQ opening rechecks a real Auth session after its observed idempotency lock", async () => {
  const f = await setup(), req = await issue(f.patient, [f.products[0]]), reader = await actor("reader", f.patient);
  const opening = await rpc(reader, "requisition_opening_context", { p_id: req.id }), args = recordArgs(req.id, opening);
  const token = (await reader.auth.getSession()).data.session.access_token;
  const stale = createClient(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: "Bearer " + token } } });
  const before = evidence(f.patient);
  const result = await whileAdvisoryWaits(`req-opening:${fixtures.reader.id}:${args.p_key}`, () => stale.rpc("record_requisition_opening", args), async () => { assert.ifError((await reader.auth.signOut({ scope: "local" })).error); });
  assert.equal(result.error?.code, "42501"); assert.equal(count(req.id), 0); assert.equal(evidence(f.patient), before);
});

test("REQ opening rechecks the read capability after waiting without changing SCI or custody", async () => {
  const f = await setup(), req = await issue(f.patient, [f.products[0]]), reader = await actor("reader", f.patient);
  const opening = await rpc(reader, "requisition_opening_context", { p_id: req.id }), args = recordArgs(req.id, opening), before = evidence(f.patient);
  const result = await whileAdvisoryWaits(`req-opening:${fixtures.reader.id}:${args.p_key}`, () => reader.rpc("record_requisition_opening", args), async () => {
    sql(`insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${sqlLiteral(f.patient)},'req.read',${sqlLiteral(fixtures.reader.id)},false);`);
  });
  assert.equal(result.error?.code, "42501"); assert.equal(count(req.id), 0); assert.equal(evidence(f.patient), before);
});
