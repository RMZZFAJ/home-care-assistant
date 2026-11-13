import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { entTerminalFixture,terminalLedger } from "./ent-terminal-fixtures.mjs";
import { actor,rpc,fixtures } from "./v4-fixtures.mjs";
import { patientB } from "../../scripts/test-constants.mjs";
import { sql,sqlLiteral } from "../../scripts/test-environment.mjs";
const reserve=(f,key=randomUUID(),entry="reserve_pdf_issuance")=>rpc(f.owner,entry,{p_document:f.doc.id,p_version:f.doc.version,p_key:key});
test("real terminal ENT without a personal receipt selects V9 while preserving pending V7/V8 and every source/stock fact",async()=>{
 for(const kind of ["cancelled","administrative"]){
  const f=await entTerminalFixture({kind}),before=terminalLedger(f.patient),key=randomUUID();
  assert.equal(f.doc.workflow_data.acceptedAt,undefined);assert.equal(Number(f.doc.lines[0].accepted_quantity),0);
  const old=await reserve(f,key,kind==="cancelled"?"reserve_pdf_issuance":"reserve_pdf_issuance"),replay=await reserve(f,key),fresh=await reserve(f);
  assert.equal(fresh.rendererRevision,16);assert.equal(old.rendererRevision,16);
  assert.equal(old.id,replay.id);assert.deepEqual(old.snapshot,replay.snapshot);
  assert.equal(fresh.snapshot.status,f.doc.status);assert.equal(fresh.snapshot.workflow.acceptedAt,undefined);
  assert.equal(fresh.sourceHash,sql(`select content_hash from public.document_events where document_id=${sqlLiteral(f.doc.id)} and version=${f.doc.version};`));
  assert.equal(terminalLedger(f.patient),before);
 }
});
test("V9 reservation preserves a real original personal receipt and live read boundaries without granting its helpers",async()=>{
 const f=await entTerminalFixture({personal:true}),before=terminalLedger(f.patient),key=randomUUID(),row=await reserve(f,key);
 assert.equal(row.rendererRevision,16);assert.equal(row.snapshot.workflow.acceptedBy,fixtures.professional.id);
 assert.equal(Number(row.snapshot.lines[0].accepted_quantity),2);
 const outside=await actor("adminB",patientB);
 assert.equal((await outside.rpc("reserve_pdf_issuance",{p_document:f.doc.id,p_version:f.doc.version,p_key:randomUUID()})).error?.code,"42501");
 sql(`insert into public.capability_overrides(care_recipient_id,subject_user,capability,enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(fixtures.family.id)},'ent.read',false);`);
 assert.equal((await f.owner.rpc("reserve_pdf_issuance",{p_document:f.doc.id,p_version:f.doc.version,p_key:key})).error?.code,"42501");
 assert.equal(sql("select has_function_privilege('anon','public.reserve_pdf_issuance(uuid,uuid,integer)','execute') or has_function_privilege('service_role','public.reserve_pdf_issuance(uuid,uuid,integer)','execute') or has_function_privilege('authenticated','private.freeze_pdf_source_facts()','execute');"),"f");
 assert.equal(terminalLedger(f.patient),before);
});
