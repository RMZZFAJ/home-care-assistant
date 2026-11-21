import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { rpc } from "./v4-fixtures.mjs";
import { purchaseBalanceCommand, purchaseBalanceFixture } from "./purchase-entry-balance-fixtures.mjs";

async function anotherPurchase(f) {
  const created = await rpc(f.admin, "create_supply_document", { p_patient: f.patient, p_type: "COM",
    p_payload: { origin: "purchase", lines: [{ productId: f.document.lines[0].product_id, quantity: "6" }] },
    p_key: randomUUID(), p_draft: false,
  });
  return purchaseBalanceCommand(f.admin, created, "purchase", { lines: [{ lineId: created.lines[0].id, quantity: "6" }] });
}

async function pendingArrivals(f, purchase, count) {
  for (let index = 0; index < count; index++) purchase = await purchaseBalanceCommand(f.family, purchase, "receive", {
    lines: [{ lineId: purchase.lines[0].id, quantity: "1" }],
  });
  return purchase;
}

function decision(purchase, receipt, choice = "approve") {
  return { documentId: purchase.id, receiptId: receipt.id, version: purchase.version, decision: choice,
    ...(choice === "approve" ? {} : { reason: "Confira o registro da embalagem." }) };
}

test("COM review batches apply only selected pending arrivals and preserve one result per receipt", async () => {
  const f = await purchaseBalanceFixture();
  const a = await pendingArrivals(f, f.document, 3);
  const b = await pendingArrivals(f, await anotherPurchase(f), 2);
  const outdated = await pendingArrivals(f, await anotherPurchase(f), 1);
  await pendingArrivals(f, outdated, 1);
  const moved = await purchaseBalanceCommand(f.admin, b, "validate_receipt", { receiptId: b.receipts[0].id });
  const q = await rpc(f.admin, "com_arrival_review_queue", { p_patient: f.patient, p_document: a.id });
  assert.deepEqual(new Set(q.arrivals.map(row => row.receiptId)), new Set(a.receipts.map(row => row.id)));
  assert.ok(q.arrivals.every(row => row.documentId === a.id && row.version === a.version && row.materials[0].quantity === "1"));
  assert.equal((await f.family.rpc("com_arrival_review_queue", { p_patient: f.patient })).error?.code, "42501");

  const key = randomUUID();
  const supplied = [decision(a, a.receipts[0]), decision(moved, b.receipts[0]), decision(a, a.receipts[1]),
    decision(moved, b.receipts[1], "request_correction"), decision(outdated, outdated.receipts[0]),
    decision(a, { id: randomUUID() })];
  const input = { p_patient: f.patient, p_key: key, p_entries: supplied };
  const [first, repeated] = await Promise.all([0, 1].map(() => rpc(f.admin, "execute_com_arrival_review", input)));
  assert.deepEqual(first, repeated);
  assert.deepEqual(first.results.map(item => item.status), ["approved", "already_decided", "approved", "correction_requested", "changed", "blocked"]);
  assert.deepEqual(first.results.map(item => item.receiptId), supplied.map(item => item.receiptId));
  assert.deepEqual(await rpc(f.admin, "settle_com_arrival_review", { p_patient: f.patient, p_key: key }), first);
  assert.equal((await f.admin.rpc("execute_com_arrival_review", { ...input, p_entries: supplied.slice(0, 2) })).error?.code, "PT409");
  const remaining = await rpc(f.admin, "com_arrival_review_queue", { p_patient: f.patient, p_document: a.id });
  assert.deepEqual(remaining.arrivals.map(item => item.receiptId), [a.receipts[2].id]);
  assert.equal(sql(`select count(*) from public.stock_movements where reference_type='purchase_receipt' and reference_id in (${a.receipts.map(item => sqlLiteral(item.id)).join(",")});`), "2");
  const reject = await rpc(f.admin, "execute_com_arrival_review", { p_patient: f.patient, p_key: randomUUID(),
    p_entries: [{ ...decision(a, a.receipts[2], "reject"), version: remaining.arrivals[0].version }] });
  assert.equal(reject.results[0].status, "rejected");
  assert.deepEqual((await rpc(f.admin, "com_arrival_review_queue", { p_patient: f.patient, p_document: a.id })).arrivals, []);
});

test("settling an absent COM review key prevents later application and keeps the arrival untouched", async () => {
  const f = await purchaseBalanceFixture(), a = await pendingArrivals(f, f.document, 1);
  const key = randomUUID(), input = { p_patient: f.patient, p_key: key };
  assert.deepEqual(await rpc(f.admin, "settle_com_arrival_review", input), { key, state: "not_applied", results: null });
  assert.equal((await f.admin.rpc("execute_com_arrival_review", { ...input, p_entries: [decision(a, a.receipts[0])] })).error?.code, "PT409");
  assert.equal((await rpc(f.admin, "operational_document", { p_id: a.id })).receipts[0].state, "pending");
  assert.equal((await f.family.rpc("settle_com_arrival_review", input)).error?.code, "42501");
});
