-- V6 freezes reporting provenance separately from the unchanged business event.
-- Existing V5 intentions, signed bytes, snapshots and source hashes are untouched.
alter table private.pdf_issuances alter column renderer_revision set default 6;

create function private.freeze_pdf_source_facts() returns trigger
language plpgsql security definer set search_path='' as $$
declare
 d public.operational_documents;e public.document_events;q public.requisitions;
 original_at timestamptz;imported_at timestamptz;issued_at timestamptz;registered_at timestamptz;draft_at timestamptz;
 historical boolean;issuer_id uuid;issuer_name text;issuer_source text;patient_name text;patient_source text;history_actors jsonb;
begin
 if new.renderer_revision=5 then return new;end if;
 if new.renderer_revision<>6 then raise exception 'unsupported PDF renderer' using errcode='22023';end if;
 select * into strict d from public.operational_documents where id=new.document_id;
 select * into strict e from public.document_events where document_id=d.id and version=new.version;
 if new.source_hash is distinct from e.content_hash or new.snapshot is distinct from e.body then
  raise exception 'canonical PDF source required' using errcode='23514';end if;
 select * into q from public.requisitions where id=d.id and d.type='REQ';
 historical:=coalesce((e.body->>'isHistorical')::boolean,false);
 issuer_id:=case when d.type='REQ' then q.created_by else d.created_by end;
 issuer_name:=nullif(trim(q.requester_name_snapshot),'');
 if issuer_name is not null then issuer_source:='origin_record';
 else
  issuer_name:=coalesce(nullif(trim(e.body#>>'{payload,requesterName}'),''),nullif(trim(e.body#>>'{actors,issuer,name}'),''));
  issuer_source:=case when issuer_name is null then 'unknown' else 'event_snapshot' end;
 end if;
 if issuer_name is null and not historical and issuer_id is not null then
  issuer_name:=(select nullif(trim(full_name),'') from public.profiles where id=issuer_id);
  issuer_source:=case when issuer_name is null then 'unknown' else 'current_profile' end;
 end if;
 patient_name:=coalesce(nullif(trim(q.recipient_name_snapshot),''),nullif(trim(e.body#>>'{actors,patient,name}'),''),nullif(trim(e.body#>>'{payload,patientName}'),''));
 patient_source:=case when q.recipient_name_snapshot is not null and historical then 'import_record' when patient_name is null then 'unknown' else 'event_snapshot' end;
 if historical then
  original_at:=q.created_at;
  select min(b.created_at) into imported_at from public.historical_requisition_imports h join public.requisition_import_batches b on b.id=h.batch_id where h.requisition_id=d.id;
 else
  -- Only a preserved issued event (or sealed REQ material), never draft creation.
  select min(x.created_at) into issued_at from public.document_events x where x.document_id=d.id and x.version<=e.version and nullif(x.body->>'protocol','') is not null;
  if d.type='REQ' and nullif(e.body->>'materialEmittedAt','') is not null then issued_at:=(e.body->>'materialEmittedAt')::timestamptz;end if;
 end if;
 select min(x.created_at) into registered_at from public.document_events x where x.document_id=d.id and x.version<=e.version;
 select min(x.created_at) into draft_at from private.creation_drafts x where x.consumed_document_id=d.id and x.care_recipient_id=d.care_recipient_id and x.target_document_id is null and x.purpose='create' and x.kind=d.type;
 select coalesce(jsonb_agg(jsonb_build_object('version',x.version,'id',x.actor_id,'name',coalesce(nullif(x.actor_name,''),nullif(x.body->>'actorName','')),'source',case when coalesce(nullif(x.actor_name,''),nullif(x.body->>'actorName','')) is null then 'unknown' else 'event_snapshot' end) order by x.version),'[]'::jsonb)
 into history_actors from public.document_events x where x.document_id=d.id and x.version<=e.version;
 new.snapshot:=new.snapshot||jsonb_build_object('sourceFacts',jsonb_build_object(
  'schemaVersion',1,'historical',historical,'sourceCreatedAt',original_at,'importedAt',imported_at,'registeredAt',registered_at,
  'documentCreatedAt',case when historical then null else d.created_at end,'draftCreatedAt',draft_at,'issuedAt',issued_at,
  'issuerId',issuer_id,'issuerName',issuer_name,'issuerSource',issuer_source,'patientName',patient_name,'patientSource',patient_source,'historyActors',history_actors));
 return new;
end;$$;
revoke all on function private.freeze_pdf_source_facts() from public,anon,authenticated,service_role;
create trigger freeze_pdf_source_facts before insert on private.pdf_issuances for each row execute function private.freeze_pdf_source_facts();
