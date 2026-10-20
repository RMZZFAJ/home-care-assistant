create or replace function public.process_internal_notifications(p_limit integer default 50)
returns table(processed integer, external_pending integer)
language plpgsql security definer set search_path = public
as $$
declare v_processed integer := 0; v_external integer := 0;
begin
  if not public.is_global_administrator() then raise exception 'notification processing not authorized'; end if;
  update public.requisition_notifications
  set state='sent', attempts=attempts+1, attempted_at=now(), provider_reference='internal'
  where id in (
    select id from public.requisition_notifications
    where state='pending' and channel='internal'
    order by created_at
    for update skip locked limit greatest(1, least(p_limit, 100))
  );
  get diagnostics v_processed = row_count;
  select count(*) into v_external from public.requisition_notifications
  where state='pending' and channel <> 'internal';
  return query select v_processed, v_external;
end;
$$;

revoke all on function public.process_internal_notifications(integer) from public;
grant execute on function public.process_internal_notifications(integer) to authenticated;
