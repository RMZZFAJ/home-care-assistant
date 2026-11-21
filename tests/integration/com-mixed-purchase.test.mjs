import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { actor, fixtures, rpc, setup } from "./v4-fixtures.mjs";
import { purchaseBalanceCommand, purchaseBalanceFacts } from "./purchase-entry-balance-fixtures.mjs";

async function preparedPurchase() {
  const f = await setup();
  const family = await actor("family", f.patient);
  const document = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_draft: false,
    p_payload: { origin: "purchase", lines: f.products.map(productId => ({ productId, quantity: "10" })) },
  });
  const inHand = document.lines.find(line => line.product_id === f.products[0]);
  const online = document.lines.find(line => line.product_id === f.products[1]);
  const body = { lines: [
    { lineId: inHand.id, quantity: "3", inHand: true },
    { lineId: online.id, quantity: "4", inHand: false, expectedDate: "2027-01-19" },
  ] };
  return { ...f, family, document, body, inHand, online };
}

function familyStock(f, line) {
  return Number(sql(`select private.stock_quantity(${q(f.patient)},${q(line.product_id)},'FAMILY')`));
}

test("a mixed purchase credits the administrator's physical arrival once and preserves the other material's forecast", async () => {
  const f = await preparedPurchase(), key = randomUUID();
  const before = familyStock(f, f.inHand), onlineBefore = familyStock(f, f.online);
  const first = await purchaseBalanceCommand(f.admin, f.document, "purchase", f.body, key);
  const second = await purchaseBalanceCommand(f.admin, f.document, "purchase", f.body, key);
  assert.equal(second.purchaseArrivalId, first.purchaseArrivalId);
  assert.equal(second.version, first.version);
  assert.equal(first.version, f.document.version + 2);
  assert.deepEqual(first.events.slice(-2).map(event => event.action), ["com.purchase", "com.receive"]);
  assert.equal(first.receipts.length, 1);
  assert.equal(first.receipts[0].id, first.purchaseArrivalId);
  assert.equal(first.receipts[0].state, "approved");
  assert.deepEqual(first.receipts[0].lines, [{ lineId: f.inHand.id, quantity: "3" }]);
  assert.equal(first.purchaseEntryBalances.find(line => line.lineId === f.inHand.id).entry.receiptId, first.purchaseArrivalId);
  assert.equal(familyStock(f, f.inHand), before + 3);
  assert.equal(familyStock(f, f.online), onlineBefore);

  const read = await rpc(f.admin, "operational_document", { p_id: f.document.id });
  assert.deepEqual(read.purchaseSchedule, [{
    eventId: first.events.at(-2).id, lineId: f.online.id, quantity: "4",
    expectedDate: "2027-01-19", recordedAt: first.events.at(-2).createdAt,
  }]);
  assert.equal(Number(read.purchaseProgress.lines.find(line => line.lineId === f.online.id).unarrivedQuantity), 4);

  const delivery = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient, p_type: "ENT", p_key: randomUUID(), p_draft: false,
    p_payload: {
      source: "FAMILY", destination: "CARE_TEAM", recipientId: fixtures.professional.id,
      recipientReason: "Recebedor fictício para a compra em andamento.",
      lines: [{ productId: f.inHand.product_id, quantity: "3" }],
      sources: [{ documentId: f.document.id, general: true, productIds: [f.inHand.product_id] }],
    },
  });
  assert.equal(delivery.originDocuments[0].documentId, f.document.id);
  assert.equal(familyStock(f, f.inHand), before);
  assert.equal((await rpc(f.admin, "operational_document", { p_id: f.document.id })).purchaseProgress.physicalPending, true);
});

test("a family mixed purchase recovers the same pending declaration and credits it only after approval", async () => {
  const f = await preparedPurchase(), key = randomUUID();
  const before = familyStock(f, f.inHand);
  const packet = { p_document: f.document.id, p_key: key, p_intention: {
    domain: "supply", action: "purchase", expectedVersion: f.document.version, body: f.body,
  } };
  const [first, replay] = await Promise.all([
    rpc(f.family, "execute_document_decision", packet),
    rpc(f.family, "execute_document_decision", packet),
  ]);
  assert.equal(first.state, "applied");
  assert.deepEqual(replay, first);
  const received = first.result;
  assert.equal(received.receipts.length, 1);
  assert.equal(received.receipts[0].id, received.purchaseArrivalId);
  assert.equal(received.receipts[0].state, "pending");
  assert.equal(familyStock(f, f.inHand), before);
  const settled = await rpc(f.family, "settle_document_decision", { p_document: f.document.id, p_key: key });
  assert.deepEqual(settled, first);
  const validated = await purchaseBalanceCommand(f.admin, received, "validate_receipt", { receiptId: received.purchaseArrivalId });
  assert.equal(validated.receipts[0].state, "approved");
  assert.equal(familyStock(f, f.inHand), before + 3);
  assert.deepEqual((await rpc(f.family, "execute_document_decision", packet)).result, received);
  assert.equal(familyStock(f, f.inHand), before + 3);
});

test("contradictory timing and denied arrival authorization leave purchase, receipt and stock unchanged", async () => {
  const f = await preparedPurchase();
  const before = purchaseBalanceFacts(f);
  const cmd = (body) => f.family.rpc("supply_document_command", {
    p_id: f.document.id, p_action: "purchase", p_key: randomUUID(), p_version: f.document.version, p_body: body,
  });
  const contradictory = await cmd({ lines: [{ ...f.body.lines[0], expectedDate: "2027-01-19" }] });
  assert.equal(contradictory.error?.code, "22023");
  const invalid = await cmd({ lines: [{ ...f.body.lines[1], expectedDate: "2027-02-30" }] });
  assert.equal(invalid.error?.code, "22023");
  const repeated = await cmd({ lines: [f.body.lines[0], {
    lineId: f.inHand.id.toUpperCase(), quantity: "1", inHand: false,
  }] });
  assert.equal(repeated.error?.code, "22023");
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled)
    values(${q(f.patient)},${q(fixtures.family.id)},'com.receive',false)`);
  const denied = await cmd(f.body);
  assert.equal(denied.error?.code, "42501");
  assert.equal(purchaseBalanceFacts(f), before);

  const online = await cmd({ lines: [f.body.lines[1]] });
  assert.ifError(online.error);
  assert.equal(online.data.version, f.document.version + 1);
  assert.deepEqual(online.data.receipts, []);
});
