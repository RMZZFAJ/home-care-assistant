create function private.team_shortage_input(p_lines jsonb)
returns jsonb language plpgsql set search_path='' as $$
declare
  line jsonb;
  measured jsonb := '[]';
  unmeasured jsonb := '[]';
  normalized jsonb;
begin
  if jsonb_typeof(p_lines) is distinct from 'array' or jsonb_array_length(p_lines)>100 then
    raise exception 'invalid shortage lines' using errcode='22023';
  end if;

  for line in select value from jsonb_array_elements(p_lines) loop
    if line->>'quantity' is not null then
      measured := measured||jsonb_build_array(line);
    else
      if jsonb_typeof(line) is distinct from 'object' or (line-'productId'-'quantity'-'unit')<>'{}'::jsonb
        or jsonb_typeof(line->'productId') is distinct from 'string' or length(line->>'productId') not between 1 and 120
        or (line ? 'unit' and (jsonb_typeof(line->'unit') is distinct from 'string' or length(line->>'unit') not between 1 and 30)) then
        raise exception 'invalid shortage material' using errcode='22023';
      end if;
      unmeasured := unmeasured||jsonb_build_array(line||jsonb_build_object('quantity',null));
    end if;
  end loop;

  -- Keep an earlier quantified attempt identical for receipt recovery.
  normalized := private.consumption_input(measured)||unmeasured;
  if (select count(distinct item->>'productId') from jsonb_array_elements(normalized) item)<>jsonb_array_length(normalized) then
    raise exception 'duplicate shortage material' using errcode='22023';
  end if;
  return coalesce((select jsonb_agg(item order by item->>'productId') from jsonb_array_elements(normalized) item),'[]'::jsonb);
end;
$$;

create function private.team_shortage_material(p_patient uuid,p_line jsonb)
returns jsonb language plpgsql set search_path='' as $$
declare
  material public.care_recipient_products;
begin
  select * into material from public.care_recipient_products
    where care_recipient_id=p_patient and product_id=p_line->>'productId';
  if not found
    or (not material.is_active and not exists (
      select 1 from public.current_stock_balances balance
      where balance.care_recipient_id=p_patient and balance.product_id=material.product_id
        and balance.location='CARE_TEAM' and balance.balance>0
    ))
    or (p_line ? 'unit' and p_line->>'unit' is distinct from material.unit) then
    raise exception 'invalid shortage material' using errcode='22023';
  end if;
  return jsonb_build_object('productId',material.product_id,'name',material.name,'unit',material.unit,'quantity',null);
end;
$$;

revoke all on function private.team_shortage_input(jsonb), private.team_shortage_material(uuid,jsonb)
  from public,anon,authenticated,service_role;

do $migration$
declare
  definition text := pg_get_functiondef('public.team_consumption_command(uuid,uuid,jsonb)'::regprocedure);
  normalize constant text := $original$  input := private.consumption_input(coalesce(p_body->'lines','[]'::jsonb));$original$;
  material constant text := $original$    if previous_item is not null and (item->>'quantity')::numeric<=(previous_item->>'quantity')::numeric then$original$;
begin
  if strpos(definition,normalize)=0 or strpos(definition,material)=0 then
    raise exception 'team consumption material contract changed';
  end if;
  definition := replace(definition,normalize,$updated$  input := case when action='shortage' then private.team_shortage_input(coalesce(p_body->'lines','[]'::jsonb))
    else private.consumption_input(coalesce(p_body->'lines','[]'::jsonb)) end;$updated$);
  definition := replace(definition,material,$updated$    if action='shortage' and item->>'quantity' is null then
      canonical := canonical||jsonb_build_array(private.team_shortage_material(p_patient,item));
    elsif previous_item is not null and (item->>'quantity')::numeric<=(previous_item->>'quantity')::numeric then$updated$);
  execute definition;
end;
$migration$;
