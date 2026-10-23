-- Follow-up to the ten V4 migrations already applied remotely.
begin;
create or replace function private.enqueue_document_event() returns trigger language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;m record;event_name text;pdf boolean;begin
 if new.action in ('req.legacy_imported','attachment.reserved','attachment.ready','attachment.rejected','attachment.bound') then return new;end if;
 select * into strict d from public.operational_documents where id=new.document_id;if d.status='draft' then return new;end if;
 if new.action='req.fulfillment_updated' and (coalesce((new.body->'event'->>'fulfilled')::integer,0)=0 or (new.body->'event'->>'fulfilled')::integer=(new.body->'event'->>'total')::integer) then return new;end if;
 for m in select user_id,role from public.care_recipient_memberships where care_recipient_id=d.care_recipient_id and status='active' loop
 if not private.member_can(d.care_recipient_id,m.user_id,lower(d.type)||'.read') then continue;end if;
 if m.role='reader' and not exists(select 1 from public.notification_event_rules where care_recipient_id=d.care_recipient_id and event=new.action and subject_role='reader' and cardinality(channels)>0) and not exists(select 1 from public.recipient_notification_settings where care_recipient_id=d.care_recipient_id and recipient_user_id=m.user_id and is_enabled) then continue;end if;
 if new.action in ('ent.issued','ent.submit') and m.role in ('professional','supervisor') and m.user_id<>d.recipient_id then continue;end if;
 if new.action in ('req.science_satisfied','req.science_recorded') and m.user_id<>d.created_by and m.role not in ('admin','family') then continue;end if;
 if new.action like 'req.archived.%' and m.role not in ('admin','family') then continue;end if;
 if new.action='req.reminder' and m.role not in ('admin','family') then continue;end if;
 if new.action='ent.reminder' and m.user_id<>d.recipient_id then continue;end if;
 if new.action='req.issued' and m.user_id<>d.created_by and m.role not in ('admin','family','supervisor') and not exists(select 1 from public.recipient_notification_settings where care_recipient_id=d.care_recipient_id and recipient_user_id=m.user_id and is_enabled) and not exists(select 1 from public.notification_event_rules where care_recipient_id=d.care_recipient_id and event=new.action and subject_role=m.role::text and cardinality(channels)>0) then continue;end if;
 event_name:=case when new.action='req.issued' and m.user_id=d.created_by then 'req.registered_author' else new.action end;
 select coalesce(include_pdf,true) into pdf from public.notification_event_rules where care_recipient_id=d.care_recipient_id and event=event_name and subject_role=m.role::text;
 if event_name='req.science_satisfied' and m.user_id=d.created_by then pdf:=true;end if;
 perform private.enqueue_notice(d.care_recipient_id,m.user_id,event_name,d.id,new.id,null,null,null,coalesce(pdf,true));
 end loop;return new;
end;$$;

create or replace function private.enqueue_notice(p_patient uuid,p_user uuid,p_event text,p_document uuid default null,p_document_event uuid default null,p_alert uuid default null,p_report uuid default null,p_reminder uuid default null,p_pdf boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare person public.profiles;m public.care_recipient_memberships;r public.notification_event_rules;channels text[];v_channel text;destination text;due timestamptz:=now();local_now timestamp:=now() at time zone 'America/Sao_Paulo';h integer;g text;required boolean;begin
 select * into person from public.profiles where id=p_user and status='active';if not found then return;end if;
 select * into m from public.care_recipient_memberships where care_recipient_id=p_patient and user_id=p_user and status='active';if not found then return;end if;
 select * into r from public.notification_event_rules where care_recipient_id=p_patient and event=p_event and subject_role=m.role::text;
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

-- Seal membership mutations authorized by an invitation or explicit bootstrap.
create table private.membership_authority (
 backend_pid integer not null,transaction_id bigint not null,care_recipient_id uuid not null,
 user_id uuid not null,role public.profile_role not null,manage_stock boolean not null,count_stock boolean not null,
 primary key(backend_pid,transaction_id,care_recipient_id,user_id)
);
alter table private.membership_authority enable row level security;
revoke all on private.membership_authority from public,anon,authenticated,service_role;
create or replace function private.guard_membership_elevation() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null and current_user<>'authenticated' then return new;end if;
 if tg_op='UPDATE' and old.role='admin' and old.status='active' and (new.role<>'admin' or new.status<>'active') and not exists(select 1 from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id where m.care_recipient_id=old.care_recipient_id and m.user_id<>old.user_id and m.role='admin' and m.status='active' and p.status='active') then raise exception 'last patient administrator must remain active' using errcode='23514';end if;
 if exists(select 1 from private.membership_authority a where a.backend_pid=pg_backend_pid() and a.transaction_id=txid_current() and a.care_recipient_id=new.care_recipient_id and a.user_id=new.user_id and a.role=new.role and a.manage_stock=new.can_manage_stock and a.count_stock=new.can_count_stock and new.status='active') then return new;end if;
 if not public.can_manage_recipient(new.care_recipient_id) then raise exception 'local administrator required' using errcode='42501';end if;return new;
end;$$;
alter function public.accept_invitation(text) rename to v3_accept_invitation;
revoke all on function public.v3_accept_invitation(text) from public,anon,authenticated,service_role;
create function public.accept_invitation(p_token_hash text) returns public.care_recipient_memberships language plpgsql security definer set search_path='' as $$
declare i public.care_recipient_invitations;result public.care_recipient_memberships;begin
 if not exists(select 1 from auth.sessions where id=nullif(auth.jwt()->>'session_id','')::uuid and user_id=auth.uid() and (not_after is null or not_after>now())) then raise exception 'active Auth session required' using errcode='42501';end if;
 select * into i from public.care_recipient_invitations where token_hash=p_token_hash;
 if not found then raise exception 'invalid invitation' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||i.care_recipient_id,0));
 select * into i from public.care_recipient_invitations where token_hash=p_token_hash for update;
 if not found or not exists(select 1 from auth.users where id=auth.uid() and lower(email)=i.email and email_confirmed_at is not null) then raise exception 'invalid invitation' using errcode='42501';end if;
 if i.status<>'accepted' and (i.status<>'pending' or i.expires_at<=now() or not exists(select 1 from public.care_recipient_memberships m join public.profiles p on p.id=m.user_id where m.care_recipient_id=i.care_recipient_id and m.user_id=i.invited_by and m.status='active' and m.role='admin' and p.status='active')) then raise exception 'invalid or expired invitation' using errcode='42501';end if;
 insert into private.membership_authority values(pg_backend_pid(),txid_current(),i.care_recipient_id,auth.uid(),i.role,i.role<>'reader' and i.can_manage_stock,i.role<>'reader' and i.can_count_stock) on conflict do nothing;
 result:=public.v3_accept_invitation(p_token_hash);
 delete from private.membership_authority where backend_pid=pg_backend_pid() and transaction_id=txid_current() and care_recipient_id=i.care_recipient_id and user_id=auth.uid();return result;
end;$$;
grant execute on function public.accept_invitation(text) to authenticated;
create function public.create_patient_with_administrator(p_name text,p_development boolean,p_administrator_email text) returns public.care_recipients language plpgsql security definer set search_path='' as $$
declare person uuid;patient public.care_recipients;begin
 if not public.is_global_administrator() then raise exception 'global authorization required' using errcode='42501';end if;
 select p.id into person from public.profiles p join auth.users u on u.id=p.id where lower(u.email)=lower(trim(p_administrator_email)) and u.email_confirmed_at is not null and p.status='active';
 if person is null then raise exception 'confirmed active administrator identity required';end if;
 patient:=public.admin_upsert_recipient(null,p_name,true,p_development);
 insert into private.membership_authority values(pg_backend_pid(),txid_current(),patient.id,person,'admin',true,true);
 insert into public.care_recipient_memberships(care_recipient_id,user_id,role,can_manage_stock,can_count_stock) values(patient.id,person,'admin',true,true);
 delete from private.membership_authority where backend_pid=pg_backend_pid() and transaction_id=txid_current() and care_recipient_id=patient.id;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'patient.initial_administrator','patient',patient.id,jsonb_build_object('userId',person,'explicit',true));return patient;
end;$$;
grant execute on function public.create_patient_with_administrator(text,boolean,text) to authenticated;

alter function public.configure_patient_access(uuid,text,jsonb,uuid,integer,uuid,text) rename to v4_configure_patient_access;
revoke all on function public.v4_configure_patient_access(uuid,text,jsonb,uuid,integer,uuid,text) from public,anon,authenticated,service_role;
create function public.configure_patient_access(p_patient uuid,p_kind text,p_change jsonb,p_key uuid,p_version integer,p_request_id uuid default null,p_decision text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare change jsonb:=p_change;kind text:=p_kind;item record;elements integer;begin
 if not public.can_manage_recipient(p_patient) and not public.is_global_administrator() then raise exception 'administrator authorization required' using errcode='42501';end if;
 if p_request_id is not null then select proposed,c.kind into change,kind from public.access_change_requests c where c.id=p_request_id and c.care_recipient_id=p_patient;end if;
 if kind='settings' then
 for item in select key,value from jsonb_each(change) loop
 if item.key in ('balReview','balRequirement','scienceRequirement','patientShortName') and (jsonb_typeof(item.value) is distinct from 'string' or length(trim(item.value#>>'{}'))=0) then raise exception 'invalid patient settings';end if;
 if item.key in ('archiveDays','reminderHours','reminderRepeatHours','shareWaitSeconds') or item.key='balDay' and item.value<>'null'::jsonb then
 if jsonb_typeof(item.value) is distinct from 'number' or (item.value#>>'{}')!~'^[0-9]+$' then raise exception 'integer patient setting required';end if;end if;
 if item.key in ('balApprovers','scienceRoles','scienceUsers','balReminderUsers') then
 if jsonb_typeof(item.value) is distinct from 'array' then raise exception 'array patient setting required';end if;
 elements:=jsonb_array_length(item.value);
 if elements>100 or exists(select 1 from jsonb_array_elements(item.value) e where jsonb_typeof(e) is distinct from 'string') or (select count(distinct e) from jsonb_array_elements_text(item.value) e)<>elements then raise exception 'unique string settings required';end if;end if;
 if item.key='shiftReminder' then
 if jsonb_typeof(item.value) is distinct from 'object' or exists(select 1 from jsonb_object_keys(item.value) k where k not in ('enabled','hour','days','userIds'))
 or jsonb_typeof(item.value->'hour') is distinct from 'number' or coalesce(item.value->>'hour','')!~'^[0-9]+$' then raise exception 'invalid shift settings';end if;
 if jsonb_typeof(item.value->'days') is distinct from 'array' or jsonb_typeof(item.value->'userIds') is distinct from 'array' then raise exception 'invalid shift recipients or days';end if;
 if exists(select 1 from jsonb_array_elements(item.value->'days') e where jsonb_typeof(e) is distinct from 'string') or exists(select 1 from jsonb_array_elements(item.value->'userIds') e where jsonb_typeof(e) is distinct from 'string') then raise exception 'invalid shift values';end if;
 end if;
 end loop;
 elsif kind='capability' and change->>'capability'='access.manage' then raise exception 'administrator governance cannot be overridden' using errcode='23514';
 elsif kind='notification_rule' and change ? 'mode' and (jsonb_typeof(change->'mode') is distinct from 'string' or change->>'mode' not in ('required','optional','silent')) then raise exception 'invalid notification mode';end if;
 return public.v4_configure_patient_access(p_patient,p_kind,p_change,p_key,p_version,p_request_id,p_decision);
end;$$;
grant execute on function public.configure_patient_access(uuid,text,jsonb,uuid,integer,uuid,text) to authenticated;

-- Disambiguate row variables from SQL table aliases in Flow review.
create or replace function public.flow_exchange(p_hash text,p_submit jsonb default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.flow_sessions;d public.operational_documents;v_line public.document_lines;q numeric;state jsonb;diffs jsonb;result jsonb;claims text;sub text;previous text;summary text;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'verified Flow endpoint required' using errcode='42501';end if;
 select * into s from public.flow_sessions where token_hash=p_hash for update;
 if not found or s.expires_at<=now() then raise exception 'flow session expired' using errcode='42501';end if;
 if s.purpose='occurrence' then
 if p_submit is null then return public.v3_flow_exchange(p_hash,null)||jsonb_build_object('screen','REPORT_MODE','purpose','occurrence');end if;
 if p_submit->>'operation'='occurrence_mode' and p_submit->>'kind' in ('consumption','shortage') then
 update public.flow_sessions set payload_state=jsonb_build_object('kind',p_submit->>'kind') where id=s.id;
 return public.v3_flow_exchange(p_hash,null)||jsonb_build_object('screen','REPORT','kind',p_submit->>'kind','purpose','occurrence');end if;
 if p_submit->>'kind'='no_issues' then
 if not private.member_can(s.care_recipient_id,s.user_id,'consumption.report') or s.used_at is not null then raise exception 'flow session expired or revoked' using errcode='42501';end if;
 insert into public.flow_submissions(session_id,care_recipient_id,user_id,body,status) values(s.id,s.care_recipient_id,s.user_id,p_submit,'no_issues');
 update public.flow_sessions set used_at=now() where id=s.id;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(s.user_id,'shift.no_issues','flow',s.id,jsonb_build_object('care_recipient_id',s.care_recipient_id,'stockChanged',false));
 return jsonb_build_object('purpose','occurrence','pendingConfirmation',false,'noIssues',true);end if;
 return public.v3_flow_exchange(p_hash,p_submit);end if;
 if not private.member_can(s.care_recipient_id,s.user_id,'ent.receive') then raise exception 'Flow recipient revoked' using errcode='42501';end if;
 if s.used_at is not null then
 if p_submit->>'operation'='confirm' then return s.payload_state->'result';end if;
 raise exception 'Flow token already used' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||s.care_recipient_id,0));
 select * into strict d from public.operational_documents where id=s.document_id for update;
 if d.recipient_id<>s.user_id or d.version<>s.document_version or d.status<>'pending_receipt'
 or not coalesce((select (settings->>'whatsappSimpleAcceptance')::boolean from public.patient_settings where care_recipient_id=d.care_recipient_id),false)
 or not exists(select 1 from public.verified_phones v join auth.users u on u.id=v.user_id where v.user_id=s.user_id and v.phone=s.verified_phone and '+'||ltrim(u.phone,'+')=v.phone and u.phone_confirmed_at is not null) then raise exception 'stale or unauthorized receipt Flow' using errcode='42501';end if;
 state:=s.payload_state;
 if p_submit->>'operation'='mode' and p_submit->>'mode'='all' then state:='{}';update public.flow_sessions set payload_state=state where id=s.id;end if;
 if p_submit->>'operation'='mode' and p_submit->>'mode' not in ('all','divergence') then raise exception 'invalid receipt mode';end if;
 if p_submit->>'operation'='line' then
 select * into v_line from public.document_lines where document_id=d.id and id=(p_submit->>'lineId')::uuid;
 q:=(p_submit->>'acceptedQuantity')::numeric;
 if not found or q is null or q<0 or q>v_line.quantity or q<>round(q,(select quantity_decimals from public.care_recipient_products where care_recipient_id=d.care_recipient_id and product_id=v_line.product_id)) or length(coalesce(p_submit->>'notes',''))>1000 then raise exception 'invalid Flow divergence';end if;
 state:=state||jsonb_build_object(v_line.id::text,jsonb_build_object('lineId',v_line.id,'acceptedQuantity',q::text,'notes',p_submit->>'notes'));
 update public.flow_sessions set payload_state=state where id=s.id;
 end if;
 select coalesce(jsonb_agg(value),'[]') into diffs from jsonb_each(state);
 select string_agg(l.name_snapshot||': expedido '||l.quantity::text||', aceito '||coalesce(state->l.id::text->>'acceptedQuantity',l.quantity::text),E'\n' order by l.name_snapshot) into summary from public.document_lines l where l.document_id=d.id;
 if p_submit->>'operation'='confirm' then
 if not s.review_ready then raise exception 'receipt review required';end if;
 insert into private.worker_authority values(pg_backend_pid(),txid_current(),s.user_id,s.care_recipient_id,'verified_whatsapp_flow_receipt');
 claims:=current_setting('request.jwt.claims',true);sub:=current_setting('request.jwt.claim.sub',true);previous:=current_setting('hca.verified_whatsapp_provider',true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',s.user_id,'role','authenticated')::text,true);perform set_config('request.jwt.claim.sub',s.user_id::text,true);
 perform set_config('hca.verified_whatsapp_provider','flow:'||s.id,true);
 result:=public.supply_document_command(d.id,'receive',jsonb_build_object('divergences',diffs),s.id,d.version);
 perform set_config('request.jwt.claims',coalesce(claims,''),true);perform set_config('request.jwt.claim.sub',coalesce(sub,''),true);perform set_config('hca.verified_whatsapp_provider',coalesce(previous,''),true);
 delete from private.worker_authority where backend_pid=pg_backend_pid() and transaction_id=txid_current();
 result:=jsonb_build_object('purpose','ent_receipt','accepted',true,'documentId',d.id,'status',result->>'status');
 update public.flow_sessions set used_at=now(),payload_state=jsonb_build_object('result',result) where id=s.id;
 insert into public.flow_submissions(session_id,care_recipient_id,user_id,body,status) values(s.id,s.care_recipient_id,s.user_id,jsonb_build_object('divergences',diffs),'accepted');
 return result;
 end if;
 if p_submit->>'operation'='mode' and p_submit->>'mode'='all' or p_submit->>'operation'='line' and p_submit->>'next'='review' then update public.flow_sessions set review_ready=true where id=s.id;
 elsif p_submit is not null then update public.flow_sessions set review_ready=false where id=s.id;end if;
 return jsonb_build_object('purpose','ent_receipt','screen',case when p_submit is null then 'RECEIPT_MODE' when p_submit->>'operation'='mode' and p_submit->>'mode'='divergence' or p_submit->>'operation'='line' and p_submit->>'next'='another' then 'RECEIPT_LINE' else 'RECEIPT_REVIEW' end,
 'documentCode',d.code,'reviewText',summary,
 'lines',(select jsonb_agg(jsonb_build_object('id',l.id,'title',l.name_snapshot||' - expedido '||l.quantity::text||' '||l.unit_snapshot) order by l.name_snapshot) from public.document_lines l where document_id=d.id));
end;$$;

alter table public.requisition_lifecycle add column fulfillment_state jsonb not null default '[]';
create or replace function private.refresh_requisition_lifecycle(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare s public.requisition_lifecycle;total integer;fulfilled integer;blocked boolean;current_state jsonb;changed boolean;begin
 select * into s from public.requisition_lifecycle where requisition_id=p_id for update;
 if not found then return;end if;
 select count(*),count(*) filter(where exists(select 1 from public.document_request_links k join public.document_lines l on l.id=k.document_line_id join public.operational_documents d on d.id=l.document_id
 where k.requisition_item_id=i.id and d.type='ENT' and d.status<>'cancelled' and l.accepted_quantity>0)) into total,fulfilled
 from public.requisition_items i where i.requisition_id=p_id;
 select exists(select 1 from public.document_request_links k join public.requisition_items i on i.id=k.requisition_item_id join public.document_lines l on l.id=k.document_line_id join public.operational_documents d on d.id=l.document_id
 where i.requisition_id=p_id and d.type='ENT' and (d.status='cancellation_pending' or coalesce((l.metadata->>'issueOpen')::boolean,false))) into blocked;

 select coalesce(jsonb_agg(jsonb_build_object('itemId',i.id,'deliveryId',d.id,'lineId',l.id,'accepted',l.accepted_quantity::text,'reconciled',l.reconciled_quantity::text,'issueOpen',coalesce((l.metadata->>'issueOpen')::boolean,false),'status',d.status) order by i.id,d.id,l.id),'[]') into current_state
 from public.requisition_items i join public.document_request_links k on k.requisition_item_id=i.id join public.document_lines l on l.id=k.document_line_id join public.operational_documents d on d.id=l.document_id and d.type='ENT' where i.requisition_id=p_id;
 changed:=current_state is distinct from s.fulfillment_state;
 if changed then
 update public.requisition_lifecycle set fulfillment_state=current_state where requisition_id=p_id;
 if (total>0 and total=fulfilled and not blocked)=(s.completed_at is not null) then
 update public.operational_documents set version=version+1 where id=p_id;
 perform private.record_document_event(p_id,'req.fulfillment_updated',jsonb_build_object('fulfilled',fulfilled,'total',total,'operationalIssue',blocked),gen_random_uuid());end if;end if;
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

-- UI capability is separate from identity and reflects session assurance.
create or replace function public.my_workspace() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare person public.profiles;patients jsonb;begin
 select * into person from public.profiles where id=auth.uid() and status='active';
 if not found or private.auth_session() is null then raise exception 'active Auth session required' using errcode='42501';end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'display_name',c.display_name,'is_active',c.is_active,'is_development',c.is_development,
 'role',m.role,'hasMembership',m.user_id is not null,'capabilities',case when public.can_access_recipient(c.id) then public.patient_capabilities(c.id) else '{}'::jsonb end) order by c.display_name,c.id),'[]') into patients
 from public.care_recipients c left join public.care_recipient_memberships m on m.care_recipient_id=c.id and m.user_id=person.id and m.status='active'
 where m.user_id is not null or private.global_identity();
 return jsonb_build_object('userId',person.id,'fullName',person.full_name,'isGlobalAdmin',private.global_identity(),'globalAdministrationAllowed',public.is_global_administrator(),'activeContext',public.my_active_context(),'patients',patients,'avatarPath',person.avatar_path);
end;$$;

-- Historical imports are evidence, not new operational requests.
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
 filtered as materialized(select * from visible where p_status is null or status=p_status),
 paged as(select * from filtered order by created_at desc,id offset (p_page-1)*p_size limit p_size)
 select jsonb_build_object('data',coalesce((select jsonb_agg(to_jsonb(p) order by created_at desc,id) from paged p),'[]'),'total',(select count(*) from filtered),'page',p_page,'pageSize',p_size) into result;
 return result;
end;$$;


grant execute on function public.operational_document_list(uuid,text,text,text,timestamptz,timestamptz,integer,integer) to authenticated;

revoke all on function public.v3_operational_tasks(uuid) from public,anon,authenticated,service_role;
create or replace function public.operational_tasks(p_patient uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;open_count integer;science_count integer;archive_count integer;begin
 if not public.can_access_recipient(p_patient) then raise exception 'patient operating context required' using errcode='42501';end if;
 result:=public.v3_operational_tasks(p_patient);
 select count(*) filter(where s.completed_at is null),count(*) filter(where auth.uid()=any(s.eligible_users) and not exists(select 1 from public.requisition_science_events e where e.requisition_id=d.id and e.user_id=auth.uid())),
 count(*) filter(where s.completed_at is not null and public.can_manage_recipient(p_patient)) into open_count,science_count,archive_count
 from public.operational_documents d join public.requisition_lifecycle s on s.requisition_id=d.id where d.care_recipient_id=p_patient and d.type='REQ' and d.status not in ('draft','cancelled') and s.archived_at is null and private.can(p_patient,'req.read') and not exists(select 1 from public.requisitions r where r.id=d.id and r.is_historical);
 return result||jsonb_build_object('requests',open_count,'sciencePending',science_count,'archivePending',archive_count);
end;$$;

create or replace function private.record_science(p_id uuid,p_user uuid,p_mode text,p_evidence jsonb) returns boolean
language plpgsql security definer set search_path='' as $$
declare s public.requisition_lifecycle;is_satisfied boolean;eid uuid;patient_id uuid;begin
 if exists(select 1 from public.requisitions where id=p_id and is_historical) then return false;end if;
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

create or replace function private.science_snapshot() returns trigger language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;begin
 select * into strict d from public.operational_documents where id=new.document_id;
 new.actor_name:=(select full_name from public.profiles where id=new.actor_id);
 new.authority_context:=case when new.actor_id is null then jsonb_build_object('mode','system') else coalesce(public.my_active_context(),(select jsonb_build_object('mode','verified_external','purpose',w.purpose) from private.worker_authority w where w.backend_pid=pg_backend_pid() and w.transaction_id=txid_current() and w.user_id=new.actor_id)) end;
 new.body:=new.body||jsonb_build_object('actorName',new.actor_name,'authority',new.authority_context,
 'history',coalesce((select jsonb_agg(jsonb_build_object('action',e.action,'actorName',coalesce(e.actor_name,e.body->>'actorName',case when e.actor_id is null then 'Sistema' else 'Identidade registrada no evento legado' end),'createdAt',e.created_at,'version',e.version) order by e.version) from public.document_events e where document_id=new.document_id),'[]')||jsonb_build_array(jsonb_build_object('action',new.action,'actorName',coalesce(new.actor_name,'Sistema'),'createdAt',new.created_at,'version',new.version)));
 if d.type='REQ' then
 if new.action='req.issued' then perform private.init_requisition_science(new.document_id);end if;
 new.body:=new.body||jsonb_build_object('isHistorical',coalesce((select r.is_historical from public.requisitions r where r.id=d.id),false),'sciencePolicy',(select to_jsonb(s) from public.requisition_lifecycle s where requisition_id=new.document_id),
 'scienceEvents',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at,e.id) from public.requisition_science_events e where requisition_id=new.document_id),'[]'),
 'fulfillmentLines',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'attended',exists(select 1 from public.document_request_links k join public.document_lines l on l.id=k.document_line_id join public.operational_documents x on x.id=l.document_id where k.requisition_item_id=i.id and x.type='ENT' and x.status<>'cancelled' and l.accepted_quantity>0))) from public.requisition_items i where i.requisition_id=d.id),'[]'));
 end if;
 new.content_hash:=encode(extensions.digest(new.body::text,'sha256'),'hex');
 update public.operational_documents set canonical_snapshot=new.body,content_hash=new.content_hash where id=new.document_id;
 return new;
end;$$;

-- Select only due work, so inactive/finished patients cannot starve later ones.
create or replace function public.v4_lifecycle_schedule() returns jsonb language plpgsql security definer set search_path='' as $$
declare s public.requisition_lifecycle;d public.operational_documents;n integer:=0;archived integer:=0;locked_patients uuid[];patient_id uuid;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'worker authorization required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('hca:operational-scheduler',0));
 select array_agg(id order by id) into locked_patients from (select care_recipient_id id,min(due) from (
 select care_recipient_id,next_reminder_at due from public.requisition_lifecycle where archived_at is null and not exists(select 1 from public.requisitions r where r.id=requisition_id and r.is_historical) and ((completed_at is null or not coalesce(private.science_satisfied(requisition_id),false)) and next_reminder_at<=now() or completed_at is not null and not manual_archive_required and coalesce(private.science_satisfied(requisition_id),false) and now()>=completed_at+make_interval(days=>coalesce((policy->>'archiveDays')::integer,7)))
 union all select care_recipient_id,updated_at due from public.operational_documents where type='ENT' and status='pending_receipt' and updated_at<now()-interval '24 hours') x group by care_recipient_id order by min(due) limit 25) x;
 for patient_id in select unnest(locked_patients) order by 1 loop perform pg_advisory_xact_lock(hashtextextended('stock:'||patient_id,0));end loop;
 for s in select * from public.requisition_lifecycle where archived_at is null and not exists(select 1 from public.requisitions r where r.id=requisition_id and r.is_historical) and ((completed_at is null or not coalesce(private.science_satisfied(requisition_id),false)) and next_reminder_at<=now() or completed_at is not null and not manual_archive_required and coalesce(private.science_satisfied(requisition_id),false) and now()>=completed_at+make_interval(days=>coalesce((policy->>'archiveDays')::integer,7))) and care_recipient_id=any(locked_patients) order by next_reminder_at limit 100 for update skip locked loop
 perform private.refresh_requisition_lifecycle(s.requisition_id);
 select * into s from public.requisition_lifecycle where requisition_id=s.requisition_id;
 select * into d from public.operational_documents where id=s.requisition_id for update;
 if d.status='cancelled' then continue;end if;
 if s.completed_at is not null and not s.manual_archive_required and coalesce(private.science_satisfied(d.id),false)
 and now()>=s.completed_at+make_interval(days=>coalesce((s.policy->>'archiveDays')::integer,7)) then
 update public.requisition_lifecycle set archived_at=now(),archive_reason='Prazo automático após conclusão e ciência válidas' where requisition_id=d.id;
 update public.operational_documents set version=version+1 where id=d.id;
 perform private.record_document_event(d.id,'req.archived.automatic',jsonb_build_object('scheduled',true),gen_random_uuid());archived:=archived+1;
 elsif (s.completed_at is null or not coalesce(private.science_satisfied(d.id),false)) and s.next_reminder_at<=now() then
 update public.requisition_lifecycle set next_reminder_at=now()+make_interval(hours=>coalesce((s.policy->>'reminderRepeatHours')::integer,24)),reminders=reminders+1 where requisition_id=d.id;
 update public.operational_documents set version=version+1 where id=d.id;
 perform private.record_document_event(d.id,'req.reminder',jsonb_build_object('sciencePending',not coalesce(private.science_satisfied(d.id),false)),gen_random_uuid());n:=n+1;
 end if;end loop;
 for d in select * from public.operational_documents where type='ENT' and status='pending_receipt' and care_recipient_id=any(locked_patients)
 and updated_at<now()-interval '24 hours' order by updated_at limit 50 for update skip locked loop
 update public.operational_documents set version=version+1,updated_at=now() where id=d.id;
 perform private.record_document_event(d.id,'ent.reminder','{"scheduled":true}',gen_random_uuid());n:=n+1;
 end loop;
 insert into private.scheduler_health(singleton,last_run,processed) values(true,now(),n+archived) on conflict(singleton) do update set last_run=now(),processed=excluded.processed;
 return jsonb_build_object('reminders',n,'archived',archived);
end;$$;

-- A global proposal must reach local administrators and its own proposer live.
create or replace function private.invalidate_workspace() returns trigger language plpgsql security definer set search_path='' as $$
declare row_data jsonb;pid uuid;u uuid;n bigint;begin
 row_data:=case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
 pid:=(row_data->>'care_recipient_id')::uuid;
 for u in select distinct user_id from public.care_recipient_memberships where care_recipient_id=pid and status='active'
 union select (row_data->>'user_id')::uuid where row_data->>'user_id' is not null
 union select (row_data->>'proposed_by')::uuid where row_data->>'proposed_by' is not null
 union select (row_data->>'id')::uuid where tg_table_name='profiles' loop
 insert into private.workspace_revisions(user_id,revision) values(u,1) on conflict(user_id) do update set revision=private.workspace_revisions.revision+1 returning revision into n;
 perform realtime.send(jsonb_build_object('revision',n),'invalidate','hca:user:'||u::text,true);
 end loop;return null;
end;$$;
create trigger v4_workspace_invalidation after insert or update on public.access_change_requests for each row execute function private.invalidate_workspace();
create trigger v4_workspace_invalidation after update of full_name,notification_preferences,status,role,global_scope on public.profiles for each row execute function private.invalidate_workspace();

alter function public.admin_upsert_membership(uuid,uuid,public.profile_role,boolean,boolean) rename to v4_admin_upsert_membership;
revoke all on function public.v4_admin_upsert_membership(uuid,uuid,public.profile_role,boolean,boolean) from public,anon,authenticated,service_role;
create function public.admin_upsert_membership(p_care_recipient_id uuid,p_user_id uuid,p_role public.profile_role,p_can_manage_stock boolean,p_can_count_stock boolean) returns public.care_recipient_memberships language plpgsql security definer set search_path='' as $$begin
 if not public.can_manage_recipient(p_care_recipient_id) then raise exception 'local administrator required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||p_care_recipient_id,0));
 return public.v4_admin_upsert_membership(p_care_recipient_id,p_user_id,p_role,p_can_manage_stock,p_can_count_stock);
end;$$;
alter function public.admin_set_membership_status(uuid,uuid,text) rename to v4_admin_set_membership_status;
revoke all on function public.v4_admin_set_membership_status(uuid,uuid,text) from public,anon,authenticated,service_role;
create function public.admin_set_membership_status(p_care_recipient_id uuid,p_user_id uuid,p_status text) returns public.care_recipient_memberships language plpgsql security definer set search_path='' as $$begin
 if not public.can_manage_recipient(p_care_recipient_id) then raise exception 'local administrator required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||p_care_recipient_id,0));
 return public.v4_admin_set_membership_status(p_care_recipient_id,p_user_id,p_status);
end;$$;
grant execute on function public.admin_upsert_membership(uuid,uuid,public.profile_role,boolean,boolean),public.admin_set_membership_status(uuid,uuid,text) to authenticated;
-- Record current attendance in a NEW version, preserving every earlier hash/PDF.
do $$declare p uuid;r record;begin
 for p in select distinct care_recipient_id from public.requisition_lifecycle order by 1 loop
 perform pg_advisory_xact_lock(hashtextextended('stock:'||p,0));
 for r in select s.requisition_id from public.requisition_lifecycle s join public.requisitions q on q.id=s.requisition_id where s.care_recipient_id=p and not q.is_historical and exists(select 1 from public.requisition_items i join public.document_request_links k on k.requisition_item_id=i.id where i.requisition_id=q.id) order by s.requisition_id loop
 perform private.refresh_requisition_lifecycle(r.requisition_id);end loop;end loop;
end;$$;

commit;
