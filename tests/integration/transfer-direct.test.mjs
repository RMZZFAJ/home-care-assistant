import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { declareTransfer, rpc, transferCommand, transferFixture, transferState } from "./transfer-fixtures.mjs";
import { declarationBody, declarationCommit, declarationDraftFixture, declarationPacket } from "./transfer-declaration-draft-fixtures.mjs";

test("DEV expede diretamente, preserva a ENT original e reconhece somente o recebimento pessoal", async () => {
  const f = await transferFixture();
  const before = JSON.parse(transferState(f));
  const preparation = await rpc(f.initiator.client, "transfer_preparation", {
    p_patient: f.patient,
    p_source: "CARE_TEAM",
  });
  const args = {
    p_patient: f.patient,
    p_key: randomUUID(),
    p_body: {
      mode: "direct",
      source: "CARE_TEAM",
      recipientId: f.recipient.id,
      originDocumentId: f.origin.id,
      referenceHash: preparation.referenceHash,
      reason: "Devolução fictícia de materiais disponíveis à família",
      lines: [{ productId: f.products[0], quantity: "5" }],
    },
  };
  const sent = await rpc(f.initiator.client, "create_transfer_declaration", args);
  assert.equal(sent.kind, "DEV");
  assert.match(sent.code, /^DEV-/);
  assert.ok(sent.protocol);
  assert.equal(sent.status, "pending_receipt");
  assert.equal(sent.transfer.state, "dispatched");
  assert.equal(sent.transfer.declaration.mode, "direct");
  assert.equal(sent.transfer.declaration.recipient.id, f.recipient.id);
  assert.equal(sent.transfer.declaration.counterparty, undefined);
  assert.equal(sent.transfer.agreement, null);
  assert.equal(sent.transfer.originDocumentId, f.origin.id);
  assert.ok(sent.events.every(event => event.action !== "ent.transfer.declared"));
  const reassignment = await f.initiator.client.rpc("supply_document_command", {
    p_id: sent.id, p_action: "reassign", p_version: sent.version, p_key: randomUUID(),
    p_body: { recipientId: f.counterparty.id, reason: "A devolução direta preserva o recebedor definido" },
  });
  assert.equal(reassignment.error?.code, "22023");

  const afterDispatch = JSON.parse(transferState(f));
  assert.equal(afterDispatch.ledger.length, before.ledger.length + 1);
  assert.deepEqual(afterDispatch.documents.find(document => document.id === f.origin.id),
    before.documents.find(document => document.id === f.origin.id));

  const receipt = {
    p_id: sent.id,
    p_action: "receive",
    p_body: { divergences: [] },
    p_key: randomUUID(),
    p_version: sent.version,
  };
  for (const client of [f.admin, f.counterparty.client]) {
    assert.equal((await client.rpc("supply_document_command", receipt)).error?.code, "42501");
  }
  const accepted = await rpc(f.recipient.client, "supply_document_command", receipt);
  assert.notEqual(accepted.status, "pending_receipt");
  const afterReceipt = transferState(f);
  assert.deepEqual(await rpc(f.initiator.client, "create_transfer_declaration", args), sent);
  assert.equal(transferState(f), afterReceipt);
});

test("declaração legada pendente pode ser expedida pelo autor sem concordância", async () => {
  const f = await transferFixture();
  const { response } = await declareTransfer(f);
  assert.ifError(response.error);
  const declaration = response.data;
  const denied = await transferCommand(f.counterparty.client, declaration.id, "dispatch", declaration.version);
  assert.equal(denied.error?.code, "42501");
  const shipped = await transferCommand(f.initiator.client, declaration.id, "dispatch", declaration.version);
  assert.ifError(shipped.error);
  assert.equal(shipped.data.status, "pending_receipt");
  assert.equal(shipped.data.transfer.agreement, null);
  assert.equal(shipped.data.transfer.declaration.counterparty.id, f.counterparty.id);
});

test("expedição consome o rascunho privado e repete o resultado mesmo depois de mudar seu próprio saldo", async () => {
  const f = await declarationDraftFixture();
  const draft = declarationPacket(f);
  draft.p_body.content.fields.counterpartyId = "";
  const saved = await rpc(f.client, "supply_draft_command", draft);
  const { counterpartyId, ...body } = declarationBody(f);
  assert.ok(counterpartyId);
  const args = declarationCommit(f, saved, { ...body, mode: "direct" });
  const before = JSON.parse(transferState(f)).ledger.length;
  const first = await rpc(f.client, "commit_supply_draft", args);
  assert.equal(first.state, "consumed");
  assert.equal(first.consumedDocumentId, first.result.id);
  assert.equal(first.result.status, "pending_receipt");
  assert.equal(JSON.parse(transferState(f)).ledger.length, before + 1);
  const repeated = await rpc(f.client, "commit_supply_draft", args);
  assert.deepEqual(repeated, { ...first, replayed: true });
  assert.equal(JSON.parse(transferState(f)).ledger.length, before + 1);
});
