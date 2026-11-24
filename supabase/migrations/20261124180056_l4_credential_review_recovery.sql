-- The result check shares the lock of the official write. It can close an
-- absent attempt so a delayed request cannot write after an absence was confirmed.
create table private.closed_professional_credential_reviews (
  reviewer_id uuid not null,
  idempotency_key uuid not null,
  care_recipient_id uuid not null,
  subject_id uuid not null,
  credential_revision bigint not null check (credential_revision > 0),
  closed_at timestamptz not null default clock_timestamp(),
  primary key (reviewer_id, idempotency_key)
);
alter table private.closed_professional_credential_reviews enable row level security;
revoke all on private.closed_professional_credential_reviews from public, anon, authenticated, service_role;

alter function public.review_professional_credential(uuid, uuid, bigint, text, text, uuid) set schema private;
revoke all on function private.review_professional_credential(uuid, uuid, bigint, text, text, uuid)
  from public, anon, authenticated, service_role;

create function public.review_professional_credential(
  p_patient uuid, p_subject uuid, p_expected bigint, p_outcome text, p_note text, p_key uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_credential_scope(p_patient, p_subject, true);
  if p_key is null then
    raise exception 'invalid credential review reference' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('professional-credential-review:' || auth.uid() || ':' || p_key, 0));
  if exists (select 1 from private.closed_professional_credential_reviews
    where reviewer_id = auth.uid() and idempotency_key = p_key) then
    raise exception 'credential review attempt closed' using errcode = 'PT410';
  end if;
  return private.review_professional_credential(p_patient, p_subject, p_expected, p_outcome, p_note, p_key);
end;
$$;

create function public.professional_credential_review_result(
  p_patient uuid, p_subject uuid, p_expected bigint, p_key uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  recorded private.professional_credential_reviews;
  closed private.closed_professional_credential_reviews;
  outcome jsonb;
begin
  perform private.require_credential_scope(p_patient, p_subject, true);
  if p_key is null or p_expected is null or p_expected < 1 then
    raise exception 'invalid credential review reference' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('professional-credential-review:' || auth.uid() || ':' || p_key, 0));
  perform 1 from public.profiles where id in (auth.uid(), p_subject) order by id for share;
  perform private.require_credential_scope(p_patient, p_subject, true);
  select * into recorded from private.professional_credential_reviews
  where reviewer_id = auth.uid() and idempotency_key = p_key;
  if found then
    if (recorded.care_recipient_id, recorded.subject_id, recorded.credential_revision)
      is distinct from (p_patient, p_subject, p_expected) then
      raise exception 'credential review reference unavailable' using errcode = '42501';
    end if;
    outcome := jsonb_build_object('id', recorded.id, 'credentialRevision', recorded.credential_revision::text,
      'recordedAt', recorded.recorded_at, 'replayed', true);
  else
    select * into closed from private.closed_professional_credential_reviews
    where reviewer_id = auth.uid() and idempotency_key = p_key;
    if found then
      if (closed.care_recipient_id, closed.subject_id, closed.credential_revision)
        is distinct from (p_patient, p_subject, p_expected) then
        raise exception 'credential review reference unavailable' using errcode = '42501';
      end if;
    else
      insert into private.closed_professional_credential_reviews
        (reviewer_id, idempotency_key, care_recipient_id, subject_id, credential_revision)
      values (auth.uid(), p_key, p_patient, p_subject, p_expected);
    end if;
  end if;

  return jsonb_build_object('idempotencyKey', p_key, 'careRecipientId', p_patient, 'subjectId', p_subject,
    'expectedRevision', p_expected::text, 'state', case when outcome is null then 'closed' else 'recorded' end,
    'outcome', outcome);
end;
$$;

revoke all on function public.review_professional_credential(uuid, uuid, bigint, text, text, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.review_professional_credential(uuid, uuid, bigint, text, text, uuid) to authenticated;

revoke all on function public.professional_credential_review_result(uuid, uuid, bigint, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.professional_credential_review_result(uuid, uuid, bigint, uuid) to authenticated;
