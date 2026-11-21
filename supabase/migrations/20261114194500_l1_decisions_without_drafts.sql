-- Official command outcomes, never unfinished forms. A negative settlement
-- prevents an original request arriving late from applying after that proof.
create table private.document_decision_results (
 actor_id uuid not null references public.profiles(id),
 key uuid not null,
 document_id uuid not null references public.operational_documents(id),
 state text not null check(state in ('applied','not_applied')),
 intention jsonb,
 result jsonb,
 recorded_at timestamptz not null default clock_timestamp(),
 primary key(actor_id,key),
 check((state='applied' and intention is not null and result is not null)
    or (state='not_applied' and intention is null and result is null))
);
create index document_decision_results_document on private.document_decision_results(document_id);
alter table private.document_decision_results enable row level security;
revoke all on private.document_decision_results from public,anon,authenticated,service_role;

create function private.document_decision_result_view(r private.document_decision_results) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('documentId',r.document_id,'key',r.key,'state',r.state,
  'intention',r.intention,'result',r.result,'recordedAt',r.recorded_at);
$$;
revoke all on function private.document_decision_result_view(private.document_decision_results) from public,anon,authenticated,service_role;

create function public.execute_document_decision(p_document uuid,p_key uuid,p_intention jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;r private.document_decision_results;
 domain text:=p_intention->>'domain';action text:=p_intention->>'action';
 body jsonb:=p_intention->'body';requested_version integer;outcome jsonb;post_reference text;
begin
 if private.auth_session() is null or p_key is null or p_document is null then
  raise exception 'active identity and command key required' using errcode='42501';end if;
 select * into d from public.operational_documents where id=p_document;
 if not found then raise exception 'document not found' using errcode='42501';end if;
 perform private.require_cap(d.care_recipient_id,lower(d.type)||'.read');
 perform pg_advisory_xact_lock(hashtextextended('document-decision:'||auth.uid()||':'||p_key,0));
 select * into r from private.document_decision_results where actor_id=auth.uid() and key=p_key;
 if found then
  if r.document_id<>p_document then raise exception 'command scope differs' using errcode='22023';end if;
  if r.state='not_applied' then raise exception 'this command was settled without an act; confirm a new attempt' using errcode='PT409';end if;
  if r.intention is distinct from p_intention then raise exception 'command key reused with another intention' using errcode='22023';end if;
  return private.document_decision_result_view(r);
 end if;
 if jsonb_typeof(p_intention) is distinct from 'object' or jsonb_typeof(body) is distinct from 'object'
  or (p_intention-array['domain','action','body','expectedVersion','referenceHash'])<>'{}'::jsonb
  or domain is null or domain not in ('requisition','supply','transfer','balance') or action is null
  or coalesce(p_intention->>'expectedVersion','') !~ '^[1-9][0-9]{0,9}$'
  then raise exception 'invalid official command' using errcode='22023';end if;
 requested_version:=(p_intention->>'expectedVersion')::integer;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||d.care_recipient_id,0));
 select * into d from public.operational_documents where id=p_document;
 if d.version<>requested_version then raise exception 'document changed before confirmation' using errcode='PT409';end if;
 if domain='requisition' then
  if d.type<>'REQ' or action not in ('cancel','archive','resolve_extra')
   or (body-array['reason','itemId','productId'])<>'{}'::jsonb
   or jsonb_typeof(body->'reason') is distinct from 'string'
   or length(btrim(body->>'reason')) not between 3 and 1000 then
   raise exception 'invalid requisition decision' using errcode='22023';end if;
  perform private.require_req_decision_authority(d.care_recipient_id,action);
  if p_intention->>'referenceHash' is distinct from private.requisition_decision_reference(p_document)->>'referenceHash'
   then raise exception 'requisition reference changed before confirmation' using errcode='PT409';end if;
  if action='cancel' then
   select to_jsonb(public.transition_requisition_status(p_document,'cancelled',body->>'reason')) into outcome;
  elsif action='archive' then outcome:=public.archive_requisition(p_document,body->>'reason');
  else
   if not exists(select 1 from public.requisition_items where id=(body->>'itemId')::uuid and requisition_id=p_document)
    then raise exception 'item outside this requisition' using errcode='42501';end if;
   outcome:=public.resolve_requisition_item((body->>'itemId')::uuid,body->>'productId',body->>'reason',p_key);
  end if;
  post_reference:=private.requisition_decision_reference(p_document)->>'referenceHash';
 elsif domain='balance' then
  if d.type<>'BAL' or action not in ('review_family','review_supervisor','assign_recount')
   then raise exception 'invalid balance decision' using errcode='22023';end if;
  perform private.require_supply_draft_scope(d.care_recipient_id,'BAL',action,p_document,true);
  if p_intention->>'referenceHash' is distinct from private.bal_document_draft_reference(p_document,action)
   then raise exception 'balance reference changed before confirmation' using errcode='PT409';end if;
  if action='assign_recount' then
   if body->>'documentId' is distinct from p_document::text or body->>'referenceHash' is distinct from p_intention->>'referenceHash'
    then raise exception 'balance assignment scope differs' using errcode='22023';end if;
   outcome:=public.balance_command(d.care_recipient_id,'assign_recount',body,p_key,requested_version);
  else
   if body->>'group' is distinct from substr(action,8) or body->>'reviewReference' is distinct from p_intention->>'referenceHash'
    then raise exception 'balance review scope differs' using errcode='22023';end if;
   outcome:=public.supply_document_command(p_document,'approve',body,p_key,requested_version);
  end if;
  post_reference:=private.bal_document_draft_reference(p_document,action);
 elsif domain='supply' then
  if d.type not in ('COM','ENT','BAL') or d.type='BAL' and action not in ('submit','cancel')
   then raise exception 'invalid supply document decision' using errcode='22023';end if;
  outcome:=public.supply_document_command(p_document,action,body,p_key,requested_version);
 else
  if d.type<>'ENT' then raise exception 'invalid transfer document' using errcode='22023';end if;
  outcome:=public.transfer_command(p_document,action,body,p_key,requested_version);
 end if;
 insert into private.document_decision_results(actor_id,key,document_id,state,intention,result)
  values(auth.uid(),p_key,p_document,'applied',p_intention,outcome) returning * into r;
 -- A profile FK wait cannot turn an old permission into current authority.
 perform private.require_cap(d.care_recipient_id,lower(d.type)||'.read');
 if domain='requisition' then
  perform private.require_req_decision_authority(d.care_recipient_id,action);
  if post_reference is distinct from private.requisition_decision_reference(p_document)->>'referenceHash'
   then raise exception 'requisition reference changed after confirmation' using errcode='PT409';end if;
 elsif domain='balance' then
  perform private.require_bal_document_draft_authority(d.care_recipient_id,action);
  if post_reference is distinct from private.bal_document_draft_reference(p_document,action)
   then raise exception 'balance reference changed after confirmation' using errcode='PT409';end if;
 elsif domain='transfer' then
  perform private.require_transfer_draft_authority(p_document,'transfer_'||action,false);
 elsif d.type='BAL' then
  perform private.require_cap(d.care_recipient_id,case action when 'cancel' then 'access.manage' else 'bal.count' end);
 elsif d.type='COM' then
  perform private.require_supply_draft_scope(d.care_recipient_id,'COM',action,p_document,true);
 elsif action in ('receive','divergence') then
  perform private.require_cap(d.care_recipient_id,'ent.receive');
  if not exists(select 1 from public.operational_documents where id=p_document and recipient_id=auth.uid())
   then raise exception 'personal delivery authority changed' using errcode='42501';end if;
 elsif action in ('propose_regularization','review_regularization','approve_regularization','reject_regularization','withdraw_regularization','record_regularization_finding') then
  if action='record_regularization_finding' then
   perform private.require_cap(d.care_recipient_id,'ent.follow_up');
   if not private.regularization_follow_up_eligible(d.care_recipient_id,auth.uid())
    then raise exception 'personal follow-up authority changed' using errcode='42501';end if;
  else perform private.require_regularization_authority(d.care_recipient_id);end if;
 elsif action='submit' then perform private.require_cap(d.care_recipient_id,'ent.create');
 else perform private.require_supply_draft_scope(d.care_recipient_id,'ENT',action,p_document,true);
 end if;
 return private.document_decision_result_view(r);
end;$$;

create function public.settle_document_decision(p_document uuid,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;r private.document_decision_results;
begin
 if private.auth_session() is null or p_key is null or p_document is null then
  raise exception 'active identity and command key required' using errcode='42501';end if;
 select * into d from public.operational_documents where id=p_document;
 if not found then raise exception 'document not found' using errcode='42501';end if;
 perform private.require_cap(d.care_recipient_id,lower(d.type)||'.read');
 perform pg_advisory_xact_lock(hashtextextended('document-decision:'||auth.uid()||':'||p_key,0));
 select * into r from private.document_decision_results where actor_id=auth.uid() and key=p_key;
 if found and r.document_id<>p_document then raise exception 'command scope differs' using errcode='22023';end if;
 if not found then
  -- This stores only a closed technical key, with no form or business act.
  insert into private.document_decision_results(actor_id,key,document_id,state)
   values(auth.uid(),p_key,p_document,'not_applied') returning * into r;
 end if;
 perform private.require_cap(d.care_recipient_id,lower(d.type)||'.read');
 return private.document_decision_result_view(r);
end;$$;
revoke all on function public.execute_document_decision(uuid,uuid,jsonb),public.settle_document_decision(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.execute_document_decision(uuid,uuid,jsonb),public.settle_document_decision(uuid,uuid) to authenticated;
notify pgrst,'reload schema';

-- Scheduling decisions use the same rule: only an official outcome or a closed
-- technical key, never an unfinished reason, shift selection or preparation.
create table private.balance_decision_results (
 actor_id uuid not null references public.profiles(id), key uuid not null,
 patient_id uuid not null references public.care_recipients(id), target_id uuid not null,
 state text not null check(state in ('applied','not_applied')), intention jsonb, result jsonb,
 recorded_at timestamptz not null default clock_timestamp(), primary key(actor_id,key),
 check((state='applied' and intention is not null and result is not null) or (state='not_applied' and intention is null and result is null))
);
alter table private.balance_decision_results enable row level security;
revoke all on private.balance_decision_results from public,anon,authenticated,service_role;
create function private.balance_decision_result_view(r private.balance_decision_results) returns jsonb language sql stable set search_path='' as $$
 select jsonb_build_object('documentId',r.target_id,'key',r.key,'state',r.state,'intention',r.intention,'result',r.result,'recordedAt',r.recorded_at);
$$;
revoke all on function private.balance_decision_result_view(private.balance_decision_results) from public,anon,authenticated,service_role;
create function public.execute_balance_decision(p_patient uuid,p_target uuid,p_key uuid,p_intention jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r private.balance_decision_results;purpose text:=p_intention->>'action';command jsonb:=p_intention->'body'->'command';b jsonb;v integer;native jsonb;resource uuid;receipt jsonb;after_hash text;fields jsonb;
begin
 if private.auth_session() is null or p_key is null or p_target is null then raise exception 'active identity and command key required' using errcode='42501';end if;
 perform private.require_balance_preparation_scope(p_patient,purpose,p_target);
 perform pg_advisory_xact_lock(hashtextextended('balance-decision:'||auth.uid()||':'||p_key,0));
 select * into r from private.balance_decision_results where actor_id=auth.uid() and key=p_key;
 if found then
  if r.patient_id<>p_patient or r.target_id<>p_target then raise exception 'command scope differs' using errcode='22023';end if;
  if r.state='not_applied' then raise exception 'command was settled without an act; confirm a new attempt' using errcode='PT409';end if;
  if r.intention is distinct from p_intention then raise exception 'command key reused with another intention' using errcode='22023';end if;
  return private.balance_decision_result_view(r);
 end if;
 if p_intention->>'domain' is distinct from 'balance_workspace' or (p_intention-array['domain','action','body','expectedVersion','referenceHash'])<>'{}'::jsonb
  or jsonb_typeof(command) is distinct from 'object' or ((p_intention->'body')-array['command'])<>'{}'::jsonb
  or coalesce(p_intention->>'expectedVersion','') !~ '^(0|[1-9][0-9]{0,9})$'
  then raise exception 'invalid balance decision' using errcode='22023';end if;
 v:=nullif((p_intention->>'expectedVersion')::integer,0);b:=command->'body';
 if jsonb_typeof(b) is distinct from 'object' or command->>'action' is distinct from (case when purpose in ('approve_deferral','reject_deferral') then 'decide_deferral' else purpose end)
  or (purpose='configure' and p_target<>p_patient) or (purpose='assign' and b->>'cycleId' is distinct from p_target::text)
  or (purpose in ('defer','request_deferral') and b->>'assignmentId' is distinct from p_target::text)
  or (purpose in ('approve_deferral','reject_deferral') and (b->>'id' is distinct from p_target::text or b->'approve' is distinct from to_jsonb(purpose='approve_deferral')))
  or (purpose in ('assign','approve_deferral','reject_deferral') and v is not null)
  then raise exception 'balance command scope differs' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('bal:'||p_patient,0));
 perform private.require_balance_preparation_scope(p_patient,purpose,p_target,true);
 if p_intention->>'referenceHash' is distinct from private.balance_preparation_hash(private.balance_preparation_workspace(p_patient,purpose,p_target),purpose,p_target)
  then raise exception 'balance reference changed before confirmation' using errcode='PT409';end if;
 if exists(select 1 from private.bal_commands where care_recipient_id=p_patient and actor_id=auth.uid() and key=p_key) then raise exception 'native key belongs to another entrypoint' using errcode='23505';end if;
 if purpose='assign' then native:=public.resolve_balance_assignment(p_patient,p_target,(b->>'targetShiftId')::uuid,b->>'reason',p_key);
 else native:=public.balance_command(p_patient,command->>'action',b,p_key,v);end if;
 resource:=case when purpose='configure' then p_patient when purpose='assign' then (native->>'assignmentId')::uuid else (native->>'id')::uuid end;
 if resource is null then raise exception 'balance command did not confirm resource';end if;
 fields:=jsonb_build_object('reason',b->>'reason');
 if purpose='configure' then fields:=fields||jsonb_build_object('enabled',b->>'enabled','weekday',b->>'weekday','timezone',b->>'timezone','shiftTypeId',b->>'shiftTypeId','professionalId',coalesce(b->>'professionalId',''),'startsOn',b->>'startsOn');
 elsif purpose in ('assign','defer','request_deferral') then fields:=fields||jsonb_build_object('targetShiftId',b->>'targetShiftId');end if;
 receipt:=jsonb_build_object('patientId',p_patient,'purpose',purpose,'targetResourceId',p_target,'resourceId',resource,'actorId',auth.uid(),'recordedAt',clock_timestamp(),'command',command,'expectedVersion',v,'referenceHash',p_intention->>'referenceHash','nativeResult',native,'preparedValues',fields);
 after_hash:=private.balance_preparation_hash(private.balance_preparation_workspace(p_patient,purpose,p_target),purpose,p_target);
 insert into private.balance_decision_results(actor_id,key,patient_id,target_id,state,intention,result) values(auth.uid(),p_key,p_patient,p_target,'applied',p_intention,receipt) returning * into r;
 perform private.require_balance_preparation_scope(p_patient,purpose,p_target,true);
 if after_hash is distinct from private.balance_preparation_hash(private.balance_preparation_workspace(p_patient,purpose,p_target),purpose,p_target) then raise exception 'balance reference changed during confirmation' using errcode='PT409';end if;
 return private.balance_decision_result_view(r);
end;$$;
create function public.settle_balance_decision(p_patient uuid,p_target uuid,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r private.balance_decision_results;
begin
 if private.auth_session() is null or p_key is null or p_target is null then raise exception 'active identity and command key required' using errcode='42501';end if;
 perform private.require_cap(p_patient,'bal.read');
 perform pg_advisory_xact_lock(hashtextextended('balance-decision:'||auth.uid()||':'||p_key,0));
 select * into r from private.balance_decision_results where actor_id=auth.uid() and key=p_key;
 if found and (r.patient_id<>p_patient or r.target_id<>p_target) then raise exception 'command scope differs' using errcode='22023';end if;
 if not found then insert into private.balance_decision_results(actor_id,key,patient_id,target_id,state) values(auth.uid(),p_key,p_patient,p_target,'not_applied') returning * into r;end if;
 perform private.require_cap(p_patient,'bal.read');return private.balance_decision_result_view(r);
end;$$;
revoke all on function public.execute_balance_decision(uuid,uuid,uuid,jsonb),public.settle_balance_decision(uuid,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.execute_balance_decision(uuid,uuid,uuid,jsonb),public.settle_balance_decision(uuid,uuid,uuid) to authenticated;
notify pgrst,'reload schema';
