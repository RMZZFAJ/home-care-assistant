import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {setup} from "./v4-fixtures.mjs";
import {referenceFixture,personalReminderFixture,shiftReminder,reference,reminderState,rpc,sql,sqlLiteral} from "./notice-reference-fixtures.mjs";
import {whileAdvisoryWaits} from "./lock-barrier.mjs";
const ack=(f,key=randomUUID())=>({p_patient:f.patient,p_ref:f.reminder,p_key:key});
const report=(f,key=randomUUID())=>({p_patient:f.patient,p_reminder:f.reminder,p_kind:"shortage",p_location:"CARE_TEAM",p_text:"Ocorrência fictícia declarada para o lembrete original",p_lines:[],p_key:key});

test("notice references locate real future schedule, BAL event, stock alert and old balance reminder without effects",async()=>{
 const f=await referenceFixture(),before=reminderState(f);
 const schedule=await reference(f.pro.client,f.patient,f.scheduleRef,"schedule");assert.equal(schedule.referenceDay,f.day);assert.equal(schedule.shiftId,f.shift.id);assert.equal(schedule.current.timezone,"America/Manaus");assert.equal(schedule.originalTimezone,"America/Manaus");assert.equal(schedule.action,"schedule.change");assert.match(schedule.current.professionalName,/fictício/);
 const balance=await reference(f.pro.client,f.patient,f.balanceRef,"balance");assert.equal(balance.kind,"balance");assert.ok(balance.eventId);assert.equal(balance.weeks.count,1);
 const alert=await reference(f.pro.client,f.patient,f.alert,"stock");assert.equal(alert.productId,f.products[0]);assert.equal(alert.location,"CARE_TEAM");assert.equal(Number(alert.currentBalance),0);
 const legacy=await reference(f.pro.client,f.patient,f.legacyBalance,"balance");assert.equal(legacy.kind,"legacy_balance");assert.ok(legacy.period);assert.equal(reminderState(f),before);
 const foreign=await setup();for(const [id,area]of [[f.scheduleRef,"schedule"],[f.balanceRef,"balance"],[f.alert,"stock"],[f.legacyBalance,"balance"]])assert.equal((await foreign.admin.rpc("notification_reference",{p_patient:foreign.patient,p_ref:id,p_area:area,p_namespace:"auto"})).error?.code,"42501");
});

test("a reminder read does not acknowledge it; only its owner records no issues once without stock, attendance or science",async()=>{
 const f=await referenceFixture(),before=reminderState(f),shiftsBefore=sql(`select jsonb_agg(to_jsonb(s) order by id) from public.scheduled_shifts s where care_recipient_id=${sqlLiteral(f.patient)};`),read=await reference(f.pro.client,f.patient,f.reminder,"consumption");assert.equal(read.kind,"shift_reminder");assert.equal(read.acknowledgedAt,null);assert.equal(reminderState(f),before);
 const manager=await reference(f.admin,f.patient,f.reminder,"consumption");assert.equal(manager.canAcknowledge,false);assert.equal((await f.admin.rpc("acknowledge_shift_reminder",ack(f))).error?.code,"42501");
 const packet=ack(f),result=await rpc(f.pro.client,"acknowledge_shift_reminder",packet),after=reminderState(f);assert.equal(result.recorded,true);assert.equal(result.reminderId,f.reminder);assert.equal(result.idempotencyKey,packet.p_key);
 assert.equal((await rpc(f.pro.client,"acknowledge_shift_reminder",packet)).replayed,true);assert.equal(reminderState(f),after);assert.equal((await rpc(f.pro.client,"acknowledge_shift_reminder",ack(f))).recorded,false);
 assert.equal(sql(`select count(*) from public.audit_events where entity_id=${sqlLiteral(f.reminder)} and action='shift.no_issues' and actor_id=${sqlLiteral(f.pro.id)};`),"1");
 assert.equal(sql(`select count(*) from public.requisition_science_events where care_recipient_id=${sqlLiteral(f.patient)};`),"0");assert.deepEqual(JSON.parse(before).stock,JSON.parse(after).stock);
 assert.equal(sql(`select jsonb_agg(to_jsonb(s) order by id) from public.scheduled_shifts s where care_recipient_id=${sqlLiteral(f.patient)};`),shiftsBefore);
 const future=shiftReminder(f,f.pro.id,true);assert.equal((await f.pro.client.rpc("acknowledge_shift_reminder",{...packet,p_ref:future,p_key:randomUUID()})).error?.code,"22023");assert.equal((await f.pro.client.rpc("acknowledge_shift_reminder",{...packet,p_ref:future})).error?.code,"23505");
});

test("an observed reminder command wait rechecks selected patient and leaves no partial receipt",async()=>{
 const f=await personalReminderFixture(),other=await setup(),packet=ack(f),before=reminderState(f);
 const response=await whileAdvisoryWaits(`d3-notice:${f.pro.id}:${packet.p_key}`,()=>f.pro.client.rpc("acknowledge_shift_reminder",packet),()=>rpc(f.pro.client,"select_active_context",{p_patient:other.patient}));
 assert.equal(response.error?.code,"42501");assert.equal(reminderState(f),before);assert.equal(sql(`select count(*) from private.phase_d3_commands where owner_id=${sqlLiteral(f.pro.id)} and idempotency_key=${sqlLiteral(packet.p_key)};`),"0");
 await rpc(f.pro.client,"select_active_context",{p_patient:f.patient});assert.equal((await rpc(f.pro.client,"acknowledge_shift_reminder",packet)).recorded,true);
});

test("saved reminder acknowledgement is readable after loss of report capability but a fresh command is denied",async()=>{
 const f=await personalReminderFixture(),packet=ack(f);await rpc(f.pro.client,"acknowledge_shift_reminder",packet);const before=reminderState(f);
 sql(`update public.care_recipient_memberships set role='reader' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(f.pro.id)};`);
 try{assert.equal((await rpc(f.pro.client,"acknowledge_shift_reminder",packet)).replayed,true);assert.equal((await f.pro.client.rpc("acknowledge_shift_reminder",ack(f))).error?.code,"42501");assert.equal(reminderState(f),before);}
 finally{sql(`update public.care_recipient_memberships set role='professional' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(f.pro.id)};`);}
});

test("report submission binds the original personal reminder atomically and never adopts a standalone report's old key",async()=>{
 const f=await personalReminderFixture(),before=JSON.parse(reminderState(f)),packet=report(f),result=await rpc(f.pro.client,"report_consumption_from_reminder",packet),state=reminderState(f);
 assert.equal(result.reminderId,f.reminder);assert.equal(sql(`select source_reminder_id from public.consumption_reports where id=${sqlLiteral(result.id)};`),f.reminder);assert.deepEqual(JSON.parse(state).stock,before.stock);
 assert.equal((await rpc(f.pro.client,"report_consumption_from_reminder",packet)).replayed,true);assert.equal(reminderState(f),state);assert.equal((await f.pro.client.rpc("report_consumption_from_reminder",{...packet,p_text:"Conteúdo diferente"})).error?.code,"23505");
 const key=randomUUID(),standalone=await rpc(f.pro.client,"report_extraordinary_consumption",{p_patient:f.patient,p_kind:"shortage",p_location:"CARE_TEAM",p_text:packet.p_text,p_lines:[],p_key:key});
 assert.equal((await f.pro.client.rpc("report_consumption_from_reminder",report(f,key))).error?.code,"23505");assert.equal(sql(`select source_reminder_id is null from public.consumption_reports where id=${sqlLiteral(standalone)};`),"t");
 const source=await reference(f.pro.client,f.patient,f.reminder,"consumption");assert.equal(source.reportCount,1);assert.equal(source.reports[0].id,result.id);
 const target=await reference(f.pro.client,f.patient,result.id,"consumption","report");assert.equal(target.sourceReminderId,f.reminder);
});

test("late report-origin failure rolls back the inner report, acknowledgement, notices and journal before same-key retry",async()=>{
 const f=await personalReminderFixture(),packet=report(f),before=reminderState(f),allReports=()=>sql(`select jsonb_agg(to_jsonb(c) order by id) from public.consumption_reports c where care_recipient_id=${sqlLiteral(f.patient)};`),reportsBefore=allReports();
 sql(`create function private.phase_d3_reference_link_fault() returns trigger language plpgsql set search_path='' as $$begin raise exception 'controlled reminder link failure' using errcode='PT499';end;$$;create trigger phase_d3_reference_link_fault before update on public.consumption_reports for each row when(new.source_reminder_id=${sqlLiteral(f.reminder)}::uuid) execute function private.phase_d3_reference_link_fault();`);
 try{assert.equal((await f.pro.client.rpc("report_consumption_from_reminder",packet)).error?.code,"PT499");assert.equal(reminderState(f),before);assert.equal(allReports(),reportsBefore);assert.equal(sql(`select count(*) from private.phase_d3_commands where owner_id=${sqlLiteral(f.pro.id)} and idempotency_key=${sqlLiteral(packet.p_key)};`),"0");}
 finally{sql("drop trigger if exists phase_d3_reference_link_fault on public.consumption_reports;drop function if exists private.phase_d3_reference_link_fault();");}
 assert.ok((await rpc(f.pro.client,"report_consumption_from_reminder",packet)).id);assert.equal((await reference(f.pro.client,f.patient,f.reminder,"consumption")).reportCount,1);
});

test("late no-issues audit failure rolls back acknowledgement and seen marks without a phantom saved result",async()=>{
 const f=await personalReminderFixture(),packet=ack(f),before=reminderState(f);
 sql(`create function private.phase_d3_reference_ack_fault() returns trigger language plpgsql set search_path='' as $$begin raise exception 'controlled reminder audit failure' using errcode='PT499';end;$$;create trigger phase_d3_reference_ack_fault before insert on public.audit_events for each row when(new.entity_id=${sqlLiteral(f.reminder)}::uuid and new.action='shift.no_issues') execute function private.phase_d3_reference_ack_fault();`);
 try{assert.equal((await f.pro.client.rpc("acknowledge_shift_reminder",packet)).error?.code,"PT499");assert.equal(reminderState(f),before);}
 finally{sql("drop trigger if exists phase_d3_reference_ack_fault on public.audit_events;drop function if exists private.phase_d3_reference_ack_fault();");}
 assert.equal((await rpc(f.pro.client,"acknowledge_shift_reminder",packet)).recorded,true);
});

test("saved reminder report replays with read rights after report authority loss and origin FK rejects another patient",async()=>{
 const f=await personalReminderFixture(),other=await personalReminderFixture(),packet=report(f);await rpc(f.pro.client,"select_active_context",{p_patient:f.patient});const result=await rpc(f.pro.client,"report_consumption_from_reminder",packet),before=reminderState(f);
 assert.throws(()=>sql(`update public.consumption_reports set source_reminder_id=${sqlLiteral(other.reminder)} where id=${sqlLiteral(result.id)};`),/consumption_reminder_patient_fk/);assert.equal(reminderState(f),before);
 sql(`update public.care_recipient_memberships set role='reader' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(f.pro.id)};`);
 try{assert.equal((await rpc(f.pro.client,"report_consumption_from_reminder",packet)).replayed,true);assert.equal((await f.pro.client.rpc("report_consumption_from_reminder",report(f))).error?.code,"42501");assert.equal(reminderState(f),before);}
 finally{sql(`update public.care_recipient_memberships set role='professional' where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(f.pro.id)};`);}
});

test("reference RPCs close helper, anonymous, service and direct write access and reject explicit null kind",async()=>{
 const f=await personalReminderFixture();assert.equal((await f.pro.client.rpc("notification_reference",{p_patient:f.patient,p_ref:f.reminder,p_area:null,p_namespace:"auto"})).error?.code,"22023");
 assert.equal(sql("select bool_and(not has_function_privilege(r,p.oid,'execute')) from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join unnest(array['anon','service_role'])r where n.nspname='public' and p.proname in ('notification_reference','acknowledge_shift_reminder','report_consumption_from_reminder');"),"t");
 assert.equal(sql("select not has_function_privilege('authenticated','private.shift_reminder_for_actor(uuid,uuid)','execute') and not has_table_privilege('authenticated','public.consumption_reports','UPDATE');"),"t");
});
