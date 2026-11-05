/* Current Flow SQL, official synthetic Auth identity, new rows in rollback.
 * Does not publish a Flow or call the encrypted endpoint/provider. */
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {localActor,sql,lit} from './local-actor.mjs';
const actor=await localActor();
const raw=sql(`begin;set local statement_timeout='15s';
do $b5$ declare p uuid:=gen_random_uuid();h1 text:=encode(extensions.digest(gen_random_uuid()::text,'sha256'),'hex');h2 text:=encode(extensions.digest(gen_random_uuid()::text,'sha256'),'hex');h3 text:=encode(extensions.digest(gen_random_uuid()::text,'sha256'),'hex');h4 text:=encode(extensions.digest(gen_random_uuid()::text,'sha256'),'hex');h5 text:=encode(extensions.digest(gen_random_uuid()::text,'sha256'),'hex');sid uuid;submission uuid;r jsonb;replay jsonb;rejected boolean:=false;expired boolean:=false;revoked boolean:=false;reviewed jsonb;again jsonb;outcome jsonb:='{}';begin
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 insert into public.care_recipients(id,display_name,is_development) values(p,'Paciente fictício B5 Flow',true);
 insert into public.care_recipient_memberships(care_recipient_id,user_id,role) values(p,${lit(actor.id)},'admin');
 perform set_config('request.jwt.claims',${lit(JSON.stringify(actor.claims))},true);perform public.select_active_context(p);
 sid:=public.create_flow_session(p,h1);perform public.create_flow_session(p,h2);perform public.create_flow_session(p,h3);perform public.create_flow_session(p,h4);perform public.create_flow_session(p,h5);
 outcome:=outcome||jsonb_build_object('B57-S01',jsonb_build_object('sessionCreatedWithoutRegisteredPhone',sid is not null and not exists(select 1 from public.verified_phones where user_id=${lit(actor.id)}),'scope','occurrence bearer session; not ENT receipt'));
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 r:=public.flow_exchange(h1,'{"kind":"shortage","text":"Faltou material fictício B5"}');replay:=public.flow_exchange(h1,'{"kind":"shortage","text":"Faltou material fictício B5"}');
 submission:=(r->>'submissionId')::uuid;
 outcome:=outcome||jsonb_build_object('B57-S02',jsonb_build_object('firstPending',r->'pendingConfirmation','replayPending',replay->'pendingConfirmation','oneSubmission',(select count(*)=1 from public.flow_submissions where session_id=sid),'reportsBeforeReview',(select count(*) from public.consumption_reports where care_recipient_id=p)));
 r:=public.flow_exchange(h2,'{"operation":"occurrence_mode","kind":"no_issues"}');
 begin perform public.flow_exchange(h2,'{"operation":"occurrence_mode","kind":"no_issues"}');exception when insufficient_privilege then rejected:=true;end;
 outcome:=outcome||jsonb_build_object('B57-S03',jsonb_build_object('firstNoIssues',r->'noIssues','identicalReplayRejected',rejected,'oneSubmission',(select count(*)=1 from public.flow_submissions f join public.flow_sessions s on s.id=f.session_id where s.token_hash=h2)));
 r:=public.flow_exchange(h3,'{"operation":"confirm"}');
 outcome:=outcome||jsonb_build_object('B57-S04',jsonb_build_object('foreignPurposePayloadStored',coalesce((r->>'pendingConfirmation')::boolean,false),'noOperationalEffect',(select count(*)=0 from public.consumption_reports where care_recipient_id=p)));
 update public.flow_sessions set expires_at=now()-interval '1 minute' where token_hash=h4;
 begin perform public.flow_exchange(h4,null);exception when insufficient_privilege then expired:=true;end;
 outcome:=outcome||jsonb_build_object('B57-S05',jsonb_build_object('expiredRejected',expired));
 perform set_config('request.jwt.claims',${lit(JSON.stringify(actor.claims))},true);
 reviewed:=public.review_flow_submission(submission,true,'shortage','Faltou material fictício revisado B5','[]');again:=public.review_flow_submission(submission,false,'shortage','Nova decisão incompatível B5','[]');
 outcome:=outcome||jsonb_build_object('B57-S06',jsonb_build_object('status',reviewed->>'status','repeatReturnsActualStatus',again->>'status','sameReport',reviewed->>'reportId'=again->>'reportId','reportsAfterReview',(select count(*) from public.consumption_reports where care_recipient_id=p),'ledgerRows',(select count(*) from public.stock_movements where care_recipient_id=p)));
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 update public.care_recipient_memberships set status='revoked' where care_recipient_id=p and user_id=${lit(actor.id)};
 begin perform public.flow_exchange(h5,null);exception when insufficient_privilege then revoked:=true;end;
 outcome:=outcome||jsonb_build_object('B57-S07',jsonb_build_object('revokedRejected',revoked));
 perform set_config('b5.result',outcome::text,true);
end;$b5$;select current_setting('b5.result')::jsonb;rollback;`);
const scenarios=JSON.parse(raw.split('\n').find(s=>s.startsWith('{')));
assert.equal(scenarios['B57-S01'].sessionCreatedWithoutRegisteredPhone,true);assert.equal(scenarios['B57-S02'].oneSubmission,true);assert.equal(scenarios['B57-S02'].reportsBeforeReview,0);assert.equal(scenarios['B57-S03'].identicalReplayRejected,true);assert.equal(scenarios['B57-S03'].oneSubmission,true);assert.equal(scenarios['B57-S04'].foreignPurposePayloadStored,true);assert.equal(scenarios['B57-S05'].expiredRejected,true);assert.equal(scenarios['B57-S06'].sameReport,true);assert.equal(scenarios['B57-S06'].repeatReturnsActualStatus,'confirmed');assert.equal(scenarios['B57-S06'].reportsAfterReview,1);assert.equal(scenarios['B57-S06'].ledgerRows,0);assert.equal(scenarios['B57-S07'].revokedRejected,true);
const report={recordedAt:new Date().toISOString(),method:'Local current SQL, owner-created synthetic patients; session/review with actual Auth claims, exchange with simulated service. Rollback, no Meta publication/delivery.',scenarios,rollback:true,externalCalls:0};writeFileSync(new URL('b57-flow-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(report);
