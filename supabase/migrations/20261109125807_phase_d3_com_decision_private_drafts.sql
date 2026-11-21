-- Complete COM decision slots in the established private kernel.
-- The existing commit RPC already binds the literal action, private revision and document version.
-- No business rows, existing private rows, public RPC signature or direct grant changes.
alter table private.creation_drafts drop constraint creation_drafts_purpose_check;
alter table private.creation_drafts add constraint creation_drafts_purpose_check check(
 (kind in ('REQ','BAL') and purpose='create' and (kind='BAL' or target_document_id is null)) or
 (kind in ('COM','ENT') and ((purpose='create' and target_document_id is null) or
  (purpose='revise' and target_document_id is not null) or
  (kind='ENT' and purpose in ('receive','divergence') and target_document_id is not null))) or
 (kind='COM' and purpose in ('approve','purchase','receive','validate_receipt','reject_receipt','close_expectation','cancel') and target_document_id is not null));
create or replace function private.require_supply_draft_scope(p_patient uuid,p_kind text,p_purpose text,p_target uuid,p_write boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;cap text;begin
 if p_kind is null or p_kind not in ('COM','ENT') or p_purpose is null or p_purpose not in ('create','revise','receive','divergence','approve','purchase','validate_receipt','reject_receipt','close_expectation','cancel')
  or (p_purpose='create') is distinct from (p_target is null) or p_purpose='divergence' and p_kind<>'ENT' or p_purpose in ('approve','purchase','validate_receipt','reject_receipt','close_expectation','cancel') and p_kind<>'COM' then
  raise exception 'invalid supply draft scope' using errcode='22023';end if;
 if not public.can_access_recipient(p_patient) or not private.can(p_patient,lower(p_kind)||'.read') then raise exception 'private supply draft unavailable' using errcode='42501';end if;
 if p_target is not null then
  select * into d from public.operational_documents where id=p_target and care_recipient_id=p_patient and type::text=p_kind;
  if not found then raise exception 'private supply draft target unavailable' using errcode='42501';end if;
 end if;
 if p_write then
  cap:=case when p_kind='COM' then case p_purpose
   when 'approve' then 'com.approve' when 'purchase' then 'com.purchase' when 'receive' then 'com.receive'
   when 'validate_receipt' then 'com.validate' when 'reject_receipt' then 'com.validate'
   when 'close_expectation' then 'com.close_expectation' when 'cancel' then 'com.approve' else 'com.create' end
  when p_purpose in ('receive','divergence') then 'ent.receive' else lower(p_kind)||'.create' end;
  perform private.require_cap(p_patient,cap);
  if p_kind='ENT' and p_purpose in ('receive','divergence') and (d.recipient_id is distinct from auth.uid() or d.status<>'pending_receipt') then
   raise exception 'personal delivery receipt unavailable' using errcode='42501';end if;
 end if;
end;$$;

create or replace function private.validate_supply_draft(p_content jsonb,p_purpose text,p_target uuid) returns void
language plpgsql security definer set search_path='' as $$
declare f jsonb;c jsonb;x jsonb;k text;v jsonb;begin
 if jsonb_typeof(p_content) is distinct from 'object' or octet_length(p_content::text)>200000 then raise exception 'invalid private supply content' using errcode='22023';end if;
 if p_purpose not in ('create','revise') then
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
   when p_kind='COM' and p_purpose='validate_receipt' then p_navigation->>'stage'='receipt_validation'
   when p_kind='COM' and p_purpose='reject_receipt' then p_navigation->>'stage'='receipt_rejection'
   when p_kind='COM' and p_purpose='close_expectation' then p_navigation->>'stage'='expectation_closure'
   when p_kind='COM' and p_purpose='cancel' then p_navigation->>'stage'='com_cancellation'
   when p_purpose not in ('create','revise') then false
   when p_kind='REQ' and p_purpose='create' then p_navigation->>'stage'=any(array['identification','medicamentos','higiene','dieta','extras','notes','review'])
   when p_kind in ('COM','ENT') then p_navigation->>'stage'=any(array['identification','medicamentos','higiene','dieta','notes','review'])
   when p_kind='BAL' and p_content is null then p_navigation->>'stage'=any(array['identification','medicamentos','higiene','dieta','notes','review','count'])
   when p_kind='BAL' and p_content#>>'{context,mode}'='scheduled' then p_navigation->>'stage'=any(array['count','review'])
   when p_kind='BAL' and p_content#>>'{context,mode}'='legacy' then p_navigation->>'stage'=any(array['identification','medicamentos','higiene','dieta','notes','review'])
   else false end
 end is true;
$$;
revoke all on function private.require_supply_draft_scope(uuid,text,text,uuid,boolean),private.validate_supply_draft(jsonb,text,uuid),private.creation_draft_navigation_valid(jsonb,text,text,jsonb) from public,anon,authenticated,service_role;
