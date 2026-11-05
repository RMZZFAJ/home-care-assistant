CREATE OR REPLACE FUNCTION private.member_can(p_patient uuid, p_user uuid, p_capability text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r text;v boolean;begin
 select m.role::text into r from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id
 where m.care_recipient_id=p_patient and m.user_id=p_user and m.status='active' and p.status='active';
 if r is null then return false;end if;
 if p_capability in ('bal.defer.approve','bal.schedule.manage','bal.approve.family') and r not in ('admin','family') then return false;end if;
 if p_capability='bal.count' and r not in ('professional','supervisor') and exists(select 1 from public.bal_regimes where care_recipient_id=p_patient and activated_at is not null) then return false;end if;
 if p_capability='access.manage' then return r='admin';end if;
 if p_capability like 'com.%' and r not in ('admin','family') then return false;end if;
 select enabled into v from public.capability_overrides where care_recipient_id=p_patient and capability=p_capability and subject_user=p_user;
 if found then return v;end if;
 select enabled into v from public.capability_overrides where care_recipient_id=p_patient and capability=p_capability and subject_role=r;
 if found then return v;end if;
 return coalesce((select r=any(default_roles) from public.capability_definitions where code=p_capability),false);
end;$function$
