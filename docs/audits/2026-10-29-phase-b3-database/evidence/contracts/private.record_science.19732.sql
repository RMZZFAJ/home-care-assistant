CREATE OR REPLACE FUNCTION private.record_science(p_id uuid, p_user uuid, p_mode text, p_evidence jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s public.requisition_lifecycle;is_satisfied boolean;eid uuid;patient_id uuid;begin
 if exists(select 1 from public.requisitions where id=p_id and is_historical) then return false;end if;
 select care_recipient_id into patient_id from public.requisition_lifecycle where requisition_id=p_id;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||patient_id,0));
 select * into strict s from public.requisition_lifecycle where requisition_id=p_id for update;
 if s.archived_at is not null or not(p_user=any(s.eligible_users)) or not private.member_can(s.care_recipient_id,p_user,'req.science') then return false;end if;
 insert into public.requisition_science_events(requisition_id,care_recipient_id,user_id,actor_name,mode,evidence)
 values(p_id,s.care_recipient_id,p_user,(select full_name from public.profiles where id=p_user),p_mode,p_evidence)
 on conflict(requisition_id,user_id) do nothing returning id into eid;
 if eid is null then return false;end if;
 is_satisfied:=private.science_satisfied(p_id);
 update public.requisition_lifecycle set science_satisfied_at=case when is_satisfied then coalesce(science_satisfied_at,now()) else science_satisfied_at end where requisition_id=p_id;
 update public.operational_documents set version=version+1 where id=p_id;
 perform private.record_document_event(p_id,case when is_satisfied and s.science_satisfied_at is null then 'req.science_satisfied' else 'req.science_recorded' end,
 jsonb_build_object('scienceEventId',eid,'userId',p_user,'mode',p_mode,'evidence',p_evidence),gen_random_uuid());
 return true;
end;$function$
