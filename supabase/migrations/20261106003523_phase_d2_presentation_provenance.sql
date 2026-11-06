alter table public.product_presentations
  add column version integer not null default 1 check(version>0),
  add column updated_at timestamptz,
  add column updated_by uuid references public.profiles(id);
-- A dedicated database-populated field distinguishes new captured provenance
-- from arbitrary metadata that legacy clients could have supplied.
alter table public.document_lines add column presentation_conversions jsonb not null default '[]';

create table public.product_presentation_versions (
  presentation_id uuid not null references public.product_presentations(id),
  care_recipient_id uuid not null references public.care_recipients(id),
  version integer not null check(version>0),
  definition jsonb not null,
  recorded_at timestamptz not null default statement_timestamp(),
  primary key(presentation_id,version)
);
create index presentation_versions_patient on public.product_presentation_versions(care_recipient_id,presentation_id,version desc);
create table public.product_presentation_commands (
  actor_id uuid not null references public.profiles(id),
  idempotency_key uuid not null,
  care_recipient_id uuid not null references public.care_recipients(id),
  presentation_id uuid not null references public.product_presentations(id),
  intent jsonb not null,
  result jsonb not null,
  recorded_at timestamptz not null default statement_timestamp(),
  primary key(actor_id,idempotency_key)
);
create index presentation_commands_patient on public.product_presentation_commands(care_recipient_id,presentation_id);
alter table public.product_presentation_versions enable row level security;
alter table public.product_presentation_commands enable row level security;
revoke all on public.product_presentation_versions,public.product_presentation_commands from public,anon,authenticated,service_role;
grant select on public.product_presentation_versions,public.product_presentation_commands to authenticated;
create policy presentation_versions_read on public.product_presentation_versions for select to authenticated
  using(public.can_access_recipient(care_recipient_id));
create policy presentation_commands_read on public.product_presentation_commands for select to authenticated
  using(actor_id=auth.uid() and public.can_access_recipient(care_recipient_id));

-- This is an observation of the existing definition, never a reconstructed
-- historic edit or invented attribution. Invalid legacy factors remain visible.
insert into public.product_presentation_versions(presentation_id,care_recipient_id,version,definition)
select p.id,p.care_recipient_id,p.version,to_jsonb(p)||jsonb_build_object(
  'unit',c.unit,'decimals',c.quantity_decimals,'capturedExisting',true,'actorName',null)
from public.product_presentations p join public.care_recipient_products c
  on c.care_recipient_id=p.care_recipient_id and c.product_id=p.product_id;

create function private.version_product_presentation() returns trigger
language plpgsql security definer set search_path='' as $$begin
  if tg_op='UPDATE' then
    if new.id<>old.id or new.care_recipient_id<>old.care_recipient_id or new.product_id<>old.product_id then
      raise exception 'presentation identity is immutable' using errcode='22023';
    end if;
    if row(new.barcode,new.name,new.base_quantity,new.active) is not distinct from row(old.barcode,old.name,old.base_quantity,old.active) then
      return old;
    end if;
    new.version:=old.version+1;
  else new.version:=1;end if;
  new.updated_at:=statement_timestamp();new.updated_by:=auth.uid();return new;
end;$$;
create function private.record_product_presentation_version() returns trigger
language plpgsql security definer set search_path='' as $$begin
  if tg_op='UPDATE' and new.version=old.version then return new;end if;
  insert into public.product_presentation_versions(presentation_id,care_recipient_id,version,definition)
    select new.id,new.care_recipient_id,new.version,to_jsonb(new)||jsonb_build_object(
      'unit',c.unit,'decimals',c.quantity_decimals,'capturedExisting',false,
      'actorName',(select full_name from public.profiles where id=auth.uid()))
    from public.care_recipient_products c where c.care_recipient_id=new.care_recipient_id and c.product_id=new.product_id;
  return new;
end;$$;
create trigger product_presentation_version before insert or update on public.product_presentations
  for each row execute function private.version_product_presentation();
create trigger product_presentation_history after insert or update on public.product_presentations
  for each row execute function private.record_product_presentation_version();
revoke execute on function private.version_product_presentation(),private.record_product_presentation_version()
  from public,anon,authenticated,service_role;

create function public.catalogue_presentation_command(p_patient uuid,p_id uuid,p_version integer,p_body jsonb,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_command public.product_presentation_commands;
  v_current public.product_presentations;
  v_product public.care_recipient_products;
  v_intent jsonb:=jsonb_build_object('id',p_id,'version',p_version,'body',p_body);
  v_factor numeric;v_result jsonb;
begin
  if not coalesce(public.can_access_recipient(p_patient),false) then
    raise exception 'active patient read authority required' using errcode='42501';end if;
  if p_key is null or jsonb_typeof(p_body) is distinct from 'object' then
    raise exception 'invalid presentation command' using errcode='22023';end if;
  perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
  perform pg_advisory_xact_lock(hashtextextended('catalogue:'||p_patient,0));
  perform pg_advisory_xact_lock(hashtextextended('presentation-command:'||auth.uid()||':'||p_key,0));
  if not coalesce(public.can_access_recipient(p_patient),false) then
    raise exception 'active patient read authority required' using errcode='42501';end if;
  select * into v_command from public.product_presentation_commands where actor_id=auth.uid() and idempotency_key=p_key;
  if found then
    if v_command.care_recipient_id<>p_patient or v_command.intent<>v_intent then
      raise exception 'presentation intent conflict' using errcode='23505';end if;
    select * into v_current from public.product_presentations where id=v_command.presentation_id;
    return jsonb_build_object('result',v_command.result,'current',to_jsonb(v_current),'replayed',true);
  end if;
  perform private.require_cap(p_patient,'catalog.manage');
  if exists(select 1 from jsonb_object_keys(p_body) k where k not in ('productId','name','barcode','baseQuantity','active'))
    or jsonb_typeof(p_body->'productId') is distinct from 'string'
    or jsonb_typeof(p_body->'name') is distinct from 'string'
    or length(trim(p_body->>'name')) not between 2 and 160
    or jsonb_typeof(p_body->'barcode') is distinct from 'string'
    or (p_body->>'barcode') !~ '^[0-9]{8,14}$'
    or jsonb_typeof(p_body->'active') is distinct from 'boolean'
    or coalesce(p_body->>'baseQuantity','') !~ '^[0-9]+([.][0-9]+)?$'
    or length(p_body->>'baseQuantity')>64 then
    raise exception 'invalid presentation fields' using errcode='22023';end if;
  v_factor:=(p_body->>'baseQuantity')::numeric;
  select * into v_product from public.care_recipient_products
    where care_recipient_id=p_patient and product_id=p_body->>'productId' for update;
  if not found then raise exception 'patient product not found' using errcode='22023';end if;
  if v_factor<=0 or v_factor>1000000000 or v_factor<>round(v_factor,v_product.quantity_decimals) then
    raise exception 'invalid presentation factor or precision' using errcode='22023';end if;
  perform private.require_cap(p_patient,'catalog.manage');
  if p_id is null then
    if p_version is not null then raise exception 'create has no reference version' using errcode='22023';end if;
    insert into public.product_presentations(care_recipient_id,product_id,barcode,name,base_quantity,active)
      values(p_patient,v_product.product_id,p_body->>'barcode',trim(p_body->>'name'),v_factor,(p_body->>'active')::boolean)
      returning * into v_current;
  else
    select * into v_current from public.product_presentations where id=p_id and care_recipient_id=p_patient and product_id=v_product.product_id for update;
    if not found then raise exception 'presentation not found in this product' using errcode='22023';end if;
    if p_version is null or v_current.version<>p_version then
      raise exception 'stale presentation version' using errcode='PT409';end if;
    update public.product_presentations set barcode=p_body->>'barcode',name=trim(p_body->>'name'),
      base_quantity=v_factor,active=(p_body->>'active')::boolean where id=p_id returning * into v_current;
  end if;
  v_result:=to_jsonb(v_current)||jsonb_build_object('unit',v_product.unit);
  insert into public.product_presentation_commands(actor_id,idempotency_key,care_recipient_id,presentation_id,intent,result)
    values(auth.uid(),p_key,p_patient,v_current.id,v_intent,v_result);
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
    values(auth.uid(),'patient.presentation.command','product_presentation',v_current.id,
      jsonb_build_object('care_recipient_id',p_patient,'product_id',v_product.product_id,'version',v_current.version));
  perform private.require_cap(p_patient,'catalog.manage');
  return jsonb_build_object('result',v_result,'current',to_jsonb(v_current),'replayed',false);
end;$$;
revoke execute on function public.catalogue_presentation_command(uuid,uuid,integer,jsonb,uuid) from public,anon,service_role;
grant execute on function public.catalogue_presentation_command(uuid,uuid,integer,jsonb,uuid) to authenticated;

-- The legacy entry point still configures units or creates a barcode. Editing
-- an existing definition now explicitly requires its identity/version command.
do $$declare d text;needle text:='  if p_barcode is not null then';begin
  d:=replace(pg_get_functiondef('public.configure_catalogue_unit(uuid,text,text,integer,text,text,numeric)'::regprocedure),E'\r\n',E'\n');
  if length(d)-length(replace(d,needle,''))<>length(needle) then raise exception 'unexpected legacy presentation contract';end if;
  d:=replace(d,needle,needle||E'\n'||
    '    if exists(select 1 from public.product_presentations where care_recipient_id=p_patient and barcode=p_barcode) then raise exception ''existing presentation requires identity and version'' using errcode=''PT409'';end if;');
  execute d;
end;$$;

-- An existing presentation defines the base unit even before its first ledger
-- movement. Changing that unit would silently reinterpret its factor/history.
do $$declare d text;needle text:='return new;';begin
  d:=replace(pg_get_functiondef('private.guard_catalogue_unit()'::regprocedure),E'\r\n',E'\n');
  if length(d)-length(replace(d,needle,''))<>length(needle) then raise exception 'unexpected catalogue unit guard';end if;
  d:=replace(d,needle,
    'if tg_op=''UPDATE'' and old.unit is distinct from new.unit and exists(select 1 from public.product_presentations where care_recipient_id=new.care_recipient_id and product_id=new.product_id) then raise exception ''unit with presentation history is immutable'' using errcode=''22023'';end if;'||
    'if exists(select 1 from public.product_presentations where care_recipient_id=new.care_recipient_id and product_id=new.product_id and active and (base_quantity::text in (''NaN'',''Infinity'',''-Infinity'') or base_quantity<>round(base_quantity,new.quantity_decimals))) then raise exception ''precision incompatible with presentation'' using errcode=''22023'';end if;'||needle);
  execute d;
end;$$;

create function private.capture_presentation_conversions(p_patient uuid,p_line jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  v_metadata jsonb:=coalesce(p_line->'metadata','{}');
  v_product public.care_recipient_products;
  v_presentation public.product_presentations;
  v_selection jsonb;v_facts jsonb:='[]';v_seen uuid[]:='{}';
  v_manual numeric;v_packages numeric;v_total numeric;v_id uuid;v_version integer;
begin
  if jsonb_typeof(v_metadata) is distinct from 'object' or v_metadata ?| array['presentationConversions','manualQuantity'] then
    raise exception 'presentation facts are database generated' using errcode='22023';end if;
  if not (p_line ? 'presentations') then
    if p_line ? 'manualQuantity' then raise exception 'manual remainder requires presentation selections' using errcode='22023';end if;
    return v_metadata;
  end if;
  if jsonb_typeof(p_line->'presentations') is distinct from 'array' or jsonb_array_length(p_line->'presentations') not between 1 and 100
    or coalesce(p_line->>'manualQuantity','0') !~ '^[0-9]+([.][0-9]+)?$'
    or length(coalesce(p_line->>'manualQuantity','0'))>64 then
    raise exception 'invalid package selection' using errcode='22023';end if;
  select * into strict v_product from public.care_recipient_products
    where care_recipient_id=p_patient and product_id=p_line->>'productId' and is_active;
  v_manual:=coalesce(p_line->>'manualQuantity','0')::numeric;
  if v_manual>1000000000 or v_manual<>round(v_manual,v_product.quantity_decimals) then
    raise exception 'invalid manual remainder' using errcode='22023';end if;
  v_total:=v_manual;
  for v_selection in select value from jsonb_array_elements(p_line->'presentations') loop
    if jsonb_typeof(v_selection) is distinct from 'object'
      or exists(select 1 from jsonb_object_keys(v_selection) k where k not in ('id','version','packages'))
      or coalesce(v_selection->>'id','') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      or coalesce(v_selection->>'version','') !~ '^[1-9][0-9]{0,8}$'
      or coalesce(v_selection->>'packages','') !~ '^[1-9][0-9]{0,8}$' then
      raise exception 'invalid presentation selection' using errcode='22023';end if;
    v_id:=(v_selection->>'id')::uuid;v_version:=(v_selection->>'version')::integer;
    v_packages:=(v_selection->>'packages')::numeric;
    if v_id=any(v_seen) then raise exception 'duplicate presentation selection' using errcode='22023';end if;
    v_seen:=array_append(v_seen,v_id);
    select * into v_presentation from public.product_presentations where id=v_id and care_recipient_id=p_patient
      and product_id=v_product.product_id and active;
    if not found or v_presentation.version<>v_version then raise exception 'stale or unavailable presentation' using errcode='PT409';end if;
    if v_presentation.base_quantity::text in ('NaN','Infinity','-Infinity')
      or v_presentation.base_quantity<=0 or v_presentation.base_quantity>1000000000
      or v_presentation.base_quantity<>round(v_presentation.base_quantity,v_product.quantity_decimals) then
      raise exception 'invalid catalogue factor' using errcode='22023';end if;
    v_total:=v_total+v_packages*v_presentation.base_quantity;
    v_facts:=v_facts||jsonb_build_array(jsonb_build_object(
      'id',v_id,'version',v_presentation.version,'barcode',v_presentation.barcode,'name',v_presentation.name,
      'packages',v_packages::text,'baseQuantity',trim_scale(v_presentation.base_quantity)::text,
      'unit',v_product.unit,'convertedQuantity',trim_scale(v_packages*v_presentation.base_quantity)::text));
  end loop;
  if v_total>1000000000 or v_total<>(p_line->>'quantity')::numeric then
    raise exception 'base quantity does not match package conversion' using errcode='22023';end if;
  return v_metadata||jsonb_build_object('manualQuantity',trim_scale(v_manual)::text,'presentationConversions',v_facts);
end;$$;
revoke execute on function private.capture_presentation_conversions(uuid,jsonb) from public,anon,authenticated,service_role;

do $$declare d text;signature text;needle text:='else coalesce(x->''metadata'',''{}'') end)';loop_needle text:=' for x in select value from jsonb_array_elements(p_payload->''lines'') loop';begin
  foreach signature in array array['public.v3_create_supply_document(uuid,text,jsonb,uuid,boolean)','public.v3_revise_supply_document(uuid,jsonb,uuid,integer,boolean)'] loop
    d:=replace(pg_get_functiondef(signature::regprocedure),E'\r\n',E'\n');
    if length(d)-length(replace(d,needle,''))<>length(needle) or length(d)-length(replace(d,loop_needle,''))<>length(loop_needle) then raise exception 'unexpected supply line conversion contract';end if;
    d:=replace(d,'quantity,approved_quantity,metadata)','quantity,approved_quantity,metadata,presentation_conversions)');
    d:=replace(d,needle,'else private.capture_presentation_conversions(p_patient,x) end,case when p_type=''BAL'' then ''[]''::jsonb else coalesce(private.capture_presentation_conversions(p_patient,x)->''presentationConversions'',''[]'') end)');
    d:=replace(d,loop_needle,
      ' if p_type=''BAL'' and exists(select 1 from jsonb_array_elements(p_payload->''lines'') z where z ? ''presentations'' or z ? ''manualQuantity'') then raise exception ''BAL counts use base units'' using errcode=''22023'';end if;'||E'\n'||loop_needle);
    execute d;
  end loop;
end;$$;
