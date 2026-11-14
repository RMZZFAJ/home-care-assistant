-- P02: the issued material is immutable; event/PDF versions remain technical.
alter table public.requisitions add column material_identity text;
alter table public.requisitions add column material_identity_source text;
alter table public.requisitions add column material_emitted_at timestamptz;
alter table public.requisitions add constraint requisition_material_identity_check check (
 material_identity is null and material_identity_source is null and material_emitted_at is null
 or material_identity is not null and material_identity_source is not null and material_identity ~ '^[0-9a-f]{64}$'
  and material_identity_source in ('issued','historical_import','legacy_projection') and (material_identity_source<>'issued' or material_emitted_at is not null)
);

create function private.requisition_material_fingerprint(p_id uuid)
returns text language sql stable security definer set search_path='' set timezone='UTC' as $$
 select encode(extensions.digest(jsonb_build_object('schema','REQ-material-1',
  'id',r.id,'patientId',r.care_recipient_id,'creator',r.created_by,'protocol',r.protocol,'code',r.code,'createdAt',r.created_at,
  'requester',r.requester_name_snapshot,'patient',r.recipient_name_snapshot,'historical',r.is_historical,'intent',r.request_intent,
  'issuerSnapshot',d.canonical_snapshot->'actors'->'issuer',
  'items',coalesce((select jsonb_agg(to_jsonb(i) order by i.id) from public.requisition_items i where i.requisition_id=r.id),'[]'::jsonb),
  'observations',coalesce((select jsonb_agg(jsonb_build_object('id',o.id,'body',o.body,'createdBy',o.created_by) order by o.id) from public.requisition_observations o where o.requisition_id=r.id),'[]'::jsonb)
 )::text,'sha256'),'hex') from public.requisitions r join public.operational_documents d on d.id=r.id where r.id=p_id;
$$;
-- Backfill only a projection of currently preserved facts, never an old SCI.
update public.requisitions r set material_identity=private.requisition_material_fingerprint(r.id),material_identity_source='legacy_projection',
 material_emitted_at=(select min(e.created_at) from public.document_events e where e.document_id=r.id and e.action='req.issued');

create function private.seal_requisition_material(p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 update public.requisitions set material_identity=private.requisition_material_fingerprint(id),
 material_identity_source=case when is_historical then 'historical_import' else 'issued' end,
 material_emitted_at=case when is_historical then null else clock_timestamp() end where id=p_id and material_identity is null;
end;$$;
create function private.protect_requisition_material()
returns trigger language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if tg_table_name='requisitions' then
  if old.material_identity is not null and (to_jsonb(new)-'status'-'updated_at') is distinct from (to_jsonb(old)-'status'-'updated_at') then
   raise exception 'issued requisition material is immutable' using errcode='23514';end if;
 elsif tg_table_name='operational_documents' then
  if old.type='REQ' and exists(select 1 from public.requisitions where id=old.id and material_identity is not null)
   and (new.payload,new.created_by,new.care_recipient_id,new.type,new.created_at,new.protocol,new.code,new.recipient_id)
    is distinct from (old.payload,old.created_by,old.care_recipient_id,old.type,old.created_at,old.protocol,old.code,old.recipient_id)
   then raise exception 'issued requisition material is immutable' using errcode='23514';end if;
 else
  target:=case when tg_op='DELETE' then old.requisition_id else new.requisition_id end;
  if exists(select 1 from public.requisitions where id=target and material_identity is not null)
   and (tg_op<>'UPDATE' or to_jsonb(new) is distinct from to_jsonb(old)) then
   raise exception 'issued requisition material is immutable' using errcode='23514';end if;
  if tg_op='UPDATE' and new.requisition_id is distinct from old.requisition_id and exists(select 1 from public.requisitions where id=old.requisition_id and material_identity is not null) then
   raise exception 'issued requisition material is immutable' using errcode='23514';end if;
 end if;
 if tg_op='DELETE' then return old;end if;return new;
end;$$;
create trigger phase_d_requisition_material before update on public.requisitions for each row execute function private.protect_requisition_material();
create trigger phase_d_requisition_document_material before update on public.operational_documents for each row execute function private.protect_requisition_material();
create trigger phase_d_requisition_item_material before insert or update or delete on public.requisition_items for each row execute function private.protect_requisition_material();
create trigger phase_d_requisition_note_material before insert or update or delete on public.requisition_observations for each row execute function private.protect_requisition_material();

-- Preserve all legacy rows. Causal dispatches no longer compete with manual SCI.
alter table public.requisition_science_events drop constraint requisition_science_events_requisition_id_user_id_key;
alter table public.requisition_science_events add column material_identity text check(material_identity ~ '^[0-9a-f]{64}$');
alter table public.requisition_science_events add column source_key text check(length(source_key) between 1 and 200);
alter table public.requisition_science_events add column authority_context jsonb;
create unique index requisition_science_cause_key on public.requisition_science_events(requisition_id,user_id,source_key) where source_key is not null;

create function private.requisition_family_representative(p_patient uuid,p_user uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id
  join public.care_recipients c on c.id=m.care_recipient_id left join public.patient_settings s on s.care_recipient_id=m.care_recipient_id
  where m.care_recipient_id=p_patient and m.user_id=p_user and m.status='active' and p.status='active' and c.is_active
  and private.member_can(p_patient,p_user,'req.science')
  and (coalesce(s.settings->'scienceRoles','["admin","family"]'::jsonb) ? m.role::text or coalesce(s.settings->'scienceUsers','[]'::jsonb) ? m.user_id::text));
$$;
create function private.family_science_recorded(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.requisition_science_events e join public.requisitions r on r.id=e.requisition_id
  join public.requisition_lifecycle s on s.requisition_id=r.id where r.id=p_id and (
   e.material_identity=r.material_identity and e.authority_context->>'familyRepresentative'='true'
   or e.material_identity is null and e.user_id=any(s.eligible_users)));
$$;
create or replace function private.science_satisfied(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select not coalesce((s.policy->>'scienceRequired')::boolean,true) or private.family_science_recorded(p_id)
 from public.requisition_lifecycle s where s.requisition_id=p_id;
$$;

create or replace function private.record_science(p_id uuid,p_user uuid,p_mode text,p_evidence jsonb)
returns boolean language plpgsql security definer set search_path='' as $$
declare s public.requisition_lifecycle;r public.requisitions;eid uuid;cause text;authority jsonb;satisfied boolean;
begin
 -- Legacy communication/header evidence stays historical, never a new SCI.
 if p_mode is null or p_mode not in ('express','dispatch') or p_user is distinct from auth.uid() then return false;end if;
 select * into r from public.requisitions where id=p_id;
 if not found or r.is_historical then return false;end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||r.care_recipient_id,0));
 select * into strict s from public.requisition_lifecycle where requisition_id=p_id for update;
 if not coalesce(private.can(r.care_recipient_id,'req.science'),false) or not private.requisition_family_representative(r.care_recipient_id,p_user) then return false;end if;
 if p_mode='dispatch' then
  if not exists(select 1 from public.document_events e join public.operational_documents d on d.id=e.document_id
   where e.document_id=(p_evidence->>'deliveryId')::uuid and e.version=(p_evidence->>'deliveryVersion')::integer
   and d.care_recipient_id=r.care_recipient_id and d.type='ENT' and d.status='pending_receipt'
   and e.action in ('ent.issued','ent.submit') and e.actor_id=p_user
   and exists(select 1 from public.document_request_links k join public.document_lines l on l.id=k.document_line_id join public.requisition_items i on i.id=k.requisition_item_id where l.document_id=d.id and i.requisition_id=p_id))
   then return false;end if;
  cause:='dispatch:'||(p_evidence->>'deliveryId')||':'||(p_evidence->>'deliveryVersion');
 else
  if s.archived_at is not null or exists(select 1 from public.operational_documents where id=p_id and status='cancelled') then return false;end if;
  if exists(select 1 from public.requisition_science_events where requisition_id=p_id and user_id=p_user and material_identity is null and mode='express') then return false;end if;
  cause:='express:'||r.material_identity;
 end if;
 authority:=jsonb_build_object('familyRepresentative',true,'capability','req.science','context',public.my_active_context(),
  'role',(select role from public.care_recipient_memberships where care_recipient_id=r.care_recipient_id and user_id=p_user),
  'governanceVersion',(select version from public.patient_settings where care_recipient_id=r.care_recipient_id));
 insert into public.requisition_science_events(requisition_id,care_recipient_id,user_id,actor_name,mode,evidence,material_identity,source_key,authority_context)
 values(p_id,r.care_recipient_id,p_user,(select full_name from public.profiles where id=p_user),p_mode,p_evidence||jsonb_build_object('materialIdentity',r.material_identity),r.material_identity,cause,authority)
 on conflict(requisition_id,user_id,source_key) where source_key is not null do nothing returning id into eid;
 if eid is null then return false;end if;
 satisfied:=private.science_satisfied(p_id);
 update public.requisition_lifecycle set science_satisfied_at=case when satisfied then coalesce(science_satisfied_at,clock_timestamp()) else science_satisfied_at end where requisition_id=p_id;
 update public.operational_documents set version=version+1 where id=p_id;
 perform private.record_document_event(p_id,case when satisfied and s.science_satisfied_at is null then 'req.science_satisfied' else 'req.science_recorded' end,
  jsonb_build_object('scienceEventId',eid,'userId',p_user,'mode',p_mode,'materialIdentity',r.material_identity,'evidence',p_evidence),gen_random_uuid());
 return true;
end;$$;

create function public.acknowledge_requisition(p_id uuid,p_mode text,p_version integer,p_material_identity text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;r public.requisitions;
begin
 select * into d from public.operational_documents where id=p_id;
 perform private.require_cap(d.care_recipient_id,'req.science');
 perform pg_advisory_xact_lock(hashtextextended('stock:'||d.care_recipient_id,0));
 select * into strict d from public.operational_documents where id=p_id for update;
 select * into strict r from public.requisitions where id=p_id;
 perform private.require_cap(d.care_recipient_id,'req.science');
 if p_mode is distinct from 'express' then raise exception 'invalid science mode' using errcode='22023';end if;
 if p_material_identity is distinct from r.material_identity or p_version is null or p_version<1 or p_version>d.version then raise exception 'stale document material' using errcode='P0001';end if;
 if not private.requisition_family_representative(d.care_recipient_id,auth.uid()) then raise exception 'science permission required' using errcode='42501';end if;
 if exists(select 1 from public.requisition_science_events e where e.requisition_id=p_id and e.user_id=auth.uid() and e.mode='express' and (e.material_identity=r.material_identity or e.material_identity is null)) then return public.requisition_progress(p_id);end if;
 if r.is_historical or d.status='cancelled' or exists(select 1 from public.requisition_lifecycle where requisition_id=p_id and archived_at is not null) then raise exception 'closed requisition science' using errcode='23514';end if;
 perform private.record_science(p_id,auth.uid(),'express',jsonb_build_object('source','authenticated_confirmation','sessionId',private.auth_session(),'seenTechnicalVersion',p_version));
 return public.requisition_progress(p_id);
end;$$;
create or replace function public.acknowledge_requisition(p_id uuid,p_mode text,p_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.requisitions;
begin
 select * into r from public.requisitions where id=p_id;
 perform private.require_cap(r.care_recipient_id,'req.science');
 if p_mode is distinct from 'express' then raise exception 'invalid science mode' using errcode='22023';end if;
 if exists(select 1 from public.requisition_science_events e where e.requisition_id=p_id and e.user_id=auth.uid() and e.mode='express') then return public.requisition_progress(p_id);end if;
 if not exists(select 1 from public.operational_documents where id=p_id and version=p_version) then raise exception 'stale document version' using errcode='P0001';end if;
 return public.acknowledge_requisition(p_id,p_mode,p_version,r.material_identity);
end;$$;
revoke all on function private.requisition_material_fingerprint(uuid),private.seal_requisition_material(uuid),private.protect_requisition_material(),private.requisition_family_representative(uuid,uuid),private.family_science_recorded(uuid),private.science_satisfied(uuid),private.record_science(uuid,uuid,text,jsonb) from public,anon,authenticated,service_role;
revoke all on function public.acknowledge_requisition(uuid,text,integer,text),public.acknowledge_requisition(uuid,text,integer) from public,anon,authenticated,service_role;
grant execute on function public.acknowledge_requisition(uuid,text,integer,text),public.acknowledge_requisition(uuid,text,integer) to authenticated;

CREATE OR REPLACE FUNCTION private.init_requisition_science(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d public.operational_documents;s jsonb;targets uuid[];begin
 select * into strict d from public.operational_documents where id=p_id and type='REQ';
 perform private.seal_requisition_material(p_id);
 if exists(select 1 from public.requisition_lifecycle where requisition_id=p_id) then return;end if;
 select coalesce(settings,'{}') into s from public.patient_settings where care_recipient_id=d.care_recipient_id;
 s:='{"scienceRequired":true,"scienceRoles":["admin","family"],"scienceUsers":[],"scienceRequirement":"any","scienceByDispatch":true,"scienceAutomatic":false,"archiveDays":7,"reminderHours":2,"reminderRepeatHours":24}'::jsonb||coalesce(s,'{}');
 s:=s||jsonb_build_object('scienceRequirement','any','scienceByDispatch',true,'policyVersion',(select version from public.patient_settings where care_recipient_id=d.care_recipient_id),'policySource','emission');
 select coalesce(array_agg(m.user_id),'{}') into targets from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id
 where m.care_recipient_id=d.care_recipient_id and m.status='active' and p.status='active'
 and (s->'scienceRoles' ? m.role::text or s->'scienceUsers' ? m.user_id::text) and private.member_can(d.care_recipient_id,m.user_id,'req.science');
 insert into public.requisition_lifecycle(requisition_id,care_recipient_id,policy,eligible_users,next_reminder_at)
 values(p_id,d.care_recipient_id,s,targets,now()+make_interval(hours=>(s->>'reminderHours')::integer));
end;$function$;

CREATE OR REPLACE FUNCTION private.science_snapshot()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d public.operational_documents;begin
 select * into strict d from public.operational_documents where id=new.document_id;
 new.actor_name:=(select full_name from public.profiles where id=new.actor_id);
 new.authority_context:=case when new.actor_id is null then jsonb_build_object('mode','system') else coalesce(public.my_active_context(),(select jsonb_build_object('mode','verified_external','purpose',w.purpose) from private.worker_authority w where w.backend_pid=pg_backend_pid() and w.transaction_id=txid_current() and w.user_id=new.actor_id)) end;
 new.body:=new.body||jsonb_build_object('actorName',new.actor_name,'authority',new.authority_context,
 'history',coalesce((select jsonb_agg(jsonb_build_object('action',e.action,'actorName',coalesce(e.actor_name,e.body->>'actorName',case when e.actor_id is null then 'Sistema' else 'Identidade registrada no evento legado' end),'createdAt',e.created_at,'version',e.version) order by e.version) from public.document_events e where document_id=new.document_id),'[]')||jsonb_build_array(jsonb_build_object('action',new.action,'actorName',coalesce(new.actor_name,'Sistema'),'createdAt',new.created_at,'version',new.version)));
 if d.type='REQ' then
 perform private.seal_requisition_material(new.document_id);
 new.body:=new.body||(select jsonb_build_object('materialIdentity',material_identity,'materialIdentitySource',material_identity_source,'materialEmittedAt',material_emitted_at) from public.requisitions where id=new.document_id);
 if new.action='req.issued' then perform private.init_requisition_science(new.document_id);end if;
 new.body:=new.body||jsonb_build_object('isHistorical',coalesce((select r.is_historical from public.requisitions r where r.id=d.id),false),'sciencePolicy',(select to_jsonb(s)||jsonb_build_object('familyAware',private.family_science_recorded(new.document_id),'effectiveRequirement','any') from public.requisition_lifecycle s where requisition_id=new.document_id),
 'scienceEvents',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at,e.id) from public.requisition_science_events e where requisition_id=new.document_id),'[]'),
 'fulfillmentLines',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'attended',exists(select 1 from public.document_request_links k join public.document_lines l on l.id=k.document_line_id join public.operational_documents x on x.id=l.document_id where k.requisition_item_id=i.id and x.type='ENT' and x.status<>'cancelled' and l.accepted_quantity>0))) from public.requisition_items i where i.requisition_id=d.id),'[]'));
 end if;
 new.content_hash:=encode(extensions.digest(new.body::text,'sha256'),'hex');
 update public.operational_documents set canonical_snapshot=new.body,content_hash=new.content_hash where id=new.document_id;
 return new;
end;$function$;

CREATE OR REPLACE FUNCTION private.delivery_science_and_progress()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d public.operational_documents;r record;s public.requisition_lifecycle;begin
 select * into d from public.operational_documents where id=new.document_id;
 if d.type<>'ENT' then return new;end if;
 for r in select distinct i.requisition_id from public.document_request_links k join public.document_lines l on l.id=k.document_line_id join public.requisition_items i on i.id=k.requisition_item_id where l.document_id=d.id loop
 select * into s from public.requisition_lifecycle where requisition_id=r.requisition_id;
 if new.action in ('ent.issued','ent.submit') and d.status='pending_receipt' and new.actor_id is not null and new.actor_id=auth.uid()
 and private.can(d.care_recipient_id,'req.science') and private.requisition_family_representative(d.care_recipient_id,new.actor_id) then
 perform private.record_science(r.requisition_id,new.actor_id,'dispatch',jsonb_build_object('deliveryId',d.id,'deliveryVersion',new.version,'sessionId',private.auth_session()));end if;
 perform private.refresh_requisition_lifecycle(r.requisition_id);
 end loop;return new;
end;$function$;

CREATE OR REPLACE FUNCTION public.requisition_progress(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare s public.requisition_lifecycle;d public.operational_documents;begin
 select * into d from public.operational_documents where id=p_id;
 if not private.can(d.care_recipient_id,'req.read') then raise exception 'required permission' using errcode='42501';end if;
 select * into s from public.requisition_lifecycle where requisition_id=p_id;
 return jsonb_build_object('materialIdentity',(select material_identity from public.requisitions where id=p_id),
 'familyAware',private.family_science_recorded(p_id),'personalScience',exists(select 1 from public.requisition_science_events where requisition_id=p_id and user_id=auth.uid()),
 'designationPending',not exists(select 1 from public.care_recipient_memberships m where m.care_recipient_id=d.care_recipient_id and private.requisition_family_representative(d.care_recipient_id,m.user_id)),
 'effectiveScienceRequirement','any','version',d.version,'preferences',(select notification_preferences from public.profiles where id=auth.uid()),'science',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at,e.id) from public.requisition_science_events e where requisition_id=p_id),'[]'),
 'scienceSatisfied',coalesce(private.science_satisfied(p_id),false),'eligible',private.requisition_family_representative(d.care_recipient_id,auth.uid()),
 'policy',s.policy,'completedAt',s.completed_at,'manualArchiveRequired',s.manual_archive_required,'archivedAt',s.archived_at,'archiveReason',s.archive_reason,
 'events',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'action',e.action,'createdAt',e.created_at,'actorId',e.actor_id,'actorName',coalesce(e.actor_name,e.body->>'actorName',case when e.actor_id is null then 'Sistema' else 'Identidade do registro legado' end),'version',e.version) order by e.version)
 from public.document_events e left join public.profiles p on p.id=e.actor_id where e.document_id=p_id),'[]'));
end;$function$;

CREATE OR REPLACE FUNCTION public.configure_patient_access(p_patient uuid, p_kind text, p_change jsonb, p_key uuid, p_version integer, p_request_id uuid DEFAULT NULL::uuid, p_decision text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare c public.access_change_requests;result jsonb;begin
 if p_kind='settings' and (p_change->'scienceByDispatch'='false'::jsonb or p_change->>'scienceRequirement'='all') then
  raise exception 'science requires ANY and mandatory dispatch' using errcode='22023';end if;
 if p_request_id is not null and p_decision='approve' then
 if not public.can_manage_recipient(p_patient) then raise exception 'local administrator required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
 select * into strict c from public.access_change_requests where id=p_request_id and care_recipient_id=p_patient for update;
 if c.status='pending' and c.kind='settings' and (c.proposed->'scienceByDispatch'='false'::jsonb or c.proposed->>'scienceRequirement'='all') then
  raise exception 'science requires ANY and mandatory dispatch' using errcode='22023';end if;
 if c.proposed_by=auth.uid() then raise exception 'distinct patient administrator required' using errcode='42501';end if;
 if c.status='pending' and c.kind='membership' and not exists(select 1 from public.care_recipient_memberships where care_recipient_id=p_patient and user_id=(c.proposed->>'userId')::uuid and status='active') then
 if coalesce(p_change->>'invitationTokenHash','')!~'^[0-9a-f]{64}$' then raise exception 'recipient invitation acceptance required' using errcode='23514';end if;
 insert into private.membership_invitation_intents values(pg_backend_pid(),txid_current(),c.id,p_change->>'invitationTokenHash');
 end if;end if;
 result:=public.v4_review_patient_access(p_patient,p_kind,p_change,p_key,p_version,p_request_id,p_decision);
 delete from private.membership_invitation_intents where backend_pid=pg_backend_pid() and transaction_id=txid_current();return result;
exception when sqlstate 'P0001' then
 -- A stale client revision cannot succeed through a database transaction retry.
 -- Keep real serialization failures untouched; expose this logical conflict once.
 if sqlerrm='stale policy version' then raise exception 'stale policy version' using errcode='PT409';end if;
 raise;
end;$function$;


-- Record the effective ANY transition without editing a legacy SCI or PDF.
do $$declare r record;missing boolean;begin
 for r in select q.id from public.requisitions q left join public.requisition_lifecycle s on s.requisition_id=q.id
  where not q.is_historical and (s.requisition_id is null or s.policy->>'scienceRequirement'='all') loop
  missing:=not exists(select 1 from public.requisition_lifecycle where requisition_id=r.id);
  if missing then
   perform private.init_requisition_science(r.id);
   update public.requisition_lifecycle set policy=policy||jsonb_build_object('policySource','legacy_recovered_at_upgrade','policyCapturedAt',clock_timestamp()) where requisition_id=r.id;
  end if;
  update public.requisition_lifecycle set science_satisfied_at=case when private.family_science_recorded(r.id) then coalesce(science_satisfied_at,clock_timestamp()) else science_satisfied_at end where requisition_id=r.id;
  update public.operational_documents set version=version+1 where id=r.id;
  perform private.record_document_event(r.id,'req.science_requirement_changed',jsonb_build_object('source','P02_OWNER_APPROVED','effectiveRequirement','any','recoveredMissingPolicy',missing,'newPersonalScience',false),gen_random_uuid());
 end loop;
end;$$;
revoke all on function private.init_requisition_science(uuid),private.science_snapshot(),private.delivery_science_and_progress() from public,anon,authenticated,service_role;
