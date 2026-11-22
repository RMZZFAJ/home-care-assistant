import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { actor, fixtures, rpc, setup } from "./v4-fixtures.mjs";
import { sql, sqlLiteral } from "../../scripts/test-environment.mjs";
import { whileRowWaits } from "./lock-barrier.mjs";
const body = () => ({ displayName: "Residência fictícia de preparação " + randomUUID().slice(0,8), isActive: false, isDevelopment: true, timeZone: "America/Sao_Paulo", administratorEmail: fixtures.family.email, ownerId: fixtures.global.id, substituteId: fixtures.adminA.id, responseMinutes: 60, showGuide: true, teamIds: [] });
const save = content => ({ p_id: null, p_expected: null, p_action: "save", p_content: content, p_step: 0, p_key: randomUUID() });
test("residence preparation saves privately, creates inactive atomically and recovers one intention without granting its global creator clinical membership", async () => {
  const global = await actor("global"), content = body(), args = save(content);
  const before = sql("select count(*) from public.care_recipients;");
  const draft = await rpc(global,"residence_preparation_command",args);
  assert.equal(draft.patientId,null); assert.equal(draft.revision,1); assert.equal(draft.productionApproved,false);
  assert.equal(sql("select count(*) from public.care_recipients;"),before);
  assert.equal((await rpc(global,"residence_preparations",{p_id:draft.id})).content.displayName,content.displayName);
  const command={...args,p_id:draft.id,p_expected:1,p_action:"create",p_step:1,p_key:randomUUID()};
  const created=await rpc(global,"residence_preparation_command",command);
  assert.equal(created.state,"preparing"); assert.equal(created.revision,2);
  assert.equal((await rpc(global,"residence_preparation_command",command)).patientId,created.patientId);
  const state=JSON.parse(sql(`select jsonb_build_object('active',(select is_active from public.care_recipients where id=${sqlLiteral(created.patientId)}),'members',(select jsonb_agg(jsonb_build_object('id',user_id,'role',role)) from public.care_recipient_memberships where care_recipient_id=${sqlLiteral(created.patientId)}),'documents',(select count(*) from public.operational_documents where care_recipient_id=${sqlLiteral(created.patientId)}),'moves',(select count(*) from public.stock_movements where care_recipient_id=${sqlLiteral(created.patientId)}));`));
  assert.equal(state.active,false); assert.deepEqual(state.members,[{id:fixtures.family.id,role:"admin"}]); assert.equal(state.documents,0); assert.equal(state.moves,0);
  assert.equal(Number(sql("select count(*) from public.care_recipients;")),Number(before)+1);
  assert.equal((await global.rpc("residence_preparation_command",{...command,p_content:{...content,isActive:true}})).error?.code,"23505");
  assert.equal((await global.rpc("residence_preparation_command",{...command,p_key:randomUUID()})).error?.code,"PT409");
  const family = await actor("family",created.patientId);
  const selected=await family.rpc("select_active_context",{p_patient:created.patientId});
  if (!selected.error) assert.ok((await family.rpc("family_stock_movement",{p_patient:created.patientId,p_product:"not-a-product",p_quantity:"1",p_action:"inbound",p_reason:"Tentativa fictícia negada em paciente inativo",p_key:randomUUID()})).error);
  else assert.equal(selected.error.code,"42501");
  assert.equal(sql(`select count(*) from public.stock_movements where care_recipient_id=${sqlLiteral(created.patientId)};`),"0");
});

test("preparation CAS keeps one concurrent revision and denies local creation, cross-owner reads and altered saved identity after creation", async()=>{
  const f=await setup(),global=await actor("global"),content=body(),draft=await rpc(global,"residence_preparation_command",save(content));
  for(const [name,client] of [["local",f.admin],["professional",await actor("professional",f.patient)]]) {
    assert.equal((await client.rpc("residence_preparation_command",save(content))).error?.code,"42501",name);
    assert.equal((await client.rpc("residence_preparations",{p_id:draft.id})).error?.code,"42501",name);
  }
  const writes=await Promise.all(["A","B"].map(suffix=>global.rpc("residence_preparation_command",{p_id:draft.id,p_expected:1,p_action:"save",p_content:{...content,displayName:content.displayName+suffix},p_step:1,p_key:randomUUID()})));
  assert.equal(writes.filter(x=>!x.error).length,1); assert.equal(writes.find(x=>x.error).error.code,"PT409");
  assert.equal((await rpc(global,"residence_preparations",{p_id:draft.id})).revision,2);
  const other=sql(`insert into private.residence_preparations(owner_id,content) values(${sqlLiteral(fixtures.adminA.id)},'{}') returning id;`);
  assert.equal((await global.rpc("residence_preparations",{p_id:other})).error?.code,"42501");
  assert.ok((await rpc(global,"residence_preparations",{})).data.some(d=>d.id===draft.id));
});

test("guide defaults and personal progress are scoped to live role, replay-safe, independent of science and locally configurable",async()=>{
  const f=await setup(),admin=f.admin,pro=await actor("professional",f.patient);
  const before=sql(`select jsonb_build_object('events',(select count(*) from public.document_events where document_id in(select id from public.operational_documents where care_recipient_id=${sqlLiteral(f.patient)})),'moves',(select count(*) from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)}),'members',(select jsonb_agg(to_jsonb(m) order by user_id) from public.care_recipient_memberships m where care_recipient_id=${sqlLiteral(f.patient)}));`);
  const initial=await rpc(pro,"guide_context",{}); assert.equal(initial.role,"professional"); assert.equal(initial.patientId,f.patient); assert.equal(initial.progress.revision,0);
  await rpc(admin,"configure_patient_guide",{p_patient:f.patient,p_expected:0,p_show:false,p_key:randomUUID()});
  assert.equal((await rpc(pro,"guide_context",{})).showOnFirstAccess,false);
  assert.equal((await pro.rpc("configure_patient_guide",{p_patient:f.patient,p_expected:1,p_show:true,p_key:randomUUID()})).error?.code,"42501");
  const args={p_scope:initial.scope,p_expected:0,p_step:2,p_status:"skipped",p_key:randomUUID()},saved=await rpc(pro,"guide_progress_command",args);
  assert.equal(saved.progress.revision,1); assert.deepEqual((await rpc(pro,"guide_progress_command",args)).progress,saved.progress);
  assert.equal((await pro.rpc("guide_progress_command",{...args,p_step:3})).error?.code,"23505");
  assert.equal((await pro.rpc("guide_progress_command",{...args,p_key:randomUUID()})).error?.code,"PT409");
  assert.equal(sql(`select jsonb_build_object('events',(select count(*) from public.document_events where document_id in(select id from public.operational_documents where care_recipient_id=${sqlLiteral(f.patient)})),'moves',(select count(*) from public.stock_movements where care_recipient_id=${sqlLiteral(f.patient)}),'members',(select jsonb_agg(to_jsonb(m) order by user_id) from public.care_recipient_memberships m where care_recipient_id=${sqlLiteral(f.patient)}));`),before);
  const other=await setup(); await actor("professional",other.patient); assert.equal((await rpc(pro,"guide_context",{})).progress.revision,0);
  assert.equal((await pro.rpc("guide_progress_command",args)).error?.code,"PT409");
  assert.equal((await pro.rpc("guide_progress_command",{...args,p_key:randomUUID()})).error?.code,"PT409");
  assert.equal((await rpc(pro,"guide_context",{})).progress.revision,0);
  assert.equal(sql("select has_function_privilege('authenticated','private.phase_d3_progress_command(integer,integer,text,uuid)','execute');"),"f");
  await actor("professional",f.patient); assert.equal((await rpc(pro,"guide_context",{})).progress.step,2);
  const global=await actor("global"); assert.equal((await rpc(global,"guide_context",{})).role,"global");
  assert.equal((await global.rpc("configure_patient_guide",{p_patient:f.patient,p_expected:1,p_show:true,p_key:randomUUID()})).error?.code,"42501");
});

test("preparation and guide entrypoints do not grant anonymous, service or direct table access",()=>{
  const grants=JSON.parse(sql(`select jsonb_build_object('anon',has_function_privilege('anon','public.residence_preparations(uuid)','execute'),'service',has_function_privilege('service_role','public.guide_context()','execute'),'table',has_table_privilege('authenticated','private.residence_preparations','select'),'helper',has_function_privilege('authenticated','private.residence_preparation_view(private.residence_preparations)','execute'));`));
  assert.deepEqual(grants,{anon:false,service:false,table:false,helper:false});
});

test("101 private preparations are reachable in stable pages and readiness reports recorded metadata without claiming physical or operational approval",async()=>{
  const global=await actor("global"),prefix="Preparação histórica fictícia "+randomUUID();
  sql(`insert into private.residence_preparations(owner_id,content,saved_at) select ${sqlLiteral(fixtures.global.id)},jsonb_build_object('displayName',${sqlLiteral(prefix)}||' '||n),'2026-01-01T12:00:00Z'::timestamptz from generate_series(1,101)n;`);
  const oracle=JSON.parse(sql(`select jsonb_agg(id order by saved_at desc,id) from private.residence_preparations where owner_id=${sqlLiteral(fixtures.global.id)} and content->>'displayName' like ${sqlLiteral(prefix+'%')};`)),ids=[];
  for(let page=1;page<=3;page++){const r=await rpc(global,"residence_preparation_page",{p_page:page,p_size:50,p_query:prefix});assert.equal(r.total,101);ids.push(...r.data.map(d=>d.id));}
  assert.deepEqual(ids,oracle);
  const status=await rpc(global,"residence_preparation_status",{p_id:ids[0]});
  assert.equal(status.patientCreated,false);assert.equal(status.activeProducts,0);assert.equal(status.productionApproved,false);assert.equal(status.physicalVerification,"PENDING_LOCAL_RESPONSIBLE");
  for(const input of [{p_size:null},{p_page:null},{p_size:51}])assert.equal((await global.rpc("residence_preparation_page",input)).error?.code,"22023");
});

test("a saved responsibility must remain a real active distinct identity and failed validation preserves the prior draft and command journal",async()=>{
  const global=await actor("global"),content=body(),draft=await rpc(global,"residence_preparation_command",save(content)),key=randomUUID();
  const before=sql(`select jsonb_build_object('row',(select to_jsonb(d) from private.residence_preparations d where id=${sqlLiteral(draft.id)}),'commands',(select count(*) from private.phase_d3_commands where owner_id=${sqlLiteral(fixtures.global.id)}));`);
  for(const invalid of [{ownerId:randomUUID()},{substituteId:content.ownerId}])assert.equal((await global.rpc("residence_preparation_command",{p_id:draft.id,p_expected:1,p_action:"save",p_content:{...content,...invalid},p_step:1,p_key:key})).error?.code,"22023");
  assert.equal(sql(`select jsonb_build_object('row',(select to_jsonb(d) from private.residence_preparations d where id=${sqlLiteral(draft.id)}),'commands',(select count(*) from private.phase_d3_commands where owner_id=${sqlLiteral(fixtures.global.id)}));`),before);
});

test("creation rechecks global authority after an observed identity lock and rolls back patient, membership, preparation revision and intent",async()=>{
  const f=await setup(),global=await actor("global"),content=body(),draft=await rpc(global,"residence_preparation_command",save(content));
  const before=sql(`select jsonb_build_object('patients',(select count(*) from public.care_recipients),'draft',(select to_jsonb(d) from private.residence_preparations d where id=${sqlLiteral(draft.id)}),'commands',(select count(*) from private.phase_d3_commands where owner_id=${sqlLiteral(fixtures.global.id)}));`);
  const args={p_id:draft.id,p_expected:1,p_action:"create",p_content:content,p_step:1,p_key:randomUUID()};
  const result=await whileRowWaits("profiles",fixtures.family.id,"residence_preparation_command",()=>global.rpc("residence_preparation_command",args),async()=>{await rpc(global,"select_active_context",{p_patient:f.patient});});
  assert.equal(result.error?.code,"42501");
  assert.equal(sql(`select jsonb_build_object('patients',(select count(*) from public.care_recipients),'draft',(select to_jsonb(d) from private.residence_preparations d where id=${sqlLiteral(draft.id)}),'commands',(select count(*) from private.phase_d3_commands where owner_id=${sqlLiteral(fixtures.global.id)}));`),before);
  await actor("global");assert.equal((await rpc(global,"residence_preparation_command",args)).state,"preparing");
});
