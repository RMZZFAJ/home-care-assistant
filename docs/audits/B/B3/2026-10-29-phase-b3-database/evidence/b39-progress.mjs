/* LOCAL ROLLBACK ONLY. New synthetic SQL fixtures; service scheduler logic, no provider. */
import {state,recorder,sql,sqlLiteral as lit,assert} from './local-harness.mjs';
const audit=recorder('B3.9',{resume:true}),creator=state.actors.admin.id,user=state.actors.professional.id;
audit.result.method='Local PostgreSQL transactions; NEW synthetic SQL fixtures; service-role context simulation; full rollback. Not HTTP/Auth permission validation.';
const run=body=>{const text=sql(`begin;select set_config('request.jwt.claims','{"role":"service_role"}',true) is not null;do $b3$ ${body} $b3$;select current_setting('b3.result')::jsonb;rollback;`);return JSON.parse(text.split('\n').find(x=>x.startsWith('{')));};
function requestFixture(patient,id,cancelled,due){return `insert into public.operational_documents(id,care_recipient_id,type,status,created_by,idempotency_key,payload) values(${id},${patient},'REQ',${cancelled?"'cancelled'":"'submitted'"},${lit(creator)},gen_random_uuid(),'{}');
 insert into public.requisitions(id,protocol,care_recipient_id,created_by,status,idempotency_key,is_historical) values(${id},'REQ-20000101-'||upper(replace(${id}::text,'-','')),${patient},${lit(creator)},${cancelled?"'cancelled'":"'submitted'"},gen_random_uuid(),false);
 insert into public.requisition_items(requisition_id,product_id,current_stock,urgent,product_name_snapshot,unit_snapshot,snapshot_source) values(${id},'fralda',0,false,'Material sintético B3','unidade','persisted');
 insert into public.requisition_lifecycle(requisition_id,care_recipient_id,policy,eligible_users,next_reminder_at) values(${id},${patient},'{"scienceRequired":true,"scienceRequirement":"any","scienceAutomatic":false,"reminderRepeatHours":24,"archiveDays":7}',array[${lit(creator)}::uuid],${due});`;}
await audit.scenario('B39-01','25 pacientes cancelados bloqueiam outro paciente por execuções sucessivas: DB-002',async()=>{
 const result=run(`declare p uuid;rid uuid;target uuid;blocked uuid[]:='{}';outcomes jsonb:='[]';v jsonb;i integer;begin
 for i in 1..26 loop p:=gen_random_uuid();rid:=gen_random_uuid();insert into public.care_recipients(id,display_name,is_development) values(p,'Paciente fictício B3 lote25 '||i,true);
 insert into public.care_recipient_products(care_recipient_id,product_id,name,category,unit) values(p,'fralda','Material sintético B3','higiene','unidade');
 if i<=25 then blocked:=array_append(blocked,rid);${requestFixture('p','rid',true,"'2000-01-01'::timestamptz+make_interval(secs=>i)")}
 else target:=rid;${requestFixture('p','rid',false,"'2001-01-01'::timestamptz")}
 end if;end loop;
 for i in 1..3 loop v:=public.run_operational_schedule();outcomes:=outcomes||jsonb_build_array(jsonb_build_object('run',i,'targetReminderEvents',(select count(*) from public.document_events where document_id=target and action='req.reminder'),'scheduler',v));end loop;
 update public.requisition_lifecycle set next_reminder_at=now()+interval '24 hours' where requisition_id=any(blocked);
 v:=public.run_operational_schedule();perform set_config('b3.result',jsonb_build_object('runs',outcomes,'targetAfterControl',(select count(*) from public.document_events where document_id=target and action='req.reminder'),'controlScheduler',v,'control','Only NEW cancelled fixture candidates moved out of due selection; entire transaction rolled back')::text,true);end;`);
 assert.ok(result.runs.every(r=>r.targetReminderEvents===0));assert.equal(result.targetAfterControl,1);return result;
});
await audit.scenario('B39-02','Um paciente com100 canceladas também esgota o limite interno e bloqueia trabalho elegível',async()=>{
 const result=run(`declare p uuid:=gen_random_uuid();rid uuid;target uuid;blocked uuid[]:='{}';outcomes jsonb:='[]';i integer;begin
 insert into public.care_recipients(id,display_name,is_development) values(p,'Paciente fictício B3 lote100 interno',true);insert into public.care_recipient_products(care_recipient_id,product_id,name,category,unit) values(p,'fralda','Material sintético B3','higiene','unidade');
 for i in 1..101 loop rid:=gen_random_uuid();if i<=100 then blocked:=array_append(blocked,rid);${requestFixture('p','rid',true,"'1990-01-01'::timestamptz+make_interval(secs=>i)")}else target:=rid;${requestFixture('p','rid',false,"'1991-01-01'::timestamptz")}end if;end loop;
 for i in 1..3 loop perform public.run_operational_schedule();outcomes:=outcomes||jsonb_build_array(jsonb_build_object('run',i,'eligibleEvents',(select count(*) from public.document_events where document_id=target and action='req.reminder')));end loop;
 update public.requisition_lifecycle set next_reminder_at=now()+interval '24 hours' where requisition_id=any(blocked);perform public.run_operational_schedule();perform set_config('b3.result',jsonb_build_object('runs',outcomes,'afterControl',(select count(*) from public.document_events where document_id=target and action='req.reminder'),'scope','Inner100 limit; one synthetic patient; rollback')::text,true);end;`);
 assert.ok(result.runs.every(r=>r.eligibleEvents===0));assert.equal(result.afterControl,1);return result;
});
await audit.scenario('B39-03','Lembretes legados sem cursor ficam presos no mesmo lote100: DB-006 agora reproduzido',async()=>{
 const result=run(`declare p uuid;target uuid;blockers uuid[]:='{}';outcomes jsonb:='[]';i integer;begin
 for i in 1..111 loop p:=gen_random_uuid();insert into public.care_recipients(id,display_name,is_development) values(p,'Paciente fictício B3 lembrete legado '||i,true);
 if i<=110 then blockers:=array_append(blockers,p);insert into public.patient_settings(care_recipient_id,settings) values(p,'{"balReminderUsers":[]}');
 else target:=p;insert into public.care_recipient_memberships(care_recipient_id,user_id,role) values(p,${lit(user)},'professional');insert into public.patient_settings(care_recipient_id,settings) values(p,jsonb_build_object('shiftReminder',jsonb_build_object('enabled',true,'hour',0,'days',jsonb_build_array('0','1','2','3','4','5','6'),'userIds',jsonb_build_array(${lit(user)}))));end if;end loop;
 for i in 1..3 loop perform private.enqueue_scheduled_reminders();outcomes:=outcomes||jsonb_build_array(jsonb_build_object('run',i,'targetReminders',(select count(*) from public.operational_reminders where care_recipient_id=target and kind='shift')));end loop;
 update public.patient_settings set settings='{}' where care_recipient_id=any(blockers);perform private.enqueue_scheduled_reminders();perform set_config('b3.result',jsonb_build_object('runs',outcomes,'afterControl',(select count(*) from public.operational_reminders where care_recipient_id=target and kind='shift'),'control','Only NEW empty settings removed from qualifying fixture selection; rollback')::text,true);end;`);
 assert.ok(result.runs.every(r=>r.targetReminders===0));assert.equal(result.afterControl,1);return result;
});
await audit.scenario('B39-04','BAL rotativo alcança101 regimes e repetição não duplica obrigações',async()=>{
 const result=run(`declare p uuid;t uuid;ids uuid[]:='{}';first_count integer;second_count integer;third_count integer;old_cursor uuid;after_cursor uuid;before_fault integer;i integer;begin
 for i in 1..101 loop p:=gen_random_uuid();t:=gen_random_uuid();ids:=array_append(ids,p);insert into public.care_recipients(id,display_name,is_development) values(p,'Paciente fictício B3 rotação BAL '||i,true);
 insert into public.shift_types(id,care_recipient_id,name,starts_local,duration_minutes,created_by) values(t,p,'Tipo fictício B3','00:00',60,${lit(creator)});
 insert into public.bal_regimes(care_recipient_id,enabled,timezone,weekday,shift_type_id,starts_on,activated_at,updated_by) values(p,true,'America/Sao_Paulo',extract(dow from now() at time zone 'America/Sao_Paulo')::integer,t,(now() at time zone 'America/Sao_Paulo')::date,now(),${lit(creator)});end loop;
 perform public.run_operational_schedule();select count(*) into first_count from public.bal_obligations where care_recipient_id=any(ids);
 perform public.run_operational_schedule();select count(*) into second_count from public.bal_obligations where care_recipient_id=any(ids);
 perform public.run_operational_schedule();select count(*) into third_count from public.bal_obligations where care_recipient_id=any(ids);
 select last_patient into old_cursor from private.bal_scheduler_progress where singleton;select count(*) into before_fault from public.bal_cycle_events where care_recipient_id=any(ids);
 begin perform public.run_operational_schedule();raise exception 'B3 intentional post-batch rollback';exception when raise_exception then if sqlerrm<>'B3 intentional post-batch rollback' then raise;end if;end;
 select last_patient into after_cursor from private.bal_scheduler_progress where singleton;
 perform set_config('b3.result',jsonb_build_object('afterFirst',first_count,'afterSecond',second_count,'afterThird',third_count,'cursorPreservedAfterFailure',old_cursor is not distinct from after_cursor,'eventsPreservedAfterFailure',before_fault=(select count(*) from public.bal_cycle_events where care_recipient_id=any(ids)),'scope','101 NEW regimes in rollback; no scheduled professional/presence fabricated')::text,true);end;`);
 assert.ok(result.afterFirst<101);assert.equal(result.afterSecond,101);assert.equal(result.afterThird,101);assert.equal(result.cursorPreservedAfterFailure,true);assert.equal(result.eventsPreservedAfterFailure,true);return result;
});audit.finish();
