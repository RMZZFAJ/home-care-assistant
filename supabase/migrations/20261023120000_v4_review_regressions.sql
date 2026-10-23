-- PR 4: incremental corrections; all previously applied migrations stay immutable.
begin;

-- Explicit external event contract, checked against the application registry.
create function private.whatsapp_event_supported(p_event text) returns boolean language sql immutable set search_path='' as $$
 select coalesce(p_event=any(array['stock.alert','occurrence.received','bal.reminder','shift.reminder','req.issued','req.registered_author','req.fulfillment_updated','req.science_satisfied','req.completed','req.reminder','com.issued','com.submit','com.receive','com.validate_receipt','ent.issued','ent.submit','ent.receive','ent.resolve','ent.reminder','ent.cancel','bal.issued','bal.approve','com.revised','ent.revised','bal.recount']),false);
$$;
update public.notification_event_rules set channels=array_remove(channels,'whatsapp') where 'whatsapp'=any(channels) and not private.whatsapp_event_supported(event);
create function private.guard_notification_event_contract() returns trigger language plpgsql security definer set search_path='' as $$begin
 if tg_table_name='notification_event_rules' then
 if 'whatsapp'=any(new.channels) and not private.whatsapp_event_supported(new.event) then raise exception 'event supports application notices only' using errcode='23514';end if;
 elsif new.channel='whatsapp' and new.event_key is not null and not private.whatsapp_event_supported(new.event_key) then return null;
 end if;return new;
end;$$;
create trigger notification_external_contract before insert or update on public.notification_event_rules for each row execute function private.guard_notification_event_contract();
create trigger notification_external_contract before insert on public.requisition_notifications for each row execute function private.guard_notification_event_contract();
update public.requisition_notifications set state='cancelled',last_error='EVENT_APP_ONLY',leased_by=null,lease_expires_at=null where channel='whatsapp' and event_key is not null and not private.whatsapp_event_supported(event_key) and state in ('pending','failed');

-- Configuration holds are pending work, never repeated transport failures.
alter function public.complete_notification_job(uuid,uuid,text,text,text) rename to v4_complete_notification_job;
revoke all on function public.v4_complete_notification_job(uuid,uuid,text,text,text) from public,anon,authenticated,service_role;
create function public.complete_notification_job(p_id uuid,p_worker_id uuid,p_state text,p_provider_reference text default null,p_error text default null) returns public.requisition_notifications language plpgsql security definer set search_path='' as $$
declare result public.requisition_notifications;begin
 result:=public.v4_complete_notification_job(p_id,p_worker_id,p_state,p_provider_reference,p_error);
 if p_state='pending' and p_error in ('TEMPLATE_NOT_APPROVED','EVENT_TEMPLATE_NOT_CONFIGURED','DOCUMENT_TEMPLATE_NOT_CONFIGURED','CHANNEL_NOT_CONFIGURED') then
 update public.requisition_notifications set state='pending',next_attempt_at='infinity'::timestamptz where id=p_id returning * into result;
 end if;return result;
end;$$;
grant execute on function public.complete_notification_job(uuid,uuid,text,text,text) to service_role;

create or replace function public.bind_notification_template(p_id uuid,p_worker uuid,p_name text,p_version integer,p_language text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare t public.meta_template_versions;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' or not public.validate_notification_job(p_id,p_worker) then raise exception 'verified worker required' using errcode='42501';end if;
 select * into t from public.meta_template_versions where name=p_name and version=p_version and language=p_language;
 if not found then return null;end if;
 update public.requisition_notifications set template_name=t.name,template_version=t.version,template_snapshot=t.definition where id=p_id;
 return t.definition||jsonb_build_object('name',t.name,'version',t.version,'language',t.language,'approval',t.approval);
end;$$;
create function private.release_template_holds() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.approval='APPROVED' and old.approval is distinct from new.approval then
 update public.requisition_notifications set next_attempt_at=now(),attempts=0,last_error=null where state='pending' and next_attempt_at='infinity'::timestamptz and last_error in ('TEMPLATE_NOT_APPROVED','DOCUMENT_TEMPLATE_NOT_CONFIGURED') and template_name=new.name and template_version=new.version;
 end if;return null;
end;$$;
create trigger release_template_holds after update of approval on public.meta_template_versions for each row execute function private.release_template_holds();

-- A pending individual acknowledgement is not necessarily a pending collective duty.
create function private.requisition_science_task(p_id uuid,p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.requisition_lifecycle s join public.operational_documents d on d.id=s.requisition_id join public.requisitions r on r.id=d.id where d.id=p_id and not r.is_historical and d.status not in ('draft','cancelled') and s.archived_at is null and not coalesce(private.science_satisfied(p_id),false) and p_user=any(s.eligible_users) and private.member_can(d.care_recipient_id,p_user,'req.science') and not exists(select 1 from public.requisition_science_events e where e.requisition_id=p_id and e.user_id=p_user));
$$;
create function private.requisition_archive_task(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.requisition_lifecycle s join public.operational_documents d on d.id=s.requisition_id join public.requisitions r on r.id=d.id where d.id=p_id and not r.is_historical and d.status not in ('draft','cancelled') and s.archived_at is null and s.completed_at is not null and public.can_manage_recipient(d.care_recipient_id));
$$;

create or replace function public.operational_tasks(p_patient uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;open_count integer;science_count integer;archive_count integer;begin
 if not public.can_access_recipient(p_patient) then raise exception 'patient operating context required' using errcode='42501';end if;
 result:=public.v3_operational_tasks(p_patient);
 select count(*) filter(where s.completed_at is null),count(*) filter(where private.requisition_science_task(d.id,auth.uid())),
 count(*) filter(where private.requisition_archive_task(d.id)) into open_count,science_count,archive_count
 from public.operational_documents d join public.requisition_lifecycle s on s.requisition_id=d.id where d.care_recipient_id=p_patient and d.type='REQ' and d.status not in ('draft','cancelled') and s.archived_at is null and private.can(p_patient,'req.read') and not exists(select 1 from public.requisitions r where r.id=d.id and r.is_historical);
 return result||jsonb_build_object('requests',open_count,'sciencePending',science_count,'archivePending',archive_count);
end;$$;

create or replace function public.operational_document_list(p_patient uuid,p_type text default null,p_status text default null,p_search text default null,p_from timestamptz default null,p_to timestamptz default null,p_page integer default 1,p_size integer default 20) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;begin
 if not public.can_access_recipient(p_patient) then raise exception 'patient operating context required' using errcode='42501';end if;
 if p_page not between 1 and 100000 or p_size not between 1 and 100 or p_type is not null and p_type not in ('REQ','COM','ENT','BAL') then raise exception 'invalid document filter';end if;
 with counts as materialized (
 select i.requisition_id,count(*) total,count(*) filter(where exists(select 1 from public.document_request_links k join public.document_lines l on l.id=k.document_line_id join public.operational_documents d on d.id=l.document_id where k.requisition_item_id=i.id and d.type='ENT' and d.status<>'cancelled' and l.accepted_quantity>0)) fulfilled
 from public.requisition_items i where i.care_recipient_id=p_patient group by i.requisition_id),
 visible as materialized (
 select d.id,d.type,d.code,d.protocol,d.recipient_id,d.created_at,d.version,
 case when exists(select 1 from public.requisitions r where r.id=d.id and r.is_historical) then 'historical' when d.type<>'REQ' or d.status in ('cancelled','draft') then d.status when s.archived_at is not null then 'archived'
 when s.completed_at is not null then case when private.science_satisfied(d.id) then 'completed' else 'completed_science_pending' end
 when coalesce(c.fulfilled,0)>0 then 'fulfillment_partial' when not coalesce(private.science_satisfied(d.id),false) then 'science_pending' else 'awaiting_fulfillment' end status,
 case when d.type='REQ' then jsonb_build_object('fulfilled',coalesce(c.fulfilled,0),'total',coalesce(c.total,0)) end fulfillment,
 case when d.type='REQ' then jsonb_build_object('scienceSatisfied',coalesce(private.science_satisfied(d.id),false),'completedAt',s.completed_at,'archivedAt',s.archived_at,'manualArchiveRequired',s.manual_archive_required) end progress,
 case when d.type='ENT' then coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'fully_checked',l.fully_checked,'accepted_quantity',l.accepted_quantity::text,'quantity',l.quantity::text)) from public.document_lines l where l.document_id=d.id),'[]') end document_lines
 from public.operational_documents d left join counts c on c.requisition_id=d.id left join public.requisition_lifecycle s on s.requisition_id=d.id
 where d.care_recipient_id=p_patient and private.can(p_patient,lower(d.type)||'.read') and (p_type is null or d.type=p_type)
 and (p_from is null or d.created_at>=p_from) and (p_to is null or d.created_at<p_to)
 and (p_search is null or d.code ilike '%'||p_search||'%' or d.protocol ilike '%'||p_search||'%')),
 filtered as materialized(select * from visible where p_status is null or case p_status when 'archive_pending' then private.requisition_archive_task(id) when 'science_required' then private.requisition_science_task(id,auth.uid()) else status=p_status end),
 paged as(select * from filtered order by created_at desc,id offset (p_page-1)*p_size limit p_size)
 select jsonb_build_object('data',coalesce((select jsonb_agg(to_jsonb(p) order by created_at desc,id) from paged p),'[]'),'total',(select count(*) from filtered),'page',p_page,'pageSize',p_size) into result;
 return result;
end;$$;

-- Local approval authorizes an invitation; only its intended identity can accept.
alter table public.access_change_requests add column resolution jsonb not null default '{}';
alter table public.access_change_requests drop constraint access_change_requests_status_check;
alter table public.access_change_requests add constraint access_change_requests_status_check check(status in ('pending','awaiting_acceptance','applied','rejected'));
create table private.membership_invitation_intents(backend_pid integer,transaction_id bigint,request_id uuid,token_hash text not null check(token_hash~'^[0-9a-f]{64}$'),primary key(backend_pid,transaction_id,request_id));
alter table private.membership_invitation_intents enable row level security;
revoke all on private.membership_invitation_intents from public,anon,authenticated,service_role;
alter function public.configure_patient_access(uuid,text,jsonb,uuid,integer,uuid,text) rename to v4_review_patient_access;
revoke all on function public.v4_review_patient_access(uuid,text,jsonb,uuid,integer,uuid,text) from public,anon,authenticated,service_role;
create function public.configure_patient_access(p_patient uuid,p_kind text,p_change jsonb,p_key uuid,p_version integer,p_request_id uuid default null,p_decision text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare c public.access_change_requests;result jsonb;begin
 if p_request_id is not null and p_decision='approve' then
 if not public.can_manage_recipient(p_patient) then raise exception 'local administrator required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
 select * into strict c from public.access_change_requests where id=p_request_id and care_recipient_id=p_patient for update;
 if c.proposed_by=auth.uid() then raise exception 'distinct patient administrator required' using errcode='42501';end if;
 if c.status='pending' and c.kind='membership' and not exists(select 1 from public.care_recipient_memberships where care_recipient_id=p_patient and user_id=(c.proposed->>'userId')::uuid and status='active') then
 if coalesce(p_change->>'invitationTokenHash','')!~'^[0-9a-f]{64}$' then raise exception 'recipient invitation acceptance required' using errcode='23514';end if;
 insert into private.membership_invitation_intents values(pg_backend_pid(),txid_current(),c.id,p_change->>'invitationTokenHash');
 end if;end if;
 result:=public.v4_review_patient_access(p_patient,p_kind,p_change,p_key,p_version,p_request_id,p_decision);
 delete from private.membership_invitation_intents where backend_pid=pg_backend_pid() and transaction_id=txid_current();return result;
exception when sqlstate '40001' then
 -- A stale client revision cannot succeed through a database transaction retry.
 -- Keep real serialization failures untouched; expose this logical conflict once.
 if sqlerrm='stale policy version' then raise exception 'stale policy version' using errcode='PT409';end if;
 raise;
end;$$;
grant execute on function public.configure_patient_access(uuid,text,jsonb,uuid,integer,uuid,text) to authenticated;

create or replace function private.apply_access_change(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare c public.access_change_requests;x jsonb;a jsonb;invitation public.care_recipient_invitations;v_hash text;v_email text;begin
 select * into strict c from public.access_change_requests where id=p_id;
 x:=c.proposed;a:=x->'args';
 if not public.can_manage_recipient(c.care_recipient_id) then raise exception 'local administrator required' using errcode='42501';end if;
 if c.kind='membership' and not exists(select 1 from public.care_recipient_memberships where care_recipient_id=c.care_recipient_id and user_id=(x->>'userId')::uuid and status='active') then
 select token_hash into v_hash from private.membership_invitation_intents where backend_pid=pg_backend_pid() and transaction_id=txid_current() and request_id=c.id;
 if v_hash is null then raise exception 'recipient invitation acceptance required' using errcode='23514';end if;
 select email into v_email from auth.users where id=(x->>'userId')::uuid and email_confirmed_at is not null;
 if v_email is null then raise exception 'confirmed intended identity required' using errcode='23514';end if;
 invitation:=public.admin_create_invitation(c.care_recipient_id,lower(v_email),(x->>'role')::public.profile_role,false,false,v_hash,now()+interval '7 days');
 update public.patient_settings set version=version+1,updated_at=now() where care_recipient_id=c.care_recipient_id;
 update public.access_change_requests set status='awaiting_acceptance',decided_at=now(),resolution=jsonb_build_object('invitationId',invitation.id,'invitationHash',v_hash) where id=c.id;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'membership.approved.awaiting_acceptance','access_change',c.id,jsonb_build_object('care_recipient_id',c.care_recipient_id,'invitationId',invitation.id));return;
 elsif c.kind='notification_rule' then
 perform public.configure_notification_rule(c.care_recipient_id,x->>'event',x->>'role',array(select jsonb_array_elements_text(x->'channels')),coalesce((x->>'includePdf')::boolean,true),coalesce((x->>'cooldownMinutes')::integer,0),(x->>'quietStart')::integer,(x->>'quietEnd')::integer);
 update public.notification_event_rules set mode=coalesce(x->>'mode','optional') where care_recipient_id=c.care_recipient_id and event=x->>'event' and subject_role=x->>'role';
 elsif c.kind='capability' and x->'enabled'='null'::jsonb then
 delete from public.capability_overrides where care_recipient_id=c.care_recipient_id and capability=x->>'capability' and (subject_role=x->>'subjectRole' or subject_user=(x->>'subjectUser')::uuid);
 elsif c.kind='administration' then
 case x->>'operation'
 when 'recipient' then perform public.admin_upsert_recipient(c.care_recipient_id,a->>'displayName',(a->>'isActive')::boolean,(a->>'isDevelopment')::boolean);
 when 'product' then perform public.admin_upsert_recipient_product(c.care_recipient_id,a->>'id',a->>'name',(a->>'category')::public.product_category,a->>'unit',array(select jsonb_array_elements_text(a->'aliases')),(a->>'isActive')::boolean,a->>'description',coalesce((a->>'sortOrder')::integer,0));
 when 'adoptProduct' then perform public.admin_adopt_product(c.care_recipient_id,a->>'productId');
 when 'membershipStatus' then perform public.admin_set_membership_status(c.care_recipient_id,(a->>'userId')::uuid,a->>'status');
 when 'alertRule' then perform public.configure_stock_alert(c.care_recipient_id,a->>'productId',a->>'location',(a->>'lowThreshold')::numeric,(a->>'criticalThreshold')::numeric,(a->>'isEnabled')::boolean);
 when 'notificationRecipient' then perform public.configure_recipient_notification(c.care_recipient_id,(a->>'recipientUserId')::uuid,a->>'recipientGroup',a->>'channel',a->>'destination',(a->>'isEnabled')::boolean,coalesce((a->>'includeTeamAlerts')::boolean,false));
 else raise exception 'invalid administration operation';end case;
 else perform private.v3_apply_access_change(p_id);return;end if;
 update public.patient_settings set version=version+1,updated_at=now() where care_recipient_id=c.care_recipient_id;
 update public.access_change_requests set status='applied',decided_at=now() where id=p_id;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'access.applied','access_change',p_id,jsonb_build_object('care_recipient_id',c.care_recipient_id,'kind',c.kind));
end;$$;
alter function public.accept_invitation(text) rename to v4_accept_invitation;
revoke all on function public.v4_accept_invitation(text) from public,anon,authenticated,service_role;
create function public.accept_invitation(p_token_hash text) returns public.care_recipient_memberships language plpgsql security definer set search_path='' as $$
declare result public.care_recipient_memberships;invitation uuid;begin
 result:=public.v4_accept_invitation(p_token_hash);
 select id into invitation from public.care_recipient_invitations where token_hash=p_token_hash and status='accepted';
 update public.access_change_requests set status='applied',resolution=resolution||jsonb_build_object('acceptedAt',now()) where status='awaiting_acceptance' and resolution->>'invitationId'=invitation::text;
 return result;
end;$$;
grant execute on function public.accept_invitation(text) to authenticated;
create function public.decline_invitation(p_token_hash text) returns boolean language plpgsql security definer set search_path='' as $$
declare i public.care_recipient_invitations;begin
 if private.auth_session() is null then raise exception 'active Auth session required' using errcode='42501';end if;
 select * into i from public.care_recipient_invitations where token_hash=p_token_hash;
 if not found then raise exception 'invalid invitation' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||i.care_recipient_id,0));
 select * into strict i from public.care_recipient_invitations where id=i.id for update;
 if i.status<>'pending' or i.expires_at<=now() or not exists(select 1 from auth.users where id=auth.uid() and lower(email)=i.email and email_confirmed_at is not null) then raise exception 'invalid invitation' using errcode='42501';end if;
 update public.care_recipient_invitations set status='revoked' where id=i.id;
 update public.access_change_requests set status='rejected',resolution=resolution||jsonb_build_object('declinedAt',now()) where status='awaiting_acceptance' and resolution->>'invitationId'=i.id::text;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'invitation.declined','invitation',i.id,jsonb_build_object('care_recipient_id',i.care_recipient_id));return true;
end;$$;
grant execute on function public.decline_invitation(text) to authenticated;
revoke all on function private.whatsapp_event_supported(text),private.guard_notification_event_contract(),private.release_template_holds(),private.requisition_science_task(uuid,uuid),private.requisition_archive_task(uuid) from public,anon,authenticated,service_role;

-- Draft submission and direct emission share their notification policy.
create or replace function private.enqueue_notice(p_patient uuid,p_user uuid,p_event text,p_document uuid default null,p_document_event uuid default null,p_alert uuid default null,p_report uuid default null,p_reminder uuid default null,p_pdf boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare person public.profiles;m public.care_recipient_memberships;r public.notification_event_rules;channels text[];v_channel text;destination text;due timestamptz:=now();local_now timestamp:=now() at time zone 'America/Sao_Paulo';h integer;g text;required boolean;begin
 select * into person from public.profiles where id=p_user and status='active';if not found then return;end if;
 select * into m from public.care_recipient_memberships where care_recipient_id=p_patient and user_id=p_user and status='active';if not found then return;end if;
 select * into r from public.notification_event_rules where care_recipient_id=p_patient and event=case p_event when 'com.submit' then 'com.issued' when 'ent.submit' then 'ent.issued' else p_event end and subject_role=m.role::text;
 channels:=case when found then r.channels else array(select distinct v from (select 'internal'::text v union select x.channel from public.recipient_notification_settings x where x.care_recipient_id=p_patient and x.recipient_user_id=p_user and x.is_enabled) c) end;
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
 if v_channel='email' and not exists(select 1 from auth.users u where u.id=p_user and u.email_confirmed_at is not null and lower(u.email)=lower(destination)) then continue;end if;
 if v_channel='whatsapp' and not exists(select 1 from public.verified_phones v join auth.users u on u.id=v.user_id where v.user_id=p_user and '+'||ltrim(u.phone,'+')=v.phone and u.phone_confirmed_at is not null and ltrim(v.phone,'+')=ltrim(destination,'+')) then continue;end if;
 end if;
 if coalesce(r.cooldown_minutes,0)>0 and exists(select 1 from public.requisition_notifications n where n.care_recipient_id=p_patient and n.recipient_user_id=p_user and n.event_key=p_event and n.channel=v_channel
 and coalesce(n.document_id,n.alert_event_id,n.consumption_report_id,n.reminder_id)=coalesce(p_document,p_alert,p_report,p_reminder) and n.created_at>now()-make_interval(mins=>r.cooldown_minutes)) then continue;end if;
 insert into public.requisition_notifications(care_recipient_id,document_id,document_event_id,alert_event_id,consumption_report_id,reminder_id,recipient_user_id,recipient_group,recipient_label,channel,destination,event_key,include_pdf,next_attempt_at,silent)
 values(p_patient,p_document,p_document_event,p_alert,p_report,p_reminder,p_user,g,person.full_name,v_channel,destination,p_event,p_event<>'req.registered_author' and p_pdf,case when v_channel='internal' then now() else due end,coalesce(r.mode='silent',false)) on conflict do nothing;
 end loop;
end;$$;
-- A policy disabled after enqueue must also stop leased external work.
alter function public.validate_notification_job(uuid,uuid) rename to v4_validate_notification_job;
revoke all on function public.v4_validate_notification_job(uuid,uuid) from public,anon,authenticated,service_role;
create function public.validate_notification_job(p_id uuid,p_worker_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare n public.requisition_notifications;r public.notification_event_rules;begin
 if not public.v4_validate_notification_job(p_id,p_worker_id) then return false;end if;
 select * into strict n from public.requisition_notifications where id=p_id for update;
 if n.channel='whatsapp' and n.event_key is not null then
 select * into r from public.notification_event_rules where care_recipient_id=n.care_recipient_id and subject_role=(select role::text from public.care_recipient_memberships where care_recipient_id=n.care_recipient_id and user_id=n.recipient_user_id) and event=case n.event_key when 'com.submit' then 'com.issued' when 'ent.submit' then 'ent.issued' else n.event_key end;
 if not private.whatsapp_event_supported(n.event_key) or r.event is not null and (not('whatsapp'=any(r.channels)) or r.mode='silent') then
 update public.requisition_notifications set state='cancelled',last_error='EVENT_DISABLED',leased_by=null,lease_expires_at=null where id=n.id;return false;end if;
 end if;return true;
end;$$;
grant execute on function public.validate_notification_job(uuid,uuid) to service_role;
create function private.reconcile_declined_membership_invitation() returns trigger language plpgsql security definer set search_path='' as $$begin
 if new.status='revoked' and old.status is distinct from new.status then update public.access_change_requests set status='rejected',resolution=resolution||jsonb_build_object('invitationRevokedAt',now()) where status='awaiting_acceptance' and resolution->>'invitationId'=new.id::text;end if;return null;
end;$$;
create trigger reconcile_declined_membership_invitation after update of status on public.care_recipient_invitations for each row execute function private.reconcile_declined_membership_invitation();
revoke all on function private.reconcile_declined_membership_invitation() from public,anon,authenticated,service_role;

create or replace function public.document_delivery_status(p_document uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare d public.operational_documents;begin
 select * into d from public.operational_documents where id=p_document;
 if not found or not private.can(d.care_recipient_id,lower(d.type)||'.read') then raise exception 'document permission required' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',id,'requisition_id',requisition_id,'recipient_group',recipient_group,'recipient_label',recipient_label,'channel',channel,'state',state,'attempts',attempts,'attempted_at',attempted_at,'error_code',case when last_error is null then null when last_error in ('TEMPLATE_NOT_APPROVED','EVENT_TEMPLATE_NOT_CONFIGURED','EVENT_APP_ONLY','EVENT_DISABLED','INVALID_DESTINATION','PROVIDER_RATE_LIMIT','PROVIDER_RESULT_UNCERTAIN','PROVIDER_REJECTED','CHANNEL_NOT_CONFIGURED','META_COUNTRY_RESTRICTED_130497','DOCUMENT_TEMPLATE_NOT_CONFIGURED','MEDIA_UPLOAD_FAILED','DOCUMENT_PREPARATION_FAILED') then last_error else 'PROCESSING_FAILED' end,'seen_at',seen_at)) from public.requisition_notifications where coalesce(document_id,requisition_id)=p_document),'[]');
end;$$;
commit;
