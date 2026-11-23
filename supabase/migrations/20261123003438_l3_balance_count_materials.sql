create function private.validate_balance_count_extras(p_items jsonb,p_patient uuid default null)
returns void language plpgsql stable set search_path='' as $$
declare item jsonb;
begin
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items)>20 then
    raise exception 'invalid BAL extra items' using errcode='22023';
  end if;
  for item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(item) is distinct from 'object' or (item-array['id','name','unit','quantity'])<>'{}'
      or not(item ?& array['id','name','unit','quantity'])
      or not private.creation_draft_text(item->'id',36) or not private.creation_draft_uuid(item->'id')
      or not private.creation_draft_text(item->'name',200) or not private.creation_draft_text(item->'unit',80)
      or not private.creation_draft_text(item->'quantity',64) then
      raise exception 'invalid BAL extra items' using errcode='22023';
    end if;
    if p_patient is not null then
      if btrim(item->>'name')='' or btrim(item->>'unit')='' or btrim(item->>'name')<>item->>'name' or btrim(item->>'unit')<>item->>'unit'
        or (item->>'quantity')!~'^[0-9]+([.][0-9]{1,6})?$' or (item->>'quantity')::numeric>1000000000 then
        raise exception 'invalid BAL extra items' using errcode='22023';
      end if;
      if exists(select 1 from private.balance_catalogue_matches(p_patient,item->>'name')) then
        raise exception 'BAL extra matches patient catalogue' using errcode='22023';
      end if;
    end if;
  end loop;
  if (select count(distinct (value->>'id')::uuid) from jsonb_array_elements(p_items))<>jsonb_array_length(p_items) then
    raise exception 'duplicate BAL extra items' using errcode='22023';
  end if;
end;$$;

create function private.balance_catalogue_matches(p_patient uuid,p_name text)
returns setof text language sql stable set search_path='' as $$
  select p.product_id from public.care_recipient_products p
  where p.care_recipient_id=p_patient and p.is_active and exists(
    select 1 from unnest(array_append(p.aliases,p.name)) label
    where public.unaccent(lower(btrim(label)))=public.unaccent(lower(btrim(p_name)))
  )
$$;

-- Required scope is the previous count's still active identities. A previously
-- uncatalogued material is counted in its new category once it has a catalogue
-- identity. New catalogue products enter a recount only by explicit inclusion.
create function private.require_balance_recount_materials(p_patient uuid,p_document uuid,p_previous jsonb,p_payload jsonb)
returns void language plpgsql stable set search_path='' as $$
declare item jsonb;
begin
  if exists(
    select 1 from public.document_lines prior join public.care_recipient_products p
      on p.care_recipient_id=prior.care_recipient_id and p.product_id=prior.product_id and p.is_active
    where prior.document_id=p_document and prior.care_recipient_id=p_patient and not exists(
      select 1 from jsonb_array_elements(p_payload->'lines') line where line->>'productId'=prior.product_id
    )
  ) then raise exception 'recount requires previous materials' using errcode='22023';end if;

  for item in select value from jsonb_array_elements(coalesce(p_previous->'balanceExtras','[]')) loop
    if exists(select 1 from private.balance_catalogue_matches(p_patient,item->>'name')) then
      if not exists(select 1 from jsonb_array_elements(p_payload->'lines') line
        join private.balance_catalogue_matches(p_patient,item->>'name') matched on matched=line->>'productId') then
        raise exception 'recount requires incorporated extra' using errcode='22023';
      end if;
    elsif not exists(select 1 from jsonb_array_elements(coalesce(p_payload->'balanceExtras','[]')) extra where extra->>'id'=item->>'id') then
      raise exception 'recount requires previous extras' using errcode='22023';
    end if;
  end loop;
end;$$;

create function private.require_balance_count_extra_draft(p_saved jsonb,p_confirmed jsonb)
returns void language plpgsql stable set search_path='' as $$
declare prepared jsonb;
begin
  p_saved:=coalesce(p_saved,'[]');p_confirmed:=coalesce(p_confirmed,'[]');
  if p_saved='[]' and p_confirmed='[]' then return;end if;
  perform private.validate_balance_count_extras(p_saved);
  if exists(select 1 from jsonb_array_elements(p_saved) x where x->>'quantity'!~'^[0-9]+([.,][0-9]+)?$') then
    raise exception 'invalid BAL extra draft confirmation' using errcode='22023';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('id',x->>'id','name',btrim(x->>'name'),'unit',btrim(x->>'unit'),
    'quantity',trim_scale(replace(x->>'quantity',',','.')::numeric)::text) order by i),'[]') into prepared
    from jsonb_array_elements(p_saved) with ordinality e(x,i);
  if prepared is distinct from p_confirmed then
    raise exception 'BAL extras changed since draft review' using errcode='PT409';
  end if;
end;$$;

do $$
declare a text; ddl text;
  common text:=$body$
  if p_payload ? 'balanceExtras' then
    if p_type<>'BAL' then raise exception 'invalid document type for BAL extras' using errcode='22023';end if;
    perform private.validate_balance_count_extras(p_payload->'balanceExtras',p_patient);
  end if;
$body$;
begin
  a:='p_payload:=private.prepare_pending_purchase_extras(p_type,p_payload);';
  ddl:=pg_get_functiondef('public.v3_create_supply_document(uuid,text,jsonb,uuid,boolean)'::regprocedure);
  if strpos(ddl,a)=0 then raise exception 'BAL creation material contract drift';end if;
  execute replace(ddl,a,a||common);

  ddl:=pg_get_functiondef('public.v3_revise_supply_document(uuid,jsonb,uuid,integer,boolean)'::regprocedure);
  if strpos(ddl,a)=0 then raise exception 'BAL revision material contract drift';end if;
  ddl:=replace(ddl,a,a||common);
  a:='delete from public.document_request_links where document_line_id in(select id from public.document_lines where document_id=p_id);';
  if strpos(ddl,a)=0 then raise exception 'BAL previous material contract drift';end if;
  ddl:=replace(ddl,a,$body$
  if p_type='BAL' and p_recount and p_payload#>>'{balanceContext,kind}'='recount' then
    perform private.require_balance_recount_materials(p_patient,p_id,d.payload,p_payload);
  end if;
$body$||a);
  a:='if p_type=''BAL'' and (select count(*) from public.document_lines where document_id=p_id)';
  if strpos(ddl,a)=0 then raise exception 'BAL catalogue coverage contract drift';end if;
  execute replace(ddl,a,$body$if p_type='BAL' and not (p_recount and p_payload#>>'{balanceContext,kind}' is not distinct from 'recount') and (select count(*) from public.document_lines where document_id=p_id)$body$);

  ddl:=pg_get_functiondef('private.validate_creation_draft(text,jsonb,uuid)'::regprocedure);
  a:=$anchor$elsif p_kind='BAL' then$anchor$;
  if strpos(ddl,a)=0 then raise exception 'BAL private material contract drift';end if;
  execute replace(ddl,a,a||$body$
    if p_content ? 'balanceExtras' then
      perform private.validate_balance_count_extras(p_content->'balanceExtras');
    end if;
    if p_content ? 'materialCategory' and coalesce(p_content->>'materialCategory','') not in ('medicamentos','higiene','dieta') then
      raise exception 'invalid BAL draft material category' using errcode='22023';
    end if;
    p_content:=p_content-'balanceExtras'-'materialCategory';
  $body$);

  ddl:=pg_get_functiondef('private.creation_draft_navigation_valid(jsonb,text,text,jsonb)'::regprocedure);
  a:=$anchor$array['count','review']$anchor$;
  if strpos(ddl,a)=0 then raise exception 'BAL navigation contract drift';end if;
  ddl:=replace(ddl,a,$body$array['bal_confirmation','count','bal_extras','bal_notes','review']$body$);
  execute replace(ddl,$anchor$array['identification','medicamentos','higiene','dieta','notes','review','count']$anchor$,
    $body$array['identification','medicamentos','higiene','dieta','notes','review','bal_confirmation','count','bal_extras','bal_notes']$body$);

  ddl:=pg_get_functiondef('public.commit_creation_draft(uuid,integer,uuid,jsonb,uuid)'::regprocedure);
  a:=$anchor$if d.kind='REQ' and a='issue_req' then$anchor$;
  if strpos(ddl,a)=0 then raise exception 'BAL draft confirmation contract drift';end if;
  execute replace(ddl,a,$body$
    if d.kind='BAL' then
      perform private.require_balance_count_extra_draft(d.content->'balanceExtras',p_body#>'{payload,balanceExtras}');
    end if;
$body$||a);
end;$$;

revoke all on function private.validate_balance_count_extras(jsonb,uuid),private.balance_catalogue_matches(uuid,text),
  private.require_balance_recount_materials(uuid,uuid,jsonb,jsonb),private.require_balance_count_extra_draft(jsonb,jsonb)
  from public,anon,authenticated,service_role;
