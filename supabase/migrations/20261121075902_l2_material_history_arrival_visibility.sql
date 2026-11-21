-- The detail, list and material history must expose the same arrivals.
-- Callers retain their existing session, resident role and com.read checks.
create function private.unlinked_arrival_visible(
  p_arrival private.unlinked_arrivals,
  p_can_review boolean,
  p_can_read_stock boolean
) returns boolean language sql stable set search_path='' as $$
  select p_arrival.submitted_by=auth.uid() or p_can_review
    or (p_arrival.state='approved' and p_can_read_stock);
$$;

revoke all on function private.unlinked_arrival_visible(private.unlinked_arrivals,boolean,boolean)
  from public,anon,authenticated,service_role;

do $migration$
declare
  detail text := pg_get_functiondef('public.read_unlinked_arrivals(uuid,uuid,timestamptz,uuid)'::regprocedure);
  history text := pg_get_functiondef('private.material_decision_history(uuid,text,uuid,integer)'::regprocedure);
  detail_predicate constant text := $old$and (submitted_by=auth.uid() or is_admin or (state='approved' and may_read_stock))$old$;
  list_predicate constant text := $old$and (a.submitted_by=auth.uid() or is_admin or (state='approved' and may_read_stock))$old$;
  access_fields constant text := $old$coalesce(public.recipient_role(p_patient)::text,'') in ('admin','family') family_arrivals$old$;
  event_predicate constant text := $old$where a.com and a.family_arrivals and item.value->>'productId'=p_product$old$;
  link_predicate constant text := $old$and (select com and family_arrivals from access)$old$;
begin
  if strpos(detail,detail_predicate)=0 or strpos(detail,list_predicate)=0
    or strpos(history,access_fields)=0 or strpos(history,event_predicate)=0
    or strpos(history,link_predicate)=0 then
    raise exception 'Unexpected unlinked arrival visibility definitions';
  end if;

  detail := replace(detail,detail_predicate,
    'and private.unlinked_arrival_visible(unlinked_arrivals,is_admin,may_read_stock)');
  detail := replace(detail,list_predicate,
    'and private.unlinked_arrival_visible(a,is_admin,may_read_stock)');
  execute detail;

  history := replace(history,access_fields,access_fields||$new$,
      public.recipient_role(p_patient)='admin' and private.can(p_patient,'com.validate') family_arrival_reviewer$new$);
  history := replace(history,event_predicate,event_predicate||$new$
      and private.unlinked_arrival_visible(arr,a.family_arrival_reviewer,a.family_stock)$new$);
  history := replace(history,link_predicate,$new$and (select com and family_arrivals
        and private.unlinked_arrival_visible(ar,family_arrival_reviewer,family_stock) from access)$new$);
  execute history;
end;
$migration$;
