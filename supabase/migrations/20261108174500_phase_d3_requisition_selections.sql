-- Named private material sets. They contain no stock, urgency, reason, official
-- document, protocol or snapshot. Historical membership survives deactivation.
create table private.requisition_selections(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.profiles(id),
 care_recipient_id uuid not null references public.care_recipients(id),
 name text not null check(name=btrim(name) and private.bal_comment_units(name) between 2 and 80 and name!~'[[:cntrl:]]'),
 product_ids uuid[] not null check(array_ndims(product_ids)=1 and cardinality(product_ids) between 1 and 1000 and array_position(product_ids,null) is null),
 created_at timestamptz not null default clock_timestamp()
);
create unique index requisition_selection_name on private.requisition_selections(owner_id,care_recipient_id,lower(name));
create index requisition_selection_patient_fk on private.requisition_selections(care_recipient_id);
create table private.requisition_selection_commands(
 owner_id uuid not null references public.profiles(id),
 idempotency_key uuid not null,
 selection_id uuid not null references private.requisition_selections(id),
 intent_hash text not null,
 result jsonb not null,
 primary key(owner_id,idempotency_key)
);
create index requisition_selection_command_selection_fk on private.requisition_selection_commands(selection_id);
alter table private.requisition_selections enable row level security;
alter table private.requisition_selection_commands enable row level security;
create policy requisition_selection_owner on private.requisition_selections for select to authenticated
 using(owner_id=(select auth.uid()) and public.can_access_recipient(care_recipient_id) and private.can(care_recipient_id,'req.read'));
create policy requisition_selection_command_owner on private.requisition_selection_commands for select to authenticated
 using(owner_id=(select auth.uid()) and exists(select 1 from private.requisition_selections s where s.id=selection_id and s.owner_id=(select auth.uid()) and public.can_access_recipient(s.care_recipient_id) and private.can(s.care_recipient_id,'req.read')));
revoke all on private.requisition_selections,private.requisition_selection_commands from public,anon,authenticated,service_role;

create function private.requisition_selection_view(p_selection private.requisition_selections) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('id',p_selection.id,'ownerId',p_selection.owner_id,'patientId',p_selection.care_recipient_id,
  'name',p_selection.name,'productIds',p_selection.product_ids,'createdAt',p_selection.created_at);
$$;

create function public.requisition_selections(p_patient uuid) returns jsonb
language plpgsql security definer set search_path='' as $$declare result jsonb;begin
 perform private.require_creation_draft_read(p_patient,'REQ');
 select coalesce(jsonb_agg(private.requisition_selection_view(s) order by lower(s.name),s.id),'[]'::jsonb) into result
 from private.requisition_selections s where owner_id=auth.uid() and care_recipient_id=p_patient;
 perform private.require_creation_draft_read(p_patient,'REQ');
 return result;
end;$$;

create function public.save_requisition_selection(p_patient uuid,p_name text,p_products uuid[],p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare c private.requisition_selection_commands;s private.requisition_selections;ids uuid[];label text:=btrim(p_name);h text;seen integer;result jsonb;
begin
 perform private.require_creation_draft_read(p_patient,'REQ');
 if p_key is null or label is null or private.bal_comment_units(label) not between 2 and 80 or label~'[[:cntrl:]]'
  or p_products is null or array_ndims(p_products) is distinct from 1 or cardinality(p_products) not between 1 and 1000 or array_position(p_products,null) is not null
  then raise exception 'invalid requisition selection' using errcode='22023';end if;
 select array_agg(id order by id) into ids from (select distinct unnest(p_products) id) source;
 if cardinality(ids)<>cardinality(p_products) then raise exception 'duplicate selection material' using errcode='22023';end if;
 h:=encode(extensions.digest(jsonb_build_array('req-selection',p_patient,label,ids)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('req-selection-key:'||auth.uid()||':'||p_key,0));
 perform private.require_creation_draft_read(p_patient,'REQ');
 select * into c from private.requisition_selection_commands where owner_id=auth.uid() and idempotency_key=p_key;
 if found then
  if c.intent_hash is distinct from h then raise exception 'requisition selection idempotency conflict' using errcode='23505';end if;
  perform private.require_creation_draft_read(p_patient,'REQ');return c.result||jsonb_build_object('replayed',true);
 end if;
 perform private.require_cap(p_patient,'req.create');
 perform pg_advisory_xact_lock(hashtextextended('req-selection-name:'||auth.uid()||':'||p_patient||':'||lower(label),0));
 perform private.require_creation_draft_read(p_patient,'REQ');perform private.require_cap(p_patient,'req.create');
 if exists(select 1 from private.requisition_selections where owner_id=auth.uid() and care_recipient_id=p_patient and lower(name)=lower(label)) then
  raise exception 'requisition selection name exists' using errcode='23505';end if;
 perform product_id from public.care_recipient_products where care_recipient_id=p_patient and is_active and product_id=any(ids) order by product_id for share;
 get diagnostics seen=row_count;
 if seen<>cardinality(ids) then raise exception 'selection material unavailable in patient catalogue' using errcode='22023';end if;
 insert into private.requisition_selections(owner_id,care_recipient_id,name,product_ids) values(auth.uid(),p_patient,label,ids) returning * into s;
 result:=jsonb_build_object('selection',private.requisition_selection_view(s),'replayed',false);
 insert into private.requisition_selection_commands values(auth.uid(),p_key,s.id,h,result);
 perform private.require_creation_draft_read(p_patient,'REQ');perform private.require_cap(p_patient,'req.create');
 return result;
end;$$;

revoke all on function private.requisition_selection_view(private.requisition_selections) from public,anon,authenticated,service_role;
revoke all on function public.requisition_selections(uuid),public.save_requisition_selection(uuid,text,uuid[],uuid) from public,anon,authenticated,service_role;
grant execute on function public.requisition_selections(uuid),public.save_requisition_selection(uuid,text,uuid[],uuid) to authenticated;
notify pgrst,'reload schema';
