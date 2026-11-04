CREATE OR REPLACE FUNCTION public.configure_stock_alert(p_care_recipient_id uuid, p_product_id text, p_location text, p_low_threshold numeric, p_critical_threshold numeric, p_is_enabled boolean)
 RETURNS stock_alert_rules
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v public.stock_alert_rules;precision_limit integer;begin
 perform private.require_cap(p_care_recipient_id,'access.manage');
 select quantity_decimals into precision_limit from public.care_recipient_products where care_recipient_id=p_care_recipient_id and product_id=p_product_id;
 if precision_limit is null or p_low_threshold is null or p_critical_threshold is null or p_low_threshold<0 or p_low_threshold>1000000000 or p_critical_threshold<0 or p_critical_threshold>p_low_threshold
 or p_low_threshold<>round(p_low_threshold,precision_limit) or p_critical_threshold<>round(p_critical_threshold,precision_limit) then raise exception 'invalid product threshold precision';end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||p_care_recipient_id,0));
 insert into public.stock_alert_rules(care_recipient_id,product_id,location,low_threshold,critical_threshold,is_enabled) values(p_care_recipient_id,p_product_id,p_location,p_low_threshold,p_critical_threshold,p_is_enabled)
 on conflict(care_recipient_id,product_id,location) do update set low_threshold=excluded.low_threshold,critical_threshold=excluded.critical_threshold,is_enabled=excluded.is_enabled returning * into v;
 perform public.evaluate_stock_alert(p_care_recipient_id,p_product_id,p_location);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'stock.alert.configured','stock_alert_rule',v.id,jsonb_build_object('care_recipient_id',p_care_recipient_id));return v;
end;$function$
