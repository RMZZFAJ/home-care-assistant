CREATE OR REPLACE FUNCTION public.global_patient_administration(p_patient uuid, p_section text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if not public.is_global_administrator() or not exists(select 1 from public.care_recipients where id=p_patient) then raise exception 'global administration required' using errcode='42501';end if;
 case p_section
 when 'catalog' then return coalesce((select jsonb_agg(to_jsonb(c)||jsonb_build_object('id',c.product_id) order by c.sort_order,c.name) from public.care_recipient_products c where care_recipient_id=p_patient),'[]');
 when 'products' then return coalesce((select jsonb_agg(to_jsonb(p) order by p.name) from public.products p where p.owner_care_recipient_id is null and p.is_active),'[]');
 when 'memberships' then return coalesce((select jsonb_agg(to_jsonb(m)||jsonb_build_object('full_name',p.full_name) order by p.full_name) from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id where m.care_recipient_id=p_patient),'[]');
 when 'alerts' then return coalesce((select jsonb_agg(to_jsonb(r)) from public.stock_alert_rules r where care_recipient_id=p_patient),'[]');
 when 'notificationRecipients' then return coalesce((select jsonb_agg(to_jsonb(r)) from public.recipient_notification_settings r where care_recipient_id=p_patient),'[]');
 else raise exception 'patient operating context required' using errcode='42501';end case;
end;$function$
