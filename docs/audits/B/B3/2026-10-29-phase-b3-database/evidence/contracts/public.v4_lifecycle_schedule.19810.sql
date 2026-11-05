CREATE OR REPLACE FUNCTION public.v4_lifecycle_schedule()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s public.requisition_lifecycle;d public.operational_documents;n integer:=0;archived integer:=0;locked_patients uuid[];patient_id uuid;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'worker authorization required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('hca:operational-scheduler',0));
 select array_agg(id order by id) into locked_patients from (select care_recipient_id id,min(due) from (
 select care_recipient_id,next_reminder_at due from public.requisition_lifecycle where archived_at is null and not exists(select 1 from public.requisitions r where r.id=requisition_id and r.is_historical) and ((completed_at is null or not coalesce(private.science_satisfied(requisition_id),false)) and next_reminder_at<=now() or completed_at is not null and not manual_archive_required and coalesce(private.science_satisfied(requisition_id),false) and now()>=completed_at+make_interval(days=>coalesce((policy->>'archiveDays')::integer,7)))
 union all select care_recipient_id,updated_at due from public.operational_documents where type='ENT' and status='pending_receipt' and updated_at<now()-interval '24 hours') x group by care_recipient_id order by min(due) limit 25) x;
 for patient_id in select unnest(locked_patients) order by 1 loop perform pg_advisory_xact_lock(hashtextextended('stock:'||patient_id,0));end loop;
 for s in select * from public.requisition_lifecycle where archived_at is null and not exists(select 1 from public.requisitions r where r.id=requisition_id and r.is_historical) and ((completed_at is null or not coalesce(private.science_satisfied(requisition_id),false)) and next_reminder_at<=now() or completed_at is not null and not manual_archive_required and coalesce(private.science_satisfied(requisition_id),false) and now()>=completed_at+make_interval(days=>coalesce((policy->>'archiveDays')::integer,7))) and care_recipient_id=any(locked_patients) order by next_reminder_at limit 100 for update skip locked loop
 perform private.refresh_requisition_lifecycle(s.requisition_id);
 select * into s from public.requisition_lifecycle where requisition_id=s.requisition_id;
 select * into d from public.operational_documents where id=s.requisition_id for update;
 if d.status='cancelled' then continue;end if;
 if s.completed_at is not null and not s.manual_archive_required and coalesce(private.science_satisfied(d.id),false)
 and now()>=s.completed_at+make_interval(days=>coalesce((s.policy->>'archiveDays')::integer,7)) then
 update public.requisition_lifecycle set archived_at=now(),archive_reason='Prazo automático após conclusão e ciência válidas' where requisition_id=d.id;
 update public.operational_documents set version=version+1 where id=d.id;
 perform private.record_document_event(d.id,'req.archived.automatic',jsonb_build_object('scheduled',true),gen_random_uuid());archived:=archived+1;
 elsif (s.completed_at is null or not coalesce(private.science_satisfied(d.id),false)) and s.next_reminder_at<=now() then
 update public.requisition_lifecycle set next_reminder_at=now()+make_interval(hours=>coalesce((s.policy->>'reminderRepeatHours')::integer,24)),reminders=reminders+1 where requisition_id=d.id;
 update public.operational_documents set version=version+1 where id=d.id;
 perform private.record_document_event(d.id,'req.reminder',jsonb_build_object('sciencePending',not coalesce(private.science_satisfied(d.id),false)),gen_random_uuid());n:=n+1;
 end if;end loop;
 for d in select * from public.operational_documents where type='ENT' and status='pending_receipt' and care_recipient_id=any(locked_patients)
 and updated_at<now()-interval '24 hours' order by updated_at limit 50 for update skip locked loop
 update public.operational_documents set version=version+1,updated_at=now() where id=d.id;
 perform private.record_document_event(d.id,'ent.reminder','{"scheduled":true}',gen_random_uuid());n:=n+1;
 end loop;
 insert into private.scheduler_health(singleton,last_run,processed) values(true,now(),n+archived) on conflict(singleton) do update set last_run=now(),processed=excluded.processed;
 return jsonb_build_object('reminders',n,'archived',archived);
end;$function$
