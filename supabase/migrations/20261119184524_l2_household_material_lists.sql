-- Shared sets are explicitly created for the household. L1 personal lists retain their owner.
create table private.household_material_lists (
  id uuid primary key default gen_random_uuid(),
  care_recipient_id uuid not null references public.care_recipients(id),
  name text not null check (name = btrim(name) and private.bal_comment_units(name) between 2 and 80 and name !~ '[[:cntrl:]]'),
  product_ids text[] not null check (
    array_ndims(product_ids) = 1 and cardinality(product_ids) between 1 and 1000
    and array_position(product_ids, null::text) is null
  ),
  revision integer not null default 1 check (revision > 0),
  updated_by uuid not null references public.profiles(id),
  updated_at timestamptz not null default clock_timestamp()
);
create unique index household_material_list_name on private.household_material_lists(care_recipient_id, lower(name));
create index household_material_list_editor_fk on private.household_material_lists(updated_by);

create table private.household_material_list_commands (
  actor_id uuid not null references public.profiles(id),
  idempotency_key uuid not null,
  list_id uuid not null references private.household_material_lists(id),
  intent_hash text not null,
  result jsonb not null,
  primary key (actor_id, idempotency_key)
);
create index household_material_list_command_list_fk on private.household_material_list_commands(list_id);
alter table private.household_material_lists enable row level security;
alter table private.household_material_list_commands enable row level security;
revoke all on private.household_material_lists, private.household_material_list_commands from public, anon, authenticated, service_role;

create function private.household_material_list_view(entry private.household_material_lists)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'id',entry.id,'patientId',entry.care_recipient_id,'name',entry.name,
    'productIds',entry.product_ids,'revision',entry.revision,'updatedAt',entry.updated_at,
    'updatedBy',(select full_name from public.profiles where id = entry.updated_by)
  );
$$;
revoke all on function private.household_material_list_view(private.household_material_lists) from public, anon, authenticated, service_role;

create function private.require_household_list_read(p_patient uuid,p_kind text)
returns void language plpgsql set search_path = '' as $$
begin
  if p_kind is null or p_kind not in ('REQ','COM','ENT') then
    raise exception 'invalid household list scope' using errcode='22023';
  end if;
  perform private.require_cap(p_patient,lower(p_kind)||'.read');
end;
$$;
revoke all on function private.require_household_list_read(uuid,text) from public, anon, authenticated, service_role;

create function public.household_material_lists(p_patient uuid,p_kind text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  perform private.require_household_list_read(p_patient,p_kind);
  select coalesce(jsonb_agg(private.household_material_list_view(s) order by lower(s.name),s.id),'[]') into result
  from private.household_material_lists s where s.care_recipient_id=p_patient;
  perform private.require_household_list_read(p_patient,p_kind);
  return result;
end;
$$;

create function public.save_household_material_list(
  p_patient uuid,p_kind text,p_id uuid,p_revision integer,p_name text,p_products text[],p_key uuid
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  entry private.household_material_lists;
  prior private.household_material_list_commands;
  label text := btrim(p_name);
  ids text[];
  added text[];
  intent text;
  seen integer;
  result jsonb;
begin
  perform private.require_household_list_read(p_patient,p_kind);
  if p_key is null or label is null or private.bal_comment_units(label) not between 2 and 80 or label ~ '[[:cntrl:]]'
     or p_products is null or array_ndims(p_products) is distinct from 1 or cardinality(p_products) not between 1 and 1000
     or array_position(p_products,null::text) is not null or (p_id is null) <> (p_revision is null) or p_revision < 1
     or exists(select 1 from unnest(p_products) material(id) where id='' or not private.creation_draft_text(to_jsonb(id),120)) then
    raise exception 'invalid household list' using errcode='22023';
  end if;
  select array_agg(distinct id order by id) into ids from unnest(p_products) material(id);
  if cardinality(ids) <> cardinality(p_products) then
    raise exception 'duplicate household list material' using errcode='22023';
  end if;
  intent := encode(extensions.digest(jsonb_build_array(p_patient,p_kind,p_id,p_revision,label,ids)::text,'sha256'),'hex');
  perform pg_advisory_xact_lock(hashtextextended('household-list-key:'||auth.uid()||':'||p_key,0));
  perform private.require_household_list_read(p_patient,p_kind);
  select * into prior from private.household_material_list_commands where actor_id=auth.uid() and idempotency_key=p_key;
  if found then
    if prior.intent_hash is distinct from intent then
      raise exception 'household list idempotency conflict' using errcode='23505';
    end if;
    return prior.result||jsonb_build_object('replayed',true);
  end if;

  perform pg_advisory_xact_lock(hashtextextended('household-list:'||p_patient,0));
  perform private.require_household_list_read(p_patient,p_kind);
  perform private.require_cap(p_patient,lower(p_kind)||'.create');
  if p_id is not null then
    select * into entry from private.household_material_lists
    where id=p_id and care_recipient_id=p_patient for update;
    if not found or entry.revision is distinct from p_revision then
      raise exception 'stale household list revision' using errcode='PT409';
    end if;
  end if;
  if exists(select 1 from private.household_material_lists
    where care_recipient_id=p_patient and lower(name)=lower(label) and id is distinct from p_id) then
    raise exception 'household list name exists' using errcode='23505';
  end if;

  -- Inactive materials may remain in an existing set but cannot be newly added.
  added := array(select id from unnest(ids) material(id) where not(id=any(coalesce(entry.product_ids,'{}'))));
  perform product_id from public.care_recipient_products
  where care_recipient_id=p_patient and is_active and product_id=any(added) order by product_id for share;
  get diagnostics seen = row_count;
  if seen <> cardinality(added) then
    raise exception 'household list material unavailable' using errcode='22023';
  end if;

  if p_id is null then
    insert into private.household_material_lists(care_recipient_id,name,product_ids,updated_by)
    values(p_patient,label,ids,auth.uid()) returning * into entry;
  else
    update private.household_material_lists set name=label,product_ids=ids,
      revision=revision+1,updated_at=clock_timestamp(),updated_by=auth.uid()
    where id=p_id and care_recipient_id=p_patient returning * into entry;
  end if;
  result := jsonb_build_object('list',private.household_material_list_view(entry),'replayed',false);
  insert into private.household_material_list_commands values(auth.uid(),p_key,entry.id,intent,result);
  perform private.require_household_list_read(p_patient,p_kind);
  perform private.require_cap(p_patient,lower(p_kind)||'.create');
  return result;
end;
$$;
revoke all on function public.household_material_lists(uuid,text), public.save_household_material_list(uuid,text,uuid,integer,text,text[],uuid)
from public, anon, authenticated, service_role;
grant execute on function public.household_material_lists(uuid,text), public.save_household_material_list(uuid,text,uuid,integer,text,text[],uuid)
to authenticated;
notify pgrst,'reload schema';
