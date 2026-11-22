-- Preserve deliberate self-demotion/revocation when another local admin remains.
-- Loss of authority caused by an unrelated concurrent action is still denied.
create or replace function public.configure_patient_access(p_patient uuid,p_kind text,p_change jsonb,p_key uuid,p_version integer,p_request_id uuid default null,p_decision text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare existing public.access_change_requests;result jsonb;was_local boolean;own_transition boolean:=false;change jsonb;begin
 if not public.can_manage_recipient(p_patient) and not public.is_global_administrator() then raise exception 'administrator authorization required' using errcode='42501';end if;
 if p_key is null or p_version is null or p_version<1 then raise exception 'governance intent and version required' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
 was_local:=public.can_manage_recipient(p_patient);
 if not was_local and not public.is_global_administrator() then raise exception 'administrator authorization required' using errcode='42501';end if;
 if p_request_id is null then
  select * into existing from public.access_change_requests where care_recipient_id=p_patient and idempotency_key=p_key;
  if found and (existing.base_version is distinct from p_version or existing.kind is distinct from p_kind
   or existing.proposed is distinct from p_change or existing.proposed_by is distinct from auth.uid()) then
   raise exception 'governance idempotency conflict' using errcode='23505';end if;
 end if;
 result:=public.phase_d2_configure_patient_access(p_patient,p_kind,p_change,p_key,p_version,p_request_id,p_decision);
 if not public.can_manage_recipient(p_patient) and not public.is_global_administrator() then
  change:=result->'proposed';
  if was_local and private.auth_session() is not null and private.admin_assurance()
   and public.my_active_context()->>'mode'='patient' and public.my_active_context()->>'care_recipient_id'=p_patient::text
   and result->>'status'='applied' and result->>'care_recipient_id'=p_patient::text then
   own_transition:=(result->>'kind'='membership' and change->>'userId'=auth.uid()::text and exists(
     select 1 from public.care_recipient_memberships m where m.care_recipient_id=p_patient and m.user_id=auth.uid()
      and m.status='active' and m.role::text=change->>'role' and m.role<>'admin'))
    or (result->>'kind'='administration' and change->>'operation'='membershipStatus'
     and change->'args'->>'userId'=auth.uid()::text and change->'args'->>'status'='revoked' and exists(
      select 1 from public.care_recipient_memberships m where m.care_recipient_id=p_patient and m.user_id=auth.uid() and m.status='revoked'));
  end if;
  if not coalesce(own_transition,false) then raise exception 'administrator authorization required' using errcode='42501';end if;
 end if;
 return result;
end;$$;

alter function private.access_change_current(uuid,text,jsonb) rename to phase_d3_initial_access_change_current;
revoke all on function private.phase_d3_initial_access_change_current(uuid,text,jsonb) from public,anon,authenticated,service_role;
create function private.access_change_current(p_patient uuid,p_kind text,p_change jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;product_name text;subject_role text;inherited boolean;begin
 result:=private.phase_d3_initial_access_change_current(p_patient,p_kind,p_change);
 if p_kind='administration' and p_change->>'operation' in ('product','adoptProduct','alertRule') then
  select p.name into product_name from public.products p where p.id=coalesce(p_change->'args'->>'productId',p_change->'args'->>'id')
   and (p.owner_care_recipient_id is null or p.owner_care_recipient_id=p_patient);
  result:=coalesce(result,'{}'::jsonb)||jsonb_build_object('_productName',product_name);
 elsif p_kind='capability' then
  subject_role:=p_change->>'subjectRole';
  if subject_role is null then select m.role::text into subject_role from public.care_recipient_memberships m where m.care_recipient_id=p_patient and m.user_id::text=p_change->>'subjectUser' and m.status='active';end if;
  select coalesce(d->'default_roles' ? subject_role,false) into inherited from jsonb_array_elements(private.capability_definition_rows(p_patient)) d where d->>'code'=p_change->>'capability';
  result:=coalesce(result,'{}'::jsonb)||jsonb_build_object('_inheritedEnabled',inherited);
 end if;
 return result;
end;$$;
revoke all on function private.access_change_current(uuid,text,jsonb),public.configure_patient_access(uuid,text,jsonb,uuid,integer,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.configure_patient_access(uuid,text,jsonb,uuid,integer,uuid,text) to authenticated;
