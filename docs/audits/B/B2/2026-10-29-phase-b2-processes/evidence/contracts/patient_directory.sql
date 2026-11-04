CREATE OR REPLACE FUNCTION public.patient_directory(p_patient uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$begin
 if not public.can_access_recipient(p_patient) then raise exception 'required permission' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'name',p.full_name,'role',m.role)) from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id where m.care_recipient_id=p_patient and m.status='active' and p.status='active'),'[]');
end;$function$
