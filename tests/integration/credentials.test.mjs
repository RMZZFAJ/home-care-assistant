import {test} from "node:test";
import assert from "node:assert/strict";
import {credentialFixture,credentialRead,reviewPacket,credentialHistory,rpc,fixtures,draftDevice} from "./credential-fixtures.mjs";
import {setup} from "./v4-fixtures.mjs";
import {sql,sqlLiteral} from "../../scripts/test-environment.mjs";
import {whileAdvisoryWaits,whileRowWaits} from "./lock-barrier.mjs";
import {createClient} from "@supabase/supabase-js";
import {env} from "./v4-fixtures.mjs";
import {fixturePassword} from "../../scripts/test-constants.mjs";
import {randomUUID} from "node:crypto";

test("credential review freezes actor/value/time, invalidates changed-and-restored declarations and preserves the same intention",async()=>{
 const f=await credentialFixture(),read=await credentialRead(f),packet=reviewPacket(f,read);
 assert.equal(read.state,"informed");assert.equal(read.externalValidation,null);
 const saved=await rpc(f.reviewer,"review_professional_credential",packet),after=await credentialRead(f);
 assert.equal(after.state,"family_checked");assert.equal(after.history.length,1);
 assert.equal(after.latestReview.author.id,fixtures.adminA.id);assert.equal(after.latestReview.credentialHash,read.declaration.valueHash);
 assert.deepEqual(after.latestReview.declaration,read.declaration.values);assert.ok(after.latestReview.recordedAt);
 const ledger=credentialHistory(f);
 assert.equal((await rpc(f.reviewer,"review_professional_credential",packet)).id,saved.id);assert.equal(credentialHistory(f),ledger);
 assert.equal((await f.reviewer.rpc("review_professional_credential",{...packet,p_note:"Outro resultado"})).error?.code,"PT409");
 for(const registration of ["009999","001234"])await rpc(f.subject.client,"update_my_profile",{p_name:"Técnica fictícia",p_registration:registration,p_state:"SP",p_category:"Técnica de enfermagem",p_preferences:f.preferences});
 const changed=await credentialRead(f);assert.equal(changed.state,"needs_review");assert.notEqual(changed.declaration.revision,read.declaration.revision);
 assert.equal(changed.declaration.valueHash,read.declaration.valueHash);assert.equal(changed.history[0].id,saved.id);
 assert.equal((await rpc(f.reviewer,"review_professional_credential",packet)).id,saved.id);assert.equal(credentialHistory(f),ledger);
 assert.equal((await f.reviewer.rpc("review_professional_credential",reviewPacket(f,read))).error?.code,"PT409");
 await rpc(f.reviewer,"review_professional_credential",reviewPacket(f,changed));assert.equal((await credentialRead(f)).state,"family_checked");
});

test("credential family history is patient-scoped, paginated and not a global or self-validation privilege",async()=>{
 const f=await credentialFixture(),read=await credentialRead(f),packet=reviewPacket(f,read);
 const pair=await Promise.all([rpc(f.reviewer,"review_professional_credential",packet),rpc(f.reviewer,"review_professional_credential",packet)]);
 assert.equal(pair[0].id,pair[1].id);assert.deepEqual(pair.map(x=>x.replayed).sort(),[false,true]);
 for(let i=0;i<51;i++)await rpc(f.reviewer,"review_professional_credential",reviewPacket(f,read,{p_note:"Conferência fictícia "+i}));
 const ids=[];let cursor={};
 do{
  const page=await credentialRead(f,f.reviewer,cursor);assert.ok(page.history.length<=20);
  ids.push(...page.history.map(x=>x.id));cursor=page.nextCursor?{p_before:page.nextCursor.beforeAt,p_before_id:page.nextCursor.beforeId}:null;
 }while(cursor);
 assert.equal(ids.length,52);assert.equal(new Set(ids).size,52);
 const before=credentialHistory(f),other=await setup();
 await rpc(f.reviewer,"select_active_context",{p_patient:other.patient});
 assert.equal((await f.reviewer.rpc("patient_professional_credential",{p_patient:other.patient,p_subject:f.subject.id})).error?.code,"42501");
 await rpc(f.reviewer,"select_active_context",{p_patient:f.patient});
 const own=await rpc(f.reviewer,"patient_professional_credential",{p_patient:f.patient,p_subject:fixtures.adminA.id});assert.equal(own.canReview,false);
 assert.equal((await f.reviewer.rpc("review_professional_credential",reviewPacket(f,own,{p_subject:fixtures.adminA.id}))).error?.code,"42501");
 const global=await draftDevice(f.patient,"global");await rpc(global,"select_active_context",{p_patient:null});
 assert.equal((await global.rpc("review_professional_credential",packet)).error?.code,"42501");
 assert.equal(credentialHistory(f),before);
});

test("credential declaration does not force an invented caregiver registration; external validation cannot be self-selected",async()=>{
 const f=await credentialFixture();
 await rpc(f.subject.client,"update_my_profile",{p_name:"Cuidadora fictícia",p_registration:"",p_state:null,p_category:"Cuidadora",p_preferences:f.preferences});
 const read=await credentialRead(f);assert.equal(read.declaration.values.registration,null);assert.equal(read.declaration.values.state,null);
 const before=credentialHistory(f);
 assert.equal((await f.reviewer.rpc("review_professional_credential",reviewPacket(f,read,{p_outcome:"externally_validated"}))).error?.code,"22023");
 assert.equal((await f.subject.client.rpc("review_professional_credential",reviewPacket(f,read))).error?.code,"42501");
 assert.equal(credentialHistory(f),before);
 await rpc(f.reviewer,"review_professional_credential",reviewPacket(f,read,{p_outcome:"not_confirmed",p_note:"A conferência ainda não foi concluída"}));
 assert.equal((await credentialRead(f)).state,"not_confirmed");
 assert.equal(sql(`select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='private' and c.relname in ('professional_declarations','professional_credential_reviews') and c.relrowsecurity;`),"2");
 assert.equal(sql(`select has_table_privilege('authenticated','private.professional_credential_reviews','INSERT') or has_function_privilege('anon','public.review_professional_credential(uuid,uuid,bigint,text,text,uuid)','EXECUTE') or has_function_privilege('service_role','public.review_professional_credential(uuid,uuid,bigint,text,text,uuid)','EXECUTE');`),"f");
 sql(`update public.care_recipient_memberships set status='revoked' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.adminA.id)};`);
 assert.equal((await f.reviewer.rpc("patient_professional_credential",{p_patient:f.patient,p_subject:f.subject.id})).error?.code,"42501");
});

test("credential review rechecks membership and Auth session after real lock waits without partial review or audit",async()=>{
 for(const late of [false,true]){
  const f=await credentialFixture(),read=await credentialRead(f),packet=reviewPacket(f,read),before=credentialHistory(f);
  const send=()=>f.reviewer.rpc("review_professional_credential",packet);
  const result=late?await whileRowWaits("profiles",fixtures.adminA.id,"review_professional_credential",send,async()=>assert.ifError((await f.reviewer.auth.signOut()).error)):
   await whileAdvisoryWaits(`professional-credential-review:${fixtures.adminA.id}:${packet.p_key}`,send,async()=>{sql(`update public.care_recipient_memberships set status='revoked' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(fixtures.adminA.id)};`);});
  assert.equal(result.error?.code,"42501",result.error?.message);assert.equal(credentialHistory(f),before);
  assert.equal(sql(`select count(*) from public.audit_events where action='credential.reviewed' and metadata->>'care_recipient_id'=${sqlLiteral(f.patient)};`),"0");
 }
});

test("unreviewed credential metadata does not block an authorized local Auth deletion or keep its JWT valid",async()=>{
 const service=createClient(env.url,env.serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const email=`credential-lifecycle-${randomUUID()}@example.invalid`;
 const created=await service.auth.admin.createUser({email,password:fixturePassword,email_confirm:true});assert.ifError(created.error);
 const id=created.data.user.id;
 sql(`insert into public.profiles(id,full_name,role,status) values(${sqlLiteral(id)},'Perfil fictício sem conferência','professional','active') on conflict(id) do nothing;`);
 assert.equal(sql(`select count(*) from private.professional_declarations where user_id=${sqlLiteral(id)};`),"1");
 const client=createClient(env.url,env.anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
 assert.ifError((await client.auth.signInWithPassword({email,password:fixturePassword})).error);
 assert.equal(await rpc(client,"my_session_valid",{}),true);
 assert.ifError((await service.auth.admin.deleteUser(id)).error);
 assert.equal(sql(`select count(*) from private.professional_declarations where user_id=${sqlLiteral(id)};`),"0");
 assert.equal(await rpc(client,"my_session_valid",{}),false);
});
