-- Shared D1 dependency: a session deadline may pass after transaction start
-- while a command waits. Post-lock guards must compare the actual clock.
create or replace function private.auth_session() returns uuid
language sql volatile security definer set search_path='' as $$
 select s.id from auth.sessions s join public.profiles p on p.id=s.user_id
 where s.id=nullif(auth.jwt()->>'session_id','')::uuid and s.user_id=auth.uid()
 and p.status='active' and (s.not_after is null or s.not_after>clock_timestamp());
$$;

-- Minimum D2 creation/count drafts for REQ/BAL. No official draft, protocol,
-- document event, attachment deletion, science or stock effect on save/discard.
create table private.creation_drafts(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.profiles(id),
 care_recipient_id uuid not null references public.care_recipients(id),
 kind text not null check(kind in ('REQ','BAL')),
 target_document_id uuid references public.operational_documents(id),
 schema_version integer not null default 1 check(schema_version=1),
 revision integer not null default 1 check(revision>0),
 state text not null default 'active' check(state in ('active','discarded','consumed','completed')),
 content jsonb,
 content_hash text not null,
 created_at timestamptz not null default clock_timestamp(),
 saved_at timestamptz not null default clock_timestamp(),
 consumed_document_id uuid references public.operational_documents(id),
 check(kind='BAL' or target_document_id is null),
 check(state<>'active' or content is not null),
 check((state in ('consumed','completed'))=(consumed_document_id is not null))
);
create unique index creation_draft_active_slot on private.creation_drafts(owner_id,care_recipient_id,kind,coalesce(target_document_id,'00000000-0000-0000-0000-000000000000'::uuid))
 where state in ('active','consumed');
create index creation_draft_owner_fk on private.creation_drafts(owner_id);
create index creation_draft_patient_fk on private.creation_drafts(care_recipient_id);
create index creation_draft_target_fk on private.creation_drafts(target_document_id);
create index creation_draft_consumed_fk on private.creation_drafts(consumed_document_id);
create table private.creation_draft_commands(
 owner_id uuid not null references public.profiles(id),
 idempotency_key uuid not null,
 draft_id uuid not null references private.creation_drafts(id),
 intent_hash text not null,
 result jsonb not null,
 primary key(owner_id,idempotency_key)
);
create index creation_draft_command_draft_fk on private.creation_draft_commands(draft_id);
alter table private.creation_drafts enable row level security;
alter table private.creation_draft_commands enable row level security;
create policy creation_draft_owner on private.creation_drafts for select to authenticated
 using(owner_id=(select auth.uid()) and public.can_access_recipient(care_recipient_id));
create policy creation_draft_command_owner on private.creation_draft_commands for select to authenticated
 using(owner_id=(select auth.uid()) and exists(select 1 from private.creation_drafts d where d.id=draft_id and d.owner_id=(select auth.uid()) and public.can_access_recipient(d.care_recipient_id)));
revoke all on private.creation_drafts,private.creation_draft_commands from public,anon,authenticated,service_role;

create function private.require_creation_draft_read(p_patient uuid,p_kind text) returns void
language plpgsql security definer set search_path='' as $$begin
 if p_kind not in ('REQ','BAL') or p_kind is null or not public.can_access_recipient(p_patient)
  or not private.can(p_patient,case p_kind when 'REQ' then 'req.read' else 'bal.read' end) then
  raise exception 'private draft read unavailable' using errcode='42501';end if;
end;$$;
create function private.creation_draft_text(p_value jsonb,p_max integer,p_optional boolean default false) returns boolean
language sql immutable set search_path='' as $$
 select coalesce(p_optional and (p_value is null or p_value='null'::jsonb),false)
  or coalesce(jsonb_typeof(p_value)='string' and private.bal_comment_units(p_value#>>'{}')<=p_max,false);
$$;
create function private.creation_draft_uuid(p_value jsonb) returns boolean
language plpgsql immutable set search_path='' as $$begin
 if p_value is null or p_value='null'::jsonb then return true;end if;
 if not private.creation_draft_text(p_value,36) then return false;end if;
 perform (p_value#>>'{}')::uuid;return true;
exception when invalid_text_representation then return false;
end;$$;
create function private.creation_draft_time(p_value jsonb) returns boolean
language plpgsql immutable set search_path='' as $$declare t text:=p_value#>>'{}';begin
 if p_value is null or p_value='null'::jsonb then return true;end if;
 if not private.creation_draft_text(p_value,40) or t!~'^[0-9]{4}-[0-9]{2}-[0-9]{2}T(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]([.][0-9]{1,6})?(Z|[+-][0-9]{2}:[0-5][0-9])$' then return false;end if;
 perform t::timestamptz;return true;
exception when invalid_datetime_format or datetime_field_overflow then return false;
end;$$;
create function private.validate_creation_draft(p_kind text,p_content jsonb,p_target uuid) returns void
language plpgsql security definer set search_path='' as $$
declare x jsonb;k text;v jsonb;
begin
 if jsonb_typeof(p_content) is distinct from 'object' or octet_length(p_content::text)>200000 then raise exception 'invalid private draft content' using errcode='22023';end if;
 if p_kind='REQ' then
  if p_target is not null or (p_content-array['lines','extraItems','observations','remainingNeed'])<>'{}'::jsonb
   or jsonb_typeof(p_content->'lines') is distinct from 'array' or jsonb_array_length(p_content->'lines')>1000
   or jsonb_typeof(p_content->'extraItems') is distinct from 'array' or jsonb_array_length(p_content->'extraItems')>20
   or jsonb_typeof(p_content->'observations') is distinct from 'array' or jsonb_array_length(p_content->'observations')>50 then raise exception 'invalid REQ draft' using errcode='22023';end if;
  for x in select value from jsonb_array_elements(p_content->'lines') loop
   if jsonb_typeof(x) is distinct from 'object' or (x-array['productId','productName','category','unit','currentStock','stockObservation','stockObservationAt','urgent','repeatReason'])<>'{}'::jsonb
    or not private.creation_draft_text(x->'productId',120) or length(x->>'productId')=0
    or not private.creation_draft_text(x->'productName',200) or not private.creation_draft_text(x->'unit',80,true)
    or coalesce(x->>'category','') not in ('medicamentos','higiene','dieta') or jsonb_typeof(x->'urgent') is distinct from 'boolean'
    or not private.creation_draft_text(x->'repeatReason',1000,true) then raise exception 'invalid REQ draft line' using errcode='22023';end if;
  end loop;
  for x in select value from jsonb_array_elements(p_content->'extraItems') loop
   if jsonb_typeof(x) is distinct from 'object' or (x-array['id','name','currentStock','stockObservation','stockObservationAt','urgent'])<>'{}'::jsonb
    or not private.creation_draft_text(x->'id',120) or length(x->>'id')=0 or not private.creation_draft_text(x->'name',200)
    or jsonb_typeof(x->'urgent') is distinct from 'boolean' then raise exception 'invalid REQ draft extra' using errcode='22023';end if;
  end loop;
  for x in select value from jsonb_array_elements((p_content->'lines')||(p_content->'extraItems')) loop
   if x ? 'currentStock' and jsonb_typeof(x->'currentStock') not in ('null','number','string')
    or jsonb_typeof(x->'currentStock')='string' and not private.creation_draft_text(x->'currentStock',64)
    or x ? 'stockObservation' and coalesce(x->>'stockObservation','') not in ('observed','unknown','unfilled','legacy_unclassified')
    or not private.creation_draft_time(x->'stockObservationAt') then raise exception 'invalid draft stock observation' using errcode='22023';end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(p_content->'observations') z where not private.creation_draft_text(z,1000)) then raise exception 'invalid REQ draft observation' using errcode='22023';end if;
  if p_content ? 'remainingNeed' then
   x:=p_content->'remainingNeed';
   if jsonb_typeof(x) is distinct from 'object' or (x-array['requisitionId','version','reason'])<>'{}'::jsonb
    or not private.creation_draft_text(x->'requisitionId',36) or not private.creation_draft_uuid(x->'requisitionId') or jsonb_typeof(x->'version') is distinct from 'number'
    or (x->>'version')!~'^[1-9][0-9]{0,9}$' or not private.creation_draft_text(x->'reason',1000) then raise exception 'invalid remaining need draft' using errcode='22023';end if;
  end if;
 elsif p_kind='BAL' then
  if (p_content-array['counts','observationTimes','notes','materials','context'])<>'{}'::jsonb
   or jsonb_typeof(p_content->'counts') is distinct from 'object' or (select count(*) from jsonb_object_keys(p_content->'counts'))>1000
   or jsonb_typeof(p_content->'observationTimes') is distinct from 'object' or not private.creation_draft_text(p_content->'notes',3000)
   or jsonb_typeof(p_content->'materials') is distinct from 'array' or jsonb_array_length(p_content->'materials')>1000 then raise exception 'invalid BAL draft' using errcode='22023';end if;
  for k,v in select * from jsonb_each(p_content->'counts') loop
   if length(k) not between 1 and 120 or not private.creation_draft_text(v,64) then raise exception 'invalid draft physical count' using errcode='22023';end if;
  end loop;
  for k,v in select * from jsonb_each(p_content->'observationTimes') loop
   if not (p_content->'counts' ? k) or not private.creation_draft_time(v) then raise exception 'invalid draft count time' using errcode='22023';end if;
  end loop;
  for x in select value from jsonb_array_elements(p_content->'materials') loop
   if jsonb_typeof(x) is distinct from 'object' or (x-array['id','name','unit','quantityDecimals'])<>'{}'::jsonb
    or not private.creation_draft_text(x->'id',120) or not private.creation_draft_text(x->'name',200)
    or not private.creation_draft_text(x->'unit',80) or jsonb_typeof(x->'quantityDecimals') is distinct from 'number'
    or (x->>'quantityDecimals')!~'^[0-6]$' then raise exception 'invalid draft catalogue reference' using errcode='22023';end if;
  end loop;
  x:=p_content->'context';
  if jsonb_typeof(x) is distinct from 'object' or (x-array['mode','documentId','documentVersion','assignmentId','assignmentVersion','referenceRevision'])<>'{}'::jsonb
   or coalesce(x->>'mode','') not in ('legacy','scheduled') or (x->>'documentId')::uuid is distinct from p_target
   or not private.creation_draft_text(x->'assignmentId',36,true) or not private.creation_draft_uuid(x->'assignmentId') or not private.creation_draft_text(x->'referenceRevision',20,true)
   or x->'documentVersion'<>'null'::jsonb and (jsonb_typeof(x->'documentVersion') is distinct from 'number' or (x->>'documentVersion')!~'^[1-9][0-9]{0,9}$')
   or x->'assignmentVersion'<>'null'::jsonb and (jsonb_typeof(x->'assignmentVersion') is distinct from 'number' or (x->>'assignmentVersion')!~'^[1-9][0-9]{0,9}$') then raise exception 'invalid BAL draft context' using errcode='22023';end if;
 else raise exception 'unsupported private draft kind' using errcode='22023';end if;
end;$$;

create function private.creation_draft_view(p_draft private.creation_drafts) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('id',p_draft.id,'ownerId',p_draft.owner_id,'patientId',p_draft.care_recipient_id,'kind',p_draft.kind,
  'targetDocumentId',p_draft.target_document_id,'schemaVersion',p_draft.schema_version,'revision',p_draft.revision,'state',p_draft.state,
  'createdAt',p_draft.created_at,'savedAt',p_draft.saved_at,'contentHash',p_draft.content_hash,
  'content',case when p_draft.state='active' then p_draft.content else null end,'consumedDocumentId',p_draft.consumed_document_id);
$$;
create function public.creation_draft_context(p_patient uuid,p_kind text,p_target uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$declare d private.creation_drafts;begin
 perform private.require_creation_draft_read(p_patient,p_kind);
 select * into d from private.creation_drafts where owner_id=auth.uid() and care_recipient_id=p_patient and kind=p_kind
  and target_document_id is not distinct from p_target and state in ('active','consumed');
 return case when found then private.creation_draft_view(d) else null end;
end;$$;

create function public.creation_draft_command(p_patient uuid,p_kind text,p_target uuid,p_id uuid,p_expected integer,p_body jsonb,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d private.creation_drafts;c private.creation_draft_commands;h text;a text:=p_body->>'action';result jsonb;
begin
 perform private.require_creation_draft_read(p_patient,p_kind);
 if p_key is null or jsonb_typeof(p_body) is distinct from 'object' or a is null or a not in ('save','discard','acknowledge')
  or (p_body-array['action','content'])<>'{}'::jsonb or a<>'save' and p_body ? 'content' then raise exception 'invalid private draft command' using errcode='22023';end if;
 h:=encode(extensions.digest(jsonb_build_object('patient',p_patient,'kind',p_kind,'target',p_target,'id',p_id,'revision',p_expected,'body',p_body)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('creation-draft-key:'||auth.uid()||':'||p_key,0));
 perform private.require_creation_draft_read(p_patient,p_kind);
 select * into c from private.creation_draft_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then if c.intent_hash is distinct from h then raise exception 'private draft idempotency conflict' using errcode='23505';end if;return c.result||jsonb_build_object('replayed',true);end if;
 perform pg_advisory_xact_lock(hashtextextended('creation-draft-slot:'||auth.uid()||':'||p_patient||':'||p_kind||':'||coalesce(p_target::text,'new'),0));
 perform private.require_creation_draft_read(p_patient,p_kind);
 if a<>'acknowledge' then perform private.require_cap(p_patient,case p_kind when 'REQ' then 'req.create' else 'bal.count' end);end if;
 if p_kind='REQ' and p_target is not null or p_target is not null and not exists(select 1 from public.operational_documents where id=p_target and care_recipient_id=p_patient and type='BAL') then raise exception 'private draft target unavailable' using errcode='42501';end if;
 if p_id is null then
  if a<>'save' or p_expected is not null then raise exception 'private draft creation requires no prior revision' using errcode='22023';end if;
  if exists(select 1 from private.creation_drafts where owner_id=auth.uid() and care_recipient_id=p_patient and kind=p_kind and target_document_id is not distinct from p_target and state in ('active','consumed')) then raise exception 'stale private draft revision' using errcode='PT409';end if;
  perform private.validate_creation_draft(p_kind,p_body->'content',p_target);
  insert into private.creation_drafts(owner_id,care_recipient_id,kind,target_document_id,content,content_hash)
   values(auth.uid(),p_patient,p_kind,p_target,p_body->'content',encode(extensions.digest((p_body->'content')::text,'sha256'),'hex')) returning * into d;
 else
  select * into d from private.creation_drafts where id=p_id and owner_id=auth.uid() and care_recipient_id=p_patient and kind=p_kind and target_document_id is not distinct from p_target for update;
  if not found then raise exception 'private draft unavailable' using errcode='42501';end if;
  if p_expected is null or p_expected is distinct from d.revision or (a='acknowledge' and d.state<>'consumed') or (a<>'acknowledge' and d.state<>'active') then raise exception 'stale private draft revision' using errcode='PT409';end if;
  if a='save' then
   perform private.validate_creation_draft(p_kind,p_body->'content',p_target);
   update private.creation_drafts set content=p_body->'content',content_hash=encode(extensions.digest((p_body->'content')::text,'sha256'),'hex'),revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;
  elsif a='discard' then update private.creation_drafts set content=null,state='discarded',revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;
  else update private.creation_drafts set state='completed',revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;end if;
 end if;
 result:=jsonb_build_object('id',d.id,'revision',d.revision,'savedAt',d.saved_at,'state',d.state,'consumedDocumentId',d.consumed_document_id,'replayed',false);
 insert into private.creation_draft_commands values(auth.uid(),p_key,d.id,h,result);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'private_draft.'||a,'private_draft',d.id,jsonb_build_object('care_recipient_id',p_patient,'kind',p_kind,'revision',d.revision));
 if a='acknowledge' then perform private.require_creation_draft_read(p_patient,p_kind);
 else perform private.require_cap(p_patient,case p_kind when 'REQ' then 'req.create' else 'bal.count' end);end if;
 return result;
end;$$;

create function public.commit_creation_draft(p_id uuid,p_expected integer,p_target uuid,p_body jsonb,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d private.creation_drafts;c private.creation_draft_commands;h text;a text:=p_body->>'action';result jsonb;outcome jsonb;r record;extra jsonb;document_id uuid;
begin
 select * into d from private.creation_drafts where id=p_id and owner_id=auth.uid();
 if not found then raise exception 'private draft unavailable' using errcode='42501';end if;
 perform private.require_creation_draft_read(d.care_recipient_id,d.kind);
 if p_key is null or jsonb_typeof(p_body) is distinct from 'object' or a is null or a not in ('issue_req','create_bal','revise_bal') then raise exception 'invalid draft confirmation' using errcode='22023';end if;
 h:=encode(extensions.digest(jsonb_build_object('id',p_id,'revision',p_expected,'target',p_target,'body',p_body)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('creation-draft-key:'||auth.uid()||':'||p_key,0));
 perform private.require_creation_draft_read(d.care_recipient_id,d.kind);
 select * into c from private.creation_draft_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then if c.intent_hash is distinct from h then raise exception 'private draft idempotency conflict' using errcode='23505';end if;return c.result||jsonb_build_object('replayed',true);end if;
 perform pg_advisory_xact_lock(hashtextextended('creation-draft-slot:'||auth.uid()||':'||d.care_recipient_id||':'||d.kind||':'||coalesce(d.target_document_id::text,'new'),0));
 select * into d from private.creation_drafts where id=p_id and owner_id=auth.uid() for update;
 perform private.require_cap(d.care_recipient_id,case d.kind when 'REQ' then 'req.create' else 'bal.count' end);
 if p_target is distinct from d.target_document_id or p_expected is null or p_expected is distinct from d.revision or d.state<>'active' then raise exception 'stale private draft revision' using errcode='PT409';end if;
 if d.kind='REQ' and a='issue_req' then
  if (p_body-array['action','lines','extraItems','observations','remainingNeed'])<>'{}'::jsonb then raise exception 'invalid REQ draft confirmation' using errcode='22023';end if;
  if jsonb_typeof(p_body->'lines') is distinct from 'array' or jsonb_typeof(p_body->'extraItems') is distinct from 'array'
   or exists(select 1 from jsonb_array_elements(p_body->'lines') x where jsonb_typeof(x) is distinct from 'object' or (x-array['productId','currentStock','stockObservation','stockObservationAt','urgent','repeatReason'])<>'{}'::jsonb)
   or exists(select 1 from jsonb_array_elements(p_body->'extraItems') x where jsonb_typeof(x) is distinct from 'object' or (x-array['customName','currentStock','stockObservation','stockObservationAt','urgent'])<>'{}'::jsonb) then
   raise exception 'unsupported REQ confirmation fields' using errcode='22023';end if;
  extra:=p_body->'remainingNeed';
  if extra is null then
   select * into r from public.submit_requisition(d.care_recipient_id,p_key,null,p_body->'lines',p_body->'extraItems',p_body->'observations');
  else
   if jsonb_typeof(extra) is distinct from 'object' or (extra-array['requisitionId','version','reason'])<>'{}'::jsonb then raise exception 'invalid remaining need confirmation' using errcode='22023';end if;
   select * into r from public.submit_remaining_requisition(d.care_recipient_id,p_key,p_body->'lines',p_body->'extraItems',p_body->'observations',(extra->>'requisitionId')::uuid,(extra->>'version')::integer,extra->>'reason');
  end if;
  outcome:=to_jsonb(r);
  document_id:=r.requisition_id;
 elsif d.kind='BAL' and a='create_bal' and p_target is null then
  if (p_body-array['action','payload'])<>'{}'::jsonb then raise exception 'invalid BAL creation confirmation' using errcode='22023';end if;
  outcome:=public.create_supply_document(d.care_recipient_id,'BAL',p_body->'payload',p_key,false);
  document_id:=(outcome->>'id')::uuid;
 elsif d.kind='BAL' and a='revise_bal' and p_target is not null then
  if (p_body-array['action','payload','expectedVersion','recount','submissionKey'])<>'{}'::jsonb or jsonb_typeof(p_body->'recount') is distinct from 'boolean' then raise exception 'invalid BAL revision confirmation' using errcode='22023';end if;
  outcome:=public.revise_supply_document(p_target,p_body->'payload',p_key,(p_body->>'expectedVersion')::integer,(p_body->>'recount')::boolean);
  if not (p_body->>'recount')::boolean then outcome:=public.supply_document_command(p_target,'submit','{}',(p_body->>'submissionKey')::uuid,(outcome->>'version')::integer);end if;
  document_id:=p_target;
 else raise exception 'draft kind or target does not match confirmation' using errcode='22023';end if;
 update private.creation_drafts set consumed_document_id=document_id,state='consumed',revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;
 result:=jsonb_build_object('id',d.id,'revision',d.revision,'savedAt',d.saved_at,'state',d.state,'consumedDocumentId',d.consumed_document_id,'result',outcome,'replayed',false);
 insert into private.creation_draft_commands values(auth.uid(),p_key,d.id,h,result);
 perform private.require_cap(d.care_recipient_id,case d.kind when 'REQ' then 'req.create' else 'bal.count' end);
 return result;
end;$$;

revoke all on function private.require_creation_draft_read(uuid,text),private.creation_draft_text(jsonb,integer,boolean),
 private.creation_draft_uuid(jsonb),private.creation_draft_time(jsonb),private.validate_creation_draft(text,jsonb,uuid),private.creation_draft_view(private.creation_drafts),
 public.creation_draft_context(uuid,text,uuid),public.creation_draft_command(uuid,text,uuid,uuid,integer,jsonb,uuid),
 public.commit_creation_draft(uuid,integer,uuid,jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.creation_draft_context(uuid,text,uuid),public.creation_draft_command(uuid,text,uuid,uuid,integer,jsonb,uuid),
 public.commit_creation_draft(uuid,integer,uuid,jsonb,uuid) to authenticated;
