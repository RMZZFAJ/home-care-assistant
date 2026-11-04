CREATE OR REPLACE FUNCTION public.operational_document_list(p_patient uuid, p_type text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_from timestamp with time zone DEFAULT NULL::timestamp with time zone, p_to timestamp with time zone DEFAULT NULL::timestamp with time zone, p_page integer DEFAULT 1, p_size integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb;begin
 if not public.can_access_recipient(p_patient) then raise exception 'patient operating context required' using errcode='42501';end if;
 if p_page not between 1 and 100000 or p_size not between 1 and 100 or p_type is not null and p_type not in ('REQ','COM','ENT','BAL') then raise exception 'invalid document filter';end if;
 with counts as materialized (
 select i.requisition_id,count(*) total,count(*) filter(where exists(select 1 from public.document_request_links k join public.document_lines l on l.id=k.document_line_id join public.operational_documents d on d.id=l.document_id where k.requisition_item_id=i.id and d.type='ENT' and d.status<>'cancelled' and l.accepted_quantity>0)) fulfilled
 from public.requisition_items i where i.care_recipient_id=p_patient group by i.requisition_id),
 visible as materialized (
 select d.id,d.type,d.code,d.protocol,d.recipient_id,d.created_at,d.version,
 case when exists(select 1 from public.requisitions r where r.id=d.id and r.is_historical) then 'historical' when d.type<>'REQ' or d.status in ('cancelled','draft') then d.status when s.archived_at is not null then 'archived'
 when s.completed_at is not null then case when private.science_satisfied(d.id) then 'completed' else 'completed_science_pending' end
 when coalesce(c.fulfilled,0)>0 then 'fulfillment_partial' when not coalesce(private.science_satisfied(d.id),false) then 'science_pending' else 'awaiting_fulfillment' end status,
 case when d.type='REQ' then jsonb_build_object('fulfilled',coalesce(c.fulfilled,0),'total',coalesce(c.total,0)) end fulfillment,
 case when d.type='REQ' then jsonb_build_object('scienceSatisfied',coalesce(private.science_satisfied(d.id),false),'completedAt',s.completed_at,'archivedAt',s.archived_at,'manualArchiveRequired',s.manual_archive_required) end progress,
 case when d.type='ENT' then coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'fully_checked',l.fully_checked,'accepted_quantity',l.accepted_quantity::text,'quantity',l.quantity::text)) from public.document_lines l where l.document_id=d.id),'[]') end document_lines
 from public.operational_documents d left join counts c on c.requisition_id=d.id left join public.requisition_lifecycle s on s.requisition_id=d.id
 where d.care_recipient_id=p_patient and private.can(p_patient,lower(d.type)||'.read') and (p_type is null or d.type=p_type)
 and (p_from is null or d.created_at>=p_from) and (p_to is null or d.created_at<p_to)
 and (p_search is null or d.code ilike '%'||p_search||'%' or d.protocol ilike '%'||p_search||'%')),
 filtered as materialized(select * from visible where p_status is null or case p_status when 'archive_pending' then private.requisition_archive_task(id) when 'science_required' then private.requisition_science_task(id,auth.uid()) else status=p_status end),
 paged as(select * from filtered order by created_at desc,id offset (p_page-1)*p_size limit p_size)
 select jsonb_build_object('data',coalesce((select jsonb_agg(to_jsonb(p) order by created_at desc,id) from paged p),'[]'),'total',(select count(*) from filtered),'page',p_page,'pageSize',p_size) into result;
 return result;
end;$function$
