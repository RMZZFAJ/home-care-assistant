-- Successor guidance changes future selection only. It never merges material
-- identities, moves stock, rewrites document lines or replaces historic PDFs.
create table public.catalogue_successors (
  care_recipient_id uuid not null,
  product_id text not null,
  successor_product_id text not null,
  primary key(care_recipient_id,product_id),
  foreign key(care_recipient_id,product_id)
    references public.care_recipient_products(care_recipient_id,product_id),
  foreign key(care_recipient_id,successor_product_id)
    references public.care_recipient_products(care_recipient_id,product_id),
  check(product_id<>successor_product_id)
);
create index catalogue_successors_target on public.catalogue_successors(care_recipient_id,successor_product_id);
create table public.catalogue_identity_events (
  id uuid primary key default gen_random_uuid(),
  care_recipient_id uuid not null references public.care_recipients(id),
  product_id text not null,
  actor_id uuid not null references public.profiles(id),
  actor_name text not null,
  action text not null check(action in ('retire','reactivate','clear_successor')),
  reason text not null,
  before_state jsonb not null,
  after_state jsonb not null,
  recorded_at timestamptz not null default statement_timestamp(),
  foreign key(care_recipient_id,product_id)
    references public.care_recipient_products(care_recipient_id,product_id)
);
create index catalogue_identity_events_history on public.catalogue_identity_events(care_recipient_id,product_id,recorded_at desc,id);
create table private.catalogue_identity_commands (
  actor_id uuid not null references public.profiles(id),
  idempotency_key uuid not null,
  care_recipient_id uuid not null references public.care_recipients(id),
  intent jsonb not null,
  result jsonb not null,
  primary key(actor_id,idempotency_key)
);
alter table public.catalogue_successors enable row level security;
alter table public.catalogue_identity_events enable row level security;
revoke all on public.catalogue_successors,public.catalogue_identity_events,private.catalogue_identity_commands
  from public,anon,authenticated,service_role;
grant select on public.catalogue_successors,public.catalogue_identity_events to authenticated;
create policy catalogue_successors_read on public.catalogue_successors for select to authenticated
  using(public.can_access_recipient(care_recipient_id));
create policy catalogue_identity_events_read on public.catalogue_identity_events for select to authenticated
  using(private.can(care_recipient_id,'catalog.manage'));
create trigger immutable_catalogue_identity_event before update or delete on public.catalogue_identity_events
  for each row execute function private.immutable_event();
create trigger catalogue_successors_invalidation after insert or update or delete on public.catalogue_successors
  for each row execute function private.invalidate_workspace();

create function private.catalogue_identity_snapshot(p_patient uuid,p_product text,p_successor text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare s jsonb;t jsonb;g jsonb;v jsonb;
begin
  select to_jsonb(c) into s from public.care_recipient_products c
    where care_recipient_id=p_patient and product_id=p_product;
  if s is null then raise exception 'patient product not found' using errcode='22023';end if;
  if p_successor is not null then
    select to_jsonb(c) into t from public.care_recipient_products c
      where care_recipient_id=p_patient and product_id=p_successor;
    if t is null then raise exception 'patient successor not found' using errcode='22023';end if;
  end if;
  select to_jsonb(c) into g from public.catalogue_successors c
    where care_recipient_id=p_patient and product_id=p_product;
  -- NULL is restricted/unknown, never an inferred zero. Catalogue authority
  -- grants no access to the family's or team's custody.
  s:=s||jsonb_build_object('stock',jsonb_build_object(
    'FAMILY',case when private.can(p_patient,'stock.family.read') then private.stock_quantity(p_patient,p_product,'FAMILY')::text end,
    'CARE_TEAM',case when private.can(p_patient,'stock.team.read') then private.stock_quantity(p_patient,p_product,'CARE_TEAM')::text end,
    'TRANSIT',case when private.can(p_patient,'stock.family.read') or private.can(p_patient,'stock.team.read') then private.stock_quantity(p_patient,p_product,'TRANSIT')::text end));
  if t is not null then t:=t||jsonb_build_object('stock',jsonb_build_object(
    'FAMILY',case when private.can(p_patient,'stock.family.read') then private.stock_quantity(p_patient,p_successor,'FAMILY')::text end,
    'CARE_TEAM',case when private.can(p_patient,'stock.team.read') then private.stock_quantity(p_patient,p_successor,'CARE_TEAM')::text end,
    'TRANSIT',case when private.can(p_patient,'stock.family.read') or private.can(p_patient,'stock.team.read') then private.stock_quantity(p_patient,p_successor,'TRANSIT')::text end));end if;
  v:=jsonb_build_object('source',s,'successor',t,'guidance',g);
  return v||jsonb_build_object('referenceHash',encode(extensions.digest(v::text,'sha256'),'hex'));
end;$$;

create function public.catalogue_identity_context(p_patient uuid,p_product text,p_successor text default null,p_page integer default 1)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v jsonb;
begin
  if not public.can_access_recipient(p_patient) or not private.can(p_patient,'catalog.manage') then
    raise exception 'catalogue read authority required' using errcode='42501';end if;
  if p_product is null or length(p_product) not between 1 and 120
    or (p_successor is not null and (length(p_successor) not between 1 and 120 or p_successor=p_product))
    or p_page is null or p_page not between 1 and 100000 then
    raise exception 'invalid catalogue identity context' using errcode='22023';end if;
  v:=private.catalogue_identity_snapshot(p_patient,p_product,p_successor);
  v:=v||jsonb_build_object('events',coalesce((select jsonb_agg(to_jsonb(e) order by recorded_at desc,id)
    from (select * from public.catalogue_identity_events where care_recipient_id=p_patient and product_id=p_product
      order by recorded_at desc,id limit 20 offset (p_page-1)*20) e),'[]'::jsonb),
    'eventTotal',(select count(*) from public.catalogue_identity_events where care_recipient_id=p_patient and product_id=p_product));
  if not public.can_access_recipient(p_patient) or not private.can(p_patient,'catalog.manage') then
    raise exception 'catalogue read authority required' using errcode='42501';end if;
  return v;
end;$$;

create function public.catalogue_identity_command(p_patient uuid,p_product text,p_successor text,p_reference text,p_body jsonb,p_key uuid)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare
  c private.catalogue_identity_commands;
  v_intent jsonb:=jsonb_build_object('patient',p_patient,'product',p_product,'successor',p_successor,'reference',p_reference,'body',p_body);
  v_before jsonb;v_after jsonb;v_result jsonb;v_action text;v_reason text;v_event public.catalogue_identity_events;
begin
  if not public.can_access_recipient(p_patient) then raise exception 'patient read authority required' using errcode='42501';end if;
  if p_key is null then raise exception 'catalogue command key required' using errcode='22023';end if;
  perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
  perform pg_advisory_xact_lock(hashtextextended('catalogue:'||p_patient,0));
  perform pg_advisory_xact_lock(hashtextextended('catalogue-identity:'||auth.uid()||':'||p_key,0));
  if not public.can_access_recipient(p_patient) then raise exception 'patient read authority required' using errcode='42501';end if;
  select * into c from private.catalogue_identity_commands where actor_id=auth.uid() and idempotency_key=p_key;
  if found then
    if c.care_recipient_id<>p_patient or c.intent is distinct from v_intent then
      raise exception 'catalogue identity intent conflict' using errcode='23505';end if;
    return jsonb_build_object('result',c.result,'replayed',true);
  end if;
  perform private.require_cap(p_patient,'catalog.manage');
  if p_product is null or length(p_product) not between 1 and 120
    or (p_successor is not null and (length(p_successor) not between 1 and 120 or p_successor=p_product))
    or coalesce(p_reference,'')!~'^[0-9a-f]{64}$'
    or jsonb_typeof(p_body) is distinct from 'object' then
    raise exception 'invalid catalogue identity command' using errcode='22023';end if;
  if exists(select 1 from jsonb_object_keys(p_body) k where k not in ('action','reason'))
    or coalesce(p_body->>'action','') not in ('retire','reactivate','clear_successor')
    or jsonb_typeof(p_body->'reason') is distinct from 'string'
    or length(trim(p_body->>'reason'))<3 or private.bal_comment_units(p_body->>'reason')>1000 then
    raise exception 'catalogue own action and reason required' using errcode='22023';end if;
  v_action:=p_body->>'action';v_reason:=trim(p_body->>'reason');
  if v_action<>'retire' and p_successor is not null then
    raise exception 'successor applies only to explicit retirement' using errcode='22023';end if;
  perform 1 from public.care_recipient_products where care_recipient_id=p_patient
    and product_id in (p_product,p_successor) order by product_id for update;
  perform private.require_cap(p_patient,'catalog.manage');
  v_before:=private.catalogue_identity_snapshot(p_patient,p_product,p_successor);
  if v_before->>'referenceHash'<>p_reference then raise exception 'stale catalogue identity reference' using errcode='PT409';end if;
  if (v_action='reactivate' and (v_before->'source'->>'is_active')::boolean and v_before->'guidance'='null'::jsonb)
    or (v_action='clear_successor' and v_before->'guidance'='null'::jsonb)
    or (v_action='retire' and not (v_before->'source'->>'is_active')::boolean
      and (v_before->'guidance'->>'successor_product_id') is not distinct from p_successor) then
    raise exception 'catalogue identity action has no change' using errcode='22023';end if;
  if p_successor is not null then
    if not (v_before->'successor'->>'is_active')::boolean then
      raise exception 'successor must be active for new selections' using errcode='22023';end if;
    if exists(with recursive path(id) as (
      select p_successor union select g.successor_product_id from public.catalogue_successors g join path p on g.product_id=p.id where g.care_recipient_id=p_patient
    ) select 1 from path where id=p_product) then
      raise exception 'cyclic catalogue guidance' using errcode='22023';end if;
  end if;
  if v_action='retire' then
    update public.care_recipient_products set is_active=false,updated_at=clock_timestamp()
      where care_recipient_id=p_patient and product_id=p_product;
    if p_successor is null then delete from public.catalogue_successors where care_recipient_id=p_patient and product_id=p_product;
    else insert into public.catalogue_successors values(p_patient,p_product,p_successor)
      on conflict(care_recipient_id,product_id) do update set successor_product_id=excluded.successor_product_id;end if;
  elsif v_action='reactivate' then
    update public.care_recipient_products set is_active=true,updated_at=clock_timestamp()
      where care_recipient_id=p_patient and product_id=p_product;
    delete from public.catalogue_successors where care_recipient_id=p_patient and product_id=p_product;
  else
    delete from public.catalogue_successors where care_recipient_id=p_patient and product_id=p_product;
  end if;
  v_after:=private.catalogue_identity_snapshot(p_patient,p_product,p_successor);
  -- Shared catalogue history must not retain balances seen by a different
  -- actor. Its immutable facts are identities, status, guidance and own reason.
  v_before:=(v_before-'referenceHash')||jsonb_build_object('source',(v_before->'source')-'stock',
    'successor',case when v_before->'successor'<>'null'::jsonb then (v_before->'successor')-'stock' else null end);
  v_after:=(v_after-'referenceHash')||jsonb_build_object('source',(v_after->'source')-'stock',
    'successor',case when v_after->'successor'<>'null'::jsonb then (v_after->'successor')-'stock' else null end);
  insert into public.catalogue_identity_events(care_recipient_id,product_id,actor_id,actor_name,action,reason,before_state,after_state)
    values(p_patient,p_product,auth.uid(),(select full_name from public.profiles where id=auth.uid()),v_action,v_reason,
      v_before,v_after) returning * into v_event;
  v_result:=jsonb_build_object('source',v_after->'source','successor',v_after->'successor','event',to_jsonb(v_event));
  insert into private.catalogue_identity_commands values(auth.uid(),p_key,p_patient,v_intent,v_result);
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'patient.product.identity','care_recipient_product',v_event.id,
      jsonb_build_object('care_recipient_id',p_patient,'product_id',p_product,'action',v_action,'identity_event_id',v_event.id));
  -- Profile/FK/trigger waits can occur after the initial patient/catalogue locks.
  -- Recheck at the final boundary; all metadata/history changes roll back together.
  perform private.require_cap(p_patient,'catalog.manage');
  return jsonb_build_object('result',v_result,'replayed',false);
end;$$;

revoke execute on function private.catalogue_identity_snapshot(uuid,text,text),
  public.catalogue_identity_context(uuid,text,text,integer),
  public.catalogue_identity_command(uuid,text,text,text,jsonb,uuid) from public,anon,authenticated,service_role;
grant execute on function public.catalogue_identity_context(uuid,text,text,integer),
  public.catalogue_identity_command(uuid,text,text,text,jsonb,uuid) to authenticated;

-- Guard ordinary family movements after the stock lock and own-key recovery.
-- Referenced compensation and already committed keys remain compatible.
do $$declare
  d text;marker text:=' if p_action in (''correction_in'',''correction_out'') then';
begin
  d:=replace(pg_get_functiondef('public.family_stock_movement(uuid,text,numeric,text,text,uuid,uuid)'::regprocedure),E'\r\n',E'\n');
  if length(d)-length(replace(d,marker,''))<>length(marker)
    or length(d)-length(replace(d,' return v_id;',''))<>length(' return v_id;') then
    raise exception 'unexpected family movement compatibility contract';end if;
  d:=replace(d,marker,
    ' if p_action in (''inbound'',''outbound'') and not coalesce((select is_active from public.care_recipient_products where care_recipient_id=p_patient and product_id=p_product),false) then raise exception ''inactive material requires its explicit historical or physical process'' using errcode=''22023'';end if;'||E'\n'||marker);
  d:=replace(d,' return v_id;',
    ' perform private.require_cap(p_patient,''stock.family.manage'');'||E'\n'||' return v_id;');
  execute d;
end;$$;
