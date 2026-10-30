CREATE OR REPLACE FUNCTION public.operational_tasks(p_patient uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb;open_count integer;science_count integer;archive_count integer;begin
 if not public.can_access_recipient(p_patient) then raise exception 'patient operating context required' using errcode='42501';end if;
 result:=public.v3_operational_tasks(p_patient);
 select count(*) filter(where s.completed_at is null),count(*) filter(where private.requisition_science_task(d.id,auth.uid())),
 count(*) filter(where private.requisition_archive_task(d.id)) into open_count,science_count,archive_count
 from public.operational_documents d join public.requisition_lifecycle s on s.requisition_id=d.id where d.care_recipient_id=p_patient and d.type='REQ' and d.status not in ('draft','cancelled') and s.archived_at is null and private.can(p_patient,'req.read') and not exists(select 1 from public.requisitions r where r.id=d.id and r.is_historical);
 return result||jsonb_build_object('requests',open_count,'sciencePending',science_count,'archivePending',archive_count);
end;$function$
