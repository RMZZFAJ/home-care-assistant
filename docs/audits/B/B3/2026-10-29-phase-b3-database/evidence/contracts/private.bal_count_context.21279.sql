CREATE OR REPLACE FUNCTION private.bal_count_context(p_patient uuid, p_document uuid, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_a public.bal_assignments;v_c public.bal_cycles;v_s public.scheduled_shifts;begin
 perform private.require_cap(p_patient,'bal.count');
 perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0)); if nullif(p_payload->'balanceAssignment'->>'referenceRevision','') is null or (p_payload->'balanceAssignment'->>'referenceRevision')::bigint<>private.team_revision(p_patient) then raise exception 'inventory reference changed' using errcode='P0001';end if;
 perform pg_advisory_xact_lock(hashtextextended('bal:'||p_patient,0));
 select * into v_a from public.bal_assignments where care_recipient_id=p_patient and id=(p_payload->'balanceAssignment'->>'id')::uuid for update;
 if not found or v_a.status<>'active' or v_a.version is distinct from (p_payload->'balanceAssignment'->>'version')::integer
 or v_a.professional_id<>auth.uid() or not private.schedule_worker(p_patient,auth.uid()) or v_a.starts_at>now() or v_a.ends_at<=now() then raise exception 'balance shift authorization required' using errcode='42501';end if;
 select * into v_s from public.scheduled_shifts where id=v_a.shift_id for share;
 if v_s.status<>'published' or v_s.version<>v_a.shift_version then raise exception 'stale balance assignment';end if;
 select * into strict v_c from public.bal_cycles where id=v_a.cycle_id for update;
 if (p_document is null and v_c.document_id is not null) or (p_document is not null and v_c.document_id is distinct from p_document) then raise exception 'existing balance document requires revision' using errcode='P0001';end if;
 return jsonb_build_object('cycleId',v_c.id,'assignmentId',v_a.id,'assignmentVersion',v_a.version,'shiftId',v_s.id,'shiftType',(select name from public.shift_types where id=v_s.shift_type_id),
 'professionalId',v_a.professional_id,'professionalName',(select full_name from public.profiles where id=v_a.professional_id),'startsAt',v_a.starts_at,'endsAt',v_a.ends_at,'timezone',v_s.timezone,
 'countedAt',now(),'weeks',(select jsonb_agg(week_start order by week_start) from public.bal_obligations where cycle_id=v_c.id),'kind',v_a.kind);
end;$function$
