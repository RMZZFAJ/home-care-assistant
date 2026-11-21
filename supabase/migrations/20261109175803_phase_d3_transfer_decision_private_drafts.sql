-- Personal transfer decisions preserve the separate declaration,agreement,dispatch and receipt facts.

alter table private.creation_drafts drop constraint creation_drafts_purpose_check;
alter table private.creation_drafts add constraint creation_drafts_purpose_check check(
 (kind in ('REQ','BAL') and purpose='create' and (kind='BAL' or target_document_id is null)) or
 (kind in ('COM','ENT') and ((purpose='create' and target_document_id is null) or (purpose='revise' and target_document_id is not null))) or
 (kind='COM' and purpose in ('approve','purchase','receive','validate_receipt','reject_receipt','close_expectation','cancel') and target_document_id is not null) or
 (kind='ENT' and purpose in ('receive','divergence','reassign','resolve','cancel','refuse_cancellation','withdraw_cancellation','consent_cancel','propose_regularization','approve_regularization','reject_regularization','withdraw_regularization','record_regularization_finding','transfer_agree','transfer_decline','transfer_withdraw','transfer_dispatch') and target_document_id is not null));

create function private.require_transfer_draft_authority(p_target uuid,p_purpose text,p_state boolean) returns void
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;t public.ent_transfers;source text;begin
 select * into d from public.operational_documents where id=p_target and type='ENT';
 select * into t from public.ent_transfers where document_id=p_target;
 if d.id is null or t.document_id is null or p_purpose is null or p_purpose not in ('transfer_agree','transfer_decline','transfer_withdraw','transfer_dispatch') then raise exception 'private transfer target unavailable' using errcode='42501';end if;
 perform private.require_cap(d.care_recipient_id,'ent.read');
 if not exists(select 1 from public.care_recipients where id=d.care_recipient_id and is_active) then raise exception 'inactive transfer patient' using errcode='42501';end if;
 source:=d.payload->>'source';
 if p_purpose in ('transfer_agree','transfer_decline') then
  if auth.uid() is distinct from t.counterparty_id or not private.transfer_party_eligible(d.care_recipient_id,auth.uid(),source) then raise exception 'personal transfer counterparty required' using errcode='42501';end if;
  if p_purpose='transfer_agree' and (not private.member_can(d.care_recipient_id,t.initiator_id,'ent.create') or not private.transfer_party_eligible(d.care_recipient_id,t.original_recipient_id,source)) then raise exception 'transfer party authority changed' using errcode='42501';end if;
 elsif p_purpose='transfer_withdraw' then
  if auth.uid() is distinct from t.initiator_id and not(public.can_manage_recipient(d.care_recipient_id) and private.can(d.care_recipient_id,'access.manage')) then raise exception 'personal transfer withdrawal unavailable' using errcode='42501';end if;
 else
  if auth.uid() is distinct from t.initiator_id then raise exception 'personal transfer initiator required' using errcode='42501';end if;
  perform private.require_cap(d.care_recipient_id,'ent.create');
  perform private.require_cap(d.care_recipient_id,case when source='FAMILY' then 'stock.family.read' else 'stock.team.read' end);
  if not private.transfer_party_eligible(d.care_recipient_id,t.counterparty_id,source) or not private.transfer_party_eligible(d.care_recipient_id,t.original_recipient_id,source) then raise exception 'transfer party authority changed' using errcode='42501';end if;
 end if;
 if p_state and (private.transfer_facts(p_target)->>(case p_purpose when 'transfer_dispatch' then 'canDispatch' when 'transfer_withdraw' then 'canWithdraw' else 'canAgree' end))::boolean is not true then raise exception 'private transfer act unavailable' using errcode='42501';end if;
end;$$;
revoke all on function private.require_transfer_draft_authority(uuid,text,boolean) from public,anon,authenticated,service_role;

create or replace function private.require_supply_draft_scope(p_patient uuid,p_kind text,p_purpose text,p_target uuid,p_write boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;cap text;begin
 if p_kind is null or p_kind not in ('COM','ENT') or p_purpose is null
  or (p_purpose='create') is distinct from (p_target is null)
  or p_kind='COM' and p_purpose not in ('create','revise','approve','purchase','receive','validate_receipt','reject_receipt','close_expectation','cancel')
  or p_kind='ENT' and p_purpose not in ('create','revise','receive','divergence','reassign','resolve','cancel','refuse_cancellation','withdraw_cancellation','consent_cancel','propose_regularization','approve_regularization','reject_regularization','withdraw_regularization','record_regularization_finding','transfer_agree','transfer_decline','transfer_withdraw','transfer_dispatch') then
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
  elsif p_purpose in ('transfer_agree','transfer_decline','transfer_withdraw','transfer_dispatch') then
   perform private.require_transfer_draft_authority(d.id,p_purpose,true);
  elsif p_purpose in ('propose_regularization','approve_regularization','reject_regularization','withdraw_regularization','record_regularization_finding') then
   if p_purpose='record_regularization_finding' then
    perform private.require_cap(p_patient,'ent.follow_up');
    if not private.regularization_follow_up_eligible(p_patient,auth.uid()) then raise exception 'personal regularization follow-up authority required' using errcode='42501';end if;
   else perform private.require_regularization_authority(p_patient);end if;
   if (private.delivery_regularization_context(d.id)->>(case p_purpose
    when 'propose_regularization' then 'canPropose' when 'approve_regularization' then 'canApprove'
    when 'reject_regularization' then 'canReview' when 'withdraw_regularization' then 'canClose'
    else 'canRecordFinding' end))::boolean is not true then
    raise exception 'personal regularization preparation unavailable' using errcode='42501';end if;
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
   when p_kind='ENT' and p_purpose='propose_regularization' then p_navigation->>'stage'='ent_regularization_proposal'
   when p_kind='ENT' and p_purpose='approve_regularization' then p_navigation->>'stage'='ent_regularization_approval'
   when p_kind='ENT' and p_purpose='reject_regularization' then p_navigation->>'stage'='ent_regularization_rejection'
   when p_kind='ENT' and p_purpose='withdraw_regularization' then p_navigation->>'stage'='ent_regularization_withdrawal'
   when p_kind='ENT' and p_purpose='record_regularization_finding' then p_navigation->>'stage'='ent_regularization_finding'
   when p_kind='ENT' and p_purpose in ('transfer_agree','transfer_decline','transfer_withdraw','transfer_dispatch') then p_navigation->>'stage'='ent_'||p_purpose
   when p_purpose not in ('create','revise') then false
   when p_kind='REQ' and p_purpose='create' then p_navigation->>'stage'=any(array['identification','medicamentos','higiene','dieta','extras','notes','review'])
   when p_kind in ('COM','ENT') then p_navigation->>'stage'=any(array['identification','medicamentos','higiene','dieta','notes','review'])
   when p_kind='BAL' and p_content is null then p_navigation->>'stage'=any(array['identification','medicamentos','higiene','dieta','notes','review','count'])
   when p_kind='BAL' and p_content#>>'{context,mode}'='scheduled' then p_navigation->>'stage'=any(array['count','review'])
   when p_kind='BAL' and p_content#>>'{context,mode}'='legacy' then p_navigation->>'stage'=any(array['identification','medicamentos','higiene','dieta','notes','review'])
   else false end
 end is true;
$$;

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
  command:=case when d.kind='ENT' and d.purpose in ('transfer_agree','transfer_decline','transfer_withdraw','transfer_dispatch') then substr(d.purpose,10) when d.purpose='divergence' then 'receive' when d.purpose in ('approve_regularization','reject_regularization') then 'review_regularization' else d.purpose end;
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
  if d.kind='ENT' and d.purpose in ('propose_regularization','approve_regularization','reject_regularization','withdraw_regularization','record_regularization_finding') then perform private.require_regularization_draft_intent(d.purpose,d.content,p_body->'body');end if;
  if d.kind='ENT' and d.purpose in ('transfer_agree','transfer_decline','transfer_withdraw','transfer_dispatch') then
   if d.content->'divergentIds'<>'[]'::jsonb then raise exception 'transfer decision cannot declare receipt divergences' using errcode='22023';end if;
   if command='dispatch' then
    if p_body->'body' is distinct from '{}'::jsonb or coalesce(d.content#>>'{fields,reason}','')<>'' then raise exception 'private dispatch has no decision reason or receipt' using errcode='22023';end if;
   elsif p_body#>>'{body,reason}' is distinct from btrim(d.content#>>'{fields,reason}',U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF') then
    raise exception 'private transfer decision differs from confirmation' using errcode='22023';end if;
   outcome:=public.transfer_command(p_target,command,p_body->'body',p_key,(p_body->>'expectedVersion')::integer);
  else outcome:=public.supply_document_command(p_target,command,p_body->'body',p_key,(p_body->>'expectedVersion')::integer);end if;
  document_id:=p_target;
 end if;
 if document_id is null then raise exception 'supply confirmation has no document' using errcode='XX000';end if;
 update private.creation_drafts set consumed_document_id=document_id,state='consumed',revision=revision+1,saved_at=clock_timestamp() where id=d.id returning * into d;
 result:=jsonb_build_object('id',d.id,'revision',d.revision,'savedAt',d.saved_at,'state',d.state,'consumedDocumentId',d.consumed_document_id,'result',outcome,'replayed',false);
 insert into private.creation_draft_commands values(auth.uid(),p_key,d.id,h,result);
 perform private.require_supply_draft_scope(d.care_recipient_id,d.kind,d.purpose,d.target_document_id,d.kind='ENT' and d.purpose in ('reassign','resolve','cancel','refuse_cancellation','withdraw_cancellation','consent_cancel'));
 if d.kind='ENT' and d.purpose in ('propose_regularization','approve_regularization','reject_regularization','withdraw_regularization','record_regularization_finding') then
  if d.purpose='record_regularization_finding' then
   perform private.require_cap(d.care_recipient_id,'ent.follow_up');
   if not private.regularization_follow_up_eligible(d.care_recipient_id,auth.uid()) then raise exception 'personal regularization follow-up authority required' using errcode='42501';end if;
  else perform private.require_regularization_authority(d.care_recipient_id);end if;
 end if;
 if d.kind='ENT' and d.purpose in ('transfer_agree','transfer_decline','transfer_withdraw','transfer_dispatch') then perform private.require_transfer_draft_authority(d.target_document_id,d.purpose,false);end if;
 return result;
end;$$;

revoke all on function private.require_supply_draft_scope(uuid,text,text,uuid,boolean),private.creation_draft_navigation_valid(jsonb,text,text,jsonb) from public,anon,authenticated,service_role;
revoke all on function public.commit_supply_draft(uuid,integer,uuid,jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.commit_supply_draft(uuid,integer,uuid,jsonb,uuid) to authenticated;
