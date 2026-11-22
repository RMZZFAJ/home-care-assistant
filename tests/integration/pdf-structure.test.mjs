import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { actor, rpc, env } from "./v4-fixtures.mjs";
import { patientB } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fidelityDeliveryFixture, fidelityPurchaseFixture, fidelityBalanceFixture, fidelityRequisitionFixture } from "./pdf-fidelity-fixtures.mjs";

const reserve = (f, key = randomUUID(), entry = "reserve_pdf_issuance") => rpc(f.owner, entry, { p_document: f.doc.id, p_key: key, p_version: f.doc.version });
const business = f => sql(`select jsonb_build_object('events',(select jsonb_agg(to_jsonb(e) order by version) from public.document_events e where document_id=${sqlLiteral(f.doc.id)}),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)}));`);

for (const [kind, fixture] of [["REQ", fidelityRequisitionFixture], ["COM", fidelityPurchaseFixture], ["ENT", fidelityDeliveryFixture], ["BAL", fidelityBalanceFixture]]) {
  test(`real ${kind} V10 freezes facts, replays previous and concurrent intentions, and never changes its business events or stock`, async () => {
    const f = await fixture(), before = business(f);
    const oldKey = randomUUID(), old = await reserve(f, oldKey, "reserve_pdf_issuance");
    assert.equal(old.rendererRevision, 16);
    assert.deepEqual(await reserve(f, oldKey), { ...old, replayed: true });
    const key = randomUUID(), [a, b] = await Promise.all([reserve(f, key), reserve(f, key)]);
    assert.equal(a.id, b.id); assert.equal(a.rendererRevision, 16);
    assert.equal(sql(`select count(*) from private.pdf_issuances where requested_by=${sqlLiteral(a.requestedBy)} and idempotency_key=${sqlLiteral(key)};`), "1");
    const recovered = await reserve(f, key, "reserve_pdf_issuance");
    assert.equal(recovered.id, a.id); assert.equal(recovered.rendererRevision, 16); assert.deepEqual(recovered.snapshot, a.snapshot);
    const { sourceFacts, documentFacts, ...content } = a.snapshot;
    const frozen = JSON.parse(sql(`select jsonb_build_object('body',body,'hash',content_hash) from public.document_events where document_id=${sqlLiteral(f.doc.id)} and version=${f.doc.version};`));
    const body={...content};for(const key of ["balanceApplication","balanceReviewCorrections","purchaseEntryBalances","lifecycleFacts","presentationFacts"])if(!Object.hasOwn(frozen.body,key))delete body[key];
    assert.deepEqual(body, frozen.body); assert.equal(a.sourceHash, frozen.hash);
    assert.equal(sourceFacts.schemaVersion, 1); assert.equal(documentFacts.schemaVersion, 1);
    assert.equal(business(f), before);
  });
}

test("V10 preserves real Auth, patient, capability and explicit function grants for new and replayed intentions", async () => {
  const f = await fidelityPurchaseFixture(), before = business(f), key = randomUUID(), row = await reserve(f, key);
  const outside = await actor("adminB", patientB);
  for (const client of [outside, createClient(env.url, env.anonKey, { auth: { persistSession: false } }), createClient(env.url, env.serviceKey, { auth: { persistSession: false } })])
    assert.equal((await client.rpc("reserve_pdf_issuance", { p_document: f.doc.id, p_key: randomUUID(), p_version: f.doc.version })).error?.code, "42501");
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(row.requestedBy)},'com.read',false);`);
  for (const attempt of [key, randomUUID()])
    assert.equal((await f.owner.rpc("reserve_pdf_issuance", { p_document: f.doc.id, p_key: attempt, p_version: f.doc.version })).error?.code, "42501");
  assert.equal(sql("select has_function_privilege('anon','public.reserve_pdf_issuance(uuid,uuid,integer)','execute') or has_function_privilege('service_role','public.reserve_pdf_issuance(uuid,uuid,integer)','execute') or has_function_privilege('authenticated','private.freeze_pdf_fidelity_facts()','execute');"), "f");
  assert.equal(sql("select prosecdef and proconfig @> array['search_path=\"\"'] from pg_proc where oid='public.reserve_pdf_issuance(uuid,uuid,integer)'::regprocedure;"), "t");
  assert.equal(business(f), before);
});
