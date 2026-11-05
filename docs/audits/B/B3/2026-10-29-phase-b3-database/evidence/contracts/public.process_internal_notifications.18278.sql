CREATE OR REPLACE FUNCTION public.process_internal_notifications(p_limit integer DEFAULT 50)
 RETURNS TABLE(processed integer, external_pending integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_processed integer;v_external integer;
begin
  if not public.is_global_administrator() then raise exception 'notification processing not authorized' using errcode='42501';end if;
  update public.requisition_notifications set state='delivered',attempts=attempts+1,attempted_at=now(),delivered_at=now(),provider_reference='internal'
    where id in(select n.id from public.requisition_notifications n join public.profiles p on p.id=n.recipient_user_id and p.status='active'
      where n.state='pending' and n.channel='internal' and public.can_access_recipient(n.care_recipient_id)
        and (p.role='admin' and p.global_scope or exists(select 1 from public.care_recipient_memberships m where m.care_recipient_id=n.care_recipient_id and m.user_id=p.id and m.status='active'))
      order by n.created_at for update of n skip locked limit greatest(1,least(coalesce(p_limit,50),100)));
  get diagnostics v_processed=row_count;
  select count(*) into v_external from public.requisition_notifications where state='pending' and channel<>'internal';
  return query select v_processed,v_external;
end; $function$
