CREATE OR REPLACE FUNCTION public.notification_notice_payload(p_id uuid, p_worker uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare n public.requisition_notifications;e public.stock_alert_events;r public.consumption_reports;rem public.operational_reminders;values jsonb;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' or not public.validate_notification_job(p_id,p_worker) then raise exception 'verified worker required' using errcode='42501';end if;
 select * into strict n from public.requisition_notifications where id=p_id;
 values:=jsonb_build_object('nome_destinatario',n.recipient_label,'nome_paciente',(select coalesce(nullif(s.settings->>'patientShortName',''),c.display_name) from public.care_recipients c left join public.patient_settings s on s.care_recipient_id=c.id where c.id=n.care_recipient_id));
 if n.alert_event_id is not null then
 select * into e from public.stock_alert_events where id=n.alert_event_id;
 values:=values||jsonb_build_object('nome_produto',(select name from public.care_recipient_products where care_recipient_id=e.care_recipient_id and product_id=e.product_id),'nome_local',case when e.location='FAMILY' then 'Família' else 'Equipe' end,'saldo_atual',e.balance::text,'saldo_minimo',(select low_threshold::text from public.stock_alert_rules where care_recipient_id=e.care_recipient_id and product_id=e.product_id and location=e.location),'data_hora',to_char(e.observed_at at time zone 'America/Sao_Paulo','DD/MM/YYYY "às" HH24"h"MI'));
 return jsonb_build_object('event','stock.alert','suffix',e.product_id||'&careRecipientId='||e.care_recipient_id,'values',values);
 elsif n.consumption_report_id is not null then
 select * into r from public.consumption_reports where id=n.consumption_report_id;
 values:=values||jsonb_build_object('tipo_evento',case when r.kind='shortage' then 'Falta de material' else 'Consumo extraordinário para revisão' end,'data_hora',to_char(r.created_at at time zone 'America/Sao_Paulo','DD/MM/YYYY "às" HH24"h"MI'));
 return jsonb_build_object('event','occurrence.received','suffix',r.id::text||'&careRecipientId='||r.care_recipient_id,'values',values);
 elsif n.reminder_id is not null then
 select * into rem from public.operational_reminders where id=n.reminder_id;
 values:=values||jsonb_build_object('data_prevista',to_char(rem.expected_at at time zone 'America/Sao_Paulo','DD/MM/YYYY HH24:MI'),'quantidade_itens',(select count(*)::text from public.care_recipient_products where care_recipient_id=rem.care_recipient_id and is_active),'periodo_plantao',to_char(rem.expected_at at time zone 'America/Sao_Paulo','DD/MM/YYYY HH24:MI'));
 return jsonb_build_object('event',case when rem.kind='bal' then 'bal.reminder' else 'shift.reminder' end,'suffix',rem.id::text||'&careRecipientId='||rem.care_recipient_id,'values',values);end if;
 return null;
end;$function$
