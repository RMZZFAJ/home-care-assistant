CREATE OR REPLACE FUNCTION public.admin_upsert_recipient_product(p_care_recipient_id uuid, p_product_id text, p_name text, p_category product_category, p_unit text, p_aliases text[], p_is_active boolean, p_description text DEFAULT NULL::text, p_sort_order integer DEFAULT 0)
 RETURNS care_recipient_products
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare v public.care_recipient_products; v_id text; v_old_unit text;
begin
  if not private.can(p_care_recipient_id,'catalog.manage') then raise exception 'catalogue admin authorization required' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended('catalogue:'||p_care_recipient_id,0));
  if p_name is null or length(trim(p_name)) not between 2 and 160 or p_category is null or p_unit is null or not exists(select 1 from public.measurement_units where code=p_unit and (care_recipient_id is null or care_recipient_id=p_care_recipient_id)) then raise exception 'invalid product'; end if;
  if cardinality(coalesce(p_aliases,'{}'))>50 or exists(select 1 from unnest(p_aliases) a where a is null or length(trim(a)) not between 1 and 160) then raise exception 'invalid aliases'; end if;
  if exists(select 1 from public.care_recipient_products c cross join lateral unnest(array_append(c.aliases,c.name)) a
    where c.care_recipient_id=p_care_recipient_id and c.product_id is distinct from p_product_id
      and exists(select 1 from unnest(array_append(coalesce(p_aliases,'{}'),p_name)) b where unaccent(lower(trim(a)))=unaccent(lower(trim(b)))))
  then raise exception 'ambiguous product alias'; end if;
  v_id:=p_product_id;
  if v_id is null then
    v_id:='patient-'||gen_random_uuid()::text;
    insert into public.products(id,name,category,unit,aliases,is_active,owner_care_recipient_id) values(v_id,trim(p_name),p_category,p_unit,coalesce(p_aliases,'{}'),p_is_active,p_care_recipient_id);
  elsif not exists(select 1 from public.products where id=v_id and (owner_care_recipient_id is null or owner_care_recipient_id=p_care_recipient_id)) then raise exception 'product not available for patient'; end if;
  select unit into v_old_unit from public.care_recipient_products where care_recipient_id=p_care_recipient_id and product_id=v_id;
  if v_old_unit is distinct from p_unit and v_old_unit is not null and (
    exists(select 1 from public.requisition_items where care_recipient_id=p_care_recipient_id and product_id=v_id)
    or exists(select 1 from public.stock_movements where care_recipient_id=p_care_recipient_id and product_id=v_id)
    or exists(select 1 from public.stock_inventory_items where care_recipient_id=p_care_recipient_id and product_id=v_id)) then raise exception 'unit with operational history is immutable; create a new product'; end if;
  insert into public.care_recipient_products(care_recipient_id,product_id,name,description,category,unit,aliases,is_active,sort_order)
  values(p_care_recipient_id,v_id,trim(p_name),p_description,p_category,p_unit,coalesce(p_aliases,'{}'),p_is_active,p_sort_order)
  on conflict(care_recipient_id,product_id) do update set name=excluded.name,description=excluded.description,category=excluded.category,unit=excluded.unit,aliases=excluded.aliases,is_active=excluded.is_active,sort_order=excluded.sort_order,updated_at=now() returning * into v;
  insert into public.audit_events(actor_id,action,entity_type,metadata) values(auth.uid(),'patient.product.updated','care_recipient_product',jsonb_build_object('care_recipient_id',p_care_recipient_id,'product_id',v_id,'is_active',p_is_active));
  return v;
end; $function$
