begin;

-- Technical state never grants access to a patient or a document. Payloads,
-- names, destinations, endpoints, SQL text and secret values have no columns.
create function private.operations_policy(p_policy jsonb) returns jsonb
language plpgsql immutable set search_path='' as $$
declare defaults jsonb;result jsonb;k text;amount integer;
begin
 defaults:='{"heartbeatWarningSeconds":900,"heartbeatCriticalSeconds":3600,"jobWarningSeconds":3600,"jobCriticalSeconds":86400,"pdfWarningSeconds":1800,"pdfCriticalSeconds":7200,"backupWarningSeconds":86400,"backupCriticalSeconds":172800,"securityWindowSeconds":300,"securityWarningCount":10,"securityCriticalCount":100,"severity":{"application":"warning","database":"critical","worker":"warning","outbox":"warning","push":"warning","signature":"warning","integrity":"critical","backup":"warning","recovery":"warning","security":"critical","legacy":"warning"}}';
 if jsonb_typeof(p_policy) is distinct from 'object' or exists(select 1 from jsonb_object_keys(p_policy) x where not defaults ? x) then raise exception 'invalid operations policy' using errcode='22023';end if;
 if p_policy ? 'severity' and (jsonb_typeof(p_policy->'severity') is distinct from 'object' or exists(select 1 from jsonb_each(p_policy->'severity') s where not (defaults->'severity') ? s.key or s.value not in ('"warning"'::jsonb,'"critical"'::jsonb))) then raise exception 'invalid operations severity' using errcode='22023';end if;
 result:=jsonb_set(defaults||(p_policy-'severity'),'{severity}',(defaults->'severity')||coalesce(p_policy->'severity','{}'::jsonb));
 for k in select jsonb_object_keys(defaults-'severity') loop
  if jsonb_typeof(result->k) is distinct from 'number' or (result->>k)!~'^[0-9]{1,7}$' then raise exception 'invalid operations threshold' using errcode='22023';end if;
  amount:=(result->>k)::integer;
  if amount not between 1 and 2592000 then raise exception 'invalid operations threshold' using errcode='22023';end if;
  result:=jsonb_set(result,array[k],to_jsonb(amount));
 end loop;
 for k in select unnest(array['heartbeat','job','pdf','backup']) loop
  if (result->>(k||'WarningSeconds'))::integer>(result->>(k||'CriticalSeconds'))::integer then raise exception 'invalid operations threshold order' using errcode='22023';end if;
 end loop;
 if (result->>'securityWarningCount')::integer>(result->>'securityCriticalCount')::integer then raise exception 'invalid operations threshold order' using errcode='22023';end if;
 return result;
end;$$;

create table private.operations_config (
 environment text primary key check(environment in ('local','preview','production','shared_database','operator')),
 version integer not null default 1 check(version>0),policy jsonb not null,
 external_adapter text not null default 'none' check(external_adapter='none'),
 updated_at timestamptz not null default now(),updated_by uuid references auth.users(id)
);
insert into private.operations_config(environment,policy)
select e,private.operations_policy('{}') from unnest(array['local','preview','production','shared_database','operator']) e;
create table private.operations_components (
 environment text not null references private.operations_config(environment),
 component text not null check(component in ('application','database','worker','outbox','push','signature','integrity','backup','recovery','security','legacy')),
 observed_at timestamptz,success_at timestamptz,primary key(environment,component)
);
insert into private.operations_components(environment,component)
 select environment,c from private.operations_config cross join unnest(array['application','database','worker','outbox','push','signature','integrity','backup','recovery','security','legacy']) c;
create table private.operations_events (
 id uuid primary key default gen_random_uuid(),idempotency_key uuid not null unique,
 environment text not null,component text not null,
 code text not null check(code in ('HEARTBEAT','API_ERROR','DATABASE_UNAVAILABLE','HEARTBEAT_STALE','JOB_DELAY','OUTBOX_UNCERTAIN','PUSH_UNCERTAIN','SIGNATURE_PENDING','SIGNATURE_FAILURE','INTEGRITY_FAILURE','BACKUP_VERIFIED','BACKUP_FAILURE','BACKUP_LATE','BACKUP_RETENTION','RECOVERY_PROBE_VERIFIED','RECOVERY_FAILURE','SECURITY_REJECTED','LEGACY_FAILURE','LEGACY_GAP','LEGACY_BACKLOG','CHANNEL_NOT_CONFIGURED')),
 severity text not null check(severity in ('info','warning','critical')),
 correlation_id uuid not null,observed_at timestamptz not null,
 recorded_at timestamptz not null default clock_timestamp(),request_hash text not null,
 metrics jsonb not null default '{}',
 foreign key(environment,component) references private.operations_components(environment,component)
);
create index operations_events_recent on private.operations_events(environment,component,observed_at desc,id desc);
create table private.operations_incidents (
 id uuid primary key default gen_random_uuid(),environment text not null,component text not null,
 code text not null,severity text not null check(severity in ('warning','critical')),
 state text not null default 'open' check(state in ('open','acknowledged','resolved')),
 version integer not null default 1 check(version>0),policy_version integer not null,first_observed_at timestamptz not null,
 last_observed_at timestamptz not null,occurrences integer not null default 1,
 metric_count bigint not null default 0,last_event_id uuid references private.operations_events(id),
 acknowledged_at timestamptz,resolved_at timestamptz,resolution text,
 foreign key(environment,component) references private.operations_components(environment,component)
);
create unique index operations_one_active_incident on private.operations_incidents(environment,component,code) where state<>'resolved';
create index operations_incidents_page on private.operations_incidents(environment,first_observed_at desc,id desc);
create table private.operations_history (
 id uuid primary key default gen_random_uuid(),environment text not null references private.operations_config(environment),
 incident_id uuid references private.operations_incidents(id),event_id uuid references private.operations_events(id),
 action text not null check(action in ('opened','observed','acknowledged','resolved','recovered','configured','escalated')),
 actor_id uuid references auth.users(id),recorded_at timestamptz not null default clock_timestamp(),
 version integer,reason text check(reason is null or reason in ('investigating','waiting_dependency','contained','corrected','reviewed_history','false_alarm')),
 policy_hash text,policy_snapshot jsonb,policy_version integer
);
create index operations_history_incident on private.operations_history(incident_id,recorded_at,id);
insert into private.operations_history(environment,action,version,policy_hash,policy_snapshot,policy_version)
select environment,'configured',version,encode(extensions.digest(policy::text,'sha256'),'hex'),policy,version from private.operations_config;
create table private.operations_commands (
 actor_id uuid not null references auth.users(id),idempotency_key uuid not null,
 environment text not null references private.operations_config(environment),request_hash text not null,
 receipt jsonb not null,created_at timestamptz not null default clock_timestamp(),primary key(actor_id,idempotency_key)
);
alter table private.operations_config enable row level security;
alter table private.operations_components enable row level security;
alter table private.operations_events enable row level security;
alter table private.operations_incidents enable row level security;
alter table private.operations_history enable row level security;
alter table private.operations_commands enable row level security;
revoke all on private.operations_config,private.operations_components,private.operations_events,
 private.operations_incidents,private.operations_history,private.operations_commands from public,anon,authenticated,service_role;

create function private.operations_condition(p_environment text,p_component text,p_code text,p_active boolean,p_severity text,p_count bigint default 0,p_event uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare current_incident private.operations_incidents;result uuid;policy_revision integer;
begin
 -- All callers use the same environment advisory lock before incident rows.
 perform pg_advisory_xact_lock(hashtextextended('hca:operations:'||p_environment,0));
 select version into strict policy_revision from private.operations_config where environment=p_environment;
 select * into current_incident from private.operations_incidents where environment=p_environment and component=p_component and code=p_code and state<>'resolved' for update;
 if not p_active then
  if found then
   update private.operations_incidents set state='resolved',resolved_at=clock_timestamp(),version=version+1 where id=current_incident.id;
   insert into private.operations_history(environment,incident_id,event_id,action,version) values(p_environment,current_incident.id,p_event,'recovered',current_incident.version+1);
  end if;return null;
 end if;
 if not found then
  insert into private.operations_incidents(environment,component,code,severity,policy_version,first_observed_at,last_observed_at,metric_count,last_event_id)
   values(p_environment,p_component,p_code,p_severity,policy_revision,clock_timestamp(),clock_timestamp(),p_count,p_event) returning id into result;
  insert into private.operations_history(environment,incident_id,event_id,action,version,policy_version) values(p_environment,result,p_event,'opened',1,policy_revision);
  return result;
 end if;
 result:=current_incident.id;
 if p_event is not null or p_severity<>current_incident.severity or p_count<>current_incident.metric_count then
  update private.operations_incidents set last_observed_at=clock_timestamp(),metric_count=p_count,severity=p_severity,
   last_event_id=coalesce(p_event,last_event_id),occurrences=occurrences+case when p_event is not null then 1 else 0 end,version=version+1,policy_version=policy_revision where id=result;
  insert into private.operations_history(environment,incident_id,event_id,action,version,policy_version)
   values(p_environment,result,p_event,case when p_event is not null then 'observed' else 'escalated' end,current_incident.version+1,policy_revision);
 else update private.operations_incidents set last_observed_at=clock_timestamp() where id=result;
 end if;
 return result;
end;$$;

create function private.operations_append_only() returns trigger
language plpgsql set search_path='' as $$begin raise exception 'immutable technical history' using errcode='42501';end;$$;
create trigger operations_events_immutable before update or delete on private.operations_events for each row execute function private.operations_append_only();
create trigger operations_history_immutable before update or delete on private.operations_history for each row execute function private.operations_append_only();
create trigger operations_commands_immutable before update or delete on private.operations_commands for each row execute function private.operations_append_only();

create function public.record_operations_event(p_event jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare env text;v_component text;code text;level text;event_key uuid;correlation uuid;at_time timestamptz;
 metrics jsonb;body_hash text;event_id uuid;previous private.operations_events;policy jsonb;incident uuid;k text;n numeric;
begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'worker authorization required' using errcode='42501';end if;
 if jsonb_typeof(p_event) is distinct from 'object' or octet_length(p_event::text)>8192
 or exists(select 1 from jsonb_object_keys(p_event) x where x not in ('environment','component','code','idempotencyKey','correlationId','observedAt','metrics')) then raise exception 'invalid technical event' using errcode='22023';end if;
 env:=p_event->>'environment';v_component:=p_event->>'component';code:=p_event->>'code';
 if env is null or v_component is null or code is null or not exists(select 1 from private.operations_components c where c.environment=env and c.component=v_component)
 or code not in ('HEARTBEAT','API_ERROR','DATABASE_UNAVAILABLE','HEARTBEAT_STALE','JOB_DELAY','OUTBOX_UNCERTAIN','PUSH_UNCERTAIN','SIGNATURE_PENDING','SIGNATURE_FAILURE','INTEGRITY_FAILURE','BACKUP_VERIFIED','BACKUP_FAILURE','BACKUP_LATE','BACKUP_RETENTION','RECOVERY_PROBE_VERIFIED','RECOVERY_FAILURE','SECURITY_REJECTED','LEGACY_FAILURE','LEGACY_GAP','LEGACY_BACKLOG','CHANNEL_NOT_CONFIGURED') then raise exception 'invalid technical event scope' using errcode='22023';end if;
 if not (case
  when code='HEARTBEAT' then v_component in ('application','database','worker')
  when code='API_ERROR' then v_component in ('application','worker')
  when code='DATABASE_UNAVAILABLE' then v_component='database'
  when code='HEARTBEAT_STALE' then v_component in ('application','worker')
  when code='JOB_DELAY' then v_component in ('worker','outbox','push')
  when code='OUTBOX_UNCERTAIN' then v_component='outbox'
  when code='PUSH_UNCERTAIN' then v_component='push'
  when code in ('SIGNATURE_PENDING','SIGNATURE_FAILURE') then v_component='signature'
  when code='INTEGRITY_FAILURE' then v_component='integrity'
  when code like 'BACKUP_%' then v_component='backup'
  when code like 'RECOVERY_%' then v_component='recovery'
  when code='SECURITY_REJECTED' then v_component='security'
  when code like 'LEGACY_%' then v_component='legacy'
  when code='CHANNEL_NOT_CONFIGURED' then v_component in ('outbox','push')
  else false end) then raise exception 'invalid technical component' using errcode='22023';end if;
 begin event_key:=(p_event->>'idempotencyKey')::uuid;correlation:=(p_event->>'correlationId')::uuid;at_time:=(p_event->>'observedAt')::timestamptz;
 exception when others then raise exception 'invalid technical event identity' using errcode='22023';end;
 if event_key is null or correlation is null or at_time is null or not isfinite(at_time) or at_time>clock_timestamp()+interval '5 minutes' then raise exception 'invalid technical event time' using errcode='22023';end if;
 metrics:=coalesce(p_event->'metrics','{}'::jsonb);
 if jsonb_typeof(metrics) is distinct from 'object' or exists(select 1 from jsonb_object_keys(metrics) x where x not in ('count','bytes','files','manifestSha256','archiveId','sourceMigrations','sourceCode','retentionComplete')) then raise exception 'private technical payload forbidden' using errcode='22023';end if;
 for k in select unnest(array['count','bytes','files','sourceMigrations']) loop
  if metrics ? k then
   if jsonb_typeof(metrics->k) is distinct from 'number' or (metrics->>k)!~'^[0-9]{1,13}$' then raise exception 'invalid technical metric' using errcode='22023';end if;
   n:=(metrics->>k)::numeric;if n>1000000000000 then raise exception 'invalid technical metric' using errcode='22023';end if;
  end if;
 end loop;
 if metrics ? 'manifestSha256' and (jsonb_typeof(metrics->'manifestSha256') is distinct from 'string' or (metrics->>'manifestSha256')!~'^[a-f0-9]{64}$') then raise exception 'invalid archive digest' using errcode='22023';end if;
 if metrics ? 'archiveId' and (jsonb_typeof(metrics->'archiveId') is distinct from 'string' or metrics->>'archiveId'!~'^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$') then raise exception 'invalid archive reference' using errcode='22023';end if;
 if metrics ? 'sourceCode' and (jsonb_typeof(metrics->'sourceCode') is distinct from 'string' or metrics->>'sourceCode' not in ('INTERNAL_ERROR','DATABASE_UNAVAILABLE','PDF_BYTES_DIVERGE','WORKER_NOT_CONFIGURED','PUSH_RESULT_UNCONFIRMED','INVALID_ORIGIN','SIGNING_NOT_CONFIGURED','INTEGRITY_PROOF_FAILED')) then raise exception 'invalid technical source code' using errcode='22023';end if;
 if metrics ? 'retentionComplete' and jsonb_typeof(metrics->'retentionComplete') is distinct from 'boolean' then raise exception 'invalid retention state' using errcode='22023';end if;
 if code in ('BACKUP_VERIFIED','RECOVERY_PROBE_VERIFIED') and (not metrics ?& array['archiveId','manifestSha256','files','bytes'] or coalesce((metrics->>'files')::numeric,0)<1 or coalesce((metrics->>'bytes')::numeric,0)<1) then raise exception 'verified archive evidence required' using errcode='22023';end if;
 -- Heartbeats are monotonic component observations, not an ever-growing event
 -- journal. They cannot resolve incidents, carry metrics or regress clocks.
 if code='HEARTBEAT' then
  if metrics<>'{}'::jsonb then raise exception 'heartbeat metrics forbidden' using errcode='22023';end if;
  perform pg_advisory_xact_lock(hashtextextended('hca:operations:'||env,0));
  update private.operations_components set observed_at=greatest(observed_at,at_time),success_at=greatest(success_at,at_time) where environment=env and component=v_component;
  return jsonb_build_object('id',event_key,'idempotencyKey',event_key,'recorded',true,'replayed',false,'storage','component');
 end if;
 body_hash:=encode(extensions.digest(p_event::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('hca:operations-event:'||event_key,0));
 select * into previous from private.operations_events where idempotency_key=event_key;
 if found then
  if previous.request_hash<>body_hash then raise exception 'technical event key differs' using errcode='23505';end if;
  return jsonb_build_object('id',previous.id,'idempotencyKey',event_key,'recorded',true,'replayed',true);
 end if;
 perform pg_advisory_xact_lock(hashtextextended('hca:operations:'||env,0));
 select c.policy into strict policy from private.operations_config c where c.environment=env;
 level:=case when code in ('HEARTBEAT','BACKUP_VERIFIED','RECOVERY_PROBE_VERIFIED') then 'info' else policy->'severity'->>v_component end;
 insert into private.operations_events(idempotency_key,environment,component,code,severity,correlation_id,observed_at,request_hash,metrics)
 values(event_key,env,v_component,code,level,correlation,at_time,body_hash,metrics) returning id into event_id;
 update private.operations_components set observed_at=greatest(observed_at,at_time),success_at=case when level='info' then greatest(success_at,at_time) else success_at end where environment=env and operations_components.component=v_component;
 if level<>'info' and code<>'SECURITY_REJECTED' then incident:=private.operations_condition(env,v_component,code,true,level,coalesce((metrics->>'count')::bigint,1),event_id);end if;
 return jsonb_build_object('id',event_id,'idempotencyKey',event_key,'recorded',true,'replayed',false);
end;$$;

create function private.collect_operations_status() returns jsonb
language plpgsql security definer set search_path='' as $$
declare env text:='shared_database';policy jsonb;n bigint;age_seconds numeric;last_backup timestamptz;
 row_state record;app_environment text;window_start timestamptz;gap_reviewed timestamptz;
begin
 perform pg_advisory_xact_lock(hashtextextended('hca:operations:'||env,0));
 select c.policy into strict policy from private.operations_config c where c.environment=env;
 update private.operations_components set observed_at=clock_timestamp(),success_at=clock_timestamp() where environment=env and component='database';
 select count(*) into n from private.legacy_reminder_failures f join public.care_recipients c on c.id=f.care_recipient_id where c.is_active and f.resolved_at is null;
 n:=n+(select count(*) from private.operational_scheduler_failures f join public.care_recipients c on c.id=f.care_recipient_id where c.is_active and f.resolved_at is null);
 perform private.operations_condition(env,'legacy','LEGACY_FAILURE',n>0,policy->'severity'->>'legacy',n);
 select max(resolved_at) into gap_reviewed from private.operations_incidents where environment=env and code='LEGACY_GAP' and resolution='reviewed_history';
 select count(*) into n from private.legacy_reminder_gaps g join public.care_recipients c on c.id=g.care_recipient_id where c.is_active and g.detected_at>coalesce(gap_reviewed,'-infinity');
 perform private.operations_condition(env,'legacy','LEGACY_GAP',n>0,policy->'severity'->>'legacy',n);
 select count(*) into n from private.legacy_reminder_checkpoints c join private.legacy_reminder_candidates x using(care_recipient_id)
 where c.closed_through<(clock_timestamp() at time zone 'America/Sao_Paulo')::date-1;
 perform private.operations_condition(env,'legacy','LEGACY_BACKLOG',n>0,policy->'severity'->>'legacy',n);
 update private.operations_components set observed_at=clock_timestamp() where environment=env and component='legacy';
 select count(*) into n from public.requisition_notifications x join public.care_recipients c on c.id=x.care_recipient_id where c.is_active and x.state='uncertain';
 perform private.operations_condition(env,'outbox','OUTBOX_UNCERTAIN',n>0,policy->'severity'->>'outbox',n);
 select count(*),extract(epoch from clock_timestamp()-min(x.next_attempt_at)) into n,age_seconds
 from public.requisition_notifications x join public.care_recipients c on c.id=x.care_recipient_id
 where c.is_active and x.channel='internal' and x.state in ('pending','processing') and x.next_attempt_at<clock_timestamp()-make_interval(secs=>(policy->>'jobWarningSeconds')::integer);
 perform private.operations_condition(env,'outbox','JOB_DELAY',n>0,case when age_seconds>=(policy->>'jobCriticalSeconds')::integer then 'critical' else policy->'severity'->>'outbox' end,n);
 update private.operations_components set observed_at=clock_timestamp() where environment=env and component='outbox';
 select count(*) into n from private.web_push_deliveries d join public.requisition_notifications x on x.id=d.notice_id join public.care_recipients c on c.id=x.care_recipient_id where c.is_active and d.state in ('uncertain','failed');
 perform private.operations_condition(env,'push','PUSH_UNCERTAIN',n>0,policy->'severity'->>'push',n);
 select count(*),extract(epoch from clock_timestamp()-min(d.next_attempt_at)) into n,age_seconds
 from private.web_push_deliveries d join public.requisition_notifications x on x.id=d.notice_id join public.care_recipients c on c.id=x.care_recipient_id
 where c.is_active and d.state in ('pending','processing') and d.next_attempt_at<clock_timestamp()-make_interval(secs=>(policy->>'jobWarningSeconds')::integer);
 perform private.operations_condition(env,'push','JOB_DELAY',n>0,case when age_seconds>=(policy->>'jobCriticalSeconds')::integer then 'critical' else policy->'severity'->>'push' end,n);
 update private.operations_components set observed_at=clock_timestamp() where environment=env and component='push';
 select count(*),extract(epoch from clock_timestamp()-min(p.requested_at)) into n,age_seconds
 from private.pdf_issuances p join public.care_recipients c on c.id=p.care_recipient_id where c.is_active and
 (p.state='uncertain' or (p.state in ('reserved','processing') and coalesce(p.lease_until,p.requested_at)<clock_timestamp()-make_interval(secs=>(policy->>'pdfWarningSeconds')::integer)));
 perform private.operations_condition(env,'signature','SIGNATURE_PENDING',n>0,case when age_seconds>=(policy->>'pdfCriticalSeconds')::integer then 'critical' else policy->'severity'->>'signature' end,n);
 update private.operations_components set observed_at=clock_timestamp() where environment=env and component='signature';
 select max(observed_at) into last_backup from private.operations_events where component='backup' and code='BACKUP_VERIFIED';
 age_seconds:=extract(epoch from clock_timestamp()-last_backup);
 perform private.operations_condition(env,'backup','BACKUP_LATE',last_backup is null or age_seconds>=(policy->>'backupWarningSeconds')::integer,
 case when age_seconds>=(policy->>'backupCriticalSeconds')::integer then 'critical' else policy->'severity'->>'backup' end,1);
 -- Age is a read-time clock, not an immutable fact. This condition keeps a
 -- constant metric and records threshold transitions without per-tick history.
 update private.operations_components set observed_at=clock_timestamp() where environment=env and component='backup';
 for app_environment in select c.environment from private.operations_config c where c.environment in ('local','preview','production') order by c.environment loop
  perform pg_advisory_xact_lock(hashtextextended('hca:operations:'||app_environment,0));
  select c.policy into strict policy from private.operations_config c where c.environment=app_environment;
  window_start:=clock_timestamp()-make_interval(secs=>(policy->>'securityWindowSeconds')::integer);
  select count(*) into n from private.operations_events where environment=app_environment and code='SECURITY_REJECTED' and observed_at>=window_start;
  perform private.operations_condition(app_environment,'security','SECURITY_REJECTED',n>=(policy->>'securityWarningCount')::integer,
   case when n>=(policy->>'securityCriticalCount')::integer then 'critical' else policy->'severity'->>'security' end,n);
  select count(*) into n from private.operations_events where environment=app_environment and component='application' and code='API_ERROR' and observed_at>=window_start;
  perform private.operations_condition(app_environment,'application','API_ERROR',n>0,policy->'severity'->>'application',n);
  for row_state in select component,observed_at from private.operations_components where environment=app_environment and component in ('application','worker') loop
   age_seconds:=extract(epoch from clock_timestamp()-row_state.observed_at);
   perform private.operations_condition(app_environment,row_state.component,'HEARTBEAT_STALE',age_seconds is not null and age_seconds>=(policy->>'heartbeatWarningSeconds')::integer,
    case when age_seconds>=(policy->>'heartbeatCriticalSeconds')::integer then 'critical' else policy->'severity'->>row_state.component end,1);
  end loop;
 end loop;
 return jsonb_build_object('observed',true,'environment',env,'externalAdapter','none','operationalGo',false);
end;$$;

create function public.collect_operations_status() returns jsonb
language plpgsql security definer set search_path='' as $$begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'worker authorization required' using errcode='42501';end if;
 return private.collect_operations_status();
end;$$;

-- Preserve the exact business scheduler. Only its final return is extended;
-- monitoring failures roll back their subtransaction, not business effects.
do $monitor$
declare definition text;old_return text:='return v_result || jsonb_build_object(''balanceAssignments'',v_assignments,''balancePatientsProcessed'',v_processed);';
begin
 definition:=replace(pg_get_functiondef('public.run_operational_schedule()'::regprocedure),E'\r\n',E'\n');
 if (length(definition)-length(replace(definition,old_return,'')))/length(old_return)<>1 then raise exception 'unexpected scheduler baseline';end if;
 execute replace(definition,old_return,$inject$
 begin
  perform private.collect_operations_status();
 exception when others then
  return v_result || jsonb_build_object('balanceAssignments',v_assignments,'balancePatientsProcessed',v_processed,'operationsObserved',false);
 end;
 return v_result || jsonb_build_object('balanceAssignments',v_assignments,'balancePatientsProcessed',v_processed,'operationsObserved',true);
$inject$);
end;$monitor$;

create function public.operations_diagnostics(p_environment text,p_page integer default 1,p_size integer default 20,p_state text default 'active') returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;total bigint;ids uuid[];
begin
 if not public.is_global_administrator() then raise exception 'global authorization required' using errcode='42501';end if;
 if p_environment is null or not exists(select 1 from private.operations_config where environment=p_environment)
 or p_page is null or p_page<1 or p_page>100000 or p_size is null or p_size not between 1 and 50 or p_state is null or p_state not in ('active','resolved','all') then raise exception 'invalid operations page' using errcode='22023';end if;
 select count(*) into total from private.operations_incidents where environment=p_environment and (p_state='all' or (p_state='active' and state<>'resolved') or (p_state='resolved' and state='resolved'));
 ids:=array(select id from private.operations_incidents where environment=p_environment and (p_state='all' or (p_state='active' and state<>'resolved') or (p_state='resolved' and state='resolved')) order by first_observed_at desc,id desc offset ((p_page-1)*p_size) limit p_size);
 select jsonb_build_object('environment',p_environment,'consultedAt',clock_timestamp(),
 'policy',(select jsonb_build_object('version',version,'values',policy) from private.operations_config where environment=p_environment),
 'components',(select jsonb_agg(jsonb_build_object('component',c.component,'observedAt',c.observed_at,'successAt',c.success_at,
  'state',case when exists(select 1 from private.operations_incidents i where i.environment=c.environment and i.component=c.component and i.state<>'resolved') then 'attention' when c.observed_at is null then 'unobserved' else 'observed' end) order by c.component) from private.operations_components c where c.environment=p_environment),
 'data',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'component',i.component,'code',i.code,'severity',i.severity,'state',i.state,'version',i.version,'policyVersion',i.policy_version,
  'firstObservedAt',i.first_observed_at,'lastObservedAt',i.last_observed_at,'occurrences',i.occurrences,'metricCount',i.metric_count,'acknowledgedAt',i.acknowledged_at,'resolvedAt',i.resolved_at,
  'correlationId',(select correlation_id from private.operations_events where id=i.last_event_id),
  'history',coalesce((select jsonb_agg(x.item order by x.at,x.id) from (select h.id,h.recorded_at at,jsonb_build_object('action',h.action,'at',h.recorded_at,'version',h.version,'reason',h.reason,'operator',case when h.actor_id is null then 'system' else 'global' end) item from private.operations_history h where h.incident_id=i.id order by h.recorded_at desc,h.id desc limit 12) x),'[]'::jsonb)) order by i.first_observed_at desc,i.id desc) from private.operations_incidents i where i.id=any(ids)),'[]'::jsonb),
 'total',total,'page',p_page,'pageSize',p_size,
 'events',coalesce((select jsonb_agg(x.item order by x.at desc,x.id desc) from (select e.id,e.observed_at at,jsonb_build_object('id',e.id,'component',e.component,'code',e.code,'severity',e.severity,'correlationId',e.correlation_id,'at',e.observed_at,'metrics',e.metrics) item from private.operations_events e where e.environment=p_environment order by e.observed_at desc,e.id desc limit 20) x),'[]'::jsonb),
 'policyHistory',coalesce((select jsonb_agg(x.item order by x.at desc,x.id desc) from (select h.id,h.recorded_at at,jsonb_build_object('at',h.recorded_at,'version',h.policy_version,'hash',h.policy_hash,'values',h.policy_snapshot,'operator',case when h.actor_id is null then 'system' else 'global' end) item from private.operations_history h where h.environment=p_environment and h.action='configured' order by h.recorded_at desc,h.id desc limit 10) x),'[]'::jsonb),
 'externalAdapter','none','backupOperationalExternalActive',false,'operationalGo',false,'externalAvailabilityProved',false) into result;
 if not public.is_global_administrator() then raise exception 'global authorization required' using errcode='42501';end if;
 return result;
end;$$;

create function public.operations_history(p_environment text,p_incident uuid default null,p_page integer default 1,p_size integer default 20) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare result jsonb;total bigint;
begin
 if not public.is_global_administrator() then raise exception 'global authorization required' using errcode='42501';end if;
 if p_environment is null or not exists(select 1 from private.operations_config where environment=p_environment) or p_page is null or p_page<1 or p_page>100000 or p_size is null or p_size not between 1 and 50 then raise exception 'invalid operations history page' using errcode='22023';end if;
 if p_incident is not null and not exists(select 1 from private.operations_incidents where id=p_incident and environment=p_environment) then raise exception 'incident unavailable' using errcode='42501';end if;
 select count(*) into total from private.operations_history h where h.environment=p_environment and ((p_incident is null and h.action='configured') or h.incident_id=p_incident);
 select jsonb_build_object('environment',p_environment,'incidentId',p_incident,'total',total,'page',p_page,'pageSize',p_size,
  'data',coalesce((select jsonb_agg(x.item order by x.stamp desc,x.id desc) from (select h.id,h.recorded_at stamp,jsonb_build_object('id',h.id,'action',h.action,'at',h.recorded_at,'version',h.version,'reason',h.reason,'policyVersion',h.policy_version,'policyHash',h.policy_hash,'policy',h.policy_snapshot,'operator',case when h.actor_id is null then 'system' else 'global' end) item from private.operations_history h where h.environment=p_environment and ((p_incident is null and h.action='configured') or h.incident_id=p_incident) order by h.recorded_at desc,h.id desc offset ((p_page-1)*p_size) limit p_size) x),'[]'::jsonb)) into result;
 if not public.is_global_administrator() then raise exception 'global authorization required' using errcode='42501';end if;
 return result;
end;$$;

create function public.operations_command(p_environment text,p_action text,p_id uuid,p_expected integer,p_payload jsonb,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid;body_hash text;saved private.operations_commands;config private.operations_config;
 incident private.operations_incidents;result jsonb;next_policy jsonb;reason text;revision integer;noop boolean:=false;
begin
 if not public.is_global_administrator() then raise exception 'global authorization required' using errcode='42501';end if;
 actor:=auth.uid();
 if p_environment is null or not exists(select 1 from private.operations_config where environment=p_environment)
 or p_key is null or p_action is null or p_action not in ('configure','acknowledge','resolve') or p_expected is null or p_expected<1
 or jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>8192 then raise exception 'invalid operations command' using errcode='22023';end if;
 if p_action='configure' then
  if p_id is not null or not p_payload ? 'policy' or exists(select 1 from jsonb_object_keys(p_payload) x where x<>'policy') or jsonb_typeof(p_payload->'policy') is distinct from 'object' then raise exception 'invalid operations policy command' using errcode='22023';end if;
 else
  reason:=p_payload->>'reason';
  if p_id is null or reason is null or exists(select 1 from jsonb_object_keys(p_payload) x where x<>'reason')
  or (p_action='acknowledge' and reason not in ('investigating','waiting_dependency','contained'))
  or (p_action='resolve' and reason not in ('corrected','reviewed_history','false_alarm')) then raise exception 'invalid operations incident command' using errcode='22023';end if;
 end if;
 body_hash:=encode(extensions.digest(jsonb_build_object('environment',p_environment,'action',p_action,'id',p_id,'expected',p_expected,'payload',p_payload)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('hca:operations-command:'||actor||':'||p_key,0));
 perform pg_advisory_xact_lock(hashtextextended('hca:operations:'||p_environment,0));
 if not public.is_global_administrator() then raise exception 'global authorization required' using errcode='42501';end if;
 select * into saved from private.operations_commands where actor_id=actor and idempotency_key=p_key;
 if found then
  if saved.request_hash<>body_hash then raise exception 'operations command key differs' using errcode='23505';end if;
  return saved.receipt;
 end if;
 if p_action='configure' then
  select * into strict config from private.operations_config where environment=p_environment for update;
  if config.version<>p_expected then raise exception 'version conflict' using errcode='40001';end if;
  next_policy:=private.operations_policy(jsonb_set(config.policy||(p_payload->'policy'),'{severity}',(config.policy->'severity')||coalesce(p_payload->'policy'->'severity','{}'::jsonb)));
  revision:=config.version+1;
  update private.operations_config set policy=next_policy,version=revision,updated_at=clock_timestamp(),updated_by=actor where environment=p_environment;
  insert into private.operations_history(environment,action,actor_id,version,policy_hash,policy_snapshot,policy_version)
   values(p_environment,'configured',actor,revision,encode(extensions.digest(next_policy::text,'sha256'),'hex'),next_policy,revision);
 else
  select * into incident from private.operations_incidents where id=p_id and environment=p_environment for update;
  if not found then raise exception 'incident unavailable' using errcode='42501';end if;
  if incident.version<>p_expected then raise exception 'version conflict' using errcode='40001';end if;
  if incident.state='resolved' or (p_action='acknowledge' and incident.state='acknowledged') then
   revision:=incident.version;noop:=true;
  else
   revision:=incident.version+1;
   update private.operations_incidents set state=case when p_action='acknowledge' then 'acknowledged' else 'resolved' end,version=revision,
    acknowledged_at=case when p_action='acknowledge' then clock_timestamp() else acknowledged_at end,
    resolved_at=case when p_action='resolve' then clock_timestamp() else null end,resolution=case when p_action='resolve' then reason else null end where id=p_id;
   insert into private.operations_history(environment,incident_id,action,actor_id,version,reason,policy_version)
    values(p_environment,p_id,case when p_action='acknowledge' then 'acknowledged' else 'resolved' end,actor,revision,reason,incident.policy_version);
  end if;
 end if;
 if not public.is_global_administrator() then raise exception 'global authorization required' using errcode='42501';end if;
 result:=jsonb_build_object('environment',p_environment,'action',p_action,'incidentId',p_id,'version',revision,'idempotencyKey',p_key,'recorded',true,'noop',noop);
 insert into private.operations_commands(actor_id,idempotency_key,environment,request_hash,receipt) values(actor,p_key,p_environment,body_hash,result);
 return result;
end;$$;

-- Authority of a personal impact is independent from its internal/external
-- transport. This private gate accepts only the current recipient's DB row.
create function private.operations_notice_allowed(n public.requisition_notifications) returns boolean
language plpgsql stable security definer set search_path='' as $$
declare capability text;
begin
 if n.recipient_user_id is distinct from auth.uid() or n.silent or n.state in ('cancelled','failed') then return false;end if;
 if n.document_id is not null then
  select lower(type)||'.read' into capability from public.operational_documents where id=n.document_id and care_recipient_id=n.care_recipient_id;
  return found and private.member_can(n.care_recipient_id,auth.uid(),capability);
 elsif n.requisition_id is not null then
  return exists(select 1 from public.requisitions where id=n.requisition_id and care_recipient_id=n.care_recipient_id) and private.member_can(n.care_recipient_id,auth.uid(),'req.read');
 elsif n.alert_event_id is not null then
  select case location when 'FAMILY' then 'stock.family.read' else 'stock.team.read' end into capability from public.stock_alert_events where id=n.alert_event_id and care_recipient_id=n.care_recipient_id and state='open';
  return found and private.member_can(n.care_recipient_id,auth.uid(),capability);
 elsif n.consumption_report_id is not null then
  return private.member_can(n.care_recipient_id,auth.uid(),'consumption.report') and exists(select 1 from public.consumption_reports r where r.id=n.consumption_report_id and r.care_recipient_id=n.care_recipient_id and (r.reported_by=auth.uid() or private.member_can(n.care_recipient_id,auth.uid(),'consumption.confirm')));
 elsif n.reminder_id is not null then
  return exists(select 1 from public.operational_reminders r where r.id=n.reminder_id and r.care_recipient_id=n.care_recipient_id and r.user_id=auth.uid() and r.acknowledged_at is null) and private.reminder_recipient_can(n.reminder_id,auth.uid());
 end if;
 return false;
end;$$;

-- Patient impact is a separate scoped read, never a technical incident payload.
create function public.patient_delivery_impact(p_patient uuid) returns jsonb
language plpgsql volatile security definer set search_path='' as $$
declare pending_count bigint;uncertain_count bigint;pdf_count bigint;
begin
 if private.auth_session() is null or not public.can_access_recipient(p_patient) then raise exception 'patient authorization required' using errcode='42501';end if;
 select count(*) filter(where n.state in ('pending','processing') and n.next_attempt_at<clock_timestamp()-interval '1 hour'),count(*) filter(where n.state='uncertain')
 into pending_count,uncertain_count from public.requisition_notifications n
 where n.care_recipient_id=p_patient and n.recipient_user_id=auth.uid()
 and private.operations_notice_allowed(n);
 select count(*) into pdf_count from private.pdf_issuances p join public.operational_documents d on d.id=p.document_id
 where p.care_recipient_id=p_patient and p.requested_by=auth.uid() and private.member_can(p_patient,auth.uid(),lower(d.type)||'.read')
 and (p.state='uncertain' or (p.state='processing' and p.lease_until<clock_timestamp()));
 if private.auth_session() is null or not public.can_access_recipient(p_patient) then raise exception 'patient authorization required' using errcode='42501';end if;
 return jsonb_build_object('delayedNotices',pending_count,'unconfirmedNotices',uncertain_count,'recoverableOwnPdfs',pdf_count,'acknowledgementCreated',false);
end;$$;

revoke all on function private.operations_policy(jsonb),private.operations_condition(text,text,text,boolean,text,bigint,uuid),private.operations_append_only(),public.record_operations_event(jsonb) from public,anon,authenticated,service_role;
revoke all on function private.collect_operations_status(),public.collect_operations_status() from public,anon,authenticated,service_role;
revoke all on function private.operations_notice_allowed(public.requisition_notifications) from public,anon,authenticated,service_role;
revoke all on function public.operations_diagnostics(text,integer,integer,text),public.operations_command(text,text,uuid,integer,jsonb,uuid),public.patient_delivery_impact(uuid) from public,anon,authenticated,service_role;
revoke all on function public.operations_history(text,uuid,integer,integer) from public,anon,authenticated,service_role;
grant execute on function public.record_operations_event(jsonb),public.collect_operations_status() to service_role;
grant execute on function public.operations_diagnostics(text,integer,integer,text),public.operations_history(text,uuid,integer,integer),public.operations_command(text,text,uuid,integer,jsonb,uuid),public.patient_delivery_impact(uuid) to authenticated;
notify pgrst,'reload schema';

commit;
