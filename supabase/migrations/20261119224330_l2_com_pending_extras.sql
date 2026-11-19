-- Keep unresolved purchase materials in the confirmed original intent.
-- Only identified catalogue lines participate in purchases and stock.
create function private.normalized_pending_purchase_extras(p_items jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
declare item jsonb; identity jsonb; result jsonb := '[]'::jsonb; item_id uuid; item_name text; amount numeric;
begin
  if p_items is null then return '[]'::jsonb; end if;
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'invalid pending purchase extras' using errcode='22023'; end if;
  if jsonb_array_length(p_items) > 20 then raise exception 'too many pending purchase extras' using errcode='22023'; end if;
  for item in select value from jsonb_array_elements(p_items)
  loop
    if jsonb_typeof(item) is distinct from 'object'
      or jsonb_typeof(item->'id') is distinct from 'string'
      or coalesce(item->>'id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or jsonb_typeof(item->'name') is distinct from 'string'
      or coalesce(private.bal_comment_units(trim(item->>'name')),0) not between 1 and 200
      or coalesce(item->>'quantity','') !~ '^[0-9]{1,10}(\.[0-9]{1,6})?$'
    then raise exception 'invalid pending purchase extra' using errcode='22023'; end if;
    item_id := (item->>'id')::uuid;
    item_name := trim(item->>'name');
    amount := (item->>'quantity')::numeric;
    if amount <= 0 or amount > 1000000000 then raise exception 'invalid pending purchase extra quantity' using errcode='22023'; end if;
    if result @> jsonb_build_array(jsonb_build_object('id',item_id)) then raise exception 'duplicate pending purchase extra' using errcode='22023'; end if;
    identity := private.validate_req_extra_identification(item-array['id','name','quantity']);
    result := result || jsonb_build_array(identity || jsonb_build_object('id',item_id,'name',item_name,'quantity',trim_scale(amount)::text));
  end loop;
  return result;
end;
$$;

create function private.prepare_pending_purchase_extras(p_kind text,p_payload jsonb)
returns jsonb language plpgsql immutable set search_path='' as $$
declare items jsonb;
begin
  if not (p_payload ? 'pendingExtras') then return p_payload; end if;
  if p_kind <> 'COM' then raise exception 'pending extras require purchase plan' using errcode='22023'; end if;
  items := private.normalized_pending_purchase_extras(p_payload->'pendingExtras');
  return case when items='[]'::jsonb then p_payload-'pendingExtras' else jsonb_set(p_payload,'{pendingExtras}',items) end;
end;
$$;

create function private.require_pending_purchase_catalogue(p_patient uuid,p_items jsonb)
returns void language plpgsql stable set search_path='' as $$
begin
  if exists(
    select 1 from jsonb_array_elements(p_items) extra
    join public.care_recipient_products product on product.care_recipient_id=p_patient and product.is_active
    cross join lateral unnest(array_append(product.aliases,product.name)) label
    where public.unaccent(lower(trim(label)))=public.unaccent(lower(extra->>'name'))
  ) then raise exception 'pending purchase extra matches patient catalogue' using errcode='22023'; end if;
end;
$$;

create function private.pending_com_extras(p_payload jsonb,p_workflow jsonb)
returns jsonb language sql immutable set search_path='' as $$
  select coalesce(jsonb_agg(item order by position),'[]'::jsonb)
  from jsonb_array_elements(case when jsonb_typeof(p_payload->'pendingExtras')='array'
    then p_payload->'pendingExtras' else '[]'::jsonb end) with ordinality extra(item,position)
  where not (coalesce(p_workflow->'purchaseExtraResolutions','{}'::jsonb) ? (item->>'id'));
$$;

revoke all on function private.normalized_pending_purchase_extras(jsonb),
  private.prepare_pending_purchase_extras(text,jsonb), private.require_pending_purchase_catalogue(uuid,jsonb),
  private.pending_com_extras(jsonb,jsonb)
from public,anon,authenticated;

create function private.resolve_purchase_extra(p_id uuid,p_body jsonb,p_key uuid,p_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  document public.operational_documents;
  previous public.document_events;
  product public.care_recipient_products;
  extra jsonb;
  material_id uuid;
  amount numeric;
begin
  select * into document from public.operational_documents where id=p_id and type='COM';
  if not found then raise exception 'purchase unavailable' using errcode='42501'; end if;
  perform private.require_cap(document.care_recipient_id,'com.read');
  if p_key is null or jsonb_typeof(p_body) is distinct from 'object'
    or (p_body-array['extraId','productId'])<>'{}'::jsonb
    or jsonb_typeof(p_body->'extraId') is distinct from 'string'
    or jsonb_typeof(p_body->'productId') is distinct from 'string'
    or length(p_body->>'productId') not between 1 and 120
   then raise exception 'invalid purchase identification' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('stock:'||document.care_recipient_id,0));
  perform pg_advisory_xact_lock(hashtextextended('document:'||auth.uid()||':'||p_key,0));
  select * into document from public.operational_documents where id=p_id for update;
  if not found then raise exception 'purchase unavailable' using errcode='42501'; end if;
  perform private.require_cap(document.care_recipient_id,'com.read');
  select * into previous from public.document_events where actor_id=auth.uid() and idempotency_key=p_key;
  if found then
    if previous.document_id<>p_id or previous.action<>'com.extra_identified'
      or previous.body->'event' is distinct from p_body then
      raise exception 'idempotency conflict' using errcode='23505';
    end if;
    return public.operational_document(p_id);
  end if;
  perform private.require_cap(document.care_recipient_id,'com.approve');
  perform private.require_cap(document.care_recipient_id,'catalog.manage');
  if document.version is distinct from p_version or document.status not in ('pending_approval','approved') then
    raise exception 'purchase identification version changed' using errcode='PT409';
  end if;
  select item into extra from jsonb_array_elements(private.pending_com_extras(document.payload,document.workflow_data)) item
  where item->>'id'=p_body->>'extraId';
  if not found then raise exception 'purchase extra unavailable' using errcode='PT409'; end if;
  select * into product from public.care_recipient_products
  where care_recipient_id=document.care_recipient_id and product_id=p_body->>'productId' and is_active for share;
  if not found then raise exception 'purchase catalogue product unavailable' using errcode='22023'; end if;
  amount := (extra->>'quantity')::numeric;
  if public.unaccent(lower(trim(product.unit))) <> public.unaccent(lower(extra->>'unit'))
    or amount <> round(amount,product.quantity_decimals) then
    raise exception 'purchase extra needs a catalogue product with the stated unit and precision' using errcode='22023';
  end if;
  if exists(select 1 from public.document_lines where document_id=p_id and product_id=product.product_id) then
    raise exception 'catalogue product already exists in purchase plan' using errcode='PT409';
  end if;
  insert into public.document_lines(document_id,care_recipient_id,product_id,name_snapshot,unit_snapshot,category_snapshot,quantity,approved_quantity,metadata)
  values(p_id,document.care_recipient_id,product.product_id,product.name,product.unit,product.category::text,
    amount,case when document.status='approved' then amount else 0 end,
    jsonb_build_object('catalogueExtra','true','pendingExtraId',extra->>'id'))
  returning id into material_id;
  update public.operational_documents
  set workflow_data=jsonb_set(workflow_data,'{purchaseExtraResolutions}',coalesce(workflow_data->'purchaseExtraResolutions','{}'::jsonb)
    || jsonb_build_object(extra->>'id',jsonb_build_object('lineId',material_id,'productId',product.product_id))),
    version=version+1
  where id=p_id;
  perform private.record_document_event(p_id,'com.extra_identified',p_body,p_key);
  perform private.require_cap(document.care_recipient_id,'com.approve');
  perform private.require_cap(document.care_recipient_id,'catalog.manage');
  return public.operational_document(p_id);
end;
$$;

revoke all on function private.resolve_purchase_extra(uuid,jsonb,uuid,integer) from public,anon,authenticated;

do $migration$
declare definition text; anchor text; signature text;
begin
  foreach signature in array array[
    'public.v3_create_supply_document(uuid,text,jsonb,uuid,boolean)',
    'public.v3_revise_supply_document(uuid,jsonb,uuid,integer,boolean)'
  ] loop
    definition := pg_get_functiondef(signature::regprocedure);
    anchor := $old$ p_payload:=private.supply_source_payload(p_payload);$old$;
    if strpos(definition,anchor)=0 then raise exception 'pending purchase extra normalization anchor missing'; end if;
    definition := replace(definition,anchor,anchor || $new$
 p_payload:=private.prepare_pending_purchase_extras(p_type,p_payload);$new$);
    anchor := $old$jsonb_array_length(p_payload->'lines') not between 1 and 1000$old$;
    if strpos(definition,anchor)=0 then raise exception 'pending purchase extra line count anchor missing'; end if;
    definition := replace(definition,anchor,$new$(jsonb_array_length(p_payload->'lines') > 1000
   or (jsonb_array_length(p_payload->'lines')=0 and not (p_payload ? 'pendingExtras')))$new$);
    anchor := $old$ perform private.require_supply_sources(p_patient,p_type,p_payload,v_sources);$old$;
    if strpos(definition,anchor)=0 then raise exception 'pending purchase catalogue anchor missing'; end if;
    execute replace(definition,anchor,anchor || $new$
 if p_payload ? 'pendingExtras' then perform private.require_pending_purchase_catalogue(p_patient,p_payload->'pendingExtras'); end if;$new$);
  end loop;

  definition := pg_get_functiondef('private.validate_supply_draft(jsonb,text,uuid)'::regprocedure);
  anchor := $old$'extraProductIds','observations'])$old$;
  if strpos(definition,anchor)=0 then raise exception 'pending purchase extra draft fields anchor missing'; end if;
  definition := replace(definition,anchor,$new$'extraProductIds','observations','pendingExtras'])$new$);
  anchor := $old$  if f ? 'extraProductIds' then$old$;
  if strpos(definition,anchor)=0 then raise exception 'pending purchase extra draft validation anchor missing'; end if;
  execute replace(definition,anchor,$new$
  if f ? 'pendingExtras' then perform private.normalized_pending_purchase_extras(f->'pendingExtras'); end if;
$new$ || anchor);

  definition := pg_get_functiondef('public.commit_supply_draft(uuid,integer,uuid,jsonb,uuid)'::regprocedure);
  anchor := $old$  perform private.require_supply_catalogue_extras(d.content,p_body->'payload');$old$;
  if strpos(definition,anchor)=0 then raise exception 'pending purchase extra draft commit anchor missing'; end if;
  execute replace(definition,anchor,anchor || $new$
  if (d.kind<>'COM' and (d.content#>'{form,pendingExtras}' is not null or p_body#>'{payload,pendingExtras}' is not null))
    or private.normalized_pending_purchase_extras(d.content#>'{form,pendingExtras}')
      is distinct from private.normalized_pending_purchase_extras(p_body#>'{payload,pendingExtras}')
   then raise exception 'pending purchase extras differ from the reviewed draft' using errcode='22023'; end if;
$new$);

  definition := pg_get_functiondef('private.purchase_progress(uuid)'::regprocedure);
  anchor := $old$'expectationPending',f.expectation_pending,$old$;
  if strpos(definition,anchor)=0 then raise exception 'pending purchase extra progress anchor missing'; end if;
  execute replace(definition,anchor,$new$
    'identificationPending',private.pending_com_extras(d.payload,d.workflow_data)<>'[]'::jsonb,
    'expectationPending',f.expectation_pending or private.pending_com_extras(d.payload,d.workflow_data)<>'[]'::jsonb,$new$);

  definition := pg_get_functiondef('public.supply_document_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
  anchor := $old$  if p_action = 'purchase' then$old$;
  if strpos(definition,anchor)=0 then raise exception 'pending purchase extra command anchor missing'; end if;
  execute replace(definition,anchor,$new$
  if p_action='resolve_purchase_extra' then return private.resolve_purchase_extra(p_id,p_body,p_key,p_version); end if;
  if p_action in ('approve','purchase','close_expectation') and exists(
    select 1 from public.operational_documents d where d.id=p_id and d.type='COM'
      and private.can(d.care_recipient_id,'com.read')
      and private.pending_com_extras(d.payload,d.workflow_data)<>'[]'::jsonb
  ) then raise exception 'pending purchase material identification' using errcode='PT409'; end if;
$new$ || anchor);
end;
$migration$;
