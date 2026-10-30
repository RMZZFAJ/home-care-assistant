/* LOCAL, ROLLBACK ONLY. New fixture rows; existing B4 synthetic actor logs in.
 * No old rows changed, no provider/network worker, no function replacement.
 * Service SQL context simulated; retry uses claims from an actual Auth session. */
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync } from 'node:fs';
import { actor } from '../../2026-10-30-phase-b4-backend/evidence/http-local.mjs';
import { getTestEnvironment, sql, sqlLiteral as lit } from '../../../../scripts/test-environment.mjs';
assert.equal(process.versions.node,'24.22.0');getTestEnvironment();
const proof = JSON.parse(readFileSync(new URL('backup-proof.json',import.meta.url),'utf8'));
assert.equal(proof.archiveListVerified,true);
const { client,userId } = await actor('admin');
const session = (await client.auth.getSession()).data.session;
const claims = JSON.parse(Buffer.from(session.access_token.split('.')[1],'base64url').toString());
const result = sql(`begin;
set local statement_timeout='15s';
select set_config('request.jwt.claims','{"role":"service_role"}',true) is not null;
do $b5$
declare p uuid:=gen_random_uuid();d uuid:=gen_random_uuid();a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();c uuid:=gen_random_uuid();w uuid:=gen_random_uuid();
 missing_name text:='hca_b5_missing_'||replace(gen_random_uuid()::text,'-','');
 known_name text:='hca_b5_known_'||replace(gen_random_uuid()::text,'-','');
 retry_refused boolean:=false;outcome jsonb;
begin
 insert into public.care_recipients(id,display_name,is_development) values(p,'Paciente fictício B5 queue rollback',true);
 insert into public.care_recipient_memberships(care_recipient_id,user_id,role) values(p,${lit(userId)},'admin');
 insert into public.operational_documents(id,care_recipient_id,type,status,created_by,idempotency_key)
 values(d,p,'REQ','submitted',${lit(userId)},gen_random_uuid());
 insert into public.requisition_notifications(id,care_recipient_id,document_id,recipient_user_id,recipient_group,recipient_label,channel,state,attempts,event_key,leased_by,lease_expires_at)
 select id,p,d,${lit(userId)},'other','Pessoa fictícia B5','whatsapp','processing',1,'req.reminder',w,now()+interval '2 minutes' from unnest(array[a,b,c]) id;
 perform public.complete_notification_job(a,w,'pending',null,'EVENT_TEMPLATE_NOT_CONFIGURED');
 insert into public.meta_template_versions(name,version,language,definition,approval) values(missing_name,1,'pt_BR','{"components":[]}', 'APPROVED');
 insert into public.meta_template_versions(name,version,language,definition,approval) values(known_name,1,'pt_BR','{"components":[]}', 'PREPARED');
 update public.requisition_notifications set template_name=known_name,template_version=1 where id=b;
 perform public.complete_notification_job(b,w,'pending',null,'TEMPLATE_NOT_APPROVED');
 update public.meta_template_versions set approval='APPROVED' where name=known_name;
 perform public.complete_notification_job(c,w,'uncertain',null,'PROVIDER_RESULT_UNCERTAIN');
 perform set_config('request.jwt.claims',${lit(JSON.stringify(claims))},true);
 perform public.select_active_context(p);
 begin perform public.retry_notification_job(a,false); exception when others then retry_refused:=sqlerrm='notification is not retryable';end;
 outcome:=jsonb_build_object(
  'B53-S01',jsonb_build_object('state',(select state from public.requisition_notifications where id=a),'heldInfinity',(select next_attempt_at='infinity' from public.requisition_notifications where id=a),'templateStillUnbound',(select template_name is null from public.requisition_notifications where id=a),'retryRefusedAsNotRetryable',retry_refused),
  'B53-S02',jsonb_build_object('knownTemplateReleased',(select next_attempt_at<=now() and attempts=0 and last_error is null from public.requisition_notifications where id=b)),
  'B53-S03',jsonb_build_object('state',(select state from public.requisition_notifications where id=c),'noProviderReference',(select provider_reference is null from public.requisition_notifications where id=c)));
 perform set_config('b5.result',outcome::text,true);
end;$b5$;
select current_setting('b5.result')::jsonb;
rollback;`);
const data = JSON.parse(result.split('\n').find(s=>s.startsWith('{')));
assert.deepEqual(data['B53-S01'],{state:'pending',heldInfinity:true,templateStillUnbound:true,retryRefusedAsNotRetryable:true});
assert.equal(data['B53-S02'].knownTemplateReleased,true); assert.equal(data['B53-S03'].state,'uncertain');
const report={recordedAt:new Date().toISOString(),method:'Local PostgreSQL, new owner-created synthetic fixture rows, rollback. Real B4 Auth session for retry; simulated SQL service context for completion. No Meta delivery.',scenarios:data,rollback:true,externalCalls:0};
writeFileSync(new URL('b53-queue-results.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(report);
