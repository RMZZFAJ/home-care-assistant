create function public.team_consumption_reference(p_patient uuid,p_products text[])
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  materials jsonb;
  fingerprint jsonb;
begin
  perform private.require_team_consumption_write(p_patient);
  if p_products is null or cardinality(p_products) not between 1 and 100
    or cardinality(p_products)<>(select count(distinct item) from unnest(p_products) item)
    or exists(select 1 from unnest(p_products) item where length(item) not between 1 and 120)
  then raise exception 'invalid consumption materials' using errcode='22023'; end if;
  select jsonb_agg(jsonb_build_object('productId',c.product_id,'name',c.name,'unit',c.unit,'decimals',c.quantity_decimals,
    'quantity',positions.quantity::text,'updatedAt',event.updated_at) order by c.product_id),
    jsonb_agg(jsonb_build_array(c.product_id,c.unit,c.quantity_decimals,c.is_active,c.updated_at,event.revision,positions.quantity)
      order by c.product_id)
    into materials,fingerprint
  from public.care_recipient_products c
  cross join lateral (select private.stock_quantity(p_patient,c.product_id,'CARE_TEAM') quantity) positions
  cross join lateral (
    select max(m.movement_revision) revision,max(m.created_at) updated_at
    from public.stock_movements m where m.care_recipient_id=p_patient and m.product_id=c.product_id
      and 'CARE_TEAM' in (m.source_location,m.destination_location)
  ) event
  where c.care_recipient_id=p_patient and c.product_id=any(p_products);
  if coalesce(jsonb_array_length(materials),0)<>cardinality(p_products) then
    raise exception 'consumption material unavailable' using errcode='22023';
  end if;
  return jsonb_build_object('careRecipientId',p_patient,'materials',materials,'referenceHash',
    encode(extensions.digest(jsonb_build_array(p_patient,fingerprint)::text,'sha256'),'hex'));
end;
$$;

create function public.submit_team_consumption(
  p_patient uuid,p_key uuid,p_body jsonb,p_reference text,p_draft_id uuid default null,p_draft_revision integer default null
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
  saved private.consumption_preparations;
  fields jsonb;
  saved_lines jsonb;
  confirmed_lines jsonb;
  materials text[];
  receipt jsonb;
begin
  perform private.require_team_consumption_write(p_patient);
  if p_key is null or (p_draft_id is null)<>(p_draft_revision is null)
    or (p_body->>'action' is distinct from 'issue' and (p_reference is not null or p_draft_id is not null)) then
    raise exception 'invalid consumption confirmation' using errcode='22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('team-consumption:'||auth.uid()||':'||p_key,0));
  perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
  perform private.require_team_consumption_write(p_patient);
  if public.team_consumption_result(p_patient,p_key) is not null then
    return public.team_consumption_command(p_patient,p_key,p_body);
  end if;
  if p_body->>'action'='issue' then
    confirmed_lines:=private.consumption_input(p_body->'lines');
    select array_agg(item->>'productId' order by item->>'productId') into materials from jsonb_array_elements(confirmed_lines) item;
    perform 1 from public.care_recipient_products where care_recipient_id=p_patient and product_id=any(materials) order by product_id for share;
    if p_reference is distinct from (public.team_consumption_reference(p_patient,materials)->>'referenceHash') then
      raise exception 'stock reference changed; confirm the reviewed materials again' using errcode='PT409';
    end if;
  end if;
  if p_draft_id is not null then
    select * into saved from private.consumption_preparations
      where id=p_draft_id and owner_id=auth.uid() and care_recipient_id=p_patient
        and purpose='consumption_report_team' and target_resource_id=p_patient for update;
    if not found then raise exception 'private draft unavailable' using errcode='42501'; end if;
    if saved.state<>'active' or saved.revision<>p_draft_revision then
      raise exception 'stale private draft revision' using errcode='PT409';
    end if;
    fields:=saved.content->'consumption';
    select jsonb_agg(jsonb_build_object('productId',item->>'productId','quantity',replace(item->>'quantity',',','.')::numeric)
      order by item->>'productId') into saved_lines from jsonb_array_elements(fields->'lines') item;
    if fields->>'kind' is distinct from 'consumption' or fields->>'location' is distinct from 'CARE_TEAM'
      or trim(coalesce(fields->>'text','')) is distinct from trim(coalesce(p_body->>'observation',''))
      or nullif(fields->>'reminderId','') is distinct from p_body->>'reminderId'
      or saved_lines is distinct from (select jsonb_agg(item-'unit' order by item->>'productId') from jsonb_array_elements(confirmed_lines) item) then
      raise exception 'consumption private intent mismatch' using errcode='PT409';
    end if;
  end if;
  receipt:=public.team_consumption_command(p_patient,p_key,p_body);
  if p_draft_id is not null then
    update private.consumption_preparations set state='completed',revision=revision+1,
      content=null,navigation=null,saved_at=clock_timestamp(),
      consumed_resource_id=(receipt->>'id')::uuid,consumed_result=receipt where id=p_draft_id;
    insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
      values(auth.uid(),'private_draft.consumed','consumption_preparation',p_draft_id,
        jsonb_build_object('care_recipient_id',p_patient,'resourceId',receipt->>'id'));
  end if;
  return receipt;
end;
$$;

revoke all on function public.team_consumption_reference(uuid,text[]),public.submit_team_consumption(uuid,uuid,jsonb,text,uuid,integer),
  public.team_consumption_command(uuid,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.team_consumption_reference(uuid,text[]),public.submit_team_consumption(uuid,uuid,jsonb,text,uuid,integer)
  to authenticated;
