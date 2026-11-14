import test from "node:test";

import assert from "node:assert/strict";

import { randomUUID } from "node:crypto";

import { reqDecisionFixture, reqDecisionFacts } from "./requisition-decision-draft-fixtures.mjs";

import { actor, rpc, fixtures, setup } from "./v4-fixtures.mjs";

import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";

import { whileRowWaits } from "./lock-barrier.mjs";

import { preparationFixture, preparationPurposes } from "./balance-preparation-fixtures.mjs";
import { balDocumentFixture } from "./bal-document-draft-fixtures.mjs";
import { regularizationPdfFixture, regularizationLedger } from "./pdf-regularization-fixtures.mjs";
import { shiftWorker } from "./shift-fixtures.mjs";

import { transferFixture, declareTransfer } from "./transfer-fixtures.mjs";

import { legacyBalance } from "./bal-review-fixtures.mjs";



function intention(f) {

  return { domain: "requisition", action: f.purpose, expectedVersion: f.reference.documentVersion,

    referenceHash: f.reference.referenceHash, body: { reason: "Decisão fictícia sem rascunho de formulário.",

      ...(f.purpose === "resolve_extra" ? { itemId: f.content.fields.itemId, productId: f.content.fields.productId } : {}) } };

}

const drafts = patient => sql(`select count(*) from private.creation_drafts where care_recipient_id=${q(patient)}`);

const results = document => sql(`select count(*) from private.document_decision_results where document_id=${q(document)}`);



for (const purpose of ["cancel", "archive", "resolve_extra"]) test("REQ " + purpose + " confirms once without saving a form and recovers its exact official result", async () => {

  const f = await reqDecisionFixture(purpose), beforeDrafts = drafts(f.patient), p = { p_document: f.req.id, p_key: randomUUID(), p_intention: intention(f) };

  const first = await rpc(f.client, "execute_document_decision", p), after = reqDecisionFacts(f);

  assert.equal(first.state, "applied"); assert.deepEqual(first.intention, p.p_intention);

  assert.deepEqual(await rpc(f.client, "execute_document_decision", p), first);

  assert.deepEqual(await rpc(f.client, "settle_document_decision", { p_document: f.req.id, p_key: p.p_key }), first);

  assert.equal(reqDecisionFacts(f), after); assert.equal(drafts(f.patient), beforeDrafts); assert.equal(results(f.req.id), "1");

  const altered = globalThis.structuredClone(p); altered.p_intention.body.reason = "Outra justificativa não confirmada.";

  assert.equal((await f.client.rpc("execute_document_decision", altered)).error?.code, "22023");

  assert.equal(reqDecisionFacts(f), after);

});



test("settled absence prevents a late original request; an explicit new attempt applies exactly once", async () => {

  const f = await reqDecisionFixture("cancel"), before = reqDecisionFacts(f), key = randomUUID();

  const absent = await rpc(f.client, "settle_document_decision", { p_document: f.req.id, p_key: key });

  assert.equal(absent.state, "not_applied"); assert.equal(absent.intention, null); assert.equal(absent.result, null);

  assert.equal((await f.client.rpc("execute_document_decision", { p_document: f.req.id, p_key: key, p_intention: intention(f) })).error?.code, "PT409");

  assert.equal(reqDecisionFacts(f), before); assert.equal(drafts(f.patient), "0");

  await rpc(f.client, "execute_document_decision", { p_document: f.req.id, p_key: randomUUID(), p_intention: intention(f) });

  assert.equal(sql(`select count(*) from private.document_decision_results where document_id=${q(f.req.id)} and state='applied'`), "1");

});



test("stale reference and denied decision authority roll back without an act or saved form; other actors cannot read the result", async () => {

  const f = await reqDecisionFixture("cancel"), before = reqDecisionFacts(f), p = { p_document: f.req.id, p_key: randomUUID(), p_intention: intention(f) };

  const stale = globalThis.structuredClone(p); stale.p_intention.referenceHash = "0".repeat(64);

  assert.equal((await f.client.rpc("execute_document_decision", stale)).error?.code, "PT409");

  const family = await actor("family", f.patient);

  assert.equal((await family.rpc("execute_document_decision", p)).error?.code, "42501");

  assert.equal(reqDecisionFacts(f), before); assert.equal(results(f.req.id), "0"); assert.equal(drafts(f.patient), "0");

  await rpc(f.client, "execute_document_decision", p);

  const other = await rpc(family, "settle_document_decision", { p_document: f.req.id, p_key: p.p_key });

  assert.equal(other.state, "not_applied"); assert.equal(other.result, null);

  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.adminA.id)},'req.read',false)`);

  assert.equal((await f.client.rpc("settle_document_decision", { p_document: f.req.id, p_key: p.p_key })).error?.code, "42501");

});



test("COM official decision retains native authorization, version and duplicate guards without a private draft", async () => {

  const f = await setup(), doc = await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_draft: false, p_key: randomUUID(), p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity: "2" }] } });

  const p = { p_document: doc.id, p_key: randomUUID(), p_intention: { domain: "supply", action: "cancel", expectedVersion: doc.version, body: { reason: "Compra cancelada sem rascunho de decisão." } } };

  const result = await rpc(f.admin, "execute_document_decision", p);

  assert.equal(result.result.status, "cancelled"); assert.equal(drafts(f.patient), "0");

  assert.deepEqual(await rpc(f.admin, "settle_document_decision", { p_document: doc.id, p_key: p.p_key }), result);

  assert.equal(results(doc.id), "1");

});



test("authority loss during a real profile wait rolls the official decision and its receipt back together", async () => {

  const f = await reqDecisionFixture("cancel"), family = await actor("family", f.patient);

  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${q(f.patient)},${q(fixtures.family.id)},'req.create',true),(${q(f.patient)},${q(fixtures.family.id)},'req.review',true)`);

  const before = reqDecisionFacts(f), p = { p_document: f.req.id, p_key: randomUUID(), p_intention: intention(f) };

  const outcome = await whileRowWaits("profiles", fixtures.family.id, "execute_document_decision",

    () => family.rpc("execute_document_decision", p),

    () => sql(`update public.capability_overrides set enabled=false where care_recipient_id=${q(f.patient)} and subject_user=${q(fixtures.family.id)} and capability='req.create'`));

  assert.equal(outcome.error?.code, "42501"); assert.equal(reqDecisionFacts(f), before);

  assert.equal(results(f.req.id), "0"); assert.equal(drafts(f.patient), "0");

});



test("legacy BAL cancellation preserves its count and stock without creating a decision draft", async () => {

  const f = await legacyBalance({ policy: "required" }), admin = await actor("adminA", f.patient);

  const ledger = () => sql(`select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]') from public.stock_movements m where care_recipient_id=${q(f.patient)}`);

  const before = ledger(), priorDrafts = drafts(f.patient);

  const result = await rpc(admin, "execute_document_decision", { p_document: f.document.id, p_key: randomUUID(),

    p_intention: { domain: "supply", action: "cancel", expectedVersion: f.document.version, body: { reason: "Cancelamento autorizado da contagem legada." } } });

  assert.equal(result.state, "applied"); assert.equal(result.result.status, "cancelled");

  assert.equal(ledger(), before); assert.equal(drafts(f.patient), priorDrafts);

});



for (const group of ["family", "supervisor"]) test("BAL " + group + " review keeps per-item facts without a decision draft", async () => {

  const f = await legacyBalance({ policy: "required" }), client = group === "supervisor" ? (await shiftWorker(f.patient, "supervisor")).client : await actor(group, f.patient);

  const ref = await rpc(client, "operational_document", { p_id: f.document.id });

  const p = { p_document: f.document.id, p_key: randomUUID(), p_intention: { domain: "balance", action: "review_" + group, expectedVersion: f.document.version, referenceHash: ref.balanceReview.referenceHash, body: { group, reviewReference: ref.balanceReview.referenceHash, comment: "Revisão independente sem rascunho de decisão.", items: [] } } };

  const before = drafts(f.patient), result = await rpc(client, "execute_document_decision", p);

  assert.equal(result.state, "applied"); assert.equal(result.result.balanceReview.reviews.at(-1).review_group, group);

  assert.equal(drafts(f.patient), before); assert.deepEqual(await rpc(client, "settle_document_decision", { p_document: f.document.id, p_key: p.p_key }), result);

});

test("transfer agreement uses native personal authority and one official receipt without a saved form", async () => {

  const f = await transferFixture(), declared = await declareTransfer(f); assert.equal(declared.response.error, null);

  const doc = declared.response.data, before = drafts(f.patient), p = { p_document: doc.id, p_key: randomUUID(), p_intention: { domain: "transfer", action: "agree", expectedVersion: doc.version, body: { reason: "Concordância pessoal conferida sem rascunho." } } };

  const result = await rpc(f.counterparty.client, "execute_document_decision", p);

  assert.equal(result.state, "applied"); assert.equal(drafts(f.patient), before);

  assert.deepEqual(await rpc(f.counterparty.client, "settle_document_decision", { p_document: doc.id, p_key: p.p_key }), result);

});

test("ENT receipt retains stock effect once without a decision draft", async () => {

  const f = await setup(), receiver = await actor("professional", f.patient);

  const doc = await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "ENT", p_key: randomUUID(), p_payload: { source: "FAMILY", destination: "CARE_TEAM", recipientId: fixtures.professional.id, recipientReason: "Recebedor fictício da contraprova L1.", lines: [{ productId: f.products[0], quantity: "2" }] } });

  const result = await rpc(receiver, "execute_document_decision", { p_document: doc.id, p_key: randomUUID(), p_intention: { domain: "supply", action: "receive", expectedVersion: doc.version, body: { divergences: [] } } });

  assert.equal(result.state, "applied"); assert.equal(result.result.status, "confirmed"); assert.equal(drafts(f.patient), "0");

});


for (const purpose of preparationPurposes) test("BAL workspace " + purpose + " confirms one native decision without saving preparation fields", async () => {
  const f = await preparationFixture(purpose), prior = sql(`select count(*) from private.balance_preparations where care_recipient_id=${q(f.patient)}`);
  const p = { p_patient: f.patient, p_target: f.targetResourceId, p_key: randomUUID(), p_intention: { domain: "balance_workspace", action: purpose, expectedVersion: f.content.referenceVersion ?? 0, referenceHash: f.source.referenceHash, body: { command: f.command } } };
  const result = await rpc(f.client, "execute_balance_decision", p);
  assert.equal(result.state, "applied"); assert.equal(result.result.purpose, purpose); assert.equal(result.result.actorId, f.identity.id);
  assert.equal(sql(`select count(*) from private.balance_preparations where care_recipient_id=${q(f.patient)}`), prior);
  assert.deepEqual(await rpc(f.client, "execute_balance_decision", p), result);
  assert.deepEqual(await rpc(f.client, "settle_balance_decision", { p_patient: f.patient, p_target: f.targetResourceId, p_key: p.p_key }), result);
});
test("BAL workspace negative settlement blocks a late original; stale references and lost authority cannot create an outcome", async () => {
  const f = await preparationFixture("configure"), p = { p_patient: f.patient, p_target: f.targetResourceId, p_key: randomUUID(), p_intention: { domain: "balance_workspace", action: f.purpose, expectedVersion: f.content.referenceVersion ?? 0, referenceHash: f.source.referenceHash, body: { command: f.command } } };
  assert.equal((await rpc(f.client, "settle_balance_decision", { p_patient: f.patient, p_target: f.targetResourceId, p_key: p.p_key })).state, "not_applied");
  assert.equal((await f.client.rpc("execute_balance_decision", p)).error?.code, "PT409");
  p.p_key = randomUUID(); p.p_intention.referenceHash = "0".repeat(64);
  assert.equal((await f.client.rpc("execute_balance_decision", p)).error?.code, "PT409");
  assert.equal(sql(`select count(*) from private.balance_decision_results where patient_id=${q(f.patient)} and state='applied'`), "0");
});
test("BAL recount designation preserves target, reason and native author without a draft", async () => {
  const f = await balDocumentFixture("assign_recount"), before = drafts(f.patient);
  const result = await rpc(f.client, "execute_document_decision", { p_document: f.document.id, p_key: randomUUID(), p_intention: { domain: "balance", action: "assign_recount", expectedVersion: f.document.version, referenceHash: f.content.fields.referenceHash, body: { documentId: f.document.id, targetShiftId: f.content.fields.targetShiftId, targetShiftVersion: Number(f.content.fields.targetShiftVersion), referenceHash: f.content.fields.referenceHash, reason: f.content.fields.reason } } });
  assert.equal(result.state, "applied"); assert.equal(result.result.shiftId, f.content.fields.targetShiftId); assert.equal(drafts(f.patient), before);
});
test("regularization review confirms physical effects once without saving a decision draft", async () => {
  const f = await regularizationPdfFixture({ state: "pending" }), p = { p_document: f.doc.id, p_key: randomUUID(), p_intention: { domain: "supply", action: "review_regularization", expectedVersion: f.doc.version, body: { caseId: f.doc.deliveryRegularization.currentId, accept: true, reason: "Revisão independente das quantidades efetivamente apuradas." } } };
  const result = await rpc(f.owner, "execute_document_decision", p), ledger = regularizationLedger(f.patient);
  assert.equal(result.state, "applied"); assert.equal(drafts(f.patient), "0");
  assert.deepEqual(await rpc(f.owner, "settle_document_decision", { p_document: f.doc.id, p_key: p.p_key }), result);
  assert.equal(regularizationLedger(f.patient), ledger);
});
test("outcome tables and private view functions have no direct application grants", () => {
  assert.equal(sql(`select count(*) from information_schema.role_table_grants where table_schema='private' and table_name in ('document_decision_results','balance_decision_results') and grantee in ('anon','authenticated','service_role','PUBLIC')`), "0");
  assert.equal(sql(`select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('execute_document_decision','settle_document_decision','execute_balance_decision','settle_balance_decision') and (has_function_privilege('anon',p.oid,'execute') or has_function_privilege('service_role',p.oid,'execute') or not has_function_privilege('authenticated',p.oid,'execute'))`), "0");
});
