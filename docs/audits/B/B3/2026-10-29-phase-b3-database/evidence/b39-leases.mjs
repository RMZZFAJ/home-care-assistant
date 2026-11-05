/* LOCAL ROLLBACK ONLY. Synthetic outbox states; no HTTP provider/worker invocation. */
import {actor,state,recorder,sql,sqlLiteral as lit,assert} from './local-harness.mjs';
const audit=recorder('B3.9s',{resume:true});audit.result.method='Local rollback SQL with synthetic outbox fixtures and simulated service context. Retry uses an actual B3 Auth session. No external delivery.';
const admin=await actor('admin'),session=(await admin.auth.getSession()).data.session,claims=JSON.parse(Buffer.from(session.access_token.split('.')[1],'base64url').toString()),patient=state.patient,doc=state.objects.lifecycleReq.id;
const run=body=>{const text=sql(`begin;select set_config('request.jwt.claims','{"role":"service_role"}',true) is not null;do $b3$ ${body} $b3$;select current_setting('b3.result')::jsonb;rollback;`);return JSON.parse(text.split('\n').find(x=>x.startsWith('{')));};
const notification=(id,channel,status,user,lease)=>`insert into public.requisition_notifications(id,care_recipient_id,document_id,recipient_user_id,recipient_group,recipient_label,channel,state,attempts,event_key,next_attempt_at,leased_by,lease_expires_at) values(${id},${lit(patient)},${lit(doc)},${lit(user)},'family','Pessoa fictícia B3 worker',${lit(channel)},${lit(status)},1,'req.reminder','1900-01-01',${lease});`;
await audit.scenario('B39-05','Lease vencido diferencia interno recuperável de externo incerto; retry exige conciliação',async()=>{
 const result=run(`declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();c uuid:=gen_random_uuid();w uuid:=gen_random_uuid();w2 uuid:=gen_random_uuid();rejected boolean:=false;wrong_worker boolean:=false;claimed integer;before_retry text;internal_state text;external_state text;revoked_state text;begin
 ${notification('a','internal','processing',state.actors.family.id,"w,now()-interval '1 minute'")}
 ${notification('b','whatsapp','processing',state.actors.family.id,"w,now()-interval '1 minute'")}
 ${notification('c','internal','pending',state.actors.departing_admin.id,'null,null')}
 select count(*) into claimed from public.claim_notification_jobs(100,w2,false);
 select state into internal_state from public.requisition_notifications where id=a;select state into external_state from public.requisition_notifications where id=b;select state into revoked_state from public.requisition_notifications where id=c;
 begin perform public.complete_notification_job(a,w,'delivered');exception when others then wrong_worker:=sqlerrm='notification lease lost';end;
 perform public.complete_notification_job(a,w2,'delivered');
 perform set_config('request.jwt.claims',${lit(JSON.stringify(claims))},true);
 begin perform public.retry_notification_job(b,false);exception when others then rejected:=sqlerrm='uncertain notification requires explicit reconciliation confirmation';end;
 select state into before_retry from public.requisition_notifications where id=b;perform public.retry_notification_job(b,true);
 perform set_config('b3.result',jsonb_build_object('internalAfterExpiryAndClaim',internal_state,'externalAfterExpiry',external_state,'revokedRecipient',revoked_state,'wrongWorkerRejected',wrong_worker,'internalCompleted',(select state from public.requisition_notifications where id=a),'uncertainRetryWithoutConfirmationRejected',rejected,'beforeConfirmedRetry',before_retry,'afterConfirmedRetry',(select state from public.requisition_notifications where id=b),'attemptsAfterRetry',(select attempts from public.requisition_notifications where id=b),'externalSending',false)::text,true);end;`);
 assert.equal(result.internalAfterExpiryAndClaim,'processing');assert.equal(result.externalAfterExpiry,'uncertain');assert.equal(result.revokedRecipient,'cancelled');assert.equal(result.wrongWorkerRejected,true);assert.equal(result.internalCompleted,'delivered');assert.equal(result.uncertainRetryWithoutConfirmationRejected,true);assert.equal(result.afterConfirmedRetry,'pending');assert.equal(result.attemptsAfterRetry,0);return result;
});
await audit.scenario('B39-06','Callback adiantado ou repetido não é sobrescrito pela conclusão atrasada do worker',async()=>{
 const result=run(`declare a uuid:=gen_random_uuid();w uuid:=gen_random_uuid();ref text:='B3-synthetic-'||gen_random_uuid();late boolean:=false;begin
 ${notification('a','whatsapp','processing',state.actors.family.id,"w,now()+interval '2 minutes'")}
 perform public.notification_webhook(ref,'read',a);perform public.notification_webhook(ref,'read',a);perform public.notification_webhook(ref,'delivered',a);perform public.notification_webhook(ref,'accepted',a);
 begin perform public.complete_notification_job(a,w,'accepted',ref);exception when others then late:=sqlerrm='notification lease lost';end;
 perform set_config('b3.result',jsonb_build_object('finalState',(select state from public.requisition_notifications where id=a),'lateCompletionRefused',late,'rows',(select count(*) from public.requisition_notifications where id=a),'seenAtStillIndependent',(select seen_at is null from public.requisition_notifications where id=a),'method','SQL callback contract; no provider signature/delivery claimed')::text,true);end;`);
 assert.equal(result.finalState,'read');assert.equal(result.lateCompletionRefused,true);assert.equal(result.rows,1);assert.equal(result.seenAtStillIndependent,true);return result;
});
await audit.scenario('B39-07','Registro legado malformado aborta lote inteiro; atomicidade não é garantia de progresso',async()=>{
 const result=run(`declare p uuid:=gen_random_uuid();r uuid:=gen_random_uuid();before_health timestamptz;failures integer:=0;i integer;begin
 insert into public.care_recipients(id,display_name,is_development) values(p,'Paciente fictício B3 poison job',true);insert into public.care_recipient_products(care_recipient_id,product_id,name,category,unit) values(p,'fralda','Material sintético B3','higiene','unidade');
 insert into public.operational_documents(id,care_recipient_id,type,status,created_by,idempotency_key) values(r,p,'REQ','submitted',${lit(state.actors.admin.id)},gen_random_uuid());
 insert into public.requisitions(id,protocol,care_recipient_id,created_by,status,idempotency_key) values(r,'REQ-19800101-'||upper(replace(r::text,'-','')),p,${lit(state.actors.admin.id)},'submitted',gen_random_uuid());
 insert into public.requisition_items(requisition_id,product_id,current_stock,urgent) values(r,'fralda',0,false);
 insert into public.requisition_lifecycle(requisition_id,care_recipient_id,policy,eligible_users,next_reminder_at) values(r,p,'{"scienceRequired":true,"reminderRepeatHours":"B3-invalid-legacy"}',array[${lit(state.actors.admin.id)}::uuid],'1980-01-01');select last_run into before_health from private.scheduler_health where singleton;
 for i in 1..3 loop begin perform public.run_operational_schedule();exception when invalid_text_representation then failures:=failures+1;end;end loop;
 perform set_config('b3.result',jsonb_build_object('failedRuns',failures,'healthDidNotAdvance',before_health is not distinct from (select last_run from private.scheduler_health where singleton),'reminderEventsPersisted',(select count(*) from public.document_events where document_id=r),'scope','Owner-created malformed legacy-policy fixture only; public configuration validates this field and does not accept it; rollback')::text,true);end;`);
 assert.equal(result.failedRuns,3);assert.equal(result.healthDidNotAdvance,true);assert.equal(result.reminderEventsPersisted,0);return result;
});audit.finish();
