-- Local preparation reads registered facts; it neither grants a role nor attests physical work.
create or replace function public.local_preparation_context(p_patient uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare c jsonb; d public.care_recipients; people_allowed boolean; catalogue_allowed boolean;
 family_read boolean; team_read boolean; family_manage boolean; schedule_read boolean; schedule_manage boolean;
 balance_read boolean; balance_manage boolean; reference_zone text;
begin
 c:=public.my_active_context();
 if private.auth_session() is null or c->>'mode' is distinct from 'patient'
 or c->>'care_recipient_id' is distinct from p_patient::text or not public.can_access_recipient(p_patient) then
  raise exception 'local patient context required' using errcode='42501';
 end if;
 people_allowed:=private.can(p_patient,'access.manage');
 catalogue_allowed:=private.can(p_patient,'catalog.manage');
 family_read:=private.can(p_patient,'stock.family.read'); team_read:=private.can(p_patient,'stock.team.read');
 family_manage:=private.can(p_patient,'stock.family.manage');
 schedule_read:=private.can(p_patient,'schedule.read.team'); schedule_manage:=private.can(p_patient,'schedule.manage.team');
 balance_read:=private.can(p_patient,'bal.read');
 balance_manage:=private.can(p_patient,'bal.schedule.manage') and public.recipient_role(p_patient) in ('admin','family');
 if not (people_allowed or catalogue_allowed or family_manage or schedule_manage or balance_manage) then
  raise exception 'local preparation capability required' using errcode='42501';
 end if;
 select * into strict d from public.care_recipients where id=p_patient;
 select content->>'timeZone' into reference_zone from private.residence_preparations
 where care_recipient_id=p_patient and state='preparing' order by saved_at desc,id limit 1;
 return jsonb_build_object(
  'patientId',p_patient,'observedAt',transaction_timestamp(),'source','registered_metadata',
  'patient',jsonb_build_object('name',d.display_name,'active',d.is_active,'referenceTimeZone',reference_zone),
  'people',case when people_allowed then jsonb_build_object(
   'activeMemberships',(select count(*) from public.care_recipient_memberships where care_recipient_id=p_patient and status='active'),
   'pendingInvitations',(select count(*) from public.care_recipient_invitations where care_recipient_id=p_patient and status='pending' and expires_at>transaction_timestamp()),
   'expiredInvitations',(select count(*) from public.care_recipient_invitations where care_recipient_id=p_patient and status='pending' and expires_at<=transaction_timestamp())) end,
  'catalogue',case when catalogue_allowed then jsonb_build_object(
   'activeProducts',(select count(*) from public.care_recipient_products where care_recipient_id=p_patient and is_active),
   'inactiveProducts',(select count(*) from public.care_recipient_products where care_recipient_id=p_patient and not is_active)) end,
  'stock',case when family_read or team_read or family_manage then jsonb_build_object(
   'familyMovements',case when family_read then (select count(*) from public.stock_movements where care_recipient_id=p_patient and (source_location='FAMILY' or destination_location='FAMILY')) end,
   'teamMovements',case when team_read then (select count(*) from public.stock_movements where care_recipient_id=p_patient and (source_location='CARE_TEAM' or destination_location='CARE_TEAM')) end,
   'canManageFamily',family_manage and d.is_active) end,
  'schedules',case when schedule_read then jsonb_build_object(
   'totalShifts',(select count(*) from public.scheduled_shifts where care_recipient_id=p_patient),
   'upcomingShifts',(select count(*) from public.scheduled_shifts where care_recipient_id=p_patient and status='published' and ends_at>=transaction_timestamp()),
   'canManageTeam',schedule_manage and d.is_active) end,
  'balance',case when balance_read then jsonb_build_object(
   'enabled',exists(select 1 from public.bal_regimes where care_recipient_id=p_patient and enabled),
   'timeZone',(select timezone from public.bal_regimes where care_recipient_id=p_patient),
   'canConfigure',balance_manage and d.is_active) end,
  'communication',case when people_allowed then jsonb_build_object(
   'guideConfigured',exists(select 1 from private.patient_guide_settings where care_recipient_id=p_patient),
   'guideEnabled',coalesce((select show_on_first_access from private.patient_guide_settings where care_recipient_id=p_patient),true)) end
 );
end;$$;
revoke all on function public.local_preparation_context(uuid) from public,anon,authenticated,service_role;
grant execute on function public.local_preparation_context(uuid) to authenticated;
