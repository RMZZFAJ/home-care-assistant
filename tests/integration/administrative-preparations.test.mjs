import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { actor, fixtures, rpc, setup } from "./v4-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";
import { whileAdvisoryWaits } from "./lock-barrier.mjs";
import { createClient } from "@supabase/supabase-js";
import { getTestEnvironment } from "../../scripts/test-environment.mjs";
import { fixturePassword } from "../../scripts/test-constants.mjs";

const scope=(patient,purpose,subject=null,mode="patient")=>({p_patient:patient,p_mode:mode,p_purpose:purpose,p_subject:subject});
const read=(client,args,selection=null,option=null,key=null)=>rpc(client,"administrative_preparation_read",{
  ...args,p_selection:selection,p_option:option,p_key:key,
});
const packet=(args,action,{fields=null,hash=null,draft=null}={})=>({
  ...args,p_action:action,p_key:randomUUID(),p_id:draft?.id??null,p_revision:draft?.revision??0,p_fields:fields,p_reference_hash:hash,
});
const command="administrative_preparation_command";
const alert=(productId,lowThreshold="5")=>({productId,location:"CARE_TEAM",lowThreshold,criticalThreshold:"2",isEnabled:true});

test("administrative partial fields are private, versioned and discardable without native alert effects",async()=>{
  const f=await setup(),args=scope(f.patient,"alertRule"),{reference}=await read(f.admin,args);
  const fields=alert("","em revisão"),initial=packet(args,"save",{fields,hash:reference.hash});
  const first=await rpc(f.admin,command,initial);
  assert.deepEqual((await read(f.admin,args)).draft.fields,fields);
  assert.deepEqual((await read(f.admin,args,null,null,initial.p_key)).receipt,first);
  const other=await actor("global",f.patient);
  assert.equal((await read(other,args)).draft,null);
  assert.equal((await read(other,args,null,null,initial.p_key)).receipt,null);
  const saves=["7","8"].map(value=>packet(args,"save",{draft:first,fields:{...fields,lowThreshold:value},hash:reference.hash}));
  const results=await Promise.all(saves.map(save=>f.admin.rpc(command,save)));
  assert.equal(results.filter(result=>!result.error).length,1);
  assert.equal(results.find(result=>result.error)?.error.code,"PT409");
  const latest=(await read(f.admin,args)).draft;
  assert.equal((await rpc(f.admin,command,packet(args,"discard",{draft:latest}))).state,"discarded");
  assert.equal(sql(`select count(*) from public.stock_alert_rules where care_recipient_id=${q(f.patient)};`),"0");
});

test("native alert confirmation and retries share one receipt and retain stale-reference fields",async()=>{
  const f=await setup(),args=scope(f.patient,"alertRule"),fields=alert(f.products[0]);
  const {reference}=await read(f.admin,args,f.products[0],"CARE_TEAM");
  const intent=packet(args,"commit",{fields,hash:reference.hash});
  const results=await Promise.all([rpc(f.admin,command,intent),rpc(f.admin,command,intent)]);
  assert.deepEqual(results[0],results[1]);
  assert.equal(results[0].outcome.productId,f.products[0]);
  assert.equal((await f.admin.rpc(command,{...intent,p_fields:alert(f.products[0],"8")})).error?.code,"23505");
  assert.equal(sql(`select count(*) from public.audit_events where action='stock.alert.configured' and metadata->>'care_recipient_id'=${q(f.patient)};`),"1");
  assert.equal((await read(f.admin,args,null,null,intent.p_key)).receipt.id,results[0].id);
});

test("recipient confirmation preserves own fields and refuses an outdated member eligibility reference",async()=>{
  const f=await setup(),args=scope(f.patient,"notificationRecipient"),user=fixtures.professional.id;
  const fields={recipientUserId:user,recipientGroup:"family",channel:"internal",destination:"",isEnabled:true,includeTeamAlerts:true};
  const {reference}=await read(f.admin,args,user,"internal");
  const saved=await rpc(f.admin,command,packet(args,"save",{fields,hash:reference.hash}));
  sql(`update public.care_recipient_memberships set status='revoked' where care_recipient_id=${q(f.patient)} and user_id=${q(user)};`);
  assert.equal((await f.admin.rpc(command,packet(args,"commit",{fields,hash:reference.hash,draft:saved}))).error?.code,"PT409");
  assert.deepEqual((await read(f.admin,args)).draft.fields,fields);
  sql(`update public.care_recipient_memberships set status='active' where care_recipient_id=${q(f.patient)} and user_id=${q(user)};`);
  const current=(await read(f.admin,args,user,"internal")).reference;
  const final=packet(args,"commit",{fields,hash:current.hash,draft:saved});
  const result=await rpc(f.admin,command,final);
  assert.deepEqual(await rpc(f.admin,command,final),result);
  assert.equal(result.outcome.userId,user);
  assert.deepEqual(JSON.parse(sql(`select jsonb_build_object('group',recipient_group,'channel',channel,'include',include_team_alerts) from public.recipient_notification_settings where id=${q(result.outcome.resourceId)};`)),{group:"family",channel:"internal",include:true});
});

test("membership editing retains the exact identity and old flags, while own transitions keep only the original session receipt",async()=>{
  for(const self of [false,true]){
    const f=await setup(),subject=self?fixtures.adminA.id:fixtures.professional.id,args=scope(f.patient,"membership",subject);
    const {reference}=await read(f.admin,args);
    const fields={userId:subject,role:self?"family":"supervisor",canManageStock:false,canCountStock:true};
    const intent=packet(args,"commit",{fields,hash:reference.hash});
    const result=await rpc(f.admin,command,intent);
    assert.equal(result.outcome.userId,subject);assert.equal(result.outcome.role,fields.role);
    assert.deepEqual((await read(f.admin,args,null,null,intent.p_key)).receipt,result);
    assert.deepEqual(await rpc(f.admin,command,intent),result);
    if(self) assert.equal((await f.admin.rpc(command,{...intent,p_key:randomUUID()})).error?.code,"42501");
    assert.equal(sql(`select count(*) from public.care_recipient_memberships where care_recipient_id=${q(f.patient)} and user_id=${q(subject)} and role=${q(fields.role)} and can_count_stock is ${self?"false":"true"};`),"1");
  }
});

test("intentional own revocation records an exact proof, and revocation during a waited command rolls back",async()=>{
  const f=await setup(),args=scope(f.patient,"membershipStatus",fixtures.adminA.id),fields={status:"revoked"};
  const {reference}=await read(f.admin,args),intent=packet(args,"commit",{fields,hash:reference.hash});
  const environment = getTestEnvironment();
  const anotherSession = createClient(environment.url, environment.anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  assert.ifError((await anotherSession.auth.signInWithPassword({ email: fixtures.adminA.email, password: fixturePassword })).error);
  assert.ifError((await anotherSession.rpc("select_active_context", { p_patient: f.patient })).error);
  const receipt=await rpc(f.admin,command,intent);
  assert.equal(receipt.outcome.status,"revoked");
  assert.deepEqual((await read(f.admin,args,null,null,intent.p_key)).receipt,receipt);
  assert.equal((await f.admin.rpc(command,{...intent,p_key:randomUUID()})).error?.code,"42501");
  assert.equal((await anotherSession.rpc("administrative_preparation_read", { ...args, p_key: intent.p_key })).error?.code,"42501");
  assert.ifError((await anotherSession.auth.signOut()).error);
  const g=await setup(),area=scope(g.patient,"alertRule"),input=alert(g.products[0]);
  const current=(await read(g.admin,area,g.products[0],"CARE_TEAM")).reference;
  const waited=packet(area,"commit",{fields:input,hash:current.hash});
  const denied=await whileAdvisoryWaits("stock:"+g.patient,()=>g.admin.rpc(command,waited),async()=>{
    sql(`update public.care_recipient_memberships set status='revoked' where care_recipient_id=${q(g.patient)} and user_id=${q(fixtures.adminA.id)};`);
  });
  assert.equal(denied.error?.code,"42501");
  assert.equal(sql(`select count(*) from private.administrative_preparation_commands where key=${q(waited.p_key)};`),"0");
});

test("global administrative confirmations create proposals and preserve local approval and narrow grants",async()=>{
  const f=await setup(),global=await actor("global"),args=scope(f.patient,"alertRule",null,"global");
  const fields=alert(f.products[0]),{reference}=await read(global,args,f.products[0],"CARE_TEAM");
  const intent=packet(args,"commit",{fields,hash:reference.hash}),receipt=await rpc(global,command,intent);
  assert.equal(receipt.outcome.kind,"proposal");
  assert.equal(sql(`select count(*) from public.stock_alert_rules where care_recipient_id=${q(f.patient)};`),"0");
  const result=await rpc(f.admin,"configure_patient_access",{p_patient:f.patient,p_kind:"administration",p_change:{},p_key:randomUUID(),p_version:1,p_request_id:receipt.outcome.proposalId,p_decision:"approve"});
  assert.equal(result.status,"applied");
  assert.equal(sql(`select count(*) from public.stock_alert_rules where care_recipient_id=${q(f.patient)};`),"1");
  assert.equal(sql(`select count(*) from (values
    (has_function_privilege('anon','public.administrative_preparation_read(uuid,text,text,uuid,uuid,text,text)','execute')),
    (has_function_privilege('service_role','public.administrative_preparation_command(uuid,text,text,uuid,text,uuid,uuid,integer,jsonb,text)','execute')),
    (has_function_privilege('authenticated','private.commit_administrative_preparation(uuid,text,text,uuid,jsonb,text,uuid)','execute')),
    (has_table_privilege('authenticated','private.administrative_preparations','select'))
  ) x(allowed) where allowed;`),"0");
});
