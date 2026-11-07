-- Protect new factors without rewriting any legacy value or document snapshot.
alter table public.product_presentations
  add constraint presentation_finite_factor
  check (base_quantity <> 'NaN'::numeric and base_quantity > 0
         and base_quantity <= 1000000000) not valid;

do $$begin
  if not exists (select 1 from public.product_presentations
    where base_quantity = 'NaN'::numeric or base_quantity <= 0
       or base_quantity > 1000000000) then
    alter table public.product_presentations validate constraint presentation_finite_factor;
  end if;
end;$$;

create or replace function public.configure_catalogue_unit(
  p_patient uuid, p_product text, p_unit text, p_decimals integer,
  p_barcode text default null, p_presentation text default null,
  p_base_quantity numeric default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  v_id uuid;
  v_product public.care_recipient_products;
begin
  perform private.require_cap(p_patient,'catalog.manage');
  -- Same order as document/ledger writers. Unit history and presentation
  -- configuration cannot race with the first operational movement.
  perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
  perform pg_advisory_xact_lock(hashtextextended('catalogue:'||p_patient,0));
  perform private.require_cap(p_patient,'catalog.manage');
  if p_decimals is null or p_decimals not between 0 and 6
    or p_unit is null or not exists (select 1 from public.measurement_units
      where code=p_unit and (care_recipient_id is null or care_recipient_id=p_patient)) then
    raise exception 'invalid measurement unit' using errcode='22023';
  end if;
  if p_barcode is null then
    if p_presentation is not null or p_base_quantity is not null then
      raise exception 'presentation requires a barcode' using errcode='22023';
    end if;
  elsif p_barcode !~ '^[0-9]{8,14}$'
    or p_base_quantity is null or p_base_quantity::text in ('NaN','Infinity','-Infinity')
    or p_base_quantity<=0 or p_base_quantity>1000000000
    or p_base_quantity<>round(p_base_quantity,p_decimals)
    or p_presentation is null or length(trim(p_presentation)) not between 2 and 160 then
    raise exception 'invalid presentation' using errcode='22023';
  end if;
  select * into v_product from public.care_recipient_products
    where care_recipient_id=p_patient and product_id=p_product for update;
  if not found then raise exception 'product not found' using errcode='22023';end if;
  perform private.require_cap(p_patient,'catalog.manage');
  if v_product.unit is distinct from p_unit and exists (
    select 1 from public.product_presentations
      where care_recipient_id=p_patient and product_id=p_product) then
    raise exception 'unit with presentations is immutable' using errcode='22023';
  end if;
  -- The existing catalogue trigger preserves units/precision with REQ,
  -- document or ledger history, including legacy operational records.
  update public.care_recipient_products set unit=p_unit,quantity_decimals=p_decimals
    where care_recipient_id=p_patient and product_id=p_product;
  if p_barcode is not null then
    insert into public.product_presentations(care_recipient_id,product_id,barcode,name,base_quantity)
      values(p_patient,p_product,p_barcode,trim(p_presentation),p_base_quantity)
    on conflict(care_recipient_id,barcode) do update
      set name=excluded.name,base_quantity=excluded.base_quantity
      where public.product_presentations.product_id=excluded.product_id returning id into v_id;
    if v_id is null then
      raise exception 'barcode already associated with another product' using errcode='23505';
    end if;
  end if;
  if exists (select 1 from public.product_presentations
    where care_recipient_id=p_patient and product_id=p_product and active
      and (base_quantity::text in ('NaN','Infinity','-Infinity')
        or base_quantity<>round(base_quantity,p_decimals))) then
    raise exception 'precision incompatible with an existing presentation' using errcode='22023';
  end if;
  insert into public.audit_events(actor_id,action,entity_type,metadata)
    values(auth.uid(),'patient.presentation.configured','care_recipient_product',
      jsonb_build_object('care_recipient_id',p_patient,'product_id',p_product,'presentation_id',v_id));
  -- Includes waits on an existing barcode's row, FKs and audit insertion.
  perform private.require_cap(p_patient,'catalog.manage');
  return jsonb_build_object('presentationId',v_id);
end;$$;
revoke execute on function public.configure_catalogue_unit(uuid,text,text,integer,text,text,numeric)
  from public,anon,service_role;
grant execute on function public.configure_catalogue_unit(uuid,text,text,integer,text,text,numeric)
  to authenticated;

-- Retain the established identity/alias/history implementation. Add the same
-- patient lock and rechecks around its existing catalogue lock and final writes.
do $$declare
  v_oid regprocedure := 'public.admin_upsert_recipient_product(uuid,text,text,public.product_category,text,text[],boolean,text,integer)'::regprocedure;
  v_def text;
  v_old text := '  perform pg_advisory_xact_lock(hashtextextended(''catalogue:''||p_care_recipient_id,0));';
begin
  v_def:=replace(pg_get_functiondef(v_oid),E'\r\n',E'\n');
  if length(v_def)-length(replace(v_def,v_old,''))<>length(v_old)
    or length(v_def)-length(replace(v_def,'  return v;',''))<>length('  return v;') then
    raise exception 'unexpected catalogue identity function contract';
  end if;
  v_def:=replace(v_def,v_old,
    '  perform private.require_cap(p_care_recipient_id,''catalog.manage'');'||E'\n'||
    '  perform pg_advisory_xact_lock(hashtextextended(''stock:''||p_care_recipient_id,0));'||E'\n'||v_old||E'\n'||
    '  perform private.require_cap(p_care_recipient_id,''catalog.manage'');');
  v_def:=replace(v_def,'  return v;',
    '  perform private.require_cap(p_care_recipient_id,''catalog.manage'');'||E'\n'||'  return v;');
  execute v_def;
end;$$;
