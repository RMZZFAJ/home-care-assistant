CREATE OR REPLACE FUNCTION public.v4_review_patient_access(p_patient uuid, p_kind text, p_change jsonb, p_key uuid, p_version integer, p_request_id uuid DEFAULT NULL::uuid, p_decision text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare change jsonb:=p_change;kind text:=p_kind;item record;elements integer;begin
 if not public.can_manage_recipient(p_patient) and not public.is_global_administrator() then raise exception 'administrator authorization required' using errcode='42501';end if;
 if p_request_id is not null then select proposed,c.kind into change,kind from public.access_change_requests c where c.id=p_request_id and c.care_recipient_id=p_patient;end if;
 if kind='settings' then
 for item in select key,value from jsonb_each(change) loop
 if item.key in ('balReview','balRequirement','scienceRequirement','patientShortName') and (jsonb_typeof(item.value) is distinct from 'string' or length(trim(item.value#>>'{}'))=0) then raise exception 'invalid patient settings';end if;
 if item.key in ('archiveDays','reminderHours','reminderRepeatHours','shareWaitSeconds') or item.key='balDay' and item.value<>'null'::jsonb then
 if jsonb_typeof(item.value) is distinct from 'number' or (item.value#>>'{}')!~'^[0-9]+$' then raise exception 'integer patient setting required';end if;end if;
 if item.key in ('balApprovers','scienceRoles','scienceUsers','balReminderUsers') then
 if jsonb_typeof(item.value) is distinct from 'array' then raise exception 'array patient setting required';end if;
 elements:=jsonb_array_length(item.value);
 if elements>100 or exists(select 1 from jsonb_array_elements(item.value) e where jsonb_typeof(e) is distinct from 'string') or (select count(distinct e) from jsonb_array_elements_text(item.value) e)<>elements then raise exception 'unique string settings required';end if;end if;
 if item.key='shiftReminder' then
 if jsonb_typeof(item.value) is distinct from 'object' or exists(select 1 from jsonb_object_keys(item.value) k where k not in ('enabled','hour','days','userIds'))
 or jsonb_typeof(item.value->'hour') is distinct from 'number' or coalesce(item.value->>'hour','')!~'^[0-9]+$' then raise exception 'invalid shift settings';end if;
 if jsonb_typeof(item.value->'days') is distinct from 'array' or jsonb_typeof(item.value->'userIds') is distinct from 'array' then raise exception 'invalid shift recipients or days';end if;
 if exists(select 1 from jsonb_array_elements(item.value->'days') e where jsonb_typeof(e) is distinct from 'string') or exists(select 1 from jsonb_array_elements(item.value->'userIds') e where jsonb_typeof(e) is distinct from 'string') then raise exception 'invalid shift values';end if;
 end if;
 end loop;
 elsif kind='capability' and change->>'capability'='access.manage' then raise exception 'administrator governance cannot be overridden' using errcode='23514';
 elsif kind='notification_rule' and change ? 'mode' and (jsonb_typeof(change->'mode') is distinct from 'string' or change->>'mode' not in ('required','optional','silent')) then raise exception 'invalid notification mode';end if;
 return public.v4_configure_patient_access(p_patient,p_kind,p_change,p_key,p_version,p_request_id,p_decision);
end;$function$
