import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { progressPreparationFixture as fixture, privateProgressCommand as command, privateProgressCommit as commit, progressFacts, actor, rpc, fixtures, sql, q } from "./progress-preparation-fixtures.mjs";
import { whileAdvisoryWaits } from "./lock-barrier.mjs";
const options = id => ({ relevance: "milestone", mentions: [id] });
const publish = (f, publication, key = randomUUID()) => ({ p_document: f.id, p_key: key, p_body: { ...f.content.note, publication } });

test("structured publication freezes real patient names, preserves base facts and serializes exact options", async () => {
 const f = await fixture(), before = progressFacts(f), person = fixtures.professional.id;
 const p = publish(f, options(person));
 const [a,b] = await Promise.all([rpc(f.family,"document_progress_publish",p),rpc(f.family,"document_progress_publish",p)]);
 assert.equal(a.note.id,b.note.id);assert.equal([a,b].filter(x=>x.recovered).length,1);
 assert.equal(a.note.relevance,"milestone");assert.equal(a.note.mentions[0].id,person);assert.equal(a.note.mentions[0].careRole,"professional");
 assert.equal(a.note.authorId,fixtures.family.id);assert.notEqual(a.note.authorId,person);
 assert.equal(progressFacts(f),before);
 assert.equal((await f.family.rpc("document_progress_publish",{...p,p_body:{...p.p_body,publication:{...p.p_body.publication,relevance:"attention"}}})).error?.code,"22023");
 assert.equal((await f.family.rpc("document_progress_publish",{...p,p_body:f.content.note})).error?.code,"22023");
 const name=sql("select full_name from public.profiles where id="+q(person));
 try {sql("update public.profiles set full_name='Nome posterior fictício' where id="+q(person));
  const read=await rpc(f.family,"document_progress",{p_document:f.id,p_filter:"manual"});assert.deepEqual(read.data[0].mentions,a.note.mentions);
 } finally {sql("update public.profiles set full_name="+q(name)+" where id="+q(person));}
 assert.throws(()=>sql("update private.document_progress_details set relevance='normal' where note_id="+q(a.note.id)),/append only/);
 assert.throws(()=>sql("delete from private.document_progress_details where note_id="+q(a.note.id)),/append only/);
});

test("private four-field drafts stay unchanged while committed details and uncertain recovery bind the same attempt", async () => {
 const f=await fixture("COM"),saved=await command(f,f.family),publication=options(fixtures.family.id),body={...f.content.note,publication},p=commit(f,saved,randomUUID(),body),before=progressFacts(f);
 assert.deepEqual((await rpc(f.family,"progress_preparation_context",f.scope)).content,f.content);
 await assert.rejects(command(f,f.family,"save",saved,{...f.content,note:body}),/invalid progress fields/);
 const unknown=await rpc(f.family,"progress_preparation_recovery",p);assert.equal(unknown.status,"unknown");assert.deepEqual(unknown.content,f.content.note);assert.deepEqual(unknown.publication,publication);
 const [a,b]=await Promise.all([rpc(f.family,"commit_progress_preparation",p),rpc(f.family,"commit_progress_preparation",p)]);
 assert.equal(a.receipt.resourceId,b.receipt.resourceId);assert.deepEqual(a.receipt.command,{key:p.p_key,content:f.content.note,publication});
 assert.equal(a.receipt.nativeResult.note.relevance,"milestone");
 const recovery=await rpc(f.family,"progress_preparation_recovery",p);assert.equal(recovery.status,"applied");assert.deepEqual(recovery.confirmation.receipt.command,a.receipt.command);
 const native=await rpc(f.family,"progress_preparation_context",f.scope);assert.equal(native.content,null);assert.deepEqual(native.consumedResult.nativeResult.note.mentions,a.receipt.nativeResult.note.mentions);
 assert.equal((await f.family.rpc("commit_progress_preparation",{...p,p_body:{...body,publication:{...publication,mentions:[]}}})).error?.code,"23505");
 sql("insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values("+[q(f.patient),q(fixtures.family.id),q("document.progress.create"),"false"].join(",")+")");
 assert.equal((await rpc(f.family,"commit_progress_preparation",p)).receipt.resourceId,a.receipt.resourceId);
 assert.equal(progressFacts(f),before);
});

test("mention lookup is paginated patient-only and publication rejects forged, foreign, inactive and duplicate mentions", async () => {
 const f=await fixture(),foreign=await fixture();await actor("family",f.patient);
 // A user with a global identity but no active patient membership is not eligible.
 sql("delete from public.care_recipient_memberships where care_recipient_id="+q(f.patient)+" and user_id="+q(fixtures.global.id));
 const page=await rpc(f.family,"document_progress_people",{p_document:f.id});
 assert.equal(page.careRecipientId,f.patient);assert.equal(page.data.some(x=>x.id===fixtures.global.id),false);assert.ok(page.data.every(x=>Object.keys(x).sort().join(',')==='careRole,id,name'));
 assert.equal((await f.family.rpc("document_progress_publish",publish(f,options(fixtures.global.id)))).error?.code,"42501");
 for(const value of [{relevance:"urgent",mentions:[]},{relevance:"normal",mentions:[fixtures.professional.id,fixtures.professional.id]},{relevance:"normal",mentions:[{id:fixtures.professional.id,name:"Forjado"}]},{relevance:"normal",mentions:[],authorId:fixtures.adminA.id},null])
  assert.equal((await f.family.rpc("document_progress_publish",publish(f,value))).error?.code,"22023");
 sql("update public.care_recipient_memberships set status='revoked' where care_recipient_id="+q(f.patient)+" and user_id="+q(fixtures.professional.id));
 assert.equal((await f.family.rpc("document_progress_publish",publish(f,options(fixtures.professional.id)))).error?.code,"42501");
 assert.equal((await rpc(f.family,"document_progress_people",{p_document:f.id})).data.some(x=>x.id===fixtures.professional.id),false);
 const global=await actor("global");assert.equal((await global.rpc("document_progress_people",{p_document:f.id})).error?.code,"42501");
 const reader=await actor("reader",f.patient);assert.equal((await reader.rpc("document_progress_people",{p_document:f.id})).error?.code,"42501");
 assert.equal((await f.family.rpc("document_progress_people",{p_document:foreign.id})).error?.code,"42501");
 assert.equal(sql("select has_function_privilege('anon','public.document_progress_people(uuid,text,integer)','execute') or has_function_privilege('service_role','public.document_progress_people(uuid,text,integer)','execute') or has_function_privilege('authenticated','private.progress_publication_mentions(uuid,jsonb)','execute') or has_table_privilege('authenticated','private.document_progress_details','select,insert,update,delete')"),"f");
});

test("publication rechecks patient mention and document read permissions after the observed intent lock", async () => {
 for(const revoke of ["mention","read"]){
  const f=await fixture(),p=publish(f,options(fixtures.professional.id)),before=progressFacts(f);
  const result=await whileAdvisoryWaits(["document-progress",fixtures.family.id,p.p_key].join(":"),()=>f.family.rpc("document_progress_publish",p),()=>{
   if(revoke==="mention")sql("update public.care_recipient_memberships set status='revoked' where care_recipient_id="+q(f.patient)+" and user_id="+q(fixtures.professional.id));
   else sql("insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values("+[q(f.patient),q(fixtures.family.id),q("req.read"),"false"].join(",")+")");
  });
  assert.equal(result.error?.code,"42501");assert.equal(sql("select count(*) from private.document_progress_notes where document_id="+q(f.id)),"0");assert.equal(progressFacts(f),before);
 }
});
