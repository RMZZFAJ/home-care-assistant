-- Extend private storage without changing the established REQ/BAL entrypoints.
alter table private.creation_drafts add column purpose text not null default 'create';
alter table private.creation_drafts drop constraint creation_drafts_kind_check;
alter table private.creation_drafts drop constraint creation_drafts_check;
alter table private.creation_drafts add constraint creation_drafts_kind_check check(kind in ('REQ','BAL','COM','ENT'));
alter table private.creation_drafts add constraint creation_drafts_purpose_check check(
 (kind in ('REQ','BAL') and purpose='create' and (kind='BAL' or target_document_id is null)) or
 (kind in ('COM','ENT') and ((purpose='create' and target_document_id is null) or
  (purpose='revise' and target_document_id is not null) or
  (kind='ENT' and purpose in ('receive','divergence') and target_document_id is not null))));
drop index private.creation_draft_active_slot;
create unique index creation_draft_active_slot on private.creation_drafts(owner_id,care_recipient_id,kind,coalesce(target_document_id,'00000000-0000-0000-0000-000000000000'::uuid),purpose)
 where state in ('active','consumed');

create function private.require_supply_draft_scope(p_patient uuid,p_kind text,p_purpose text,p_target uuid,p_write boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;cap text;begin
 if p_kind is null or p_kind not in ('COM','ENT') or p_purpose is null or p_purpose not in ('create','revise','receive','divergence')
  or (p_purpose='create') is distinct from (p_target is null) or p_purpose in ('receive','divergence') and p_kind<>'ENT' then
  raise exception 'invalid supply draft scope' using errcode='22023';end if;
 if not public.can_access_recipient(p_patient) or not private.can(p_patient,lower(p_kind)||'.read') then raise exception 'private supply draft unavailable' using errcode='42501';end if;
 if p_target is not null then
  select * into d from public.operational_documents where id=p_target and care_recipient_id=p_patient and type::text=p_kind;
  if not found then raise exception 'private supply draft target unavailable' using errcode='42501';end if;
 end if;
 if p_write then
  cap:=case when p_purpose in ('receive','divergence') then 'ent.receive' else lower(p_kind)||'.create' end;
  perform private.require_cap(p_patient,cap);
  if p_purpose in ('receive','divergence') and (d.recipient_id is distinct from auth.uid() or d.status<>'pending_receipt') then
   raise exception 'personal delivery receipt unavailable' using errcode='42501';end if;
 end if;
end;$$;

create function private.validate_supply_draft(p_content jsonb,p_purpose text,p_target uuid) returns void
language plpgsql security definer set search_path='' as $$
declare f jsonb;c jsonb;x jsonb;k text;v jsonb;begin
 if jsonb_typeof(p_content) is distinct from 'object' or octet_length(p_content::text)>200000 then raise exception 'invalid private supply content' using errcode='22023';end if;
 if p_purpose in ('receive','divergence') then
  if (p_content-array['documentVersion','fields','divergentIds','materials'])<>'{}'::jsonb
   or jsonb_typeof(p_content->'documentVersion') is distinct from 'number' or (p_content->>'documentVersion')!~'^[1-9][0-9]{0,9}$'
   or jsonb_typeof(p_content->'fields') is distinct from 'object' or (select count(*) from jsonb_object_keys(p_content->'fields'))>3000
   or jsonb_typeof(p_content->'divergentIds') is distinct from 'array' or jsonb_array_length(p_content->'divergentIds')>1000 then raise exception 'invalid delivery receipt draft' using errcode='22023';end if;
  for k,v in select * from jsonb_each(p_content->'fields') loop
   if length(k) not between 1 and 160 or not private.creation_draft_text(v,3000) then raise exception 'invalid receipt draft field' using errcode='22023';end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(p_content->'divergentIds') z where not private.creation_draft_uuid(z) or jsonb_typeof(z) is distinct from 'string') then raise exception 'invalid divergence line' using errcode='22023';end if;
 else
  if (p_content-array['form','links','materials','context'])<>'{}'::jsonb or jsonb_typeof(p_content->'form') is distinct from 'object' or jsonb_typeof(p_content->'links') is distinct from 'object'
   or (select count(*) from jsonb_object_keys(p_content->'links'))>1000 then raise exception 'invalid supply form draft' using errcode='22023';end if;
  f:=p_content->'form';c:=p_content->'context';
  if (f-array['quantities','notes','origin','source','recipientId','recipientReason','sharedNeedReasons','presentationSelections','manualQuantities'])<>'{}'::jsonb
   or not private.creation_draft_text(f->'notes',3000) or coalesce(f->>'origin','!') not in ('','purchase','donation')
   or coalesce(f->>'source','') not in ('FAMILY','CARE_TEAM') or not private.creation_draft_text(f->'recipientId',36)
   or f->>'recipientId'<>'' and not private.creation_draft_uuid(f->'recipientId') or not private.creation_draft_text(f->'recipientReason',1000,true)
   or jsonb_typeof(f->'quantities') is distinct from 'object' or (select count(*) from jsonb_object_keys(f->'quantities'))>1000 then raise exception 'invalid supply form fields' using errcode='22023';end if;
  for k,v in select * from jsonb_each(f->'quantities') loop
   if length(k) not between 1 and 120 or not private.creation_draft_text(v,64) then raise exception 'invalid private quantity' using errcode='22023';end if;
  end loop;
  foreach k in array array['manualQuantities','sharedNeedReasons','presentationSelections'] loop
   if f ? k and (jsonb_typeof(f->k) is distinct from 'object' or (select count(*) from jsonb_object_keys(f->k))>1000) then raise exception 'invalid private field collection' using errcode='22023';end if;
  end loop;
  for k,v in select * from jsonb_each(coalesce(f->'manualQuantities','{}'::jsonb)) loop
   if length(k) not between 1 and 120 or not private.creation_draft_text(v,64) then raise exception 'invalid manual quantity' using errcode='22023';end if;
  end loop;
  for k,v in select * from jsonb_each(coalesce(f->'sharedNeedReasons','{}'::jsonb)) loop
   if length(k) not between 1 and 120 or not private.creation_draft_text(v,1000) then raise exception 'invalid private shared need reason' using errcode='22023';end if;
  end loop;
  for k,v in select * from jsonb_each(p_content->'links') loop
   if length(k) not between 1 and 120 or jsonb_typeof(v) is distinct from 'array' or jsonb_array_length(v)>1000
    or exists(select 1 from jsonb_array_elements(v) z where jsonb_typeof(z) is distinct from 'string' or not private.creation_draft_uuid(z)) then raise exception 'invalid private requisition links' using errcode='22023';end if;
  end loop;
  for k,v in select * from jsonb_each(coalesce(f->'presentationSelections','{}'::jsonb)) loop
   if length(k) not between 1 and 120 or jsonb_typeof(v) is distinct from 'array' or jsonb_array_length(v)>100 then raise exception 'invalid presentation selection' using errcode='22023';end if;
   for x in select value from jsonb_array_elements(v) loop
    if jsonb_typeof(x) is distinct from 'object' or (x-array['id','version','packages','barcode','name','baseQuantity','unit'])<>'{}'::jsonb
     or not private.creation_draft_uuid(x->'id') or jsonb_typeof(x->'id') is distinct from 'string' or jsonb_typeof(x->'version') is distinct from 'number' or (x->>'version')!~'^[1-9][0-9]{0,9}$'
     or not private.creation_draft_text(x->'packages',64) or not private.creation_draft_text(x->'barcode',64)
     or not private.creation_draft_text(x->'name',200) or not private.creation_draft_text(x->'baseQuantity',64) or not private.creation_draft_text(x->'unit',80) then raise exception 'invalid private presentation reference' using errcode='22023';end if;
   end loop;
  end loop;
  if jsonb_typeof(c) is distinct from 'object' or (c-array['documentId','documentVersion','requisitionId','recipientName'])<>'{}'::jsonb or not private.creation_draft_text(c->'recipientName',200)
   or not (c ?& array['documentId','documentVersion','requisitionId']) or not private.creation_draft_uuid(c->'documentId') or (c->>'documentId')::uuid is distinct from p_target
   or not private.creation_draft_uuid(c->'requisitionId') or c->'documentVersion'<>'null'::jsonb and (jsonb_typeof(c->'documentVersion') is distinct from 'number' or (c->>'documentVersion')!~'^[1-9][0-9]{0,9}$') then raise exception 'invalid supply draft context' using errcode='22023';end if;
 end if;
 if jsonb_typeof(p_content->'materials') is distinct from 'array' or jsonb_array_length(p_content->'materials')>1000 then raise exception 'invalid private material references' using errcode='22023';end if;
 for x in select value from jsonb_array_elements(p_content->'materials') loop
  if jsonb_typeof(x) is distinct from 'object' or (x-array['id','name','unit','quantityDecimals'])<>'{}'::jsonb or not private.creation_draft_text(x->'id',120)
   or not private.creation_draft_text(x->'name',200) or not private.creation_draft_text(x->'unit',80) or jsonb_typeof(x->'quantityDecimals') is distinct from 'number' or (x->>'quantityDecimals')!~'^[0-6]$' then raise exception 'invalid private material snapshot' using errcode='22023';end if;
 end loop;
end;$$;

create function public.supply_draft_context(p_patient uuid,p_kind text,p_purpose text,p_target uuid) returns jsonb
language plpgsql security definer set search_path='' as $$declare d private.creation_drafts;begin
 perform private.require_supply_draft_scope(p_patient,p_kind,p_purpose,p_target);
 select * into d from private.creation_drafts where owner_id=auth.uid() and care_recipient_id=p_patient and kind=p_kind and purpose=p_purpose
  and target_document_id is not distinct from p_target and state in ('active','consumed');
 return case when found then private.creation_draft_view(d)||jsonb_build_object('purpose',d.purpose) else null end;
end;$$;

create function public.supply_draft_command(p_patient uuid,p_kind text,p_purpose text,p_target uuid,p_id uuid,p_expected integer,p_body jsonb,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d private.creation_drafts;c private.creation_draft_commands;h text;a text:=p_body->>'action';result jsonb;begin
 perform private.require_supply_draft_scope(p_patient,p_kind,p_purpose,p_target);
 if p_key is null or jsonb_typeof(p_body) is distinct from 'object' or a is null or a not in ('save','discard','acknowledge')
  or (p_body-array['action','content'])<>'{}'::jsonb or a<>'save' and p_body ? 'content' then raise exception 'invalid supply draft command' using errcode='22023';end if;
 h:=encode(extensions.digest(jsonb_build_array('supply-draft',p_patient,p_kind,p_purpose,p_target,p_id,p_expected,p_body)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('creation-draft-key:'||auth.uid()||':'||p_key,0));
 perform private.require_supply_draft_scope(p_patient,p_kind,p_purpose,p_target);
 select * into c from private.creation_draft_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then if c.intent_hash is distinct from h then raise exception 'private draft idempotency conflict' using errcode='23505';end if;return c.result||jsonb_build_object('replayed',true);end if;
 perform pg_advisory_xact_lock(hashtextextended('supply-draft-slot:'||auth.uid()||':'||p_patient||':'||p_kind||':'||p_purpose||':'||coalesce(p_target::text,'new'),0));
 perform private.require_supply_draft_scope(p_patient,p_kind,p_purpose,p_target,a<>'acknowledge');
 if p_id is null then
  if a<>'save' or p_expected is not null then raise exception 'private draft creation requires no prior revision' using errcode='22023';end if;
  if exists(select 1 from private.creation_drafts where owner_id=auth.uid() and care_recipient_id=p_patient and kind=p_kind and purpose=p_purpose and target_document_id is not distinct from p_target and state in ('active','consumed')) then raise exception 'stale private draft revision' using errcode='PT409';end if;
  perform private.validate_supply_draft(p_body->'content',p_purpose,p_target);
  insert into private.creation_drafts(owner_id,care_recipient_id,kind,purpose,target_document_id,content,content_hash)
   values(auth.uid(),p_patient,p_kind,p_purpose,p_target,p_body->'content',encode(extensions.digest((p_body->'content')::text,'sha256'),'hex')) returning * into d;
 else
  select * into d from private.creation_drafts where id=p_id and owner_id=auth.uid() and care_recipient_id=p_patient and kind=p_kind and purpose=p_purpose and target_document_id is not distinct from p_target for update;
  if not found then raise exception 'private draft unavailable' using errcode='42501';end if;
  if p_expected is null or p_expected is distinct from d.revision or (a='acknowledge' and d.state<>'consumed') or (a<>'acknowledge' and d.state<>'active') then raise exception 'stale private draft revision' using errcode='PT409';end if;
  if a='save' then
   perform private.validate_supply_draft(p_body->'content',p_purpose,p_target);
   update private.creation_drafts set content=p_body->'content',content_hash=encode(extensions.digest((p_body->'content')::text,'sha256'),'hex'),revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;
  elsif a='discard' then update private.creation_drafts set content=null,state='discarded',revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;
  else update private.creation_drafts set state='completed',revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;end if;
 end if;
 result:=jsonb_build_object('id',d.id,'revision',d.revision,'savedAt',d.saved_at,'state',d.state,'consumedDocumentId',d.consumed_document_id,'replayed',false);
 insert into private.creation_draft_commands values(auth.uid(),p_key,d.id,h,result);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'private_draft.'||a,'private_draft',d.id,jsonb_build_object('care_recipient_id',p_patient,'kind',p_kind,'purpose',p_purpose,'revision',d.revision));
 perform private.require_supply_draft_scope(p_patient,p_kind,p_purpose,p_target,a<>'acknowledge');
 return result;
end;$$;

-- Both stages share one transaction, including calls from older clients.
create function public.revise_and_submit_supply_document(p_id uuid,p_payload jsonb,p_key uuid,p_version integer,p_recount boolean,p_submit boolean,p_submission_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$declare result jsonb;previous private.phase_d3_commands;h text;begin
 if p_key is null or p_submission_key is null or p_submit is null or p_recount is null then raise exception 'invalid supply revision intention' using errcode='22023';end if;
 perform public.operational_document(p_id);
 h:=encode(extensions.digest(jsonb_build_array('atomic-supply-revision',p_id,p_payload,p_version,p_recount,p_submit,p_submission_key)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('atomic-supply-revision:'||auth.uid()||':'||p_key,0));
 perform public.operational_document(p_id);
 select * into previous from private.phase_d3_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then if previous.intent_hash is distinct from h then raise exception 'supply revision idempotency conflict' using errcode='23505';end if;return previous.result;end if;
 result:=public.revise_supply_document(p_id,p_payload,p_key,p_version,p_recount);
 if p_submit and not p_recount then result:=public.supply_document_command(p_id,'submit','{}'::jsonb,p_submission_key,(result->>'version')::integer);end if;
 perform public.operational_document(p_id);
 insert into private.phase_d3_commands values(auth.uid(),p_key,h,result);
 return result;
end;$$;

create function public.commit_supply_draft(p_id uuid,p_expected integer,p_target uuid,p_body jsonb,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d private.creation_drafts;c private.creation_draft_commands;h text;result jsonb;outcome jsonb;document_id uuid;begin
 select * into d from private.creation_drafts where id=p_id and owner_id=auth.uid();
 if not found then raise exception 'private supply draft unavailable' using errcode='42501';end if;
 perform private.require_supply_draft_scope(d.care_recipient_id,d.kind,d.purpose,d.target_document_id);
 if p_key is null or jsonb_typeof(p_body) is distinct from 'object' then raise exception 'invalid supply draft confirmation' using errcode='22023';end if;
 h:=encode(extensions.digest(jsonb_build_array('commit-supply-draft',p_id,p_expected,p_target,p_body)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('creation-draft-key:'||auth.uid()||':'||p_key,0));
 perform private.require_supply_draft_scope(d.care_recipient_id,d.kind,d.purpose,d.target_document_id);
 select * into c from private.creation_draft_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then if c.intent_hash is distinct from h then raise exception 'private draft idempotency conflict' using errcode='23505';end if;return c.result||jsonb_build_object('replayed',true);end if;
 perform pg_advisory_xact_lock(hashtextextended('supply-draft-slot:'||auth.uid()||':'||d.care_recipient_id||':'||d.kind||':'||d.purpose||':'||coalesce(d.target_document_id::text,'new'),0));
 select * into d from private.creation_drafts where id=p_id and owner_id=auth.uid() for update;
 perform private.require_supply_draft_scope(d.care_recipient_id,d.kind,d.purpose,d.target_document_id,true);
 if p_target is distinct from d.target_document_id or p_expected is null or p_expected is distinct from d.revision or d.state<>'active' then raise exception 'stale private draft revision' using errcode='PT409';end if;
 if d.purpose='create' then
  if (p_body-array['action','payload'])<>'{}'::jsonb or p_body->>'action' is distinct from 'create' then raise exception 'invalid supply creation confirmation' using errcode='22023';end if;
  outcome:=public.create_supply_document(d.care_recipient_id,d.kind,p_body->'payload',p_key,false);document_id:=(outcome->>'id')::uuid;
 elsif d.purpose='revise' then
  if (p_body-array['action','payload','expectedVersion','submissionKey'])<>'{}'::jsonb or p_body->>'action' is distinct from 'revise' then raise exception 'invalid supply revision confirmation' using errcode='22023';end if;
  outcome:=public.revise_and_submit_supply_document(p_target,p_body->'payload',p_key,(p_body->>'expectedVersion')::integer,false,true,(p_body->>'submissionKey')::uuid);document_id:=p_target;
 else
  if (p_body-array['action','body','expectedVersion'])<>'{}'::jsonb or p_body->>'action' is distinct from 'receive' then raise exception 'invalid personal receipt confirmation' using errcode='22023';end if;
  outcome:=public.supply_document_command(p_target,'receive',p_body->'body',p_key,(p_body->>'expectedVersion')::integer);document_id:=p_target;
 end if;
 if document_id is null then raise exception 'supply confirmation has no document' using errcode='XX000';end if;
 update private.creation_drafts set consumed_document_id=document_id,state='consumed',revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;
 result:=jsonb_build_object('id',d.id,'revision',d.revision,'savedAt',d.saved_at,'state',d.state,'consumedDocumentId',d.consumed_document_id,'result',outcome,'replayed',false);
 insert into private.creation_draft_commands values(auth.uid(),p_key,d.id,h,result);
 perform private.require_supply_draft_scope(d.care_recipient_id,d.kind,d.purpose,d.target_document_id);
 return result;
end;$$;

revoke all on function private.require_supply_draft_scope(uuid,text,text,uuid,boolean),private.validate_supply_draft(jsonb,text,uuid),
 public.supply_draft_context(uuid,text,text,uuid),public.supply_draft_command(uuid,text,text,uuid,uuid,integer,jsonb,uuid),
 public.commit_supply_draft(uuid,integer,uuid,jsonb,uuid),public.revise_and_submit_supply_document(uuid,jsonb,uuid,integer,boolean,boolean,uuid) from public,anon,authenticated,service_role;
grant execute on function public.supply_draft_context(uuid,text,text,uuid),public.supply_draft_command(uuid,text,text,uuid,uuid,integer,jsonb,uuid),
 public.commit_supply_draft(uuid,integer,uuid,jsonb,uuid),public.revise_and_submit_supply_document(uuid,jsonb,uuid,integer,boolean,boolean,uuid) to authenticated;
