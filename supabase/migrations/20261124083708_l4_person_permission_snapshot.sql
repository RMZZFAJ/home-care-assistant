-- This projection reports one active member's capabilities in one authorized
-- residence. It uses the same effective decision as the operational policies.
create function private.patient_permission_snapshot(p_patient uuid, p_subject uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_subject_role text;
  result jsonb;
begin
  if not public.can_manage_recipient(p_patient) and not public.is_global_administrator() then
    raise exception 'patient administration authorization required' using errcode = '42501';
  end if;

  select m.role::text into v_subject_role
    from public.care_recipient_memberships m
    join public.profiles p on p.id = m.user_id and p.status = 'active'
   where m.care_recipient_id = p_patient and m.user_id = p_subject and m.status = 'active';
  if not found then
    raise exception 'active patient member unavailable' using errcode = '42501';
  end if;

  with definitions as (
    select d.code, d.critical, v_subject_role = any(d.allowed_roles) as eligible,
      v_subject_role = any(d.default_roles) as enabled_by_default
    from jsonb_to_recordset(private.capability_definition_rows(p_patient))
      as d(code text, critical boolean, allowed_roles text[], default_roles text[])
  ), evaluated as (
    select d.code, d.critical, d.eligible,
      private.member_can(p_patient, p_subject, d.code) as effective,
      d.eligible and coalesce(role_setting.enabled, d.enabled_by_default) as inherited,
      personal.enabled as exception,
      case
        when not d.eligible then 'limited'
        when personal.enabled is not null then 'personal'
        when role_setting.enabled is not null then 'profile'
        else 'default'
      end as origin
    from definitions d
    left join public.capability_overrides role_setting
      on role_setting.care_recipient_id = p_patient and role_setting.capability = d.code
      and role_setting.subject_role = v_subject_role and d.code <> 'access.manage'
    left join public.capability_overrides personal
      on personal.care_recipient_id = p_patient and personal.capability = d.code
      and personal.subject_user = p_subject and d.eligible and d.code <> 'access.manage'
  )
  select jsonb_build_object(
    'careRecipientId', p_patient,
    'personId', p_subject,
    'role', v_subject_role,
    'policyVersion', coalesce((select version from public.patient_settings where care_recipient_id = p_patient), 1),
    'permissions', coalesce(jsonb_agg(jsonb_build_object(
      'code', e.code, 'critical', e.critical, 'roleEligible', e.eligible,
      'effective', e.effective, 'inherited', e.inherited, 'exception', e.exception, 'origin', e.origin
    ) order by e.code), '[]'::jsonb)
  ) into result from evaluated e;
  return result;
end;
$$;

create function public.patient_permission_snapshot(p_patient uuid, p_subject uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select private.patient_permission_snapshot(p_patient, p_subject);
$$;

revoke all on function private.patient_permission_snapshot(uuid, uuid),
  public.patient_permission_snapshot(uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function private.patient_permission_snapshot(uuid, uuid),
  public.patient_permission_snapshot(uuid, uuid) to authenticated;
