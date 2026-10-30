CREATE OR REPLACE FUNCTION public.fluent_pre_retry_claim_jobs(p_limit integer, p_worker_id uuid, p_external_enabled boolean DEFAULT false)
 RETURNS SETOF requisition_notifications
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_global_administrator() and coalesce(auth.role(),'')<>'service_role'
  then raise exception 'worker authorization required' using errcode='42501';end if;
  if p_worker_id is null then raise exception 'worker identity required';end if;
  update public.requisition_notifications set
    state=case when channel='internal' then 'pending' else 'uncertain' end,
    leased_by=null,lease_expires_at=null,last_error='processing lease expired'
    where state='processing' and lease_expires_at<now();
  update public.requisition_notifications n set state='cancelled',last_error='recipient access revoked'
    where n.state='pending' and not exists(select 1 from public.profiles p
      where p.id=n.recipient_user_id and p.status='active' and
        (p.role='admin' and p.global_scope or exists(select 1 from public.care_recipient_memberships m
          where m.care_recipient_id=n.care_recipient_id and m.user_id=p.id and m.status='active')));
  -- An alert resolved before its send is no longer actionable. Preserve the
  -- outbox row as cancelled instead of sending an obsolete warning.
  update public.requisition_notifications n set state='cancelled',last_error='stock alert resolved before send'
    where n.state='pending' and n.alert_event_id is not null and exists(
      select 1 from public.stock_alert_events e where e.id=n.alert_event_id and e.state='resolved');
  return query update public.requisition_notifications n set state='processing',
    attempts=n.attempts+1,attempted_at=now(),leased_by=p_worker_id,
    lease_expires_at=now()+interval '2 minutes'
    where n.id in (
      select candidate.id from public.requisition_notifications candidate
      left join public.stock_alert_events e on e.id=candidate.alert_event_id
      where candidate.state='pending'
        and (candidate.channel='internal' or candidate.channel='whatsapp' and coalesce(p_external_enabled,false))
        and candidate.next_attempt_at<=now() and candidate.attempts<5
      order by case when e.severity='critical' then 0 else 1 end,
        candidate.next_attempt_at,candidate.id
      for update of candidate skip locked
      limit greatest(1,least(coalesce(p_limit,50),100))
    ) returning n.*;
end; $function$
