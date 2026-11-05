CREATE OR REPLACE FUNCTION public.v3_operational_tasks(p_patient uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s jsonb;due date;today date:=(now() at time zone 'America/Sao_Paulo')::date;begin
 if not public.can_access_recipient(p_patient) then raise exception 'patient permission required' using errcode='42501';end if;
 select settings into s from public.patient_settings where care_recipient_id=p_patient;
 if s->>'balDay' is not null then due:=today-((extract(dow from today)::integer-(s->>'balDay')::integer+7)%7);end if;
 return jsonb_build_object('requests',(select count(*) from public.requisitions r where care_recipient_id=p_patient and status not in ('cancelled','draft') and exists(select 1 from public.requisition_items i where requisition_id=r.id and not exists(select 1 from public.document_request_links k join public.document_lines l on l.id=k.document_line_id join public.operational_documents d on d.id=l.document_id where k.requisition_item_id=i.id and d.type='ENT' and d.status<>'cancelled' and l.accepted_quantity>0))),
 'balDay',s->'balDay','balDue',due,'balOverdue',due is not null and not exists(select 1 from public.operational_documents where care_recipient_id=p_patient and type='BAL' and status='approved' and (created_at at time zone 'America/Sao_Paulo')::date>=due),
 'drafts',(select count(*) from public.operational_documents where care_recipient_id=p_patient and status='draft' and created_by=auth.uid()),
 'consumptionPending',(select count(*) from public.consumption_reports where care_recipient_id=p_patient and status='reported' and case when location='FAMILY' then private.can(p_patient,'stock.family.manage') else private.can(p_patient,'consumption.confirm') end));
end;$function$
