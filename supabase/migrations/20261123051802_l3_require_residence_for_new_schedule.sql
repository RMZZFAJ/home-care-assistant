-- L3 uses the residence clock for new schedules. The released client still shares
-- this database, so keep its existing RPCs until the L3 rollout and use new
-- entry points for L3. Both paths use the same authorization and native journal.
create function public.schedule_residence_command(
  p_patient uuid, p_body jsonb, p_key uuid, p_version integer default null
) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare prior jsonb;
begin
  if jsonb_typeof(p_body->'residenceHours') is distinct from 'object' then
    -- Wait for the same lock as the command before checking for an old receipt.
    perform pg_advisory_xact_lock(hashtextextended('schedule:'||p_patient,0));
    prior:=public.schedule_confirmation(p_patient,p_key);
    if prior->'found' is distinct from 'true'::jsonb then
      raise exception 'schedule residence hours required' using errcode='PT409';
    end if;
  end if;
  -- The native RPC compares the original body, action and version on replay.
  return public.schedule_command(p_patient,'series',p_body,p_key,p_version);
end;
$$;

create function public.commit_schedule_residence_preparation(
  p_patient uuid, p_purpose text, p_id uuid, p_expected integer, p_body jsonb, p_key uuid
) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare prior jsonb;
begin
  if p_purpose='schedule_series_create'
    and jsonb_typeof(p_body#>'{body,residenceHours}') is distinct from 'object' then
    -- Recovery checks the owner, preparation and exact submitted intent.
    prior:=public.schedule_preparation_recovery(p_patient,p_purpose,p_id,p_expected,p_body,p_key);
    if prior->>'status'='applied' then
      return prior->'confirmation';
    end if;
    raise exception 'schedule residence hours required' using errcode='PT409';
  end if;
  return public.commit_schedule_preparation(p_patient,p_purpose,p_id,p_expected,p_body,p_key);
end;
$$;

revoke all on function public.schedule_residence_command(uuid,jsonb,uuid,integer),
  public.commit_schedule_residence_preparation(uuid,text,uuid,integer,jsonb,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.schedule_residence_command(uuid,jsonb,uuid,integer),
  public.commit_schedule_residence_preparation(uuid,text,uuid,integer,jsonb,uuid)
  to authenticated;
