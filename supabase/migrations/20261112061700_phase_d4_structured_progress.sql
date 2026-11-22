-- Publication details belong to immutable Andamentos, never to private draft content.
create table private.document_progress_details (
 note_id uuid primary key references private.document_progress_notes(id),
 relevance text not null check(relevance in ('normal','milestone','attention')),
 mentions jsonb not null check(jsonb_typeof(mentions)='array' and jsonb_array_length(mentions)<=8)
);
alter table private.document_progress_details enable row level security;
revoke all on private.document_progress_details from public,anon,authenticated,service_role;
create trigger preserve_document_progress_details before update or delete on private.document_progress_details
 for each row execute function private.preserve_document_progress_note();

create function private.progress_publication_mentions(p_patient uuid,p_options jsonb) returns jsonb
language plpgsql stable set search_path='' as $$
declare ids uuid[];result jsonb;begin
 if jsonb_typeof(p_options) is distinct from 'object' or not(p_options ?& array['relevance','mentions'])
 or p_options-array['relevance','mentions']<>'{}'::jsonb
 or jsonb_typeof(p_options->'relevance') is distinct from 'string' or p_options->>'relevance' not in ('normal','milestone','attention')
 or jsonb_typeof(p_options->'mentions') is distinct from 'array' then raise exception 'invalid progress publication' using errcode='22023';end if;
 if jsonb_array_length(p_options->'mentions')>8 or exists(select 1 from jsonb_array_elements(p_options->'mentions') x
 where jsonb_typeof(x)<>'string' or (x#>>'{}')!~'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$')
 then raise exception 'invalid progress mentions' using errcode='22023';end if;
 select coalesce(array_agg((x#>>'{}')::uuid order by pos),'{}'::uuid[]) into ids from jsonb_array_elements(p_options->'mentions') with ordinality v(x,pos);
 if (select count(distinct x) from unnest(ids) x)<>cardinality(ids) then raise exception 'duplicate progress mentions' using errcode='22023';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.full_name,'careRole',m.role::text) order by v.pos),'[]'::jsonb) into result
 from unnest(ids) with ordinality v(id,pos) join public.care_recipient_memberships m on m.user_id=v.id and m.care_recipient_id=p_patient and m.status='active'
 join public.profiles p on p.id=m.user_id and p.status='active';
 if jsonb_array_length(result)<>cardinality(ids) then raise exception 'progress mention not authorized' using errcode='42501';end if;
 return result;
end;$$;
revoke all on function private.progress_publication_mentions(uuid,jsonb) from public,anon,authenticated,service_role;

create function public.document_progress_people(p_document uuid,p_search text default '',p_page integer default 1) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare d public.operational_documents;rows jsonb;total bigint;begin
 if private.auth_session() is null then raise exception 'active identity required' using errcode='42501';end if;
 select * into d from public.operational_documents where id=p_document;
 if not found or not private.can(d.care_recipient_id,lower(d.type)||'.read') then raise exception 'document not found' using errcode='42501';end if;
 perform private.require_cap(d.care_recipient_id,'document.progress.create');
 if p_search is null or private.bal_comment_units(p_search)>100 or p_page is null or p_page<1 or p_page>1000000 then raise exception 'invalid progress people page' using errcode='22023';end if;
 with eligible as (select p.id,p.full_name,m.role::text care_role from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id
 where m.care_recipient_id=d.care_recipient_id and m.status='active' and p.status='active' and position(lower(p_search) in lower(p.full_name))>0),
 selected as (select * from eligible order by full_name,id limit 20 offset ((p_page::bigint-1)*20))
 select (select count(*) from eligible),coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.full_name,'careRole',s.care_role) order by s.full_name,s.id),'[]'::jsonb)
 into total,rows from selected s;
 return jsonb_build_object('documentId',p_document,'careRecipientId',d.care_recipient_id,'search',p_search,'page',p_page,'size',20,'total',total,'data',rows);
end;$$;
revoke all on function public.document_progress_people(uuid,text,integer) from public,anon,authenticated,service_role;
grant execute on function public.document_progress_people(uuid,text,integer) to authenticated;


create or replace function private.progress_note_view(p private.document_progress_notes) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('id',p.id,'source','manual','documentId',p.document_id,'recordedAt',p.recorded_at,
  'authorId',p.author_id,'authorName',p.author_name,'category',p.category,'stage',p.stage,'text',p.body,
  'references',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'code',d.code,'type',d.type) order by r.position)
   from unnest(p.reference_ids) with ordinality r(id,position) join public.operational_documents d on d.id=r.id
   where d.care_recipient_id=p.care_recipient_id and private.can(d.care_recipient_id,lower(d.type)||'.read')),'[]'::jsonb))||coalesce((select jsonb_build_object('relevance',x.relevance,'mentions',x.mentions) from private.document_progress_details x where x.note_id=p.id),'{}'::jsonb);
$$;

create or replace function public.document_progress_publish(p_document uuid,p_key uuid,p_body jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents; n private.document_progress_notes; v_hash text; v_name text; v_refs uuid[]; ref uuid;v_options jsonb;v_mentions jsonb;v_original jsonb;
begin
 if private.auth_session() is null then raise exception 'active identity required' using errcode='42501';end if;
 select * into d from public.operational_documents where id=p_document;
 if not found or not private.can(d.care_recipient_id,lower(d.type)||'.read') then
  raise exception 'document not found' using errcode='42501';end if;
 v_original:=p_body;v_options:=p_body->'publication';
 if p_body ? 'publication' and jsonb_typeof(v_options) is distinct from 'object' then raise exception 'invalid progress publication' using errcode='22023';end if;
 p_body:=p_body-'publication';
 if p_key is null or coalesce(jsonb_typeof(p_body),'')<>'object'
  or p_body-array['category','stage','text','references']<>'{}'::jsonb
  or coalesce(jsonb_typeof(p_body->'category'),'')<>'string'
  or coalesce(p_body->>'category','') not in ('record','action','contact','pending')
  or coalesce(jsonb_typeof(p_body->'text'),'')<>'string' or length(btrim(p_body->>'text'))=0
  or private.bal_comment_units(p_body->>'text')>2000
  or coalesce(jsonb_typeof(p_body->'references'),'')<>'array'
  or jsonb_array_length(p_body->'references')>8
  or (p_body->'stage' is distinct from 'null'::jsonb and coalesce(jsonb_typeof(p_body->'stage'),'')<>'string') then
  raise exception 'invalid progress payload' using errcode='22023';end if;
 if p_body->>'stage' is not null and not (p_body->>'stage'=any(case d.type
   when 'REQ' then array['issuance','family_science','fulfillment','completion']
   when 'COM' then array['issuance','acquisition','receipt','completion']
   when 'ENT' then array['issuance','dispatch','receipt','completion']
   else array['issuance','count','review','completion'] end)) then
  raise exception 'invalid progress stage' using errcode='22023';end if;
 if exists(select 1 from jsonb_array_elements(p_body->'references') v where jsonb_typeof(v)<>'string'
  or (v#>>'{}') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') then
  raise exception 'invalid progress references' using errcode='22023';end if;
 select coalesce(array_agg((v#>>'{}')::uuid order by pos),'{}'::uuid[]) into v_refs
 from jsonb_array_elements(p_body->'references') with ordinality x(v,pos);
 if (select count(distinct v) from unnest(v_refs) v)<>cardinality(v_refs) then
  raise exception 'duplicate progress references' using errcode='22023';end if;
 v_hash:=encode(extensions.digest(jsonb_build_object('documentId',p_document,'content',v_original)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('document-progress:'||auth.uid()||':'||p_key,0));
 -- Recheck live authority after waiting on this exact publication key.
 if private.auth_session() is null or not private.can(d.care_recipient_id,lower(d.type)||'.read') then raise exception 'document not found' using errcode='42501';end if;
 select * into n from private.document_progress_notes where author_id=auth.uid() and idempotency_key=p_key;
 if found then
  if n.intent_hash<>v_hash then raise exception 'idempotency content mismatch' using errcode='22023';end if;
  return jsonb_build_object('note',private.progress_note_view(n),'key',p_key,'intentHash',v_hash,'recovered',true);
 end if;
 perform private.require_cap(d.care_recipient_id,'document.progress.create');
 foreach ref in array v_refs loop
  if not exists(select 1 from public.operational_documents r where r.id=ref and r.care_recipient_id=d.care_recipient_id
   and private.can(r.care_recipient_id,lower(r.type)||'.read')) then
   raise exception 'progress reference not authorized' using errcode='42501';end if;
 end loop;
 if v_options is not null then v_mentions:=private.progress_publication_mentions(d.care_recipient_id,v_options);end if;
 select full_name into v_name from public.profiles where id=auth.uid() and status='active';
 if v_name is null or btrim(v_name)='' then raise exception 'active identity required' using errcode='42501';end if;
 insert into private.document_progress_notes(document_id,care_recipient_id,author_id,author_name,category,stage,body,reference_ids,idempotency_key,intent_hash)
 values(d.id,d.care_recipient_id,auth.uid(),v_name,p_body->>'category',p_body->>'stage',p_body->>'text',v_refs,p_key,v_hash) returning * into n;
 if v_options is not null then
  insert into private.document_progress_details(note_id,relevance,mentions) values(n.id,v_options->>'relevance',v_mentions);
 end if;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
 values(auth.uid(),'document.progress.created','document_progress',n.id,
  jsonb_build_object('care_recipient_id',d.care_recipient_id,'document_id',d.id,'category',n.category,'stage',n.stage));
 return jsonb_build_object('note',private.progress_note_view(n),'key',p_key,'intentHash',v_hash,'recovered',false);
end;$$;

create or replace function public.commit_progress_preparation(p_patient uuid,p_purpose text,p_target uuid,p_id uuid,p_expected integer,p_body jsonb,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.progress_preparations;c private.progress_preparation_commands;h text;native jsonb;receipt jsonb;result jsonb;begin
 if p_purpose is distinct from 'progress_note' or p_key is null or jsonb_typeof(p_body) is distinct from 'object' then raise exception 'invalid progress commit' using errcode='22023';end if;
 perform private.require_progress_preparation_scope(p_patient,p_target);
 h:=encode(extensions.digest(jsonb_build_array('progress-preparation-commit',p_patient,p_target,p_id,p_expected,p_body)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('progress-preparation-key:'||auth.uid()||':'||p_key,0));
 perform private.require_progress_preparation_scope(p_patient,p_target);
 select * into c from private.progress_preparation_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then
  if c.intent_hash is distinct from h then raise exception 'private draft idempotency conflict' using errcode='23505';end if;
  select * into d from private.progress_preparations where id=c.preparation_id;
  return jsonb_build_object('draft',jsonb_build_object('id',d.id,'revision',d.revision,'state',d.state),'receipt',private.progress_preparation_view(d)->'consumedResult','replayed',true);
 end if;
 perform pg_advisory_xact_lock(hashtextextended('progress-preparation-slot:'||auth.uid()||':'||p_target,0));
 perform private.require_progress_preparation_scope(p_patient,p_target,true);
 select * into d from private.progress_preparations where id=p_id and owner_id=auth.uid() and care_recipient_id=p_patient and document_id=p_target for update;
 if not found then raise exception 'private draft unavailable' using errcode='42501';end if;
 if p_expected is null or d.revision is distinct from p_expected or d.state<>'active' then raise exception 'stale private draft revision' using errcode='PT409';end if;
 if (p_body-'publication') is distinct from d.content->'note' then raise exception 'private progress intent mismatch' using errcode='22023';end if;
 if length(btrim(p_body->>'text',U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'))=0 then raise exception 'invalid progress payload' using errcode='22023';end if;
 native:=public.document_progress_publish(p_target,p_key,p_body);
 if native->>'key' is distinct from p_key::text or native->'note'->>'documentId' is distinct from p_target::text or native->'note'->>'authorId' is distinct from auth.uid()::text then raise exception 'native progress invariant failed' using errcode='XX000';end if;
 receipt:=jsonb_build_object('patientId',p_patient,'purpose',p_purpose,'targetResourceId',p_target,'resourceId',native->'note'->'id','actorId',auth.uid(),'recordedAt',native->'note'->'recordedAt','idempotencyKey',p_key,'documentType',d.content->'documentType','command',jsonb_build_object('key',p_key,'content',p_body-'publication')||case when p_body ? 'publication' then jsonb_build_object('publication',p_body->'publication') else '{}'::jsonb end);
 update private.progress_preparations set state='consumed',content=null,navigation=null,revision=revision+1,saved_at=clock_timestamp(),consumed_resource_id=(native->'note'->>'id')::uuid,consumed_result=receipt where id=d.id returning * into d;
 result:=jsonb_build_object('draft',jsonb_build_object('id',d.id,'revision',d.revision,'state',d.state),'receipt',receipt||jsonb_build_object('nativeResult',native),'replayed',false);
 insert into private.progress_preparation_commands values(auth.uid(),p_key,d.id,h,result-'receipt');
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'private_draft.consume','progress_preparation',d.id,jsonb_build_object('care_recipient_id',p_patient,'resource_id',d.consumed_resource_id));
 perform private.require_progress_preparation_scope(p_patient,p_target,true);
 return result;
end;$$;

create or replace function public.progress_preparation_recovery(p_patient uuid,p_purpose text,p_target uuid,p_id uuid,p_expected integer,p_body jsonb,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.progress_preparations;c private.progress_preparation_commands;n private.document_progress_notes;h text;typ text;scope jsonb;status text;reason text;receipt jsonb;native_hash text;
begin
 if p_purpose is distinct from 'progress_note' or p_id is null or p_expected is null or p_expected<1 or p_key is null then raise exception 'invalid progress recovery' using errcode='22023';end if;
 perform private.require_progress_preparation_scope(p_patient,p_target);
 select type into typ from public.operational_documents where id=p_target;
 perform private.validate_progress_preparation(jsonb_build_object('documentType',typ,'note',p_body-'publication'),'{"version":1,"stage":"progress_note"}',typ);
 h:=encode(extensions.digest(jsonb_build_array('progress-preparation-commit',p_patient,p_target,p_id,p_expected,p_body)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('progress-preparation-key:'||auth.uid()||':'||p_key,0));
 perform private.require_progress_preparation_scope(p_patient,p_target);
 select * into d from private.progress_preparations where id=p_id and owner_id=auth.uid() and care_recipient_id=p_patient and document_id=p_target;
 if not found then raise exception 'private draft unavailable' using errcode='42501';end if;
 select * into c from private.progress_preparation_commands where owner_id=auth.uid() and idempotency_key=p_key;
 scope:=jsonb_build_object('patientId',p_patient,'ownerId',auth.uid(),'targetResourceId',p_target,'key',p_key,'expectedRevision',p_expected,'content',p_body-'publication','current',jsonb_build_object('id',d.id,'revision',d.revision,'state',d.state))||case when p_body ? 'publication' then jsonb_build_object('publication',p_body->'publication') else '{}'::jsonb end;
 if c.idempotency_key is not null and c.intent_hash=h then
  if d.state not in ('consumed','completed') then raise exception 'native progress invariant failed' using errcode='XX000';end if;
  return scope||jsonb_build_object('status','applied','confirmation',jsonb_build_object('draft',jsonb_build_object('id',d.id,'revision',d.revision,'state',d.state),'receipt',private.progress_preparation_view(d)->'consumedResult','replayed',true));
 end if;
 select * into n from private.document_progress_notes where author_id=auth.uid() and idempotency_key=p_key;
 native_hash:=encode(extensions.digest(jsonb_build_object('documentId',p_target,'content',p_body)::text,'sha256'),'hex');
 if n.id is not null and n.intent_hash=native_hash and n.document_id=p_target then
  return scope||jsonb_build_object('status','applied_native','nativeResult',jsonb_build_object('note',private.progress_note_view(n),'key',p_key,'intentHash',n.intent_hash,'recovered',true));
 elsif n.id is not null or c.idempotency_key is not null then status:='not_applied';reason:='key_conflict';
 elsif d.revision>p_expected then
  if d.consumed_result->>'idempotencyKey'=p_key::text then raise exception 'native progress invariant failed' using errcode='XX000';end if;
  status:='not_applied';reason:='advanced_revision';
 else status:='unknown';reason:=null;end if;
 receipt:=private.progress_preparation_view(d)->'consumedResult';
 return scope||jsonb_build_object('status',status,'reason',reason,'receipt',receipt);
end;$$;

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
  select e.id,e.created_at recorded_at,'automatic'::text source,e.action,e.version,e.actor_id,e.actor_name
  from public.document_events e where e.document_id=p_document and e.action=any(array[
   'req.issued','req.legacy_imported','req.science_recorded','req.science_satisfied','req.item_resolved',
   'req.completed','req.fulfillment_updated','req.reopened','req.archived.manual','req.archived.automatic','req.remaining_need_declared',
   'com.draft','com.issued','com.submit','com.approve','com.purchase','com.receive','com.validate_receipt','com.reject_receipt','com.close_expectation',
   'ent.draft','ent.issued','ent.submit','ent.reassign','ent.receive','ent.resolve','ent.cancel','ent.consent_cancel','ent.refuse_cancellation',
   'ent.withdraw_cancellation','ent.propose_regularization','ent.record_regularization_finding','ent.review_regularization','ent.withdraw_regularization',
   'ent.transfer.declared','ent.transfer.agreed','ent.transfer.declined','ent.transfer.withdrawn',
   'bal.draft','bal.issued','bal.submit','bal.approve','bal.recount','bal.apply','bal.cancel','com.cancel','req.status',
   'req.cancellation_acknowledged','com.cancellation_acknowledged','ent.cancellation_acknowledged','bal.cancellation_acknowledged',
   'req.complement_added','req.complement_linked','com.complement_added','com.complement_linked',
   'ent.complement_added','ent.complement_linked','bal.complement_added','bal.complement_linked'])
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

notify pgrst,'reload schema';
