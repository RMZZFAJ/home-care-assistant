import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { setup, actor, rpc, env } from "./v4-fixtures.mjs";
import { patientB } from "../../scripts/test-constants.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { fidelityDeliveryFixture, fidelityPurchaseFixture, fidelityBalanceFixture, fidelityRequisitionFixture, fidelityLedger } from "./pdf-fidelity-fixtures.mjs";

const reserveFidelity = (client, document, version = null, key = randomUUID()) => rpc(client, "reserve_pdf_issuance", { p_document: document, p_version: version, p_key: key });
function canonical(row) {
  const { sourceFacts, documentFacts, ...frozen } = row.snapshot;
  assert.equal(sourceFacts.schemaVersion, 1); assert.equal(documentFacts.schemaVersion, 1);
  const stored = JSON.parse(sql(`select jsonb_build_object('body',body,'hash',content_hash) from public.document_events where document_id=${sqlLiteral(row.documentId)} and version=${row.version};`));
  const body={...frozen};for(const key of ["balanceApplication","balanceReviewCorrections","purchaseEntryBalances","lifecycleFacts","presentationFacts"])if(!Object.hasOwn(stored.body,key))delete body[key];
  assert.deepEqual(body, stored.body); assert.equal(row.sourceHash, stored.hash);
}

test("V7 uses the original authorization and shared intention lock; V6 and V7 replay each other without rewriting either snapshot", async () => {
  const f = await setup(), owner = await actor("family", f.patient);
  const doc = await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_draft: false, p_payload: { origin: "donation", lines: [{ productId: f.products[0], quantity: "1" }] } });
  const before = fidelityLedger(f.patient), key = randomUUID();
  const [a, b] = await Promise.all([reserveFidelity(owner, doc.id, null, key), reserveFidelity(owner, doc.id, null, key)]);
  assert.equal(a.id, b.id); assert.equal(a.rendererRevision, 16); canonical(a);
  assert.equal(sql(`select count(*) from private.pdf_issuances where id=${sqlLiteral(a.id)};`), "1");
  const legacyReplay = await rpc(owner, "reserve_pdf_issuance", { p_document: doc.id, p_version: null, p_key: key });
  assert.equal(legacyReplay.id, a.id); assert.equal(legacyReplay.rendererRevision, 16); assert.deepEqual(legacyReplay.snapshot, a.snapshot);
  const oldKey = randomUUID(), old = await rpc(owner, "reserve_pdf_issuance", { p_document: doc.id, p_version: null, p_key: oldKey });
  assert.equal(old.rendererRevision, 16); assert.equal(Object.hasOwn(old.snapshot, "documentFacts"), true);
  const recovered = await reserveFidelity(owner, doc.id, null, oldKey);
  assert.equal(recovered.id, old.id); assert.deepEqual(recovered.snapshot, old.snapshot); assert.equal(recovered.rendererRevision, 16);
  const outside = await actor("adminB", patientB);
  for (const client of [outside, createClient(env.url, env.anonKey, { auth: { persistSession: false } }), createClient(env.url, env.serviceKey, { auth: { persistSession: false } })])
    assert.equal((await client.rpc("reserve_pdf_issuance", { p_document: doc.id, p_key: randomUUID(), p_version: null })).error?.code, "42501");
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(a.requestedBy)},'com.read',false);`);
  assert.equal((await owner.rpc("reserve_pdf_issuance", { p_document: doc.id, p_key: key, p_version: null })).error?.code, "42501");
  assert.equal(fidelityLedger(f.patient), before);
  assert.equal(sql("select has_function_privilege('authenticated','private.freeze_pdf_fidelity_facts()','EXECUTE') or has_table_privilege('authenticated','private.pdf_issuances','INSERT,UPDATE,DELETE');"), "f");
});

test("ENT freezes only the resolutions available at the selected event and preserves the original damage note and canonical hash", async () => {
  const f = await fidelityDeliveryFixture(), before = fidelityLedger(f.patient);
  const earlier = await reserveFidelity(f.owner, f.doc.id, f.versions.returned.version), current = await reserveFidelity(f.owner, f.doc.id, f.doc.version);
  for (const row of [earlier, current]) { canonical(row); assert.equal(row.snapshot.lines[0].metadata.receipt.notes, f.note); }
  assert.deepEqual(earlier.snapshot.documentFacts.deliveryResolutions.map(row => row.resolution), ["returned"]);
  assert.deepEqual(current.snapshot.documentFacts.deliveryResolutions.map(row => row.resolution), ["returned", "missing"]);
  for (const event of current.snapshot.documentFacts.deliveryResolutions) {
    assert.equal(event.lineId, f.lineId); assert.equal(event.quantity, "1"); assert.ok(event.actorId); assert.ok(event.actorName); assert.ok(event.eventId); assert.ok(event.recordedAt);
  }
  assert.equal(fidelityLedger(f.patient), before);
});

test("COM preserves each receipt ID and its real arrival/validation/rejection events without treating rejection or pending as stock credit", async () => {
  const f = await fidelityPurchaseFixture();
  assert.equal(f.before, f.afterRejection); assert.equal(fidelityLedger(f.patient), f.afterValidation);
  const current = await reserveFidelity(f.owner, f.doc.id, f.doc.version); canonical(current);
  const facts = current.snapshot.documentFacts.purchaseReceiptEvents;
  assert.equal(facts.length, 5);
  assert.deepEqual(facts.filter(row => row.receiptId === f.rejectedId).map(row => row.action), ["com.receive", "com.reject_receipt"]);
  assert.deepEqual(facts.filter(row => row.receiptId === f.approvedId).map(row => row.action), ["com.receive", "com.validate_receipt"]);
  assert.deepEqual(facts.filter(row => row.receiptId === f.pendingId).map(row => row.action), ["com.receive"]);
  assert.equal(new Set(facts.map(row => row.eventId)).size, 5);
  assert.deepEqual(current.snapshot.purchaseReceipts.map(row => row.state).sort(), ["approved", "pending", "rejected"]);
  assert.equal(fidelityLedger(f.patient), f.afterValidation);
});

test("REQ frozen observations and per-item positive acceptance remain version-specific, without a requested-quantity field", async () => {
  const f = await fidelityRequisitionFixture(), before = fidelityLedger(f.patient);
  const old = await reserveFidelity(f.owner, f.doc.id, f.initial.version), current = await reserveFidelity(f.owner, f.doc.id, f.doc.version);
  for (const row of [old, current]) { canonical(row); assert.equal(row.snapshot.lines.length, 4); }
  const observed = current.snapshot.lines.find(line => line.product_id === f.products[1]);
  assert.equal(Number(observed.current_stock), 1.234567); assert.equal(observed.stock_observation, "observed");
  assert.equal(current.snapshot.fulfillmentLines.filter(line => line.attended).length, 1);
  assert.equal(old.snapshot.fulfillmentLines.filter(line => line.attended).length, 0);
  for (const line of current.snapshot.lines) assert.equal(Object.hasOwn(line, "requested_quantity"), false);
  assert.equal(fidelityLedger(f.patient), before);
});

test("formal BAL recount keeps earlier authored review and an explicitly synthetic legacy approval as historical source facts", async () => {
  const f = await fidelityBalanceFixture(), before = fidelityLedger(f.patient);
  const first = await reserveFidelity(f.owner, f.doc.id, f.first.version), current = await reserveFidelity(f.owner, f.doc.id, f.doc.version);
  canonical(first); canonical(current);
  assert.equal(first.snapshot.payload.balanceContext.kind, "scheduled");
  assert.equal(current.snapshot.payload.balanceContext.kind, "recount");
  assert.equal(current.snapshot.balanceReviews.countVersion, 2);
  assert.equal(current.snapshot.balanceReviews.reviews.length, 1);
  assert.equal(current.snapshot.balanceReviews.reviews[0].count_version, 1);
  assert.equal(current.snapshot.balanceReviews.legacyApprovals[0].count_version, 1);
  assert.equal(fidelityLedger(f.patient), before);
});
