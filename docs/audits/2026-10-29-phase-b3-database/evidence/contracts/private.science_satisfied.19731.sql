CREATE OR REPLACE FUNCTION private.science_satisfied(p_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select case when not coalesce((s.policy->>'scienceRequired')::boolean,true) then true
 when s.policy->>'scienceRequirement'='all' then cardinality(s.eligible_users)>0 and not exists(select 1 from unnest(s.eligible_users) u where not exists(select 1 from public.requisition_science_events e where e.requisition_id=p_id and e.user_id=u))
 else exists(select 1 from public.requisition_science_events e where e.requisition_id=p_id and e.user_id=any(s.eligible_users)) end
 from public.requisition_lifecycle s where s.requisition_id=p_id;
$function$
