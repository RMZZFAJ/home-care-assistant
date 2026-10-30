/* Exact local SQL, new documentary fixtures, full ROLLBACK. Actual Auth claims
 * identify event actors. Privileged fixture setup is NOT an authorization test.
 * Existing rows are not edited. Output contains only the new fictional rows. */
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { actors } from './local-actors.mjs';
import { sql,sqlLiteral as lit } from '../../../../scripts/test-environment.mjs';
const people=await actors();
const result=sql(`begin;
set local statement_timeout='20s';
select set_config('request.jwt.claims','{"role":"service_role"}',true) is not null;
do $b6$
declare p uuid:=gen_random_uuid();p2 uuid:=gen_random_uuid();d uuid:=gen_random_uuid();d2 uuid:=gen_random_uuid();r uuid:=gen_random_uuid();
 old_hash text;first jsonb;second jsonb;legacy jsonb;outcome jsonb;
begin
 insert into public.profiles(id,full_name,role,status)
 values(${lit(people.issuer.id)},'Emissora fictícia B6 original','professional','active'),
 (${lit(people.recipient.id)},'Recebedora fictícia B6 original','professional','active');
 insert into public.care_recipients(id,display_name,is_development) values(p,'Paciente fictício B6 original',true),(p2,'Paciente fictício B6 segundo',true);
 insert into public.operational_documents(id,care_recipient_id,type,status,created_by,recipient_id,idempotency_key,payload,created_at)
 values(d,p,'ENT','pending_receipt',${lit(people.issuer.id)},${lit(people.recipient.id)},gen_random_uuid(),'{"source":"FAMILY","destination":"CARE_TEAM","notes":"Expedição fictícia B6"}',now()-interval '3 days'),
 (d2,p2,'ENT','pending_receipt',${lit(people.issuer.id)},${lit(people.recipient.id)},gen_random_uuid(),'{"source":"FAMILY","destination":"CARE_TEAM"}',now());
 perform private.emit_document(d);perform private.emit_document(d2);
 perform set_config('request.jwt.claims',${lit(JSON.stringify(people.issuer.claims))},true);
 perform private.record_document_event(d,'ent.issued','{}',gen_random_uuid());
 select body,content_hash into first,old_hash from public.document_events where document_id=d and version=1;
 update public.profiles set full_name='Emissora fictícia B6 renomeada' where id=${lit(people.issuer.id)};
 update public.profiles set full_name='Recebedora fictícia B6 renomeada' where id=${lit(people.recipient.id)};
 update public.care_recipients set display_name='Paciente fictício B6 renomeado' where id=p;
 update public.operational_documents set version=version+1,status='confirmed',workflow_data='{"acceptedAt":"2026-10-30T12:15:00Z"}' where id=d;
 perform set_config('request.jwt.claims',${lit(JSON.stringify(people.recipient.claims))},true);
 perform private.record_document_event(d,'ent.receive','{"securityLevel":"authenticated_session","divergences":[]}',gen_random_uuid());
 select body into second from public.document_events where document_id=d and version=2;
 insert into public.requisitions(id,protocol,created_by,care_recipient_id,status,idempotency_key,payload_hash,is_historical,created_at,requester_name_snapshot,recipient_name_snapshot)
 values(r,'HC-20261030-'||upper(left(replace(r::text,'-',''),8)),null,p,'submitted',gen_random_uuid(),'synthetic',true,null,'Autora original fictícia do papel B6','Paciente fictício B6 no papel');
 perform private.register_legacy_requisition(r);
 select body into legacy from public.document_events where document_id=r;
 outcome:=jsonb_build_object(
 'B62-S01',jsonb_build_object('first',first,'second',second,'firstHashUnchanged',(select content_hash=old_hash from public.document_events where document_id=d and version=1),'issuerFrozen',second->'actors'->'issuer'=first->'actors'->'issuer','patientFrozen',second->'actors'->'patient'=first->'actors'->'patient','recipientNameRefreshed',second->'actors'->'recipient'->>'name'='Recebedora fictícia B6 renomeada','eventActorIsRecipient',second->>'actorName'='Recebedora fictícia B6 renomeada'),
 'B62-S02',jsonb_build_object('snapshot',legacy,'originalDateNull',(select created_at is null from public.requisitions where id=r),'documentDateNotNull',legacy->>'createdAt' is not null,'sourceDateNull',legacy->'payload'->'sourceCreatedAt'='null'::jsonb,'originalRequesterOnlyInPayload',legacy->'payload'->>'requesterName'='Autora original fictícia do papel B6'),
 'B62-S03',jsonb_build_object('sameCodeAcrossPatients',(select a.code=b.code from public.operational_documents a,public.operational_documents b where a.id=d and b.id=d2),'distinctProtocols',(select a.protocol<>b.protocol from public.operational_documents a,public.operational_documents b where a.id=d and b.id=d2),'draftCreatedBeforeEmission',first->>'createdAt'<(now()-interval '2 days')::text));
 perform set_config('b6.result',outcome::text,true);
end;$b6$;
select current_setting('b6.result')::jsonb;
rollback;`);
const data=JSON.parse(result.split('\n').find(s=>s.startsWith('{')));
assert(data['B62-S01'].firstHashUnchanged&&data['B62-S01'].issuerFrozen&&data['B62-S01'].patientFrozen&&data['B62-S01'].eventActorIsRecipient);
assert(data['B62-S02'].originalDateNull&&data['B62-S02'].documentDateNotNull&&data['B62-S02'].sourceDateNull);
assert(data['B62-S03'].sameCodeAcrossPatients&&data['B62-S03'].distinctProtocols);
writeFileSync(new URL('b62-provenance-results.json',import.meta.url),JSON.stringify({recordedAt:new Date().toISOString(),method:'New privileged documentary fixtures;actual synthetic Auth claims identify actors;no authorization claim;all SQL fixture data rolled back;two new Auth users remain',scenarios:data,rollback:true,externalCalls:0},null,2)+'\n');
console.log(Object.fromEntries(Object.entries(data).map(([k,v])=>[k,Object.fromEntries(Object.entries(v).filter(([,x])=>typeof x==='boolean'))])));
