import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { setup,actor,rpc,fixtures } from "./v4-fixtures.mjs";
import { draftDevice } from "./private-draft-fixtures.mjs";
import { whileAdvisoryWaits } from "./lock-barrier.mjs";
import { sql,sqlLiteral } from "../../scripts/test-environment.mjs";
const materials=f=>f.products.map((id,i)=>({id,name:"Material fictício "+i,unit:"unidade",quantityDecimals:0}));
const content=f=>({form:{quantities:{[f.products[0]]:"1,"},notes:"Preenchimento parcial privado",origin:"",source:"FAMILY",recipientId:""},links:{},materials:materials(f),context:{documentId:null,documentVersion:null,requisitionId:null,recipientName:""}});
const packet=(f,kind="COM",purpose="create",target=null,body=content(f))=>({p_patient:f.patient,p_kind:kind,p_purpose:purpose,p_target:target,p_id:null,p_expected:null,p_body:{action:"save",content:body},p_key:randomUUID()});
const read=(client,args)=>rpc(client,"supply_draft_context",{p_patient:args.p_patient,p_kind:args.p_kind,p_purpose:args.p_purpose,p_target:args.p_target});
const official=f=>sql(`select jsonb_build_object('documents',(select jsonb_agg(to_jsonb(d) order by id) from public.operational_documents d where care_recipient_id=${sqlLiteral(f.patient)}),'events',(select jsonb_agg(to_jsonb(e) order by id) from public.document_events e where document_id in(select id from public.operational_documents where care_recipient_id=${sqlLiteral(f.patient)})),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)}),'series',(select jsonb_agg(to_jsonb(s) order by type) from public.document_series s where care_recipient_id=${sqlLiteral(f.patient)}));`);
const payload=(f,kind)=>({lines:f.products.map(productId=>({productId,quantity:"2"})),...(kind==="COM"?{origin:"purchase"}:kind==="ENT"?{source:"FAMILY",destination:"CARE_TEAM",recipientId:fixtures.professional.id,recipientReason:"Recebedor manual fictício para este ensaio"}:{notes:"Contagem fictícia"})});

test("COM and ENT partial private saves survive a second Auth device with separate slots, CAS and no official effects",async()=>{
 const f=await setup(),owner=await actor("family",f.patient),peer=await draftDevice(f.patient,"family"),before=official(f);
 for(const kind of ["COM","ENT"]){
  const args=packet(f,kind),first=await rpc(owner,"supply_draft_command",args);
  assert.equal((await read(peer,args)).content.form.quantities[f.products[0]],"1,");
  assert.equal((await read(peer,args)).id,first.id);
  assert.equal((await rpc(peer,"supply_draft_command",args)).revision,1);
  assert.equal((await owner.rpc("supply_draft_command",{...args,p_key:randomUUID()})).error?.code,"PT409");
  const updates=await Promise.all([owner,peer].map((client,i)=>client.rpc("supply_draft_command",{...args,p_id:first.id,p_expected:1,p_body:{action:"save",content:{...content(f),form:{...content(f).form,notes:"Edição concorrente "+i}}},p_key:randomUUID()})));
  assert.equal(updates.filter(r=>!r.error).length,1);assert.equal(updates.find(r=>r.error).error.code,"PT409");assert.equal((await read(owner,args)).revision,2);
  const other=await actor("professional",f.patient);if(kind==="COM")assert.equal((await other.rpc("supply_draft_context",{p_patient:f.patient,p_kind:kind,p_purpose:"create",p_target:null})).error?.code,"42501");else assert.equal(await read(other,args),null);assert.equal((await other.rpc("supply_draft_command",{...args,p_id:first.id,p_expected:2,p_key:randomUUID()})).error?.code,"42501");
 }
 assert.equal(official(f),before);
});

test("COM confirmation consumes its private slot once, replays the same result and never deletes its official result on acknowledgement",async()=>{
 const f=await setup(),owner=await actor("family",f.patient),args=packet(f),saved=await rpc(owner,"supply_draft_command",args);
 const command={p_id:saved.id,p_expected:saved.revision,p_target:null,p_key:randomUUID(),p_body:{action:"create",payload:payload(f,"COM")}},confirmed=await rpc(owner,"commit_supply_draft",command);
 const state=official(f);assert.equal(confirmed.result.type,"COM");assert.ok(confirmed.consumedDocumentId);
 assert.deepEqual((await rpc(owner,"commit_supply_draft",command)).result,confirmed.result);assert.equal(official(f),state);
 assert.equal((await owner.rpc("commit_supply_draft",{...command,p_key:randomUUID()})).error?.code,"PT409");
 assert.equal((await owner.rpc("commit_supply_draft",{...command,p_body:{...command.p_body,payload:{...payload(f,"COM"),notes:"Outra intenção"}}})).error?.code,"23505");
 const consumed=await read(owner,args);assert.equal(consumed.state,"consumed");assert.equal(consumed.content,null);
 await rpc(owner,"supply_draft_command",{...args,p_id:saved.id,p_expected:consumed.revision,p_body:{action:"acknowledge"},p_key:randomUUID()});assert.equal(await read(owner,args),null);assert.equal(official(f),state);
 const next=await rpc(owner,"supply_draft_command",{...args,p_key:randomUUID()});await rpc(owner,"supply_draft_command",{...args,p_id:next.id,p_expected:1,p_body:{action:"discard"},p_key:randomUUID()});assert.equal(official(f),state);
});

test("two personal ENT divergence targets and receipt purpose stay separate; discard never accepts or deletes a delivery",async()=>{
 const f=await setup(),first=await rpc(f.admin,"create_supply_document",{p_patient:f.patient,p_type:"ENT",p_payload:payload(f,"ENT"),p_key:randomUUID(),p_draft:false}),second=await rpc(f.admin,"create_supply_document",{p_patient:f.patient,p_type:"ENT",p_payload:payload(f,"ENT"),p_key:randomUUID(),p_draft:false});
 const recipient=await actor("professional",f.patient),before=official(f),drafts=[];
 for(const doc of [first,second]){const body={documentVersion:doc.version,fields:{[doc.lines[0].id]:"1",[doc.lines[0].id+":problem"]:"shortage",reason:"Conferência privada parcial"},divergentIds:[doc.lines[0].id],materials:doc.lines.map(l=>({id:l.id,name:l.name_snapshot,unit:l.unit_snapshot,quantityDecimals:0}))},args=packet(f,"ENT","divergence",doc.id,body),saved=await rpc(recipient,"supply_draft_command",args);drafts.push({args,saved,doc});}
 assert.notEqual(drafts[0].saved.id,drafts[1].saved.id);assert.equal(official(f),before);
 assert.equal(await read(recipient,{...drafts[0].args,p_purpose:"receive"}),null);
 const receiptArgs=packet(f,"ENT","receive",first.id,{documentVersion:first.version,fields:{},divergentIds:[],materials:drafts[0].args.p_body.content.materials}),receipt=await rpc(recipient,"supply_draft_command",receiptArgs);
 assert.notEqual(receipt.id,drafts[0].saved.id);assert.equal((await read(recipient,drafts[0].args)).id,drafts[0].saved.id);assert.equal(official(f),before);
 await rpc(recipient,"supply_draft_command",{...receiptArgs,p_id:receipt.id,p_expected:1,p_body:{action:"discard"},p_key:randomUUID()});assert.equal(official(f),before);
 const other=await actor("adminA",f.patient);assert.equal((await other.rpc("supply_draft_command",{...drafts[0].args,p_key:randomUUID()})).error?.code,"42501");
 await rpc(recipient,"supply_draft_command",{...drafts[0].args,p_id:drafts[0].saved.id,p_expected:1,p_body:{action:"discard"},p_key:randomUUID()});assert.equal(official(f),before);assert.equal((await read(recipient,drafts[1].args)).id,drafts[1].saved.id);
 const {saved,doc}=drafts[1],command={p_id:saved.id,p_expected:1,p_target:doc.id,p_key:randomUUID(),p_body:{action:"receive",expectedVersion:doc.version,body:{divergences:[{lineId:doc.lines[0].id,acceptedQuantity:"1",problem:"shortage",notes:"Conferência pessoal confirmada"}]}}};
 const result=await rpc(recipient,"commit_supply_draft",command),after=official(f);assert.equal(result.result.id,doc.id);assert.equal((await read(recipient,drafts[1].args)).state,"consumed");assert.deepEqual((await rpc(recipient,"commit_supply_draft",command)).result,result.result);assert.equal(official(f),after);
});

test("supply draft save rechecks the selected authority after an observed lock and preserves draft and journal on denial",async()=>{
 const f=await setup(),other=await setup(),owner=await actor("family",f.patient),args=packet(f),saved=await rpc(owner,"supply_draft_command",args),before=official(f),update={...args,p_id:saved.id,p_expected:1,p_key:randomUUID(),p_body:{action:"save",content:{...content(f),form:{...content(f).form,notes:"Revisão após espera"}}}};
 const rejected=await whileAdvisoryWaits(`supply-draft-slot:${fixtures.family.id}:${f.patient}:COM:create:new`,()=>owner.rpc("supply_draft_command",update),()=>rpc(owner,"select_active_context",{p_patient:other.patient}));
 assert.equal(rejected.error?.code,"42501");assert.equal(sql(`select count(*) from private.creation_draft_commands where owner_id=${sqlLiteral(fixtures.family.id)} and idempotency_key=${sqlLiteral(update.p_key)};`),"0");
 await rpc(owner,"select_active_context",{p_patient:f.patient});assert.equal((await read(owner,args)).revision,1);assert.equal(official(f),before);assert.equal((await rpc(owner,"supply_draft_command",update)).revision,2);
});

for(const kind of ["COM","ENT","BAL"])test(`${kind} revision and submission roll back together on a proven second-stage failure and recover one immutable intention`,async()=>{
 const f=await setup(),owner=kind==="BAL"?await actor("professional",f.patient):f.admin,body=payload(f,kind),doc=await rpc(owner,"create_supply_document",{p_patient:f.patient,p_type:kind,p_payload:body,p_key:randomUUID(),p_draft:true});
 const args={p_id:doc.id,p_payload:{...body,notes:"Revisão fictícia atômica"},p_key:randomUUID(),p_version:doc.version,p_recount:false,p_submit:true,p_submission_key:randomUUID()},before=official(f);
 sql(`create function private.phase_d3_submit_fault() returns trigger language plpgsql set search_path='' as $$begin if new.status is distinct from old.status and new.status<>'draft' then raise exception 'controlled second-stage submission failure' using errcode='PT499';end if;return new;end;$$;create trigger phase_d3_submit_fault before update on public.operational_documents for each row when(old.id=${sqlLiteral(doc.id)}::uuid) execute function private.phase_d3_submit_fault();`);
 try{const failed=await owner.rpc("revise_and_submit_supply_document",args);assert.equal(failed.error?.code,"PT499");assert.equal(official(f),before);assert.equal(sql(`select count(*) from private.phase_d3_commands where owner_id=${sqlLiteral(kind==="BAL"?fixtures.professional.id:fixtures.adminA.id)} and idempotency_key=${sqlLiteral(args.p_key)};`),"0");}
 finally{sql("drop trigger if exists phase_d3_submit_fault on public.operational_documents;drop function if exists private.phase_d3_submit_fault();");}
 const result=await rpc(owner,"revise_and_submit_supply_document",args),after=official(f);assert.ok(result.version>doc.version);assert.notEqual(result.status,"draft");assert.deepEqual(await rpc(owner,"revise_and_submit_supply_document",args),result);assert.equal(official(f),after);
 assert.equal((await owner.rpc("revise_and_submit_supply_document",{...args,p_submission_key:randomUUID()})).error?.code,"23505");assert.equal(official(f),after);
});

for(const kind of ["COM","ENT","BAL"])test(`${kind} legacy committed revision is proven separately from failed submission and recovers the same keys once`,async()=>{
 const f=await setup(),owner=kind==="BAL"?await actor("professional",f.patient):f.admin,body=payload(f,kind),doc=await rpc(owner,"create_supply_document",{p_patient:f.patient,p_type:kind,p_payload:body,p_key:randomUUID(),p_draft:true});
 const args={p_id:doc.id,p_payload:{...body,notes:"Primeira etapa antiga confirmada"},p_key:randomUUID(),p_version:doc.version,p_recount:false},submit={...args,p_submit:true,p_submission_key:randomUUID()};
 assert.equal(await rpc(owner,"supply_revision_receipt",args),null);
 const revised=await rpc(owner,"revise_supply_document",args),proof={documentId:doc.id,revisionKey:args.p_key,version:revised.version},before=official(f);
 assert.equal(revised.version,doc.version+1);assert.equal(revised.status,"draft");assert.deepEqual(await rpc(owner,"supply_revision_receipt",args),proof);
 for(const changed of [{p_key:randomUUID()},{p_version:doc.version+1},{p_recount:true},{p_payload:{...args.p_payload,notes:"Conteúdo diferente"}}])assert.equal(await rpc(owner,"supply_revision_receipt",{...args,...changed}),null);
 const peer=await actor(kind==="BAL"?"adminA":"global",f.patient);assert.equal(await rpc(peer,"supply_revision_receipt",args),null);
 const other=await setup();await rpc(owner,"select_active_context",{p_patient:other.patient});assert.equal((await owner.rpc("supply_revision_receipt",args)).error?.code,"42501");await rpc(owner,"select_active_context",{p_patient:f.patient});
 sql(`create function private.phase_d3_legacy_submit_fault() returns trigger language plpgsql set search_path='' as $$begin if new.status is distinct from old.status and new.status<>'draft' then raise exception 'controlled legacy submission failure' using errcode='PT499';end if;return new;end;$$;create trigger phase_d3_legacy_submit_fault before update on public.operational_documents for each row when(old.id=${sqlLiteral(doc.id)}::uuid) execute function private.phase_d3_legacy_submit_fault();`);
 try{assert.equal((await owner.rpc("revise_and_submit_supply_document",submit)).error?.code,"PT499");assert.equal(official(f),before);assert.deepEqual(await rpc(owner,"supply_revision_receipt",args),proof);}
 finally{sql("drop trigger if exists phase_d3_legacy_submit_fault on public.operational_documents;drop function if exists private.phase_d3_legacy_submit_fault();");}
 const result=await rpc(owner,"revise_and_submit_supply_document",submit),after=official(f);assert.notEqual(result.status,"draft");assert.deepEqual(await rpc(owner,"revise_and_submit_supply_document",submit),result);assert.equal(official(f),after);assert.deepEqual(await rpc(owner,"supply_revision_receipt",args),proof);
 assert.equal(sql(`select count(*) from public.document_events where document_id=${sqlLiteral(doc.id)} and action=${sqlLiteral(kind.toLowerCase()+".draft_updated")};`),"1");
 assert.equal((await owner.rpc("revise_and_submit_supply_document",{...submit,p_submission_key:randomUUID()})).error?.code,"23505");assert.equal(official(f),after);
});

for(const kind of ["COM","ENT","BAL"]) {
 test(`${kind} legacy pending submission cannot silently submit an intervening revision`,async()=>{
  const f=await setup(),owner=kind==="BAL"?await actor("professional",f.patient):f.admin,body=payload(f,kind),doc=await rpc(owner,"create_supply_document",{p_patient:f.patient,p_type:kind,p_payload:body,p_key:randomUUID(),p_draft:true}),args={p_id:doc.id,p_payload:{...body,notes:"Revisão original"},p_key:randomUUID(),p_version:doc.version,p_recount:false,p_submit:true,p_submission_key:randomUUID()};
  const first=await rpc(owner,"revise_supply_document",{p_id:doc.id,p_payload:args.p_payload,p_key:args.p_key,p_version:doc.version,p_recount:false});
  await rpc(owner,"revise_supply_document",{p_id:doc.id,p_payload:{...body,notes:"Outra revisão posterior"},p_key:randomUUID(),p_version:first.version,p_recount:false});const before=official(f),failed=await owner.rpc("revise_and_submit_supply_document",args);
  assert.match(failed.error?.message??"",/stale document version/);assert.equal(official(f),before);assert.equal((await rpc(owner,"supply_revision_receipt",{p_id:doc.id,p_payload:args.p_payload,p_key:args.p_key,p_version:doc.version,p_recount:false})).version,first.version);
 });
 test(`${kind} legacy submission already committed is recovered by its original second key`,async()=>{
  const f=await setup(),owner=kind==="BAL"?await actor("professional",f.patient):f.admin,body=payload(f,kind),doc=await rpc(owner,"create_supply_document",{p_patient:f.patient,p_type:kind,p_payload:body,p_key:randomUUID(),p_draft:true}),args={p_id:doc.id,p_payload:{...body,notes:"Duas etapas antigas confirmadas"},p_key:randomUUID(),p_version:doc.version,p_recount:false,p_submit:true,p_submission_key:randomUUID()};
  const revised=await rpc(owner,"revise_supply_document",{p_id:doc.id,p_payload:args.p_payload,p_key:args.p_key,p_version:doc.version,p_recount:false}),submitted=await rpc(owner,"supply_document_command",{p_id:doc.id,p_action:"submit",p_body:{},p_key:args.p_submission_key,p_version:revised.version}),before=official(f);
  assert.deepEqual(await rpc(owner,"revise_and_submit_supply_document",args),submitted);assert.equal(official(f),before);assert.deepEqual(await rpc(owner,"revise_and_submit_supply_document",args),submitted);assert.equal(official(f),before);
 });
}

test("extended draft RPCs close direct and helper access, and legacy entrypoints cannot act on COM slots",async()=>{
 const grants=sql("select bool_and(not has_function_privilege(r,p.oid,'execute')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join unnest(array['anon','service_role']) r where (n.nspname='public' and p.proname in ('supply_draft_context','supply_draft_command','commit_supply_draft','revise_and_submit_supply_document','supply_revision_receipt')) or (n.nspname='private' and p.proname in ('require_supply_draft_scope','validate_supply_draft'));");assert.equal(grants,"t");
 assert.equal(sql("select bool_and(not has_function_privilege('authenticated',p.oid,'execute')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='private' and p.proname in ('require_supply_draft_scope','validate_supply_draft');"),"t");
 const f=await setup(),owner=await actor("family",f.patient),args=packet(f),saved=await rpc(owner,"supply_draft_command",args),legacy={...args,p_id:saved.id,p_expected:1,p_body:{action:"discard"},p_key:randomUUID()};delete legacy.p_purpose;
 assert.equal((await owner.rpc("creation_draft_command",legacy)).error?.code,"42501");assert.equal((await read(owner,args)).state,"active");
});
