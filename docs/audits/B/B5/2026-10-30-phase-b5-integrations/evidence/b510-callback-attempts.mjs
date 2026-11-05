/* Local current SQL, new synthetic outbox rows in rollback. Provider statuses
 * are simulated; no message is sent. New lease assignment is fixture setup,
 * not a replay of the global claim queue. */
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {localActor,sql,lit} from './local-actor.mjs';
const actor=await localActor();
const raw=sql(`begin;set local statement_timeout='15s';
do $b5$ declare p uuid:=gen_random_uuid();d uuid:=gen_random_uuid();a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();w uuid:=gen_random_uuid();oldref text:='B5-old-'||gen_random_uuid();newref text:='B5-new-'||gen_random_uuid();cleanref text:='B5-clean-'||gen_random_uuid();lost boolean:=false;outcome jsonb;begin
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 insert into public.care_recipients(id,display_name,is_development) values(p,'Paciente fictício B5 callbacks por tentativa',true);
 insert into public.care_recipient_memberships(care_recipient_id,user_id,role) values(p,${lit(actor.id)},'admin');
 insert into public.operational_documents(id,care_recipient_id,type,status,created_by,idempotency_key) values(d,p,'REQ','submitted',${lit(actor.id)},gen_random_uuid());
 insert into public.requisition_notifications(id,care_recipient_id,document_id,recipient_user_id,recipient_group,recipient_label,channel,state,attempts,event_key,provider_reference)
 values(a,p,d,${lit(actor.id)},'other','Pessoa fictícia B5','whatsapp','failed',1,'req.reminder',oldref),
 (b,p,d,${lit(actor.id)},'other','Pessoa fictícia B5','whatsapp','processing',1,'req.reminder',null);
 perform set_config('request.jwt.claims',${lit(JSON.stringify(actor.claims))},true);perform public.select_active_context(p);perform public.retry_notification_job(a,false);
 outcome:=jsonb_build_object('B510-S01',jsonb_build_object('referenceRetained',(select provider_reference=oldref from public.requisition_notifications where id=a),'state',(select state from public.requisition_notifications where id=a)));
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 update public.requisition_notifications set state='processing',attempts=1,leased_by=w,lease_expires_at=now()+interval '2 minutes' where id in(a,b);
 perform public.notification_webhook(oldref,'accepted',a);
 begin perform public.complete_notification_job(a,w,'accepted',newref);exception when others then lost:=sqlerrm='notification lease lost';end;
 outcome:=outcome||jsonb_build_object('B510-S02',jsonb_build_object('oldCallbackEndedNewLease',(select state='accepted' and leased_by is null from public.requisition_notifications where id=a),'newCompletionRefused',lost));
 perform public.notification_webhook(newref,'delivered',a);
 outcome:=outcome||jsonb_build_object('B510-S03',jsonb_build_object('newCallbackIgnored',(select state='accepted' and provider_reference=oldref and delivered_at is null from public.requisition_notifications where id=a)));
 perform public.notification_webhook(cleanref,'delivered',b);
 outcome:=outcome||jsonb_build_object('B510-S04',jsonb_build_object('cleanOpaqueCorrelationWorks',(select state='delivered' and provider_reference=cleanref from public.requisition_notifications where id=b)));
 perform set_config('b5.result',outcome::text,true);
end;$b5$;select current_setting('b5.result')::jsonb;rollback;`);
const scenarios=JSON.parse(raw.split('\n').find(x=>x.startsWith('{')));
assert.equal(scenarios['B510-S01'].referenceRetained,true);assert.equal(scenarios['B510-S01'].state,'pending');assert(Object.values(scenarios['B510-S02']).every(Boolean));assert.equal(scenarios['B510-S03'].newCallbackIgnored,true);assert.equal(scenarios['B510-S04'].cleanOpaqueCorrelationWorks,true);
const result={recordedAt:new Date().toISOString(),method:'Current local SQL; retry with actual Auth claims; callback with simulated service. Four checkpoints in one new rollback fixture; no real provider sequence or send claimed.',scenarios,rollback:true,externalSending:false};writeFileSync(new URL('b510-callback-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');console.log(result);
