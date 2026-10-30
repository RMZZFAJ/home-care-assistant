CREATE OR REPLACE FUNCTION private.close_admin_bootstrap()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if new.role='admin' and new.status='active' and (select count(*) from public.care_recipient_memberships where care_recipient_id=new.care_recipient_id and role='admin' and status='active')>=2 then
 insert into public.patient_settings(care_recipient_id,bootstrap_closed) values(new.care_recipient_id,true) on conflict(care_recipient_id) do update set bootstrap_closed=true;end if;return null;
end;$function$
