-- Private COM operation slots reuse the established owner/CAS/idempotency kernel.
-- No public table, direct grant, business snapshot or existing draft is rewritten.
alter table private.creation_drafts drop constraint creation_drafts_purpose_check;
alter table private.creation_drafts add constraint creation_drafts_purpose_check check(
 (kind in ('REQ','BAL') and purpose='create' and (kind='BAL' or target_document_id is null)) or
 (kind in ('COM','ENT') and ((purpose='create' and target_document_id is null) or
  (purpose='revise' and target_document_id is not null) or
  (kind='ENT' and purpose in ('receive','divergence') and target_document_id is not null))) or
 (kind='COM' and purpose in ('approve','purchase','receive') and target_document_id is not null));
create or replace function private.require_supply_draft_scope(p_patient uuid,p_kind text,p_purpose text,p_target uuid,p_write boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;cap text;begin
 if p_kind is null or p_kind not in ('COM','ENT') or p_purpose is null or p_purpose not in ('create','revise','receive','divergence','approve','purchase')
  or (p_purpose='create') is distinct from (p_target is null) or p_purpose='divergence' and p_kind<>'ENT' or p_purpose in ('approve','purchase') and p_kind<>'COM' then
  raise exception 'invalid supply draft scope' using errcode='22023';end if;
 if not public.can_access_recipient(p_patient) or not private.can(p_patient,lower(p_kind)||'.read') then raise exception 'private supply draft unavailable' using errcode='42501';end if;
 if p_target is not null then
  select * into d from public.operational_documents where id=p_target and care_recipient_id=p_patient and type::text=p_kind;
  if not found then raise exception 'private supply draft target unavailable' using errcode='42501';end if;
 end if;
 if p_write then
  cap:=case when p_kind='COM' and p_purpose in ('approve','purchase','receive') then 'com.'||p_purpose when p_purpose in ('receive','divergence') then 'ent.receive' else lower(p_kind)||'.create' end;
  perform private.require_cap(p_patient,cap);
  if p_kind='ENT' and p_purpose in ('receive','divergence') and (d.recipient_id is distinct from auth.uid() or d.status<>'pending_receipt') then
   raise exception 'personal delivery receipt unavailable' using errcode='42501';end if;
 end if;
end;$$;

create or replace function private.validate_supply_draft(p_content jsonb,p_purpose text,p_target uuid) returns void
language plpgsql security definer set search_path='' as $$
declare f jsonb;c jsonb;x jsonb;k text;v jsonb;begin
 if jsonb_typeof(p_content) is distinct from 'object' or octet_length(p_content::text)>200000 then raise exception 'invalid private supply content' using errcode='22023';end if;
 if p_purpose in ('receive','divergence','approve','purchase') then
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

create or replace function public.commit_supply_draft(p_id uuid,p_expected integer,p_target uuid,p_body jsonb,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d private.creation_drafts;c private.creation_draft_commands;h text;result jsonb;outcome jsonb;document_id uuid;command text;begin
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
  command:=case when d.purpose='divergence' then 'receive' else d.purpose end;
  if (p_body-array['action','body','expectedVersion'])<>'{}'::jsonb or p_body->>'action' is distinct from command then raise exception 'invalid private operation confirmation' using errcode='22023';end if;
  if d.kind='COM' and (p_body->>'expectedVersion')::integer is distinct from (d.content->>'documentVersion')::integer then raise exception 'private operation reference differs from confirmation' using errcode='PT409';end if;
  outcome:=public.supply_document_command(p_target,command,p_body->'body',p_key,(p_body->>'expectedVersion')::integer);document_id:=p_target;
 end if;
 if document_id is null then raise exception 'supply confirmation has no document' using errcode='XX000';end if;
 update private.creation_drafts set consumed_document_id=document_id,state='consumed',revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;
 result:=jsonb_build_object('id',d.id,'revision',d.revision,'savedAt',d.saved_at,'state',d.state,'consumedDocumentId',d.consumed_document_id,'result',outcome,'replayed',false);
 insert into private.creation_draft_commands values(auth.uid(),p_key,d.id,h,result);
 perform private.require_supply_draft_scope(d.care_recipient_id,d.kind,d.purpose,d.target_document_id);
 return result;
end;$$;

create or replace function private.creation_draft_navigation_valid(p_navigation jsonb,p_kind text,p_purpose text,p_content jsonb)
returns boolean language sql immutable set search_path='' as $$
 select case
  when p_navigation is null then true
  when jsonb_typeof(p_navigation) is distinct from 'object' then false
  when (p_navigation-array['version','stage'])<>'{}'::jsonb
    or p_navigation->'version' is distinct from '1'::jsonb
    or jsonb_typeof(p_navigation->'stage') is distinct from 'string' then false
  else case
   when p_kind='ENT' and p_purpose='receive' then p_navigation->>'stage'='receipt'
   when p_kind='ENT' and p_purpose='divergence' then p_navigation->>'stage'='divergence'
   when p_kind='COM' and p_purpose='approve' then p_navigation->>'stage'='approval'
   when p_kind='COM' and p_purpose='purchase' then p_navigation->>'stage'='acquisition'
   when p_kind='COM' and p_purpose='receive' then p_navigation->>'stage'='arrival'
   when p_purpose not in ('create','revise') then false
   when p_kind='REQ' and p_purpose='create' then p_navigation->>'stage'=any(array['identification','medicamentos','higiene','dieta','extras','notes','review'])
   when p_kind in ('COM','ENT') then p_navigation->>'stage'=any(array['identification','medicamentos','higiene','dieta','notes','review'])
   when p_kind='BAL' and p_content is null then p_navigation->>'stage'=any(array['identification','medicamentos','higiene','dieta','notes','review','count'])
   when p_kind='BAL' and p_content#>>'{context,mode}'='scheduled' then p_navigation->>'stage'=any(array['count','review'])
   when p_kind='BAL' and p_content#>>'{context,mode}'='legacy' then p_navigation->>'stage'=any(array['identification','medicamentos','higiene','dieta','notes','review'])
   else false end
 end is true;
$$;
-- CREATE OR REPLACE preserves ACLs; assert the intended boundary explicitly.
revoke all on function private.require_supply_draft_scope(uuid,text,text,uuid,boolean),private.validate_supply_draft(jsonb,text,uuid),private.creation_draft_navigation_valid(jsonb,text,text,jsonb) from public,anon,authenticated,service_role;
revoke all on function public.commit_supply_draft(uuid,integer,uuid,jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.commit_supply_draft(uuid,integer,uuid,jsonb,uuid) to authenticated;
