CREATE OR REPLACE FUNCTION public.my_workspace()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare person public.profiles;patients jsonb;begin
 select * into person from public.profiles where id=auth.uid() and status='active';
 if not found or private.auth_session() is null then raise exception 'active Auth session required' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'display_name',c.display_name,'is_active',c.is_active,'is_development',c.is_development,
 'role',m.role,'hasMembership',m.user_id is not null,'capabilities',case when public.can_access_recipient(c.id) then public.patient_capabilities(c.id) else '{}'::jsonb end) order by c.display_name,c.id),'[]') into patients
 from public.care_recipients c left join public.care_recipient_memberships m on m.care_recipient_id=c.id and m.user_id=person.id and m.status='active'
 where m.user_id is not null or private.global_identity();
 return jsonb_build_object('userId',person.id,'fullName',person.full_name,'isGlobalAdmin',private.global_identity(),'globalAdministrationAllowed',public.is_global_administrator(),'activeContext',public.my_active_context(),'patients',patients,'avatarPath',person.avatar_path);
end;$function$
