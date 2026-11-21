import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { autonomousReturnFixture, declaredAutonomousReturn, transferState } from "./autonomous-return-fixtures.mjs";
import { sql, sqlLiteral as q } from "../../scripts/test-environment.mjs";

test("DEV upgrade reserves old return numbers without rewriting legacy codes or regressing a higher series", async()=>{
 const f=await autonomousReturnFixture(),declaration=await declaredAutonomousReturn(f),before=transferState(f);
 const seed=readFileSync("supabase/migrations/20261113231000_l1_review_return_series_and_partial_counts.sql","utf8").split("-- R3 renamed")[0];
 for(const previous of [0,20]){
  const legacy=randomUUID();
  // The legacy-shaped row and the synthetic emission exist only in this
  // rolled-back upgrade probe; no issued document is edited or replaced.
  const result=JSON.parse(sql(`begin;
   insert into public.operational_documents(id,care_recipient_id,type,number,code,protocol,status,created_by,idempotency_key,payload)
   values(${q(legacy)},${q(f.patient)},'ENT',7,'ENT-0007','ENT-LEGACY-FIXTURE','pending_receipt',${q(f.initiator.id)},${q(randomUUID())},'{"source":"CARE_TEAM","destination":"FAMILY"}');
   insert into public.document_series(care_recipient_id,type,last_number) values(${q(f.patient)},'DEV',${previous})
   on conflict(care_recipient_id,type) do update set last_number=excluded.last_number;
   ${seed}
   do $$begin perform private.emit_document(${q(declaration.document.id)});end;$$;
   select jsonb_build_object('legacy',(select code from public.operational_documents where id=${q(legacy)}),
    'new',(select code from public.operational_documents where id=${q(declaration.document.id)}),
    'number',(select last_number from public.document_series where care_recipient_id=${q(f.patient)} and type='DEV'));
   rollback;`));
  assert.deepEqual(result,{legacy:"ENT-0007",new:previous===20?"DEV-0021":"DEV-0008",number:previous===20?21:8});
  assert.equal(transferState(f),before);
 }
});
