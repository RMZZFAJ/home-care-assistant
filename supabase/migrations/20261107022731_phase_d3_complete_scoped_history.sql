-- SQL NULL must never mean an unlimited document page. Preserve the existing
-- document/status model and its authorization, defaults and public signature.
alter function public.operational_document_list(uuid,text,text,text,timestamptz,timestamptz,integer,integer) rename to phase_d3_pre_bounded_document_list;
revoke all on function public.phase_d3_pre_bounded_document_list(uuid,text,text,text,timestamptz,timestamptz,integer,integer) from public,anon,authenticated,service_role;
create function public.operational_document_list(p_patient uuid,p_type text default null,p_status text default null,p_search text default null,p_from timestamptz default null,p_to timestamptz default null,p_page integer default 1,p_size integer default 20) returns jsonb
language plpgsql stable security definer set search_path='' as $$begin
 if not public.can_access_recipient(p_patient) then raise exception 'patient operating context required' using errcode='42501';end if;
 if p_page is null or p_page not between 1 and 100000 or p_size is null or p_size not between 1 and 100 then raise exception 'invalid document page' using errcode='22023';end if;
 return public.phase_d3_pre_bounded_document_list(p_patient,p_type,p_status,p_search,p_from,p_to,p_page,p_size);
end;$$;

create index audit_events_patient_page on public.audit_events((metadata->>'care_recipient_id'),created_at desc,id desc);
create function public.patient_audit_page(p_patient uuid,p_query text default '',p_reference uuid default null,p_action text default null,p_entity_type text default null,p_from timestamptz default null,p_to timestamptz default null,p_page integer default 1,p_size integer default 20) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;begin
 if not private.can(p_patient,'audit.read') then raise exception 'patient audit authorization required' using errcode='42501';end if;
 if p_page is null or p_page not between 1 and 100000 or p_size is null or p_size not between 1 and 100
  or p_query is null or length(p_query)>160 or length(p_action)>160 or length(p_entity_type)>80
  or p_from is not null and p_to is not null and p_from>=p_to then raise exception 'invalid audit filter' using errcode='22023';end if;
 with visible as materialized (
  select a.*,p.full_name actor_name_current from public.audit_events a left join public.profiles p on p.id=a.actor_id
   where a.metadata->>'care_recipient_id'=p_patient::text
 ), matching as materialized (
  select * from visible a where (p_reference is null or a.id=p_reference or a.entity_id=p_reference)
   and (p_action is null or a.action=p_action) and (p_entity_type is null or a.entity_type=p_entity_type)
   and (p_from is null or a.created_at>=p_from) and (p_to is null or a.created_at<p_to)
   and (btrim(p_query)='' or strpos(lower(a.action||' '||a.entity_type||' '||coalesce(a.actor_name_current,'')),lower(btrim(p_query)))>0)
 ), page_rows as (
  select * from matching order by created_at desc,id desc limit p_size offset ((p_page::bigint-1)*p_size)
 ) select jsonb_build_object('data',coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc,a.id desc) from page_rows a),'[]'::jsonb),
  'total',(select count(*) from matching),'page',p_page,'pageSize',p_size,
  'actions',coalesce((select jsonb_agg(action order by action) from (select distinct action from visible) v),'[]'::jsonb),
  'entityTypes',coalesce((select jsonb_agg(entity_type order by entity_type) from (select distinct entity_type from visible) v),'[]'::jsonb)) into result;
 return result;
end;$$;
revoke all on function public.operational_document_list(uuid,text,text,text,timestamptz,timestamptz,integer,integer),public.patient_audit_page(uuid,text,uuid,text,text,timestamptz,timestamptz,integer,integer) from public,anon,authenticated,service_role;
grant execute on function public.operational_document_list(uuid,text,text,text,timestamptz,timestamptz,integer,integer),public.patient_audit_page(uuid,text,uuid,text,text,timestamptz,timestamptz,integer,integer) to authenticated;
