-- Expose science as an independent fact; keep filtering and the authorized,
-- bounded list intact. No delivery/quantity/stock action is inferred here.
create or replace function public.operational_document_list(p_patient uuid,p_type text default null,p_status text default null,p_search text default null,p_from timestamptz default null,p_to timestamptz default null,p_page integer default 1,p_size integer default 20) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb; rows jsonb;
begin
 if not public.can_access_recipient(p_patient) then raise exception 'patient operating context required' using errcode='42501';end if;
 if p_page is null or p_page not between 1 and 100000 or p_size is null or p_size not between 1 and 100 then raise exception 'invalid document page' using errcode='22023';end if;
 result:=public.phase_d3_pre_bounded_document_list(p_patient,p_type,p_status,p_search,p_from,p_to,p_page,p_size);
 select coalesce(jsonb_agg(item.value || case when item.value->>'type'='REQ' then jsonb_build_object('requisitionState',jsonb_build_object(
  'serviceStatus',case when r.is_historical then 'historical' when item.value->>'status' in ('cancelled','archived') then item.value->>'status'
   when lifecycle.archived_at is not null then 'archived' when lifecycle.completed_at is not null then 'completed'
   when coalesce((item.value#>>'{fulfillment,fulfilled}')::integer,0)>0 or coalesce((item.value#>>'{fulfillment,partial}')::integer,0)>0 then 'fulfillment_partial' else 'awaiting_fulfillment' end,
  'scienceState',case when r.is_historical then 'unavailable' when private.family_science_recorded(r.id) then 'recorded'
   when lifecycle.policy->>'scienceRequired'='false' then 'waived' else 'pending' end)) else '{}'::jsonb end order by item.ordinality),'[]'::jsonb)
 into rows from jsonb_array_elements(result->'data') with ordinality item(value,ordinality)
 left join public.requisitions r on r.id=(item.value->>'id')::uuid and item.value->>'type'='REQ'
 left join public.requisition_lifecycle lifecycle on lifecycle.requisition_id=r.id;
 return jsonb_set(result,'{data}',rows);
end;$$;
revoke all on function public.operational_document_list(uuid,text,text,text,timestamptz,timestamptz,integer,integer) from public,anon,service_role;
grant execute on function public.operational_document_list(uuid,text,text,text,timestamptz,timestamptz,integer,integer) to authenticated;
notify pgrst,'reload schema';
