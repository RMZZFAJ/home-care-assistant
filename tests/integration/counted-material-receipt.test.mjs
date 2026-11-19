import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { rpc, transferFixture, transferState } from "./transfer-fixtures.mjs";

const balance = (f, product, custody) => Number(sql(
  `select private.stock_quantity(${q(f.patient)},${q(product)},${q(custody)})`,
));
const quantities = (receipt) => Object.fromEntries(
  Object.entries(receipt).map(([fact, value]) => [fact, Number(value)]),
);

test("ENT records shortage and excess independently and reconciles only the quantity in transit", async () => {
  const f = await transferFixture();
  const [shortProduct, excessProduct] = f.products;
  const shipmentNotes = "Materiais fictícios expedidos em dois volumes.";
  const sent = await rpc(f.admin, "create_supply_document", {
    p_patient: f.patient,
    p_type: "ENT",
    p_key: randomUUID(),
    p_payload: {
      source: "FAMILY",
      destination: "CARE_TEAM",
      recipientId: f.initiator.id,
      recipientReason: "Conferência destinada ao profissional fictício do plantão.",
      notes: shipmentNotes,
      lines: [
        { productId: shortProduct, quantity: "5" },
        { productId: excessProduct, quantity: "6" },
      ],
    },
  });
  const short = sent.lines.find((line) => line.product_id === shortProduct);
  const excess = sent.lines.find((line) => line.product_id === excessProduct);
  const notes = "No segundo volume chegaram oito unidades fictícias.";
  const packet = {
    p_id: sent.id,
    p_action: "receive",
    p_body: { countedReceipt: { notes, lines: [
      { lineId: short.id, receivedQuantity: "3" },
      { lineId: excess.id, receivedQuantity: "8" },
    ] } },
    p_key: randomUUID(),
    p_version: sent.version,
  };
  const afterDispatch = transferState(f);
  const wrongActor = await f.admin.rpc("supply_document_command", packet);
  assert.equal(wrongActor.error?.code, "42501");
  const missingLine = await f.initiator.client.rpc("supply_document_command", {
    ...packet,
    p_body: { countedReceipt: { lines: packet.p_body.countedReceipt.lines.slice(0, 1) } },
  });
  assert.equal(missingLine.error?.code, "22023");
  assert.equal(transferState(f), afterDispatch);

  const accepted = await rpc(f.initiator.client, "supply_document_command", packet);
  assert.equal(accepted.status, "disputed");
  assert.equal(accepted.workflow_data.acceptedBy, f.initiator.id);
  assert.equal(accepted.workflow_data.receiptNotes, notes);
  assert.equal(accepted.payload.notes, shipmentNotes);
  const shortReceipt = accepted.lines.find((line) => line.id === short.id).metadata.countedReceipt;
  const excessReceipt = accepted.lines.find((line) => line.id === excess.id).metadata.countedReceipt;
  assert.deepEqual(quantities(shortReceipt), {
    expeditedQuantity: 5, receivedQuantity: 3, recognizedQuantity: 3, remainingTransitQuantity: 2, excessQuantity: 0,
  });
  assert.deepEqual(quantities(excessReceipt), {
    expeditedQuantity: 6, receivedQuantity: 8, recognizedQuantity: 6, remainingTransitQuantity: 0, excessQuantity: 2,
  });
  assert.equal(balance(f, shortProduct, "TRANSIT"), 2);
  assert.equal(balance(f, excessProduct, "TRANSIT"), 0);
  assert.equal(balance(f, excessProduct, "CARE_TEAM"), 6);
  const afterReceipt = transferState(f);
  const tasks = { p_patient: f.patient, p_scope: "own", p_status: "tasks", p_page: 1, p_size: 20 };
  assert.equal((await rpc(f.initiator.client, "delivery_task_list", tasks)).data.find(row => row.id === sent.id)?.task.code, "resolve");
  assert.equal((await rpc(f.initiator.client, "supply_document_command", packet)).version, accepted.version);
  assert.equal(transferState(f), afterReceipt);

  const reconcile = {
    p_id: sent.id,
    p_action: "resolve",
    p_body: { lineId: excess.id, quantity: "0", reason: "Apuração fictícia de quantidade.", resolution: "received" },
    p_key: randomUUID(),
    p_version: accepted.version,
  };
  const wrong = await f.initiator.client.rpc("supply_document_command", reconcile);
  assert.ok(wrong.error);
  assert.equal(transferState(f), afterReceipt);
  const resolved = await rpc(f.initiator.client, "supply_document_command", {
    ...reconcile,
    p_body: { ...reconcile.p_body, lineId: short.id, quantity: "2" },
  });
  assert.equal(balance(f, shortProduct, "TRANSIT"), 0);
  assert.equal(resolved.status, "disputed");
  assert.deepEqual(resolved.lines.find((line) => line.id === short.id).metadata.countedReceipt, shortReceipt);
  assert.deepEqual(resolved.lines.find((line) => line.id === excess.id).metadata.countedReceipt, excessReceipt);
  assert.equal((await rpc(f.initiator.client, "delivery_task_list", tasks)).data.some(row => row.id === sent.id), false);
});

test("DEV records the excess without a second debit from team custody or an extra family credit", async () => {
  const f = await transferFixture();
  const product = f.products[0];
  const reference = await rpc(f.initiator.client, "transfer_preparation", {
    p_patient: f.patient, p_source: "CARE_TEAM",
  });
  const sent = await rpc(f.initiator.client, "create_transfer_declaration", {
    p_patient: f.patient,
    p_key: randomUUID(),
    p_body: {
      mode: "direct", source: "CARE_TEAM", recipientId: f.recipient.id,
      referenceHash: reference.referenceHash, reason: "Devolução fictícia para conferência familiar.",
      lines: [{ productId: product, quantity: "5" }],
    },
  });
  const teamAfterDispatch = balance(f, product, "CARE_TEAM");
  const familyBeforeReceipt = balance(f, product, "FAMILY");
  const accepted = await rpc(f.recipient.client, "supply_document_command", {
    p_id: sent.id,
    p_action: "receive",
    p_body: { countedReceipt: { lines: [{ lineId: sent.lines[0].id, receivedQuantity: "7" }] } },
    p_key: randomUUID(),
    p_version: sent.version,
  });
  assert.equal(accepted.kind, "DEV");
  assert.equal(accepted.workflow_data.acceptedBy, f.recipient.id);
  assert.equal(Number(accepted.lines[0].metadata.countedReceipt.excessQuantity), 2);
  assert.equal(balance(f, product, "CARE_TEAM"), teamAfterDispatch);
  assert.equal(balance(f, product, "FAMILY"), familyBeforeReceipt + 5);
  assert.equal(balance(f, product, "TRANSIT"), 0);
});
