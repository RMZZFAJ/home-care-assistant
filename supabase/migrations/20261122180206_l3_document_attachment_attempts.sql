-- A new selection may rediscover the same submitted bytes after leaving the modal.
-- Retain the request-to-reservation identity without recreating a work queue.
create table private.document_attachment_request_keys (
  actor_id uuid not null references public.profiles(id),
  request_key uuid not null,
  attachment_id uuid not null references public.attachments(id) on delete cascade,
  primary key (actor_id, request_key)
);
create index document_attachment_request_keys_attachment
  on private.document_attachment_request_keys(attachment_id);
alter table private.document_attachment_request_keys enable row level security;
revoke all on private.document_attachment_request_keys from public, anon, authenticated, service_role;

create function public.document_attachment_request_key(p_patient uuid, p_document uuid, p_key uuid)
returns uuid language plpgsql stable security definer set search_path='' as $$
declare capability text; canonical uuid;
begin
  if auth.uid() is null or p_key is null then
    raise exception 'attachment identity required' using errcode='42501';
  end if;
  select lower(d.type) || '.read' into capability
    from public.operational_documents d
    where d.id=p_document and d.care_recipient_id=p_patient;
  if capability is null then raise exception 'attachment permission required' using errcode='42501'; end if;
  perform private.require_cap(p_patient, capability);
  select a.upload_key into canonical
    from private.document_attachment_request_keys k
    join public.attachments a on a.id=k.attachment_id
    where k.actor_id=auth.uid() and k.request_key=p_key
      and a.uploaded_by=auth.uid() and a.care_recipient_id=p_patient and a.document_id=p_document;
  return coalesce(canonical, p_key);
end;
$$;

create function public.prepare_document_attachment_attempt(
  p_patient uuid, p_document uuid, p_filename text, p_mime text, p_bytes bigint,
  p_key uuid, p_source_hash text, p_source_bytes bigint, p_source_mime text,
  p_hash text, p_transformation text
) returns jsonb language plpgsql security definer set search_path='' as $$
declare existing public.attachments; command_key uuid; result jsonb; mapped_id uuid;
begin
  command_key := public.document_attachment_request_key(p_patient, p_document, p_key);
  perform pg_advisory_xact_lock(hashtextextended('document-attachment:' || auth.uid() || ':' || p_key, 0));
  perform pg_advisory_xact_lock(hashtextextended('attachments:' || p_document, 0));
  command_key := public.document_attachment_request_key(p_patient, p_document, p_key);

  select k.attachment_id into mapped_id from private.document_attachment_request_keys k
    where k.actor_id=auth.uid() and k.request_key=p_key;
  if mapped_id is not null then
    select a.* into existing from public.attachments a
      where a.id=mapped_id and a.uploaded_by=auth.uid() and a.care_recipient_id=p_patient and a.document_id=p_document;
    if not found then raise exception 'attachment idempotency scope changed' using errcode='23505'; end if;
  else
    select a.* into existing from public.attachments a
      where a.uploaded_by=auth.uid() and a.upload_key=p_key;
    if found and (existing.document_id is distinct from p_document or existing.care_recipient_id is distinct from p_patient) then
      raise exception 'attachment idempotency scope changed' using errcode='23505';
    end if;
    if not found then
      select a.* into existing
        from public.attachments a
        join private.attachment_attempts t on t.attachment_id=a.id
        where a.care_recipient_id=p_patient and a.document_id=p_document
          and a.uploaded_by=auth.uid() and a.upload_key is not null
          and a.state in ('ready','quarantine')
          and t.source_hash=p_source_hash and t.source_bytes=p_source_bytes and t.source_mime=p_source_mime
        order by (a.state='ready') desc, a.created_at, a.id
        limit 1;
    end if;
  end if;

  if existing.id is not null then
    command_key := existing.upload_key;
    p_filename := existing.filename;
  end if;
  result := public.prepare_attachment_attempt(
    p_patient, p_document, null, p_filename, p_mime, p_bytes,
    command_key, p_source_hash, p_source_bytes, p_source_mime, p_hash, p_transformation
  );
  if command_key is distinct from p_key then
    insert into private.document_attachment_request_keys(actor_id, request_key, attachment_id)
      values (auth.uid(), p_key, (result->>'id')::uuid)
      on conflict (actor_id, request_key) do nothing;
  end if;
  return result;
end;
$$;

revoke all on function public.document_attachment_request_key(uuid,uuid,uuid),
  public.prepare_document_attachment_attempt(uuid,uuid,text,text,bigint,uuid,text,bigint,text,text,text)
  from public, anon, authenticated, service_role;
grant execute on function public.document_attachment_request_key(uuid,uuid,uuid),
  public.prepare_document_attachment_attempt(uuid,uuid,text,text,bigint,uuid,text,bigint,text,text,text)
  to authenticated;
notify pgrst, 'reload schema';
