import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { actor, fixtures, rpc, setup } from "./v4-fixtures.mjs";
import { documentPageFixture, historyFixture } from "./read-history-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";

test("document page defaults, explicit NULL, one and maximum keep the authenticated read bounded", async () => {
  const f = await documentPageFixture();
  const before = sql(`select jsonb_build_object('docs',(select count(*) from public.operational_documents where care_recipient_id=${sqlLiteral(f.patient)}),'moves',(select count(*) from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)}));`);
  for (const input of [{}, { p_size: 1 }, { p_size: 100 }]) {
    const page = await rpc(f.admin, "operational_document_list", { p_patient: f.patient, p_type: "COM", ...input });
    assert.equal(page.total, 16); assert.equal(page.data.length, input.p_size === 1 ? 1 : 16);
  }
  for (const input of [{ p_page: null }, { p_size: null }, { p_page: 0 }, { p_size: 101 }]) {
    const result = await f.admin.rpc("operational_document_list", { p_patient: f.patient, ...input });
    assert.equal(result.error?.code, "22023", JSON.stringify(input));
  }
  assert.equal(sql(`select jsonb_build_object('docs',(select count(*) from public.operational_documents where care_recipient_id=${sqlLiteral(f.patient)}),'moves',(select count(*) from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)}));`), before);
});

test("201 historical events are reachable by stable pages, event/resource reference and period with the original patient scope", async () => {
  const f = await historyFixture(), args = { p_patient: f.patient, p_action: "invitation.created" };
  const oracle = JSON.parse(sql(`select jsonb_agg(id order by created_at desc,id desc) from public.audit_events where metadata->>'care_recipient_id'=${sqlLiteral(f.patient)} and action='invitation.created';`));
  const observed = [];
  for (let page = 1; page <= 11; page++) {
    const result = await rpc(f.admin, "patient_audit_page", { ...args, p_page: page });
    assert.equal(result.total, 201); assert.ok(result.data.length <= 20); observed.push(...result.data.map(row => row.id));
  }
  assert.deepEqual(observed, oracle); assert.equal(new Set(observed).size, 201); assert.equal(observed.at(-1), f.oldest);
  for (const reference of [f.oldest, f.resource]) {
    const result = await rpc(f.admin, "patient_audit_page", { p_patient: f.patient, p_reference: reference });
    assert.equal(result.total, 1); assert.equal(result.data[0].id, f.oldest);
    assert.equal(result.data[0].actor_id, fixtures.adminA.id); assert.ok(result.data[0].actor_name_current);
  }
  assert.equal((await rpc(f.admin, "patient_audit_page", { ...args, p_from: "2026-01-01T03:00:00Z", p_to: "2026-01-02T03:00:00Z" })).total, 201);
  assert.equal((await rpc(f.admin, "patient_audit_page", { ...args, p_from: "2026-01-02T03:00:00Z" })).total, 0);
  for (const input of [{ p_size: null }, { p_page: null }, { p_size: 101 }, { p_query: null }, { p_from: "2026-01-02T00:00:00Z", p_to: "2026-01-01T00:00:00Z" }])
    assert.equal((await f.admin.rpc("patient_audit_page", { ...args, ...input })).error?.code, "22023");
  assert.equal((await rpc(f.admin, "patient_audit_page", { ...args, p_size: 100 })).data.length, 100);
  assert.equal(sql(`select count(*) from public.audit_events where metadata->>'care_recipient_id'=${sqlLiteral(f.patient)} and action='invitation.created';`), "201");
});

test("audit delegation grants read only in the selected patient and revocation is effective without opening global or anonymous access", async () => {
  const f = await historyFixture(), other = await setup();
  await actor("adminA", f.patient);
  const professional = await actor("professional", f.patient);
  assert.equal((await professional.rpc("patient_audit_page", { p_patient: f.patient })).error?.code, "42501");
  for (const enabled of [true, false]) {
    const version = (await rpc(f.admin, "patient_governance", { p_patient: f.patient })).data.version;
    await rpc(f.admin, "configure_patient_access", { p_patient: f.patient, p_kind: "capability", p_change: { capability: "audit.read", subjectUser: fixtures.professional.id, enabled }, p_key: randomUUID(), p_version: version });
    const result = await professional.rpc("patient_audit_page", { p_patient: f.patient, p_action: "invitation.created" });
    if (enabled) { assert.ifError(result.error); assert.equal(result.data.total, 201); }
    else assert.equal(result.error?.code, "42501");
  }
  assert.equal((await f.admin.rpc("patient_audit_page", { p_patient: other.patient })).error?.code, "42501");
  const global = await actor("global");
  assert.equal((await global.rpc("patient_audit_page", { p_patient: f.patient })).error?.code, "42501");
  const grants = JSON.parse(sql(`select jsonb_build_object('anon',has_function_privilege('anon','public.patient_audit_page(uuid,text,uuid,text,text,timestamptz,timestamptz,integer,integer)','execute'),'oldList',has_function_privilege('authenticated','public.phase_d3_pre_bounded_document_list(uuid,text,text,text,timestamptz,timestamptz,integer,integer)','execute'),'service',has_function_privilege('service_role','public.patient_audit_page(uuid,text,uuid,text,text,timestamptz,timestamptz,integer,integer)','execute'));`));
  assert.deepEqual(grants, { anon: false, oldList: false, service: false });
});
