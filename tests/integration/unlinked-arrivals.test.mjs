import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { actor, rpc } from "./v4-fixtures.mjs";
import { purchaseBalanceArrival, purchaseBalanceFixture } from "./purchase-entry-balance-fixtures.mjs";

const command = (patient, body, key = randomUUID()) => ({ p_patient: patient, p_key: key, p_body: body });
const intake = (client, input) => rpc(client, "unlinked_arrival_command", input);
const read = (client, patient, id) => rpc(client, "read_unlinked_arrivals", { p_patient: patient, p_id: id });
const target = (arrival, decision, reason) => ({
  documentId: null, receiptId: arrival.id, version: arrival.version, decision, ...(reason ? { reason } : {}),
});
const batch = (f, entries, key = randomUUID()) => rpc(f.admin, "execute_com_arrival_review",
  { p_patient: f.patient, p_key: key, p_entries: entries });
const credits = id => JSON.parse(sql(`select coalesce(jsonb_agg(jsonb_build_array(product_id,trim_scale(quantity)::text) order by product_id),'[]')
  from public.stock_movements where reference_type='unlinked_arrival' and reference_id=${q(id)} and destination_location='FAMILY'`));

test("CHE registers external purchase, gifts and donations with independent sequence and one credit per item", async () => {
  const f = await purchaseBalanceFixture();
  const [first, second] = f.products;
  const lines = [{ productId: first, quantity: "2" }, { productId: second, quantity: "4" }];
  const received = command(f.patient, { origin: "donation", lines });
  const [submitted, repeated] = await Promise.all([intake(f.admin, received), intake(f.admin, received)]);
  assert.deepEqual(repeated, submitted);
  assert.equal(submitted.result.code, "CHE-0001");
  assert.equal(submitted.result.state, "approved");
  assert.deepEqual(await intake(f.admin, { ...received, p_body: null }), submitted);
  assert.deepEqual(credits(submitted.result.id), lines.map(line => [line.productId, line.quantity]).sort());
  assert.equal(sql(`select count(*) from public.operational_documents where care_recipient_id=${q(f.patient)}`), "1");
  const next = await intake(f.family, command(f.patient, { origin: "gift", lines }));
  assert.equal(next.result.state, "pending");
  assert.equal(next.result.code, "CHE-0002");
  assert.deepEqual(credits(next.result.id), []);

  const rejected = await intake(f.family, command(f.patient, { origin: "external_purchase", lines }));
  assert.equal(rejected.result.code, "CHE-0003");
  const denied = await batch(f, [target(rejected.result, "reject", "Embalagem devolvida ao fornecedor.")]);
  assert.equal(denied.results[0].status, "rejected");
  assert.deepEqual(credits(rejected.result.id), []);
  assert.equal((await read(f.family, f.patient, rejected.result.id)).reason, "Embalagem devolvida ao fornecedor.");
});

test("CHE and COM share review while correction belongs to the author and preserves history", async () => {
  const f = await purchaseBalanceFixture();
  const first = f.document.lines[0], productId = first.product_id;
  const parcel = await purchaseBalanceArrival(f, f.document, [{ lineId: first.id, quantity: "1" }]);
  const created = command(f.patient, { origin: "donation", lines: [{ productId, quantity: "2" }] });
  const { result: arrival } = await intake(f.family, created);
  const global = await rpc(f.admin, "com_arrival_review_queue", { p_patient: f.patient });
  assert.deepEqual(global.arrivals.map(row => [row.documentId, row.receiptId, row.origin]),
    [[null, arrival.id, "donation"], [parcel.document.id, parcel.receipt.id, undefined]]);
  const scoped = await rpc(f.admin, "com_arrival_review_queue", { p_patient: f.patient, p_document: parcel.document.id });
  assert.deepEqual(scoped.arrivals.map(row => row.receiptId), [parcel.receipt.id]);
  const cursor = global.arrivals[0];
  const next = await rpc(f.admin, "com_arrival_review_queue", { p_patient: f.patient, p_before_at: cursor.submittedAt, p_before_id: cursor.receiptId });
  assert.deepEqual(next.arrivals.map(row => row.receiptId), [parcel.receipt.id]);
  const mixed = await batch(f, [target(arrival, "request_correction", "Reconte as embalagens recebidas."),
    { documentId: parcel.document.id, receiptId: parcel.receipt.id, version: parcel.document.version, decision: "approve" }]);
  assert.deepEqual(mixed.results.map(row => row.status), ["correction_requested", "approved"]);
  assert.deepEqual(credits(arrival.id), []);
  const before = await read(f.family, f.patient, arrival.id);
  assert.equal(before.canCorrect, true);
  assert.equal((await read(f.admin, f.patient, arrival.id)).canCorrect, false);
  const payload = command(f.patient, { arrivalId: arrival.id, version: before.version, lines: [{ productId, quantity: "3" }] });
  assert.equal((await f.admin.rpc("unlinked_arrival_command", payload)).error?.code, "42501");
  const resubmitted = await intake(f.family, payload);
  assert.equal(resubmitted.result.id, arrival.id);
  assert.equal(resubmitted.result.code, arrival.code);
  assert.equal(resubmitted.result.state, "pending");
  assert.equal((await batch(f, [target(arrival, "approve")])).results[0].status, "changed");
  const key = randomUUID(), entries = [target(resubmitted.result, "approve")];
  const approved = await batch(f, entries, key);
  assert.deepEqual(await batch(f, entries, key), approved);
  assert.deepEqual(credits(arrival.id), [[productId, "3"]]);
  const after = await read(f.family, f.patient, arrival.id);
  assert.deepEqual(after.history.map(event => [event.state, event.materials[0].quantity]),
    [["pending", "2"], ["correction_requested", "2"], ["pending", "3"], ["approved", "3"]]);
  assert.equal(after.history[1].reason, "Reconte as embalagens recebidas.");
  assert.deepEqual(await intake(f.family, { ...created, p_body: null }), { key: created.p_key, state: "recorded", result: arrival });
});

test("CHE rejects cross-context and invalid precision and seals an absent attempt against delayed execution", async () => {
  const f = await purchaseBalanceFixture();
  const reader = await actor("reader", f.patient);
  const productId = f.products[0];
  const wrong = command(f.patient, { origin: "donation", lines: [{ productId, quantity: "1.5" }] });
  assert.equal((await f.family.rpc("unlinked_arrival_command", wrong)).error?.code, "22023");
  assert.equal((await reader.rpc("read_unlinked_arrivals", { p_patient: f.patient })).error?.code, "42501");
  const valid = command(f.patient, { origin: "gift", lines: [{ productId, quantity: "1" }] });
  assert.deepEqual(await intake(f.family, { ...valid, p_body: null }), { key: valid.p_key, state: "not_applied", result: null });
  assert.equal((await f.family.rpc("unlinked_arrival_command", valid)).error?.code, "PT409");
  assert.equal((await reader.rpc("unlinked_arrival_command", { ...valid, p_body: null })).error?.code, "42501");
  assert.deepEqual((await read(f.family, f.patient)).arrivals, []);
  const { result: created } = await intake(f.family, { ...valid, p_key: randomUUID() });
  const other = await purchaseBalanceFixture();
  assert.equal((await other.admin.rpc("read_unlinked_arrivals", { p_patient: other.patient, p_id: created.id })).error?.code, "42501");
  assert.equal((await batch(other, [target(created, "approve")])).results[0].status, "blocked");
  assert.deepEqual(credits(created.id), []);
});
