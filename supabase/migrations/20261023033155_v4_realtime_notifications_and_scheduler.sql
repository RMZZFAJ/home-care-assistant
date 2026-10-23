-- Private user channels carry an invalidation counter, never patient data or snapshots.
create table private.workspace_revisions(user_id uuid primary key references public.profiles(id),revision bigint not null default 0);
alter table private.workspace_revisions enable row level security;
revoke all on private.workspace_revisions from public,anon,authenticated,service_role;
create function public.workspace_revision() returns bigint language sql stable security definer set search_path='' as $$
 select coalesce((select revision from private.workspace_revisions where user_id=auth.uid() and private.auth_session() is not null),0);
$$;
create function private.invalidate_workspace() returns trigger language plpgsql security definer set search_path='' as $$
declare row_data jsonb;pid uuid;u uuid;n bigint;begin
 row_data:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 pid:=(row_data->>'care_recipient_id')::uuid;
 for u in select distinct user_id from public.care_recipient_memberships where care_recipient_id=pid and status='active'
 union select (row_data->>'user_id')::uuid where row_data->>'user_id' is not null loop
 insert into private.workspace_revisions(user_id,revision) values(u,1) on conflict(user_id) do update set revision=private.workspace_revisions.revision+1 returning revision into n;
 perform realtime.send(jsonb_build_object('revision',n),'invalidate','hca:user:'||u::text,true);
 end loop;return null;
end;$$;
do $$declare t text;begin foreach t in array array['document_events','stock_movements','requisition_notifications','patient_settings','care_recipient_memberships','capability_overrides','attachments','consumption_reports','care_recipient_products','product_presentations'] loop
 execute format('create trigger v4_workspace_invalidation after insert or update or delete on public.%I for each row execute function private.invalidate_workspace()',t);
end loop;end;$$;
create trigger v4_context_invalidation after insert or update on private.authority_sessions for each row execute function private.invalidate_workspace();
create policy hca_private_user_channel on realtime.messages for select to authenticated using(
 (select realtime.topic())='hca:user:'||(select auth.uid())::text and private.auth_session() is not null);
grant execute on function public.workspace_revision(),private.auth_session() to authenticated;

create table public.notification_event_rules (
 care_recipient_id uuid not null references public.care_recipients(id),event text not null check(event~'^[a-z_]+[.][a-z_.]+$'),
 subject_role text not null check(subject_role in ('admin','family','supervisor','professional','reader')),
 channels text[] not null default array['internal'] check(channels<@array['internal','whatsapp','email']),
 include_pdf boolean not null default true,cooldown_minutes integer not null default 0 check(cooldown_minutes between 0 and 10080),
 quiet_start integer check(quiet_start between 0 and 23),quiet_end integer check(quiet_end between 0 and 23),
 primary key(care_recipient_id,event,subject_role)
);
alter table public.notification_event_rules enable row level security;
revoke all on public.notification_event_rules from public,anon,authenticated,service_role;
grant select on public.notification_event_rules to authenticated;
create policy event_rules_read on public.notification_event_rules for select to authenticated using(public.can_manage_recipient(care_recipient_id));
alter table public.requisition_notifications add column event_key text,add column include_pdf boolean not null default true,
 add column template_name text,add column template_version integer,add column template_snapshot jsonb;
create index notification_recipient_event_recent on public.requisition_notifications(care_recipient_id,recipient_user_id,event_key,created_at desc);

create function public.configure_notification_rule(p_patient uuid,p_event text,p_role text,p_channels text[],p_pdf boolean,p_cooldown integer,p_quiet_start integer default null,p_quiet_end integer default null) returns void
language plpgsql security definer set search_path='' as $$begin
 perform private.require_cap(p_patient,'notifications.manage');
 insert into public.notification_event_rules(care_recipient_id,event,subject_role,channels,include_pdf,cooldown_minutes,quiet_start,quiet_end)
 values(p_patient,p_event,p_role,p_channels,p_pdf,p_cooldown,p_quiet_start,p_quiet_end)
 on conflict(care_recipient_id,event,subject_role) do update set channels=excluded.channels,include_pdf=excluded.include_pdf,cooldown_minutes=excluded.cooldown_minutes,quiet_start=excluded.quiet_start,quiet_end=excluded.quiet_end;
 insert into public.audit_events(actor_id,action,entity_type,metadata) values(auth.uid(),'notification.rule.changed','notification_rule',jsonb_build_object('care_recipient_id',p_patient,'event',p_event,'role',p_role));
end;$$;

create or replace function private.enqueue_document_event() returns trigger language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;m record;s record;rule public.notification_event_rules;channels text[];g text;event_name text;pdf boolean;hour_now integer;begin
 if new.action in ('req.legacy_imported','attachment.reserved','attachment.ready','attachment.rejected') then return new;end if;
 select * into strict d from public.operational_documents where id=new.document_id;
 if d.status='draft' then return new;end if;
 for m in select p.id,p.full_name,p.notification_preferences,v.role from public.profiles p join public.care_recipient_memberships v on v.user_id=p.id and v.care_recipient_id=d.care_recipient_id and v.status='active' where p.status='active' loop
 if not private.member_can(d.care_recipient_id,m.id,lower(d.type)||'.read') then continue;end if;
 event_name:=case when new.action='req.issued' and m.id=d.created_by then 'req.registered_author' else new.action end;
 if new.action='req.science_satisfied' and m.id<>d.created_by and m.role not in ('admin','family') then continue;end if;
 if new.action='req.science_recorded' and m.id<>d.created_by and m.role not in ('admin','family') then continue;end if;
 if new.action like 'req.archived.%' and m.role not in ('admin','family') then continue;end if;
 if new.action='req.reminder' and m.role not in ('admin','family') then continue;end if;
 if new.action='ent.reminder' and m.id<>d.recipient_id then continue;end if;
 select * into rule from public.notification_event_rules where care_recipient_id=d.care_recipient_id and event=event_name and subject_role=m.role::text;
 channels:=case when found then rule.channels else array['internal'] end;
 pdf:=event_name<>'req.registered_author' and coalesce(rule.include_pdf,true);
 if event_name='req.issued' and m.role not in ('admin','family','supervisor') then continue;end if;
 g:=case m.role when 'family' then 'family' when 'supervisor' then 'supervision' when 'professional' then 'care_team' else 'other' end;
 if coalesce(rule.cooldown_minutes,0)>0 and exists(select 1 from public.requisition_notifications where care_recipient_id=d.care_recipient_id and recipient_user_id=m.id and event_key=event_name and created_at>now()-make_interval(mins=>rule.cooldown_minutes)) then continue;end if;
 if 'internal'=any(channels) then
 insert into public.requisition_notifications(care_recipient_id,document_id,document_event_id,recipient_user_id,recipient_group,recipient_label,channel,event_key,include_pdf)
 values(d.care_recipient_id,d.id,new.id,m.id,g,m.full_name,'internal',event_name,pdf);end if;
 hour_now:=extract(hour from now() at time zone 'America/Sao_Paulo');
 if rule.quiet_start is not null and rule.quiet_end is not null and (rule.quiet_start<=rule.quiet_end and hour_now>=rule.quiet_start and hour_now<rule.quiet_end or rule.quiet_start>rule.quiet_end and (hour_now>=rule.quiet_start or hour_now<rule.quiet_end)) then continue;end if;
 for s in select * from public.recipient_notification_settings where care_recipient_id=d.care_recipient_id and recipient_user_id=m.id and is_enabled and channel<>'internal' and channel=any(channels) loop
 if not coalesce((m.notification_preferences->>s.channel)::boolean,false) then continue;end if;
 insert into public.requisition_notifications(care_recipient_id,document_id,document_event_id,recipient_user_id,recipient_group,recipient_label,channel,destination,event_key,include_pdf)
 values(d.care_recipient_id,d.id,new.id,m.id,g,m.full_name,s.channel,s.destination,event_name,pdf);
 end loop;end loop;return new;
end;$$;

create table private.scheduler_health(singleton boolean primary key default true check(singleton),last_run timestamptz,processed integer not null default 0);
alter table private.scheduler_health enable row level security;
revoke all on private.scheduler_health from public,anon,authenticated,service_role;
create function public.run_operational_schedule() returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.requisition_lifecycle;d public.operational_documents;n integer:=0;archived integer:=0;locked_patients uuid[];patient_id uuid;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'worker authorization required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('hca:operational-scheduler',0));
 select array_agg(id order by id) into locked_patients from (select care_recipient_id id,min(due) from (
 select care_recipient_id,next_reminder_at due from public.requisition_lifecycle where archived_at is null
 union all select care_recipient_id,updated_at due from public.operational_documents where type='ENT' and status='pending_receipt') x group by care_recipient_id order by min(due) limit 25) x;
 for patient_id in select unnest(locked_patients) order by 1 loop perform pg_advisory_xact_lock(hashtextextended('stock:'||patient_id,0));end loop;
 for s in select * from public.requisition_lifecycle where archived_at is null and care_recipient_id=any(locked_patients) order by next_reminder_at limit 100 for update skip locked loop
 perform private.refresh_requisition_lifecycle(s.requisition_id);
 select * into s from public.requisition_lifecycle where requisition_id=s.requisition_id;
 select * into d from public.operational_documents where id=s.requisition_id for update;
 if d.status='cancelled' then continue;end if;
 if s.completed_at is not null and not s.manual_archive_required and coalesce(private.science_satisfied(d.id),false)
 and now()>=s.completed_at+make_interval(days=>coalesce((s.policy->>'archiveDays')::integer,7)) then
 update public.requisition_lifecycle set archived_at=now(),archive_reason='Prazo automático após conclusão e ciência válidas' where requisition_id=d.id;
 update public.operational_documents set version=version+1 where id=d.id;
 perform private.record_document_event(d.id,'req.archived.automatic',jsonb_build_object('scheduled',true),gen_random_uuid());archived:=archived+1;
 elsif s.completed_at is null and s.next_reminder_at<=now() then
 update public.requisition_lifecycle set next_reminder_at=now()+make_interval(hours=>coalesce((s.policy->>'reminderRepeatHours')::integer,24)),reminders=reminders+1 where requisition_id=d.id;
 update public.operational_documents set version=version+1 where id=d.id;
 perform private.record_document_event(d.id,'req.reminder',jsonb_build_object('sciencePending',not coalesce(private.science_satisfied(d.id),false)),gen_random_uuid());n:=n+1;
 end if;end loop;
 for d in select * from public.operational_documents where type='ENT' and status='pending_receipt' and care_recipient_id=any(locked_patients)
 and updated_at<now()-interval '24 hours' order by updated_at limit 50 for update skip locked loop
 update public.operational_documents set version=version+1 where id=d.id;
 perform private.record_document_event(d.id,'ent.reminder','{"scheduled":true}',gen_random_uuid());n:=n+1;
 end loop;
 insert into private.scheduler_health(singleton,last_run,processed) values(true,now(),n+archived) on conflict(singleton) do update set last_run=now(),processed=excluded.processed;
 return jsonb_build_object('reminders',n,'archived',archived);
end;$$;
create function public.scheduler_health() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 if not public.is_global_administrator() then raise exception 'global authorization required' using errcode='42501';end if;
 return coalesce((select to_jsonb(h) from private.scheduler_health h),'{}');end;$$;
grant execute on function public.configure_notification_rule(uuid,text,text,text[],boolean,integer,integer,integer),public.scheduler_health() to authenticated;
grant execute on function public.run_operational_schedule() to service_role;
revoke all on function private.invalidate_workspace() from public,anon,authenticated,service_role;
