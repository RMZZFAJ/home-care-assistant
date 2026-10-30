CREATE OR REPLACE FUNCTION public.inbound_report_context(p_phone text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid;p uuid;begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'webhook worker required' using errcode='42501';end if;
 select v.user_id into u from public.verified_phones v join auth.users a on a.id=v.user_id where v.phone='+'||ltrim(p_phone,'+') and '+'||ltrim(a.phone,'+')=v.phone and a.phone_confirmed_at is not null;
 if u is null or (select count(*) from public.care_recipient_memberships where user_id=u and status='active' and private.user_can(care_recipient_id,u,'consumption.report'))<>1 then return null;end if;
 select care_recipient_id into p from public.care_recipient_memberships where user_id=u and status='active' and private.user_can(care_recipient_id,u,'consumption.report');
 return jsonb_build_object('patientId',p,'userId',u,'catalog',coalesce((select jsonb_agg(jsonb_build_object('id',product_id,'name',name,'aliases',aliases,'unit',unit)) from public.care_recipient_products where care_recipient_id=p and is_active),'[]'));
end;$function$
