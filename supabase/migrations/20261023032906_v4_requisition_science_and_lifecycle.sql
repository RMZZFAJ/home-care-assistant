insert into public.capability_definitions(code,default_roles,critical) values
 ('req.science',array['admin','family'],false),('req.archive',array['admin'],true);

create table public.requisition_lifecycle (
 requisition_id uuid primary key references public.requisitions(id),care_recipient_id uuid not null references public.care_recipients(id),
 policy jsonb not null,eligible_users uuid[] not null,science_satisfied_at timestamptz,
 completed_at timestamptz,manual_archive_required boolean not null default false,
 archived_at timestamptz,archived_by uuid references public.profiles(id),archive_reason text,
 next_reminder_at timestamptz not null default now()+interval '2 hours',reminders integer not null default 0
);
create table public.requisition_science_events (
 id uuid primary key default gen_random_uuid(),requisition_id uuid not null references public.requisitions(id),
 care_recipient_id uuid not null references public.care_recipients(id),user_id uuid not null references public.profiles(id),
 actor_name text not null,mode text not null check(mode in ('express','app_visible','whatsapp_read','whatsapp_confirm','dispatch')),
 evidence jsonb not null,created_at timestamptz not null default now(),unique(requisition_id,user_id)
);
create trigger immutable_science before update or delete on public.requisition_science_events for each row execute function private.immutable_event();
alter table public.requisition_lifecycle enable row level security;
alter table public.requisition_science_events enable row level security;
revoke all on public.requisition_lifecycle,public.requisition_science_events from public,anon,authenticated,service_role;
grant select on public.requisition_lifecycle,public.requisition_science_events to authenticated;
create policy lifecycle_read on public.requisition_lifecycle for select to authenticated using(private.can(care_recipient_id,'req.read'));
create policy science_read on public.requisition_science_events for select to authenticated using(private.can(care_recipient_id,'req.read'));

create function private.init_requisition_science(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;s jsonb;targets uuid[];begin
 select * into strict d from public.operational_documents where id=p_id and type='REQ';
 if exists(select 1 from public.requisition_lifecycle where requisition_id=p_id) then return;end if;
 select coalesce(settings,'{}') into s from public.patient_settings where care_recipient_id=d.care_recipient_id;
 s:='{"scienceRequired":true,"scienceRoles":["admin","family"],"scienceUsers":[],"scienceRequirement":"any","scienceByDispatch":true,"scienceAutomatic":false,"archiveDays":7,"reminderHours":2,"reminderRepeatHours":24}'::jsonb||coalesce(s,'{}');
 select coalesce(array_agg(m.user_id),'{}') into targets from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id
 where m.care_recipient_id=d.care_recipient_id and m.status='active' and p.status='active'
 and (s->'scienceRoles' ? m.role::text or s->'scienceUsers' ? m.user_id::text) and private.member_can(d.care_recipient_id,m.user_id,'req.science');
 insert into public.requisition_lifecycle(requisition_id,care_recipient_id,policy,eligible_users,next_reminder_at)
 values(p_id,d.care_recipient_id,s,targets,now()+make_interval(hours=>(s->>'reminderHours')::integer));
end;$$;
-- Legacy records are marked as reconstructed; no historical acknowledgement is invented.
do $$declare d record;begin for d in select id from public.operational_documents where type='REQ' loop
 perform private.init_requisition_science(d.id);
 update public.requisition_lifecycle set policy=policy||'{"legacyReconstructed":true}' where requisition_id=d.id;
end loop;end;$$;

create function private.science_satisfied(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select case when not coalesce((s.policy->>'scienceRequired')::boolean,true) then true
 when s.policy->>'scienceRequirement'='all' then cardinality(s.eligible_users)>0 and not exists(select 1 from unnest(s.eligible_users) u where not exists(select 1 from public.requisition_science_events e where e.requisition_id=p_id and e.user_id=u))
 else exists(select 1 from public.requisition_science_events e where e.requisition_id=p_id and e.user_id=any(s.eligible_users)) end
 from public.requisition_lifecycle s where s.requisition_id=p_id;
$$;
create function private.record_science(p_id uuid,p_user uuid,p_mode text,p_evidence jsonb) returns boolean
language plpgsql security definer set search_path='' as $$
declare s public.requisition_lifecycle;is_satisfied boolean;eid uuid;patient_id uuid;begin
 select care_recipient_id into patient_id from public.requisition_lifecycle where requisition_id=p_id;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||patient_id,0));
 select * into strict s from public.requisition_lifecycle where requisition_id=p_id for update;
 if s.archived_at is not null or not(p_user=any(s.eligible_users)) or not private.member_can(s.care_recipient_id,p_user,'req.science') then return false;end if;
 insert into public.requisition_science_events(requisition_id,care_recipient_id,user_id,actor_name,mode,evidence)
 values(p_id,s.care_recipient_id,p_user,(select full_name from public.profiles where id=p_user),p_mode,p_evidence)
 on conflict(requisition_id,user_id) do nothing returning id into eid;
 if eid is null then return false;end if;
 is_satisfied:=private.science_satisfied(p_id);
 update public.requisition_lifecycle set science_satisfied_at=case when is_satisfied then coalesce(science_satisfied_at,now()) else science_satisfied_at end where requisition_id=p_id;
 update public.operational_documents set version=version+1 where id=p_id;
 perform private.record_document_event(p_id,case when is_satisfied and s.science_satisfied_at is null then 'req.science_satisfied' else 'req.science_recorded' end,
 jsonb_build_object('scienceEventId',eid,'userId',p_user,'mode',p_mode,'evidence',p_evidence),gen_random_uuid());
 return true;
end;$$;
create function public.requisition_progress(p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare s public.requisition_lifecycle;d public.operational_documents;begin
 select * into d from public.operational_documents where id=p_id;
 if not private.can(d.care_recipient_id,'req.read') then raise exception 'required permission' using errcode='42501';end if;
 select * into s from public.requisition_lifecycle where requisition_id=p_id;
 return jsonb_build_object('version',d.version,'preferences',(select notification_preferences from public.profiles where id=auth.uid()),'science',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at,e.id) from public.requisition_science_events e where requisition_id=p_id),'[]'),
 'scienceSatisfied',coalesce(private.science_satisfied(p_id),false),'eligible',auth.uid()=any(s.eligible_users),
 'policy',s.policy,'completedAt',s.completed_at,'manualArchiveRequired',s.manual_archive_required,'archivedAt',s.archived_at,'archiveReason',s.archive_reason,
 'events',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'action',e.action,'createdAt',e.created_at,'actorId',e.actor_id,'actorName',coalesce(e.actor_name,e.body->>'actorName',case when e.actor_id is null then 'Sistema' else 'Identidade do registro legado' end),'version',e.version) order by e.version)
 from public.document_events e left join public.profiles p on p.id=e.actor_id where e.document_id=p_id),'[]'));
end;$$;
create function public.acknowledge_requisition(p_id uuid,p_mode text,p_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.requisition_lifecycle;pref jsonb;d public.operational_documents;begin
 select * into d from public.operational_documents where id=p_id;
 perform private.require_cap(d.care_recipient_id,'req.science');
 perform pg_advisory_xact_lock(hashtextextended('stock:'||d.care_recipient_id,0));
 select * into d from public.operational_documents where id=p_id for update;
 select * into strict s from public.requisition_lifecycle where requisition_id=p_id for update;
 if exists(select 1 from public.requisition_science_events where requisition_id=p_id and user_id=auth.uid()) then return public.requisition_progress(p_id);end if;
 if d.status='cancelled' or d.version<>p_version then raise exception 'stale document version' using errcode='40001';end if;
 select notification_preferences into pref from public.profiles where id=auth.uid();
 if p_mode='express' then
 if not coalesce((pref->>'scienceExpress')::boolean,true) then raise exception 'express science disabled';end if;
 elsif p_mode='app_visible' then
 if not coalesce((pref->>'scienceAutomatic')::boolean,false) or not coalesce((s.policy->>'scienceAutomatic')::boolean,false) then raise exception 'automatic science disabled';end if;
 else raise exception 'invalid science mode';end if;
 if not(auth.uid()=any(s.eligible_users)) then raise exception 'science permission required' using errcode='42501';end if;
 perform private.record_science(p_id,auth.uid(),p_mode,jsonb_build_object('sessionId',private.auth_session(),'documentVersion',p_version,'source',case when p_mode='express' then 'authenticated_confirmation' else 'visible_content_loaded' end));
 return public.requisition_progress(p_id);
end;$$;

create function private.refresh_requisition_lifecycle(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare s public.requisition_lifecycle;total integer;fulfilled integer;blocked boolean;begin
 select * into s from public.requisition_lifecycle where requisition_id=p_id for update;
 if not found then return;end if;
 select count(*),count(*) filter(where exists(select 1 from public.document_request_links k join public.document_lines l on l.id=k.document_line_id join public.operational_documents d on d.id=l.document_id
 where k.requisition_item_id=i.id and d.type='ENT' and d.status<>'cancelled' and l.accepted_quantity>0)) into total,fulfilled
 from public.requisition_items i where i.requisition_id=p_id;
 select exists(select 1 from public.document_request_links k join public.requisition_items i on i.id=k.requisition_item_id join public.document_lines l on l.id=k.document_line_id join public.operational_documents d on d.id=l.document_id
 where i.requisition_id=p_id and d.type='ENT' and (d.status='cancellation_pending' or coalesce((l.metadata->>'issueOpen')::boolean,false))) into blocked;
 if total>0 and total=fulfilled and not blocked then
 if s.completed_at is null then
 update public.requisition_lifecycle set completed_at=now(),manual_archive_required=manual_archive_required or not coalesce(private.science_satisfied(p_id),false) where requisition_id=p_id;
 update public.operational_documents set version=version+1 where id=p_id;
 perform private.record_document_event(p_id,'req.completed',jsonb_build_object('fulfilled',fulfilled,'total',total,'sciencePending',not coalesce(private.science_satisfied(p_id),false)),gen_random_uuid());end if;
 elsif s.completed_at is not null then
 update public.requisition_lifecycle set completed_at=null,manual_archive_required=true,archived_at=null,archived_by=null,archive_reason=null where requisition_id=p_id;
 update public.operational_documents set version=version+1 where id=p_id;
 perform private.record_document_event(p_id,'req.reopened',jsonb_build_object('fulfilled',fulfilled,'total',total,'operationalIssue',blocked,'previousArchivedAt',s.archived_at,'previousArchiveReason',s.archive_reason),gen_random_uuid());
 end if;
end;$$;
create function public.archive_requisition(p_id uuid,p_reason text) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.requisition_lifecycle;begin
 select * into strict s from public.requisition_lifecycle where requisition_id=p_id;
 if not public.can_manage_recipient(s.care_recipient_id) then raise exception 'local administrator required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||s.care_recipient_id,0));
 select * into strict s from public.requisition_lifecycle where requisition_id=p_id for update;
 if length(trim(coalesce(p_reason,''))) not between 3 and 1000 then raise exception 'archive reason required';end if;
 perform private.refresh_requisition_lifecycle(p_id);
 select * into s from public.requisition_lifecycle where requisition_id=p_id;
 if s.archived_at is not null then return public.requisition_progress(p_id);end if;
 if s.completed_at is null then raise exception 'operational completion required';end if;
 update public.requisition_lifecycle set archived_at=now(),archived_by=auth.uid(),archive_reason=trim(p_reason) where requisition_id=p_id;
 update public.operational_documents set version=version+1 where id=p_id;
 perform private.record_document_event(p_id,'req.archived.manual',jsonb_build_object('reason',trim(p_reason),'scienceSatisfied',private.science_satisfied(p_id)),gen_random_uuid());
 return public.requisition_progress(p_id);
end;$$;

create function private.science_snapshot() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from public.operational_documents where id=new.document_id and type='REQ') then
 if new.action='req.issued' then perform private.init_requisition_science(new.document_id);end if;
 new.body:=new.body||jsonb_build_object('sciencePolicy',(select to_jsonb(s) from public.requisition_lifecycle s where requisition_id=new.document_id),
 'scienceEvents',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at,e.id) from public.requisition_science_events e where requisition_id=new.document_id),'[]'));
 new.content_hash:=encode(extensions.digest(new.body::text,'sha256'),'hex');
 update public.operational_documents set canonical_snapshot=new.body,content_hash=new.content_hash where id=new.document_id;
 end if;return new;
end;$$;
create trigger v4_science_snapshot before insert on public.document_events for each row execute function private.science_snapshot();
create function private.delivery_science_and_progress() returns trigger language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;r record;s public.requisition_lifecycle;begin
 select * into d from public.operational_documents where id=new.document_id;
 if d.type<>'ENT' then return new;end if;
 for r in select distinct i.requisition_id from public.document_request_links k join public.document_lines l on l.id=k.document_line_id join public.requisition_items i on i.id=k.requisition_item_id where l.document_id=d.id loop
 select * into s from public.requisition_lifecycle where requisition_id=r.requisition_id;
 if new.action in ('ent.issued','ent.submit') and coalesce((s.policy->>'scienceByDispatch')::boolean,true)
 and d.status='pending_receipt' and auth.uid()=d.created_by and auth.uid()=any(s.eligible_users) then
 perform private.record_science(r.requisition_id,auth.uid(),'dispatch',jsonb_build_object('deliveryId',d.id,'deliveryVersion',new.version,'sessionId',private.auth_session()));end if;
 perform private.refresh_requisition_lifecycle(r.requisition_id);
 end loop;return new;
end;$$;
create trigger v4_delivery_progress after insert on public.document_events for each row execute function private.delivery_science_and_progress();

-- Shared needs never split or duplicate the physical credit; links require an explicit reason.
create function private.validate_shared_need(p_payload jsonb) returns void language plpgsql set search_path='' as $$
declare x jsonb;begin
 for x in select value from jsonb_array_elements(coalesce(p_payload->'lines','[]')) loop
 if jsonb_array_length(coalesce(x->'requisitionItemIds','[]'))>1 and length(trim(coalesce(x->'metadata'->>'sharedNeedReason',''))) not between 3 and 500 then raise exception 'shared need justification required';end if;
 end loop;
end;$$;
alter function public.create_supply_document(uuid,text,jsonb,uuid,boolean) rename to v3_create_supply_document;
revoke all on function public.v3_create_supply_document(uuid,text,jsonb,uuid,boolean) from public,anon,authenticated,service_role;
create function public.create_supply_document(p_patient uuid,p_type text,p_payload jsonb,p_key uuid,p_draft boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
begin perform private.validate_shared_need(p_payload);return public.v3_create_supply_document(p_patient,p_type,p_payload,p_key,p_draft);end;$$;
alter function public.revise_supply_document(uuid,jsonb,uuid,integer,boolean) rename to v3_revise_supply_document;
revoke all on function public.v3_revise_supply_document(uuid,jsonb,uuid,integer,boolean) from public,anon,authenticated,service_role;
create function public.revise_supply_document(p_id uuid,p_payload jsonb,p_key uuid,p_version integer,p_recount boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
begin perform private.validate_shared_need(p_payload);return public.v3_revise_supply_document(p_id,p_payload,p_key,p_version,p_recount);end;$$;
grant execute on function public.create_supply_document(uuid,text,jsonb,uuid,boolean),public.revise_supply_document(uuid,jsonb,uuid,integer,boolean),public.requisition_progress(uuid),public.acknowledge_requisition(uuid,text,integer),public.archive_requisition(uuid,text) to authenticated;
-- Existing drafts cannot be used later to bypass an archived/cancelled REQ.
create function private.guard_closed_request_links() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='document_request_links' then
 if exists(select 1 from public.requisition_items i join public.operational_documents d on d.id=i.requisition_id left join public.requisition_lifecycle s on s.requisition_id=d.id where i.id=new.requisition_item_id and (d.status='cancelled' or s.archived_at is not null)) then raise exception 'closed requisition cannot receive new links';end if;
 elsif new.type in ('COM','ENT') and new.status<>'draft' and old.status='draft' then
 if exists(select 1 from public.document_lines l join public.document_request_links k on k.document_line_id=l.id join public.requisition_items i on i.id=k.requisition_item_id join public.operational_documents d on d.id=i.requisition_id left join public.requisition_lifecycle s on s.requisition_id=d.id where l.document_id=new.id and (d.status='cancelled' or s.archived_at is not null)) then raise exception 'closed requisition cannot be dispatched';end if;
 end if;return new;
end;$$;
create trigger v4_closed_request_link before insert on public.document_request_links for each row execute function private.guard_closed_request_links();
create trigger v4_closed_request_dispatch before update of status on public.operational_documents for each row execute function private.guard_closed_request_links();
revoke all on function private.guard_closed_request_links() from public,anon,authenticated,service_role;
revoke all on function private.init_requisition_science(uuid),private.science_satisfied(uuid),private.record_science(uuid,uuid,text,jsonb),private.refresh_requisition_lifecycle(uuid),private.science_snapshot(),private.delivery_science_and_progress(),private.validate_shared_need(jsonb) from public,anon,authenticated,service_role;
