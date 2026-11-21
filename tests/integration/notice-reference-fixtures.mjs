import {randomUUID} from "node:crypto";
import {setup,actor,rpc,fixtures} from "./v4-fixtures.mjs";
import {balanceSetup,shiftCommand,dayOffset} from "./shift-fixtures.mjs";
import {sql,sqlLiteral} from "../../scripts/test-environment.mjs";
export function shiftReminder(f,owner=f.pro.id,future=false){
 const id=randomUUID();sql(`insert into public.operational_reminders(id,care_recipient_id,user_id,kind,period,expected_at) values(${sqlLiteral(id)},${sqlLiteral(f.patient)},${sqlLiteral(owner)},'shift',(now() at time zone 'America/Sao_Paulo')::date+${future?1:0},now()+interval '${future?"1 day":"-1 hour"}');select private.enqueue_notice(${sqlLiteral(f.patient)},${sqlLiteral(owner)},'shift.reminder',p_reminder=>${sqlLiteral(id)});`);return id;
}
export async function personalReminderFixture(){const f=await setup(),pro={id:fixtures.professional.id,email:fixtures.professional.email,client:await actor("professional",f.patient)},personal={...f,pro};return {...personal,reminder:shiftReminder(personal)};}
export async function referenceFixture(){
 const f=await balanceSetup(),day=dayOffset(f.today,60),series=await shiftCommand(f.admin,f.patient,"series",{professionalId:f.pro.id,shiftTypeId:f.type.id,timezone:"America/Manaus",recurrence:"weekly",weekdays:[new Date(day+"T12:00:00Z").getUTCDay()],anchorDate:day,validUntil:day,notes:"Referência futura fictícia do aviso"});
 const schedule=await rpc(f.pro.client,"schedule_workspace",{p_patient:f.patient,p_from:day,p_until:dayOffset(day,1)}),shift=schedule.shifts.find(s=>s.series_id===series.id);
 if(!shift)throw new Error("Future shift fixture missing");
 await shiftCommand(f.admin,f.patient,"change",{id:shift.id,professionalId:f.pro.id,startsAt:shift.starts_at,endsAt:shift.ends_at,notes:"Nota futura própria do aviso",reason:"Alteração fictícia para referência individual"},shift.version);
 const scheduleRef=sql(`select r.id from public.operational_reminders r join public.shift_events e on e.id=r.shift_event_id where r.care_recipient_id=${sqlLiteral(f.patient)} and r.user_id=${sqlLiteral(f.pro.id)} and e.shift_id=${sqlLiteral(shift.id)} and e.action='schedule.change' order by e.created_at desc limit 1;`),balanceRef=sql(`select id from public.operational_reminders where care_recipient_id=${sqlLiteral(f.patient)} and user_id=${sqlLiteral(f.pro.id)} and kind='bal_cycle' order by created_at,id limit 1;`);
 sql(`insert into public.stock_alert_rules(care_recipient_id,product_id,location,low_threshold,critical_threshold,is_enabled) values(${sqlLiteral(f.patient)},${sqlLiteral(f.products[0])},'CARE_TEAM',1,0,true);select public.evaluate_stock_alert(${sqlLiteral(f.patient)},${sqlLiteral(f.products[0])},'CARE_TEAM');`);
 const alert=sql(`select id from public.stock_alert_events where care_recipient_id=${sqlLiteral(f.patient)} and product_id=${sqlLiteral(f.products[0])} and location='CARE_TEAM' and state='open';`),legacyBalance=randomUUID();
 sql(`insert into public.operational_reminders(id,care_recipient_id,user_id,kind,period,expected_at) values(${sqlLiteral(legacyBalance)},${sqlLiteral(f.patient)},${sqlLiteral(f.pro.id)},'bal',(now() at time zone 'America/Sao_Paulo')::date-14,now()-interval '14 days');`);
 return {...f,day,shift,scheduleRef,balanceRef,alert,legacyBalance,reminder:shiftReminder(f)};
}
export const reference=(client,patient,id,area,namespace="auto")=>rpc(client,"notification_reference",{p_patient:patient,p_ref:id,p_area:area,p_namespace:namespace});
export const reminderState=(f,id=f.reminder)=>sql(`select jsonb_build_object('reminder',(select to_jsonb(r) from public.operational_reminders r where id=${sqlLiteral(id)}),'notices',(select jsonb_agg(jsonb_build_object('id',id,'seen_at',seen_at) order by id) from public.requisition_notifications where reminder_id=${sqlLiteral(id)}),'reports',(select jsonb_agg(to_jsonb(c) order by id) from public.consumption_reports c where source_reminder_id=${sqlLiteral(id)}),'stock',(select jsonb_agg(to_jsonb(m) order by id) from public.stock_movements m where care_recipient_id=${sqlLiteral(f.patient)}),'audit',(select jsonb_agg(to_jsonb(a) order by id) from public.audit_events a where entity_id=${sqlLiteral(id)}));`);
export {actor,rpc,fixtures,sql,sqlLiteral};
