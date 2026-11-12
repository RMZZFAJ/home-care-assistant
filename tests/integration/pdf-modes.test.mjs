import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { progressPreparationFixture as fixture, progressFacts, actor, rpc, fixtures, sql, q } from "./progress-preparation-fixtures.mjs";
import { whileAdvisoryWaits } from "./lock-barrier.mjs";
const options = (mode="expanded",sections=["progress","communications","confirmations","relations","access"]) => ({mode,sections,period:{from:null,through:null,timeZone:"America/Sao_Paulo"},purpose:mode==="audit"?"Conferência documental interna fictícia":null});
const packet = (f,p_options=options(),p_key=randomUUID())=>({p_document:f.id,p_key,p_options});
const publish = (f,text)=>rpc(f.family,"document_progress_publish",{p_document:f.id,p_key:randomUUID(),p_body:{...f.content.note,text,publication:{relevance:"milestone",mentions:[fixtures.professional.id]}}});
const authorize = (f,user,cap,enabled) => sql("insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values("+[q(f.patient),q(user),q(cap),String(enabled)].join(",")+") on conflict (care_recipient_id,capability,subject_user) where subject_user is not null do update set enabled=excluded.enabled");

test("expanded sources cover all four types, freeze all 25 notes and preserve selected data and historical intent",async()=>{
 for(const type of ["REQ","COM","ENT","BAL"]){
  const f=await fixture(type);await actor("adminA",f.patient);
  const count=type==="REQ"?25:1;for(let i=0;i<count;i++)await publish(f,"Andamento fictício de complemento "+i);
  const doc=await rpc(f.admin,"operational_document",{p_id:f.id});
  await rpc(f.admin,"record_document_access",{p_document:f.id,p_version:doc.version,p_key:randomUUID()});
  sql("insert into public.requisition_notifications(document_id,care_recipient_id,recipient_group,recipient_label,channel,state,attempts,destination,provider_reference) values("+[q(f.id),q(f.patient),q("family"),q("Pessoa destinatária fictícia"),q("internal"),q("sent"),"0",q("destino-privado-nao-exportar"),q("provedor-privado-nao-exportar-"+randomUUID())].join(",")+")");
  const before=progressFacts(f),p=packet(f),[a,b]=await Promise.all([rpc(f.admin,"reserve_pdf_expanded_issuance",p),rpc(f.admin,"reserve_pdf_expanded_issuance",p)]);
  assert.equal(a.id,b.id);assert.equal(a.rendererRevision,17);assert.equal(a.documentOptions.mode,"expanded");
  const expansion=a.snapshot.documentExpansion;assert.equal(expansion.progress.filter(x=>x.source==="manual").length,count);assert.equal(expansion.access.length,1);assert.equal(expansion.communications.length>=1,true);
  assert.equal(expansion.progress.find(x=>x.source==="manual").mentions[0].id,fixtures.professional.id);
  assert.deepEqual(expansion.relations.references,a.snapshot.presentationFacts.references);
  for(const secret of ["destino-privado-nao-exportar","provedor-privado-nao-exportar"])assert.equal(JSON.stringify(expansion).includes(secret),false);
  assert.ok(expansion.communications.some(x=>x.recipientLabel==="Pessoa destinatária fictícia"));
  const reordered={...p,p_options:{...p.p_options,sections:[...p.p_options.sections].reverse()}};
  assert.equal((await rpc(f.admin,"reserve_pdf_expanded_issuance",reordered)).id,a.id);
  await publish(f,"Andamento posterior ao instante congelado");
  assert.deepEqual((await rpc(f.admin,"reserve_pdf_expanded_issuance",p)).snapshot,a.snapshot);
  assert.equal(progressFacts(f),before);
  assert.equal((await f.admin.rpc("reserve_pdf_issuance_v16",{p_document:f.id,p_key:p.p_key})).error?.code,"23505");
  assert.throws(()=>sql("update private.pdf_issuances set document_options='{}' where id="+q(a.id)),/immutable issuance options/);
 }
});

test("audit and access complements need their own patient competence on reservation, replay, download-source and both archives",async()=>{
 const f=await fixture(),basic=await rpc(f.family,"reserve_pdf_issuance_v16",{p_document:f.id,p_key:randomUUID()}),audit=packet(f,options("audit",["progress"]));
 assert.equal((await f.family.rpc("reserve_pdf_expanded_issuance",audit)).error?.code,"42501");
 authorize(f,fixtures.family.id,"audit.read",true);
 const row=await rpc(f.family,"reserve_pdf_expanded_issuance",audit);assert.ok(row.snapshot.documentExpansion.auditTrail.length);assert.equal(row.snapshot.documentExpansion.access,null);
 authorize(f,fixtures.family.id,"audit.read",false);
 assert.equal((await f.family.rpc("reserve_pdf_expanded_issuance",audit)).error?.code,"42501");assert.equal((await f.family.rpc("pdf_issuance",{p_id:row.id})).error?.code,"42501");
 for(const name of ["pdf_issuances","pdf_archive"]){const page=await rpc(f.family,name,{p_document:f.id});assert.ok(page.data.some(x=>(x.id??x.issuance?.id)===basic.id));assert.equal(page.data.some(x=>(x.id??x.issuance?.id)===row.id),false);}
 const access=packet(f,options("expanded",["access"]));assert.equal((await f.family.rpc("reserve_pdf_expanded_issuance",access)).error?.code,"42501");
 authorize(f,fixtures.family.id,"document.access.read",true);const observed=await rpc(f.family,"reserve_pdf_expanded_issuance",access);
 authorize(f,fixtures.family.id,"document.access.read",false);assert.equal((await f.family.rpc("pdf_issuance",{p_id:observed.id})).error?.code,"42501");
 const plain=await rpc(f.family,"reserve_pdf_expanded_issuance",packet(f,options("expanded",["progress"])));assert.equal(plain.snapshot.documentExpansion.access,null);assert.equal(plain.snapshot.documentExpansion.auditTrail,null);
 sql("delete from public.care_recipient_memberships where care_recipient_id="+q(f.patient)+" and user_id="+q(fixtures.global.id));const global=await actor("global");assert.equal((await global.rpc("reserve_pdf_expanded_issuance",packet(f,options("audit")))).error?.code,"42501");
});

test("expanded period is inclusive in the declared patient timezone and invalid or mismatched intent never gets substituted",async()=>{
 const f=await fixture();await actor("adminA",f.patient);await publish(f,"Andamento que permanece fora do recorte antigo");
 const old={...options("expanded",["progress","relations"]),period:{from:"2000-01-01",through:"2000-01-02",timeZone:"America/Sao_Paulo"}},p=packet(f,old),row=await rpc(f.admin,"reserve_pdf_expanded_issuance",p);
 assert.deepEqual(row.snapshot.documentExpansion.progress,[]);assert.equal(row.snapshot.lines.length>0,true);assert.deepEqual(row.snapshot.documentExpansion.relations.references,row.snapshot.presentationFacts.references);
 assert.equal((await f.admin.rpc("reserve_pdf_expanded_issuance",{...p,p_options:options()})).error?.code,"23505");
 for(const [text,moment] of [["Último instante do primeiro dia","2020-01-01 23:59:59"],["Primeiro instante do segundo dia","2020-01-02 00:00:00"]])
  sql("insert into private.document_progress_notes(document_id,care_recipient_id,author_id,author_name,category,stage,body,idempotency_key,intent_hash,recorded_at) values("+[q(f.id),q(f.patient),q(fixtures.family.id),q("Autora fictícia do limite"),q("record"),"null",q(text),q(randomUUID()),q("a".repeat(64)),q(moment)+"::timestamp at time zone 'America/Sao_Paulo'"].join(",")+")");
 const boundary=await rpc(f.admin,"reserve_pdf_expanded_issuance",packet(f,{...old,period:{...old.period,from:"2020-01-01",through:"2020-01-01"}}));
 assert.deepEqual(boundary.snapshot.documentExpansion.progress.map(x=>x.text),["Último instante do primeiro dia"]);
 for(const bad of [{...options(),mode:"summary"},{...options(),sections:["progress","progress"]},{...options(),sections:["unknown"]},{...options(),sections:[]},{...options(),period:{...old.period,from:"2000-01-03"}},{...options(),period:{...old.period,timeZone:"UTC"}},{...options("audit"),purpose:" "},{...options(),snapshot:row.snapshot}])
  assert.equal((await f.admin.rpc("reserve_pdf_expanded_issuance",packet(f,bad))).error?.code,"22023");
 assert.equal(sql("select has_function_privilege('anon','public.reserve_pdf_expanded_issuance(uuid,uuid,jsonb,integer)','execute') or has_function_privilege('service_role','public.reserve_pdf_expanded_issuance(uuid,uuid,jsonb,integer)','execute') or has_function_privilege('authenticated','private.pdf_expansion_visible(uuid,jsonb,jsonb)','execute') or has_table_privilege('authenticated','private.document_progress_facts','select')"),"f");
});

test("expanded reservation checks audit authority after waiting on its actual intention key",async()=>{
 const f=await fixture();await actor("adminA",f.patient);const p=packet(f,options("audit",["progress"]));
 const result=await whileAdvisoryWaits(["pdf-issuance",fixtures.adminA.id,p.p_key].join(":"),()=>f.admin.rpc("reserve_pdf_expanded_issuance",p),()=>authorize(f,fixtures.adminA.id,"audit.read",false));
 assert.equal(result.error?.code,"42501");assert.equal(sql("select count(*) from private.pdf_issuances where requested_by="+q(fixtures.adminA.id)+" and idempotency_key="+q(p.p_key)),"0");
});


test("frozen manual links retain live authorization while a fresh selected source redacts revoked references",async()=>{
 const f=await fixture("COM"),admin=await actor("adminA",f.patient),req=JSON.parse(sql("select jsonb_build_object('id',id,'code',code) from public.operational_documents where care_recipient_id="+q(f.patient)+" and type='REQ' order by created_at limit 1"));
 await rpc(admin,"document_progress_publish",{p_document:f.id,p_key:randomUUID(),p_body:{...f.content.note,references:[req.id]}});
 const p=packet(f,options("expanded",["progress"])),known=await rpc(admin,"reserve_pdf_expanded_issuance",p);assert.equal(known.snapshot.documentExpansion.progress.find(x=>x.source==="manual").references[0].id,req.id);
 authorize(f,fixtures.adminA.id,"req.read",false);
 assert.equal((await admin.rpc("pdf_issuance",{p_id:known.id})).error?.code,"42501");assert.equal((await admin.rpc("reserve_pdf_expanded_issuance",p)).error?.code,"42501");
 const fresh=await rpc(admin,"reserve_pdf_expanded_issuance",packet(f,options("expanded",["progress"])));assert.deepEqual(fresh.snapshot.documentExpansion.progress.find(x=>x.source==="manual").references,[]);
});
