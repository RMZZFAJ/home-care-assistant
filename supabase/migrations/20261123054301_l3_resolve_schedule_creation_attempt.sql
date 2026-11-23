-- Settle uncertainty on the same key and slot as confirmation. Only the
-- private revision changes, so an earlier packet cannot publish after this.
create function public.resolve_schedule_creation_attempt(
  p_patient uuid, p_purpose text, p_id uuid, p_expected integer,
  p_body jsonb, p_original_key uuid, p_key uuid
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  attempt private.schedule_preparation_commands;
  draft private.schedule_preparations;
  fingerprint text;
  lock_key uuid;
  outcome jsonb;
begin
  perform private.require_schedule_preparation_scope(p_patient,p_purpose);
  if p_original_key is null or p_key is null or p_original_key=p_key then
    raise exception 'distinct schedule resolution key required' using errcode='22023';
  end if;
  fingerprint:=encode(extensions.digest(jsonb_build_array(
    'schedule-creation-resolve',p_patient,p_purpose,p_id,p_expected,p_body,p_original_key
  )::text,'sha256'),'hex');
  for lock_key in select v from unnest(array[p_key,p_original_key]) v order by v loop
    perform pg_advisory_xact_lock(hashtextextended('schedule-preparation-key:'||auth.uid()||':'||lock_key,0));
  end loop;
  perform private.require_schedule_preparation_scope(p_patient,p_purpose);
  select * into attempt from private.schedule_preparation_commands where owner_id=auth.uid() and idempotency_key=p_key;
  if found then
    if attempt.intent_hash is distinct from fingerprint then
      raise exception 'private draft idempotency conflict' using errcode='23505';
    end if;
    return attempt.result;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('schedule-preparation-slot:'||auth.uid()||':'||p_patient||':'||p_purpose,0));
  perform pg_advisory_xact_lock(hashtextextended('schedule:'||p_patient,0));
  outcome:=public.schedule_preparation_recovery(p_patient,p_purpose,p_id,p_expected,p_body,p_original_key);
  if outcome->>'status'='unknown' then
    select * into draft from private.schedule_preparations
      where id=p_id and owner_id=auth.uid() and care_recipient_id=p_patient
        and purpose=p_purpose and revision=p_expected and state='active' for update;
    if not found then
      raise exception 'stale private draft revision' using errcode='PT409';
    end if;
    if p_body is distinct from private.schedule_creation_command(draft.content) then
      raise exception 'private schedule resolution intent mismatch' using errcode='22023';
    end if;
    update private.schedule_preparations set revision=revision+1,saved_at=clock_timestamp()
      where id=draft.id returning * into draft;
    outcome:=public.schedule_preparation_recovery(p_patient,p_purpose,p_id,p_expected,p_body,p_original_key);
    insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
      values(auth.uid(),'private_draft.resolve_attempt','schedule_preparation',draft.id,
        jsonb_build_object('care_recipient_id',p_patient,'revision',draft.revision));
  end if;
  insert into private.schedule_preparation_commands values(auth.uid(),p_key,p_id,fingerprint,outcome);
  perform private.require_schedule_preparation_scope(p_patient,p_purpose);
  return outcome;
end;
$$;

revoke all on function public.resolve_schedule_creation_attempt(uuid,text,uuid,integer,jsonb,uuid,uuid)
  from public,anon,authenticated,service_role;
grant execute on function public.resolve_schedule_creation_attempt(uuid,text,uuid,integer,jsonb,uuid,uuid)
  to authenticated;
