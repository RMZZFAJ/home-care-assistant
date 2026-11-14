import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { setup, rpc, env } from "./v4-fixtures.mjs";
import { shiftWorker } from "./shift-fixtures.mjs";
import { transferFixture, declareTransfer } from "./transfer-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";

const facts = patient => sql(`select jsonb_build_object('documents',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id=${q(patient)}),'events',(select jsonb_agg(to_jsonb(e) order by id) from public.document_events e where care_recipient_id=${q(patient)}),'transfers',(select jsonb_agg(to_jsonb(t) order by document_id) from public.ent_transfers t where care_recipient_id=${q(patient)}),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${q(patient)}));`);
const list = (client, patient, more = {}) => rpc(client, "delivery_task_list", { p_patient: patient, p_scope: "own", p_status: "", ...more });

test("delivery task summaries keep designation and actual receipt names independent after profile changes", async () => {
  const f = await setup(), issuer = await shiftWorker(f.patient, "family"), receiver = await shiftWorker(f.patient);
  sql(`update public.profiles set full_name='Emissor preservado do ato' where id=${q(issuer.id)};
    update public.profiles set full_name='Pessoa preservada na designação' where id=${q(receiver.id)};`);
  const doc = await rpc(issuer.client, "create_supply_document", { p_patient: f.patient, p_type: "ENT", p_key: randomUUID(), p_draft: false,
    p_payload: { source: "FAMILY", destination: "CARE_TEAM", recipientId: receiver.id, recipientReason: "Designação manual fictícia para conferir snapshots históricos", lines: [{ productId: f.products[0], quantity: "1" }] } });
  sql(`update public.profiles set full_name='Nome futuro de quem registrou' where id=${q(issuer.id)};
    update public.profiles set full_name='Nome usado no aceite pessoal' where id=${q(receiver.id)};`);
  let before = facts(f.patient), result = await list(receiver.client, f.patient, { p_status: "tasks" });
  assert.equal(result.total, 1); assert.equal(result.data[0].id, doc.id);
  assert.deepEqual(result.data[0].deliverySummary, { source: "FAMILY", destination: "CARE_TEAM", recordedByName: "Emissor preservado do ato", recipientName: "Pessoa preservada na designação", counterpartyName: null, receivedByName: null });
  assert.equal(result.data[0].task.code, "receive"); assert.equal(facts(f.patient), before);
  await rpc(receiver.client, "supply_document_command", { p_id: doc.id, p_action: "receive", p_body: { divergences: [] }, p_key: randomUUID(), p_version: doc.version });
  sql(`update public.profiles set full_name='Nome atual posterior ao aceite' where id=${q(receiver.id)};`);
  before = facts(f.patient); result = await list(receiver.client, f.patient, { p_status: "confirmed", p_size: 1 });
  assert.equal(result.data[0].deliverySummary.recipientName, "Pessoa preservada na designação");
  assert.equal(result.data[0].deliverySummary.receivedByName, "Nome usado no aceite pessoal");
  assert.equal(result.data[0].deliverySummary.recordedByName, "Emissor preservado do ato");
  assert.equal(result.data[0].document_lines[0].accepted_quantity, "1.000000");
  assert.equal(facts(f.patient), before);
  const foreign = await setup();
  assert.equal((await receiver.client.rpc("delivery_task_list", { p_patient: foreign.patient })).error?.code, "42501");
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(receiver.id)},'ent.read',false);`);
  assert.equal((await receiver.client.rpc("delivery_task_list", { p_patient: f.patient })).error?.code, "42501");
});

test("delivery task summaries use immutable transfer parties without shipping or exposing stock", async () => {
  const f = await transferFixture(), declared = await declareTransfer(f, { originDocumentId: null });
  assert.ifError(declared.response.error); const doc = declared.response.data;
  const stored = JSON.parse(sql(`select declaration from public.ent_transfers where document_id=${q(doc.id)};`));
  sql(`update public.profiles set full_name='Nome atual diferente do registro' where id in (${q(f.initiator.id)},${q(f.counterparty.id)},${q(f.recipient.id)});`);
  const before = facts(f.patient), result = await list(f.counterparty.client, f.patient, { p_status: "tasks" });
  const row = result.data.find(row => row.id === doc.id); assert.ok(row);
  assert.equal(row.code, null); assert.equal(row.protocol, null); assert.equal(row.task.code, "transfer_decision");
  assert.deepEqual(row.deliverySummary, { source: "CARE_TEAM", destination: "FAMILY", recordedByName: stored.actor.name, recipientName: stored.recipient.name, counterpartyName: stored.counterparty.name, receivedByName: null });
  assert.deepEqual(Object.keys(row.deliverySummary).sort(), ["source", "destination", "recordedByName", "recipientName", "counterpartyName", "receivedByName"].sort());
  assert.equal(facts(f.patient), before);
  const anonymous = createClient(env.url, env.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  assert.equal((await anonymous.rpc("delivery_task_list", { p_patient: f.patient })).error?.code, "42501");
  assert.equal(sql("select has_function_privilege('authenticated','public.delivery_task_list(uuid,text,text,integer,integer)','execute') and not has_function_privilege('anon','public.delivery_task_list(uuid,text,text,integer,integer)','execute') and not has_function_privilege('service_role','public.delivery_task_list(uuid,text,text,integer,integer)','execute');"), "t");
});
