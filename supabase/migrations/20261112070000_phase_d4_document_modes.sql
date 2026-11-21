-- New documentary modalities freeze selected sources without changing prior files.
alter table private.pdf_issuances add column document_options jsonb;
alter table private.pdf_issuances add constraint pdf_issuance_document_options
 check((renderer_revision=17)=(document_options is not null));

create function private.pdf_document_options(p_options jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
declare period jsonb;sections jsonb;begin
 if jsonb_typeof(p_options) is distinct from 'object' or not(p_options ?& array['mode','sections','period','purpose'])
 or p_options-array['mode','sections','period','purpose']<>'{}'::jsonb
 or p_options->>'mode' not in ('expanded','audit') or jsonb_typeof(p_options->'mode') is distinct from 'string'
 or jsonb_typeof(p_options->'sections') is distinct from 'array' then raise exception 'invalid document options' using errcode='22023';end if;
 sections:=p_options->'sections';period:=p_options->'period';
 if jsonb_array_length(sections)<1 or jsonb_array_length(sections)>5 or exists(select 1 from jsonb_array_elements(sections) x
  where jsonb_typeof(x)<>'string' or x#>>'{}' not in ('progress','communications','confirmations','relations','access'))
 or (select count(distinct x) from jsonb_array_elements(sections) x)<>jsonb_array_length(sections)
 or jsonb_typeof(period) is distinct from 'object' or not(period ?& array['from','through','timeZone'])
 or period-array['from','through','timeZone']<>'{}'::jsonb or period->>'timeZone' is distinct from 'America/Sao_Paulo'
 then raise exception 'invalid document period or sections' using errcode='22023';end if;
 if (period->'from'='null'::jsonb) is distinct from (period->'through'='null'::jsonb) then raise exception 'complete document period required' using errcode='22023';end if;
 if period->'from'<>'null'::jsonb then
  if jsonb_typeof(period->'from') is distinct from 'string' or jsonb_typeof(period->'through') is distinct from 'string'
   or period->>'from'!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' or period->>'through'!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
   or (period->>'from')::date>(period->>'through')::date then raise exception 'invalid document period' using errcode='22023';end if;
 end if;
 if p_options->>'mode'='audit' then
  if jsonb_typeof(p_options->'purpose') is distinct from 'string' or length(btrim(p_options->>'purpose'))<3 or private.bal_comment_units(p_options->>'purpose')>500
   then raise exception 'audit purpose required' using errcode='22023';end if;
 elsif p_options->'purpose' is distinct from 'null'::jsonb then raise exception 'unexpected document purpose' using errcode='22023';end if;
 -- One stable section order defines the official intention, independently of click order.
 return p_options||jsonb_build_object('sections',(select jsonb_agg(to_jsonb(x) order by pos) from unnest(array['progress','communications','confirmations','relations','access']) with ordinality s(x,pos) where sections ? x));
end;$$;
revoke all on function private.pdf_document_options(jsonb) from public,anon,authenticated,service_role;

create function private.pdf_expansion_visible(p_patient uuid,p_options jsonb,p_snapshot jsonb) returns boolean
language sql stable set search_path='' as $$
 select p_options is null or (
  (p_options->>'mode'<>'audit' or private.can(p_patient,'audit.read'))
  and (not(p_options->'sections' ? 'access') or private.can(p_patient,'document.access.read'))
  and not exists(select 1 from jsonb_array_elements(coalesce(nullif(p_snapshot#>'{documentExpansion,progress}','null'::jsonb),'[]'::jsonb)) note
   cross join lateral jsonb_array_elements(coalesce(note->'references','[]'::jsonb)) ref
   where not exists(select 1 from public.operational_documents d where d.id=(ref->>'id')::uuid
    and d.care_recipient_id=p_patient and private.can(p_patient,lower(d.type)||'.read')))
 );
$$;
revoke all on function private.pdf_expansion_visible(uuid,jsonb,jsonb) from public,anon,authenticated,service_role;

create function private.guard_pdf_document_options() returns trigger language plpgsql set search_path='' as $$begin
 if new.document_options is distinct from old.document_options then raise exception 'immutable issuance options' using errcode='42501';end if;
 return new;
end;$$;
revoke all on function private.guard_pdf_document_options() from public,anon,authenticated,service_role;
create trigger immutable_pdf_document_options before update on private.pdf_issuances for each row execute function private.guard_pdf_document_options();

create view private.document_progress_facts as select e.id,e.document_id,e.created_at recorded_at,e.action,e.version,e.actor_id,e.actor_name from public.document_events e where e.action=any(array[
   'req.issued','req.legacy_imported','req.science_recorded','req.science_satisfied','req.item_resolved',
   'req.completed','req.fulfillment_updated','req.reopened','req.archived.manual','req.archived.automatic','req.remaining_need_declared',
   'com.draft','com.issued','com.submit','com.approve','com.purchase','com.receive','com.validate_receipt','com.reject_receipt','com.close_expectation',
   'ent.draft','ent.issued','ent.submit','ent.reassign','ent.receive','ent.resolve','ent.cancel','ent.consent_cancel','ent.refuse_cancellation',
   'ent.withdraw_cancellation','ent.propose_regularization','ent.record_regularization_finding','ent.review_regularization','ent.withdraw_regularization',
   'ent.transfer.declared','ent.transfer.agreed','ent.transfer.declined','ent.transfer.withdrawn',
   'bal.draft','bal.issued','bal.submit','bal.approve','bal.recount','bal.apply','bal.cancel','com.cancel','req.status',
   'req.cancellation_acknowledged','com.cancellation_acknowledged','ent.cancellation_acknowledged','bal.cancellation_acknowledged',
   'req.complement_added','req.complement_linked','com.complement_added','com.complement_linked',
   'ent.complement_added','ent.complement_linked','bal.complement_added','bal.complement_linked']);
revoke all on private.document_progress_facts from public,anon,authenticated,service_role;

create function private.freeze_pdf_expansion() returns trigger
language plpgsql security definer set search_path='' as $$
declare opts jsonb;sections jsonb;start_at timestamptz;end_at timestamptz;result jsonb;begin
 if new.renderer_revision<>17 then return new;end if;
 opts:=private.pdf_document_options(new.document_options);sections:=opts->'sections';
 if opts->>'mode'='audit' then perform private.require_cap(new.care_recipient_id,'audit.read');end if;
 if sections ? 'access' then perform private.require_cap(new.care_recipient_id,'document.access.read');end if;
 if new.snapshot#>>'{presentationFacts,documentId}' is distinct from new.document_id::text then raise exception 'PDF presentation freeze required' using errcode='23514';end if;
 start_at:=coalesce(((opts#>>'{period,from}')::date)::timestamp at time zone 'America/Sao_Paulo','-infinity'::timestamptz);
 end_at:=least(new.requested_at,coalesce((((opts#>>'{period,through}')::date+1)::timestamp at time zone 'America/Sao_Paulo')-interval '1 microsecond','infinity'::timestamptz));
 -- All complement collections below use one SQL snapshot, no paginated reads.
 with progress as materialized(
  select n.id,n.recorded_at,private.progress_note_view(n) body from private.document_progress_notes n where n.document_id=new.document_id and n.recorded_at between start_at and end_at and sections ? 'progress'
  union all select e.id,e.recorded_at,jsonb_build_object('id',e.id,'source','automatic','documentId',e.document_id,'recordedAt',e.recorded_at,
   'action',e.action,'version',e.version,'authorId',e.actor_id,'authorName',e.actor_name) from private.document_progress_facts e where e.document_id=new.document_id and e.recorded_at between start_at and end_at and (sections ? 'progress' or sections ? 'confirmations')
 ), notices as materialized(
  select n.id,coalesce(n.attempted_at,n.created_at) recorded_at,jsonb_build_object('id',n.id,'recordedAt',coalesce(n.attempted_at,n.created_at),'group',n.recipient_group,
   'channel',n.channel,'state',n.state,'attempts',n.attempts,'seenAt',case when n.seen_at<=new.requested_at then n.seen_at end) body
  from public.requisition_notifications n where coalesce(n.document_id,n.requisition_id)=new.document_id and n.care_recipient_id=new.care_recipient_id
   and coalesce(n.attempted_at,n.created_at) between start_at and end_at and sections ? 'communications'
 ), access as materialized(
  select o.id,o.recorded_at,jsonb_build_object('id',o.id,'recordedAt',o.recorded_at,'actorName',o.actor_name,'referenceVersion',o.reference_version,'origin',o.origin) body
  from public.requisition_openings o where o.requisition_id=new.document_id and o.recorded_at between start_at and end_at and sections ? 'access'
  union all select a.id,a.recorded_at,jsonb_build_object('id',a.id,'recordedAt',a.recorded_at,'actorName',a.actor_name,'referenceVersion',a.reference_version,'origin',a.origin)
  from private.document_access_windows a where a.document_id=new.document_id and a.recorded_at between start_at and end_at and sections ? 'access'
 ), audit as materialized(
  select a.id,a.created_at recorded_at,jsonb_build_object('id',a.id,'recordedAt',a.created_at,'action',a.action,'actorId',a.actor_id) body
  from public.audit_events a where opts->>'mode'='audit' and (a.entity_id=new.document_id or a.metadata->>'document_id'=new.document_id::text)
   and a.created_at between start_at and end_at
 ) select jsonb_build_object('schemaVersion',1,'documentId',new.document_id,'documentVersion',new.version,'referenceAt',new.requested_at,'options',opts,
  'progress',case when sections ? 'progress' then (select coalesce(jsonb_agg(body order by recorded_at,id),'[]'::jsonb) from progress) end,
  'communications',case when sections ? 'communications' then (select coalesce(jsonb_agg(body order by recorded_at,id),'[]'::jsonb) from notices) end,
  'confirmations',case when sections ? 'confirmations' then (select coalesce(jsonb_agg(body order by recorded_at,id),'[]'::jsonb) from progress where body->>'source'='automatic' and body->>'action'=any(array[
   'req.science_recorded','req.science_satisfied','req.cancellation_acknowledged','com.approve','com.receive','com.validate_receipt','com.reject_receipt','com.cancellation_acknowledged',
   'ent.receive','ent.resolve','ent.consent_cancel','ent.transfer.agreed','ent.transfer.declined','ent.cancellation_acknowledged','bal.approve','bal.apply','bal.cancellation_acknowledged'])) end,
  'relations',case when sections ? 'relations' then jsonb_build_object('references',new.snapshot#>'{presentationFacts,references}','complements',new.snapshot#>'{lifecycleFacts,complements}') end,
  'access',case when sections ? 'access' then (select coalesce(jsonb_agg(body order by recorded_at,id),'[]'::jsonb) from access) end,
  'auditTrail',case when opts->>'mode'='audit' then (select coalesce(jsonb_agg(body order by recorded_at,id),'[]'::jsonb) from audit) end)
 into result;
 new.snapshot:=new.snapshot||jsonb_build_object('documentExpansion',result);
 return new;
end;$$;
revoke all on function private.freeze_pdf_expansion() from public,anon,authenticated,service_role;
create trigger zzzzzzzz_freeze_pdf_expansion before insert on private.pdf_issuances for each row execute function private.freeze_pdf_expansion();

create function public.reserve_pdf_expanded_issuance(p_document uuid,p_key uuid,p_options jsonb,p_version integer default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;r private.pdf_issuances;e public.document_events;h text;uid uuid:=auth.uid();session_id_value uuid;new_id uuid:=gen_random_uuid();received_at timestamptz;opts jsonb;begin
 d:=private.require_pdf_document(p_document);session_id_value:=private.auth_session();opts:=private.pdf_document_options(p_options);
 if p_key is null or session_id_value is null or (p_version is not null and p_version<1) then raise exception 'invalid issuance intention' using errcode='22023';end if;
 h:=encode(extensions.digest(jsonb_build_array('pdf-expansion',p_document,p_version,opts)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('pdf-issuance:'||uid||':'||p_key,0));
 d:=private.require_pdf_document(p_document);
 select * into r from private.pdf_issuances where requested_by=uid and idempotency_key=p_key;
 if found then
  if r.request_hash is distinct from h then raise exception 'issuance idempotency conflict' using errcode='23505';end if;
  perform private.require_pdf_issuance_access(r);return private.pdf_issuance_receipt(r)||jsonb_build_object('snapshot',r.snapshot,'sourceHash',r.source_hash,'replayed',true);
 end if;
 if d.protocol is null then raise exception 'issued document required' using errcode='22023';end if;
 select * into e from public.document_events where document_id=p_document and version=coalesce(p_version,d.version);
 if not found or nullif(e.body->>'protocol','') is null then raise exception 'issued snapshot required' using errcode='22023';end if;
 received_at:=clock_timestamp();
 insert into private.pdf_issuances(id,document_id,version,care_recipient_id,requested_by,requested_name,requested_session,requested_at,idempotency_key,request_hash,verification_code,
  renderer_revision,representation,source_hash,snapshot,object_path,document_options)
 values(new_id,d.id,e.version,d.care_recipient_id,uid,coalesce((select nullif(full_name,'') from public.profiles where id=uid),'Identidade nominal não preservada'),session_id_value,received_at,p_key,h,
  upper(encode(extensions.gen_random_bytes(16),'hex')),17,case when e.version<>d.version or coalesce((e.body->>'isHistorical')::boolean,false) then 'derived' else 'operational' end,
  e.content_hash,e.body,'issuances/'||d.id||'/'||new_id||'.pdf',opts) returning * into r;
 perform private.require_pdf_document(p_document);perform private.require_pdf_issuance_access(r);
 return private.pdf_issuance_receipt(r)||jsonb_build_object('snapshot',r.snapshot,'sourceHash',r.source_hash,'replayed',false);
end;$$;
revoke all on function public.reserve_pdf_expanded_issuance(uuid,uuid,jsonb,integer) from public,anon,authenticated,service_role;
grant execute on function public.reserve_pdf_expanded_issuance(uuid,uuid,jsonb,integer) to authenticated;

-- Extend only format/source guards and live access; prior reservation bodies stay intact.
do $$declare definition text;anchor text;begin
 definition:=pg_get_functiondef('private.freeze_pdf_source_facts()'::regprocedure);anchor:='if new.renderer_revision not in (6,7,8,9,10,11,12,13,14,15,16) then';
 if position(anchor in definition)=0 then raise exception 'PDF source format drift';end if;execute replace(definition,anchor,'if new.renderer_revision not in (6,7,8,9,10,11,12,13,14,15,16,17) then');
 definition:=pg_get_functiondef('private.freeze_pdf_fidelity_facts()'::regprocedure);anchor:='if new.renderer_revision not in (7,8,9,10,11,12,13,14,15,16) then';
 if position(anchor in definition)=0 then raise exception 'PDF fidelity format drift';end if;execute replace(definition,anchor,'if new.renderer_revision not in (7,8,9,10,11,12,13,14,15,16,17) then');
 definition:=pg_get_functiondef('private.freeze_pdf_lifecycle_facts()'::regprocedure);anchor:='if new.renderer_revision not in (15,16) then';
 if position(anchor in definition)=0 then raise exception 'PDF lifecycle format drift';end if;execute replace(definition,anchor,'if new.renderer_revision not in (15,16,17) then');
 definition:=pg_get_functiondef('private.freeze_pdf_presentation_facts()'::regprocedure);anchor:='if new.renderer_revision=16 then';
 if position(anchor in definition)=0 then raise exception 'PDF presentation format drift';end if;execute replace(definition,anchor,'if new.renderer_revision in (16,17) then');
 definition:=pg_get_functiondef('private.require_pdf_issuance_access(private.pdf_issuances)'::regprocedure);anchor:='end;';
 if length(definition)-length(replace(definition,anchor,''))<>length(anchor) then raise exception 'PDF access body drift';end if;
 execute replace(definition,anchor,'if not private.pdf_expansion_visible(r.care_recipient_id,r.document_options,r.snapshot) then raise exception ''PDF complement read required'' using errcode=''42501'';end if;'||anchor);
 definition:=pg_get_functiondef('private.pdf_issuance_receipt(private.pdf_issuances)'::regprocedure);anchor:='''lastError'',r.last_error)';
 if position(anchor in definition)=0 then raise exception 'PDF receipt body drift';end if;
 execute replace(definition,anchor,anchor||'||case when r.document_options is not null then jsonb_build_object(''documentOptions'',r.document_options) else ''{}''::jsonb end');
 definition:=pg_get_functiondef('public.pdf_archive(uuid,integer,timestamptz,text,text,integer)'::regprocedure);anchor:='from private.pdf_issuances r where r.document_id=p_document';
 if position(anchor in definition)=0 then raise exception 'PDF archive body drift';end if;
 execute replace(definition,anchor,anchor||' and private.pdf_expansion_visible(r.care_recipient_id,r.document_options,r.snapshot)');
 definition:=pg_get_functiondef('public.pdf_issuances(uuid,timestamptz,uuid,integer)'::regprocedure);anchor:='where document_id=p_document';
 if position(anchor in definition)=0 then raise exception 'PDF issuance list body drift';end if;
 execute replace(definition,anchor,anchor||' and private.pdf_expansion_visible(care_recipient_id,document_options,snapshot)');
end;$$;
notify pgrst,'reload schema';

create or replace function public.document_progress(p_document uuid,p_filter text default 'all',p_page integer default 1,p_size integer default 20) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare d public.operational_documents; v_total bigint; v_rows jsonb;
begin
 if private.auth_session() is null then raise exception 'active identity required' using errcode='42501';end if;
 select * into d from public.operational_documents where id=p_document;
 if not found or not private.can(d.care_recipient_id,lower(d.type)||'.read') then
  raise exception 'document not found' using errcode='42501';end if;
 if p_filter is null or p_filter not in ('all','automatic','manual') or p_page is null or p_page<1 or p_page>1000000
  or p_size is null or p_size<1 or p_size>50 then raise exception 'invalid progress page' using errcode='22023';end if;
 -- This explicit list contains documentary facts, not arbitrary audit logs,
 -- notification attempts, opening receipts or scheduler reminders.
 with facts as (
  select e.id,e.recorded_at,'automatic'::text source,e.action,e.version,e.actor_id,e.actor_name
  from private.document_progress_facts e where e.document_id=p_document
 ), timeline as (
  select id,recorded_at,source,action,version,actor_id,actor_name from facts where p_filter<>'manual'
  union all select id,recorded_at,'manual',null,null,author_id,author_name from private.document_progress_notes where document_id=p_document and p_filter<>'automatic'
 ), selected as (select * from timeline order by recorded_at,id limit p_size offset ((p_page::bigint-1)*p_size))
 select (select count(*) from timeline),coalesce(jsonb_agg(case when s.source='manual' then private.progress_note_view(n)
  else jsonb_build_object('id',s.id,'source','automatic','documentId',p_document,'recordedAt',s.recorded_at,
   'action',s.action,'version',s.version,'authorId',s.actor_id,'authorName',s.actor_name) end order by s.recorded_at,s.id),'[]'::jsonb)
 into v_total,v_rows from selected s left join private.document_progress_notes n on s.source='manual' and n.id=s.id;
 return jsonb_build_object('documentId',p_document,'documentType',d.type,'filter',p_filter,'page',p_page,'size',p_size,'total',v_total,
  'canPublish',private.can(d.care_recipient_id,'document.progress.create') and exists(select 1 from public.care_recipients where id=d.care_recipient_id and is_active),'data',v_rows);
end;$$;
