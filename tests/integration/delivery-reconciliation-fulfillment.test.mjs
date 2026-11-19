import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { actor, delivery, fixtures, issue, rpc, setup } from "./v4-fixtures.mjs";

const stock = patient => sql(`select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]') from public.stock_movements m where care_recipient_id=${q(patient)}`);
const approve = (client, doc, line, decision, reason) => rpc(client, "review_request_fulfillment", {
  p_document: doc.id, p_line: line.id, p_decision: decision,
  p_reason: reason, p_key: randomUUID(), p_version: doc.version,
});
const receive = (client, doc, lines) => rpc(client, "supply_document_command", {
  p_id: doc.id, p_action: "receive", p_body: { countedReceipt: { lines } },
  p_key: randomUUID(), p_version: doc.version,
});

test("team can ask after an exact receipt and the family can reverse its assessment without changing stock", async () => {
  const f = await setup(), [product] = f.products;
  const req = await issue(f.patient,[product]);
  const family = await actor("family",f.patient), professional = await actor("professional",f.patient);
  const progress = () => rpc(family,"requisition_fulfillment",{p_requisition:req.id});
  const sent = await delivery(f.patient,req,[product],{quantity:"5"});
  const [line] = sent.lines;
  const firstReason = "As cinco unidades não cobrem o período deste cenário.";
  const received = await receive(professional,sent,[{lineId:line.id,receivedQuantity:"5",reviewReason:firstReason}]);
  assert.equal(received.status,"confirmed");
  assert.equal(Number(received.lines[0].accepted_quantity),5);
  assert.equal(received.lines[0].metadata.fulfillmentReviewRequest.reason,firstReason);
  assert.equal(received.lines[0].metadata.fulfillmentReviewRequest.actorId,fixtures.professional.id);
  assert.equal((await progress()).reviewRequired,1);
  assert.equal((await progress()).fulfilled,0);
  const notices = sql(`select count(*) from public.requisition_notifications
    where document_id=${q(sent.id)} and recipient_user_id=${q(fixtures.family.id)}
    and channel='internal' and event_key='ent.fulfillment_review_requested'`);
  assert.equal(notices,"1");
  const applied = stock(f.patient);
  await approve(family,received,line,"complete","A família ajustou a frequência e confirmou a suficiência.");
  assert.equal((await progress()).fulfilled,1);
  let current = await rpc(family,"operational_document",{p_id:sent.id});
  await approve(family,current,line,"partial","A necessidade aumentou depois da primeira avaliação.");
  assert.equal((await progress()).partial,1);
  current = await rpc(family,"operational_document",{p_id:sent.id});
  assert.equal(current.lines[0].family_fulfillment,"complete");
  assert.deepEqual(current.fulfillmentReviews.map(review => review.decision),["complete","partial"]);
  const intent = {
    domain:"supply",action:"request_fulfillment_review",expectedVersion:current.version,
    body:{lineId:line.id,reason:"A equipe verificou novamente a necessidade."},
  };
  const refused = await family.rpc("execute_document_decision",{p_document:sent.id,p_key:randomUUID(),p_intention:intent});
  assert.equal(refused.error?.code,"42501");
  await rpc(professional,"execute_document_decision",{p_document:sent.id,p_key:randomUUID(),p_intention:intent});
  assert.equal(sql(`select count(*) from private.document_progress_facts
    where document_id=${q(sent.id)} and action='ent.request_fulfillment_review' and actor_id=${q(fixtures.professional.id)}`),"1");
  assert.equal((await progress()).reviewRequired,1);
  const history = await rpc(family,"document_material_context",{
    p_document:sent.id,p_line:line.id,p_section:"history",p_include_decisions:true,
  });
  assert.equal(history.rows.find(item => item.type==="ent.receive").reason,firstReason);
  assert.deepEqual(history.rows.filter(item => item.type==="ent.fulfillment_reviewed").map(item =>
    [item.detail,Number(item.quantity),item.author]),[
    ["partial",5,current.fulfillmentReviews[1].actorName],
    ["complete",5,current.fulfillmentReviews[0].actorName],
  ]);
  assert.equal(history.rows.find(item => item.type==="ent.request_fulfillment_review").reason,intent.body.reason);
  assert.equal(stock(f.patient),applied);
});

test("family resolves one item's transit and records its assessment once while the second need stays pending", async () => {
  const f = await setup(), req = await issue(f.patient,f.products);
  const family = await actor("family",f.patient), professional = await actor("professional",f.patient);
  const sent = await delivery(f.patient,req,f.products,{quantity:"5",requestFulfillment:"partial"});
  const [first,second] = sent.lines;
  const received = await receive(professional,sent,sent.lines.map(line => ({lineId:line.id,receivedQuantity:"3"})));
  const progress = () => rpc(family,"requisition_fulfillment",{p_requisition:req.id});
  assert.equal((await progress()).reviewRequired,2);
  const args = {p_document:sent.id,p_key:randomUUID(),p_intention:{
    domain:"supply",action:"resolve",expectedVersion:received.version,
    body:{lineId:first.id,quantity:"2",resolution:"not_sent",reason:"Duas unidades permaneceram na origem.",familyAssessment:"complete"},
  }};
  const initial = stock(f.patient);
  const forbidden = await professional.rpc("execute_document_decision",args);
  assert.equal(forbidden.error?.code,"42501");
  const partial = await family.rpc("execute_document_decision",{
    ...args,p_key:randomUUID(),p_intention:{...args.p_intention,body:{...args.p_intention.body,quantity:"1"}},
  });
  assert.equal(partial.error?.code,"PT409");
  assert.equal(stock(f.patient),initial);
  const firstResult = await rpc(family,"execute_document_decision",args);
  assert.equal(firstResult.state,"applied");
  assert.equal(firstResult.result.status,"disputed");
  assert.equal(firstResult.result.fulfillmentReviews.length,1);
  assert.equal(firstResult.result.fulfillmentReviews[0].lineId,first.id);
  assert.equal(firstResult.result.fulfillmentReviews[0].actorId,fixtures.family.id);
  assert.equal(firstResult.result.lines.find(line => line.id===first.id).family_fulfillment,"partial");
  assert.equal((await progress()).reviewRequired,1);
  assert.equal((await progress()).fulfilled,1);
  assert.equal(JSON.parse(stock(f.patient)).length,JSON.parse(initial).length+1);
  const replay = await rpc(family,"execute_document_decision",args);
  assert.deepEqual(replay,firstResult);
  assert.equal(JSON.parse(stock(f.patient)).length,JSON.parse(initial).length+1);
  const later = await rpc(professional,"supply_document_command",{
    p_id:sent.id,p_action:"resolve",p_key:randomUUID(),p_version:firstResult.result.version,
    p_body:{lineId:second.id,quantity:"2",resolution:"received",reason:"Recebimento complementar na conferência."},
  });
  assert.equal(later.status,"confirmed");
  assert.equal((await progress()).reviewRequired,1);
  const afterTransit = stock(f.patient);
  await approve(family,later,second,"partial","A entrega integral não cobre a necessidade atual.");
  assert.equal((await progress()).reviewRequired,0);
  assert.equal((await progress()).partial,1);
  assert.equal(stock(f.patient),afterTransit);
});

test("family decision knowledge is per reader, shared by linked fichas and independent from science and stock", async () => {
  const f = await setup(), [product] = f.products;
  const req = await issue(f.patient, [product]);
  const unrelated = await issue(f.patient, [f.products[1]]);
  const family = await actor("family", f.patient), team = await actor("professional", f.patient);
  const sent = await delivery(f.patient, req, [product], { quantity: "5" });
  const [line] = sent.lines;
  const received = await receive(team, sent, [{ lineId: line.id, receivedQuantity: "5", reviewReason: "A equipe pediu nova avaliação." }]);
  const args = (id, review = null) => ({ p_document: id, p_acknowledge: review });
  const notice = (client, id, review = null) => rpc(client, "document_family_decision_notice", args(id, review));
  assert.equal((await notice(team, req.id)).notice, null);

  const kept = await approve(family, received, line, "complete", "");
  const changed = await approve(family, await rpc(family, "operational_document", { p_id: sent.id }),
    line, "partial", "A família reconheceu a necessidade de uma entrega complementar.");
  assert.equal((await notice(family, sent.id)).notice, null);
  assert.equal((await notice(family, req.id)).notice, null);
  assert.equal((await family.rpc("document_family_decision_notice", args(req.id, kept.reviewId))).error?.code, "42501");
  assert.equal((await team.rpc("document_family_decision_notice", args(unrelated.id, kept.reviewId))).error?.code, "42501");
  assert.deepEqual(await notice(team, req.id).then(({ notice }) => [notice.id,notice.previous,notice.decision]), [kept.reviewId,"complete","complete"]);
  assert.equal((await notice(team, sent.id)).notice.id, kept.reviewId);
  const snapshot = () => ({
    stock: stock(f.patient),
    documents: sql(`select jsonb_build_object(
      'science',(select count(*) from public.requisition_science_events where requisition_id=${q(req.id)}),
      'versions',(select jsonb_agg(version order by id) from public.operational_documents where id in (${q(req.id)},${q(sent.id)})),
      'events',(select count(*) from public.document_events where document_id in (${q(req.id)},${q(sent.id)})))`),
  });
  const beforeAwareness = snapshot();
  const [one, repeat] = await Promise.all([
    notice(team, req.id, kept.reviewId), notice(team, sent.id, kept.reviewId),
  ]);
  assert.deepEqual(one.acknowledgement, repeat.acknowledgement);
  assert.equal(one.acknowledgement.reviewId, kept.reviewId);
  assert.deepEqual([one.notice.id,one.notice.previous,one.notice.decision], [changed.reviewId,"complete","partial"]);
  assert.equal((await notice(f.admin, req.id)).notice.id, kept.reviewId);

  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled)
       values(${q(f.patient)},${q(fixtures.professional.id)},'ent.read',false)`);
  assert.equal((await notice(team, req.id)).notice, null);
  assert.equal((await team.rpc("document_family_decision_notice", args(req.id, changed.reviewId))).error?.code, "42501");
  assert.equal((await team.rpc("document_family_decision_notice", args(sent.id))).error?.code, "42501");
  sql(`update public.capability_overrides set enabled=true
       where care_recipient_id=${q(f.patient)} and subject_user=${q(fixtures.professional.id)} and capability='ent.read'`);
  assert.equal((await notice(team, sent.id, changed.reviewId)).notice, null);
  const outside = await setup();
  const otherContext = await actor("professional", outside.patient);
  assert.equal((await otherContext.rpc("document_family_decision_notice", args(req.id))).error?.code, "42501");
  assert.equal(sql(`select count(*) from private.requisition_fulfillment_awareness where review_id in
    (${q(kept.reviewId)},${q(changed.reviewId)})`), "2");
  assert.deepEqual(snapshot(), beforeAwareness);
});
