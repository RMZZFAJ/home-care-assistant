import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { autonomousReturnFixture, declaredAutonomousReturn, returnBalances, transferCommand, transferState, rpc } from "./autonomous-return-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
const reserve = (client, id, version = null, key = randomUUID(), name = "reserve_pdf_issuance") => client.rpc(name, { p_document: id, p_version: version, p_key: key });

test("an autonomous return needs no original ENT and preserves distinct agreement, dispatch and personal family receipt", async () => {
  const f = await autonomousReturnFixture();
  assert.equal(sql("select count(*) from public.operational_documents where care_recipient_id=" + q(f.patient) + " and type='ENT'"), "0");
  assert.deepEqual(returnBalances(f), { family: 30, team: 10, transit: 0 });
  const before = transferState(f), declaration = await declaredAutonomousReturn(f);
  let d = declaration.document;
  assert.equal(d.transfer.originDocumentId, null); assert.equal(d.protocol, null);
  assert.deepEqual(returnBalances(f), { family: 30, team: 10, transit: 0 });
  const replay = await f.initiator.client.rpc("create_transfer_declaration", declaration.args); assert.ifError(replay.error);
  assert.equal(replay.data.id, d.id);
  assert.equal((await transferCommand(f.admin, d.id, "agree", d.version, { reason: "Administrador não substitui a contraparte." })).error?.code, "42501");
  const agreement = await transferCommand(f.counterparty.client, d.id, "agree", d.version, { reason: "Concordância familiar própria sem receber material." }); assert.ifError(agreement.error); d = agreement.data;
  assert.deepEqual(returnBalances(f), { family: 30, team: 10, transit: 0 });
  assert.equal((await transferCommand(f.counterparty.client, d.id, "dispatch", d.version)).error?.code, "42501");
  const dispatch = await transferCommand(f.initiator.client, d.id, "dispatch", d.version); assert.ifError(dispatch.error); d = dispatch.data;
  assert.equal(d.code, "ENT-0001"); assert.ok(d.protocol); assert.equal(d.status, "pending_receipt");
  assert.deepEqual(returnBalances(f), { family: 30, team: 5, transit: 5 });
  const request = { p_id: d.id, p_action: "receive", p_version: d.version, p_key: randomUUID(),
    p_body: { divergences: [{ lineId: d.lines[0].id, acceptedQuantity: "3", problem: "shortage", notes: "Recebi três das cinco unidades devolvidas." }] } };
  for (const client of [f.admin, f.counterparty.client]) assert.equal((await client.rpc("supply_document_command", request)).error?.code, "42501");
  d = await rpc(f.recipient.client, "supply_document_command", request);
  assert.equal(d.workflow_data.acceptedBy, f.recipient.id); assert.equal(d.status, "disputed");
  const received = transferState(f);
  assert.equal((await rpc(f.recipient.client, "supply_document_command", request)).version, d.version);
  assert.equal(transferState(f), received);
  assert.deepEqual(returnBalances(f), { family: 33, team: 5, transit: 2 });
  assert.notEqual(transferState(f), before); assert.equal(d.transfer.originDocumentId, null);
  assert.equal(sql("select count(*) from public.requisition_items where care_recipient_id=" + q(f.patient)), "0");
});

test("ENT V14 preserves autonomous-return source and exact old intentions while read revocation denies private issuance", async () => {
  const f = await autonomousReturnFixture(), declaration = await declaredAutonomousReturn(f);
  const agreement = await transferCommand(f.counterparty.client, declaration.document.id, "agree", declaration.document.version, { reason: "Concordo com o percurso próprio da devolução." }); assert.ifError(agreement.error);
  const dispatch = await transferCommand(f.initiator.client, agreement.data.id, "dispatch", agreement.data.version); assert.ifError(dispatch.error);
  const d = dispatch.data, before = transferState(f), current = await reserve(f.initiator.client, d.id); assert.ifError(current.error);
  assert.equal(current.data.rendererRevision, 16); assert.equal(current.data.snapshot.payload.source, "CARE_TEAM");
  assert.equal(current.data.snapshot.payload.destination, "FAMILY"); assert.equal(current.data.snapshot.transfer.originDocumentId, null);
  const { sourceFacts, documentFacts, ...body } = current.data.snapshot;
  assert.equal(sourceFacts.schemaVersion, 1); assert.equal(documentFacts.schemaVersion, 1);
  const canonical = JSON.parse(sql("select body from public.document_events where document_id=" + q(d.id) + " and version=" + d.version));
  assert.deepEqual(body, canonical); assert.equal(transferState(f), before);
  const key = randomUUID(), older = await reserve(f.initiator.client, d.id, null, key, "reserve_pdf_issuance"); assert.ifError(older.error);
  const replay = await reserve(f.initiator.client, d.id, null, key); assert.ifError(replay.error);
  assert.equal(replay.data.rendererRevision, 16); assert.equal(replay.data.id, older.data.id); assert.deepEqual(replay.data.snapshot, older.data.snapshot);
  sql("insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(" + q(f.patient) + "," + q(f.initiator.id) + ",'ent.read',false)");
  assert.equal((await f.initiator.client.rpc("pdf_issuance", { p_id: current.data.id })).error?.code, "42501");
  assert.equal((await reserve(f.initiator.client, d.id)).error?.code, "42501");
  assert.equal(sql("select has_function_privilege('anon','public.reserve_pdf_issuance(uuid,uuid,integer)','EXECUTE') or has_function_privilege('service_role','public.reserve_pdf_issuance(uuid,uuid,integer)','EXECUTE')"), "f");
});
