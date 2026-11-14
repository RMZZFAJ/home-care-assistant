import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { setup, issue, actor, rpc, fixtures, delivery, env } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";

const note = (text, publication, references = []) => ({ category: "record", stage: null, text, references, publication });
const publish = (id, body, key = randomUUID()) => ({ p_document: id, p_key: key, p_body: body });

test("L1 private notes have no unauthorized count, reference, location, audit or PDF expansion", async () => {
  const f = await setup(), req = await issue(f.patient, f.products);
  const family = await actor("family", f.patient), professional = await actor("professional", f.patient), reader = await actor("reader", f.patient);
  const text = "Nota privada fictícia " + randomUUID();
  const saved = await rpc(family, "document_progress_publish", publish(req.id, note(text, { relevance: "attention", mentions: [fixtures.professional.id], visibility: "family", mentionAll: false })));
  const view = client => rpc(client, "document_progress", { p_document: req.id, p_filter: "manual" });
  assert.equal((await view(family)).data[0].visibility, "family");
  assert.equal((await view(professional)).data[0].id, saved.note.id);
  assert.equal((await view(reader)).total, 0);
  assert.equal((await rpc(reader, "document_progress_references", { p_document: req.id, p_search: text })).total, 0);
  assert.equal((await reader.rpc("document_progress_location", { p_document: req.id, p_note: saved.note.id })).error?.code, "42501");
  assert.equal(sql("select count(*) from public.audit_events where entity_id=" + q(saved.note.id)), "0");
  assert.equal((await family.rpc("document_progress_publish", publish(req.id, note("@todos não pode permanecer privado", { relevance: "normal", mentions: [], visibility: "family", mentionAll: true })))).error?.code, "22023");
  assert.equal((await family.rpc("document_progress_publish", publish(req.id, note("Referência pública incompatível", { relevance: "normal", mentions: [], visibility: "public", mentionAll: false }, [saved.note.id])))).error?.code, "22023");
  assert.equal((await professional.rpc("document_progress_publish", publish(req.id, note("Equipe não cria privado familiar", { relevance: "normal", mentions: [], visibility: "family", mentionAll: false })))).error?.code, "42501");
  const publicNote = await rpc(family, "document_progress_publish", publish(req.id, note("@todos podem consultar esta nota", { relevance: "milestone", mentions: [], visibility: "public", mentionAll: true })));
  assert.equal((await view(reader)).total, 1);
  assert.equal((await view(reader)).data[0].id, publicNote.note.id);
  const reference = await rpc(family, "document_progress_references", { p_document: req.id, p_search: saved.note.id });
  assert.equal(reference.data[0].kind, "progress");
  assert.equal(reference.data[0].id, saved.note.id);
  const options = { mode: "expanded", sections: ["progress"], period: { from: null, through: null, timeZone: "America/Sao_Paulo" }, purpose: null };
  // Exercise the real reservation projection, without claiming PDF bytes/signature evidence.
  const familyPdf = await rpc(family, "reserve_pdf_expanded_issuance", { p_document: req.id, p_key: randomUUID(), p_options: options });
  assert.ok(familyPdf.snapshot.documentExpansion.progress.some(row => row.id === saved.note.id));
  const readerPdf = await rpc(reader, "reserve_pdf_expanded_issuance", { p_document: req.id, p_key: randomUUID(), p_options: options });
  assert.ok(!readerPdf.snapshot.documentExpansion.progress.some(row => row.id === saved.note.id));
});

test("L1 family sufficiency, quantitative receipt, reevaluation, resend and DEV identity remain independent", async () => {
  const f = await setup(), req = await issue(f.patient, f.products);
  const family = await actor("family", f.patient), receiver = await actor("professional", f.patient);
  let partial = await delivery(f.patient, req, [f.products[0]], { quantity: "4", requestFulfillment: "partial" });
  assert.equal(partial.lines[0].family_fulfillment, "partial");
  assert.equal(partial.lines[0].fulfillment_decided_by, fixtures.family.id);
  assert.equal((await rpc(family, "requisition_fulfillment", { p_requisition: req.id })).fulfilled, 0);
  const communications = await rpc(family, "document_communications", { p_document: partial.id });
  const original = communications.data.find(row => row.canResend && row.channel === "internal");
  assert.ok(original, "A shipped ENT must expose its meaningful receipt reminder");
  const reminder = { p_document: partial.id, p_original: original.sourceId, p_channel: "internal", p_key: randomUUID() };
  const [first, retry] = await Promise.all([rpc(family, "document_communication_resend", reminder), rpc(family, "document_communication_resend", reminder)]);
  assert.equal(first.notificationId, retry.notificationId);
  assert.equal(sql("select count(*) from private.document_communication_commands where idempotency_key=" + q(reminder.p_key)), "1");
  assert.equal((await receiver.rpc("document_communication_resend", { ...reminder, p_key: randomUUID() })).error?.code, "42501");
  await rpc(receiver, "supply_document_command", { p_id: partial.id, p_action: "receive", p_body: { divergences: [] }, p_key: randomUUID(), p_version: partial.version });
  const afterPartial = await rpc(family, "requisition_fulfillment", { p_requisition: req.id });
  assert.equal(afterPartial.lines.find(line => line.productId === f.products[0]).serviceStatus, "partial");
  assert.equal(afterPartial.fulfilled, 0);
  let complete = await delivery(f.patient, req, [f.products[1]], { quantity: "4", requestFulfillment: "complete" });
  complete = await rpc(receiver, "supply_document_command", { p_id: complete.id, p_action: "receive", p_body: { divergences: [{ lineId: complete.lines[0].id, acceptedQuantity: "2", notes: "Diferença física fictícia" }] }, p_key: randomUUID(), p_version: complete.version });
  assert.equal((await rpc(family, "requisition_fulfillment", { p_requisition: req.id })).lines.find(line => line.productId === f.products[1]).serviceStatus, "review_required");
  const beforeStock = sql("select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]') from public.stock_movements m where care_recipient_id=" + q(f.patient));
  const review = { p_document: complete.id, p_line: complete.lines[0].id, p_decision: "complete", p_reason: "A família considera o recebido suficiente", p_key: randomUUID(), p_version: complete.version };
  assert.equal((await receiver.rpc("review_request_fulfillment", review)).error?.code, "42501");
  const [a, b] = await Promise.all([rpc(family, "review_request_fulfillment", review), rpc(family, "review_request_fulfillment", review)]);
  assert.equal(a.reviewId, b.reviewId);
  assert.equal((await rpc(family, "requisition_fulfillment", { p_requisition: req.id })).fulfilled, 1);
  assert.equal(sql("select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]') from public.stock_movements m where care_recipient_id=" + q(f.patient)), beforeStock);
  assert.equal((await rpc(receiver, "operational_document", { p_id: complete.id })).fulfillmentReviews[0].actorId, fixtures.family.id);
  const admin = await actor("adminA", f.patient);
  const returned = await rpc(admin, "create_supply_document", { p_patient: f.patient, p_type: "ENT", p_key: randomUUID(), p_payload: { source: "CARE_TEAM", destination: "FAMILY", recipientId: fixtures.family.id, recipientReason: "Devolução autônoma fictícia", lines: [{ productId: f.products[0], quantity: "1" }] } });
  assert.equal(returned.kind, "DEV");
  assert.equal(returned.code, "DEV-0001");
  assert.ok(returned.protocol.startsWith("DEV-"));
  assert.equal(returned.payload.originDocumentId, undefined);
  const list = await rpc(admin, "operational_document_list", { p_patient: f.patient, p_type: "DEV" });
  assert.equal(list.data[0].kind, "DEV");
});

test("L1 smaller receipt cannot complete even a single-item REQ before the new family decision", async()=>{
 const f=await setup(),req=await issue(f.patient,[f.products[0]]),family=await actor("family",f.patient),receiver=await actor("professional",f.patient);
 let ent=await delivery(f.patient,req,[f.products[0]],{quantity:"4",requestFulfillment:"complete"});
 ent=await rpc(receiver,"supply_document_command",{p_id:ent.id,p_action:"receive",p_body:{divergences:[{lineId:ent.lines[0].id,acceptedQuantity:"2",notes:"Divergência fictícia"}]},p_key:randomUUID(),p_version:ent.version});
 const progress=()=>rpc(family,"requisition_progress",{p_id:req.id});
 assert.equal((await progress()).completedAt,null);
 // Settle the separate physical discrepancy first. Even with no physical
 // issue remaining, family sufficiency must still prevent completion.
 await actor("adminA",f.patient);
 ent=await rpc(f.admin,"supply_document_command",{p_id:ent.id,p_action:"resolve",p_body:{lineId:ent.lines[0].id,quantity:"2",resolution:"missing",reason:"Falta física conciliada na fixture"},p_key:randomUUID(),p_version:ent.version});
 assert.equal((await progress()).completedAt,null);
 assert.equal((await rpc(family,"requisition_fulfillment",{p_requisition:req.id})).lines[0].serviceStatus,"review_required");
 const listed=(await rpc(family,"operational_document_list",{p_patient:f.patient,p_type:"REQ"})).data.find(row=>row.id===req.id);
 assert.equal(listed.fulfillment.partial,1);assert.equal(listed.fulfillment.fulfilled,0);
 const stock=sql("select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]') from public.stock_movements m where care_recipient_id="+q(f.patient));
 await rpc(family,"review_request_fulfillment",{p_document:ent.id,p_line:ent.lines[0].id,p_decision:"complete",p_reason:"O recebido é suficiente para esta solicitação fictícia",p_key:randomUUID(),p_version:ent.version});
 assert.ok((await progress()).completedAt);
 assert.equal(sql("select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]') from public.stock_movements m where care_recipient_id="+q(f.patient)),stock);
 const frozen=await rpc(family,"reserve_pdf_issuance",{p_document:ent.id,p_key:randomUUID()});
 assert.equal(frozen.snapshot.lines[0].family_fulfillment,"complete");
 assert.equal(frozen.snapshot.fulfillmentReviews[0].decision,"complete");
 assert.equal(frozen.snapshot.fulfillmentReviews[0].actorId,fixtures.family.id);
});

test("L1 system PDF is scoped to a live notification lease without impersonating its recipient", async()=>{
 const f=await setup(),req=await issue(f.patient,f.products),family=await actor("family",f.patient);
 const service=createClient(env.url,env.serviceKey,{auth:{persistSession:false,autoRefreshToken:false}}),worker=randomUUID();
 const notice=sql("select id from public.requisition_notifications where document_id="+q(req.id)+" and recipient_user_id="+q(fixtures.family.id)+" and channel='internal' order by created_at limit 1");assert.ok(notice);
 sql(`update public.requisition_notifications set state='processing',include_pdf=true,leased_by=${q(worker)},lease_expires_at=now()+interval '5 minutes' where id=${q(notice)};`);
 const args={p_notification:notice,p_worker:worker,p_action:"reserve",p_args:{}};
 assert.equal((await family.rpc("notification_pdf",args)).error?.code,"42501");
 assert.equal((await service.rpc("notification_pdf",{...args,p_worker:randomUUID()})).error?.code,"42501");
 const [one,two]=await Promise.all([rpc(service,"notification_pdf",args),rpc(service,"notification_pdf",args)]);
 assert.equal(one.id,two.id);assert.equal(one.requestedBy,null);assert.match(one.requestedName,/Sistema/);assert.equal(one.rendererRevision,16);
 assert.equal(one.snapshot.sourceFacts.issuerName,sql("select actor_name from public.document_events where document_id="+q(req.id)+" order by version limit 1"));
 const claim=await rpc(service,"claim_pdf_issuance",{p_id:one.id});
 const staged=await rpc(service,"notification_pdf",{...args,p_action:"stage",p_args:{p_id:one.id,p_token:claim.workerToken,p_step:"composing",p_error:null}});assert.equal(staged.state,"processing");
 assert.equal((await service.rpc("notification_pdf",{...args,p_action:"stage",p_args:{p_id:one.id,p_token:"wrong",p_step:"signing"}})).error?.code,"42501");
 sql(`update public.care_recipient_memberships set status='revoked' where care_recipient_id=${q(f.patient)} and user_id=${q(fixtures.family.id)};`);
 assert.equal((await service.rpc("notification_pdf",{...args,p_action:"read",p_args:{p_id:one.id}})).error?.code,"42501");
 assert.equal(sql("select count(*) from private.pdf_notification_authority"),"0");
});
