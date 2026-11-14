import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { setup, actor, rpc, issue, fixtures } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { whileAdvisoryWaits } from "./lock-barrier.mjs";

const record = (client, doc, key = randomUUID()) => rpc(client, "record_document_access", { p_document: doc.id, p_version: doc.version, p_key: key });
const count = id => Number(sql("select (select count(*) from private.document_access_windows where document_id=" + q(id) + ")+(select count(*) from public.requisition_openings where requisition_id=" + q(id) + ");"));
const facts = patient => sql("select jsonb_build_object('documents',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id=" + q(patient) + "),'events',(select jsonb_agg(to_jsonb(e) order by document_id,version) from public.document_events e where care_recipient_id=" + q(patient) + "),'science',(select jsonb_agg(to_jsonb(s) order by id) from public.requisition_science_events s where care_recipient_id=" + q(patient) + "),'ledger',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=" + q(patient) + "));" );
const supply = (f,type) => rpc(f.admin,"create_supply_document",{p_patient:f.patient,p_type:type,p_key:randomUUID(),p_draft:false,p_payload:{...(type==="COM"?{origin:"purchase"}:{}),...(type==="ENT"?{source:"FAMILY",destination:"CARE_TEAM",recipientId:fixtures.professional.id,recipientReason:"Recebedor fictício do acesso."}:{}),lines:(type==="BAL"?f.products:[f.products[0]]).map(productId=>({productId,quantity:"1"}))}});

test("all four types coalesce concurrent independent keys and recover each without document, SCI or stock effects", async () => {
  const f=await setup(),req=await issue(f.patient,[f.products[0]]),opening=await rpc(f.admin,"requisition_opening_context",{p_id:req.id});
  const docs=[{id:req.id,version:opening.version}];for(const type of ["COM","ENT","BAL"])docs.push(await supply(f,type));
  const before=facts(f.patient);
  for(const doc of docs){
    const keys=[randomUUID(),randomUUID()],pair=await Promise.all(keys.map(key=>record(f.admin,doc,key)));
    assert.equal(pair[0].id,pair[1].id);assert.equal(count(doc.id),1);assert.ok(pair.some(row=>row.windowReused));
    for(const [index,key]of keys.entries()){const replay=await record(f.admin,doc,key);assert.equal(replay.id,pair[index].id);assert.equal(replay.recovered,true);}
  }
  assert.equal(facts(f.patient),before);
  const collision=randomUUID();await record(f.admin,docs[1],collision);
  assert.equal((await f.admin.rpc("record_document_access",{p_document:docs[2].id,p_version:docs[2].version,p_key:collision})).error?.code,"23505");
});

test("expired windows create a new observation while original and grouped keys recover their exact historical target",async()=>{
  const f=await setup(),d=await supply(f,"COM"),old=randomUUID(),oldKey=randomUUID(),alias=randomUUID();
  // Controlled past fixture; no runtime clock input or mutation of an immutable record.
  sql("insert into private.document_access_windows(id,document_id,actor_id,actor_name,reference_version,recorded_at,idempotency_key) values("+[q(old),q(d.id),q(fixtures.adminA.id),q("Nome preservado do acesso anterior"),d.version,"clock_timestamp()-interval '21 minutes'",q(oldKey)].join(",")+");insert into private.document_access_aliases(actor_id,idempotency_key,access_id) values("+[q(fixtures.adminA.id),q(alias),q(old)].join(",")+");");
  const fresh=await record(f.admin,d);assert.notEqual(fresh.id,old);assert.equal(count(d.id),2);
  for(const key of [oldKey,alias]){const replay=await record(f.admin,d,key);assert.equal(replay.id,old);assert.equal(replay.actorName,"Nome preservado do acesso anterior");assert.equal(replay.recovered,true);}
  assert.throws(()=>sql("update private.document_access_windows set actor_name='Reescrito' where id="+q(old)),/immutable/);
  assert.throws(()=>sql("delete from private.document_access_aliases where idempotency_key="+q(alias)),/immutable/);
});

test("history requires its own patient capability, preserves closed grants and reaches all 105 records",async()=>{
  const f=await setup(),req=await issue(f.patient,[f.products[0]]),reader=await actor("reader",f.patient),opening=await rpc(reader,"requisition_opening_context",{p_id:req.id});
  await record(reader,{id:req.id,version:opening.version});
  assert.equal((await reader.rpc("document_access_history",{p_document:req.id})).error?.code,"42501");
  assert.deepEqual((await reader.from("requisition_openings").select("id").eq("requisition_id",req.id)).data,[]);
  sql("insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values("+[q(f.patient),q(fixtures.reader.id),q("document.access.read"),"true"].join(",")+");");
  assert.equal((await rpc(reader,"document_access_history",{p_document:req.id})).data.length,1);
  const direct=await reader.from("requisition_openings").select("id").eq("requisition_id",req.id);assert.ifError(direct.error);assert.equal(direct.data.length,1);
  sql("insert into public.requisition_openings(requisition_id,care_recipient_id,user_id,actor_name,material_identity,reference_version,opening_key,recorded_at) select "+[q(req.id),q(f.patient),q(fixtures.reader.id),"'Acesso histórico fictício '||n",q(opening.materialIdentity),opening.version,"gen_random_uuid()","clock_timestamp()-interval '1 day'-n*interval '21 minutes'"].join(",")+" from generate_series(1,104) n;");
  const ids=[],times=[];let cursor=null;
  do{const page=await rpc(reader,"document_access_history",{p_document:req.id,p_before_at:cursor?.at??null,p_before_id:cursor?.id??null});assert.equal(page.documentId,req.id);assert.equal(page.groupingMinutes,20);ids.push(...page.data.map(row=>row.id));times.push(...page.data.map(row=>Date.parse(row.recordedAt)));cursor=page.next;}while(cursor);
  assert.equal(ids.length,105);assert.equal(new Set(ids).size,105);assert.deepEqual(times,[...times].sort((a,b)=>b-a));
  const other=await setup();await actor("reader",other.patient);
  assert.equal((await reader.rpc("document_access_history",{p_document:req.id})).error?.code,"42501");
  assert.equal((await reader.rpc("record_document_access",{p_document:req.id,p_version:opening.version,p_key:randomUUID()})).error?.code,"42501");
  sql("delete from public.care_recipient_memberships where care_recipient_id="+q(f.patient)+" and user_id="+q(fixtures.global.id));
  const global=await actor("global");assert.equal((await global.rpc("document_access_history",{p_document:req.id})).error?.code,"42501");
  assert.equal(sql("select has_function_privilege('anon','public.record_document_access(uuid,integer,uuid)','EXECUTE') or has_function_privilege('service_role','public.document_access_history(uuid,timestamptz,uuid)','EXECUTE') or has_function_privilege('authenticated','private.document_access_key(uuid,uuid)','EXECUTE') or has_table_privilege('authenticated','private.document_access_windows','SELECT') or has_table_privilege('authenticated','private.document_access_aliases','INSERT')"),"f");
});

test("access rechecks real read authority after the observed window lock",async()=>{
  const f=await setup(),viewer=await actor("family",f.patient),d=await supply(f,"COM"),before=facts(f.patient);
  await rpc(viewer,"operational_document",{p_id:d.id});
  const result=await whileAdvisoryWaits(["document-access-window",fixtures.family.id,d.id].join(":"),()=>viewer.rpc("record_document_access",{p_document:d.id,p_version:d.version,p_key:randomUUID()}),()=>{sql("insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values("+[q(f.patient),q(fixtures.family.id),q("com.read"),"false"].join(",")+")");});
  assert.equal(result.error?.code,"42501");assert.equal(count(d.id),0);assert.equal(facts(f.patient),before);
});
