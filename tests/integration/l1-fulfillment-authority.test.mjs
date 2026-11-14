import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { setup, issue, actor, rpc, fixtures, delivery } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { whileAdvisoryWaits } from "./lock-barrier.mjs";

test("L1 family fulfillment and reevaluation remain authorized without SCI permission", async () => {
  const f = await setup(), req = await issue(f.patient, [f.products[0]]);
  const family = await actor("family", f.patient), pro = await actor("professional", f.patient);
  sql(`insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${q(f.patient)},'req.science',${q(fixtures.family.id)},false)`);
  const sent = await delivery(f.patient, req, [f.products[0]], { quantity: "2" });
  const received = await rpc(pro, "supply_document_command", { p_id: sent.id, p_action: "receive", p_body: { divergences: [{ lineId: sent.lines[0].id, acceptedQuantity: "1", problem: "Uma unidade faltante" }] }, p_key: randomUUID(), p_version: sent.version });
  assert.equal((await rpc(family, "requisition_fulfillment", { p_requisition: req.id })).reviewRequired, 1);
  const stock = sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(f.patient)}`);
  await rpc(family, "review_request_fulfillment", { p_document: sent.id, p_line: sent.lines[0].id, p_decision: "complete", p_reason: "Uma unidade atende à necessidade atual", p_key: randomUUID(), p_version: received.version });
  assert.equal((await rpc(family, "requisition_fulfillment", { p_requisition: req.id })).fulfilled, 1);
  assert.equal((await rpc(family, "requisition_progress", { p_id: req.id })).familyAware, false);
  assert.equal(sql(`select count(*) from public.requisition_science_events where requisition_id=${q(req.id)}`), "0");
  assert.equal(sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(f.patient)}`), stock);
});

test("L1 ent.create override does not let a professional forge a family fulfillment decision", async () => {
  const f = await setup(), req = await issue(f.patient, [f.products[0]]), pro = await actor("professional", f.patient);
  sql(`insert into public.care_recipient_memberships(care_recipient_id,user_id,role,status) values(${q(f.patient)},${q(fixtures.supervisor.id)},'professional','active')`);
  sql(`insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${q(f.patient)},'ent.create',${q(fixtures.professional.id)},true)`);
  assert.equal(sql(`select private.member_can(${q(f.patient)},${q(fixtures.professional.id)},'ent.create')`), "t");
  const key = randomUUID(), result = await pro.rpc("create_supply_document", { p_patient: f.patient, p_type: "ENT", p_draft: false, p_key: key, p_payload: { source: "FAMILY", destination: "CARE_TEAM", recipientId: fixtures.supervisor.id, recipientReason: "Teste de autoridade familiar", lines: [{ productId: f.products[0], quantity: "1", requestFulfillment: "complete", requisitionItemIds: [req.lines[0].id] }] } });
  assert.equal(result.error?.code, "42501");
  assert.match(result.error.message, /family authority required/);
  assert.equal(sql(`select count(*) from public.operational_documents where idempotency_key=${q(key)}`), "0");
});

test("L1 fulfillment rechecks ent.create after waiting and leaves no dispatch or SCI", async () => {
  const f = await setup(), req = await issue(f.patient, [f.products[0]]), family = await actor("family", f.patient), key = randomUUID();
  const stock = sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(f.patient)}`);
  const result = await whileAdvisoryWaits("stock:" + f.patient,
    () => family.rpc("create_supply_document", { p_patient: f.patient, p_type: "ENT", p_draft: false, p_key: key, p_payload: { source: "FAMILY", destination: "CARE_TEAM", recipientId: fixtures.professional.id, recipientReason: "Teste de revogação durante espera", lines: [{ productId: f.products[0], quantity: "1", requestFulfillment: "complete", requisitionItemIds: [req.lines[0].id] }] } }),
    () => sql(`insert into public.capability_overrides(care_recipient_id,capability,subject_user,enabled) values(${q(f.patient)},'ent.create',${q(fixtures.family.id)},false)`));
  assert.equal(result.error?.code, "42501");
  assert.equal(sql(`select count(*) from public.operational_documents where idempotency_key=${q(key)}`), "0");
  assert.equal(sql(`select count(*) from public.requisition_science_events where requisition_id=${q(req.id)}`), "0");
  assert.equal(sql(`select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(f.patient)}`), stock);
  assert.equal(sql("select has_function_privilege('anon','private.family_fulfillment_authorized(uuid,uuid)','execute') or has_function_privilege('authenticated','private.family_fulfillment_authorized(uuid,uuid)','execute') or has_function_privilege('service_role','private.family_fulfillment_authorized(uuid,uuid)','execute')"), "f");
});
