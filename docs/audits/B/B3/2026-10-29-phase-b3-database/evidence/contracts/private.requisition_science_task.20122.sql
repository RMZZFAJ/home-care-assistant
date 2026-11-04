CREATE OR REPLACE FUNCTION private.requisition_science_task(p_id uuid, p_user uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(select 1 from public.requisition_lifecycle s join public.operational_documents d on d.id=s.requisition_id join public.requisitions r on r.id=d.id where d.id=p_id and not r.is_historical and d.status not in ('draft','cancelled') and s.archived_at is null and not coalesce(private.science_satisfied(p_id),false) and p_user=any(s.eligible_users) and private.member_can(d.care_recipient_id,p_user,'req.science') and not exists(select 1 from public.requisition_science_events e where e.requisition_id=p_id and e.user_id=p_user));
$function$
