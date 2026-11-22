-- A previous personal opt-in is a versioned fact, never a legacy boolean.
create table public.requisition_science_preferences (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),
 version integer not null check(version>0),mode text not null check(mode in ('manual','dialog','tacit')),
 affirmative_consent boolean not null,consent_copy_version text not null default 'P02-REQ-1',
 effective_at timestamptz not null default clock_timestamp(),idempotency_key uuid not null,intent jsonb not null,
 unique(user_id,version),unique(user_id,idempotency_key),check(mode='manual' or affirmative_consent)
);
alter table public.requisition_science_preferences enable row level security;
revoke all on public.requisition_science_preferences from public,anon,authenticated,service_role;
grant select on public.requisition_science_preferences to authenticated;
create policy own_science_preference on public.requisition_science_preferences for select to authenticated using(user_id=auth.uid() and public.my_session_valid());
create trigger immutable_science_preference before update or delete on public.requisition_science_preferences for each row execute function private.immutable_event();
create trigger science_preference_invalidation after insert on public.requisition_science_preferences for each row execute function private.invalidate_workspace();
alter table public.requisition_science_events drop constraint requisition_science_events_mode_check;
alter table public.requisition_science_events add constraint requisition_science_events_mode_check check(mode in ('express','dialog','tacit','dispatch','app_visible','whatsapp_read','whatsapp_confirm'));

create function private.science_preference_view(p_pref public.requisition_science_preferences)
returns jsonb language sql immutable set search_path='' as $$
 select case when p_pref.id is null then jsonb_build_object('mode','manual','version',0,'id',null,'effectiveAt',null,'consentCopyVersion','P02-REQ-1') else
 jsonb_build_object('mode',p_pref.mode,'version',p_pref.version,'id',p_pref.id,'effectiveAt',p_pref.effective_at,'consentCopyVersion',p_pref.consent_copy_version) end;
$$;
create function public.my_requisition_science_preference()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare pref public.requisition_science_preferences;
begin
 if private.auth_session() is null or not exists(select 1 from public.profiles where id=auth.uid() and status='active') then raise exception 'active identity required' using errcode='42501';end if;
 select * into pref from public.requisition_science_preferences where user_id=auth.uid() order by version desc limit 1;
 return private.science_preference_view(pref);
end;$$;
create function public.set_requisition_science_preference(p_mode text,p_consent boolean,p_version integer,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare pref public.requisition_science_preferences;current_version integer;intent jsonb;
begin
 if p_mode is null or p_mode not in ('manual','dialog','tacit') or p_consent is null or p_mode<>'manual' and not p_consent or p_version is null or p_version<0 or p_key is null then raise exception 'invalid science preference' using errcode='22023';end if;
 perform 1 from public.profiles where id=auth.uid() and status='active' for update;
 if not found or private.auth_session() is null then raise exception 'active identity required' using errcode='42501';end if;
 intent:=jsonb_build_object('mode',p_mode,'affirmativeConsent',p_consent,'consentCopyVersion','P02-REQ-1');
 select * into pref from public.requisition_science_preferences where user_id=auth.uid() and idempotency_key=p_key;
 if found then
  if pref.intent is distinct from intent then raise exception 'idempotency conflict' using errcode='23505';end if;
  return public.my_requisition_science_preference()||jsonb_build_object('savedVersion',pref.version,'recovered',true);
 end if;
 select coalesce(max(version),0) into current_version from public.requisition_science_preferences where user_id=auth.uid();
 if p_version<>current_version then raise exception 'stale preference version' using errcode='PT409';end if;
 insert into public.requisition_science_preferences(user_id,version,mode,affirmative_consent,idempotency_key,intent)
 values(auth.uid(),current_version+1,p_mode,p_consent,p_key,intent) returning * into pref;
 return public.my_requisition_science_preference()||jsonb_build_object('savedVersion',pref.version,'recovered',false);
end;$$;

create function public.requisition_opening_context(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare d public.operational_documents;r public.requisitions;s public.requisition_lifecycle;pref jsonb;eligible boolean;personal boolean;
begin
 select * into d from public.operational_documents where id=p_id and type='REQ';
 if not found or not coalesce(private.can(d.care_recipient_id,'req.read'),false) then raise exception 'required permission' using errcode='42501';end if;
 select * into strict r from public.requisitions where id=p_id;
 select * into s from public.requisition_lifecycle where requisition_id=p_id;
 pref:=public.my_requisition_science_preference();
 eligible:=private.requisition_family_representative(d.care_recipient_id,auth.uid());
 select exists(select 1 from public.requisition_science_events where requisition_id=p_id and user_id=auth.uid()) into personal;
 return jsonb_build_object('id',p_id,'type','REQ','code',d.code,'protocol',d.protocol,'version',d.version,'materialIdentity',r.material_identity,'personalScience',personal,'eligible',eligible,
  'requiresDialog',coalesce(not r.is_historical and d.status<>'cancelled' and s.archived_at is null and eligible and not personal and pref->>'mode'='dialog' and (s.policy->>'scienceDialog')::boolean,false),
  'preferenceVersion',pref->'version','policyVersion',s.policy->'policyVersion');
end;$$;

-- An official emission is the sole tacit trigger. Preference history is read
-- as of that emission, so a later opt-in or opt-out cannot rewrite its facts.
create function private.requisition_tacit_science()
returns trigger language plpgsql security definer set search_path='' as $$
declare r public.requisitions;s public.requisition_lifecycle;pref record;
begin
 if new.action<>'req.issued' then return new;end if;
 select * into r from public.requisitions where id=new.document_id;
 if not found or r.is_historical or r.material_identity_source<>'issued' then return new;end if;
 select * into s from public.requisition_lifecycle where requisition_id=r.id;
 if not coalesce((s.policy->>'scienceTacit')::boolean,false) then return new;end if;
 for pref in select x.* from unnest(s.eligible_users) u cross join lateral (
  select p.* from public.requisition_science_preferences p where p.user_id=u and p.effective_at<=r.material_emitted_at order by p.version desc limit 1
 ) x where x.mode='tacit' and x.affirmative_consent loop
  perform private.record_science(r.id,pref.user_id,'tacit',jsonb_build_object('source','prior_personal_preference','preferenceId',pref.id,'preferenceVersion',pref.version,'policyVersion',s.policy->'policyVersion'));
 end loop;return new;
end;$$;
create trigger phase_d_requisition_tacit after insert on public.document_events for each row execute function private.requisition_tacit_science();

-- SCI-003 is transport evidence. SCI-004 awaits its external gate.
create or replace function public.notification_webhook(p_provider_reference text,p_state text,p_notification_id uuid default null)
returns void language plpgsql security definer set search_path='' as $$
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'service authorization required' using errcode='42501';end if;
 perform public.v3_notification_webhook(p_provider_reference,p_state,p_notification_id);
end;$$;
create or replace function public.issue_science_challenge(p_notification uuid,p_worker uuid,p_hash text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' or not public.validate_notification_job(p_notification,p_worker) then raise exception 'verified worker required' using errcode='42501';end if;
 return false;
end;$$;
create or replace function public.confirm_whatsapp_science(p_provider_id text,p_phone text,p_hash text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'verified webhook required' using errcode='42501';end if;
 return false;
end;$$;

-- Add administrative modality permissions without converting the old
-- scienceAutomatic flag into permission for prior-preference SCI.
do $$declare definition text;anchor text;begin
 definition:=pg_get_functiondef('public.v4_configure_patient_access(uuid,text,jsonb,uuid,integer,uuid,text)'::regprocedure);
 anchor:='''scienceByDispatch'',''scienceAutomatic'',''scienceWhatsApp''';
 if (length(definition)-length(replace(definition,anchor,'')))/length(anchor)<>2 then raise exception 'science modality policy anchor mismatch';end if;
 execute replace(definition,anchor,'''scienceByDispatch'',''scienceAutomatic'',''scienceWhatsApp'',''scienceDialog'',''scienceTacit''');
end;$$;
revoke all on function private.science_preference_view(public.requisition_science_preferences),private.requisition_tacit_science() from public,anon,authenticated,service_role;
revoke all on function public.my_requisition_science_preference(),public.set_requisition_science_preference(text,boolean,integer,uuid),public.requisition_opening_context(uuid) from public,anon,authenticated,service_role;
grant execute on function public.my_requisition_science_preference(),public.set_requisition_science_preference(text,boolean,integer,uuid),public.requisition_opening_context(uuid) to authenticated;

create or replace function private.record_science(p_id uuid,p_user uuid,p_mode text,p_evidence jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare s public.requisition_lifecycle;r public.requisitions;eid uuid;cause text;authority jsonb;satisfied boolean;pref public.requisition_science_preferences;
begin
 -- Legacy communication/header evidence stays historical, never a new SCI.
 if p_mode is null or p_mode not in ('express','dialog','tacit','dispatch') or (p_mode<>'tacit' and p_user is distinct from auth.uid()) then return false;end if;
 select * into r from public.requisitions where id=p_id;
 if not found or r.is_historical then return false;end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||r.care_recipient_id,0));
 select * into strict s from public.requisition_lifecycle where requisition_id=p_id for update;
 if (p_mode<>'tacit' and not coalesce(private.can(r.care_recipient_id,'req.science'),false)) or not private.requisition_family_representative(r.care_recipient_id,p_user) then return false;end if;
 if p_mode='dispatch' then
  if not exists(select 1 from public.document_events e join public.operational_documents d on d.id=e.document_id
   where e.document_id=(p_evidence->>'deliveryId')::uuid and e.version=(p_evidence->>'deliveryVersion')::integer
   and d.care_recipient_id=r.care_recipient_id and d.type='ENT' and d.status='pending_receipt'
   and e.action in ('ent.issued','ent.submit') and e.actor_id=p_user
   and exists(select 1 from public.document_request_links k join public.document_lines l on l.id=k.document_line_id join public.requisition_items i on i.id=k.requisition_item_id where l.document_id=d.id and i.requisition_id=p_id))
   then return false;end if;
  cause:='dispatch:'||(p_evidence->>'deliveryId')||':'||(p_evidence->>'deliveryVersion');
 elsif p_mode in ('dialog','tacit') then
  if s.archived_at is not null or exists(select 1 from public.operational_documents where id=p_id and status='cancelled') then return false;end if;
  if p_mode='tacit' then
   select * into pref from public.requisition_science_preferences where user_id=p_user and effective_at<=r.material_emitted_at order by version desc limit 1;
   if not found or pref.mode<>'tacit' or not pref.affirmative_consent or not(p_user=any(s.eligible_users))
    or not coalesce((s.policy->>'scienceTacit')::boolean,false) or r.material_identity_source<>'issued'
    or pref.id::text is distinct from p_evidence->>'preferenceId' then return false;end if;
  else
   select * into pref from public.requisition_science_preferences where user_id=p_user order by version desc limit 1;
   if not found or pref.mode<>'dialog' or not pref.affirmative_consent or not coalesce((s.policy->>'scienceDialog')::boolean,false) then return false;end if;
  end if;
  p_evidence:=p_evidence||jsonb_build_object('preferenceId',pref.id,'preferenceVersion',pref.version,'preferenceEffectiveAt',pref.effective_at,'consentCopyVersion',pref.consent_copy_version,'policyVersion',s.policy->'policyVersion');
  cause:=p_mode||':'||r.material_identity;
 else
  if s.archived_at is not null or exists(select 1 from public.operational_documents where id=p_id and status='cancelled') then return false;end if;
  if exists(select 1 from public.requisition_science_events where requisition_id=p_id and user_id=p_user and material_identity is null and mode='express') then return false;end if;
  cause:='express:'||r.material_identity;
 end if;
 authority:=jsonb_build_object('familyRepresentative',true,'capability','req.science','context',case when p_mode='tacit' then null else public.my_active_context() end,'origin',case when p_mode='tacit' then 'prior_personal_preference' else 'authenticated_action' end,
  'role',(select role from public.care_recipient_memberships where care_recipient_id=r.care_recipient_id and user_id=p_user),
  'governanceVersion',(select version from public.patient_settings where care_recipient_id=r.care_recipient_id));
 insert into public.requisition_science_events(requisition_id,care_recipient_id,user_id,actor_name,mode,evidence,material_identity,source_key,authority_context,created_at)
 values(p_id,r.care_recipient_id,p_user,(select full_name from public.profiles where id=p_user),p_mode,p_evidence||jsonb_build_object('materialIdentity',r.material_identity),r.material_identity,cause,authority,clock_timestamp())
 on conflict(requisition_id,user_id,source_key) where source_key is not null do nothing returning id into eid;
 if eid is null then return false;end if;
 satisfied:=private.science_satisfied(p_id);
 update public.requisition_lifecycle set science_satisfied_at=case when satisfied then coalesce(science_satisfied_at,clock_timestamp()) else science_satisfied_at end where requisition_id=p_id;
 update public.operational_documents set version=version+1 where id=p_id;
 perform private.record_document_event(p_id,case when satisfied and s.science_satisfied_at is null then 'req.science_satisfied' else 'req.science_recorded' end,
  jsonb_build_object('scienceEventId',eid,'userId',p_user,'mode',p_mode,'materialIdentity',r.material_identity,'evidence',p_evidence),gen_random_uuid());
 return true;
end;$$;
create or replace function public.acknowledge_requisition(p_id uuid,p_mode text,p_version integer,p_material_identity text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;r public.requisitions;
begin
 select * into d from public.operational_documents where id=p_id;
 perform private.require_cap(d.care_recipient_id,'req.science');
 perform pg_advisory_xact_lock(hashtextextended('stock:'||d.care_recipient_id,0));
 select * into strict d from public.operational_documents where id=p_id for update;
 select * into strict r from public.requisitions where id=p_id;
 perform private.require_cap(d.care_recipient_id,'req.science');
 if p_mode is null or p_mode not in ('express','dialog') then raise exception 'invalid science mode' using errcode='22023';end if;
 if p_material_identity is distinct from r.material_identity or p_version is null or p_version<1 or p_version>d.version then raise exception 'stale document material' using errcode='P0001';end if;
 if not private.requisition_family_representative(d.care_recipient_id,auth.uid()) then raise exception 'science permission required' using errcode='42501';end if;
 if exists(select 1 from public.requisition_science_events e where e.requisition_id=p_id and e.user_id=auth.uid() and e.mode=p_mode and (e.material_identity=r.material_identity or e.material_identity is null)) then return public.requisition_progress(p_id);end if;
 if r.is_historical or d.status='cancelled' or exists(select 1 from public.requisition_lifecycle where requisition_id=p_id and archived_at is not null) then raise exception 'closed requisition science' using errcode='23514';end if;
 if not private.record_science(p_id,auth.uid(),p_mode,jsonb_build_object('source',case when p_mode='dialog' then 'dialog_confirmation_before_open' else 'authenticated_confirmation' end,'sessionId',private.auth_session(),'seenTechnicalVersion',p_version)) then
  raise exception 'science preference or authority changed' using errcode='PT409';end if;
 return public.requisition_progress(p_id);
end;$$;
CREATE OR REPLACE FUNCTION private.record_document_event(p_id uuid, p_action text, p_body jsonb, p_key uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d public.operational_documents;s jsonb;h text;actors jsonb;event_actor uuid:=auth.uid();begin
 select * into strict d from public.operational_documents where id=p_id for update;
 if p_action in ('req.science_recorded','req.science_satisfied') and exists(
  select 1 from public.requisition_science_events e where e.id=(p_body->>'scienceEventId')::uuid and e.requisition_id=p_id and e.mode='tacit'
   and e.user_id::text=p_body->>'userId' and e.authority_context->>'origin'='prior_personal_preference'
   and e.evidence->>'source'='prior_personal_preference') then event_actor:=null;end if;
 actors:=jsonb_build_object('issuer',coalesce(d.canonical_snapshot->'actors'->'issuer',(select jsonb_build_object('id',id,'name',full_name,'registration',professional_registration,'state',professional_state,'category',professional_category) from public.profiles where id=d.created_by)),
 'recipient',(select jsonb_build_object('id',id,'name',full_name,'registration',professional_registration,'state',professional_state,'category',professional_category) from public.profiles where id=d.recipient_id),
 'patient',coalesce(d.canonical_snapshot->'actors'->'patient',(select jsonb_build_object('id',id,'name',display_name) from public.care_recipients where id=d.care_recipient_id)));
 s:=jsonb_build_object('schemaVersion',2,'id',d.id,'careRecipientId',d.care_recipient_id,'type',d.type,'code',d.code,'protocol',d.protocol,'createdAt',d.created_at,
 'status',d.status,'createdBy',d.created_by,'recipientId',d.recipient_id,'actors',actors,'payload',d.payload,'workflow',d.workflow_data,
 'lines',case when d.type='REQ' then coalesce((select jsonb_agg(to_jsonb(i) order by i.id) from public.requisition_items i where requisition_id=d.id),'[]') else coalesce((select jsonb_agg(to_jsonb(l) order by l.product_id) from public.document_lines l where document_id=p_id),'[]') end,
 'approvals',coalesce((select jsonb_agg(to_jsonb(a)) from public.bal_approvals a where document_id=p_id),'[]'),
 'itemResolutions',coalesce((select jsonb_agg(to_jsonb(r) order by r.id) from public.requisition_item_resolutions r join public.requisition_items i on i.id=r.requisition_item_id where i.requisition_id=p_id),'[]'),
 'requestLinks',coalesce((select jsonb_agg(to_jsonb(k)) from public.document_request_links k join public.document_lines l on l.id=k.document_line_id where l.document_id=p_id),'[]'),
 'attachments',coalesce((select jsonb_agg(jsonb_build_object('id',id,'filename',filename,'sha256',sha256,'bytes',bytes)) from public.attachments where document_id=p_id and state='ready'),'[]'),
 'version',d.version,'action',p_action,'event',p_body,'previousHash',d.content_hash);
 h:=encode(extensions.digest(s::text,'sha256'),'hex');
 update public.operational_documents set canonical_snapshot=s,content_hash=h,updated_at=now() where id=p_id;
 insert into public.document_events(document_id,care_recipient_id,version,action,actor_id,body,content_hash,idempotency_key,created_at) values(p_id,d.care_recipient_id,d.version,p_action,event_actor,s,h,p_key,clock_timestamp());
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(event_actor,p_action,'document',p_id,jsonb_build_object('care_recipient_id',d.care_recipient_id,'type',d.type,'version',d.version));
end;$function$;

revoke all on function private.record_document_event(uuid,text,jsonb,uuid) from public,anon,authenticated,service_role;
