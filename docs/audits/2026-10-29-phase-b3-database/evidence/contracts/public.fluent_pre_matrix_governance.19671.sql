CREATE OR REPLACE FUNCTION public.fluent_pre_matrix_governance(p_patient uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if not public.can_manage_recipient(p_patient) and not public.is_global_administrator() then raise exception 'administrator authorization required' using errcode='42501';end if;
 return jsonb_build_object('data',coalesce((select to_jsonb(s) from public.patient_settings s where care_recipient_id=p_patient),jsonb_build_object('version',1,'settings','{}'::jsonb)),
 'directory',coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'name',p.full_name,'role',m.role)) from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id where m.care_recipient_id=p_patient and m.status='active' and p.status='active'),'[]'),
 'definitions',(select jsonb_agg(to_jsonb(c) order by c.code) from public.capability_definitions c),
 'overrides',coalesce((select jsonb_agg(to_jsonb(c)) from public.capability_overrides c where care_recipient_id=p_patient),'[]'),
 'changes',coalesce((select jsonb_agg(to_jsonb(c) order by created_at desc) from (select * from public.access_change_requests where care_recipient_id=p_patient order by created_at desc limit 50) c),'[]'));
end;$function$
