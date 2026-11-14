-- An opinion never applies stock. Required reviews and the authorized stock
-- application are separate, versioned acts; existing issued facts stay intact.
begin;

alter table public.balance_reviews add column item_results jsonb not null default '[]'::jsonb
  check (jsonb_typeof(item_results)='array' and jsonb_array_length(item_results)<=1000);

create table private.balance_applications (
  id uuid primary key default gen_random_uuid(),
  care_recipient_id uuid not null references public.care_recipients(id),
  document_id uuid not null,
  count_version integer not null check(count_version>0),
  document_version integer not null check(document_version>0),
  actor_id uuid not null references public.profiles(id),
  actor_name text not null,
  applied_at timestamptz not null,
  reference_revision bigint not null,
  applied_revision bigint not null,
  lines jsonb not null check(jsonb_typeof(lines)='array'),
  foreign key(document_id,care_recipient_id) references public.operational_documents(id,care_recipient_id),
  unique(document_id,count_version)
);
alter table private.balance_applications enable row level security;
revoke all on private.balance_applications from public,anon,authenticated,service_role;
create index balance_applications_patient on private.balance_applications(care_recipient_id);
create index balance_applications_actor on private.balance_applications(actor_id);
create trigger balance_application_immutable before update or delete on private.balance_applications
  for each row execute function private.immutable_event();

create function private.validate_bal_review_items(p_id uuid,p_items jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare item jsonb;begin
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items)>1000 then
  raise exception 'invalid balance review items' using errcode='22023';end if;
 if (select count(distinct value->>'lineId') from jsonb_array_elements(p_items))<>jsonb_array_length(p_items) then
  raise exception 'duplicate balance review item' using errcode='22023';end if;
 for item in select value from jsonb_array_elements(p_items) loop
  if jsonb_typeof(item) is distinct from 'object'
   or (item-array['lineId','result','forwarding','comment'])<>'{}'::jsonb
   or jsonb_typeof(item->'lineId') is distinct from 'string'
   or jsonb_typeof(item->'result') is distinct from 'string'
   or item->>'result' not in ('confirmed','difference')
   or jsonb_typeof(item->'forwarding') is distinct from 'string'
   or item->>'forwarding' not in ('none','recount','adjustment')
   or (item->>'result'='confirmed') is distinct from (item->>'forwarding'='none')
   or jsonb_typeof(item->'comment') is distinct from 'string'
   or private.bal_comment_units(item->>'comment')>500
   or not exists(select 1 from public.document_lines l where l.document_id=p_id and l.id::text=item->>'lineId') then
   raise exception 'invalid or foreign balance review item' using errcode='22023';end if;
 end loop;
end;$$;
revoke all on function private.validate_bal_review_items(uuid,jsonb) from public,anon,authenticated,service_role;

create function private.bal_reviews_satisfied(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(d.workflow_data->'reviewPolicy'->>'balReview'='optional'
  or (d.workflow_data->'reviewPolicy'->>'balRequirement'='any' and r.total>0)
  or (d.workflow_data->'reviewPolicy'->>'balRequirement'='all'
    and r.total=jsonb_array_length(d.workflow_data->'reviewPolicy'->'balApprovers')),false)
 from public.operational_documents d cross join lateral (
  select count(distinct review_group) total from (
   select review_group from public.balance_reviews where document_id=d.id
    and count_version=(d.workflow_data->>'countVersion')::integer
    and counter_id<>reviewer_id
   union all select review_group from public.bal_approvals where document_id=d.id
    and count_version=(d.workflow_data->>'countVersion')::integer
    and actor_id::text is distinct from private.bal_effective_counter(d.id)->>'id'
  ) opinions where d.workflow_data->'reviewPolicy'->'balApprovers' ? review_group
 ) r where d.id=p_id and d.type='BAL';
$$;
revoke all on function private.bal_reviews_satisfied(uuid) from public,anon,authenticated,service_role;

-- Effect values live outside public snapshots. A reader of a BAL does not
-- automatically receive the historical team stock balance, including metadata.
create function private.bal_application_facts(p_id uuid,p_count integer,p_version integer,p_applied boolean) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare a private.balance_applications;patient uuid;allowed boolean;begin
 select care_recipient_id into strict patient from public.operational_documents where id=p_id and type='BAL';
 perform private.require_cap(patient,'bal.read');
 select * into a from private.balance_applications where document_id=p_id and count_version=p_count and document_version<=p_version;
 if not found then return jsonb_build_object('state',case when p_applied then 'unavailable' else 'not_applied' end,'lines','[]'::jsonb);end if;
 allowed:=coalesce(private.can(patient,'stock.team.read'),false);
 return jsonb_build_object('state','applied','id',a.id,'countVersion',a.count_version,'documentVersion',a.document_version,
  'appliedAt',a.applied_at,'actorId',a.actor_id,'actorName',a.actor_name,
  'lines',(select coalesce(jsonb_agg(jsonb_build_object('lineId',l->'lineId',
    'state',case when allowed then 'known' else 'restricted' end,
    'quantity',case when allowed then l->'quantityAfter' else 'null'::jsonb end) order by l->>'lineId'),'[]'::jsonb)
    from jsonb_array_elements(a.lines) l));
end;$$;
revoke all on function private.bal_application_facts(uuid,integer,integer,boolean) from public,anon,authenticated,service_role;

create or replace function private.apply_bal(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;l public.document_lines;delta numeric;
 effect uuid;at_time timestamptz:=statement_timestamp();captured jsonb:='[]'::jsonb;begin
 select * into strict d from public.operational_documents where id=p_id;
 if d.status='approved' then return;end if;
 if private.team_revision(d.care_recipient_id) is distinct from (d.workflow_data->>'referenceRevision')::bigint then
  raise exception 'inventory conflict: reference changed; recount' using errcode='P0001';end if;
 for l in select * from public.document_lines where document_id=p_id order by product_id loop
  delta:=l.quantity-private.stock_quantity(d.care_recipient_id,l.product_id,'CARE_TEAM');
  if delta<>0 then perform private.move_stock(d.care_recipient_id,l.product_id,abs(delta),
   case when delta<0 then 'CARE_TEAM' end,case when delta>0 then 'CARE_TEAM' end,'Reconciliação BAL','bal',d.id);end if;
  update public.document_lines set fully_checked=true,accepted_quantity=quantity where id=l.id;
  captured:=captured||jsonb_build_array(jsonb_build_object('lineId',l.id,'productId',l.product_id,
   'name',l.name_snapshot,'unit',l.unit_snapshot,'counted',l.quantity::text,
   'quantityAfter',private.stock_quantity(d.care_recipient_id,l.product_id,'CARE_TEAM')::text));
 end loop;
 insert into private.balance_applications(care_recipient_id,document_id,count_version,document_version,
  actor_id,actor_name,applied_at,reference_revision,applied_revision,lines)
 values(d.care_recipient_id,d.id,(d.workflow_data->>'countVersion')::integer,d.version,
  auth.uid(),(select full_name from public.profiles where id=auth.uid()),at_time,
  (d.workflow_data->>'referenceRevision')::bigint,private.team_revision(d.care_recipient_id),captured) returning id into effect;
 update public.operational_documents set status='approved',workflow_data=workflow_data||jsonb_build_object(
  'appliedAt',at_time,'appliedRevision',private.team_revision(d.care_recipient_id),'appliedBy',auth.uid(),'applicationId',effect) where id=p_id;
end;$$;
revoke all on function private.apply_bal(uuid) from public,anon,authenticated,service_role;

create or replace function private.bal_review_context(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare d public.operational_documents;facts jsonb;counter jsonb;count_no integer;reference text;
 current_revision bigint;state text;groups jsonb;application_groups jsonb;reference_hash text;ready boolean;differences boolean;begin
 select * into strict d from public.operational_documents where id=p_id and type='BAL';
 perform private.require_cap(d.care_recipient_id,'bal.read');
 facts:=private.bal_review_facts(p_id);counter:=facts->'counter';
 if coalesce(d.workflow_data->>'countVersion','')~'^[1-9][0-9]{0,8}$' then count_no:=(d.workflow_data->>'countVersion')::integer;end if;
 reference:=case when d.status='approved' then d.workflow_data->>'appliedRevision' else d.workflow_data->>'referenceRevision' end;
 current_revision:=private.team_revision(d.care_recipient_id);
 state:=case when reference is null or reference!~'^[0-9]{1,18}$' then 'unavailable'
  when reference::bigint=current_revision then 'current' else 'historical' end;
 ready:=private.bal_reviews_satisfied(p_id);
 differences:=exists(select 1 from public.balance_reviews r cross join lateral jsonb_array_elements(r.item_results) item
  where r.document_id=p_id and r.count_version=count_no and item->>'result'='difference');
 select coalesce(jsonb_agg(g order by g),'[]') into groups from (values('family'),('supervisor')) allowed(g)
  where d.status in ('submitted','approved') and count_no is not null and counter->>'id' is not null
   and counter->>'id'<>auth.uid()::text
   and exists(select 1 from public.care_recipients where id=d.care_recipient_id and is_active)
   and private.bal_review_authorized(d.care_recipient_id,g)
   and d.workflow_data->'reviewPolicy'->'balApprovers' ? g
   and not exists(select 1 from public.balance_reviews r where r.document_id=p_id and r.count_version=count_no
    and (r.review_group=g or r.reviewer_id=auth.uid()));
 select coalesce(jsonb_agg(g order by g),'[]') into application_groups from (values('family'),('supervisor')) allowed(g)
  where d.status='submitted' and ready and not differences and state='current'
   and count_no is not null and counter->>'id' is not null and counter->>'id'<>auth.uid()::text
   and exists(select 1 from public.care_recipients where id=d.care_recipient_id and is_active)
   and private.bal_review_authorized(d.care_recipient_id,g)
   and d.workflow_data->'reviewPolicy'->'balApprovers' ? g;
 reference_hash:=encode(extensions.digest(jsonb_build_object('document',p_id,'version',d.version,'counter',counter,
  'countVersion',count_no,'reference',reference,'current',current_revision,'state',state,'groups',groups,
  'applicationGroups',application_groups,'reviewSatisfied',ready,'differences',differences,'actor',auth.uid())::text,'sha256'),'hex');
 return facts||jsonb_build_object('eligibleGroups',groups,'countVersion',count_no,
  'referenceRevision',reference,'currentRevision',current_revision::text,'referenceState',state,'referenceHash',reference_hash,
  'reconciliationApplied',d.status='approved','reviewRequired',d.status='submitted'
    and d.workflow_data->'reviewPolicy'->>'balReview'='required' and not ready,
  'policyReviewRequired',d.workflow_data->'reviewPolicy'->>'balReview'='required',
  'reviewSatisfied',ready,'hasItemDifferences',differences,'applicationGroups',application_groups,
  'application',private.bal_application_facts(p_id,count_no,d.version,d.status='approved'));
end;$$;
revoke all on function private.bal_review_context(uuid) from public,anon,authenticated,service_role;

do $$declare definition text;needle text;begin
 definition:=replace(pg_get_functiondef('private.command_bal_review(uuid,jsonb,uuid,integer)'::regprocedure),E'\r\n',E'\n');
 definition:=replace(definition,'(''group'',''comment'',''reviewReference'')','(''group'',''comment'',''reviewReference'',''items'')');
 needle:=' if d.status=''submitted'' and ctx->>''referenceState''<>''current'' then raise exception ''inventory conflict: reference changed; recount'' using errcode=''PT409'';end if;';
 if position(needle in definition)=0 then raise exception 'unexpected BAL review reference guard';end if;
 definition:=replace(definition,needle,' perform private.validate_bal_review_items(p_id,coalesce(p_body->''items'',''[]''::jsonb));');
 definition:=replace(definition,'review_group,comment,request_body,reference_state','review_group,comment,item_results,request_body,reference_state');
 definition:=replace(definition,'v_name,v_group,v_comment,p_body,','v_name,v_group,v_comment,coalesce(p_body->''items'',''[]''::jsonb),p_body,');
 needle:=' if d.status=''submitted'' and ((d.workflow_data->''reviewPolicy''->>''balRequirement''=''any'' and v_cnt>0)';
 if position(needle in definition)=0 then raise exception 'unexpected BAL review application coupling';end if;
 definition:=substr(definition,1,position(needle in definition)-1)
  ||substr(definition,position(' perform private.record_document_event(p_id,''bal.approve''' in definition));
 if position('private.apply_bal' in definition)>0 then raise exception 'BAL review still applies stock';end if;
 execute definition;
 definition:=replace(pg_get_functiondef('private.require_supply_draft_scope(uuid,text,text,uuid,boolean)'::regprocedure),E'\r\n',E'\n');
 needle:='or d.status=''submitted'' and private.bal_review_context(p_target)->>''referenceState''<>''current''';
 if position(needle in definition)=0 then raise exception 'unexpected BAL private review availability';end if;
 execute replace(definition,needle,'');
 definition:=replace(pg_get_functiondef('public.v3_revise_supply_document(uuid,jsonb,uuid,integer,boolean)'::regprocedure),E'\r\n',E'\n');
 needle:='workflow_data-''appliedAt''-''appliedRevision''-''appliedBy''';
 if position(needle in definition)=0 then raise exception 'unexpected BAL recount prior effect';end if;
 execute replace(definition,needle,needle||'-''applicationId''');
end;$$;

create function private.command_bal_apply(p_id uuid,p_body jsonb,p_key uuid,p_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;e public.document_events;context jsonb;frozen jsonb;g text;begin
 select * into strict d from public.operational_documents where id=p_id and type='BAL';
 perform private.require_cap(d.care_recipient_id,'bal.read');
 if p_key is null or p_version is null or jsonb_typeof(p_body) is distinct from 'object'
  or (p_body-array['group','reviewReference'])<>'{}'::jsonb
  or jsonb_typeof(p_body->'group') is distinct from 'string' or p_body->>'group' not in ('family','supervisor')
  or coalesce(p_body->>'reviewReference','')!~'^[0-9a-f]{64}$' then
  raise exception 'invalid balance application intent' using errcode='22023';end if;
 frozen:=p_body||jsonb_build_object('expectedVersion',p_version);g:=p_body->>'group';
 perform pg_advisory_xact_lock(hashtextextended('stock:'||d.care_recipient_id,0));
 select * into strict d from public.operational_documents where id=p_id for update;
 perform private.require_cap(d.care_recipient_id,'bal.read');
 select * into e from public.document_events where actor_id=auth.uid() and idempotency_key=p_key;
 if found then
  if e.document_id<>p_id or e.action<>'bal.apply' or e.body->'event' is distinct from frozen then
   raise exception 'balance application idempotency conflict' using errcode='23505';end if;
  return public.operational_document(p_id);
 end if;
 perform private.require_cap(d.care_recipient_id,'bal.approve.'||g);
 if not private.bal_review_authorized(d.care_recipient_id,g) then raise exception 'balance application authority required' using errcode='42501';end if;
 if p_version<>d.version then raise exception 'stale balance application version' using errcode='PT409';end if;
 context:=private.bal_review_context(p_id);
 if p_body->>'reviewReference'<>context->>'referenceHash' or not(context->'applicationGroups' ? g) then
  raise exception 'balance application unavailable; review reference or recount' using errcode='PT409';end if;
 update public.operational_documents set version=version+1 where id=p_id;
 perform private.apply_bal(p_id);
 perform private.record_document_event(p_id,'bal.apply',frozen,p_key);
 perform private.require_cap(d.care_recipient_id,'bal.approve.'||g);
 if not private.bal_review_authorized(d.care_recipient_id,g)
  or not exists(select 1 from public.care_recipients where id=d.care_recipient_id and is_active) then
  raise exception 'balance application authority changed' using errcode='42501';end if;
 return public.operational_document(p_id);
end;$$;
revoke all on function private.command_bal_apply(uuid,jsonb,uuid,integer) from public,anon,authenticated,service_role;

do $$declare definition text;needle text;begin
 definition:=replace(pg_get_functiondef('public.supply_document_command(uuid,text,jsonb,uuid,integer)'::regprocedure),E'\r\n',E'\n');
 needle:=' select * into t from public.ent_transfers where document_id=p_id;';
 if position(needle in definition)=0 then raise exception 'unexpected BAL command dispatcher';end if;
 execute replace(definition,needle,' if p_action=''apply_balance'' then return private.command_bal_apply(p_id,p_body,p_key,p_version);end if;'||E'\n'||needle);
end;$$;

-- Private preparation remains a review, never another physical count. Bind
-- every selected item to the exact saved revision, including its outcome.
create or replace function private.require_bal_document_draft_intent(p_id uuid,p_purpose text,p_content jsonb,p_body jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare fields jsonb:=p_content->'fields';expected jsonb;items jsonb;
 trim_chars text:=U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF';begin
 if p_content->'materials' is distinct from '[]'::jsonb or p_content->'divergentIds' is distinct from '[]'::jsonb
  or coalesce(fields->>'referenceHash','')!~'^[0-9a-f]{64}$' then
  raise exception 'invalid balance document draft content' using errcode='22023';end if;
 if p_purpose in ('review_family','review_supervisor') then
  if exists(select 1 from jsonb_object_keys(fields) k where k not in ('comment','referenceHash') and k!~'^item:[0-9a-f-]{36}$') then
   raise exception 'invalid private balance review fields' using errcode='22023';end if;
  select coalesce(jsonb_agg(jsonb_build_object('lineId',substr(key,6))||value::jsonb order by key),'[]'::jsonb)
   into items from jsonb_each_text(fields) where key like 'item:%';
  perform private.validate_bal_review_items(p_id,items);
  expected:=jsonb_build_object('group',substr(p_purpose,8),'comment',coalesce(fields->>'comment',''),'reviewReference',fields->>'referenceHash');
  if items<>'[]'::jsonb or p_body ? 'items' then expected:=expected||jsonb_build_object('items',items);end if;
 elsif p_purpose='assign_recount' then
  if (fields-array['reason','referenceHash','targetShiftId','targetShiftVersion','targetLabel','query'])<>'{}'::jsonb
   or coalesce(fields->>'targetShiftVersion','')!~'^[1-9][0-9]{0,9}$' or (fields->>'targetShiftVersion')::numeric>2147483647 then
   raise exception 'invalid private recount target' using errcode='22023';end if;
  expected:=jsonb_build_object('documentId',p_id,'targetShiftId',fields->>'targetShiftId',
   'targetShiftVersion',(fields->>'targetShiftVersion')::integer,'referenceHash',fields->>'referenceHash','reason',btrim(fields->>'reason',trim_chars));
 else raise exception 'invalid balance document intent' using errcode='22023';end if;
 if p_body is distinct from expected then raise exception 'balance document intent differs from private revision' using errcode='22023';end if;
end;$$;
revoke all on function private.require_bal_document_draft_intent(uuid,text,jsonb,jsonb) from public,anon,authenticated,service_role;

-- A lost response is recovered by reading this actor's exact immutable act.
-- Waiting on the writer's lock cannot replay or apply any stock movement.
create function public.balance_application_result(p_id uuid,p_key uuid,p_body jsonb,p_version integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare patient uuid;e public.document_events;a private.balance_applications;frozen jsonb;begin
 select care_recipient_id into strict patient from public.operational_documents where id=p_id and type='BAL';
 perform private.require_cap(patient,'bal.read');
 if p_key is null or p_version is null or p_version<=0 or jsonb_typeof(p_body) is distinct from 'object'
  or (p_body-array['group','reviewReference'])<>'{}'::jsonb
  or jsonb_typeof(p_body->'group') is distinct from 'string' or p_body->>'group' not in ('family','supervisor')
  or coalesce(p_body->>'reviewReference','')!~'^[0-9a-f]{64}$' then
  raise exception 'invalid balance application lookup' using errcode='22023';end if;
 frozen:=p_body||jsonb_build_object('expectedVersion',p_version);
 perform pg_advisory_xact_lock(hashtextextended('stock:'||patient,0));
 perform private.require_cap(patient,'bal.read');
 select * into e from public.document_events where actor_id=auth.uid() and idempotency_key=p_key;
 if not found then return jsonb_build_object('state','not_found','documentId',p_id,'idempotencyKey',p_key);end if;
 if e.document_id<>p_id or e.action<>'bal.apply' or e.body->'event' is distinct from frozen then
  raise exception 'balance application lookup differs from original intent' using errcode='23505';end if;
 select * into a from private.balance_applications where document_id=p_id and document_version=e.version and actor_id=e.actor_id;
 if not found then raise exception 'balance application evidence unavailable' using errcode='XX000';end if;
 return jsonb_build_object('state','found','documentId',p_id,'idempotencyKey',p_key,'version',e.version,
  'eventId',e.id,'recordedAt',e.created_at,'application',private.bal_application_facts(p_id,a.count_version,e.version,true));
end;$$;
revoke all on function public.balance_application_result(uuid,uuid,jsonb,integer) from public,anon,authenticated,service_role;
grant execute on function public.balance_application_result(uuid,uuid,jsonb,integer) to authenticated;

commit;
