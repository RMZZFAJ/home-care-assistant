-- Preserve the complete workspace contract, while avoiding one authority/session
-- lookup per directory entry. Candidates only bound the work: native guards and
-- patient_capabilities still decide every effective capability. Worker authority
-- is transaction/backend scoped and remains independent of the selected UI mode.
create or replace function public.my_workspace() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
 person public.profiles;
 sid uuid;
 global_identity boolean;
 candidate uuid;
 capabilities_by_patient jsonb:='{}'::jsonb;
 patients jsonb;
begin
 select * into person from public.profiles where id=auth.uid() and status='active';
 sid:=private.auth_session();
 if person.id is null or sid is null then
  raise exception 'active Auth session required' using errcode='42501';
 end if;
 global_identity:=private.global_identity();

 for candidate in
  select a.care_recipient_id from private.authority_sessions a
  where a.session_id=sid and a.user_id=person.id and a.mode='patient'
  union
  select w.care_recipient_id from private.worker_authority w
  where w.backend_pid=pg_backend_pid() and w.transaction_id=txid_current()
    and w.user_id=person.id
 loop
  if public.can_access_recipient(candidate) then
   capabilities_by_patient:=capabilities_by_patient||jsonb_build_object(
    candidate::text,public.patient_capabilities(candidate));
  end if;
 end loop;

 select coalesce(jsonb_agg(jsonb_build_object(
  'id',c.id,'display_name',c.display_name,'is_active',c.is_active,
  'is_development',c.is_development,'role',m.role,
  'hasMembership',m.user_id is not null,
  'capabilities',coalesce(capabilities_by_patient->c.id::text,'{}'::jsonb)
 ) order by c.display_name,c.id),'[]'::jsonb) into patients
 from public.care_recipients c
 left join public.care_recipient_memberships m
  on m.care_recipient_id=c.id and m.user_id=person.id and m.status='active'
 where m.user_id is not null or global_identity;

 -- Session deadlines use the live clock. Do not return a directory prepared
 -- under an expired/revoked session, and do not cache authority between calls.
 if private.auth_session() is distinct from sid then
  raise exception 'active Auth session required' using errcode='42501';
 end if;
 return jsonb_build_object(
  'userId',person.id,'fullName',person.full_name,
  'isGlobalAdmin',global_identity,
  'globalAdministrationAllowed',public.is_global_administrator(),
  'activeContext',public.my_active_context(),'patients',patients,
  'avatarPath',person.avatar_path);
end;$$;
