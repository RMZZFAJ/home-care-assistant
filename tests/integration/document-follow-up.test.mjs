import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { actor, delivery, issue, rpc, setup } from "./v4-fixtures.mjs";
import { countedReqDecisionFixture, reqDecisionFacts } from "./requisition-decision-draft-fixtures.mjs";
import { transferFixture } from "./transfer-fixtures.mjs";

const ledger = (f) => sql(`select coalesce(jsonb_agg(to_jsonb(m) order by m.id),'[]') from public.stock_movements m where care_recipient_id=${q(f.patient)}`);
const read = (client, id) => rpc(client, "document_follow_up_reference", { p_id: id });
const command = (reference, action, reason = "Revisão fictícia desta ficha.") => ({
  p_document: reference.documentId, p_key: randomUUID(),
  p_intention: { domain: "lifecycle", action, expectedVersion: reference.version, referenceHash: reference.referenceHash, body: { reason } },
});
const act = (client, args) => rpc(client, "execute_document_decision", args);
const supply = (client, doc, action, body) => rpc(client, "supply_document_command", {
  p_id: doc.id, p_version: doc.version, p_action: action, p_key: randomUUID(), p_body: body,
});

test("REQ reabre cancelamento com reversão de contagem sem repetir ou reverter qualquer lançamento", async () => {
  const f = await countedReqDecisionFixture();
  const view = await rpc(f.admin, "requisition_decision_context", { p_id: f.req.id });
  await act(f.admin, { p_document: f.req.id, p_key: randomUUID(), p_intention: {
    domain: "requisition", action: "cancel", expectedVersion: view.documentVersion, referenceHash: view.referenceHash,
    body: { reason: "Cancelamento fictício com reversão da contagem.", stockChoice: "reverse", stockReference: view.stockCancellation.reference },
  } });
  const before = JSON.parse(reqDecisionFacts(f));
  const cancelled = await read(f.admin, f.req.id);
  assert.equal(cancelled.state, "cancelled");
  assert.equal(cancelled.canReopen, true);
  const family = await actor("family", f.patient);
  const notAdmin = await read(family, f.req.id);
  assert.equal(notAdmin.canReopen, false);
  assert.equal((await family.rpc("execute_document_decision", command(notAdmin, "reopen"))).error?.code, "42501");
  const args = command(cancelled, "reopen");
  const receipt = await act(f.admin, args);
  assert.equal(receipt.result.state, "reopened");
  assert.equal(receipt.result.physicalStatus, "submitted");
  assert.equal(receipt.result.lastAct.previousDecision.id, cancelled.decision.id);
  assert.deepEqual(await act(f.admin, args), receipt);
  const after = JSON.parse(reqDecisionFacts(f));
  assert.deepEqual(after.stock, before.stock);
  for (const event of before.events) assert.deepEqual(after.events.find(row => row.id === event.id), event);
});

test("REQ concluída pode reabrir, continua aberta após refresh e exige nova conclusão explícita", async () => {
  const f = await setup(), req = await issue(f.patient, [f.products[0]]);
  const team = await actor("professional", f.patient);
  const ent = await delivery(f.patient, req, [f.products[0]]);
  await supply(team, ent, "receive", { divergences: [] });
  const finished = await read(f.admin, req.id);
  assert.equal(finished.state, "completed");
  assert.equal(finished.decision.action, "req.completed");
  const before = ledger(f);
  const r = await act(f.admin, command(finished, "reopen"));
  assert.equal(r.result.state, "reopened");
  sql(`select private.refresh_requisition_lifecycle(${q(req.id)})`);
  const reopened = await read(f.admin, req.id);
  assert.equal(reopened.state, "reopened");
  assert.deepEqual(reopened.blockers, []);
  const again = await act(f.admin, command(reopened, "complete", ""));
  assert.equal(again.result.state, "completed");
  assert.equal(again.result.decision.action, "req.follow_up_completed");
  assert.equal(ledger(f), before);
});

test("requisição arquivada antes do PDF consolidado preserva o estado e a recuperação legada", async () => {
  const f = await setup(), req = await issue(f.patient, [f.products[0]]);
  const team = await actor("professional", f.patient);
  const ent = await delivery(f.patient, req, [f.products[0]]);
  await supply(team, ent, "receive", { divergences: [] });
  const complete = await read(f.admin, req.id);
  const previous = ledger(f);
  const reason = "Arquivo fictício anterior à revisão.";
  const author = (await f.admin.auth.getUser()).data.user.id;
  const earlierReview = await rpc(f.admin, "requisition_decision_context", { p_id: req.id });
  const intent = {
    domain: "requisition", action: "archive", expectedVersion: earlierReview.documentVersion,
    referenceHash: earlierReview.referenceHash, body: { reason },
  };
  const oldKey = randomUUID();
  // Represent a synthetic native archive and decision receipt from before L2.
  sql(`update public.requisition_lifecycle set archived_at=now(),archived_by=${q(author)},
    archive_reason=${q(reason)} where requisition_id=${q(req.id)}`);
  const archived = await read(f.admin, req.id);
  assert.equal(archived.canReopen, false);
  assert.equal(archived.state, "archived");
  const archive = await rpc(f.admin, "document_archive_reference", { p_document: req.id });
  assert.equal(archive.archive, null);
  assert.equal(archive.canArchive, false);
  const oldResult = await rpc(f.admin, "requisition_progress", { p_id: req.id });
  assert.ok(oldResult.archivedAt);
  sql(`insert into private.document_decision_results(actor_id,key,document_id,state,intention,result)
    values(${q(author)},${q(oldKey)},${q(req.id)},'applied',${q(JSON.stringify(intent))}::jsonb,${q(JSON.stringify(oldResult))}::jsonb)`);
  const recovered = await act(f.admin, { p_document: req.id, p_key: oldKey, p_intention: intent });
  assert.equal(recovered.state, "applied");
  assert.deepEqual(recovered.result, oldResult);
  const current = await rpc(f.admin, "requisition_decision_context", { p_id: req.id });
  assert.equal((await f.admin.rpc("execute_document_decision", { p_document: req.id, p_key: randomUUID(),
    p_intention: { ...intent, expectedVersion: current.documentVersion, referenceHash: current.referenceHash },
  })).error?.code, "PT409");
  assert.equal((await rpc(f.admin, "archive_requisition", { p_id: req.id, p_reason: reason })).archivedAt, oldResult.archivedAt);
  assert.equal((await f.admin.rpc("archive_requisition", { p_id: req.id, p_reason: "Outra intenção fictícia" })).error?.code, "PT409");
  for (const reference of [complete, archived])
    assert.equal((await f.admin.rpc("execute_document_decision", command(reference, "reopen"))).error?.code, "PT409");
  assert.equal(ledger(f), previous);
});

test("ENT mantém a decisão anterior, consumo confirmado e devolução física ao reabrir", async () => {
  const f = await setup(), req = await issue(f.patient, [f.products[0]]);
  const team = await actor("professional", f.patient);
  let ent = await delivery(f.patient, req, [f.products[0]], { quantity: "2" });
  const beforeReceipt = await read(f.admin, ent.id);
  assert.ok(beforeReceipt.blockers.includes("ent_receipt"));
  assert.equal((await f.admin.rpc("execute_document_decision", command(beforeReceipt, "complete"))).error?.code, "PT409");
  ent = await supply(team, ent, "receive", { divergences: [] });
  const consumption = await rpc(team, "report_extraordinary_consumption", {
    p_patient: f.patient, p_kind: "consumption", p_location: "CARE_TEAM", p_text: "Consumo fictício após o recebimento",
    p_lines: [{ productId: f.products[0], quantity: "1" }], p_key: randomUUID(),
  });
  await rpc(f.admin, "decide_consumption_report", { p_id: consumption, p_accept: true, p_reason: null, p_key: randomUUID(), p_version: 1 });
  ent = await supply(f.admin, ent, "cancel", { reason: "Pedido fictício para devolver uma unidade." });
  const request = ent.deliveryCancellation;
  ent = await supply(team, ent, "consent_cancel", {
    reason: "Uma unidade voltou fisicamente à origem.", requestId: request.request.id, referenceHash: request.referenceHash,
    lines: [{ lineId: ent.lines[0].id, returnQuantity: "1" }],
  });
  const before = ledger(f);
  const cancelled = await read(f.admin, ent.id);
  const attempts = await Promise.all([f.admin.rpc("execute_document_decision", command(cancelled, "reopen")),
    f.admin.rpc("execute_document_decision", command(cancelled, "reopen"))]);
  assert.equal(attempts.filter(item => item.data?.state === "applied").length, 1);
  assert.equal(attempts.filter(item => item.error?.code === "PT409").length, 1);
  const reopened = await rpc(f.admin, "operational_document", { p_id: ent.id });
  assert.equal(reopened.status, "cancelled");
  assert.equal(reopened.workflow_data.documentFollowUp.state, "reopened");
  assert.deepEqual(reopened.lines, ent.lines);
  assert.deepEqual(reopened.deliveryCancellation, ent.deliveryCancellation);
  assert.equal(ledger(f), before);
  const direct = await team.rpc("supply_document_command", {
    p_id: reopened.id, p_version: reopened.version, p_action: "receive", p_key: randomUUID(), p_body: { divergences: [] },
  });
  assert.ok(direct.error);
  assert.equal(ledger(f), before);
});

test("DEV e COM reabrem acompanhamento sem voltar à expedição ou à aquisição", async () => {
  const f = await transferFixture();
  const preview = await rpc(f.initiator.client, "transfer_preparation", { p_patient: f.patient, p_source: "CARE_TEAM" });
  const dev = await rpc(f.initiator.client, "create_transfer_declaration", { p_patient: f.patient, p_key: randomUUID(), p_body: {
    mode: "direct", source: "CARE_TEAM", recipientId: f.recipient.id, referenceHash: preview.referenceHash,
    reason: "Devolução fictícia antes de reabrir.", lines: [{ productId: f.products[0], quantity: "2" }],
  } });
  await supply(f.initiator.client, dev, "cancel", { reason: "Retorno físico à equipe confirmado.", transitReturned: true });
  const family = await actor("family", f.patient);
  const com = await rpc(family, "create_supply_document", { p_patient: f.patient, p_type: "COM", p_key: randomUUID(), p_draft: false,
    p_payload: { origin: "purchase", lines: [{ productId: f.products[0], quantity: "3" }] } });
  const waiting = await read(f.admin, com.id);
  assert.ok(waiting.blockers.includes("com_approval"));
  await supply(f.admin, com, "cancel", { reason: "Aquisição fictícia cancelada antes de comprar." });
  const before = ledger(f);
  for (const doc of [dev, com]) {
    const cancelled = await read(f.admin, doc.id);
    const result = (await act(f.admin, command(cancelled, "reopen"))).result;
    assert.equal(result.physicalStatus, "cancelled");
    assert.equal(result.lastAct.previousDecision.id, cancelled.decision.id);
    assert.equal(result.state, "reopened");
    assert.equal(ledger(f), before);
  }
});
