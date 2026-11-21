-- Private preparations for BAL document reviews and recount designation.
begin;

alter table private.creation_drafts drop constraint creation_drafts_purpose_check;
alter table private.creation_drafts add constraint creation_drafts_purpose_check check ((((kind = ANY (ARRAY['REQ'::text, 'BAL'::text])) AND (purpose = 'create'::text) AND ((kind = 'BAL'::text) OR (target_document_id IS NULL))) OR ((kind = ANY (ARRAY['COM'::text, 'ENT'::text])) AND (((purpose = 'create'::text) AND (target_document_id IS NULL)) OR ((purpose = 'revise'::text) AND (target_document_id IS NOT NULL)))) OR ((kind = 'ENT'::text) AND (purpose = ANY (ARRAY['transfer_declare_family'::text, 'transfer_declare_team'::text])) AND (target_document_id IS NULL)) OR ((kind = 'COM'::text) AND (purpose = ANY (ARRAY['approve'::text, 'purchase'::text, 'receive'::text, 'validate_receipt'::text, 'reject_receipt'::text, 'close_expectation'::text, 'cancel'::text])) AND (target_document_id IS NOT NULL)) OR ((kind = 'ENT'::text) AND (purpose = ANY (ARRAY['receive'::text, 'divergence'::text, 'reassign'::text, 'resolve'::text, 'cancel'::text, 'refuse_cancellation'::text, 'withdraw_cancellation'::text, 'consent_cancel'::text, 'propose_regularization'::text, 'approve_regularization'::text, 'reject_regularization'::text, 'withdraw_regularization'::text, 'record_regularization_finding'::text, 'transfer_agree'::text, 'transfer_decline'::text, 'transfer_withdraw'::text, 'transfer_dispatch'::text])) AND (target_document_id IS NOT NULL)) OR ((kind = 'REQ'::text) AND (purpose = ANY (ARRAY['archive'::text, 'cancel'::text, 'resolve_extra'::text])) AND (target_document_id IS NOT NULL))) or (kind='BAL' and purpose in ('review_family','review_supervisor','assign_recount') and target_document_id is not null));

create function private.require_bal_document_draft_authority(p_patient uuid,p_purpose text) returns void
language plpgsql security definer set search_path='' as $$declare g text;begin
 if p_purpose in ('review_family','review_supervisor') then
  g:=substr(p_purpose,8);
  perform private.require_cap(p_patient,'bal.approve.'||g);
  if not private.bal_review_authorized(p_patient,g) then raise exception 'balance reviewer authority required' using errcode='42501';end if;
 elsif p_purpose='assign_recount' then
  if not coalesce(private.bal_review_authorized(p_patient,'family') or private.bal_review_authorized(p_patient,'supervisor'),false) then raise exception 'balance recount authority required' using errcode='42501';end if;
 else raise exception 'invalid balance document purpose' using errcode='22023';end if;
 if not exists(select 1 from public.care_recipients where id=p_patient and is_active) then raise exception 'active balance patient required' using errcode='42501';end if;
end;$$;
revoke all on function private.require_bal_document_draft_authority(uuid,text) from public,anon,authenticated,service_role;

create function private.bal_document_draft_reference(p_id uuid,p_purpose text) returns text
language plpgsql stable security definer set search_path='' as $$begin
 if p_purpose in ('review_family','review_supervisor') then return private.bal_review_context(p_id)->>'referenceHash';
 elsif p_purpose='assign_recount' then return private.bal_recount_context(p_id)->>'referenceHash';
 else raise exception 'invalid balance document reference' using errcode='22023';end if;
end;$$;
revoke all on function private.bal_document_draft_reference(uuid,text) from public,anon,authenticated,service_role;

create function private.require_bal_document_draft_intent(p_id uuid,p_purpose text,p_content jsonb,p_body jsonb) returns void
language plpgsql security definer set search_path='' as $$declare f jsonb:=p_content->'fields';expected jsonb;trim_chars text:=U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF';begin
 if p_content->'materials' is distinct from '[]'::jsonb or p_content->'divergentIds' is distinct from '[]'::jsonb
  or coalesce(f->>'referenceHash','')!~'^[0-9a-f]{64}$' then raise exception 'invalid balance document draft content' using errcode='22023';end if;
 if p_purpose in ('review_family','review_supervisor') then
  if (f-array['comment','referenceHash'])<>'{}'::jsonb then raise exception 'invalid private balance review fields' using errcode='22023';end if;
  expected:=jsonb_build_object('group',substr(p_purpose,8),'comment',coalesce(f->>'comment',''),'reviewReference',f->>'referenceHash');
 elsif p_purpose='assign_recount' then
  if (f-array['reason','referenceHash','targetShiftId','targetShiftVersion','targetLabel','query'])<>'{}'::jsonb
   or coalesce(f->>'targetShiftVersion','')!~'^[1-9][0-9]{0,9}$' or (f->>'targetShiftVersion')::numeric>2147483647 then raise exception 'invalid private recount target' using errcode='22023';end if;
  expected:=jsonb_build_object('documentId',p_id,'targetShiftId',f->>'targetShiftId','targetShiftVersion',(f->>'targetShiftVersion')::integer,'referenceHash',f->>'referenceHash','reason',btrim(f->>'reason',trim_chars));
 else raise exception 'invalid balance document intent' using errcode='22023';end if;
 if p_body is distinct from expected then raise exception 'balance document intent differs from private revision' using errcode='22023';end if;
end;$$;
revoke all on function private.require_bal_document_draft_intent(uuid,text,jsonb,jsonb) from public,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION private.require_supply_draft_scope(p_patient uuid, p_kind text, p_purpose text, p_target uuid, p_write boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d public.operational_documents;cap text;begin
 if p_kind='BAL' then
  if p_purpose is null or p_purpose not in ('review_family','review_supervisor','assign_recount') or p_target is null then raise exception 'invalid balance document draft scope' using errcode='22023';end if;
  select * into d from public.operational_documents where id=p_target and care_recipient_id=p_patient and type='BAL';
  if not found or not public.can_access_recipient(p_patient) or not private.can(p_patient,'bal.read') then raise exception 'private balance document draft unavailable' using errcode='42501';end if;
  if p_write then
   perform private.require_bal_document_draft_authority(p_patient,p_purpose);
   if p_purpose='assign_recount' then
    if not coalesce((private.bal_recount_context(p_target)->>'canAssign')::boolean,false) then raise exception 'balance recount no longer available' using errcode='PT409';end if;
   elsif not (private.bal_review_context(p_target)->'eligibleGroups' ? substr(p_purpose,8))
    or d.status='submitted' and private.bal_review_context(p_target)->>'referenceState'<>'current' then raise exception 'balance review no longer available' using errcode='PT409';end if;
  end if;
  return;
 end if;
 if p_kind='REQ' then
  if p_purpose is null or p_purpose not in ('archive','cancel','resolve_extra') or p_target is null then raise exception 'invalid requisition draft scope' using errcode='22023';end if;
  select * into d from public.operational_documents where id=p_target and care_recipient_id=p_patient and type='REQ';
  if not found or not public.can_access_recipient(p_patient) or not private.can(p_patient,'req.read') then raise exception 'private requisition draft unavailable' using errcode='42501';end if;
  if p_write then
   perform private.require_req_decision_authority(p_patient,p_purpose);
   if not exists(select 1 from public.care_recipients where id=p_patient and is_active)
    or not exists(select 1 from public.requisitions r left join public.requisition_lifecycle l on l.requisition_id=r.id where r.id=p_target and ((p_purpose='archive' and l.archived_at is null and l.completed_at is not null) or (p_purpose='cancel' and not r.is_historical and r.status<>'cancelled' and l.archived_at is null and l.completed_at is null) or (p_purpose='resolve_extra' and r.status<>'cancelled'))) then raise exception 'requisition task no longer available' using errcode='PT409';end if;
  end if;
  return;
 end if;

 if p_kind is null or p_kind not in ('COM','ENT') or p_purpose is null
  or (p_purpose in ('create','transfer_declare_family','transfer_declare_team')) is distinct from (p_target is null)
  or p_kind='COM' and p_purpose not in ('create','revise','approve','purchase','receive','validate_receipt','reject_receipt','close_expectation','cancel')
  or p_kind='ENT' and p_purpose not in ('create','revise','receive','divergence','reassign','resolve','cancel','refuse_cancellation','withdraw_cancellation','consent_cancel','propose_regularization','approve_regularization','reject_regularization','withdraw_regularization','record_regularization_finding','transfer_agree','transfer_decline','transfer_withdraw','transfer_dispatch','transfer_declare_family','transfer_declare_team') then
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
  elsif p_purpose in ('transfer_declare_family','transfer_declare_team') then
   perform private.require_cap(p_patient,'ent.create');
   perform private.require_cap(p_patient,case when p_purpose='transfer_declare_family' then 'stock.family.read' else 'stock.team.read' end);
   if not exists(select 1 from public.care_recipients where id=p_patient and is_active) then raise exception 'inactive transfer patient' using errcode='42501';end if;
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
end;$function$;

CREATE OR REPLACE FUNCTION private.creation_draft_navigation_valid(p_navigation jsonb, p_kind text, p_purpose text, p_content jsonb)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
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
   when p_kind='ENT' and p_purpose in ('transfer_declare_family','transfer_declare_team') then p_navigation->>'stage'='ent_transfer_declaration'
   when p_kind='BAL' and p_purpose in ('review_family','review_supervisor','assign_recount') then p_navigation->>'stage'='bal_'||p_purpose
   when p_kind='REQ' and p_purpose in ('archive','cancel','resolve_extra') then p_navigation->>'stage'='req_'||p_purpose
   when p_purpose not in ('create','revise') then false
   when p_kind='REQ' and p_purpose='create' then p_navigation->>'stage'=any(array['identification','medicamentos','higiene','dieta','extras','notes','review'])
   when p_kind in ('COM','ENT') then p_navigation->>'stage'=any(array['identification','medicamentos','higiene','dieta','notes','review'])
   when p_kind='BAL' and p_content is null then p_navigation->>'stage'=any(array['identification','medicamentos','higiene','dieta','notes','review','count'])
   when p_kind='BAL' and p_content#>>'{context,mode}'='scheduled' then p_navigation->>'stage'=any(array['count','review'])
   when p_kind='BAL' and p_content#>>'{context,mode}'='legacy' then p_navigation->>'stage'=any(array['identification','medicamentos','higiene','dieta','notes','review'])
   else false end
 end is true;
$function$;

CREATE OR REPLACE FUNCTION private.validate_supply_draft(p_content jsonb, p_purpose text, p_target uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare f jsonb;c jsonb;x jsonb;k text;v jsonb;begin
 if jsonb_typeof(p_content) is distinct from 'object' or octet_length(p_content::text)>200000 then raise exception 'invalid private supply content' using errcode='22023';end if;
 if p_purpose in ('review_family','review_supervisor','assign_recount') and (p_content->'materials' is distinct from '[]'::jsonb or p_content->'divergentIds' is distinct from '[]'::jsonb) then raise exception 'balance decisions do not store inventory' using errcode='22023';end if;
 if p_purpose not in ('create','revise') then
  if (p_content-array['documentVersion','fields','divergentIds','materials'])<>'{}'::jsonb
   or (case when p_purpose in ('transfer_declare_family','transfer_declare_team') then p_target is not null or p_content->'documentVersion' is distinct from 'null'::jsonb or p_content#>>'{fields,source}' is distinct from (case p_purpose when 'transfer_declare_family' then 'FAMILY' else 'CARE_TEAM' end) or p_content->'divergentIds' is distinct from '[]'::jsonb else jsonb_typeof(p_content->'documentVersion') is distinct from 'number' or (p_content->>'documentVersion')!~'^[1-9][0-9]{0,9}$' end)
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
 if p_purpose in ('transfer_declare_family','transfer_declare_team') and ((select count(distinct material_ref.value->>'id') from jsonb_array_elements(p_content->'materials') as material_ref(value))<>jsonb_array_length(p_content->'materials') or exists(select 1 from jsonb_array_elements(p_content->'materials') as material_ref(value) where length(material_ref.value->>'id')=0)) then raise exception 'invalid private transfer material identities' using errcode='22023';end if;
end;$function$;

CREATE OR REPLACE FUNCTION public.commit_supply_draft(p_id uuid, p_expected integer, p_target uuid, p_body jsonb, p_key uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d private.creation_drafts;c private.creation_draft_commands;h text;result jsonb;outcome jsonb;document_id uuid;command text;post_req_reference text;post_bal_reference text;begin
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
 if d.kind='BAL' then
  command:=case when d.purpose='assign_recount' then 'assign_recount' else 'approve' end;
  if (p_body-array['action','body','expectedVersion'])<>'{}'::jsonb or p_body->>'action' is distinct from command
   or jsonb_typeof(p_body->'expectedVersion') is distinct from 'number' or (p_body->>'expectedVersion')::integer is distinct from (d.content->>'documentVersion')::integer then raise exception 'private balance document action differs' using errcode='22023';end if;
  perform pg_advisory_xact_lock(hashtextextended('stock:'||d.care_recipient_id,0));
  perform private.require_supply_draft_scope(d.care_recipient_id,d.kind,d.purpose,d.target_document_id,true);
  if d.content#>>'{fields,referenceHash}' is distinct from private.bal_document_draft_reference(p_target,d.purpose)
   or not exists(select 1 from public.operational_documents where id=p_target and version=(p_body->>'expectedVersion')::integer) then raise exception 'stale private balance document reference' using errcode='PT409';end if;
  perform private.require_bal_document_draft_intent(p_target,d.purpose,d.content,p_body->'body');
  if d.purpose='assign_recount' then outcome:=public.balance_command(d.care_recipient_id,'assign_recount',p_body->'body',p_key,(p_body->>'expectedVersion')::integer);
  else outcome:=public.supply_document_command(p_target,'approve',p_body->'body',p_key,(p_body->>'expectedVersion')::integer);end if;
  document_id:=p_target;post_bal_reference:=private.bal_document_draft_reference(p_target,d.purpose);
 elsif d.kind='REQ' then
  if (p_body-array['action','body','expectedVersion'])<>'{}'::jsonb or p_body->>'action' is distinct from d.purpose
   or (p_body->>'expectedVersion')::integer is distinct from (d.content->>'documentVersion')::integer then raise exception 'private requisition action differs' using errcode='22023';end if;
  perform pg_advisory_xact_lock(hashtextextended('stock:'||d.care_recipient_id,0));
  perform private.require_supply_draft_scope(d.care_recipient_id,d.kind,d.purpose,d.target_document_id,true);
  if d.content#>>'{fields,referenceHash}' is distinct from private.requisition_decision_reference(p_target)->>'referenceHash' then raise exception 'stale private requisition reference' using errcode='PT409';end if;
  if not exists(select 1 from public.operational_documents where id=p_target and version=(p_body->>'expectedVersion')::integer) then raise exception 'stale private requisition version' using errcode='PT409';end if;
  perform private.require_req_decision_intent(d.purpose,d.content,p_body->'body');
  if d.purpose='archive' then outcome:=public.archive_requisition(p_target,p_body#>>'{body,reason}');
  elsif d.purpose='cancel' then outcome:=to_jsonb(public.transition_requisition_status(p_target,'cancelled',p_body#>>'{body,reason}'));
  else
   if not exists(select 1 from public.requisition_items where id=(p_body#>>'{body,itemId}')::uuid and requisition_id=p_target) then raise exception 'requisition item target differs' using errcode='22023';end if;
   outcome:=public.resolve_requisition_item((p_body#>>'{body,itemId}')::uuid,p_body#>>'{body,productId}',p_body#>>'{body,reason}',p_key);
  end if;
  document_id:=p_target;post_req_reference:=private.requisition_decision_reference(p_target)->>'referenceHash';
 elsif d.purpose in ('transfer_declare_family','transfer_declare_team') then
  if (p_body-array['action','body'])<>'{}'::jsonb or p_body->>'action' is distinct from 'declare_transfer' then raise exception 'invalid private transfer declaration confirmation' using errcode='22023';end if;
  perform private.require_transfer_declaration_draft_intent(d.purpose,d.content,p_body->'body');
  outcome:=public.create_transfer_declaration(d.care_recipient_id,p_body->'body',p_key);document_id:=(outcome->>'id')::uuid;
 elsif d.purpose='create' then
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
 if d.kind='ENT' and d.purpose in ('transfer_declare_family','transfer_declare_team') then
  perform private.require_supply_draft_scope(d.care_recipient_id,d.kind,d.purpose,null,true);
  if not private.transfer_party_eligible(d.care_recipient_id,(d.content#>>'{fields,counterpartyId}')::uuid,d.content#>>'{fields,source}')
   or not private.transfer_party_eligible(d.care_recipient_id,(d.content#>>'{fields,recipientId}')::uuid,d.content#>>'{fields,source}') then raise exception 'transfer party authority changed after private journal' using errcode='42501';end if;
  if d.content#>>'{fields,referenceHash}' is distinct from private.transfer_preparation(d.care_recipient_id,d.content#>>'{fields,source}')->>'referenceHash' then raise exception 'stale private transfer preparation after journal' using errcode='PT409';end if;
 end if;
 if d.kind='BAL' then
  perform private.require_bal_document_draft_authority(d.care_recipient_id,d.purpose);
  if post_bal_reference is distinct from private.bal_document_draft_reference(p_target,d.purpose) then raise exception 'balance document reference changed after private journal' using errcode='PT409';end if;
 end if;
 if d.kind='REQ' then
  perform private.require_req_decision_authority(d.care_recipient_id,d.purpose);
  if post_req_reference is distinct from private.requisition_decision_reference(p_target)->>'referenceHash' then raise exception 'requisition reference changed after private journal' using errcode='PT409';end if;
 end if;
 return result;
end;$function$;

commit;
