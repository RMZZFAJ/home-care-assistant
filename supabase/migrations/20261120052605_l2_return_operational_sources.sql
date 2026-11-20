-- Return origins describe the receipt and its materials. The dispatch still
-- debits the existing team custody ledger under the transfer's stock lock.
do $migration$
declare definition text; anchor text;
begin
  definition := pg_get_functiondef('private.supply_source_candidate(public.operational_documents,text)'::regprocedure);
  anchor := $old$candidate.type = 'COM' and p_target = 'ENT' and candidate.status <> 'draft'$old$;
  if strpos(definition,anchor)=0 then raise exception 'source candidate anchor missing'; end if;
  execute replace(definition,anchor,anchor || $new$
    or p_target='DEV' and candidate.type='ENT' and candidate.code like 'ENT-%'
      and candidate.status not in ('cancelled','draft')
      and candidate.payload->>'destination'='CARE_TEAM' and exists (
        select 1 from public.document_lines line
        where line.document_id=candidate.id and line.care_recipient_id=candidate.care_recipient_id
          and line.accepted_quantity>0
      )$new$);

  definition := pg_get_functiondef('private.supply_source_materials(uuid,uuid,text)'::regprocedure);
  anchor := $old$and private.can(p_patient,'stock.family.read')$old$;
  if strpos(definition,anchor)=0 then raise exception 'source material anchor missing'; end if;
  execute replace(definition,anchor,anchor || $new$
    union all
    select l.id,p.product_id,
      trunc(least(l.accepted_quantity, private.stock_quantity(p_patient,p.product_id,'CARE_TEAM')),p.quantity_decimals)
    from public.document_lines l
    join public.care_recipient_products p on p.care_recipient_id=p_patient
      and p.product_id=l.product_id and p.unit=l.unit_snapshot
    where p_type='ENT' and l.document_id=p_id and l.care_recipient_id=p_patient
      and l.accepted_quantity>0 and private.can(p_patient,'stock.team.read')$new$);

  definition := pg_get_functiondef('public.supply_source_options(uuid,text,text,text,integer,uuid[],text)'::regprocedure);
  anchor := $old$p_target not in ('COM','ENT')$old$;
  if strpos(definition,anchor)=0 then raise exception 'source option target anchor missing'; end if;
  definition := replace(definition,anchor,$new$p_target not in ('COM','ENT','DEV')$new$);
  anchor := $old$  perform private.require_cap(p_patient,lower(p_target)||'.create');$old$;
  if strpos(definition,anchor)=0 then raise exception 'source option authority anchor missing'; end if;
  definition := replace(definition,anchor,$new$  if p_target='DEV' then
    perform private.require_cap(p_patient,'ent.create');
    perform private.require_cap(p_patient,'ent.read');
    perform private.require_cap(p_patient,'stock.team.read');
  else
$new$ || anchor || E'\n  end if;');
  anchor := $old$d.type in ('REQ','COM')$old$;
  if strpos(definition,anchor)=0 then raise exception 'source option kind anchor missing'; end if;
  execute replace(definition,anchor,$new$
    ((p_target='DEV' and d.type='ENT') or (p_target<>'DEV' and d.type in ('REQ','COM')))$new$);

  definition := pg_get_functiondef('private.require_supply_sources(uuid,text,jsonb,jsonb)'::regprocedure);
  anchor := $old$p_type not in ('COM','ENT') or p_type='ENT' and p_payload->>'source' is distinct from 'FAMILY'$old$;
  if strpos(definition,anchor)=0 then raise exception 'source validation kind anchor missing'; end if;
  definition := replace(definition,anchor,$new$p_type not in ('COM','ENT','DEV')
    or (p_type='ENT' and p_payload->>'source' is distinct from 'FAMILY')
    or (p_type='DEV' and p_payload->>'source' is distinct from 'CARE_TEAM')$new$);
  anchor := $old$source.type='COM' or (line->'requisitionItemIds') ? (item->>'lineId')$old$;
  if strpos(definition,anchor)=0 then raise exception 'source validation line anchor missing'; end if;
  execute replace(definition,anchor,$new$source.type in ('COM','ENT')
          or (line->'requisitionItemIds') ? (item->>'lineId')$new$);

  definition := pg_get_functiondef('public.create_transfer_declaration(uuid,jsonb,uuid)'::regprocedure);
  anchor := $old$'reason','lines','mode','observations'))$old$;
  if strpos(definition,anchor)=0 then raise exception 'return declaration fields anchor missing'; end if;
  definition := replace(definition,anchor,$new$'reason','lines','mode','observations','sources'))$new$);
  anchor := $old$ v_source:=p_body->>'source';$old$;
  if strpos(definition,anchor)=0 then raise exception 'return declaration context anchor missing'; end if;
  definition := replace(definition,anchor,$new$
 if p_body ? 'sources' and (
   not direct or p_body->>'source' is distinct from 'CARE_TEAM'
   or p_body->>'originDocumentId' is not null
 ) then raise exception 'invalid return source scope' using errcode='22023'; end if;
$new$ || anchor);
  anchor := $old$p_key,jsonb_build_object('source',v_source,'destination'$old$;
  if strpos(definition,anchor)=0 then raise exception 'return payload start anchor missing'; end if;
  definition := replace(definition,anchor,$new$p_key,private.supply_source_payload(jsonb_build_object('source',v_source,'destination'$new$);
  anchor := $old$else '{}'::jsonb end,
   case when direct then 'draft' else 'transfer_pending' end) returning * into d;$old$;
  if strpos(definition,anchor)=0 then raise exception 'return payload end anchor missing'; end if;
  execute replace(definition,anchor,$new$else '{}'::jsonb end ||
   case when p_body ? 'sources' then jsonb_build_object('sources',p_body->'sources') else '{}'::jsonb end),
   case when direct then 'draft' else 'transfer_pending' end) returning * into d;
 perform private.require_supply_sources(p_patient,'DEV',d.payload,p_body->'sources');$new$);

  definition := pg_get_functiondef('private.validate_supply_draft(jsonb,text,uuid)'::regprocedure);
  anchor := $old$  if (p_content-array['documentVersion','fields','divergentIds','materials','observations','pendingExtras'])$old$;
  if strpos(definition,anchor)=0 then raise exception 'return draft fields anchor missing'; end if;
  execute replace(definition,anchor,$new$
  if p_content ?| array['sources','sourceImports','sourceSeeds'] then
    if p_purpose <> 'transfer_declare_team' then
      raise exception 'invalid return source preparation' using errcode='22023';
    end if;
    if p_content ? 'sources' then perform private.validate_supply_source_links(p_content->'sources'); end if;
    if p_content ? 'sourceImports' and (jsonb_typeof(p_content->'sourceImports') is distinct from 'object'
      or (select count(*) from jsonb_object_keys(p_content->'sourceImports'))>100
      or exists (select 1 from jsonb_each(p_content->'sourceImports') link
        where not private.creation_draft_uuid(to_jsonb(link.key)) or jsonb_typeof(link.value) is distinct from 'array'
          or jsonb_array_length(link.value)>1000
          or exists (select 1 from jsonb_array_elements(link.value) product where not private.creation_draft_text(product,120)))) then
      raise exception 'invalid return imports' using errcode='22023';
    end if;
    if p_content ? 'sourceSeeds' and (jsonb_typeof(p_content->'sourceSeeds') is distinct from 'object'
      or (select count(*) from jsonb_object_keys(p_content->'sourceSeeds'))>1000
      or exists (select 1 from jsonb_each(p_content->'sourceSeeds') seed
        where length(seed.key) not between 1 and 120 or not private.creation_draft_text(seed.value,64))) then
      raise exception 'invalid return import quantities' using errcode='22023';
    end if;
  end if;
  if (p_content-array['documentVersion','fields','divergentIds','materials','observations','pendingExtras','sources','sourceImports','sourceSeeds'])$new$);

  definition := pg_get_functiondef('public.commit_supply_draft(uuid,integer,uuid,jsonb,uuid)'::regprocedure);
  anchor := $old$  outcome:=public.create_transfer_declaration(d.care_recipient_id,$old$;
  if strpos(definition,anchor)=0 then raise exception 'return draft commit anchor missing'; end if;
  execute replace(definition,anchor,$new$  if coalesce(d.content->'sources','[]'::jsonb)
    is distinct from coalesce(p_body#>'{body,sources}','[]'::jsonb) then
    raise exception 'return sources differ from confirmed preparation' using errcode='22023';
  end if;
$new$ || anchor);
end
$migration$;

do $submit$
declare
  definition text := pg_get_functiondef('public.audited_legacy_supply_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
  anchor constant text := 'private.require_supply_sources(d.care_recipient_id,d.type,d.payload,';
begin
  if strpos(definition,anchor)=0 then raise exception 'dispatch source validation anchor missing'; end if;
  execute replace(definition,anchor,$new$private.require_supply_sources(d.care_recipient_id,
    case when d.type='ENT' and d.payload->>'source'='CARE_TEAM' then 'DEV' else d.type end,d.payload,$new$);
end
$submit$;
