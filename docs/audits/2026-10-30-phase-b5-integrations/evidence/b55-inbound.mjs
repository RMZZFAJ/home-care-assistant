/* Exact-local SQL; only NEW fixtures inside rollback. New synthetic Auth actor
 * is created officially by local-actor.mjs, not by inserting auth.users. */
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {localActor,sql,lit} from './local-actor.mjs';
const actor=await localActor();
const output=sql(`begin;set local statement_timeout='15s';
select set_config('request.jwt.claims',${lit(JSON.stringify(actor.claims))},true) is not null;
select public.register_verified_phone();
do $b5$ declare p uuid:=gen_random_uuid();q uuid:=gen_random_uuid();pid text:='B5-synthetic-inbound-'||gen_random_uuid();r jsonb;control jsonb;replay jsonb;begin
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 insert into public.care_recipients(id,display_name,is_development) values(p,'Paciente fictício B5 entrada A',true),(q,'Paciente fictício B5 entrada B',true);
 insert into public.care_recipient_memberships(care_recipient_id,user_id,role) values(p,${lit(actor.id)},'professional'),(q,${lit(actor.id)},'professional');
 r:=public.ingest_whatsapp_report(pid,${lit(actor.phone)},'Faltou material fictício B5','[]','shortage');
 perform set_config('b5.ambiguous',jsonb_build_object('needsAuthenticatedSelection',r->'needsAuthenticatedSelection','inboundSaved',exists(select 1 from public.inbound_messages where provider_id=pid),'reportsSaved',(select count(*) from public.consumption_reports where care_recipient_id in(p,q)))::text,true);
 update public.care_recipient_memberships set status='revoked' where care_recipient_id=q and user_id=${lit(actor.id)};
 control:=public.ingest_whatsapp_report(pid,${lit(actor.phone)},'Faltou material fictício B5','[]','shortage');
 replay:=public.ingest_whatsapp_report(pid,${lit(actor.phone)},'Faltou material fictício B5','[]','shortage');
 perform set_config('b5.control',jsonb_build_object('pendingConfirmation',control->'pendingConfirmation','duplicate',replay->'duplicate','reportsSaved',(select count(*) from public.consumption_reports where care_recipient_id=p),'ledgerRows',(select count(*) from public.stock_movements where care_recipient_id=p))::text,true);
end;$b5$;
select jsonb_build_object('B55-S01',current_setting('b5.ambiguous')::jsonb,'B55-S02',current_setting('b5.control')::jsonb);rollback;`);
const scenarios=JSON.parse(output.split('\n').find(x=>x.startsWith('{')));
assert.deepEqual(scenarios['B55-S01'],{needsAuthenticatedSelection:true,inboundSaved:false,reportsSaved:0});
assert.equal(scenarios['B55-S02'].pendingConfirmation,true);assert.equal(scenarios['B55-S02'].duplicate,true);assert.equal(scenarios['B55-S02'].reportsSaved,1);assert.equal(scenarios['B55-S02'].ledgerRows,0);
const result={recordedAt:new Date().toISOString(),method:'Local SQL service context with official synthetic Auth actor/confirmed fictitious phone. New patient/membership/report fixtures rolled back; Auth actor/profile persist for inspection. No SMS/Meta.',scenarios,rollback:true,externalCalls:0};
writeFileSync(new URL('b55-inbound-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(result);
