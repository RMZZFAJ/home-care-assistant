CREATE OR REPLACE FUNCTION public.validated_legacy_patient_access(p_patient uuid, p_kind text, p_change jsonb, p_key uuid, p_version integer, p_request_id uuid DEFAULT NULL::uuid, p_decision text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s public.patient_settings;c public.access_change_requests;critical_change boolean;v_id uuid;
begin
 perform private.require_cap(p_patient,'access.manage');
 insert into public.patient_settings(care_recipient_id) values(p_patient) on conflict do nothing;
 select * into s from public.patient_settings where care_recipient_id=p_patient for update;
 if p_request_id is not null then
 select * into strict c from public.access_change_requests where id=p_request_id and care_recipient_id=p_patient for update;
 if c.status<>'pending' then return to_jsonb(c);end if;
 if c.proposed_by=auth.uid() or not exists(select 1 from public.care_recipient_memberships where care_recipient_id=p_patient and user_id=auth.uid() and role='admin' and status='active')
 or (select count(*) from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id where m.care_recipient_id=p_patient and m.role='admin' and m.status='active' and p.status='active')<2 then raise exception 'distinct patient administrator required' using errcode='42501';end if;
 if s.version<>c.base_version then raise exception 'stale policy version' using errcode='P0001';end if;
 if p_decision not in ('approve','reject') then raise exception 'invalid decision';end if;
 update public.access_change_requests set approved_by=auth.uid() where id=c.id;
 if p_decision='approve' then perform private.apply_access_change(c.id);else update public.access_change_requests set status='rejected',decided_at=now() where id=c.id;end if;
 return (select to_jsonb(q) from public.access_change_requests q where id=c.id);
 end if;
 select * into c from public.access_change_requests where care_recipient_id=p_patient and idempotency_key=p_key;
 if found then if c.kind<>p_kind or c.proposed<>p_change then raise exception 'idempotency conflict' using errcode='23505';end if;return to_jsonb(c);end if;
 if p_key is null or p_version is null or p_version<>s.version then raise exception 'stale policy version' using errcode='P0001';end if;
 if p_kind='settings' then
 if exists(select 1 from jsonb_object_keys(p_change) k where k not in ('balDay','balReview','balApprovers','balRequirement','whatsappSimpleAcceptance'))
 or p_change ? 'balDay' and p_change->'balDay'<>'null'::jsonb and (p_change->>'balDay')::integer not between 0 and 6
 or p_change ? 'balReview' and p_change->>'balReview' not in ('optional','required')
 or p_change ? 'balRequirement' and p_change->>'balRequirement' not in ('any','all')
 or p_change ? 'balApprovers' and (jsonb_typeof(p_change->'balApprovers')<>'array' or jsonb_array_length(p_change->'balApprovers') not between 1 and 2 or exists(select 1 from jsonb_array_elements_text(p_change->'balApprovers') z where z not in ('family','supervisor')))
 or p_change ? 'whatsappSimpleAcceptance' and jsonb_typeof(p_change->'whatsappSimpleAcceptance')<>'boolean' then raise exception 'invalid settings';end if;
 critical_change:=(p_change ? 'balReview' and p_change->>'balReview' is distinct from s.settings->>'balReview') or p_change ? 'balApprovers' or p_change ? 'balRequirement' or coalesce((p_change->>'whatsappSimpleAcceptance')::boolean,false);
 elsif p_kind='capability' then
 if not exists(select 1 from public.capability_definitions where code=p_change->>'capability') or jsonb_typeof(p_change->'enabled') is distinct from 'boolean'
 or (p_change->>'subjectUser' is null)=(p_change->>'subjectRole' is null) then raise exception 'invalid capability override';end if;
 if p_change->>'subjectUser' is not null and not exists(select 1 from public.care_recipient_memberships where care_recipient_id=p_patient and user_id=(p_change->>'subjectUser')::uuid and status='active') then raise exception 'invalid patient member';end if;
 critical_change:=(p_change->>'enabled')::boolean and exists(select 1 from public.capability_definitions where code=p_change->>'capability' and critical);
 elsif p_kind='membership' then critical_change:=true;
 else raise exception 'invalid access change';end if;
 insert into public.access_change_requests(care_recipient_id,kind,proposed,base_version,proposed_by,idempotency_key) values(p_patient,p_kind,p_change,s.version,auth.uid(),p_key) returning id into v_id;
 if not critical_change then perform private.apply_access_change(v_id);end if;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),case when critical_change then 'access.proposed' else 'access.changed' end,'access_change',v_id,jsonb_build_object('care_recipient_id',p_patient,'kind',p_kind));
 return (select to_jsonb(q) from public.access_change_requests q where id=v_id);
end;$function$
