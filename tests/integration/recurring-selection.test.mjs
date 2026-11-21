import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {privateDraftFixture,draftDevice,officialState,rpc,fixtures} from "./private-draft-fixtures.mjs";
import {actor} from "./v4-fixtures.mjs";
import {sql,sqlLiteral} from "../../scripts/test-environment.mjs";
import {whileAdvisoryWaits} from "./lock-barrier.mjs";
const packet=(f,name="Materiais habituais")=>({p_patient:f.patient,p_name:name,p_products:[f.products[1],f.products[0]],p_key:randomUUID()});
const read=f=>rpc(f.pro,"requisition_selections",{p_patient:f.patient});
test("named selection persists across real Auth devices with membership only and no official effect",async()=>{
 const f=await privateDraftFixture(),before=officialState(f),args=packet(f),saved=await rpc(f.pro,"save_requisition_selection",args),peer=await draftDevice(f.patient);
 const library=await rpc(peer,"requisition_selections",{p_patient:f.patient});assert.equal(library.length,1);assert.deepEqual(library[0],saved.selection);
 assert.deepEqual(library[0].productIds,[...args.p_products].sort());assert.equal(library[0].ownerId,fixtures.professional.id);
 const replay=await rpc(peer,"save_requisition_selection",{...args,p_products:[...args.p_products].reverse()});assert.equal(replay.replayed,true);assert.equal(replay.selection.id,saved.selection.id);
 const stranger=await actor("adminA",f.patient);assert.deepEqual(await rpc(stranger,"requisition_selections",{p_patient:f.patient}),[]);
 const keys=sql(`select string_agg(key,',' order by key) from jsonb_object_keys((select to_jsonb(s) from private.requisition_selections s where id=${sqlLiteral(saved.selection.id)})) key;`);assert.equal(keys,"care_recipient_id,created_at,id,name,owner_id,product_ids");
 assert.equal(officialState(f),before);
});
test("catalogue eligibility, private scope, names and duplicate members are validated in the database",async()=>{
 const f=await privateDraftFixture(),before=officialState(f),args=packet(f);
 for(const change of [{p_name:"x"},{p_name:"x".repeat(81)},{p_name:"Quebra\nlinha"},{p_products:[]},{p_products:[f.products[0],f.products[0]]},{p_products:[randomUUID()]},{p_products:[null]},{p_key:null}])assert.equal((await f.pro.rpc("save_requisition_selection",{...args,...change})).error?.code,"22023");
 sql(`update public.care_recipient_products set is_active=false where care_recipient_id=${sqlLiteral(f.patient)} and product_id=${sqlLiteral(f.products[1])};`);
 assert.equal((await f.pro.rpc("save_requisition_selection",args)).error?.code,"22023");assert.deepEqual(await read(f),[]);
 assert.equal((await f.pro.rpc("requisition_selections",{p_patient:randomUUID()})).error?.code,"42501");
 assert.equal(officialState(f),before);
});
test("concurrent equal names create once and original replay survives write revocation but never read revocation",async()=>{
 const f=await privateDraftFixture(),args=packet(f),peer=await draftDevice(f.patient),other={...args,p_key:randomUUID()};
 const attempts=await Promise.all([f.pro.rpc("save_requisition_selection",args),peer.rpc("save_requisition_selection",other)]),winner=attempts.findIndex(x=>!x.error);
 assert.equal(attempts.filter(x=>!x.error).length,1);assert.equal(attempts.find(x=>x.error).error.code,"23505");assert.equal((await read(f)).length,1);
 const original=winner===0?args:other;assert.equal((await f.pro.rpc("save_requisition_selection",{...original,p_name:"Outra intenção"})).error?.code,"23505");
 sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.professional.id)},'req.create',false);`);
 assert.equal((await rpc(f.pro,"save_requisition_selection",original)).replayed,true);
 assert.equal((await f.pro.rpc("save_requisition_selection",{...original,p_key:randomUUID(),p_name:"Nova lista"})).error?.code,"42501");
 sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.professional.id)},'req.read',false);`);
 assert.equal((await f.pro.rpc("save_requisition_selection",original)).error?.code,"42501");assert.equal((await f.pro.rpc("requisition_selections",{p_patient:f.patient})).error?.code,"42501");
});

test("selection rechecks actual context after observed key and name waits without a partial row or command",async()=>{
 const f=await privateDraftFixture(),other=await privateDraftFixture();
 for(const boundary of ["key","name"]){
  await rpc(f.pro,"select_active_context",{p_patient:f.patient});
  const args=packet(f,"Observed wait "+boundary),before=officialState(f);
  const lock=boundary==="key"?`req-selection-key:${fixtures.professional.id}:${args.p_key}`:`req-selection-name:${fixtures.professional.id}:${f.patient}:${args.p_name.toLowerCase()}`;
  const result=await whileAdvisoryWaits(lock,()=>f.pro.rpc("save_requisition_selection",args),()=>rpc(f.pro,"select_active_context",{p_patient:other.patient}));
  assert.equal(result.error?.code,"42501");
  assert.equal(sql(`select count(*) from private.requisition_selections where owner_id=${sqlLiteral(fixtures.professional.id)} and care_recipient_id=${sqlLiteral(f.patient)};`),"0");
  assert.equal(sql(`select count(*) from private.requisition_selection_commands where owner_id=${sqlLiteral(fixtures.professional.id)} and idempotency_key=${sqlLiteral(args.p_key)};`),"0");
  assert.equal(officialState(f),before);
 }
 await rpc(f.pro,"select_active_context",{p_patient:f.patient});
 assert.equal(sql("select has_function_privilege('authenticated','private.requisition_selection_view(private.requisition_selections)','execute');"),"f");
 assert.equal(sql("select has_table_privilege('authenticated','private.requisition_selections','select');"),"f");
 assert.equal(sql("select has_function_privilege('anon','public.save_requisition_selection(uuid,text,text[],uuid)','execute');"),"f");
});
