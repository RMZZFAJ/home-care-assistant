create function private.bal_comment_units(p_text text) returns integer
language sql immutable parallel safe set search_path='' as $$
  select coalesce(sum(case when length(ch)=0 then 0 when ascii(ch)>65535 then 2 else 1 end),0)::integer
  from regexp_split_to_table(coalesce(p_text,''),'') ch;
$$;
revoke execute on function private.bal_comment_units(text) from public,anon,authenticated,service_role;

create table public.balance_reviews (
  id uuid primary key default gen_random_uuid(),
  care_recipient_id uuid not null references public.care_recipients(id),
  document_id uuid not null,
  count_version integer not null check(count_version>0),
  count_event_id uuid not null references public.document_events(id),
  counter_id uuid not null references public.profiles(id),
  reviewer_id uuid not null references public.profiles(id),
  reviewer_name text not null,
  review_group text not null check(review_group in ('family','supervisor')),
  comment text not null default '' check(private.bal_comment_units(comment)<=2000),
  request_body jsonb not null,
  reference_state text not null check(reference_state in ('current','historical','unavailable')),
  reviewed_snapshot jsonb not null,
  idempotency_key uuid not null,
  reviewed_document_version integer not null,
  recorded_at timestamptz not null default statement_timestamp(),
  check(counter_id<>reviewer_id),
  foreign key(document_id,care_recipient_id) references public.operational_documents(id,care_recipient_id),
  unique(document_id,count_version,review_group),
  unique(document_id,count_version,reviewer_id),
  unique(reviewer_id,idempotency_key)
);
create index balance_reviews_patient on public.balance_reviews(care_recipient_id,document_id);
create index balance_reviews_counter on public.balance_reviews(counter_id);
create index balance_reviews_count_event on public.balance_reviews(count_event_id);
alter table public.balance_reviews enable row level security;
revoke all on public.balance_reviews from public,anon,authenticated,service_role;
grant select on public.balance_reviews to authenticated;
create policy balance_reviews_read on public.balance_reviews for select to authenticated
  using(private.can(care_recipient_id,'bal.read'));
create trigger balance_review_immutable before update or delete on public.balance_reviews
  for each row execute function private.immutable_event();

-- Keep the statement's actor lookup out of the per-row presentation command policy.
alter policy presentation_commands_read on public.product_presentation_commands
  using(actor_id=(select auth.uid()) and public.can_access_recipient(care_recipient_id));

create function private.bal_effective_counter(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare e public.document_events;v_name text;v_source text;begin
  select * into e from public.document_events where document_id=p_id
    and action in ('bal.issued','bal.submit','bal.recount') order by version desc limit 1;
  if not found or e.actor_id is null then
    return jsonb_build_object('id',null,'eventId',null,'name',null,'source','unavailable');end if;
  if e.body#>>'{countActor,id}'=e.actor_id::text then
    v_name:=e.body#>>'{countActor,name}';v_source:='count_event';
  elsif e.body#>>'{actors,issuer,id}'=e.actor_id::text then
    v_name:=e.body#>>'{actors,issuer,name}';v_source:='issued_snapshot';
  else
    select full_name into v_name from public.profiles where id=e.actor_id;v_source:='current_profile';
  end if;
  return jsonb_build_object('id',e.actor_id,'eventId',e.id,'name',v_name,'source',v_source,'version',e.version,'recordedAt',e.created_at);
end;$$;
revoke execute on function private.bal_effective_counter(uuid) from public,anon,authenticated,service_role;

create function private.bal_review_facts(p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('counter',private.bal_effective_counter(p_id),
    'countVersion',d.workflow_data->'countVersion','notes',coalesce(d.payload->>'notes',''),
    'reviews',coalesce((select jsonb_agg(to_jsonb(r) order by r.recorded_at,r.id) from public.balance_reviews r where document_id=p_id),'[]'),
    'legacyApprovals',coalesce((select jsonb_agg(to_jsonb(a)||jsonb_build_object('actorName',(select full_name from public.profiles where id=a.actor_id),'nameSource','current_profile') order by a.created_at,a.actor_id) from public.bal_approvals a where document_id=p_id),'[]'))
  from public.operational_documents d where id=p_id and type='BAL';
$$;
revoke execute on function private.bal_review_facts(uuid) from public,anon,authenticated,service_role;

create function private.bal_review_authorized(p_patient uuid,p_group text) returns boolean
language sql stable security definer set search_path='' as $$
  select coalesce(private.can(p_patient,'bal.approve.'||p_group),false)
    and case p_group when 'family' then public.recipient_role(p_patient)::text in ('admin','family')
      when 'supervisor' then public.recipient_role(p_patient)::text in ('admin','supervisor') else false end;
$$;
revoke execute on function private.bal_review_authorized(uuid,text) from public,anon,authenticated,service_role;

create function private.bal_review_context(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare d public.operational_documents;v_facts jsonb;v_counter jsonb;v_count integer;
 v_reference text;v_current bigint;v_state text;v_groups jsonb;v_hash text;begin
 select * into strict d from public.operational_documents where id=p_id and type='BAL';
 if not coalesce(private.can(d.care_recipient_id,'bal.read'),false) then raise exception 'balance read required' using errcode='42501';end if;
 v_facts:=private.bal_review_facts(p_id);v_counter:=v_facts->'counter';
 if coalesce(d.workflow_data->>'countVersion','')~'^[1-9][0-9]{0,8}$' then v_count:=(d.workflow_data->>'countVersion')::integer;end if;
 v_reference:=case when d.status='approved' then d.workflow_data->>'appliedRevision' else d.workflow_data->>'referenceRevision' end;
 v_current:=private.team_revision(d.care_recipient_id);
 v_state:=case when v_reference is null or v_reference!~'^[0-9]{1,18}$' then 'unavailable'
   when v_reference::bigint=v_current then 'current' else 'historical' end;
 select coalesce(jsonb_agg(g order by g),'[]') into v_groups from (values('family'),('supervisor')) allowed(g)
   where d.status in ('submitted','approved') and v_count is not null and v_counter->>'id' is not null
     and v_counter->>'id'<>auth.uid()::text
     and exists(select 1 from public.care_recipients where id=d.care_recipient_id and is_active)
     and private.bal_review_authorized(d.care_recipient_id,g)
     and d.workflow_data->'reviewPolicy'->'balApprovers' ? g
     and not exists(select 1 from public.balance_reviews r where r.document_id=p_id and r.count_version=v_count and (r.review_group=g or r.reviewer_id=auth.uid()));
 v_hash:=encode(extensions.digest(jsonb_build_object('document',p_id,'version',d.version,
   'counter',v_counter,'countVersion',v_count,'reference',v_reference,'current',v_current,
   'state',v_state,'groups',v_groups,'actor',auth.uid())::text,'sha256'),'hex');
 return v_facts||jsonb_build_object('eligibleGroups',v_groups,'countVersion',v_count,
   'referenceRevision',v_reference,'currentRevision',v_current::text,'referenceState',v_state,
   'referenceHash',v_hash,'reconciliationApplied',d.status='approved',
   'reviewRequired',d.status='submitted' and d.workflow_data->'reviewPolicy'->>'balReview'='required');
end;$$;
revoke execute on function private.bal_review_context(uuid) from public,anon,authenticated,service_role;

-- NULL must never satisfy an inventory reference check. Persist the revision
-- resulting from the real reconciliation for optional later review.
do $$declare d text;old_check text:='private.team_revision(d.care_recipient_id)<>(d.workflow_data->>''referenceRevision'')::bigint';
 old_apply text:='jsonb_build_object(''appliedAt'',now())';begin
 d:=replace(pg_get_functiondef('private.apply_bal(uuid)'::regprocedure),E'\r\n',E'\n');
 if length(d)-length(replace(d,old_check,''))<>length(old_check)
   or length(d)-length(replace(d,old_apply,''))<>length(old_apply) then raise exception 'unexpected BAL application contract';end if;
 d:=replace(d,old_check,'private.team_revision(d.care_recipient_id) is distinct from (d.workflow_data->>''referenceRevision'')::bigint');
 d:=replace(d,old_apply,'jsonb_build_object(''appliedAt'',now(),''appliedRevision'',private.team_revision(d.care_recipient_id),''appliedBy'',auth.uid())');
 execute d;
end;$$;

create function private.command_bal_review(p_id uuid,p_body jsonb,p_key uuid,p_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;e public.document_events;r public.balance_reviews;
 ctx jsonb;counter jsonb;v_group text;v_count integer;v_count_id uuid;v_counter_id uuid;
 v_comment text;v_cnt integer;v_name text;begin
 select * into strict d from public.operational_documents where id=p_id and type='BAL';
 if not coalesce(private.can(d.care_recipient_id,'bal.read'),false) then raise exception 'balance read required' using errcode='42501';end if;
 if p_key is null then raise exception 'review key required' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||d.care_recipient_id,0));
 select * into strict d from public.operational_documents where id=p_id for update;
 if not coalesce(private.can(d.care_recipient_id,'bal.read'),false) then raise exception 'balance read required' using errcode='42501';end if;
 select * into e from public.document_events where actor_id=auth.uid() and idempotency_key=p_key;
 if found then
   if e.document_id<>p_id or e.action<>'bal.approve' or e.body->'event' is distinct from p_body then
     raise exception 'balance review idempotency conflict' using errcode='23505';end if;
   return public.operational_document(p_id);
 end if;
 select * into r from public.balance_reviews where reviewer_id=auth.uid() and idempotency_key=p_key;
 if found then raise exception 'balance review idempotency conflict' using errcode='23505';end if;
 if jsonb_typeof(p_body) is distinct from 'object'
   or exists(select 1 from jsonb_object_keys(p_body) k where k not in ('group','comment','reviewReference'))
   or jsonb_typeof(p_body->'group') is distinct from 'string'
   or p_body->>'group' not in ('family','supervisor')
   or (p_body ? 'comment' and jsonb_typeof(p_body->'comment') is distinct from 'string')
   or private.bal_comment_units(p_body->>'comment')>2000
   or (p_body ? 'reviewReference' and coalesce(p_body->>'reviewReference','')!~'^[0-9a-f]{64}$') then
   raise exception 'invalid balance review body' using errcode='22023';end if;
 v_group:=p_body->>'group';v_comment:=coalesce(p_body->>'comment','');
 if not private.bal_review_authorized(d.care_recipient_id,v_group) then raise exception 'balance review group authorization required' using errcode='42501';end if;
 perform private.require_cap(d.care_recipient_id,'bal.approve.'||v_group);
 if p_version is null or d.version<>p_version then raise exception 'stale balance review version' using errcode='PT409';end if;
 ctx:=private.bal_review_context(p_id);counter:=ctx->'counter';
 if counter->>'id'=auth.uid()::text then raise exception 'distinct balance reviewer required' using errcode='42501';end if;
 if ctx->>'countVersion' is null or counter->>'eventId' is null then raise exception 'balance count attribution unavailable; recount required' using errcode='22023';end if;
 if not(ctx->'eligibleGroups' ? v_group) then raise exception 'balance review group unavailable or already reviewed' using errcode='PT409';end if;
 if p_body ? 'reviewReference' and p_body->>'reviewReference'<>ctx->>'referenceHash' then raise exception 'stale balance review reference' using errcode='PT409';end if;
 if d.status='submitted' and ctx->>'referenceState'<>'current' then raise exception 'inventory conflict: reference changed; recount' using errcode='PT409';end if;
 v_count:=(ctx->>'countVersion')::integer;v_count_id:=(counter->>'eventId')::uuid;v_counter_id:=(counter->>'id')::uuid;
 select full_name into strict v_name from public.profiles where id=auth.uid();
 insert into public.balance_reviews(care_recipient_id,document_id,count_version,count_event_id,counter_id,reviewer_id,reviewer_name,
   review_group,comment,request_body,reference_state,reviewed_snapshot,idempotency_key,reviewed_document_version)
 values(d.care_recipient_id,p_id,v_count,v_count_id,v_counter_id,auth.uid(),v_name,v_group,v_comment,p_body,
   ctx->>'referenceState',jsonb_build_object('counter',counter,'notes',d.payload->>'notes','countVersion',v_count,
     'lines',(select jsonb_agg(to_jsonb(l) order by product_id) from public.document_lines l where document_id=p_id),
     'referenceRevision',ctx->'referenceRevision','currentRevision',ctx->'currentRevision','appliedBeforeReview',d.status='approved'),p_key,d.version);
 update public.operational_documents set version=version+1 where id=p_id;
 select count(distinct review_group) into v_cnt from (
   select review_group from public.balance_reviews where document_id=p_id and count_version=v_count
   union all select review_group from public.bal_approvals where document_id=p_id and count_version=v_count and actor_id<>v_counter_id
 ) valid_reviews;
 if d.status='submitted' and ((d.workflow_data->'reviewPolicy'->>'balRequirement'='any' and v_cnt>0)
   or (d.workflow_data->'reviewPolicy'->>'balRequirement'='all' and v_cnt=jsonb_array_length(d.workflow_data->'reviewPolicy'->'balApprovers'))) then
   perform private.apply_bal(p_id);
 end if;
 perform private.record_document_event(p_id,'bal.approve',p_body,p_key);
 perform private.require_cap(d.care_recipient_id,'bal.approve.'||v_group);
 if not private.bal_review_authorized(d.care_recipient_id,v_group) then raise exception 'balance reviewer authority changed' using errcode='42501';end if;
 return public.operational_document(p_id);
end;$$;
revoke execute on function private.command_bal_review(uuid,jsonb,uuid,integer) from public,anon,authenticated,service_role;

do $$declare d text;needle text:=' select * into v_d from public.operational_documents where id=p_id;';begin
 d:=replace(pg_get_functiondef('public.supply_document_command(uuid,text,jsonb,uuid,integer)'::regprocedure),E'\r\n',E'\n');
 if length(d)-length(replace(d,needle,''))<>length(needle) then raise exception 'unexpected BAL command dispatch';end if;
 d:=replace(d,needle,needle||E'\n'||' if v_d.type=''BAL'' and p_action=''approve'' then return private.command_bal_review(p_id,p_body,p_key,p_version);end if;');
 execute d;
 d:=replace(pg_get_functiondef('public.operational_document(uuid)'::regprocedure),E'\r\n',E'\n');
 if position('return to_jsonb(d)||' in d)=0 then raise exception 'unexpected BAL read model';end if;
 d:=replace(d,'return to_jsonb(d)||','return to_jsonb(d)||case when d.type=''BAL'' then jsonb_build_object(''balanceReview'',private.bal_review_context(p_id)) else ''{}''::jsonb end||');execute d;
end;$$;

do $$declare d text;needle text:=' h:=encode(extensions.digest(s::text,''sha256''),''hex'');';begin
 d:=replace(pg_get_functiondef('private.record_document_event(uuid,text,jsonb,uuid)'::regprocedure),E'\r\n',E'\n');
 if length(d)-length(replace(d,needle,''))<>length(needle) then raise exception 'unexpected BAL snapshot contract';end if;
 d:=replace(d,needle,
   ' if d.type=''BAL'' then s:=s||jsonb_build_object(''balanceReviews'',private.bal_review_facts(p_id));'||
   ' if p_action in (''bal.issued'',''bal.submit'',''bal.recount'') then s:=s||jsonb_build_object(''countActor'',(select jsonb_build_object(''id'',id,''name'',full_name) from public.profiles where id=auth.uid()));s:=jsonb_set(s,''{balanceReviews,counter}'',s->''countActor''||jsonb_build_object(''source'',''count_event'',''version'',d.version,''recordedAt'',statement_timestamp()));end if;end if;'||E'\n'||needle);
 execute d;
end;$$;
