import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { rpc } from "./v4-fixtures.mjs";
import { purchaseBalanceCommand, purchaseBalanceFixture } from "./purchase-entry-balance-fixtures.mjs";

const receive = (f, body, key = randomUUID()) => rpc(f.family, "unlinked_arrival_command", {
  p_patient: f.patient, p_key: key, p_body: body,
});
const view = (f, id) => rpc(f.admin, "operational_document", { p_id: id });
const frozenCoverage = id => JSON.parse(sql(`select body->'purchaseCoverage' from public.document_events
  where document_id=${q(id)} and action='com.arrival_coverage' order by version desc limit 1`));
const stock = (patient, product) => Number(sql(`select private.stock_quantity(${q(patient)},${q(product)},'FAMILY')`));
const linked = plan => ({ documentId: plan.id, lineId: plan.lines[0].id });
const cover = (plan, quantity) => ({ ...linked(plan), quantity });
const entries = (entry, action, reason) => [{
  documentId: null, receiptId: entry.id, version: entry.version, decision: action, ...(reason ? { reason } : {}),
}];
const review = (f, p_entries, key = randomUUID()) => rpc(f.admin, "execute_com_arrival_review", {
  p_patient: f.patient, p_key: key, p_entries,
});

async function plan(f, product, quantity) {
  return rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_draft: false,
    p_payload: { origin: "purchase", lines: [{ productId: product, quantity }] } });
}

test("COM explicitly covers an earlier plan without attributing physical receipt to the older purchase", async () => {
  const f = await purchaseBalanceFixture(), product = f.products[0];
  const baseline = stock(f.patient, product);
  const earlier = await plan(f, product, "5"), latest = await plan(f, product, "8");
  const bought = await purchaseBalanceCommand(f.family, latest, "purchase", { lines: [{ lineId: latest.lines[0].id, quantity: "8" }] });
  const key = randomUUID(), item = { lineId: bought.lines[0].id, quantity: "8", expectedQuantity: "8", coverage: cover(earlier, "3") };
  const posted = await purchaseBalanceCommand(f.family, bought, "receive", { lines: [item] }, key);
  assert.equal(posted.receipts[0].state, "pending");
  assert.equal((await view(f, earlier.id)).purchaseProgress.lines[0].remainingExpectation, 5);
  assert.equal(stock(f.patient, product), baseline);
  const pending = await rpc(f.admin, "com_arrival_review_queue", { p_patient: f.patient, p_document: latest.id });
  assert.deepEqual(pending.arrivals[0].materials[0].priorPlanning, { documentId: earlier.id, code: earlier.code, quantity: "3" });
  const receiptKey = randomUUID(), action = { receiptId: posted.receipts[0].id };
  const confirmed = await purchaseBalanceCommand(f.admin, posted, "validate_receipt", action, receiptKey);
  await purchaseBalanceCommand(f.admin, posted, "validate_receipt", action, receiptKey);
  assert.equal(confirmed.receipts[0].state, "approved");
  assert.equal(confirmed.purchaseCoverage[0].targetDocumentId, earlier.id);
  assert.equal(stock(f.patient, product), baseline + 8);
  const older = await view(f, earlier.id);
  assert.equal(older.purchaseProgress.lines[0].coveredQuantity, 3);
  assert.equal(older.purchaseProgress.lines[0].remainingExpectation, 2);
  assert.equal(older.purchaseProgress.lines[0].validatedQuantity, 0);
  assert.equal(older.purchaseCoverage[0].sourceCode, latest.code);
  assert.equal(older.events.filter(event => event.action === "com.arrival_coverage").length, 1);
  assert.equal(frozenCoverage(older.id)[0].sourceCode, latest.code);
  assert.equal((await f.family.rpc("supply_document_command", {
    p_id: older.id, p_action: "purchase", p_body: { lines: [{ lineId: older.lines[0].id, quantity: "3" }] }, p_key: randomUUID(), p_version: older.version,
  })).error?.code, "P0001");
  const closed = await purchaseBalanceCommand(f.admin, older, "close_expectation", { confirmed: true, reason: "O restante não será comprado." });
  assert.equal(closed.purchaseProgress.lines[0].waivedQuantity, 2);
  assert.equal(stock(f.patient, product), baseline + 8);
});

test("CHE associates with an open COM and covers an earlier plan in the same single physical entry", async () => {
  const f = await purchaseBalanceFixture(), product = f.products[0];
  const baseline = stock(f.patient, product);
  const earlier = await plan(f, product, "7"), latest = await plan(f, product, "10");
  const bought = await purchaseBalanceCommand(f.family, latest, "purchase", { lines: [{ lineId: latest.lines[0].id, quantity: "4" }] });
  const targets = await rpc(f.family, "purchase_arrival_targets", { p_patient: f.patient, p_product: product });
  assert.deepEqual([targets[0].documentId, targets[0].openPlanning, targets[0].waitingArrival], [bought.id, "6", "4"]);
  const body = { origin: "donation", lines: [{ productId: product, quantity: "6", association: linked(bought), coverage: cover(earlier, "3") }] };
  const key = randomUUID(), { result: arrival } = await receive(f, body, key);
  assert.equal(arrival.state, "pending");
  assert.equal(stock(f.patient, product), baseline);
  const packet = entries(arrival, "approve"), approvalKey = randomUUID();
  const first = await review(f, packet, approvalKey);
  assert.deepEqual(await review(f, packet, approvalKey), first);
  assert.equal(first.results[0].status, "approved");
  assert.equal((await receive(f, null, key)).result.id, arrival.id);
  const detail = await rpc(f.family, "read_unlinked_arrivals", { p_patient: f.patient, p_id: arrival.id });
  assert.equal(detail.materials[0].linkedPurchase.code, bought.code);
  assert.equal(detail.materials[0].priorPlanning.code, earlier.code);
  assert.equal(stock(f.patient, product), baseline + 6);
  assert.equal(sql(`select count(*) from public.stock_movements where reference_type='unlinked_arrival' and reference_id=${q(arrival.id)}`), "1");
  const main = (await view(f, bought.id)).purchaseProgress.lines[0];
  assert.deepEqual([main.validatedQuantity,main.coveredQuantity,main.associatedQuantity,main.unarrivedQuantity,main.remainingExpectation], [6,2,2,0,4]);
  const old = await view(f, earlier.id);
  assert.equal(old.purchaseProgress.lines[0].remainingExpectation, 4);
  assert.equal(old.purchaseProgress.lines[0].validatedQuantity, 0);
  assert.equal(old.purchaseCoverage[0].sourceDocumentId, bought.id);
  const frozen = frozenCoverage(bought.id);
  assert.equal(frozen.find(item => item.primaryAssociation).sourceCode, arrival.code);
  assert.equal(frozen.find(item => !item.primaryAssociation).targetCode, earlier.code);
});

test("stale shared coverage blocks its arrival atomically and allows the author to correct it", async () => {
  const f = await purchaseBalanceFixture(), product = f.products[0];
  const baseline = stock(f.patient, product);
  const older = await plan(f, product, "4"), main = await plan(f, product, "8");
  const { result: covered } = await receive(f, { origin: "gift", lines: [{ productId: product, quantity: "4", association: linked(main), coverage: cover(older, "4") }] });
  const { result: independent } = await receive(f, { origin: "gift", lines: [{ productId: product, quantity: "2" }] });
  await purchaseBalanceCommand(f.family, older, "purchase", { lines: [{ lineId: older.lines[0].id, quantity: "1" }] });
  const outcome = await review(f, [...entries(covered, "approve"), ...entries(independent, "approve")]);
  assert.deepEqual(outcome.results.map(row => row.status), ["blocked","approved"]);
  assert.equal(stock(f.patient, product), baseline + 2);
  assert.deepEqual((await view(f, main.id)).purchaseCoverage, []);
  await review(f, entries(covered, "request_correction", "Revise o planejamento escolhido."));
  const item = await rpc(f.family, "read_unlinked_arrivals", { p_patient: f.patient, p_id: covered.id });
  const revised = await receive(f, { arrivalId: covered.id, version: item.version, lines: [{ productId: product, quantity: "4", association: linked(main) }] });
  assert.equal((await review(f, entries(revised.result, "approve"))).results[0].status, "approved");
  assert.equal(stock(f.patient, product), baseline + 6);
  assert.equal((await view(f, main.id)).purchaseProgress.lines[0].coveredQuantity, 4);
});
