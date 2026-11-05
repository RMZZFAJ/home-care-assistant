CREATE OR REPLACE FUNCTION private.capability_definition_rows(p_patient uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select coalesce(jsonb_agg(to_jsonb(c)||jsonb_build_object('allowed_roles',a.roles,'default_roles',array(select r from unnest(c.default_roles) r where r=any(a.roles))) order by c.code),'[]')
 from public.capability_definitions c cross join lateral(select array(select r from unnest(array['admin','family','supervisor','professional','reader']) r where case
 when c.code='access.manage' then r='admin'
 when c.code like 'com.%' or c.code in ('bal.defer.approve','bal.schedule.manage','bal.approve.family') then r in ('admin','family')
 when c.code='bal.count' and exists(select 1 from public.bal_regimes where care_recipient_id=p_patient and activated_at is not null) then r in ('supervisor','professional')
 else true end) roles) a;
$function$
