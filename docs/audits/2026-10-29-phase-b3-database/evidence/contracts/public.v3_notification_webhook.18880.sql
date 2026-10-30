CREATE OR REPLACE FUNCTION public.v3_notification_webhook(p_provider_reference text, p_state text, p_notification_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$begin
  if coalesce(auth.role(),'')<>'service_role' then raise exception 'service authorization required' using errcode='42501';end if;
  if p_provider_reference is null or p_state is null or p_state not in ('accepted','delivered','read','failed') then raise exception 'invalid provider event';end if;
  update public.requisition_notifications set state=p_state,provider_reference=coalesce(provider_reference,p_provider_reference),
    delivered_at=case when p_state in ('delivered','read') then coalesce(delivered_at,now()) else delivered_at end,
    read_at=case when p_state='read' then coalesce(read_at,now()) else read_at end,
    leased_by=null,lease_expires_at=null
  where (provider_reference=p_provider_reference or id=p_notification_id and provider_reference is null)
    and state in ('processing','accepted','uncertain','delivered','read')
    and (p_state='read' or p_state='delivered' and state<>'read' or p_state in ('accepted','failed') and state in ('processing','accepted','uncertain'));
end;$function$
