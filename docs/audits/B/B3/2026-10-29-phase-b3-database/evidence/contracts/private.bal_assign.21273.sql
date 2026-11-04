CREATE OR REPLACE FUNCTION private.bal_assign(p_patient uuid, p_cycle uuid, p_shift uuid, p_kind text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare v_s public.scheduled_shifts;v_id uuid;begin
 select * into v_s from public.scheduled_shifts where care_recipient_id=p_patient and id=p_shift for share;
 if not found or v_s.status<>'published' or v_s.ends_at<=now() or not private.schedule_worker(p_patient,v_s.professional_id)
 or not private.member_can(p_patient,v_s.professional_id,'bal.count') then raise exception 'invalid balance target shift';end if;
 insert into public.bal_assignments(care_recipient_id,cycle_id,shift_id,shift_version,professional_id,starts_at,ends_at,kind)
 values(p_patient,p_cycle,v_s.id,v_s.version,v_s.professional_id,v_s.starts_at,v_s.ends_at,p_kind) returning id into v_id;
 perform private.bal_event(p_patient,p_cycle,v_id,'bal.cycle.assigned','Responsabilidade vinculada ao plantão real',to_jsonb(v_s),'assignment:'||v_id);
 return v_id;end;$function$
