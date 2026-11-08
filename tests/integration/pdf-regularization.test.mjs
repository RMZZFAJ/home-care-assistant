import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { regularizationPdfFixture, regularizationLedger } from "./pdf-regularization-fixtures.mjs";
import { actor, fixtures, rpc } from "./v4-fixtures.mjs";
import { patientB } from "../../scripts/test-constants.mjs";
import { getTestEnvironment, sql, sqlLiteral } from "../../scripts/test-environment.mjs";
const reserve=(client,id,version=null,key=randomUUID(),name="reserve_pdf_issuance_v8")=>rpc(client,name,{p_document:id,p_version:version,p_key:key});

test("regularization reservation chooses V8 only at a case-bearing ENT event; old V7 intentions replay exactly and neither issuance changes stock",async()=>{
  const f=await regularizationPdfFixture(),before=regularizationLedger(f.patient),key=randomUUID();
  const old=await reserve(f.owner,f.doc.id,f.doc.version,key,"reserve_pdf_issuance_v7");
  const oldAgain=await reserve(f.owner,f.doc.id,f.doc.version,key);
  assert.equal(old.rendererRevision,7);assert.equal(oldAgain.rendererRevision,7);
  assert.equal(oldAgain.id,old.id);assert.deepEqual(oldAgain.snapshot,old.snapshot);
  const original=await reserve(f.owner,f.doc.id,f.original.version),current=await reserve(f.owner,f.doc.id,f.doc.version);
  assert.equal(original.rendererRevision,7);assert.equal(current.rendererRevision,8);
  const frozen=current.snapshot.deliveryRegularization.cases[0];
  assert.equal(frozen.proposed_by,fixtures.adminA.id);assert.equal(frozen.decision.actorId,fixtures.family.id);
  assert.equal(frozen.before_snapshot.acceptedBy,fixtures.professional.id);
  assert.equal(frozen.before_snapshot.version,f.original.version);
  assert.equal(current.snapshot.workflow.acceptedBy,fixtures.professional.id);
  const moves=JSON.parse(sql(`select jsonb_agg(to_jsonb(m) order by movement_revision) from public.stock_movements m where reference_type='delivery_regularization' and reference_id=${sqlLiteral(f.item.id)};`));
  assert.equal(moves.length,2);assert.ok(moves.every(m=>m.performed_by===fixtures.family.id));
  assert.deepEqual(new Set(frozen.decision.lines[0].movementIds),new Set(moves.map(m=>m.id)));
  assert.equal(regularizationLedger(f.patient),before);
  for(const row of [old,oldAgain,original,current])assert.equal(row.sourceHash,sql(`select content_hash from public.document_events where document_id=${sqlLiteral(f.doc.id)} and version=${row.version};`));
});

test("V8 reservation keeps live authorization, anonymous/service/helper denials, idempotency scope and read revocation on replay",async()=>{
  const f=await regularizationPdfFixture(),key=randomUUID(),row=await reserve(f.owner,f.doc.id,f.doc.version,key),env=getTestEnvironment();
  const before=regularizationLedger(f.patient),outside=await actor("adminB",patientB);
  for(const client of [outside,f.professional,createClient(env.url,env.anonKey,{auth:{persistSession:false}}),createClient(env.url,env.serviceKey,{auth:{persistSession:false}})]){
    assert.equal((await client.rpc("reserve_pdf_issuance_v8",{p_document:f.doc.id,p_version:f.doc.version,p_key:randomUUID()})).error?.code,"42501");
  }
  await rpc(f.owner,"select_active_context",{p_patient:f.patient});
  assert.equal((await f.owner.rpc("reserve_pdf_issuance_v8",{p_document:f.doc.id,p_version:f.proposed.version,p_key:key})).error?.code,"23505");
  sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.family.id)},'ent.read',false);`);
  assert.equal((await f.owner.rpc("reserve_pdf_issuance_v8",{p_document:f.doc.id,p_version:f.doc.version,p_key:key})).error?.code,"42501");
  assert.equal(sql("select has_function_privilege('authenticated','private.freeze_pdf_source_facts()','execute') or has_function_privilege('authenticated','private.freeze_pdf_fidelity_facts()','execute') or has_table_privilege('authenticated','private.pdf_issuances','insert,update,delete');"),"f");
  assert.equal(regularizationLedger(f.patient),before);assert.equal(row.rendererRevision,8);
});

test("unknown and rejected regularizations preserve their recorded before/after facts without allocating stock by issuance",async()=>{
  for(const options of [{state:"pending"},{state:"rejected"},{unknownOnly:true}]){
    const f=await regularizationPdfFixture(options),before=regularizationLedger(f.patient),row=await reserve(f.owner,f.doc.id,f.doc.version);
    assert.equal(row.rendererRevision,8);
    const c=row.snapshot.deliveryRegularization.cases[0];
    assert.equal(c.state,options.state??"approved");
    if(options.state==="pending")assert.equal(c.decision,null);
    else if(options.state==="rejected")assert.deepEqual(c.decision.lines,[]);
    else {assert.match(c.proposal.unknownQuantity,/^3(?:\.0+)?$/);assert.deepEqual(c.decision.lines[0].movementIds,[]);}
    assert.equal(regularizationLedger(f.patient),before);
  }
});
