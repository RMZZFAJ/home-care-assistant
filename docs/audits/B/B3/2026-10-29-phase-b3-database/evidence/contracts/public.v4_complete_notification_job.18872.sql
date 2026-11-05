CREATE OR REPLACE FUNCTION public.v4_complete_notification_job(p_id uuid, p_worker_id uuid, p_state text, p_provider_reference text DEFAULT NULL::text, p_error text DEFAULT NULL::text)
 RETURNS requisition_notifications
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v public.requisition_notifications;
begin
  if not public.is_global_administrator() and coalesce(auth.role(),'')<>'service_role' then raise exception 'worker authorization required' using errcode='42501';end if;
  if p_state is null or p_state not in ('accepted','delivered','read','failed','pending','uncertain') then raise exception 'invalid notification result';end if;
  select * into v from public.requisition_notifications where id=p_id and leased_by=p_worker_id and state='processing' and lease_expires_at>now() for update;
  if not found then raise exception 'notification lease lost';end if;
  if v.channel='internal' and p_state='accepted' then raise exception 'internal notification requires delivered state';end if;
  update public.requisition_notifications set state=case when p_state='pending' and attempts>=5 then 'failed' else p_state end,
    provider_reference=coalesce(p_provider_reference,provider_reference),last_error=left(p_error,500),leased_by=null,lease_expires_at=null,
    next_attempt_at=now()+make_interval(secs=>least(3600,(30*power(2,attempts))::integer)),
    delivered_at=case when p_state in ('delivered','read') then now() else delivered_at end,read_at=case when p_state='read' then now() else read_at end
  where id=v.id returning * into v;return v;
end; $function$
