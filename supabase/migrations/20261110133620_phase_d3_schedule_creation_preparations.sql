-- New resources are created only by an explicit native confirmation,never by save.
create table private.schedule_preparations (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.profiles(id),
 care_recipient_id uuid not null references public.care_recipients(id),
 purpose text not null check(purpose in ('shift_type_create','schedule_series_create')),
 revision integer not null default 1 check(revision>0),state text not null default 'active' check(state in ('active','discarded','consumed','completed')),
 content jsonb,content_hash text not null,navigation jsonb,
 created_at timestamptz not null default clock_timestamp(),saved_at timestamptz not null default clock_timestamp(),
 consumed_type_id uuid references public.shift_types(id),consumed_series_id uuid references public.shift_series(id),
 consumed_resource_id uuid generated always as (coalesce(consumed_type_id,consumed_series_id)) stored,consumed_result jsonb,
 check((state='active')=(content is not null)),check((state in ('consumed','completed'))=(consumed_result is not null)),
 check((state in ('consumed','completed'))=(consumed_resource_id is not null)),
 check(consumed_type_id is null or purpose='shift_type_create'),check(consumed_series_id is null or purpose='schedule_series_create')
);
create unique index schedule_preparation_slot on private.schedule_preparations(owner_id,care_recipient_id,purpose) where state in ('active','consumed');
create index schedule_preparation_patient_fk on private.schedule_preparations(care_recipient_id);
create index schedule_preparation_type_fk on private.schedule_preparations(consumed_type_id);
create index schedule_preparation_series_fk on private.schedule_preparations(consumed_series_id);
create table private.schedule_preparation_commands (
 owner_id uuid not null references public.profiles(id),idempotency_key uuid not null,
 preparation_id uuid not null references private.schedule_preparations(id),intent_hash text not null,result jsonb not null,
 primary key(owner_id,idempotency_key)
);
create index schedule_preparation_command_fk on private.schedule_preparation_commands(preparation_id);
alter table private.schedule_preparations enable row level security;
alter table private.schedule_preparation_commands enable row level security;
revoke all on private.schedule_preparations,private.schedule_preparation_commands from public,anon,authenticated,service_role;

create function private.require_schedule_preparation_scope(p_patient uuid,p_purpose text,p_write boolean default false)
returns void language plpgsql security definer set search_path='' as $$begin
 if p_purpose is null or p_purpose not in ('shift_type_create','schedule_series_create') then raise exception 'invalid schedule preparation purpose' using errcode='22023';end if;
 if private.auth_session() is null or not public.can_access_recipient(p_patient) then raise exception 'schedule authorization required' using errcode='42501';end if;
 if p_write then
  if not exists(select 1 from public.care_recipients where id=p_patient and is_active) then raise exception 'schedule authorization required' using errcode='42501';end if;
  if p_purpose='shift_type_create' then perform private.require_cap(p_patient,'schedule.types.manage');
  elsif not(private.can(p_patient,'schedule.manage.team') or private.can(p_patient,'schedule.manage.own') or private.can(p_patient,'schedule.propose')) then raise exception 'schedule authorization required' using errcode='42501';end if;
 end if;
end;$$;
create function private.validate_schedule_preparation(p_patient uuid,p_purpose text,p_content jsonb,p_navigation jsonb,p_previous jsonb default null)
returns void language plpgsql security definer set search_path='' as $$
declare f jsonb;t public.shift_types;k text;limit_units integer;begin
 if jsonb_typeof(p_content) is distinct from 'object' or p_content-array['schedule']<>'{}'::jsonb
 or jsonb_typeof(p_content->'schedule') is distinct from 'object' or p_navigation is distinct from '{"version":1,"stage":"schedule_creation"}'::jsonb
 then raise exception 'invalid schedule preparation' using errcode='22023';end if;
 f:=p_content->'schedule';
 if p_purpose='shift_type_create' then
  if f->>'form' is distinct from 'type' or not(f ?& array['form','name','start','duration','active']) or f-array['form','name','start','duration','active']<>'{}'::jsonb or jsonb_typeof(f->'active') is distinct from 'boolean' then raise exception 'invalid schedule type fields' using errcode='22023';end if;
  foreach k in array array['name','start','duration'] loop
   limit_units:=case k when 'name' then 100 when 'start' then 8 else 32 end;
   if jsonb_typeof(f->k) is distinct from 'string' or private.bal_comment_units(f->>k)>limit_units then raise exception 'invalid schedule type fields' using errcode='22023';end if;
  end loop;
  if f->>'start'!~'^(|([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?)$'
   or f->>'duration'!~'^(|-?([0-9]+(\.[0-9]+)?|\.[0-9]+)([eE][+-]?[0-9]+)?)$' then raise exception 'invalid schedule type fields' using errcode='22023';end if;
 else
  if f->>'form' is distinct from 'series' or not(f ?& array['form','professionalId','shiftTypeId','shiftTypeVersion','recurrence','weekdays','dates','cycle','from','until','timezone','notes','reason'])
   or f-array['form','professionalId','shiftTypeId','shiftTypeVersion','recurrence','weekdays','dates','cycle','from','until','timezone','notes','reason']<>'{}'::jsonb
   or f->>'recurrence' is null or f->>'recurrence' not in ('once','weekly','dates','cycle') or f->>'cycle' is null or f->>'cycle' not in ('12x36','24x48','24x24') then raise exception 'invalid schedule series fields' using errcode='22023';end if;
  foreach k in array array['professionalId','shiftTypeId','from','until','timezone','notes','reason'] loop
   limit_units:=case k when 'professionalId' then 36 when 'shiftTypeId' then 36 when 'from' then 10 when 'until' then 10 when 'timezone' then 80 when 'notes' then 2000 else 1000 end;
   if jsonb_typeof(f->k) is distinct from 'string' or private.bal_comment_units(f->>k)>limit_units then raise exception 'invalid schedule series fields' using errcode='22023';end if;
  end loop;
  foreach k in array array['professionalId','shiftTypeId'] loop
   if f->>k<>'' and f->>k!~'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then raise exception 'invalid schedule selection' using errcode='22023';end if;
  end loop;
  if f->>'professionalId'<>'' and (f->>'professionalId')::uuid<>auth.uid() and not private.can(p_patient,'schedule.manage.team') then raise exception 'schedule authorization required' using errcode='42501';end if;
  if jsonb_typeof(f->'weekdays') is distinct from 'array' or jsonb_array_length(f->'weekdays')>7 or jsonb_typeof(f->'dates') is distinct from 'array' or jsonb_array_length(f->'dates')>367 then raise exception 'invalid schedule selections' using errcode='22023';end if;
  if exists(select 1 from jsonb_array_elements(f->'weekdays') v where jsonb_typeof(v)<>'number' or v::text!~'^[0-6]$') or (select count(distinct v) from jsonb_array_elements(f->'weekdays') v)<>jsonb_array_length(f->'weekdays') then raise exception 'invalid schedule weekdays' using errcode='22023';end if;
  if exists(select 1 from jsonb_array_elements(f->'dates') v where jsonb_typeof(v)<>'string' or (v#>>'{}')!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$') or (select count(distinct v) from jsonb_array_elements(f->'dates') v)<>jsonb_array_length(f->'dates') then raise exception 'invalid schedule dates' using errcode='22023';end if;
  perform (v#>>'{}')::date from jsonb_array_elements(f->'dates') v;
  foreach k in array array['from','until'] loop
   if f->>k<>'' then if f->>k!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'invalid schedule date' using errcode='22023';end if;perform (f->>k)::date;end if;
  end loop;
  if f->>'shiftTypeId'='' then
   if f->'shiftTypeVersion' is distinct from 'null'::jsonb then raise exception 'invalid schedule type reference' using errcode='22023';end if;
  else
   if jsonb_typeof(f->'shiftTypeVersion') is distinct from 'number' or f->>'shiftTypeVersion'!~'^[1-9][0-9]{0,9}$' or (f->>'shiftTypeVersion')::numeric>2147483647 then raise exception 'invalid schedule type reference' using errcode='22023';end if;
   select * into t from public.shift_types where id=(f->>'shiftTypeId')::uuid and care_recipient_id=p_patient;
   if not found then raise exception 'shift type not found' using errcode='42501';end if;
   -- Retain an already saved old reference;changing it requires the actual current version.
   if (p_previous->'schedule'->'shiftTypeId' is distinct from f->'shiftTypeId' or p_previous->'schedule'->'shiftTypeVersion' is distinct from f->'shiftTypeVersion') and t.version::text is distinct from f->>'shiftTypeVersion' then raise exception 'stale schedule type reference' using errcode='PT409';end if;
  end if;
 end if;
end;$$;
create function private.schedule_preparation_view(d private.schedule_preparations)
returns jsonb language sql stable set search_path='' as $$select jsonb_build_object('id',d.id,'ownerId',d.owner_id,'patientId',d.care_recipient_id,'kind','SCHEDULE','purpose',d.purpose,
 'targetDocumentId',null,'targetResourceId',null,'schemaVersion',1,'revision',d.revision,'state',d.state,'createdAt',d.created_at,'savedAt',d.saved_at,
 'contentHash',d.content_hash,'content',d.content,'navigation',case when d.state='active' then d.navigation end,'consumedDocumentId',null,'consumedResourceId',d.consumed_resource_id,'consumedResult',d.consumed_result)$$;
create function public.schedule_preparation_context(p_patient uuid,p_purpose text)
returns jsonb language plpgsql security definer set search_path='' as $$declare d private.schedule_preparations;begin
 perform private.require_schedule_preparation_scope(p_patient,p_purpose);
 select * into d from private.schedule_preparations where owner_id=auth.uid() and care_recipient_id=p_patient and purpose=p_purpose and state in ('active','consumed');
 return case when found then private.schedule_preparation_view(d) else null end;
end;$$;
create function public.schedule_preparation_command(p_patient uuid,p_purpose text,p_id uuid,p_expected integer,p_body jsonb,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.schedule_preparations;c private.schedule_preparation_commands;h text;a text:=p_body->>'action';result jsonb;begin
 perform private.require_schedule_preparation_scope(p_patient,p_purpose);
 if p_key is null or jsonb_typeof(p_body) is distinct from 'object' or a is null or a not in ('save','discard','acknowledge') or p_body-array['action','content','navigation']<>'{}'::jsonb or a<>'save' and (p_body?'content' or p_body?'navigation') then raise exception 'invalid schedule preparation command' using errcode='22023';end if;
 h:=encode(extensions.digest(jsonb_build_array('schedule-preparation',p_patient,p_purpose,p_id,p_expected,p_body)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('schedule-preparation-key:'||auth.uid()||':'||p_key,0));
 perform private.require_schedule_preparation_scope(p_patient,p_purpose);
 select * into c from private.schedule_preparation_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then if c.intent_hash is distinct from h then raise exception 'private draft idempotency conflict' using errcode='23505';end if;return c.result||jsonb_build_object('replayed',true);end if;
 perform pg_advisory_xact_lock(hashtextextended('schedule-preparation-slot:'||auth.uid()||':'||p_patient||':'||p_purpose,0));
 perform private.require_schedule_preparation_scope(p_patient,p_purpose,a='save');
 if p_id is null then
  if a<>'save' or p_expected is not null then raise exception 'private draft creation requires no prior revision' using errcode='22023';end if;
  if exists(select 1 from private.schedule_preparations where owner_id=auth.uid() and care_recipient_id=p_patient and purpose=p_purpose and state in ('active','consumed')) then raise exception 'stale private draft revision' using errcode='PT409';end if;
  perform private.validate_schedule_preparation(p_patient,p_purpose,p_body->'content',p_body->'navigation');
  insert into private.schedule_preparations(owner_id,care_recipient_id,purpose,content,navigation,content_hash) values(auth.uid(),p_patient,p_purpose,p_body->'content',p_body->'navigation',encode(extensions.digest((p_body->'content')::text,'sha256'),'hex')) returning * into d;
 else
  select * into d from private.schedule_preparations where id=p_id and owner_id=auth.uid() and care_recipient_id=p_patient and purpose=p_purpose for update;
  if not found then raise exception 'private draft unavailable' using errcode='42501';end if;
  if p_expected is null or p_expected is distinct from d.revision or (a='acknowledge' and d.state<>'consumed') or (a<>'acknowledge' and d.state<>'active') then raise exception 'stale private draft revision' using errcode='PT409';end if;
  if a='save' then
   perform private.validate_schedule_preparation(p_patient,p_purpose,p_body->'content',p_body->'navigation',d.content);
   update private.schedule_preparations set content=p_body->'content',navigation=p_body->'navigation',content_hash=encode(extensions.digest((p_body->'content')::text,'sha256'),'hex'),revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;
  elsif a='discard' then update private.schedule_preparations set state='discarded',content=null,navigation=null,revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;
  else update private.schedule_preparations set state='completed',revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;end if;
 end if;
 result:=jsonb_build_object('id',d.id,'patientId',p_patient,'ownerId',auth.uid(),'purpose',p_purpose,'targetResourceId',null,'revision',d.revision,'savedAt',d.saved_at,'state',d.state,'consumedDocumentId',null,'consumedResourceId',d.consumed_resource_id,'consumedResult',d.consumed_result,'replayed',false);
 insert into private.schedule_preparation_commands values(auth.uid(),p_key,d.id,h,result);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'private_draft.'||a,'schedule_preparation',d.id,jsonb_build_object('care_recipient_id',p_patient,'revision',d.revision));
 perform private.require_schedule_preparation_scope(p_patient,p_purpose,a='save');return result;
end;$$;
create function private.schedule_creation_command(p_content jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
declare f jsonb:=p_content->'schedule';b jsonb;white text:=U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF';begin
 if f->>'form'='type' then
  if length(btrim(f->>'name',white)) not between 2 and 100 or f->>'start'='' or f->>'duration'='' or (f->>'duration')::numeric<>trunc((f->>'duration')::numeric) or (f->>'duration')::numeric not between 15 and 1440 then raise exception 'invalid schedule duration or name' using errcode='22023';end if;
  return jsonb_build_object('action','type','body',jsonb_build_object('name',btrim(f->>'name',white),'startsLocal',f->'start','durationMinutes',(f->>'duration')::integer,'active',f->'active'));
 end if;
 if f->>'professionalId'='' or f->>'shiftTypeId'='' or f->>'timezone'='' or f->>'from'='' or (f->>'recurrence'<>'once' and f->>'until'='') or (f->>'recurrence'='weekly' and jsonb_array_length(f->'weekdays')=0) or (f->>'reason'<>'' and length(btrim(f->>'reason',white))<3) then raise exception 'incomplete schedule fields' using errcode='22023';end if;
 b:=jsonb_build_object('professionalId',f->'professionalId','shiftTypeId',f->'shiftTypeId','timezone',f->'timezone','recurrence',f->'recurrence','weekdays',case when f->>'recurrence'='weekly' then f->'weekdays' else '[]'::jsonb end,'anchorDate',f->'from','validUntil',case when f->>'recurrence'='once' then f->'from' else f->'until' end,'notes',f->'notes');
 if f->>'recurrence'='dates' then b:=b||jsonb_build_object('dates',f->'dates','shiftTypeVersion',f->'shiftTypeVersion');end if;
 if f->>'recurrence'='cycle' then b:=b||jsonb_build_object('workHours',split_part(f->>'cycle','x',1)::integer,'restHours',split_part(f->>'cycle','x',2)::integer);end if;
 if f->>'reason'<>'' then b:=b||jsonb_build_object('reason',btrim(f->>'reason',white));end if;
 return jsonb_build_object('action','series','body',b);
end;$$;
create function public.commit_schedule_preparation(p_patient uuid,p_purpose text,p_id uuid,p_expected integer,p_body jsonb,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d private.schedule_preparations;c private.schedule_preparation_commands;h text;native jsonb;receipt jsonb;result jsonb;t public.shift_types;recorded timestamptz;begin
 perform private.require_schedule_preparation_scope(p_patient,p_purpose);
 if p_key is null or p_body is null then raise exception 'invalid schedule preparation commit' using errcode='22023';end if;
 h:=encode(extensions.digest(jsonb_build_array('schedule-preparation-commit',p_patient,p_purpose,p_id,p_expected,p_body)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('schedule-preparation-key:'||auth.uid()||':'||p_key,0));
 perform private.require_schedule_preparation_scope(p_patient,p_purpose);
 select * into c from private.schedule_preparation_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then
  if c.intent_hash is distinct from h then raise exception 'private draft idempotency conflict' using errcode='23505';end if;
  select * into d from private.schedule_preparations where id=c.preparation_id;
  return jsonb_build_object('draft',jsonb_build_object('id',d.id,'revision',d.revision,'state',d.state),'receipt',d.consumed_result,'replayed',true);
 end if;
 perform pg_advisory_xact_lock(hashtextextended('schedule-preparation-slot:'||auth.uid()||':'||p_patient||':'||p_purpose,0));
 perform private.require_schedule_preparation_scope(p_patient,p_purpose,true);
 select * into d from private.schedule_preparations where id=p_id and owner_id=auth.uid() and care_recipient_id=p_patient and purpose=p_purpose for update;
 if not found then raise exception 'private draft unavailable' using errcode='42501';end if;
 if p_expected is null or d.revision is distinct from p_expected or d.state<>'active' then raise exception 'stale private draft revision' using errcode='PT409';end if;
 if p_body is distinct from private.schedule_creation_command(d.content) then raise exception 'private schedule intent mismatch' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('schedule:'||p_patient,0));
 perform private.require_schedule_preparation_scope(p_patient,p_purpose,true);
 if exists(select 1 from private.schedule_commands where care_recipient_id=p_patient and actor_id=auth.uid() and key=p_key) then raise exception 'native schedule key already used' using errcode='PT409';end if;
 if p_purpose='schedule_series_create' then
  select * into t from public.shift_types where id=(d.content->'schedule'->>'shiftTypeId')::uuid and care_recipient_id=p_patient for share;
  if not found or not t.is_active or t.version::text is distinct from d.content->'schedule'->>'shiftTypeVersion' then raise exception 'stale schedule type reference' using errcode='PT409';end if;
 end if;
 native:=public.schedule_command(p_patient,p_body->>'action',p_body->'body',p_key,null);
 select created_at into recorded from private.schedule_commands where care_recipient_id=p_patient and actor_id=auth.uid() and key=p_key;
 if native->>'care_recipient_id' is distinct from p_patient::text or native->>'created_by' is distinct from auth.uid()::text or native->>'id' is null or recorded is null then raise exception 'native schedule invariant failed' using errcode='XX000';end if;
 receipt:=jsonb_build_object('patientId',p_patient,'purpose',p_purpose,'targetResourceId',null,'resourceId',native->'id','actorId',auth.uid(),'recordedAt',recorded,'idempotencyKey',p_key,'command',p_body,'fields',d.content->'schedule','nativeResult',jsonb_build_object('id',native->'id','version',native->'version','status',native->'status','active',native->'is_active'));
 update private.schedule_preparations set state='consumed',content=null,navigation=null,revision=revision+1,saved_at=clock_timestamp(),consumed_type_id=case when p_purpose='shift_type_create' then (native->>'id')::uuid end,consumed_series_id=case when p_purpose='schedule_series_create' then (native->>'id')::uuid end,consumed_result=receipt where id=d.id returning * into d;
 result:=jsonb_build_object('draft',jsonb_build_object('id',d.id,'revision',d.revision,'state',d.state),'receipt',receipt,'replayed',false);
 insert into private.schedule_preparation_commands values(auth.uid(),p_key,d.id,h,result);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'private_draft.consume','schedule_preparation',d.id,jsonb_build_object('care_recipient_id',p_patient,'resource_id',d.consumed_resource_id));
 perform private.require_schedule_preparation_scope(p_patient,p_purpose,true);return result;
end;$$;
revoke all on function private.require_schedule_preparation_scope(uuid,text,boolean),private.validate_schedule_preparation(uuid,text,jsonb,jsonb,jsonb),private.schedule_preparation_view(private.schedule_preparations),private.schedule_creation_command(jsonb) from public,anon,authenticated,service_role;
revoke all on function public.schedule_preparation_context(uuid,text),public.schedule_preparation_command(uuid,text,uuid,integer,jsonb,uuid),public.commit_schedule_preparation(uuid,text,uuid,integer,jsonb,uuid) from public,anon,service_role;
grant execute on function public.schedule_preparation_context(uuid,text),public.schedule_preparation_command(uuid,text,uuid,integer,jsonb,uuid),public.commit_schedule_preparation(uuid,text,uuid,integer,jsonb,uuid) to authenticated;

-- The existing new-type form exposes active=false;the native insert must honor it.
do $$declare body text;marker text;replacement text;begin
 body:=replace(pg_get_functiondef('public.schedule_command(uuid,text,jsonb,uuid,integer)'::regprocedure),E'\r\n',E'\n');
 marker:=$marker$insert into public.shift_types(care_recipient_id,name,starts_local,duration_minutes,created_by)
 values(p_patient,trim(p_body->>'name'),(p_body->>'startsLocal')::time,(p_body->>'durationMinutes')::integer,auth.uid()) returning * into typ;$marker$;
 marker:=replace(marker,E'\r\n',E'\n');
 if (length(body)-length(replace(body,marker,'')))/length(marker)<>1 then raise exception 'schedule type creation marker missing';end if;
 replacement:=$replacement$insert into public.shift_types(care_recipient_id,name,starts_local,duration_minutes,created_by,is_active)
 values(p_patient,trim(p_body->>'name'),(p_body->>'startsLocal')::time,(p_body->>'durationMinutes')::integer,auth.uid(),coalesce((p_body->>'active')::boolean,true)) returning * into typ;$replacement$;
 execute replace(body,marker,replacement);
end;$$;
