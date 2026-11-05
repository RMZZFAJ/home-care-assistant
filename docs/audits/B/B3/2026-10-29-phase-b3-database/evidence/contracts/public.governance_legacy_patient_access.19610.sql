CREATE OR REPLACE FUNCTION public.governance_legacy_patient_access(p_patient uuid, p_kind text, p_change jsonb, p_key uuid, p_version integer, p_request_id uuid DEFAULT NULL::uuid, p_decision text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 perform private.require_cap(p_patient,'access.manage');
 if p_request_id is null then
 if jsonb_typeof(p_change) is distinct from 'object' then raise exception 'invalid access change';end if;
 if p_kind='settings' then
 if exists(select 1 from jsonb_each(p_change) e where
 e.key='balDay' and not(e.value='null'::jsonb or jsonb_typeof(e.value)='number' and e.value::text~'^[0-6]$')
 or e.key='balReview' and (jsonb_typeof(e.value)<>'string' or e.value#>>'{}' not in ('optional','required'))
 or e.key='balRequirement' and (jsonb_typeof(e.value)<>'string' or e.value#>>'{}' not in ('any','all'))
 or e.key='whatsappSimpleAcceptance' and jsonb_typeof(e.value)<>'boolean'
 or e.key='balApprovers' and jsonb_typeof(e.value)<>'array') then raise exception 'invalid settings';end if;
 if p_change ? 'balApprovers' and (
 jsonb_array_length(p_change->'balApprovers') not between 1 and 2
 or exists(select 1 from jsonb_array_elements(p_change->'balApprovers') a where jsonb_typeof(a)<>'string' or a#>>'{}' not in ('family','supervisor'))
 or (select count(distinct a) from jsonb_array_elements(p_change->'balApprovers') a)<>jsonb_array_length(p_change->'balApprovers')) then raise exception 'invalid approvers';end if;
 elsif p_kind='capability' then
 if exists(select 1 from jsonb_object_keys(p_change) k where k not in ('capability','subjectUser','subjectRole','enabled'))
 or p_change ? 'subjectRole' and coalesce(p_change->>'subjectRole','') not in ('admin','family','supervisor','professional','reader') then raise exception 'invalid capability subject';end if;
 elsif p_kind='membership' then
 if exists(select 1 from jsonb_object_keys(p_change) k where k not in ('userId','role'))
 or coalesce(p_change->>'role','') not in ('admin','family','supervisor','professional','reader')
 or p_change->>'userId' is null then raise exception 'invalid membership change';end if;
 end if;
 end if;
 return public.validated_legacy_patient_access(p_patient,p_kind,p_change,p_key,p_version,p_request_id,p_decision);
end;$function$
