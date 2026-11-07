-- Emission identity and worker proof are separate from business version/authority.
create table private.pdf_issuances (
 id uuid primary key default gen_random_uuid(),
 document_id uuid not null references public.operational_documents(id),
 version integer not null check(version>0),
 care_recipient_id uuid not null references public.care_recipients(id),
 requested_by uuid not null references public.profiles(id),
 requested_name text not null,requested_session uuid not null,
 requested_at timestamptz not null default clock_timestamp(),idempotency_key uuid not null,
 request_hash text not null check(request_hash~'^[a-f0-9]{64}$'),
 verification_code text not null unique check(verification_code~'^[0-9A-F]{32}$'),
 renderer_revision integer not null default 5 check(renderer_revision>=5),
 representation text not null check(representation in ('operational','derived')),
 source_hash text not null check(source_hash~'^[a-f0-9]{64}$'),snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),
 object_path text not null unique,state text not null default 'reserved' check(state in ('reserved','processing','uncertain','ready')),
 step text not null default 'reserved' check(step in ('reserved','recovering','composing','signing','persisting','ready','uncertain')),
 attempts integer not null default 0 check(attempts>=0),lease_hash text,lease_until timestamptz,
 ready_at timestamptz,sha256 text unique,size_bytes integer,validation jsonb,key_version text,trust_revision text,
 check((lease_hash is null)=(lease_until is null)),
 check(lease_hash is null or lease_hash~'^[a-f0-9]{64}$'),
 last_error text check(last_error is null or last_error in ('SIGNING_UNAVAILABLE','CONTENT_INVALID','SIGNATURE_INVALID','PERSISTENCE_UNCONFIRMED')),
 unique(requested_by,idempotency_key),
 foreign key(document_id,version) references public.document_events(document_id,version),
 check(state<>'ready' or (ready_at is not null and sha256 is not null and sha256~'^[a-f0-9]{64}$' and size_bytes is not null and size_bytes>0 and validation is not null and (validation->'accepted') is not distinct from 'true'::jsonb and key_version is not null and trust_revision is not null)),
 check(state<>'ready' or (lease_hash is null and lease_until is null and step='ready'))
);
create index pdf_issuances_history on private.pdf_issuances(document_id,requested_at desc,id desc);
revoke all on private.pdf_issuances from public,anon,authenticated,service_role;

create function private.require_pdf_document(p_document uuid) returns public.operational_documents
language plpgsql volatile security definer set search_path='' as $$
declare d public.operational_documents;begin
 select * into d from public.operational_documents where id=p_document;
 if not found then raise exception 'document unavailable' using errcode='42501';end if;
 perform private.require_cap(d.care_recipient_id,lower(d.type)||'.read');return d;
end;$$;
create function private.pdf_issuance_receipt(r private.pdf_issuances) returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('id',r.id,'documentId',r.document_id,'careRecipientId',r.care_recipient_id,'version',r.version,
 'requestedBy',r.requested_by,'requestedName',r.requested_name,'requestedAt',r.requested_at,'readyAt',r.ready_at,
 'verificationCode',r.verification_code,'rendererRevision',r.renderer_revision,'representation',r.representation,
 'state',r.state,'step',r.step,'sha256',r.sha256,'sizeBytes',r.size_bytes,'validation',r.validation,
 'keyVersion',r.key_version,'trustRevision',r.trust_revision,'lastError',r.last_error);
$$;
create function private.guard_pdf_issuance() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='DELETE' or old.state='ready' then raise exception 'immutable issuance' using errcode='42501';end if;
 if (new.id,new.document_id,new.version,new.care_recipient_id,new.requested_by,new.requested_name,new.requested_session,new.requested_at,new.idempotency_key,new.request_hash,new.verification_code,new.renderer_revision,new.representation,new.source_hash,new.snapshot,new.object_path)
 is distinct from (old.id,old.document_id,old.version,old.care_recipient_id,old.requested_by,old.requested_name,old.requested_session,old.requested_at,old.idempotency_key,old.request_hash,old.verification_code,old.renderer_revision,old.representation,old.source_hash,old.snapshot,old.object_path)
 then raise exception 'immutable issuance intention' using errcode='42501';end if;
 return new;
end;$$;
create trigger immutable_pdf_issuance before update or delete on private.pdf_issuances for each row execute function private.guard_pdf_issuance();

create function public.reserve_pdf_issuance(p_document uuid,p_key uuid,p_version integer default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;r private.pdf_issuances;e public.document_events;h text;uid uuid:=auth.uid();session_id_value uuid;new_id uuid:=gen_random_uuid();received_at timestamptz:=clock_timestamp();begin
 d:=private.require_pdf_document(p_document);session_id_value:=private.auth_session();
 if p_key is null or session_id_value is null or (p_version is not null and p_version<1) then raise exception 'invalid issuance intention' using errcode='22023';end if;
 h:=encode(extensions.digest(jsonb_build_array('pdf-issuance',p_document,p_version)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('pdf-issuance:'||uid||':'||p_key,0));
 d:=private.require_pdf_document(p_document);
 select * into r from private.pdf_issuances where requested_by=uid and idempotency_key=p_key;
 if found then
  if r.request_hash is distinct from h then raise exception 'issuance idempotency conflict' using errcode='23505';end if;
  return private.pdf_issuance_receipt(r)||jsonb_build_object('snapshot',r.snapshot,'sourceHash',r.source_hash,'replayed',true);
 end if;
 if d.protocol is null then raise exception 'issued document required' using errcode='22023';end if;
 select * into e from public.document_events where document_id=p_document and version=coalesce(p_version,d.version);
 if not found or nullif(e.body->>'protocol','') is null then raise exception 'issued snapshot required' using errcode='22023';end if;
 insert into private.pdf_issuances(id,document_id,version,care_recipient_id,requested_by,requested_name,requested_session,requested_at,idempotency_key,request_hash,verification_code,
  representation,source_hash,snapshot,object_path)
 values(new_id,d.id,e.version,d.care_recipient_id,uid,coalesce((select nullif(full_name,'') from public.profiles where id=uid),'Identidade nominal não preservada'),session_id_value,received_at,p_key,h,
  upper(encode(extensions.gen_random_bytes(16),'hex')),case when e.version<>d.version or coalesce((e.body->>'isHistorical')::boolean,false) then 'derived' else 'operational' end,
  e.content_hash,e.body,'issuances/'||d.id||'/'||new_id||'.pdf') returning * into r;
 perform private.require_pdf_document(p_document);
 return private.pdf_issuance_receipt(r)||jsonb_build_object('snapshot',r.snapshot,'sourceHash',r.source_hash,'replayed',false);
end;$$;

create function public.claim_pdf_issuance(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r private.pdf_issuances;token text:=encode(extensions.gen_random_bytes(32),'hex');begin
 if auth.role() is distinct from 'service_role' then raise exception 'PDF worker required' using errcode='42501';end if;
 select * into r from private.pdf_issuances where id=p_id for update;
 if not found then raise exception 'issuance unavailable' using errcode='42501';end if;
 if r.state='ready' then return jsonb_build_object('id',r.id,'ready',true);end if;
 if r.lease_until>clock_timestamp() then raise exception 'issuance is processing' using errcode='55P03';end if;
 update private.pdf_issuances set state='processing',step=case when attempts=0 then 'composing' else 'recovering' end,
  attempts=attempts+1,lease_hash=encode(extensions.digest(token,'sha256'),'hex'),lease_until=clock_timestamp()+interval '5 minutes',last_error=null where id=r.id returning * into r;
 return jsonb_build_object('id',r.id,'ready',false,'objectPath',r.object_path,'workerToken',token);
end;$$;

create function private.require_pdf_lease(p_id uuid,p_token text) returns private.pdf_issuances
language plpgsql security definer set search_path='' as $$
declare r private.pdf_issuances;begin
 select * into r from private.pdf_issuances where id=p_id and requested_by=auth.uid() for update;
 if not found then raise exception 'issuance unavailable' using errcode='42501';end if;
 perform private.require_pdf_document(r.document_id);
 if p_token is null or r.state='ready' or r.lease_until is null or r.lease_until<=clock_timestamp() or r.lease_hash is distinct from encode(extensions.digest(p_token,'sha256'),'hex') then
  raise exception 'valid PDF worker proof required' using errcode='42501';end if;
 return r;
end;$$;
create function public.pdf_issuance_stage(p_id uuid,p_token text,p_step text,p_error text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r private.pdf_issuances;begin
 r:=private.require_pdf_lease(p_id,p_token);
 if p_step is null or p_step not in ('composing','recovering','signing','persisting','uncertain') or
  (p_error is not null and p_error not in ('SIGNING_UNAVAILABLE','CONTENT_INVALID','SIGNATURE_INVALID','PERSISTENCE_UNCONFIRMED')) then raise exception 'invalid PDF progress' using errcode='22023';end if;
 update private.pdf_issuances set step=p_step,last_error=p_error,state=case when p_step='uncertain' then 'uncertain' else 'processing' end,
  lease_until=case when p_step='uncertain' then clock_timestamp() else lease_until end
 where id=r.id returning * into r;
 perform private.require_pdf_document(r.document_id);return private.pdf_issuance_receipt(r);
end;$$;

create function public.complete_pdf_issuance(p_id uuid,p_token text,p_hash text,p_size integer,p_validation jsonb,p_key_version text,p_trust_revision text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r private.pdf_issuances;field text;begin
 select * into r from private.pdf_issuances where id=p_id and requested_by=auth.uid();
 if not found then raise exception 'issuance unavailable' using errcode='42501';end if;
 perform private.require_pdf_document(r.document_id);
 if r.state='ready' then
  if (r.sha256,r.size_bytes,r.validation,r.key_version,r.trust_revision) is distinct from (p_hash,p_size,p_validation,p_key_version,p_trust_revision) then raise exception 'immutable issuance result conflict' using errcode='23505';end if;
  return private.pdf_issuance_receipt(r)||jsonb_build_object('replayed',true);
 end if;
 r:=private.require_pdf_lease(p_id,p_token);
 if p_hash is null or p_hash!~'^[a-f0-9]{64}$' or p_size is null or p_size<1 or p_size>10485760 or p_key_version is null or p_key_version!~'^[A-Za-z0-9][A-Za-z0-9_.-]{0,95}$'
 or p_trust_revision is null or p_trust_revision!~'^[A-Za-z0-9][A-Za-z0-9_.-]{0,95}$' or p_validation is null or jsonb_typeof(p_validation) is distinct from 'object'
 or not (p_validation ?& array['profile','accepted','cryptographicIntegrity','wholeFile','signerTrust','timestampTrust','certificateFingerprint','timestampCertificateFingerprint','timestampAt','timestampPolicy','externalTimeIndependence','revocationEvidence'])
 or p_validation-array['profile','accepted','cryptographicIntegrity','wholeFile','signerTrust','timestampTrust','certificateFingerprint','timestampCertificateFingerprint','timestampAt','timestampPolicy','externalTimeIndependence','revocationEvidence']<>'{}'::jsonb
 then raise exception 'invalid PDF verification receipt' using errcode='22023';end if;
 if p_validation->'accepted' is distinct from 'true'::jsonb or p_validation->'cryptographicIntegrity' is distinct from 'true'::jsonb or p_validation->'wholeFile' is distinct from 'true'::jsonb
 or p_validation->>'profile' is distinct from 'PAdES-B-T' or coalesce(p_validation->>'signerTrust','') not in ('internal','external') or coalesce(p_validation->>'timestampTrust','') not in ('internal','external')
 or coalesce(p_validation->>'certificateFingerprint','')!~'^[a-f0-9]{64}$' or coalesce(p_validation->>'timestampCertificateFingerprint','')!~'^[a-f0-9]{64}$'
 or jsonb_typeof(p_validation->'timestampAt') is distinct from 'string' or jsonb_typeof(p_validation->'timestampPolicy') is distinct from 'string'
 or p_validation->'externalTimeIndependence' is distinct from 'false'::jsonb or p_validation->>'revocationEvidence' is distinct from 'configured_internal_denylist_only'
 then raise exception 'unaccepted PDF verification receipt' using errcode='22023';end if;
 if (p_validation->>'timestampAt')::timestamptz>clock_timestamp()+interval '5 minutes' or (p_validation->>'timestampAt')::timestamptz<r.requested_at-interval '5 minutes' or not exists(select 1 from storage.objects where bucket_id='document-receipts' and name=r.object_path and (metadata->>'size')::bigint=p_size) then
  raise exception 'PDF persistence unconfirmed' using errcode='P0001';end if;
 update private.pdf_issuances set state='ready',step='ready',ready_at=clock_timestamp(),sha256=p_hash,size_bytes=p_size,validation=p_validation,
  key_version=p_key_version,trust_revision=p_trust_revision,lease_hash=null,lease_until=null,last_error=null where id=r.id returning * into r;
 perform private.require_pdf_document(r.document_id);
 return private.pdf_issuance_receipt(r)||jsonb_build_object('replayed',false);
end;$$;

create function public.pdf_issuance(p_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r private.pdf_issuances;begin
 select * into r from private.pdf_issuances where id=p_id;
 if not found then raise exception 'issuance unavailable' using errcode='42501';end if;
 perform private.require_pdf_document(r.document_id);
 return private.pdf_issuance_receipt(r)||jsonb_build_object('snapshot',r.snapshot,'sourceHash',r.source_hash,'objectPath',r.object_path);
end;$$;
create function public.pdf_issuances(p_document uuid,p_before timestamptz default null,p_before_id uuid default null,p_limit integer default 20) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 perform private.require_pdf_document(p_document);
 if p_limit is null or p_limit<1 or p_limit>50 or (p_before is null)<>(p_before_id is null) then raise exception 'invalid issuance page' using errcode='22023';end if;
 with page as materialized(select r.*,row_number() over(order by requested_at desc,id desc) as position from private.pdf_issuances r
  where document_id=p_document and (p_before is null or (requested_at,id)<(p_before,p_before_id)) order by requested_at desc,id desc limit p_limit+1)
 select jsonb_build_object('data',coalesce((select jsonb_agg(private.pdf_issuance_receipt(p) order by p.requested_at desc,p.id desc) from private.pdf_issuances p where p.id in(select id from page where position<=p_limit)),'[]'::jsonb),
  'next',case when exists(select 1 from page where position=p_limit+1) then (select jsonb_build_object('at',requested_at,'id',id) from page where position=p_limit) else null end) into result;
 perform private.require_pdf_document(p_document);return result;
end;$$;

create function public.pdf_issuance_public(p_code text default null,p_hash text default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare r private.pdf_issuances;code text;begin
 if p_code is not null then
  if length(p_code)>64 then raise exception 'invalid verification code' using errcode='22023';end if;
  code:=regexp_replace(regexp_replace(upper(trim(p_code)),'^HCA[- ]?',''),'[-[:space:]]','','g');
  if code!~'^[0-9A-F]{32}$' then raise exception 'invalid verification code' using errcode='22023';end if;
 end if;
 if (code is null and p_hash is null) or (p_hash is not null and p_hash!~'^[a-f0-9]{64}$') then raise exception 'invalid public verification query' using errcode='22023';end if;
 select * into r from private.pdf_issuances where state='ready' and case when code is not null then verification_code=code else sha256=p_hash end;
 if not found then return jsonb_build_object('found',false);end if;
 return jsonb_build_object('found',true,'issuanceId',r.id,'verificationCode',r.verification_code,'registeredAt',r.ready_at,'sha256',r.sha256,'sizeBytes',r.size_bytes,
  'bytesMatch',case when p_hash is null then null else r.sha256=p_hash end,'recordedProfile',r.validation->>'profile','recordedTimestamp',r.validation->>'timestampAt',
  'certificateFingerprint',r.validation->>'certificateFingerprint','timestampCertificateFingerprint',r.validation->>'timestampCertificateFingerprint',
  'trustRevision',r.trust_revision,'externalTimeIndependence',false);
end;$$;

revoke all on function private.require_pdf_document(uuid),private.pdf_issuance_receipt(private.pdf_issuances),private.guard_pdf_issuance(),private.require_pdf_lease(uuid,text) from public,anon,authenticated,service_role;
revoke all on function public.reserve_pdf_issuance(uuid,uuid,integer),public.pdf_issuance_stage(uuid,text,text,text),public.complete_pdf_issuance(uuid,text,text,integer,jsonb,text,text),public.pdf_issuance(uuid),public.pdf_issuances(uuid,timestamptz,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.reserve_pdf_issuance(uuid,uuid,integer),public.pdf_issuance_stage(uuid,text,text,text),public.complete_pdf_issuance(uuid,text,text,integer,jsonb,text,text),public.pdf_issuance(uuid),public.pdf_issuances(uuid,timestamptz,uuid,integer) to authenticated;
revoke all on function public.claim_pdf_issuance(uuid) from public,anon,authenticated,service_role;
grant execute on function public.claim_pdf_issuance(uuid) to service_role;
revoke all on function public.pdf_issuance_public(text,text) from public,anon,authenticated,service_role;
grant execute on function public.pdf_issuance_public(text,text) to anon,authenticated;
