import assert from "node:assert/strict";
import test, { after, afterEach, before } from "node:test";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { setup, actor, env, fixtures, rpc } from "./v4-fixtures.mjs";
import { pauseLocalAutomationForTests, sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";

const owned = new Set();
let automation = [];
before(() => {
  automation = JSON.parse(sql("select coalesce(jsonb_agg(jsonb_build_object('id',jobid,'name',jobname,'active',active)),'[]') from cron.job where jobname in ('hca-operational-lifecycle','hca-notification-worker')"));
  pauseLocalAutomationForTests();
});
after(() => { for (const job of automation) sql(`select cron.alter_job(jobid,active=>${job.active}) from cron.job where jobid=${job.id} and jobname=${q(job.name)}`); });
afterEach(() => { if (owned.size) sql(`update public.care_recipients set is_active=false where id=any(array[${[...owned].map(q).join(",")}]::uuid[])`); owned.clear(); });
async function fixture() { const f = await setup(); owned.add(f.patient); return f; }
const state = patient => JSON.parse(sql(`select coalesce((select jsonb_build_object('version',version,'settings',settings) from public.patient_settings where care_recipient_id=${q(patient)}),'{"version":1,"settings":{}}'::jsonb)`));
const packet = (patient, change) => ({ p_patient: patient, p_kind: "settings", p_change: change, p_key: randomUUID(), p_version: state(patient).version });
const history = patient => sql(`select coalesce(jsonb_agg(to_jsonb(c) order by id),'[]') from public.access_change_requests c where care_recipient_id=${q(patient)}`);

test("C031 real Auth distinguishes omitted, canonical replacement and explicit null, with stable replay and history", async () => {
  const f = await fixture();
  await rpc(f.admin, "configure_patient_access", packet(f.patient, { patientShortName: "Nome curto fictício" }));
  const original = history(f.patient);
  await rpc(f.admin, "configure_patient_access", packet(f.patient, { archiveDays: 8 }));
  assert.equal(state(f.patient).settings.patientShortName, "Nome curto fictício");
  const intent = packet(f.patient, { patientShortName: null });
  const responses = await Promise.all([f.admin.rpc("configure_patient_access", intent), f.admin.rpc("configure_patient_access", intent)]);
  for (const response of responses) assert.ifError(response.error);
  assert.equal(responses[0].data.id, responses[1].data.id);
  assert.equal(state(f.patient).settings.patientShortName, null);
  assert.equal(state(f.patient).version, 4);
  assert.deepEqual(JSON.parse(history(f.patient)).find(row => row.id === JSON.parse(original)[0].id), JSON.parse(original)[0]);
  assert.equal(JSON.parse(history(f.patient)).length, 3);
  assert.equal((await f.admin.rpc("configure_patient_access", { ...intent, p_change: {} })).error?.code, "23505");
  const current = await rpc(f.admin, "patient_governance", { p_patient: f.patient });
  assert.equal(current.data.settings.patientShortName, null);
});

test("C031 direct RPC refuses blank, spaces, padded, oversized and non-string names without any policy or history effect", async () => {
  const f = await fixture();
  await rpc(f.admin, "configure_patient_access", packet(f.patient, { patientShortName: "Anterior" }));
  const beforeState = state(f.patient), beforeHistory = history(f.patient);
  for (const patientShortName of ["", "   ", " padded ", "a".repeat(61), 12, false, {}, []]) {
    const result = await f.admin.rpc("configure_patient_access", packet(f.patient, { patientShortName }));
    assert.equal(result.error?.code, "22023", JSON.stringify({ patientShortName, error: result.error }));
    assert.deepEqual(state(f.patient), beforeState);
    assert.equal(history(f.patient), beforeHistory);
  }
  await rpc(f.admin, "configure_patient_access", packet(f.patient, { patientShortName: "a".repeat(60) }));
  assert.equal(state(f.patient).settings.patientShortName.length, 60);
});

test("C031 global removal remains a proposal until distinct local approval; other patient, authority and legacy grants stay intact", async () => {
  const f = await fixture();
  await rpc(f.admin, "configure_patient_access", packet(f.patient, { patientShortName: "Anterior" }));
  const other = await fixture(), otherBefore = state(other.patient), otherHistory = history(other.patient);
  const global = await actor("global");
  const proposal = await rpc(global, "configure_patient_access", packet(f.patient, { patientShortName: null }));
  assert.equal(proposal.status, "pending");
  assert.equal(state(f.patient).settings.patientShortName, "Anterior");
  const pending = await rpc(global, "patient_governance_changes", { p_patient: f.patient });
  const preview = pending.changes.find(row => row.id === proposal.id);
  assert.equal(preview.current.patientShortName, "Anterior");
  assert.equal(preview.proposed.patientShortName, null);
  assert.ok((await global.rpc("configure_patient_access", { ...packet(f.patient, {}), p_request_id: proposal.id, p_decision: "approve" })).error);
  await actor("adminA", f.patient);
  const approved = await rpc(f.admin, "configure_patient_access", { ...packet(f.patient, {}), p_request_id: proposal.id, p_decision: "approve" });
  assert.equal(approved.status, "applied");
  assert.equal(state(f.patient).settings.patientShortName, null);
  assert.deepEqual(state(other.patient), otherBefore); assert.equal(history(other.patient), otherHistory);
  const beforeState = state(f.patient), beforeHistory = history(f.patient);
  await actor("adminA", other.patient);
  assert.equal((await f.admin.rpc("configure_patient_access", packet(f.patient, { patientShortName: "Wrong context" }))).error?.code, "42501");
  const professional = await actor("professional", f.patient);
  assert.equal((await professional.rpc("configure_patient_access", packet(f.patient, { patientShortName: null }))).error?.code, "42501");
  await actor("adminA", f.patient);
  sql(`update public.care_recipient_memberships set status='revoked' where care_recipient_id=${q(f.patient)} and user_id=${q(fixtures.adminA.id)}`);
  assert.equal((await f.admin.rpc("configure_patient_access", packet(f.patient, { patientShortName: null }))).error?.code, "42501");
  for (const key of [env.anonKey, env.serviceKey]) assert.ok((await createClient(env.url, key, { auth: { persistSession: false } }).rpc("configure_patient_access", packet(f.patient, { patientShortName: null }))).error);
  assert.deepEqual(state(f.patient), beforeState); assert.equal(history(f.patient), beforeHistory);
  assert.equal(sql("select not has_function_privilege('authenticated','public.v4_configure_patient_access(uuid,text,jsonb,uuid,integer,uuid,text)','execute') and not has_function_privilege('authenticated','public.v4_review_patient_access(uuid,text,jsonb,uuid,integer,uuid,text)','execute')"), "t");
});
