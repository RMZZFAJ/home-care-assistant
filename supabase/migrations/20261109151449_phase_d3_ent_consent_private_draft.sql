-- Private consent keeps raw returns and a sealed source reference; official reconciliation remains in the existing transaction.
alter table private.creation_drafts drop constraint creation_drafts_purpose_check;
alter table private.creation_drafts add constraint creation_drafts_purpose_check check(
 (kind in ('REQ','BAL') and purpose='create' and (kind='BAL' or target_document_id is null)) or
 (kind in ('COM','ENT') and ((purpose='create' and target_document_id is null) or (purpose='revise' and target_document_id is not null))) or
 (kind='COM' and purpose in ('approve','purchase','receive','validate_receipt','reject_receipt','close_expectation','cancel') and target_document_id is not null) or
 (kind='ENT' and purpose in ('receive','divergence','reassign','resolve','cancel','refuse_cancellation','withdraw_cancellation','consent_cancel') and target_document_id is not null));


create or replace function private.require_supply_draft_scope(p_patient uuid,p_kind text,p_purpose text,p_target uuid,p_write boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;cap text;begin
 if p_kind is null or p_kind not in ('COM','ENT') or p_purpose is null
  or (p_purpose='create') is distinct from (p_target is null)
  or p_kind='COM' and p_purpose not in ('create','revise','approve','purchase','receive','validate_receipt','reject_receipt','close_expectation','cancel')
  or p_kind='ENT' and p_purpose not in ('create','revise','receive','divergence','reassign','resolve','cancel','refuse_cancellation','withdraw_cancellation','consent_cancel') then
  raise exception 'invalid supply draft scope' using errcode='22023';end if;
 if not public.can_access_recipient(p_patient) or not private.can(p_patient,lower(p_kind)||'.read') then raise exception 'private supply draft unavailable' using errcode='42501';end if;
 if p_target is not null then
  select * into d from public.operational_documents where id=p_target and care_recipient_id=p_patient and type::text=p_kind;
  if not found then raise exception 'private supply draft target unavailable' using errcode='42501';end if;
 end if;
 if p_write then
  if p_kind='COM' then
   cap:=case p_purpose when 'approve' then 'com.approve' when 'purchase' then 'com.purchase' when 'receive' then 'com.receive'
    when 'validate_receipt' then 'com.validate' when 'reject_receipt' then 'com.validate' when 'close_expectation' then 'com.close_expectation' when 'cancel' then 'com.approve' else 'com.create' end;
   perform private.require_cap(p_patient,cap);
  elsif p_purpose in ('create','revise') then perform private.require_cap(p_patient,'ent.create');
  elsif p_purpose in ('receive','divergence','refuse_cancellation','consent_cancel') then
   perform private.require_cap(p_patient,'ent.receive');
   if d.recipient_id is distinct from auth.uid() then raise exception 'personal delivery decision unavailable' using errcode='42501';end if;
   if p_purpose in ('receive','divergence') and d.status<>'pending_receipt' then raise exception 'personal delivery receipt unavailable' using errcode='42501';end if;
  elsif p_purpose='reassign' then
   if d.created_by is distinct from auth.uid() and not public.can_manage_recipient(p_patient) then raise exception 'delivery reassignment authority required' using errcode='42501';end if;
  elsif p_purpose='resolve' then
   if d.recipient_id=auth.uid() then perform private.require_cap(p_patient,'ent.receive');
   else
    if not public.can_manage_recipient(p_patient) then raise exception 'delivery resolution authority required' using errcode='42501';end if;
    perform private.require_cap(p_patient,'access.manage');
   end if;
  elsif p_purpose='cancel' then
   if exists(select 1 from public.document_lines where document_id=d.id and accepted_quantity>0) then perform private.require_cap(p_patient,'ent.cancel');
   elsif d.created_by is distinct from auth.uid() and not public.can_manage_recipient(p_patient) then raise exception 'delivery cancellation authority required' using errcode='42501';end if;
  elsif p_purpose='withdraw_cancellation' then
   perform private.require_cap(p_patient,'ent.cancel');
   if private.delivery_cancellation_request(d.id)->>'requestedBy' is distinct from auth.uid()::text then raise exception 'personal cancellation requester required' using errcode='42501';end if;
  end if;
 end if;
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
   when p_kind='ENT' and p_purpose='reassign' then p_navigation->>'stage'='ent_reassignment'
   when p_kind='ENT' and p_purpose='resolve' then p_navigation->>'stage'='ent_resolution'
   when p_kind='ENT' and p_purpose='cancel' then p_navigation->>'stage'='ent_cancellation'
   when p_kind='ENT' and p_purpose='refuse_cancellation' then p_navigation->>'stage'='ent_cancellation_refusal'
   when p_kind='ENT' and p_purpose='withdraw_cancellation' then p_navigation->>'stage'='ent_cancellation_withdrawal'
   when p_kind='ENT' and p_purpose='consent_cancel' then p_navigation->>'stage'='ent_cancellation_consent'
   when p_purpose not in ('create','revise') then false
   when p_kind='REQ' and p_purpose='create' then p_navigation->>'stage'=any(array['identification','medicamentos','higiene','dieta','extras','notes','review'])
   when p_kind in ('COM','ENT') then p_navigation->>'stage'=any(array['identification','medicamentos','higiene','dieta','notes','review'])
   when p_kind='BAL' and p_content is null then p_navigation->>'stage'=any(array['identification','medicamentos','higiene','dieta','notes','review','count'])
   when p_kind='BAL' and p_content#>>'{context,mode}'='scheduled' then p_navigation->>'stage'=any(array['count','review'])
   when p_kind='BAL' and p_content#>>'{context,mode}'='legacy' then p_navigation->>'stage'=any(array['identification','medicamentos','higiene','dieta','notes','review'])
   else false end
 end is true;
$$;

create function private.require_ent_consent_draft_intent(p_content jsonb,p_body jsonb) returns void
language plpgsql set search_path='' as $$
declare item jsonb;raw text;begin
 if coalesce(p_content#>>'{fields,referenceHash}','')!~'^[0-9a-f]{64}$'
  or p_body->>'referenceHash' is distinct from p_content#>>'{fields,referenceHash}'
  or p_content#>>'{fields,requestId}' is null
  or p_body->>'requestId' is distinct from p_content#>>'{fields,requestId}'
  or jsonb_typeof(p_body->'lines') is distinct from 'array'
  or jsonb_typeof(p_content->'materials') is distinct from 'array' then
  raise exception 'private cancellation reference differs from consent' using errcode='22023';end if;
 if jsonb_array_length(p_body->'lines')<>jsonb_array_length(p_content->'materials')
  or (select count(distinct x->>'lineId') from jsonb_array_elements(p_body->'lines') x)<>jsonb_array_length(p_body->'lines') then
  raise exception 'private cancellation lines differ from consent' using errcode='22023';end if;
 for item in select * from jsonb_array_elements(p_body->'lines') loop
  raw:=p_content->'fields'->>((item->>'lineId')||':return');
  if not exists(select 1 from jsonb_array_elements(p_content->'materials') m where m->>'id'=item->>'lineId')
    or coalesce(raw,'')!~'^[0-9]+([.,][0-9]{1,6})?$'
    or coalesce(item->>'returnQuantity','')!~'^[0-9]+([.][0-9]{1,6})?$' then
   raise exception 'private actual return is incomplete or differs from consent' using errcode='22023';end if;
  if replace(raw,',','.')::numeric is distinct from (item->>'returnQuantity')::numeric then
   raise exception 'private actual return differs from consent' using errcode='22023';end if;
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
  if d.kind in ('COM','ENT') and (p_body->>'expectedVersion')::integer is distinct from (d.content->>'documentVersion')::integer then raise exception 'private operation reference differs from confirmation' using errcode='PT409';end if;
  if d.kind='COM' and d.purpose in ('validate_receipt','reject_receipt')
   and p_body#>>'{body,receiptId}' is distinct from d.content#>>'{fields,receiptId}' then
    raise exception 'private receipt selection differs from confirmation' using errcode='22023';end if;
  if d.kind='COM' and d.purpose='close_expectation'
   and (d.content#>>'{fields,confirmed}' is distinct from 'on' or p_body#>'{body,confirmed}' is distinct from 'true'::jsonb) then
    raise exception 'private closure requires its saved explicit confirmation' using errcode='22023';end if;
  if d.kind='ENT' and d.purpose='reassign' and p_body#>>'{body,recipientId}' is distinct from d.content#>>'{fields,recipientId}' then raise exception 'private recipient differs from confirmation' using errcode='22023';end if;
  if d.kind='ENT' and d.purpose='resolve' and (p_body#>>'{body,lineId}' is distinct from d.content#>>'{fields,lineId}' or p_body#>>'{body,resolution}' is distinct from d.content#>>'{fields,resolution}') then raise exception 'private resolution selection differs from confirmation' using errcode='22023';end if;
  if d.kind='ENT' and d.purpose in ('refuse_cancellation','withdraw_cancellation') and p_body#>>'{body,requestId}' is distinct from d.content#>>'{fields,requestId}' then raise exception 'private cancellation request differs from confirmation' using errcode='22023';end if;
  if d.kind='ENT' and d.purpose='consent_cancel' then perform private.require_ent_consent_draft_intent(d.content,p_body->'body');end if;
  outcome:=public.supply_document_command(p_target,command,p_body->'body',p_key,(p_body->>'expectedVersion')::integer);document_id:=p_target;
 end if;
 if document_id is null then raise exception 'supply confirmation has no document' using errcode='XX000';end if;
 update private.creation_drafts set consumed_document_id=document_id,state='consumed',revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;
 result:=jsonb_build_object('id',d.id,'revision',d.revision,'savedAt',d.saved_at,'state',d.state,'consumedDocumentId',d.consumed_document_id,'result',outcome,'replayed',false);
 insert into private.creation_draft_commands values(auth.uid(),p_key,d.id,h,result);
 perform private.require_supply_draft_scope(d.care_recipient_id,d.kind,d.purpose,d.target_document_id,d.kind='ENT' and d.purpose in ('reassign','resolve','cancel','refuse_cancellation','withdraw_cancellation','consent_cancel'));
 return result;
end;$$;

revoke all on function private.require_ent_consent_draft_intent(jsonb,jsonb),private.require_supply_draft_scope(uuid,text,text,uuid,boolean),private.creation_draft_navigation_valid(jsonb,text,text,jsonb) from public,anon,authenticated,service_role;
revoke all on function public.commit_supply_draft(uuid,integer,uuid,jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.commit_supply_draft(uuid,integer,uuid,jsonb,uuid) to authenticated;
