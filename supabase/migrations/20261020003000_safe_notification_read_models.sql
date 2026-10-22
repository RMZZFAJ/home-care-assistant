-- Share operational delivery status without widening access to private destinations.
create function public.requisition_delivery_status(p_requisition_ids uuid[])
returns table(requisition_id uuid,id uuid,recipient_group text,recipient_label text,
  channel text,state text,attempts integer,attempted_at timestamptz,
  delivered_at timestamptz,read_at timestamptz,error_code text)
language plpgsql stable security definer set search_path=public as $$
begin
  if auth.uid() is null or coalesce(array_length(p_requisition_ids,1),0) not between 1 and 100 then
    raise exception 'invalid status request' using errcode='42501';
  end if;
  return query
    select n.requisition_id,n.id,n.recipient_group,n.recipient_label,n.channel,n.state,
      n.attempts,n.attempted_at,n.delivered_at,n.read_at,
      case when n.last_error is null then null
        when n.last_error in ('INVALID_DESTINATION','PROVIDER_RATE_LIMIT','PROVIDER_RESULT_UNCERTAIN','PROVIDER_REJECTED','CHANNEL_NOT_CONFIGURED') then n.last_error
        else 'PROCESSING_FAILED' end
    from public.requisition_notifications n
    join public.requisitions r on r.id=n.requisition_id
    where n.requisition_id=any(p_requisition_ids) and public.can_access_recipient(r.care_recipient_id)
    order by n.created_at,n.id;
end; $$;
revoke all on function public.requisition_delivery_status(uuid[]) from public,anon;
grant execute on function public.requisition_delivery_status(uuid[]) to authenticated;
