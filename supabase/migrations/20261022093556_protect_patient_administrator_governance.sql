-- Access administration is intrinsic to an active patient administrator membership.
-- Revoke the membership to remove that role; an override must not lock out governance.
alter function public.configure_patient_access(uuid,text,jsonb,uuid,integer,uuid,text) rename to governance_legacy_patient_access;
revoke all on function public.governance_legacy_patient_access(uuid,text,jsonb,uuid,integer,uuid,text) from public,anon,authenticated,service_role;
create function public.configure_patient_access(p_patient uuid,p_kind text,p_change jsonb,p_key uuid,p_version integer,p_request_id uuid default null,p_decision text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare proposed jsonb:=p_change;kind text:=p_kind;begin
 perform private.require_cap(p_patient,'access.manage');
 if p_request_id is not null then select c.kind,c.proposed into kind,proposed from public.access_change_requests c where id=p_request_id and care_recipient_id=p_patient;end if;
 if kind='capability' and proposed->>'capability'='access.manage' and proposed->'enabled'='false'::jsonb
 and (proposed->>'subjectRole'='admin' or exists(select 1 from public.care_recipient_memberships where care_recipient_id=p_patient and user_id=(proposed->>'subjectUser')::uuid and role='admin' and status='active')) then
 raise exception 'administrator governance cannot be disabled by override' using errcode='23514';end if;
 return public.governance_legacy_patient_access(p_patient,p_kind,p_change,p_key,p_version,p_request_id,p_decision);
end;$$;
grant execute on function public.configure_patient_access(uuid,text,jsonb,uuid,integer,uuid,text) to authenticated;
