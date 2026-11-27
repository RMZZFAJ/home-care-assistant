begin;

create function public.operations_recover(p_environment text, p_key uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  saved private.operations_commands;
  outcome jsonb;
begin
  if actor is null or not public.is_global_administrator() then
    raise exception 'global authorization required' using errcode = '42501';
  end if;
  if p_key is null or not exists (
    select 1 from private.operations_config where environment = p_environment
  ) then
    raise exception 'invalid technical recovery scope' using errcode = '22023';
  end if;

  -- Serialize with submission on the same actor/key, including late arrivals.
  perform pg_advisory_xact_lock(hashtextextended('hca:operations-command:' || actor || ':' || p_key, 0));
  if not public.is_global_administrator() then
    raise exception 'global authorization required' using errcode = '42501';
  end if;
  select * into saved from private.operations_commands where actor_id = actor and idempotency_key = p_key;
  if found then
    if saved.environment is distinct from p_environment then
      raise exception 'technical recovery scope unavailable' using errcode = '42501';
    end if;
    return saved.receipt;
  end if;

  outcome := jsonb_build_object('environment', p_environment, 'idempotencyKey', p_key, 'recorded', false);
  insert into private.operations_commands(actor_id, idempotency_key, environment, request_hash, receipt)
  values (actor, p_key, p_environment, 'not-executed', outcome);
  return outcome;
end;
$$;

create function public.operations_incident(p_environment text, p_id uuid) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  result jsonb;
begin
  if not public.is_global_administrator() then
    raise exception 'global authorization required' using errcode = '42501';
  end if;
  select jsonb_build_object(
    'environment', i.environment,
    'incident', jsonb_build_object(
      'id', i.id, 'component', i.component, 'code', i.code, 'severity', i.severity,
      'state', i.state, 'version', i.version, 'policyVersion', i.policy_version,
      'firstObservedAt', i.first_observed_at, 'lastObservedAt', i.last_observed_at,
      'occurrences', i.occurrences, 'metricCount', i.metric_count,
      'acknowledgedAt', i.acknowledged_at, 'resolvedAt', i.resolved_at, 'correlationId', e.correlation_id,
      'history', coalesce((
        select jsonb_agg(h.item order by h.at, h.id)
        from (
          select l.id, l.recorded_at as at, jsonb_build_object(
            'action', l.action, 'at', l.recorded_at, 'version', l.version, 'reason', l.reason,
            'operator', case when l.actor_id is null then 'system' else 'global' end
          ) as item
          from private.operations_history l
          where l.environment = p_environment and l.incident_id = i.id
          order by l.recorded_at desc, l.id desc limit 12
        ) h
      ), '[]'::jsonb)
    )
  ) into result
  from private.operations_incidents i
  left join private.operations_events e on e.id = i.last_event_id and e.environment = i.environment
  where i.id = p_id and i.environment = p_environment;
  if result is null or not public.is_global_administrator() then
    raise exception 'incident unavailable' using errcode = '42501';
  end if;
  return result;
end;
$$;

revoke all on function public.operations_recover(text, uuid), public.operations_incident(text, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.operations_recover(text, uuid), public.operations_incident(text, uuid)
  to authenticated;

commit;
