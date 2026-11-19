-- Settle an official draft-backed issuance under the writer's own-key lock.
-- The terminal absence marker cannot match a writer's SHA-256 intent hash.
create function public.reconcile_document_issuance(
  p_patient uuid, p_draft uuid, p_revision integer, p_key uuid
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  actor uuid := auth.uid();
  draft private.creation_drafts;
  command private.creation_draft_commands;
  document_id uuid;
  absence_hash text := 'issuance-settled:' || p_revision;
begin
  if actor is null or p_patient is null or p_draft is null or p_key is null
    or p_revision is null or p_revision < 1 then
    raise exception 'invalid issuance reconciliation' using errcode='22023';
  end if;

  -- Take the key lock before the draft row lock, in the issuer's lock order.
  perform pg_advisory_xact_lock(hashtextextended('creation-draft-key:'||actor||':'||p_key,0));
  select * into draft from private.creation_drafts
  where id=p_draft and owner_id=actor and care_recipient_id=p_patient
  for no key update;
  if not found or not (
    (draft.kind='REQ' and draft.purpose in ('create','remaining_need'))
    or (draft.kind in ('COM','ENT') and draft.purpose in ('create','revise'))
    or (draft.kind='ENT' and draft.purpose in ('transfer_declare_family','transfer_declare_team'))
  ) then
    raise exception 'issuance draft unavailable' using errcode='42501';
  end if;

  if draft.kind='REQ' then
    perform private.require_creation_draft_read(p_patient,'REQ');
  else
    perform private.require_supply_draft_scope(p_patient,draft.kind,draft.purpose,draft.target_document_id,false);
  end if;

  select * into command from private.creation_draft_commands
  where owner_id=actor and idempotency_key=p_key;
  if found then
    if command.draft_id is distinct from p_draft then
      raise exception 'issuance key belongs to another draft' using errcode='23505';
    end if;
    if command.intent_hash is distinct from absence_hash then
      document_id := (command.result->>'consumedDocumentId')::uuid;
      if document_id is null or command.result->>'state' is distinct from 'consumed'
        or (command.result->>'revision')::bigint is distinct from p_revision::bigint + 1 then
        raise exception 'issuance key belongs to another revision or command' using errcode='23505';
      end if;
      return jsonb_build_object('state','applied','documentId',document_id);
    end if;
  else
    if p_revision > draft.revision then
      raise exception 'issuance draft revision unavailable' using errcode='PT409';
    end if;
    insert into private.creation_draft_commands(owner_id,idempotency_key,draft_id,intent_hash,result)
    values (actor,p_key,p_draft,absence_hash,jsonb_build_object('state','not_applied'));
  end if;

  return jsonb_build_object('state','not_applied',
    'draftSaved',draft.state='active' and draft.revision=p_revision);
end;
$$;

revoke all on function public.reconcile_document_issuance(uuid,uuid,integer,uuid)
from public,anon,authenticated,service_role;
grant execute on function public.reconcile_document_issuance(uuid,uuid,integer,uuid) to authenticated;
