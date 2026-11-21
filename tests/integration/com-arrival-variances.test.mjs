import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { rpc } from "./v4-fixtures.mjs";
import { purchaseBalanceCommand, purchaseBalanceFixture } from "./purchase-entry-balance-fixtures.mjs";

const stockFor = (f, line) => Number(sql(`select private.stock_quantity(${q(f.patient)},${q(line.product_id)},'FAMILY')`));
const progressFor = (document, line) => document.purchaseProgress.lines.find(row => row.lineId === line.id);
const bodyFor = (...lines) => ({ lines });

test("a family arrival preserves short and excess declarations and credits only upon validation", async () => {
  const f = await purchaseBalanceFixture(), [short, more] = f.document.lines;
  const before = [stockFor(f, short), stockFor(f, more)];
  const body = bodyFor(
    { lineId: short.id, quantity: "4", expectedQuantity: "6", remainingAction: "short" },
    { lineId: more.id, quantity: "8", expectedQuantity: "6", excessConfirmed: true },
  );
  const key = randomUUID();
  const pending = await purchaseBalanceCommand(f.family, f.document, "receive", body, key);
  const receipt = pending.receipts[0];
  assert.equal(receipt.l2_arrival, true);
  assert.equal(receipt.state, "pending");
  assert.deepEqual(receipt.lines, body.lines);
  assert.equal(Number(progressFor(pending, short).unarrivedQuantity), 0);
  assert.equal(Number(progressFor(pending, more).pendingValidationQuantity), 8);
  assert.deepEqual([stockFor(f, short), stockFor(f, more)], before);

  const approved = await purchaseBalanceCommand(f.admin, pending, "validate_receipt", { receiptId: receipt.id });
  assert.equal(approved.receipts[0].state, "approved");
  assert.equal(approved.purchaseProgress.physicalPending, false);
  assert.equal(Number(progressFor(approved, short).closedShortQuantity), 2);
  assert.equal(Number(progressFor(approved, more).approvedExcessQuantity), 2);
  assert.equal(Number(progressFor(approved, more).validatedQuantity), 8);
  assert.equal(Number(approved.lines.find(line => line.id === more.id).purchased_quantity), 6);
  assert.deepEqual([stockFor(f, short), stockFor(f, more)], [before[0] + 4, before[1] + 8]);
  assert.equal(Number(approved.purchaseEntryBalances.find(line => line.lineId === more.id).entry.enteredQuantity), 8);
  assert.equal((await purchaseBalanceCommand(f.family, f.document, "receive", body, key)).version, approved.version);
  assert.deepEqual([stockFor(f, short), stockFor(f, more)], [before[0] + 4, before[1] + 8]);

  const sources = await rpc(f.admin, "supply_source_options", {
    p_patient: f.patient, p_target: "ENT", p_ids: [approved.id], p_filter: "", p_search: "", p_page: 1,
  });
  assert.equal(sources.data[0].materials.find(row => row.lineId === more.id).available, "8");
});

test("a pending wait leaves the undispatched remainder open, and a rejected shortage releases it", async () => {
  const f = await purchaseBalanceFixture(), [line] = f.document.lines;
  const waiting = await purchaseBalanceCommand(f.family, f.document, "receive",
    bodyFor({ lineId: line.id, quantity: "2", expectedQuantity: "6", remainingAction: "wait" }));
  assert.equal(Number(progressFor(waiting, line).unarrivedQuantity), 4);
  const before = stockFor(f, line);
  const closed = await purchaseBalanceCommand(f.family, waiting, "receive",
    bodyFor({ lineId: line.id, quantity: "0", expectedQuantity: "4", remainingAction: "short" }));
  assert.equal(closed.purchaseProgress.validationPending, true);
  assert.equal(Number(progressFor(closed, line).unarrivedQuantity), 0);
  const refused = await purchaseBalanceCommand(f.admin, closed, "reject_receipt",
    { receiptId: closed.receipts.at(-1).id, reason: "A loja ainda entregará a parcela restante." });
  assert.equal(Number(progressFor(refused, line).unarrivedQuantity), 4);
  const zero = await purchaseBalanceCommand(f.admin, refused, "receive",
    bodyFor({ lineId: line.id, quantity: "0", expectedQuantity: "4", remainingAction: "short" }));
  assert.equal(Number(progressFor(zero, line).closedShortQuantity), 4);
  assert.equal(zero.purchaseEntryBalances.find(row => row.lineId === line.id).state, "not_validated");
  assert.equal(stockFor(f, line), before);
});

test("changed references and unconfirmed excess leave the document and stock intact", async () => {
  const f = await purchaseBalanceFixture(), [line] = f.document.lines;
  const before = stockFor(f, line);
  const submit = (fields) => f.admin.rpc("supply_document_command", {
    p_id: f.document.id, p_action: "receive", p_key: randomUUID(), p_version: f.document.version,
    p_body: bodyFor({ lineId: line.id, ...fields }),
  });
  assert.equal((await submit({ quantity: "8", expectedQuantity: "6" })).error?.code, "22023");
  assert.equal((await submit({ quantity: "4", expectedQuantity: "5", remainingAction: "short" })).error?.code, "PT409");
  assert.equal((await submit({ quantity: "8" })).error?.code, "22023");
  const after = await rpc(f.admin, "operational_document", { p_id: f.document.id });
  assert.equal(after.version, f.document.version);
  assert.deepEqual(after.receipts, []);
  assert.equal(stockFor(f, line), before);
});
