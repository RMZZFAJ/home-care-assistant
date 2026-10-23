alter table public.notification_event_rules add column mode text not null default 'optional' check(mode in ('required','optional','silent'));
create table public.operational_reminders (
 id uuid primary key default gen_random_uuid(),care_recipient_id uuid not null references public.care_recipients(id),user_id uuid not null references public.profiles(id),
 kind text not null check(kind in ('bal','shift')),period date not null,expected_at timestamptz not null,
 acknowledged_at timestamptz,created_at timestamptz not null default now(),unique(care_recipient_id,user_id,kind,period)
);
alter table public.operational_reminders enable row level security;
revoke all on public.operational_reminders from public,anon,authenticated,service_role;
grant select on public.operational_reminders to authenticated;
create policy reminders_read on public.operational_reminders for select to authenticated using(public.can_access_recipient(care_recipient_id) and (user_id=auth.uid() or public.can_manage_recipient(care_recipient_id)));
alter table public.requisition_notifications add column consumption_report_id uuid references public.consumption_reports(id),
 add column reminder_id uuid references public.operational_reminders(id),add column silent boolean not null default false;
alter table public.requisition_notifications drop constraint notification_event_kind;
alter table public.requisition_notifications add constraint notification_event_kind check(num_nonnulls(requisition_id,alert_event_id,document_id,consumption_report_id,reminder_id)=1);
create unique index notification_report_once on public.requisition_notifications(consumption_report_id,recipient_user_id,channel,event_key) where consumption_report_id is not null;
create unique index notification_reminder_once on public.requisition_notifications(reminder_id,recipient_user_id,channel) where reminder_id is not null;
-- Alert snapshots retain decimal quantities as faithfully as the ledger.
alter table public.stock_alert_events alter column balance type numeric(18,6);
alter table public.stock_alert_events add column observed_at timestamptz;

create or replace function public.evaluate_stock_alert(p_patient uuid,p_product text,p_location text) returns void language plpgsql security definer set search_path='' as $$
declare r public.stock_alert_rules;e public.stock_alert_events;balance_now numeric;severity_now text;eid uuid;begin
 if p_location is null then return;end if;
 select * into r from public.stock_alert_rules where care_recipient_id=p_patient and product_id=p_product and location=p_location;
 select * into e from public.stock_alert_events where care_recipient_id=p_patient and product_id=p_product and location=p_location and state='open' for update;
 select coalesce(balance,0) into balance_now from public.current_stock_balances where care_recipient_id=p_patient and product_id=p_product and location=p_location;balance_now:=coalesce(balance_now,0);
 if r.is_enabled then severity_now:=case when balance_now<=r.critical_threshold then 'critical' when balance_now<=r.low_threshold then 'low' end;end if;
 if e.id is not null and e.severity is not distinct from severity_now then update public.stock_alert_events set balance=balance_now,observed_at=now() where id=e.id;return;end if;
 if e.id is not null then update public.stock_alert_events set state='resolved',balance=balance_now,observed_at=now(),resolved_at=now() where id=e.id;end if;
 if severity_now is not null then
 insert into public.stock_alert_events(care_recipient_id,product_id,location,severity,balance,observed_at) values(p_patient,p_product,p_location,severity_now,balance_now,now()) returning id into eid;
 perform public.enqueue_patient_event(p_patient,null,eid);end if;
end;$$;

create function private.enqueue_notice(p_patient uuid,p_user uuid,p_event text,p_document uuid default null,p_document_event uuid default null,p_alert uuid default null,p_report uuid default null,p_reminder uuid default null,p_pdf boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare person public.profiles;m public.care_recipient_memberships;r public.notification_event_rules;channels text[];v_channel text;destination text;due timestamptz:=now();local_now timestamp:=now() at time zone 'America/Sao_Paulo';h integer;g text;required boolean;begin
 select * into person from public.profiles where id=p_user and status='active';if not found then return;end if;
 select * into m from public.care_recipient_memberships where care_recipient_id=p_patient and user_id=p_user and status='active';if not found then return;end if;
 select * into r from public.notification_event_rules where care_recipient_id=p_patient and event=p_event and subject_role=m.role::text;
 channels:=case when found then r.channels else array['internal'] end;
 required:=r.mode='required';if required and not('internal'=any(channels)) then channels:=array_append(channels,'internal');end if;
 if r.mode='silent' then channels:=array['internal'];end if;
 g:=case m.role when 'family' then 'family' when 'supervisor' then 'supervision' when 'professional' then 'care_team' else 'other' end;
 h:=extract(hour from local_now);
 if r.quiet_start is not null and r.quiet_end is not null and (r.quiet_start<=r.quiet_end and h>=r.quiet_start and h<r.quiet_end or r.quiet_start>r.quiet_end and (h>=r.quiet_start or h<r.quiet_end)) then
 due:=(date_trunc('day',local_now)+make_interval(hours=>r.quiet_end)+case when r.quiet_start>r.quiet_end and h>=r.quiet_start then interval '1 day' else interval '0' end) at time zone 'America/Sao_Paulo';end if;
 foreach v_channel in array channels loop
 if v_channel='internal' then
 if not coalesce(required,false) and not coalesce((person.notification_preferences->>'internal')::boolean,true) then continue;end if;
 destination:=null;
 else
 if not coalesce((person.notification_preferences->>v_channel)::boolean,false) then continue;end if;
 select s.destination into destination from public.recipient_notification_settings s where care_recipient_id=p_patient and recipient_user_id=p_user and s.channel=v_channel and is_enabled;
 if destination is null then continue;end if;
 if v_channel='whatsapp' and not exists(select 1 from public.verified_phones v join auth.users u on u.id=v.user_id where v.user_id=p_user and '+'||ltrim(u.phone,'+')=v.phone and u.phone_confirmed_at is not null and ltrim(v.phone,'+')=ltrim(destination,'+')) then continue;end if;
 end if;
 if coalesce(r.cooldown_minutes,0)>0 and exists(select 1 from public.requisition_notifications n where n.care_recipient_id=p_patient and n.recipient_user_id=p_user and n.event_key=p_event and n.channel=v_channel
 and coalesce(n.document_id,n.alert_event_id,n.consumption_report_id,n.reminder_id)=coalesce(p_document,p_alert,p_report,p_reminder) and n.created_at>now()-make_interval(mins=>r.cooldown_minutes)) then continue;end if;
 insert into public.requisition_notifications(care_recipient_id,document_id,document_event_id,alert_event_id,consumption_report_id,reminder_id,recipient_user_id,recipient_group,recipient_label,channel,destination,event_key,include_pdf,next_attempt_at,silent)
 values(p_patient,p_document,p_document_event,p_alert,p_report,p_reminder,p_user,g,person.full_name,v_channel,destination,p_event,p_event<>'req.registered_author' and p_pdf,case when v_channel='internal' then now() else due end,coalesce(r.mode='silent',false)) on conflict do nothing;
 end loop;
end;$$;

create or replace function private.enqueue_document_event() returns trigger language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;m record;event_name text;pdf boolean;begin
 if new.action in ('req.legacy_imported','attachment.reserved','attachment.ready','attachment.rejected','attachment.bound') then return new;end if;
 select * into strict d from public.operational_documents where id=new.document_id;if d.status='draft' then return new;end if;
 for m in select user_id,role from public.care_recipient_memberships where care_recipient_id=d.care_recipient_id and status='active' loop
 if not private.member_can(d.care_recipient_id,m.user_id,lower(d.type)||'.read') then continue;end if;
 if m.role='reader' and not exists(select 1 from public.notification_event_rules where care_recipient_id=d.care_recipient_id and event=new.action and subject_role='reader' and cardinality(channels)>0) then continue;end if;
 if new.action in ('ent.issued','ent.submit') and m.role in ('professional','supervisor') and m.user_id<>d.recipient_id then continue;end if;
 if new.action in ('req.science_satisfied','req.science_recorded') and m.user_id<>d.created_by and m.role not in ('admin','family') then continue;end if;
 if new.action like 'req.archived.%' and m.role not in ('admin','family') then continue;end if;
 if new.action='req.reminder' and m.role not in ('admin','family') then continue;end if;
 if new.action='ent.reminder' and m.user_id<>d.recipient_id then continue;end if;
 if new.action='req.issued' and m.user_id<>d.created_by and m.role not in ('admin','family','supervisor') then continue;end if;
 event_name:=case when new.action='req.issued' and m.user_id=d.created_by then 'req.registered_author' else new.action end;
 select coalesce(include_pdf,true) into pdf from public.notification_event_rules where care_recipient_id=d.care_recipient_id and event=event_name and subject_role=m.role::text;
 if event_name='req.science_satisfied' and m.user_id=d.created_by then pdf:=true;end if;
 perform private.enqueue_notice(d.care_recipient_id,m.user_id,event_name,d.id,new.id,null,null,null,coalesce(pdf,true));
 end loop;return new;
end;$$;

create function private.report_notice() returns trigger language plpgsql security definer set search_path='' as $$
declare m record;begin
 for m in select user_id from public.care_recipient_memberships where care_recipient_id=new.care_recipient_id and status='active' and (user_id=new.reported_by or private.member_can(new.care_recipient_id,user_id,'consumption.confirm')) loop
 perform private.enqueue_notice(new.care_recipient_id,m.user_id,'occurrence.received',null,null,null,new.id);end loop;return new;
end;$$;
create trigger v4_report_notice after insert on public.consumption_reports for each row execute function private.report_notice();

create or replace function public.enqueue_patient_event(p_patient uuid,p_requisition uuid,p_alert uuid) returns void language plpgsql security definer set search_path='' as $$
declare e public.stock_alert_events;m record;begin
 if p_alert is null then return;end if;
 select * into e from public.stock_alert_events where id=p_alert and care_recipient_id=p_patient and state='open';if not found then return;end if;
 for m in select user_id,role from public.care_recipient_memberships where care_recipient_id=p_patient and status='active' and role<>'reader' loop
 if not private.member_can(p_patient,m.user_id,case when e.location='FAMILY' then 'stock.family.read' else 'stock.team.read' end) then continue;end if;
 if e.location='CARE_TEAM' and m.role='family' and not exists(select 1 from public.recipient_notification_settings where care_recipient_id=p_patient and recipient_user_id=m.user_id and recipient_group='family' and include_team_alerts and is_enabled) then continue;end if;
 perform private.enqueue_notice(p_patient,m.user_id,'stock.alert',null,null,e.id);end loop;
end;$$;

create or replace function public.validate_notification_job(p_id uuid,p_worker_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare n public.requisition_notifications;d public.operational_documents;e public.stock_alert_events;r public.consumption_reports;rem public.operational_reminders;allowed boolean:=false;begin
 if not public.is_global_administrator() and coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'worker authorization required' using errcode='42501';end if;
 select * into n from public.requisition_notifications where id=p_id and leased_by=p_worker_id and state='processing' and lease_expires_at>now() for update;if not found then return false;end if;
 if n.document_id is not null then select * into d from public.operational_documents where id=n.document_id;allowed:=private.member_can(n.care_recipient_id,n.recipient_user_id,lower(d.type)||'.read');
 elsif n.requisition_id is not null then allowed:=private.member_can(n.care_recipient_id,n.recipient_user_id,'req.read');
 elsif n.alert_event_id is not null then select * into e from public.stock_alert_events where id=n.alert_event_id;allowed:=e.state='open' and private.member_can(n.care_recipient_id,n.recipient_user_id,case when e.location='FAMILY' then 'stock.family.read' else 'stock.team.read' end);
 elsif n.consumption_report_id is not null then select * into r from public.consumption_reports where id=n.consumption_report_id;allowed:=private.member_can(n.care_recipient_id,n.recipient_user_id,'consumption.report') and (r.reported_by=n.recipient_user_id or private.member_can(n.care_recipient_id,n.recipient_user_id,'consumption.confirm'));
 elsif n.reminder_id is not null then select * into rem from public.operational_reminders where id=n.reminder_id;allowed:=rem.user_id=n.recipient_user_id and rem.acknowledged_at is null and private.member_can(n.care_recipient_id,n.recipient_user_id,case when rem.kind='bal' then 'bal.count' else 'consumption.report' end);end if;
 if n.channel='whatsapp' then allowed:=allowed and coalesce((select (notification_preferences->>'whatsapp')::boolean from public.profiles where id=n.recipient_user_id),false)
 and exists(select 1 from public.verified_phones v join auth.users u on u.id=v.user_id where v.user_id=n.recipient_user_id and u.phone_confirmed_at is not null and '+'||ltrim(u.phone,'+')=v.phone and ltrim(v.phone,'+')=ltrim(n.destination,'+'));end if;
 if coalesce(allowed,false) then return true;end if;
 update public.requisition_notifications set state='cancelled',last_error='RECIPIENT_REVOKED_OR_CONTACT_UNVERIFIED',leased_by=null,lease_expires_at=null where id=n.id;return false;
end;$$;

create function public.notification_notice_payload(p_id uuid,p_worker uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare n public.requisition_notifications;e public.stock_alert_events;r public.consumption_reports;rem public.operational_reminders;values jsonb;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' or not public.validate_notification_job(p_id,p_worker) then raise exception 'verified worker required' using errcode='42501';end if;
 select * into strict n from public.requisition_notifications where id=p_id;
 values:=jsonb_build_object('nome_destinatario',n.recipient_label,'nome_paciente',(select coalesce(nullif(s.settings->>'patientShortName',''),c.display_name) from public.care_recipients c left join public.patient_settings s on s.care_recipient_id=c.id where c.id=n.care_recipient_id));
 if n.alert_event_id is not null then
 select * into e from public.stock_alert_events where id=n.alert_event_id;
 values:=values||jsonb_build_object('nome_produto',(select name from public.care_recipient_products where care_recipient_id=e.care_recipient_id and product_id=e.product_id),'nome_local',case when e.location='FAMILY' then 'Família' else 'Equipe' end,'saldo_atual',e.balance::text,'saldo_minimo',(select low_threshold::text from public.stock_alert_rules where care_recipient_id=e.care_recipient_id and product_id=e.product_id and location=e.location),'data_hora',to_char(e.observed_at at time zone 'America/Sao_Paulo','DD/MM/YYYY "às" HH24"h"MI'));
 return jsonb_build_object('event','stock.alert','suffix',e.product_id||'&careRecipientId='||e.care_recipient_id,'values',values);
 elsif n.consumption_report_id is not null then
 select * into r from public.consumption_reports where id=n.consumption_report_id;
 values:=values||jsonb_build_object('tipo_evento',case when r.kind='shortage' then 'Falta de material' else 'Consumo extraordinário para revisão' end,'data_hora',to_char(r.created_at at time zone 'America/Sao_Paulo','DD/MM/YYYY "às" HH24"h"MI'));
 return jsonb_build_object('event','occurrence.received','suffix',r.id::text||'&careRecipientId='||r.care_recipient_id,'values',values);
 elsif n.reminder_id is not null then
 select * into rem from public.operational_reminders where id=n.reminder_id;
 values:=values||jsonb_build_object('data_prevista',to_char(rem.expected_at at time zone 'America/Sao_Paulo','DD/MM/YYYY HH24:MI'),'quantidade_itens',(select count(*)::text from public.care_recipient_products where care_recipient_id=rem.care_recipient_id and is_active),'periodo_plantao',to_char(rem.expected_at at time zone 'America/Sao_Paulo','DD/MM/YYYY HH24:MI'));
 return jsonb_build_object('event',case when rem.kind='bal' then 'bal.reminder' else 'shift.reminder' end,'suffix',rem.id::text||'&careRecipientId='||rem.care_recipient_id,'values',values);end if;
 return null;
end;$$;
grant execute on function public.notification_notice_payload(uuid,uuid) to service_role;

create table public.reminder_challenges (
 id uuid primary key default gen_random_uuid(),reminder_id uuid not null references public.operational_reminders(id),
 user_id uuid not null references public.profiles(id),phone text not null,token_hash text not null unique check(token_hash~'^[a-f0-9]{64}$'),
 expires_at timestamptz not null,used_at timestamptz
);
alter table public.reminder_challenges enable row level security;
revoke all on public.reminder_challenges from public,anon,authenticated,service_role;
create function public.issue_reminder_challenge(p_notification uuid,p_worker uuid,p_hash text) returns boolean language plpgsql security definer set search_path='' as $$
declare n public.requisition_notifications;phone text;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' or not public.validate_notification_job(p_notification,p_worker) then raise exception 'verified worker required' using errcode='42501';end if;
 select * into n from public.requisition_notifications where id=p_notification;
 if n.event_key<>'shift.reminder' or not exists(select 1 from public.operational_reminders where id=n.reminder_id and user_id=n.recipient_user_id and kind='shift' and acknowledged_at is null) then return false;end if;
 select v.phone into phone from public.verified_phones v join auth.users u on u.id=v.user_id where v.user_id=n.recipient_user_id and u.phone_confirmed_at is not null and '+'||ltrim(u.phone,'+')=v.phone and ltrim(v.phone,'+')=ltrim(n.destination,'+');
 if phone is null then return false;end if;
 insert into public.reminder_challenges(reminder_id,user_id,phone,token_hash,expires_at) values(n.reminder_id,n.recipient_user_id,phone,p_hash,now()+interval '20 minutes');return true;
end;$$;
create function public.acknowledge_no_issues(p_provider_id text,p_phone text,p_hash text) returns boolean language plpgsql security definer set search_path='' as $$
declare c public.reminder_challenges;r public.operational_reminders;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'verified webhook required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('inbound:'||p_provider_id,0));
 if exists(select 1 from public.inbound_messages where provider_id=p_provider_id) then return false;end if;
 select * into c from public.reminder_challenges where token_hash=p_hash for update;
 if not found or c.used_at is not null or c.expires_at<=now() or c.phone<>'+'||ltrim(p_phone,'+') then return false;end if;
 select * into strict r from public.operational_reminders where id=c.reminder_id for update;
 if r.acknowledged_at is not null or r.user_id<>c.user_id or not private.member_can(r.care_recipient_id,c.user_id,'consumption.report')
 or not exists(select 1 from public.verified_phones v join auth.users u on u.id=v.user_id where v.user_id=c.user_id and v.phone=c.phone and u.phone_confirmed_at is not null and '+'||ltrim(u.phone,'+')=v.phone) then return false;end if;
 update public.reminder_challenges set used_at=now() where id=c.id;
 update public.operational_reminders set acknowledged_at=now() where id=r.id;
 update public.requisition_notifications set seen_at=coalesce(seen_at,now()) where reminder_id=r.id and recipient_user_id=c.user_id;
 insert into public.inbound_messages values(p_provider_id,encode(extensions.digest(p_phone,'sha256'),'hex'),'no_issues','processed',now());
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(c.user_id,'shift.no_issues','reminder',r.id,jsonb_build_object('care_recipient_id',r.care_recipient_id,'stockChanged',false,'providerId',p_provider_id));return true;
end;$$;
grant execute on function public.issue_reminder_challenge(uuid,uuid,text),public.acknowledge_no_issues(text,text,text) to service_role;

-- Internal notices do not depend on Meta availability. Authorization is checked at
-- delivery as well as enqueueing, including standalone alerts and reminders.
create or replace function private.deliver_internal_notifications() returns void language plpgsql security definer set search_path='' as $$
declare n public.requisition_notifications;allowed boolean;begin
 for n in select * from public.requisition_notifications where channel='internal' and state='pending' and next_attempt_at<=now() order by created_at for update skip locked limit 100 loop
 allowed:=case
 when n.document_id is not null then private.member_can(n.care_recipient_id,n.recipient_user_id,(select lower(type)||'.read' from public.operational_documents where id=n.document_id))
 when n.requisition_id is not null then private.member_can(n.care_recipient_id,n.recipient_user_id,'req.read')
 when n.alert_event_id is not null then exists(select 1 from public.stock_alert_events e where e.id=n.alert_event_id and e.state='open' and private.member_can(n.care_recipient_id,n.recipient_user_id,case when e.location='FAMILY' then 'stock.family.read' else 'stock.team.read' end))
 when n.consumption_report_id is not null then exists(select 1 from public.consumption_reports r where r.id=n.consumption_report_id and (r.reported_by=n.recipient_user_id or private.member_can(n.care_recipient_id,n.recipient_user_id,'consumption.confirm')) and private.member_can(n.care_recipient_id,n.recipient_user_id,'consumption.report'))
 when n.reminder_id is not null then exists(select 1 from public.operational_reminders r where r.id=n.reminder_id and r.user_id=n.recipient_user_id and r.acknowledged_at is null and private.member_can(n.care_recipient_id,n.recipient_user_id,case when r.kind='bal' then 'bal.count' else 'consumption.report' end)) else false end;
 update public.requisition_notifications set state=case when coalesce(allowed,false) then 'delivered' else 'cancelled' end,delivered_at=case when allowed then now() end,attempted_at=now(),attempts=attempts+1,provider_reference=case when allowed then 'internal' end where id=n.id;
 end loop;
end;$$;

create function private.enqueue_scheduled_reminders() returns integer language plpgsql security definer set search_path='' as $$
declare s record;user_id uuid;rid uuid;today date:=(now() at time zone 'America/Sao_Paulo')::date;clock_hour integer:=extract(hour from now() at time zone 'America/Sao_Paulo');n integer:=0;begin
 for s in select p.care_recipient_id,p.settings from public.patient_settings p join public.care_recipients c on c.id=p.care_recipient_id where c.is_active and (p.settings ? 'balReminderUsers' or p.settings ? 'shiftReminder') limit 100 loop
 if s.settings->>'balDay' is not null and (s.settings->>'balDay')::integer=extract(dow from today) and clock_hour>=9 then
 for user_id in select value::uuid from jsonb_array_elements_text(coalesce(s.settings->'balReminderUsers','[]')) loop
 if not private.member_can(s.care_recipient_id,user_id,'bal.count') then continue;end if;
 insert into public.operational_reminders(care_recipient_id,user_id,kind,period,expected_at) values(s.care_recipient_id,user_id,'bal',today,(today+time '09:00') at time zone 'America/Sao_Paulo') on conflict do nothing returning id into rid;
 if rid is not null then perform private.enqueue_notice(s.care_recipient_id,user_id,'bal.reminder',null,null,null,null,rid);n:=n+1;end if;end loop;end if;
 if coalesce((s.settings->'shiftReminder'->>'enabled')::boolean,false) and clock_hour>=coalesce((s.settings->'shiftReminder'->>'hour')::integer,19)
 and coalesce(s.settings->'shiftReminder'->'days','[]') ? extract(dow from today)::text then
 for user_id in select value::uuid from jsonb_array_elements_text(coalesce(s.settings->'shiftReminder'->'userIds','[]')) loop
 if not private.member_can(s.care_recipient_id,user_id,'consumption.report') then continue;end if;
 insert into public.operational_reminders(care_recipient_id,user_id,kind,period,expected_at) values(s.care_recipient_id,user_id,'shift',today,(today+make_time((s.settings->'shiftReminder'->>'hour')::integer,0,0)) at time zone 'America/Sao_Paulo') on conflict do nothing returning id into rid;
 if rid is not null then perform private.enqueue_notice(s.care_recipient_id,user_id,'shift.reminder',null,null,null,null,rid);n:=n+1;end if;end loop;end if;
 end loop;return n;
end;$$;
alter function public.run_operational_schedule() rename to v4_lifecycle_schedule;
revoke all on function public.v4_lifecycle_schedule() from public,anon,authenticated,service_role;
create function public.run_operational_schedule() returns jsonb language plpgsql security definer set search_path='' as $$declare result jsonb;n integer;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'worker authorization required' using errcode='42501';end if;
 result:=public.v4_lifecycle_schedule();n:=private.enqueue_scheduled_reminders();return result||jsonb_build_object('scheduledReminders',n);
end;$$;
grant execute on function public.run_operational_schedule() to service_role;
create trigger v4_workspace_invalidation after insert or update on public.operational_reminders for each row execute function private.invalidate_workspace();
revoke all on function private.enqueue_notice(uuid,uuid,text,uuid,uuid,uuid,uuid,uuid,boolean),private.report_notice(),private.enqueue_scheduled_reminders() from public,anon,authenticated,service_role;
