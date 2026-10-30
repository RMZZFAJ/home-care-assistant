CREATE OR REPLACE FUNCTION public.v3_configure_stock_alert(p_care_recipient_id uuid, p_product_id text, p_location text, p_low_threshold bigint, p_critical_threshold bigint, p_is_enabled boolean)
 RETURNS stock_alert_rules
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v public.stock_alert_rules;
begin
  if not public.recipient_can(p_care_recipient_id,'admin') then raise exception 'alert admin authorization required' using errcode='42501';end if;
  perform pg_advisory_xact_lock(hashtextextended('stock:'||p_care_recipient_id,0));
  insert into public.stock_alert_rules(care_recipient_id,product_id,location,low_threshold,critical_threshold,is_enabled)
  values(p_care_recipient_id,p_product_id,p_location,p_low_threshold,p_critical_threshold,p_is_enabled)
  on conflict(care_recipient_id,product_id,location) do update set low_threshold=excluded.low_threshold,critical_threshold=excluded.critical_threshold,is_enabled=excluded.is_enabled returning * into v;
  perform public.evaluate_stock_alert(p_care_recipient_id,p_product_id,p_location);
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'stock.alert.configured','stock_alert_rule',v.id,jsonb_build_object('care_recipient_id',p_care_recipient_id,'enabled',p_is_enabled));return v;
end; $function$
