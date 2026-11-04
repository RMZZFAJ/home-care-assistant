CREATE OR REPLACE FUNCTION public.v4_configure_patient_access(p_patient uuid, p_kind text, p_change jsonb, p_key uuid, p_version integer, p_request_id uuid DEFAULT NULL::uuid, p_decision text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s public.patient_settings;c public.access_change_requests;rid uuid;local_admin boolean:=public.can_manage_recipient(p_patient);x jsonb;begin
 if not local_admin and not public.is_global_administrator() then raise exception 'administrator authorization required' using errcode='42501';end if;
 if not exists(select 1 from public.care_recipients where id=p_patient) then raise exception 'patient required';end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
 insert into public.patient_settings(care_recipient_id) values(p_patient) on conflict do nothing;
 select * into s from public.patient_settings where care_recipient_id=p_patient for update;
 if p_request_id is not null then
 select * into strict c from public.access_change_requests where id=p_request_id and care_recipient_id=p_patient for update;
 if not local_admin or c.proposed_by=auth.uid() then raise exception 'distinct patient administrator required' using errcode='42501';end if;
 if c.status<>'pending' then return to_jsonb(c);end if;
 if p_decision is null or p_decision not in ('approve','reject') then raise exception 'invalid decision';end if;
 if p_decision='approve' and s.version<>c.base_version then raise exception 'stale policy version' using errcode='P0001';end if;
 update public.access_change_requests set approved_by=auth.uid() where id=c.id;
 if p_decision='approve' then perform private.apply_access_change(c.id);
 else update public.access_change_requests set status='rejected',decided_at=now() where id=c.id;end if;
 return (select to_jsonb(q) from public.access_change_requests q where id=c.id);
 end if;
 if p_key is null then raise exception 'idempotency key required';end if;
 select * into c from public.access_change_requests where care_recipient_id=p_patient and idempotency_key=p_key;
 if found then
 if c.kind<>p_kind or c.proposed<>p_change or c.proposed_by<>auth.uid() then raise exception 'idempotency conflict' using errcode='23505';end if;
 return to_jsonb(c);end if;
 if p_version is null or p_version<>s.version then raise exception 'stale policy version' using errcode='P0001';end if;
 if jsonb_typeof(p_change) is distinct from 'object' or length(p_change::text)>64000 then raise exception 'invalid change';end if;
 if p_kind='settings' then
 if exists(select 1 from jsonb_object_keys(p_change) k where k not in ('balDay','balReview','balApprovers','balRequirement','whatsappSimpleAcceptance','scienceRequired','scienceRoles','scienceUsers','scienceRequirement','scienceByDispatch','scienceAutomatic','scienceWhatsApp','archiveDays','patientShortName','reminderHours','reminderRepeatHours','shareWaitSeconds','shiftReminder','balReminderUsers'))
 or p_change ? 'balDay' and p_change->'balDay'<>'null'::jsonb and (p_change->>'balDay')::integer not between 0 and 6
 or p_change ? 'balReview' and p_change->>'balReview' not in ('optional','required')
 or p_change ? 'balRequirement' and p_change->>'balRequirement' not in ('any','all')
 or p_change ? 'scienceRequirement' and p_change->>'scienceRequirement' not in ('any','all')
 or p_change ? 'balApprovers' and (jsonb_typeof(p_change->'balApprovers')<>'array' or jsonb_array_length(p_change->'balApprovers') not between 1 and 2 or exists(select 1 from jsonb_array_elements_text(p_change->'balApprovers') z where z not in ('family','supervisor')))
 or p_change ? 'scienceRoles' and (jsonb_typeof(p_change->'scienceRoles')<>'array' or exists(select 1 from jsonb_array_elements_text(p_change->'scienceRoles') z where z not in ('admin','family','supervisor','professional')))
 or p_change ? 'scienceUsers' and (jsonb_typeof(p_change->'scienceUsers')<>'array' or exists(select 1 from jsonb_array_elements_text(p_change->'scienceUsers') z where not exists(select 1 from public.care_recipient_memberships where care_recipient_id=p_patient and user_id=z::uuid and status='active')))
 or exists(select 1 from jsonb_each(p_change) z where z.key in ('whatsappSimpleAcceptance','scienceRequired','scienceByDispatch','scienceAutomatic','scienceWhatsApp') and jsonb_typeof(z.value)<>'boolean')
 or p_change ? 'archiveDays' and (p_change->>'archiveDays')::integer not between 1 and 365
 or p_change ? 'reminderHours' and (p_change->>'reminderHours')::integer not between 1 and 720
 or p_change ? 'reminderRepeatHours' and (p_change->>'reminderRepeatHours')::integer not between 1 and 720
 or p_change ? 'shareWaitSeconds' and (p_change->>'shareWaitSeconds')::integer not between 0 and 10
 or p_change ? 'patientShortName' and length(trim(p_change->>'patientShortName')) not between 1 and 60 then raise exception 'invalid patient settings';end if;
 if p_change ? 'balReminderUsers' and (jsonb_typeof(p_change->'balReminderUsers') is distinct from 'array' or jsonb_array_length(p_change->'balReminderUsers')>100 or exists(select 1 from jsonb_array_elements_text(p_change->'balReminderUsers') u where not private.member_can(p_patient,u::uuid,'bal.count'))) then raise exception 'invalid BAL reminder recipients';end if;
 if p_change ? 'shiftReminder' and (jsonb_typeof(p_change->'shiftReminder') is distinct from 'object' or jsonb_typeof(p_change->'shiftReminder'->'enabled') is distinct from 'boolean' or coalesce((p_change->'shiftReminder'->>'hour')::integer,-1) not between 0 and 23
 or jsonb_typeof(p_change->'shiftReminder'->'days') is distinct from 'array' or jsonb_typeof(p_change->'shiftReminder'->'userIds') is distinct from 'array'
 or exists(select 1 from jsonb_array_elements_text(p_change->'shiftReminder'->'days') d where d not in ('0','1','2','3','4','5','6'))
 or exists(select 1 from jsonb_array_elements_text(p_change->'shiftReminder'->'userIds') u where not private.member_can(p_patient,u::uuid,'consumption.report'))) then raise exception 'invalid shift reminder policy';end if;
 elsif p_kind='capability' then
 if not exists(select 1 from public.capability_definitions where code=p_change->>'capability')
 or (p_change->>'subjectUser' is null)=(p_change->>'subjectRole' is null)
 or not(p_change ? 'enabled') or p_change->'enabled'<>'null'::jsonb and jsonb_typeof(p_change->'enabled')<>'boolean'
 or p_change->>'subjectRole' is not null and p_change->>'subjectRole' not in ('admin','family','supervisor','professional','reader') then raise exception 'invalid capability override';end if;
 if p_change->>'subjectUser' is not null and not exists(select 1 from public.care_recipient_memberships where care_recipient_id=p_patient and user_id=(p_change->>'subjectUser')::uuid and status='active') then raise exception 'invalid patient member';end if;
 if p_change->>'capability'='access.manage' then raise exception 'administrator governance cannot be overridden';end if;
 elsif p_kind='membership' then
 if p_change->>'role' is null or p_change->>'role' not in ('admin','family','supervisor','professional','reader') or not exists(select 1 from public.profiles where id=(p_change->>'userId')::uuid and status='active') then raise exception 'invalid membership';end if;
 elsif p_kind='notification_rule' then
 if p_change->>'event' is null or p_change->>'role' not in ('admin','family','supervisor','professional','reader') or jsonb_typeof(p_change->'channels') is distinct from 'array' then raise exception 'invalid notification rule';end if;
 if p_change ? 'mode' and p_change->>'mode' not in ('required','optional','silent') then raise exception 'invalid notification mode';end if;
 elsif p_kind='administration' then
 if p_change->>'operation' is null or p_change->>'operation' not in ('recipient','product','adoptProduct','membershipStatus','alertRule','notificationRecipient') or jsonb_typeof(p_change->'args') is distinct from 'object' then raise exception 'invalid administrative proposal';end if;
 else raise exception 'invalid access change';end if;
 insert into public.access_change_requests(care_recipient_id,kind,proposed,base_version,proposed_by,idempotency_key)
 values(p_patient,p_kind,p_change,s.version,auth.uid(),p_key) returning id into rid;
 if local_admin then
 if p_kind='capability' and p_change->'enabled'='null'::jsonb then
 delete from public.capability_overrides where care_recipient_id=p_patient and capability=p_change->>'capability'
 and (subject_role=p_change->>'subjectRole' or subject_user=(p_change->>'subjectUser')::uuid);
 update public.patient_settings set version=version+1,updated_at=now() where care_recipient_id=p_patient;
 update public.access_change_requests set status='applied',decided_at=now() where id=rid;
 else perform private.apply_access_change(rid);end if;
 end if;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),case when local_admin then 'access.changed.local' else 'access.proposed.global' end,'access_change',rid,jsonb_build_object('care_recipient_id',p_patient,'kind',p_kind));
 return (select to_jsonb(q) from public.access_change_requests q where id=rid);
end;$function$
