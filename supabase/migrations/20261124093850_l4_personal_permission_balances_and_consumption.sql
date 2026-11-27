create function private.family_consumption_confirmed(p_patient uuid, p_user uuid)
returns boolean language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.capability_overrides o
    where o.care_recipient_id = p_patient and o.subject_user = p_user
      and o.capability = 'consumption.report' and o.enabled and o.individual_confirmed
  );
$$;

create function private.member_can_report_family(p_patient uuid, p_user uuid)
returns boolean language sql stable set search_path = '' as $$
  select private.member_can(p_patient, p_user, 'consumption.report')
    and private.member_can(p_patient, p_user, 'stock.family.read')
    and (private.family_consumption_confirmed(p_patient, p_user) or exists (
      select 1 from public.care_recipient_memberships m
      where m.care_recipient_id = p_patient and m.user_id = p_user
        and m.status = 'active' and m.role in ('admin', 'family')
    ));
$$;

create function private.can_report_family_consumption(p_patient uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.can(p_patient, 'consumption.report') and private.can(p_patient, 'stock.family.read')
    and (public.recipient_role(p_patient) in ('admin', 'family')
      or private.family_consumption_confirmed(p_patient, auth.uid()));
$$;

revoke all on function private.family_consumption_confirmed(uuid, uuid),
  private.member_can_report_family(uuid, uuid), private.can_report_family_consumption(uuid)
  from public, anon, authenticated, service_role;

create or replace function private.require_consumption_report(p_patient uuid, p_location text)
returns void language plpgsql set search_path = '' as $$
begin
  perform private.require_cap(p_patient, 'consumption.report');
  perform private.require_consumption_read(p_patient, p_location);
  if p_location = 'FAMILY' and not coalesce(private.can_report_family_consumption(p_patient), false) then
    raise exception 'family scope required' using errcode = '42501';
  end if;
end;
$$;

create or replace function private.bal_family_authority(p_patient uuid, p_cap text)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.can(p_patient, p_cap);
$$;

create or replace function private.balance_permission_admin(p_patient uuid)
returns boolean language sql stable set search_path = '' as $$
  select private.can(p_patient, 'bal.schedule.manage') and private.can(p_patient, 'access.manage');
$$;

-- Family reporting is a broader use of a permission already granted by default
-- to several team roles. A collective grant of stock visibility cannot approve it.
-- Publish the scoped predicate with the same workspace read as other capabilities.
do $migration$
declare
  definition text;
  personal_review constant text :=
    'enabled and not private.inherited_capability(p_patient, member_role, capability_code)';
  workspace_capabilities constant text :=
    '''capabilities'',coalesce(capabilities_by_patient->c.id::text,''{}''::jsonb)';
  local_balance constant text :=
    'balance_manage:=private.can(p_patient,''bal.schedule.manage'') and public.recipient_role(p_patient) in (''admin'',''family'');';
  deferral_read constant text :=
    'v_authority:=coalesce(private.bal_family_authority(d.care_recipient_id,''bal.defer.approve''),false)';
  deferral_decision constant text :=
    'if not found then raise exception ''balance deferral not found'' using errcode=''P0002'';end if;';
  direct_deferral constant text := 'if p_action=''defer'' then';
begin
  definition := pg_get_functiondef('private.validate_capability_change(uuid,jsonb)'::regprocedure);
  if strpos(definition, personal_review) = 0 then raise exception 'permission review predicate changed'; end if;
  execute replace(definition, personal_review,
    'enabled and (not private.inherited_capability(p_patient, member_role, capability_code)
      or capability_code = ''consumption.report'' and member_role not in (''admin'', ''family''))');

  definition := pg_get_functiondef('public.my_workspace()'::regprocedure);
  if strpos(definition, workspace_capabilities) = 0 then raise exception 'workspace capability projection changed'; end if;
  execute replace(definition, workspace_capabilities, workspace_capabilities ||
    ', ''canReportFamilyConsumption'', case when capabilities_by_patient ? c.id::text
      then coalesce(private.can_report_family_consumption(c.id), false) else false end');

  definition := pg_get_functiondef('public.local_preparation_context(uuid)'::regprocedure);
  if strpos(definition, local_balance) = 0 then raise exception 'preparation scope predicate changed'; end if;
  execute replace(definition, local_balance, 'balance_manage:=private.can(p_patient,''bal.schedule.manage'');');

  -- Independent decisions stay independent when the reviewer can also count.
  definition := pg_get_functiondef('private.bal_deferral_context(uuid)'::regprocedure);
  if strpos(definition, deferral_read) = 0 then raise exception 'balance deferral projection changed'; end if;
  execute replace(definition, deferral_read, deferral_read || ' and d.requested_by <> auth.uid()');

  definition := pg_get_functiondef('private.decide_bal_deferral(uuid,jsonb,uuid,integer)'::regprocedure);
  if strpos(definition, deferral_decision) = 0 then raise exception 'balance deferral decision changed'; end if;
  execute replace(definition, deferral_decision, deferral_decision ||
    ' if d.requested_by = auth.uid() then raise exception ''distinct balance deferral reviewer required'' using errcode = ''42501''; end if;');

  definition := pg_get_functiondef('public.balance_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
  if strpos(definition, direct_deferral) = 0 then raise exception 'direct balance deferral command changed'; end if;
  execute replace(definition, direct_deferral, direct_deferral ||
    ' if v_a.professional_id = auth.uid() then raise exception ''distinct balance deferral reviewer required'' using errcode = ''42501''; end if;');
end;
$migration$;

-- The base capability may remain enabled for team reporting while the family
-- scope changes. Make that distinction explicit in review, audit and authority.
do $family_audit$
declare
  definition text;
  self_review constant text := 'if subject = auth.uid() and (enabled or enabled is null';
  origin_row constant text := replace($anchor$else 'default' end
    ) order by d.code), '[]'::jsonb)$anchor$, E'\r\n', E'\n');
  decision_declaration constant text := '  decision jsonb;';
  actor_state constant text := 'actor_allowed := private.member_can(change_row.care_recipient_id, auth.uid(), code);';
  settings_write constant text := 'update public.patient_settings set version = version + 1, updated_at = now()';
begin
  definition := pg_get_functiondef('private.validate_capability_change(uuid,jsonb)'::regprocedure);
  if strpos(definition, self_review) = 0 then raise exception 'self elevation predicate changed'; end if;
  execute replace(definition, self_review, $self$
  if subject = auth.uid() and enabled and capability_code = 'consumption.report'
    and member_role not in ('admin', 'family')
    and not private.family_consumption_confirmed(p_patient, subject) then
    raise exception 'self elevation is unavailable' using errcode = '42501';
  end if;
  $self$ || self_review);

  definition := replace(pg_get_functiondef('private.patient_permission_snapshot(uuid,uuid)'::regprocedure), E'\r\n', E'\n');
  if strpos(definition, origin_row) = 0 then raise exception 'permission origin projection changed'; end if;
  execute replace(definition, origin_row, $row$else 'default' end
    ) || case when d.code = 'consumption.report' then jsonb_build_object(
      'familyReportingConfirmed', private.family_consumption_confirmed(p_patient, p_subject)
    ) else '{}'::jsonb end order by d.code), '[]'::jsonb)$row$);

  definition := pg_get_functiondef('private.apply_capability_change(uuid)'::regprocedure);
  if strpos(definition, decision_declaration) = 0 or strpos(definition, actor_state) = 0
    or strpos(definition, settings_write) = 0 then raise exception 'permission audit definition changed'; end if;
  definition := replace(definition, decision_declaration, '  family_before boolean;' || E'\n' || decision_declaration);
  definition := replace(definition, actor_state, actor_state || $capture$
  if subject is not null and code in ('consumption.report', 'stock.family.read') then
    family_before := private.member_can_report_family(change_row.care_recipient_id, subject);
  end if;
  $capture$);
  execute replace(definition, settings_write, $history$
  if family_before is not null then
    decision := decision || jsonb_build_object('familyReportingBefore', family_before,
      'familyReportingAfter', private.member_can_report_family(change_row.care_recipient_id, subject));
  end if;
  $history$ || settings_write);
end;
$family_audit$;
