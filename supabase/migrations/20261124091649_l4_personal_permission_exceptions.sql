alter table public.capability_overrides
  add column individual_confirmed boolean not null default false,
  add constraint capability_individual_confirmation check (not individual_confirmed or subject_user is not null);

create function private.capability_role_eligible(p_patient uuid, p_role text, p_code text)
returns boolean language sql stable set search_path = '' as $$
  select case
    when p_code = 'access.manage' then p_role = 'admin'
    when p_code like 'com.%' or p_code in ('bal.defer.approve', 'bal.schedule.manage', 'bal.approve.family')
      then p_role in ('admin', 'family')
    when p_code = 'ent.regularize' then p_role in ('admin', 'family')
    when p_code = 'ent.follow_up' then p_role in ('admin', 'family', 'professional', 'supervisor')
    when p_code = 'bal.count' and exists (
      select 1 from public.bal_regimes b where b.care_recipient_id = p_patient and b.activated_at is not null
    ) then p_role in ('supervisor', 'professional')
    else true
  end;
$$;

create function private.inherited_capability(p_patient uuid, p_role text, p_code text)
returns boolean language sql stable set search_path = '' as $$
  select private.capability_role_eligible(p_patient, p_role, p_code)
    and case when p_code = 'access.manage' then p_role = 'admin' else coalesce(
      (select o.enabled from public.capability_overrides o
       where o.care_recipient_id = p_patient and o.subject_role = p_role and o.capability = p_code),
      (select p_role = any(d.default_roles) from public.capability_definitions d where d.code = p_code),
      false
    ) end;
$$;

create or replace function private.member_can(p_patient uuid, p_user uuid, p_capability text)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  member_role text;
  personal boolean;
begin
  select m.role::text into member_role
    from public.care_recipient_memberships m
    join public.profiles p on p.id = m.user_id and p.status = 'active'
   where m.care_recipient_id = p_patient and m.user_id = p_user and m.status = 'active';
  if not found then return false; end if;

  select o.enabled into personal from public.capability_overrides o
   where o.care_recipient_id = p_patient and o.capability = p_capability and o.subject_user = p_user
     and (o.individual_confirmed or
       (p_capability <> 'access.manage' and (not o.enabled or private.capability_role_eligible(p_patient, member_role, p_capability))));
  return coalesce(personal, private.inherited_capability(p_patient, member_role, p_capability));
end;
$$;

create or replace function public.can_manage_recipient(p_recipient_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.can_access_recipient(p_recipient_id)
    and private.member_can(p_recipient_id, auth.uid(), 'access.manage')
    and private.admin_assurance(), false);
$$;

create or replace function private.can(p_patient uuid, p_capability text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_access_recipient(p_patient) and private.member_can(p_patient, auth.uid(), p_capability)
    and ((public.recipient_role(p_patient) <> 'admin' and p_capability <> 'access.manage')
      or p_capability like '%.read' or private.admin_assurance());
$$;

create or replace function private.capability_definition_rows(p_patient uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(to_jsonb(c) || jsonb_build_object(
    'allowed_roles', a.roles,
    'default_roles', array(select r from unnest(c.default_roles) r where r = any(a.roles))
  ) order by c.code), '[]')
  from public.capability_definitions c
  cross join lateral (
    select array(select r from unnest(array['admin', 'family', 'supervisor', 'professional', 'reader']) r
      where private.capability_role_eligible(p_patient, r, c.code)) roles
  ) a;
$$;

create function private.other_patient_administrator(p_patient uuid, p_subject uuid)
returns boolean language sql stable set search_path = '' as $$
  select exists (
    select 1 from public.care_recipient_memberships m
    where m.care_recipient_id = p_patient and m.user_id <> p_subject
      and m.role = 'admin' and m.status = 'active'
      and private.member_can(p_patient, m.user_id, 'access.manage')
  );
$$;

create function private.validate_capability_change(p_patient uuid, p_change jsonb)
returns text language plpgsql set search_path = '' as $$
declare
  capability_code text := p_change->>'capability';
  subject uuid := (p_change->>'subjectUser')::uuid;
  member_role text := p_change->>'subjectRole';
  enabled boolean := (p_change->>'enabled')::boolean;
  confirmed boolean := p_change->'confirmIndividual' is not distinct from 'true'::jsonb;
begin
  if jsonb_typeof(p_change) is distinct from 'object'
    or not exists (select 1 from public.capability_definitions d where d.code = capability_code)
    or (subject is null) = (member_role is null)
    or not (p_change ? 'enabled') or jsonb_typeof(p_change->'enabled') not in ('boolean', 'null')
    or exists (select 1 from jsonb_object_keys(p_change) k
      where k not in ('capability', 'subjectUser', 'subjectRole', 'enabled', 'confirmIndividual', 'reviewedRole'))
    or p_change ? 'confirmIndividual' and not confirmed then
    raise exception 'invalid capability override' using errcode = '22023';
  end if;

  if subject is null then
    if capability_code = 'access.manage' or p_change ?| array['confirmIndividual', 'reviewedRole']
      or member_role not in ('admin', 'family', 'supervisor', 'professional', 'reader')
      or enabled is not null and not private.capability_role_eligible(p_patient, member_role, capability_code) then
      raise exception 'capability unavailable for collective adjustment' using errcode = '23514';
    end if;
    return member_role;
  end if;

  select m.role::text into member_role
    from public.care_recipient_memberships m
    join public.profiles p on p.id = m.user_id and p.status = 'active'
   where m.care_recipient_id = p_patient and m.user_id = subject and m.status = 'active'
   for share of m, p;
  if not found then raise exception 'active patient member unavailable' using errcode = '42501'; end if;
  if p_change ? 'reviewedRole' and (p_change->>'reviewedRole') is distinct from member_role then
    raise exception 'subject role changed after review' using errcode = 'PT409';
  end if;

  if (capability_code = 'access.manage' or enabled and not private.inherited_capability(p_patient, member_role, capability_code))
    and (not confirmed or not (p_change ? 'reviewedRole')) then
    raise exception 'individual access confirmation required' using errcode = '23514';
  end if;

  if subject = auth.uid() and (enabled or enabled is null and private.inherited_capability(p_patient, member_role, capability_code))
    and (capability_code = 'access.manage' and enabled or not private.member_can(p_patient, subject, capability_code)) then
    raise exception 'self elevation is unavailable' using errcode = '42501';
  end if;
  return member_role;
end;
$$;

create function private.apply_capability_change(p_id uuid)
returns void language plpgsql set search_path = '' as $$
declare
  change_row public.access_change_requests;
  change_body jsonb;
  code text;
  subject uuid;
  member_role text;
  desired boolean;
  before_state boolean;
  after_state boolean;
  actor_allowed boolean;
  decision jsonb;
begin
  select * into strict change_row from public.access_change_requests where id = p_id;
  change_body := change_row.proposed;
  code := change_body->>'capability';
  subject := (change_body->>'subjectUser')::uuid;
  desired := (change_body->>'enabled')::boolean;
  member_role := private.validate_capability_change(change_row.care_recipient_id, change_body);
  before_state := case when subject is null then private.inherited_capability(change_row.care_recipient_id, member_role, code)
    else private.member_can(change_row.care_recipient_id, subject, code) end;
  actor_allowed := private.member_can(change_row.care_recipient_id, auth.uid(), code);

  if desired is null then
    delete from public.capability_overrides o
     where o.care_recipient_id = change_row.care_recipient_id and o.capability = code
       and (o.subject_user = subject or subject is null and o.subject_role = member_role);
  elsif subject is null then
    insert into public.capability_overrides(care_recipient_id, capability, subject_role, enabled)
    values (change_row.care_recipient_id, code, member_role, desired)
    on conflict (care_recipient_id, capability, subject_role) where subject_role is not null
    do update set enabled = excluded.enabled;
  else
    insert into public.capability_overrides(care_recipient_id, capability, subject_user, enabled, individual_confirmed)
    values (change_row.care_recipient_id, code, subject, desired, change_body->'confirmIndividual' = 'true'::jsonb is true)
    on conflict (care_recipient_id, capability, subject_user) where subject_user is not null
    do update set enabled = excluded.enabled, individual_confirmed = excluded.individual_confirmed;
  end if;

  after_state := case when subject is null then private.inherited_capability(change_row.care_recipient_id, member_role, code)
    else private.member_can(change_row.care_recipient_id, subject, code) end;
  if subject is null and not actor_allowed and private.member_can(change_row.care_recipient_id, auth.uid(), code) then
    raise exception 'self elevation is unavailable' using errcode = '42501';
  end if;
  if code = 'access.manage' and member_role = 'admin' and not after_state
    and not private.other_patient_administrator(change_row.care_recipient_id, subject) then
    raise exception 'last patient administrator must remain active' using errcode = '23514';
  end if;
  decision := jsonb_build_object('actorId', auth.uid(),
    'actorName', (select full_name from public.profiles where id = auth.uid()),
    'personId', subject, 'role', member_role, 'capability', code, 'before', before_state, 'after', after_state);
  update public.patient_settings set version = version + 1, updated_at = now()
   where care_recipient_id = change_row.care_recipient_id;
  update public.access_change_requests set status = 'applied', decided_at = now(), resolution = jsonb_build_object('permission', decision)
   where id = p_id;
  insert into public.audit_events(actor_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), 'access.applied', 'access_change', p_id,
    jsonb_build_object('care_recipient_id', change_row.care_recipient_id, 'kind', 'capability', 'permission', decision));
end;
$$;

-- Keep the existing version, idempotency, invitation and independent approval paths.
-- Replace just the capability branch and route both decisions through one applier.
do $migration$
declare
  definition text;
  start_at integer;
  end_at integer;
  old_body text;
  anchor constant text := 'if not public.can_manage_recipient(c.care_recipient_id) then raise exception ''local administrator required'' using errcode=''42501'';end if;';
  local_change constant text := 'if p_kind=''capability'' and p_change->''enabled''=''null''::jsonb then';
  local_end constant text := 'else perform private.apply_access_change(rid);end if;';
  rejection constant text := 'elsif kind=''capability'' and change->>''capability''=''access.manage'' then raise exception ''administrator governance cannot be overridden'' using errcode=''23514'';';
  own_transition constant text := 'own_transition:=(result->>''kind''=''membership''';
begin
  definition := pg_get_functiondef('private.apply_access_change(uuid)'::regprocedure);
  if strpos(definition, anchor) = 0 then raise exception 'access application definition changed'; end if;
  execute replace(definition, anchor, anchor || E'\n  if c.kind = ''capability'' then perform private.apply_capability_change(p_id); return; end if;');

  definition := pg_get_functiondef('public.v4_configure_patient_access(uuid,text,jsonb,uuid,integer,uuid,text)'::regprocedure);
  start_at := strpos(definition, 'elsif p_kind=''capability'' then');
  end_at := strpos(definition, 'elsif p_kind=''membership'' then');
  if start_at = 0 or end_at <= start_at then raise exception 'capability definition changed'; end if;
  old_body := substr(definition, start_at, end_at - start_at);
  definition := replace(definition, old_body, E'elsif p_kind=''capability'' then\n  perform private.validate_capability_change(p_patient, p_change);\n ');
  start_at := strpos(definition, local_change);
  end_at := strpos(definition, local_end);
  if start_at = 0 or end_at <= start_at then raise exception 'local capability application changed'; end if;
  execute overlay(definition placing 'perform private.apply_access_change(rid);'
    from start_at for end_at - start_at + length(local_end));

  definition := pg_get_functiondef('public.v4_review_patient_access(uuid,text,jsonb,uuid,integer,uuid,text)'::regprocedure);
  if strpos(definition, rejection) = 0 then raise exception 'global proposal validation changed'; end if;
  execute replace(definition, rejection, '');

  definition := pg_get_functiondef('public.configure_patient_access(uuid,text,jsonb,uuid,integer,uuid,text)'::regprocedure);
  if strpos(definition, own_transition) = 0 then raise exception 'governance final authorization changed'; end if;
  execute replace(definition, own_transition, $self$
   own_transition:=(result->>'kind'='capability' and change->>'capability'='access.manage'
     and change->>'subjectUser'=auth.uid()::text and change->'enabled' in ('null'::jsonb, 'false'::jsonb)
     and result->'resolution'->'permission'->'after'='false'::jsonb)
    or (result->>'kind'='membership'$self$);
end;
$migration$;

create or replace function private.guard_membership_elevation()
returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is null and current_user <> 'authenticated' then return new; end if;
  if tg_op = 'UPDATE' and old.role = 'admin' and old.status = 'active'
    and (new.role <> 'admin' or new.status <> 'active')
    and not private.other_patient_administrator(old.care_recipient_id, old.user_id) then
    raise exception 'last patient administrator must remain active' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and new.user_id = auth.uid() and old.role <> 'admin' and new.role <> old.role then
    raise exception 'self elevation is unavailable' using errcode = '42501';
  end if;
  if exists (
    select 1 from private.membership_authority a
    where a.backend_pid = pg_backend_pid() and a.transaction_id = txid_current()
      and a.care_recipient_id = new.care_recipient_id and a.user_id = new.user_id and a.role = new.role
      and a.manage_stock = new.can_manage_stock and a.count_stock = new.can_count_stock and new.status = 'active'
  ) then return new; end if;
  if not public.can_manage_recipient(new.care_recipient_id) then
    raise exception 'local administrator required' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function private.patient_permission_snapshot(p_patient uuid, p_subject uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  member_role text;
  result jsonb;
begin
  if not public.can_manage_recipient(p_patient) and not public.is_global_administrator() then
    raise exception 'patient administration authorization required' using errcode = '42501';
  end if;
  select m.role::text into member_role from public.care_recipient_memberships m
    join public.profiles p on p.id = m.user_id and p.status = 'active'
   where m.care_recipient_id = p_patient and m.user_id = p_subject and m.status = 'active';
  if not found then raise exception 'active patient member unavailable' using errcode = '42501'; end if;

  with definitions as (
    select d.code, d.critical, private.capability_role_eligible(p_patient, member_role, d.code) as eligible
    from public.capability_definitions d
  )
  select jsonb_build_object(
    'careRecipientId', p_patient, 'personId', p_subject, 'role', member_role,
    'policyVersion', coalesce((select version from public.patient_settings where care_recipient_id = p_patient), 1),
    'permissions', coalesce(jsonb_agg(jsonb_build_object(
      'code', d.code, 'critical', d.critical, 'roleEligible', d.eligible,
      'effective', coalesce(personal.enabled, private.inherited_capability(p_patient, member_role, d.code)),
      'inherited', private.inherited_capability(p_patient, member_role, d.code),
      'exception', personal.enabled, 'origin', case
        when personal.enabled is not null then 'personal'
        when not d.eligible then 'limited'
        when role_setting.enabled is not null then 'profile'
        else 'default' end
    ) order by d.code), '[]'::jsonb)
  ) into result
  from definitions d
  left join public.capability_overrides role_setting
    on role_setting.care_recipient_id = p_patient and role_setting.capability = d.code
    and role_setting.subject_role = member_role and d.code <> 'access.manage'
  left join public.capability_overrides personal
    on personal.care_recipient_id = p_patient and personal.capability = d.code and personal.subject_user = p_subject
    and (personal.individual_confirmed or d.code <> 'access.manage' and (not personal.enabled or d.eligible));
  return result;
end;
$$;

revoke all on function private.capability_role_eligible(uuid, text, text),
  private.inherited_capability(uuid, text, text), private.other_patient_administrator(uuid, uuid),
  private.validate_capability_change(uuid, jsonb), private.apply_capability_change(uuid)
  from public, anon, authenticated, service_role;
