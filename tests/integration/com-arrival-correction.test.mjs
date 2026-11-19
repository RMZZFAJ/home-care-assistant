import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { test } from "node:test";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { rpc } from "./v4-fixtures.mjs";
import { purchaseBalanceCommand, purchaseBalanceFixture } from "./purchase-entry-balance-fixtures.mjs";

test("arrival correction preserves the original declaration and credits only the revised amount once", async () => {
  const f = await purchaseBalanceFixture(), [line] = f.document.lines;
  const initial = { lineId: line.id, quantity: "4", expectedQuantity: "6", remainingAction: "wait" };
  const pending = await purchaseBalanceCommand(f.family, f.document, "receive", { lines: [initial] });
  const [receipt] = pending.receipts;
  const body = { receiptId: receipt.id, reason: "Confira as unidades por embalagem." };
  const request = { domain: "supply", action: "request_receipt_correction", body, expectedVersion: pending.version };
  assert.equal((await f.family.rpc("execute_document_decision", {
    p_document: pending.id, p_key: randomUUID(), p_intention: request,
  })).error?.code, "42501");
  const requested = await rpc(f.admin, "execute_document_decision", { p_document: pending.id, p_key: randomUUID(), p_intention: request });
  const correction = requested.result;
  assert.equal(correction.receipts[0].state, "correction_requested");
  assert.deepEqual(correction.receipts[0].corrections[0].previousLines, [initial]);
  assert.equal(correction.receipts[0].corrections[0].reason, body.reason);
  assert.equal(Number(correction.purchaseProgress.lines.find(row => row.lineId === line.id).unarrivedQuantity), 2);
  assert.equal((await f.admin.rpc("supply_document_command", {
    p_id: pending.id, p_action: "validate_receipt", p_body: { receiptId: receipt.id }, p_key: randomUUID(), p_version: correction.version,
  })).error?.message, "receipt not pending");

  const revised = { ...initial, quantity: "5" };
  const intention = { domain: "supply", action: "resubmit_receipt", body: { receiptId: receipt.id, lines: [revised] }, expectedVersion: correction.version };
  const key = randomUUID();
  assert.equal((await f.admin.rpc("execute_document_decision", {
    p_document: pending.id, p_key: key, p_intention: intention,
  })).error?.code, "42501");
  assert.equal((await f.family.rpc("execute_document_decision", {
    p_document: pending.id, p_key: randomUUID(), p_intention: { ...intention, expectedVersion: pending.version },
  })).error?.code, "PT409");
  const [resubmitted, repeated] = await Promise.all([0, 1].map(() => rpc(f.family, "execute_document_decision", {
    p_document: pending.id, p_key: key, p_intention: intention,
  })));
  assert.deepEqual(resubmitted, repeated);
  assert.deepEqual(await rpc(f.family, "settle_document_decision", { p_document: pending.id, p_key: key }), resubmitted);
  assert.equal(resubmitted.result.receipts.length, 1);
  assert.deepEqual(resubmitted.result.receipts[0].lines, [revised]);
  assert.equal(resubmitted.result.receipts[0].state, "pending");
  assert.deepEqual(resubmitted.result.receipts[0].corrections[0].correctedLines, [revised]);
  const credited = await purchaseBalanceCommand(f.admin, resubmitted.result, "validate_receipt", { receiptId: receipt.id });
  assert.equal(credited.receipts[0].state, "approved");
  assert.equal(Number(credited.purchaseEntryBalances.find(row => row.lineId === line.id).entry.enteredQuantity), 5);
  assert.equal(sql(`select count(*) from public.stock_movements where reference_type='purchase_receipt' and reference_id=${sqlLiteral(receipt.id)};`), "1");
  assert.equal(sql(`select count(*) from private.document_progress_facts where document_id=${sqlLiteral(credited.id)} and action in ('com.request_receipt_correction','com.resubmit_receipt');`), "2");
});

test("an outstanding zero declaration can be corrected after another arrival fills the expectation", async () => {
  const f = await purchaseBalanceFixture(), [line] = f.document.lines;
  const pending = await purchaseBalanceCommand(f.family, f.document, "receive", { lines: [{
    lineId: line.id, quantity: "0", expectedQuantity: "6", remainingAction: "wait",
  }] });
  const [original] = pending.receipts;
  const awaitingAuthor = await purchaseBalanceCommand(f.admin, pending, "request_receipt_correction", {
    receiptId: original.id, reason: "Confirme a ausência da embalagem neste lançamento.",
  });
  const fulfilled = await purchaseBalanceCommand(f.admin, awaitingAuthor, "receive", { lines: [{
    lineId: line.id, quantity: "6", expectedQuantity: "6",
  }] });
  const sameReference = [{ lineId: line.id, quantity: "0", expectedQuantity: "0" }];
  assert.equal((await f.family.rpc("supply_document_command", {
    p_id: fulfilled.id, p_action: "receive", p_body: { lines: sameReference }, p_key: randomUUID(), p_version: fulfilled.version,
  })).error?.code, "PT409");
  const resubmitted = await purchaseBalanceCommand(f.family, fulfilled, "resubmit_receipt", { receiptId: original.id, lines: sameReference });
  const approved = await purchaseBalanceCommand(f.admin, resubmitted, "validate_receipt", { receiptId: original.id });
  assert.equal(approved.receipts.find(receipt => receipt.id === original.id).state, "approved");
  assert.equal(approved.purchaseProgress.validationPending, false);
  assert.equal(Number(approved.purchaseEntryBalances.find(row => row.lineId === line.id).entry.enteredQuantity), 6);
  assert.equal(sql(`select count(*) from public.stock_movements where reference_type='purchase_receipt' and reference_id=${sqlLiteral(original.id)};`), "0");
});
