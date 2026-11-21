import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { rpc, transferFixture, transferState } from "./transfer-fixtures.mjs";

async function dispatch(f, source) {
  const client = source === "CARE_TEAM" ? f.initiator.client : f.admin;
  const recipient = source === "CARE_TEAM" ? f.recipient : f.initiator;
  const preparation = await rpc(client, "transfer_preparation", { p_patient: f.patient, p_source: source });
  const doc = await rpc(client, "create_transfer_declaration", {
    p_patient: f.patient, p_key: randomUUID(),
    p_body: {
      mode: "direct", source, recipientId: recipient.id,
      referenceHash: preparation.referenceHash,
      reason: "Expedição fictícia antes do cancelamento físico.",
      lines: [{ productId: f.products[0], quantity: "3" }],
    },
  });
  return { doc, client, recipient };
}

for (const source of ["FAMILY", "CARE_TEAM"]) {
  test(`cancelamento antes do aceite exige retorno comprovado e devolve uma vez à origem ${source}`, async () => {
    const f = await transferFixture(), { doc, client, recipient } = await dispatch(f, source);
    const before = transferState(f);
    const reason = "Expedição interrompida. Material devolvido à origem.";
    const intention = { domain: "supply", action: "cancel", expectedVersion: doc.version, body: { reason, transitReturned: true } };
    const args = { p_document: doc.id, p_key: randomUUID(), p_intention: intention };
    for (const value of [undefined, false, "true"]) {
      const denied = await client.rpc("supply_document_command", {
        p_id: doc.id, p_action: "cancel", p_key: randomUUID(), p_version: doc.version,
        p_body: { reason, transitReturned: value },
      });
      assert.equal(denied.error?.code, "22023");
    }
    assert.equal((await recipient.client.rpc("execute_document_decision", args)).error?.code, "42501");
    assert.equal(transferState(f), before);
    const result = await rpc(client, "execute_document_decision", args);
    assert.equal(result.state, "applied");
    assert.equal(result.result.status, "cancelled");
    assert.equal(Number(result.result.lines[0].accepted_quantity), 0);
    assert.equal(Number(result.result.lines[0].reconciled_quantity), 3);
    assert.equal(Number(result.result.lines[0].metadata.cancelledTransitReturn), 3);
    assert.equal(result.result.events.filter(event => event.action === "ent.cancel").length, 1);
    const after = transferState(f);
    const ids = new Set(JSON.parse(before).ledger.map(row => row.id));
    const newMovement = JSON.parse(after).ledger.filter(row => !ids.has(row.id));
    assert.equal(newMovement.length, 1);
    assert.equal(newMovement[0].source_location, "TRANSIT");
    assert.equal(newMovement[0].destination_location, source);
    assert.equal(Number(newMovement[0].quantity), 3);
    assert.deepEqual(await rpc(client, "execute_document_decision", args), result);
    assert.equal(transferState(f), after);
  });
}

test("conferência pessoal de zero requer consentimento e mantém trânsito até a conciliação", async () => {
  const f = await transferFixture(), { doc, client, recipient } = await dispatch(f, "FAMILY");
  const received = await rpc(recipient.client, "supply_document_command", {
    p_id: doc.id, p_action: "receive", p_key: randomUUID(), p_version: doc.version,
    p_body: { countedReceipt: { lines: [{ lineId: doc.lines[0].id, receivedQuantity: "0" }] } },
  });
  assert.equal(received.workflow_data.acceptedBy, recipient.id);
  const baseline = JSON.parse(transferState(f)).ledger;
  const args = { p_id: doc.id, p_action: "cancel", p_key: randomUUID(), p_version: received.version };
  const reason = "Solicitação após conferência de que o material ainda não chegou.";
  assert.equal((await client.rpc("supply_document_command", { ...args, p_body: { reason, transitReturned: true } })).error?.code, "22023");
  const pending = await rpc(client, "supply_document_command", { ...args, p_body: { reason } });
  assert.equal(pending.status, "cancellation_pending");
  assert.equal(pending.deliveryCancellation.request.status, "pending");
  assert.equal(Number(pending.deliveryCancellation.unresolvedTransit), 3);
  assert.deepEqual(JSON.parse(transferState(f)).ledger, baseline);
});
