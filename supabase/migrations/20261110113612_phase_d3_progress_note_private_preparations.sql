-- A private incomplete note is separate from the immutable published progress record.
create table private.progress_preparations (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.profiles(id),
 care_recipient_id uuid not null references public.care_recipients(id),
 document_id uuid not null references public.operational_documents(id),
 revision integer not null default 1 check(revision>0),
 state text not null default 'active' check(state in ('active','discarded','consumed','completed')),
 content jsonb,content_hash text not null,navigation jsonb,
 created_at timestamptz not null default clock_timestamp(),saved_at timestamptz not null default clock_timestamp(),
 consumed_resource_id uuid references private.document_progress_notes(id),consumed_result jsonb,
 check((state='active')=(content is not null)),
 check((state in ('consumed','completed'))=(consumed_resource_id is not null)),
 check((state in ('consumed','completed'))=(consumed_result is not null))
);
create unique index progress_preparation_slot on private.progress_preparations(owner_id,care_recipient_id,document_id) where state in ('active','consumed');
create index progress_preparation_patient_fk on private.progress_preparations(care_recipient_id);
create index progress_preparation_document_fk on private.progress_preparations(document_id);
create index progress_preparation_note_fk on private.progress_preparations(consumed_resource_id);
create table private.progress_preparation_commands (
 owner_id uuid not null references public.profiles(id),idempotency_key uuid not null,
 preparation_id uuid not null references private.progress_preparations(id),intent_hash text not null,result jsonb not null,
 primary key(owner_id,idempotency_key)
);
create index progress_preparation_command_fk on private.progress_preparation_commands(preparation_id);
alter table private.progress_preparations enable row level security;
alter table private.progress_preparation_commands enable row level security;
revoke all on private.progress_preparations,private.progress_preparation_commands from public,anon,authenticated,service_role;

create function private.require_progress_preparation_scope(p_patient uuid,p_target uuid,p_write boolean default false)
returns void language plpgsql security definer set search_path='' as $$
begin
 if private.auth_session() is null or not public.can_access_recipient(p_patient)
 or not exists(select 1 from public.operational_documents d where d.id=p_target and d.care_recipient_id=p_patient and private.can(p_patient,lower(d.type)||'.read'))
 then raise exception 'document progress scope required' using errcode='42501';end if;
 if p_write then perform private.require_cap(p_patient,'document.progress.create');end if;
end;$$;
create function private.validate_progress_preparation(p_content jsonb,p_navigation jsonb,p_type text)
returns void language plpgsql immutable set search_path='' as $$
declare f jsonb;begin
 if jsonb_typeof(p_content) is distinct from 'object' or not(p_content ?& array['documentType','note'])
 or p_content-array['documentType','note']<>'{}'::jsonb or p_content->>'documentType' is distinct from p_type
 or p_navigation is distinct from '{"version":1,"stage":"progress_note"}'::jsonb then raise exception 'invalid progress preparation' using errcode='22023';end if;
 f:=p_content->'note';
 if jsonb_typeof(f) is distinct from 'object' or not(f ?& array['category','stage','text','references']) or f-array['category','stage','text','references']<>'{}'::jsonb
 or jsonb_typeof(f->'category') is distinct from 'string' or f->>'category' not in ('record','action','contact','pending')
 or jsonb_typeof(f->'text') is distinct from 'string' or private.bal_comment_units(f->>'text')>2000
 or jsonb_typeof(f->'references') is distinct from 'array' or jsonb_array_length(f->'references')>8
 or (f->'stage'<>'null'::jsonb and (jsonb_typeof(f->'stage') is distinct from 'string' or not(f->>'stage'=any(case p_type when 'REQ' then array['issuance','family_science','fulfillment','completion'] when 'COM' then array['issuance','acquisition','receipt','completion'] when 'ENT' then array['issuance','dispatch','receipt','completion'] else array['issuance','count','review','completion'] end))))
 then raise exception 'invalid progress fields' using errcode='22023';end if;
 if exists(select 1 from jsonb_array_elements(f->'references') v where jsonb_typeof(v)<>'string' or (v#>>'{}')!~'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') then raise exception 'invalid progress references' using errcode='22023';end if;
 if (select count(distinct (v#>>'{}')::uuid) from jsonb_array_elements(f->'references') v)<>jsonb_array_length(f->'references') then raise exception 'duplicate progress references' using errcode='22023';end if;
end;$$;
create function private.progress_preparation_view(d private.progress_preparations)
returns jsonb language plpgsql stable set search_path='' as $$
declare receipt jsonb;n private.document_progress_notes;begin
 receipt:=d.consumed_result;
 if d.consumed_resource_id is not null then
  select * into n from private.document_progress_notes where id=d.consumed_resource_id and author_id=d.owner_id and document_id=d.document_id;
  if not found then raise exception 'progress receipt unavailable' using errcode='42501';end if;
  -- Reference labels are reconstructed under live read authority,never frozen in private receipts.
  receipt:=receipt||jsonb_build_object('nativeResult',jsonb_build_object('note',private.progress_note_view(n),'key',n.idempotency_key,'intentHash',n.intent_hash,'recovered',true));
 end if;
 return jsonb_build_object('id',d.id,'ownerId',d.owner_id,'patientId',d.care_recipient_id,'kind','PROGRESS','purpose','progress_note',
 'targetDocumentId',null,'targetResourceId',d.document_id,'schemaVersion',1,'revision',d.revision,'state',d.state,'createdAt',d.created_at,'savedAt',d.saved_at,
 'contentHash',d.content_hash,'content',d.content,'navigation',case when d.state='active' then d.navigation end,'consumedDocumentId',null,'consumedResourceId',d.consumed_resource_id,'consumedResult',receipt);
end;$$;
create function public.progress_preparation_context(p_patient uuid,p_purpose text,p_target uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.progress_preparations;begin
 if p_purpose is distinct from 'progress_note' then raise exception 'invalid progress purpose' using errcode='22023';end if;
 perform private.require_progress_preparation_scope(p_patient,p_target);
 select * into d from private.progress_preparations where owner_id=auth.uid() and care_recipient_id=p_patient and document_id=p_target and state in ('active','consumed');
 return case when found then private.progress_preparation_view(d) else null end;
end;$$;
create function public.progress_preparation_command(p_patient uuid,p_purpose text,p_target uuid,p_id uuid,p_expected integer,p_body jsonb,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.progress_preparations;c private.progress_preparation_commands;h text;a text:=p_body->>'action';result jsonb;typ text;begin
 if p_purpose is distinct from 'progress_note' then raise exception 'invalid progress purpose' using errcode='22023';end if;
 perform private.require_progress_preparation_scope(p_patient,p_target);
 if p_key is null or jsonb_typeof(p_body) is distinct from 'object' or a is null or a not in ('save','discard','acknowledge') or p_body-array['action','content','navigation']<>'{}'::jsonb or a<>'save' and (p_body ? 'content' or p_body ? 'navigation') then raise exception 'invalid progress command' using errcode='22023';end if;
 h:=encode(extensions.digest(jsonb_build_array('progress-preparation',p_patient,p_target,p_id,p_expected,p_body)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('progress-preparation-key:'||auth.uid()||':'||p_key,0));
 perform private.require_progress_preparation_scope(p_patient,p_target);
 select * into c from private.progress_preparation_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then
  if c.intent_hash is distinct from h then raise exception 'private draft idempotency conflict' using errcode='23505';end if;
  result:=c.result;
  if a='acknowledge' then select * into d from private.progress_preparations where id=c.preparation_id;result:=result||jsonb_build_object('consumedResult',private.progress_preparation_view(d)->'consumedResult');end if;
  return result||jsonb_build_object('replayed',true);
 end if;
 perform pg_advisory_xact_lock(hashtextextended('progress-preparation-slot:'||auth.uid()||':'||p_target,0));
 perform private.require_progress_preparation_scope(p_patient,p_target,a='save');
 select type into typ from public.operational_documents where id=p_target;
 if p_id is null then
  if a<>'save' or p_expected is not null then raise exception 'private draft creation requires no prior revision' using errcode='22023';end if;
  if exists(select 1 from private.progress_preparations where owner_id=auth.uid() and care_recipient_id=p_patient and document_id=p_target and state in ('active','consumed')) then raise exception 'stale private draft revision' using errcode='PT409';end if;
  perform private.validate_progress_preparation(p_body->'content',p_body->'navigation',typ);
  insert into private.progress_preparations(owner_id,care_recipient_id,document_id,content,navigation,content_hash) values(auth.uid(),p_patient,p_target,p_body->'content',p_body->'navigation',encode(extensions.digest((p_body->'content')::text,'sha256'),'hex')) returning * into d;
 else
  select * into d from private.progress_preparations where id=p_id and owner_id=auth.uid() and care_recipient_id=p_patient and document_id=p_target for update;
  if not found then raise exception 'private draft unavailable' using errcode='42501';end if;
  if p_expected is null or p_expected is distinct from d.revision or (a='acknowledge' and d.state<>'consumed') or (a<>'acknowledge' and d.state<>'active') then raise exception 'stale private draft revision' using errcode='PT409';end if;
  if a='save' then
   perform private.validate_progress_preparation(p_body->'content',p_body->'navigation',typ);
   update private.progress_preparations set content=p_body->'content',navigation=p_body->'navigation',content_hash=encode(extensions.digest((p_body->'content')::text,'sha256'),'hex'),revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;
  elsif a='discard' then update private.progress_preparations set state='discarded',content=null,navigation=null,revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;
  else update private.progress_preparations set state='completed',revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;end if;
 end if;
 result:=jsonb_build_object('id',d.id,'patientId',p_patient,'ownerId',auth.uid(),'purpose',p_purpose,'targetResourceId',p_target,'revision',d.revision,'savedAt',d.saved_at,'state',d.state,'consumedDocumentId',null,'consumedResourceId',d.consumed_resource_id,'consumedResult',private.progress_preparation_view(d)->'consumedResult','replayed',false);
 insert into private.progress_preparation_commands values(auth.uid(),p_key,d.id,h,result-'consumedResult');
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'private_draft.'||a,'progress_preparation',d.id,jsonb_build_object('care_recipient_id',p_patient,'revision',d.revision));
 perform private.require_progress_preparation_scope(p_patient,p_target,a='save');
 return result;
end;$$;
create function public.commit_progress_preparation(p_patient uuid,p_purpose text,p_target uuid,p_id uuid,p_expected integer,p_body jsonb,p_key uuid)
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
 if p_body is distinct from d.content->'note' then raise exception 'private progress intent mismatch' using errcode='22023';end if;
 if length(btrim(p_body->>'text',U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'))=0 then raise exception 'invalid progress payload' using errcode='22023';end if;
 native:=public.document_progress_publish(p_target,p_key,p_body);
 if native->>'key' is distinct from p_key::text or native->'note'->>'documentId' is distinct from p_target::text or native->'note'->>'authorId' is distinct from auth.uid()::text then raise exception 'native progress invariant failed' using errcode='XX000';end if;
 receipt:=jsonb_build_object('patientId',p_patient,'purpose',p_purpose,'targetResourceId',p_target,'resourceId',native->'note'->'id','actorId',auth.uid(),'recordedAt',native->'note'->'recordedAt','idempotencyKey',p_key,'documentType',d.content->'documentType','command',jsonb_build_object('key',p_key,'content',p_body));
 update private.progress_preparations set state='consumed',content=null,navigation=null,revision=revision+1,saved_at=clock_timestamp(),consumed_resource_id=(native->'note'->>'id')::uuid,consumed_result=receipt where id=d.id returning * into d;
 result:=jsonb_build_object('draft',jsonb_build_object('id',d.id,'revision',d.revision,'state',d.state),'receipt',receipt||jsonb_build_object('nativeResult',native),'replayed',false);
 insert into private.progress_preparation_commands values(auth.uid(),p_key,d.id,h,result-'receipt');
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'private_draft.consume','progress_preparation',d.id,jsonb_build_object('care_recipient_id',p_patient,'resource_id',d.consumed_resource_id));
 perform private.require_progress_preparation_scope(p_patient,p_target,true);
 return result;
end;$$;
revoke all on function private.require_progress_preparation_scope(uuid,uuid,boolean),private.validate_progress_preparation(jsonb,jsonb,text),private.progress_preparation_view(private.progress_preparations) from public,anon,authenticated,service_role;
revoke all on function public.progress_preparation_context(uuid,text,uuid),public.progress_preparation_command(uuid,text,uuid,uuid,integer,jsonb,uuid),public.commit_progress_preparation(uuid,text,uuid,uuid,integer,jsonb,uuid) from public,anon,service_role;
grant execute on function public.progress_preparation_context(uuid,text,uuid),public.progress_preparation_command(uuid,text,uuid,uuid,integer,jsonb,uuid),public.commit_progress_preparation(uuid,text,uuid,uuid,integer,jsonb,uuid) to authenticated;
