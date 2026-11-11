import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { purchaseBalanceFixture, purchaseBalanceArrival, purchaseBalanceCommand, otherPurchaseEntry, purchaseBalanceFacts } from "./purchase-entry-balance-fixtures.mjs";
import { fixtures, rpc } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
const reserve = (f, version = null, key = randomUUID(), name = "reserve_pdf_issuance_v13") => f.family.rpc(name, { p_document: f.document.id, p_version: version, p_key: key });
async function validated() {
  const f = await purchaseBalanceFixture();
  const arrival = await purchaseBalanceArrival(f, f.document, f.document.lines.map((line, i) => ({ lineId: line.id, quantity: String(i + 2) })));
  const document = await purchaseBalanceCommand(f.admin, arrival.document, "validate_receipt", { receiptId: arrival.receipt.id });
  return { ...f, document, before: arrival.document };
}
function canonical(row) {
  const { sourceFacts, documentFacts, purchaseEntryBalances, ...body } = row.snapshot;
  assert.equal(sourceFacts.schemaVersion, 1); assert.equal(documentFacts.schemaVersion, 1); assert.ok(purchaseEntryBalances);
  const event = JSON.parse(sql("select jsonb_build_object('body',body,'hash',content_hash) from public.document_events where document_id=" + q(row.documentId) + " and version=" + row.version));
  assert.deepEqual(body, event.body); assert.equal(row.sourceHash, event.hash);
  assert.equal(JSON.stringify(event.body).includes('"quantityAfter"'), false);
  assert.equal(JSON.stringify(event.body).includes('"purchaseEntryBalances"'), false);
}
test("COM V13 freezes the selected per-material entry cutoff while preserving canonical events and older issuance intentions", async () => {
  const f = await validated(), first = f.document, before = await reserve(f, f.before.version);
  assert.ifError(before.error); assert.equal(before.data.rendererRevision, 13);
  assert.ok(before.data.snapshot.purchaseEntryBalances.every(line => line.state === "not_validated" && line.quantity === null));
  const original = await reserve(f, first.version); assert.ifError(original.error); canonical(original.data);
  assert.deepEqual(original.data.snapshot.purchaseEntryBalances, first.purchaseEntryBalances);
  await otherPurchaseEntry(f, "5");
  const read = await rpc(f.family, "operational_document", { p_id: first.id });
  const later = await purchaseBalanceArrival(f, read, [{ lineId: first.lines[0].id, quantity: "1" }], f.admin);
  const factsBeforeReserve = purchaseBalanceFacts(f), current = await reserve(f); assert.ifError(current.error); canonical(current.data);
  const latest = current.data.snapshot.purchaseEntryBalances;
  assert.equal(latest.find(line => line.lineId === first.lines[0].id).entry.receiptId, later.receipt.id);
  assert.deepEqual(latest.find(line => line.lineId === first.lines[1].id), original.data.snapshot.purchaseEntryBalances.find(line => line.lineId === first.lines[1].id));
  const oldCutoff = await reserve(f, first.version); assert.ifError(oldCutoff.error);
  assert.deepEqual(oldCutoff.data.snapshot.purchaseEntryBalances, original.data.snapshot.purchaseEntryBalances);
  assert.equal(purchaseBalanceFacts(f), factsBeforeReserve);
  const oldKey = randomUUID(), old = await reserve(f, null, oldKey, "reserve_pdf_issuance_v10"); assert.ifError(old.error);
  const replay = await reserve(f, null, oldKey); assert.ifError(replay.error);
  assert.equal(replay.data.id, old.data.id); assert.equal(replay.data.rendererRevision, 10);
  assert.deepEqual(replay.data.snapshot, old.data.snapshot); assert.equal(old.data.snapshot.purchaseEntryBalances, undefined);
  assert.deepEqual((await rpc(f.family, "pdf_issuance", { p_id: original.data.id })).snapshot, original.data.snapshot);
});
test("COM stock authority is rechecked on every issuance replay; a masked source never acquires private quantities later", async () => {
  const f = await validated(), key = randomUUID(), known = await reserve(f, null, key); assert.ifError(known.error);
  sql("insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(" + q(f.patient) + "," + q(fixtures.family.id) + ",'stock.family.read',false)");
  assert.equal((await f.family.rpc("pdf_issuance", { p_id: known.data.id })).error?.code, "42501");
  const entryPoints = JSON.parse(sql("select jsonb_agg(proname order by proname) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname ~ '^reserve_pdf_issuance(_v[0-9]+)?$'"));
  for (const name of entryPoints) assert.equal((await reserve(f, null, key, name)).error?.code, "42501", name);
  const masked = await reserve(f); assert.ifError(masked.error); canonical(masked.data);
  assert.ok(masked.data.snapshot.purchaseEntryBalances.every(line => line.state === "restricted" && line.quantity === null));
  assert.equal(JSON.stringify(masked.data.snapshot.purchaseEntryBalances).includes('"quantity":"'), false);
  sql("update public.capability_overrides set enabled=true where care_recipient_id=" + q(f.patient) + " and subject_user=" + q(fixtures.family.id) + " and capability='stock.family.read'");
  assert.deepEqual((await rpc(f.family, "pdf_issuance", { p_id: masked.data.id })).snapshot, masked.data.snapshot);
  assert.deepEqual((await rpc(f.family, "pdf_issuance", { p_id: known.data.id })).snapshot, known.data.snapshot);
  assert.equal(sql("select has_function_privilege('anon','public.reserve_pdf_issuance_v13(uuid,uuid,integer)','EXECUTE') or has_function_privilege('service_role','public.reserve_pdf_issuance_v13(uuid,uuid,integer)','EXECUTE') or has_function_privilege('authenticated','private.freeze_pdf_purchase_entry_balances()','EXECUTE')"), "f");
});
