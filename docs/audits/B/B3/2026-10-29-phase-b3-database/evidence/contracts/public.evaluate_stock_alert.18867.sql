CREATE OR REPLACE FUNCTION public.evaluate_stock_alert(p_patient uuid, p_product text, p_location text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.stock_alert_rules;e public.stock_alert_events;balance_now numeric;severity_now text;eid uuid;begin
 if p_location is null then return;end if;
 select * into r from public.stock_alert_rules where care_recipient_id=p_patient and product_id=p_product and location=p_location;
 select * into e from public.stock_alert_events where care_recipient_id=p_patient and product_id=p_product and location=p_location and state='open' for update;
 select coalesce(balance,0) into balance_now from public.current_stock_balances where care_recipient_id=p_patient and product_id=p_product and location=p_location;balance_now:=coalesce(balance_now,0);
 if r.is_enabled then severity_now:=case when balance_now<=r.critical_threshold then 'critical' when balance_now<=r.low_threshold then 'low' end;end if;
 if e.id is not null and e.severity is not distinct from severity_now then update public.stock_alert_events set balance=balance_now,observed_at=now() where id=e.id;return;end if;
 if e.id is not null then update public.stock_alert_events set state='resolved',balance=balance_now,observed_at=now(),resolved_at=now() where id=e.id;end if;
 if severity_now is not null then
 insert into public.stock_alert_events(care_recipient_id,product_id,location,severity,balance,observed_at) values(p_patient,p_product,p_location,severity_now,balance_now,now()) returning id into eid;
 perform public.enqueue_patient_event(p_patient,null,eid);end if;
end;$function$
