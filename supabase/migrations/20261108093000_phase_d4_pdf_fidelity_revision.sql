-- Expand before publishing the V7 consumer. The legacy RPC/default stay V6,
-- and old intentions replay with their original revision and frozen bytes.
do $$declare definition text;anchor text:='if new.renderer_revision<>6 then';begin
 definition:=replace(pg_get_functiondef('private.freeze_pdf_source_facts()'::regprocedure),E'\r\n',E'\n');
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then
  raise exception 'unexpected PDF source facts contract';end if;
 execute replace(definition,anchor,'if new.renderer_revision not in (6,7) then');
end;$$;

create function private.freeze_pdf_fidelity_facts() returns trigger
language plpgsql security definer set search_path='' as $$
declare e public.document_events;resolutions jsonb;receipts jsonb;
begin
 if new.renderer_revision<>7 then return new;end if;
 select * into strict e from public.document_events where document_id=new.document_id and version=new.version;
 if new.source_hash is distinct from e.content_hash or new.snapshot-'sourceFacts' is distinct from e.body then
  raise exception 'canonical PDF fidelity source required' using errcode='23514';end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'eventId',x.id,'version',x.version,'actorId',x.actor_id,
  'actorName',coalesce(nullif(x.actor_name,''),nullif(x.body->>'actorName','')),'recordedAt',x.created_at,
  'lineId',case when x.body#>>'{event,lineId}' ~* '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$' then x.body#>>'{event,lineId}' end,
  'resolution',case when x.body#>>'{event,resolution}' in ('received','missing','returned') then x.body#>>'{event,resolution}' end,
  'quantity',x.body#>>'{event,quantity}','reason',x.body#>>'{event,reason}') order by x.version),'[]')
 into resolutions from public.document_events x where x.document_id=new.document_id and x.version<=new.version and x.action='ent.resolve';
 select coalesce(jsonb_agg(jsonb_build_object(
  'eventId',x.id,'version',x.version,'actorId',x.actor_id,
  'actorName',coalesce(nullif(x.actor_name,''),nullif(x.body->>'actorName','')),'recordedAt',x.created_at,'action',x.action,
  'receiptId',case when coalesce(x.body->>'receiptId',x.body#>>'{event,receiptId}') ~* '^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$'
    then coalesce(x.body->>'receiptId',x.body#>>'{event,receiptId}') end) order by x.version),'[]')
 into receipts from public.document_events x where x.document_id=new.document_id and x.version<=new.version
 and x.action in ('com.receive','com.validate_receipt','com.reject_receipt');
 new.snapshot:=new.snapshot||jsonb_build_object('documentFacts',jsonb_build_object(
  'schemaVersion',1,'deliveryResolutions',resolutions,'purchaseReceiptEvents',receipts));
 return new;
end;$$;
revoke all on function private.freeze_pdf_fidelity_facts() from public,anon,authenticated,service_role;
-- PostgreSQL executes same-event triggers by name: provenance must be frozen first.
create trigger zz_freeze_pdf_fidelity_facts before insert on private.pdf_issuances
 for each row execute function private.freeze_pdf_fidelity_facts();

-- Versioned DB entry point; no client-selectable revision, snapshot or hash.
-- Keep the original reservation's authorization, lock and idempotency scope.
create function public.reserve_pdf_issuance_v7(p_document uuid,p_key uuid,p_version integer default null) returns jsonb
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
  renderer_revision,representation,source_hash,snapshot,object_path)
 values(new_id,d.id,e.version,d.care_recipient_id,uid,coalesce((select nullif(full_name,'') from public.profiles where id=uid),'Identidade nominal não preservada'),session_id_value,received_at,p_key,h,
  upper(encode(extensions.gen_random_bytes(16),'hex')),7,case when e.version<>d.version or coalesce((e.body->>'isHistorical')::boolean,false) then 'derived' else 'operational' end,
  e.content_hash,e.body,'issuances/'||d.id||'/'||new_id||'.pdf') returning * into r;
 perform private.require_pdf_document(p_document);
 return private.pdf_issuance_receipt(r)||jsonb_build_object('snapshot',r.snapshot,'sourceHash',r.source_hash,'replayed',false);
end;$$;
revoke all on function public.reserve_pdf_issuance_v7(uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.reserve_pdf_issuance_v7(uuid,uuid,integer) to authenticated;
