-- Operational sources are distinct from formal complements and line fulfillment.
-- Seal a digest in the document and keep the underlying identities under
-- independent source-reading permissions.
create table private.supply_source_sets (
  care_recipient_id uuid not null references public.care_recipients(id),
  digest text not null,
  sources jsonb not null,
  primary key (care_recipient_id, digest)
);
alter table private.supply_source_sets enable row level security;
revoke all on private.supply_source_sets from public, anon, authenticated, service_role;

create function private.supply_source_candidate(
  candidate public.operational_documents, p_target text
) returns boolean language sql stable set search_path = '' as $$
  select private.can(candidate.care_recipient_id, lower(candidate.type)||'.read') and (
    candidate.type = 'REQ' and p_target in ('COM','ENT') and exists (
      select 1 from public.requisitions r
      left join public.requisition_lifecycle l on l.requisition_id = r.id
      where r.id = candidate.id and not r.is_historical
        and r.status not in ('draft','cancelled') and l.completed_at is null and l.archived_at is null
    )
    or candidate.type = 'COM' and p_target = 'ENT' and candidate.status <> 'draft'
  );
$$;

create function private.supply_source_materials(p_patient uuid, p_id uuid, p_type text)
returns jsonb language sql stable set search_path = '' as $$
  with eligible as (
    select i.id as line_id, p.product_id, null::numeric as available
    from public.requisition_items i
    join public.care_recipient_products p on p.care_recipient_id=p_patient
      and p.product_id=private.effective_requisition_product(i.id) and p.is_active
    where p_type='REQ' and i.requisition_id=p_id and i.care_recipient_id=p_patient
      and private.requisition_item_service(i.id)<>'fulfilled'
    union all
    select l.id, p.product_id,
      least(l.accepted_quantity, private.stock_quantity(p_patient,p.product_id,'FAMILY'))
    from public.document_lines l
    join public.care_recipient_products p on p.care_recipient_id=p_patient
      and p.product_id=l.product_id and p.is_active and p.unit=l.unit_snapshot
    where p_type='COM' and l.document_id=p_id and l.care_recipient_id=p_patient
      and l.accepted_quantity>0 and private.can(p_patient,'stock.family.read')
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'lineId',line_id,'productId',product_id,'available',trim_scale(available)::text
  ) order by product_id,line_id),'[]'::jsonb)
  from eligible where available is null or available>0;
$$;

create function public.supply_source_options(
  p_patient uuid, p_target text, p_filter text, p_search text, p_page integer,
  p_ids uuid[] default null, p_product text default null
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if p_target is null or p_target not in ('COM','ENT')
    or p_filter is null or p_filter not in ('','REQ','COM','ENT','BAL','DEV')
    or p_page is null or p_page not between 1 and 100000
    or coalesce(p_search,'') !~ '^[a-zA-Z0-9-]{0,100}$' or cardinality(p_ids)>100 then
    raise exception 'invalid operational source filter' using errcode='22023';
  end if;
  perform private.require_cap(p_patient,lower(p_target)||'.create');
  return (with candidates as (
    select d.id,d.type,coalesce(d.code,d.protocol) as code,d.status,d.created_at,
      private.supply_source_materials(p_patient,d.id,d.type) as materials
    from public.operational_documents d
    where d.care_recipient_id=p_patient and d.type in ('REQ','COM')
      and (p_filter='' or p_filter=d.type) and (p_ids is null or d.id=any(p_ids))
      and (coalesce(p_search,'')='' or d.code ilike '%'||p_search||'%' or d.protocol ilike '%'||p_search||'%')
      and private.supply_source_candidate(d,p_target)
  ), matching as (
    select * from candidates
    where p_product is null or materials @> jsonb_build_array(jsonb_build_object('productId',p_product))
  ), snapshot as (
    select * from matching order by created_at desc,id desc
    offset case when p_ids is null then (p_page-1)*20 else 0 end
    limit case when p_ids is null then 20 else 100 end
  )
  select jsonb_build_object('patientId',p_patient,'target',p_target,'page',p_page,
    'total',(select count(*) from matching),'data',coalesce((
      select jsonb_agg(jsonb_build_object('id',id,'type',type,'code',code,'status',status,
        'createdAt',created_at,'materials',materials) order by created_at desc,id desc)
      from snapshot
    ),'[]'::jsonb)));
end;
$$;
revoke all on function public.supply_source_options(uuid,text,text,text,integer,uuid[],text)
  from public, anon, authenticated, service_role;
grant execute on function public.supply_source_options(uuid,text,text,text,integer,uuid[],text) to authenticated;

create function private.validate_supply_source_links(p_sources jsonb)
returns void language plpgsql immutable set search_path = '' as $$
declare source_link jsonb;
begin
  if jsonb_typeof(p_sources) is distinct from 'array' or jsonb_array_length(p_sources)>100 then
    raise exception 'invalid supply sources' using errcode='22023';
  end if;
  if (select count(distinct value->>'documentId') from jsonb_array_elements(p_sources))
    <> jsonb_array_length(p_sources) then
    raise exception 'duplicate or missing supply source' using errcode='22023';
  end if;
  for source_link in select value from jsonb_array_elements(p_sources) loop
    if jsonb_typeof(source_link) is distinct from 'object'
      or (source_link-array['documentId','general','productIds'])<>'{}'::jsonb
      or jsonb_typeof(source_link->'documentId') is distinct from 'string'
      or source_link->>'documentId' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      or jsonb_typeof(source_link->'general') is distinct from 'boolean'
      or jsonb_typeof(source_link->'productIds') is distinct from 'array'
      or jsonb_array_length(source_link->'productIds')>1000
      or (source_link->>'general'='false' and source_link->'productIds'='[]'::jsonb)
      or exists (
        select 1 from jsonb_array_elements(source_link->'productIds') item
        where jsonb_typeof(item)<>'string' or length(item#>>'{}') not between 1 and 120
      ) or (select count(distinct value) from jsonb_array_elements(source_link->'productIds'))
        <> jsonb_array_length(source_link->'productIds') then
      raise exception 'invalid supply source link' using errcode='22023';
    end if;
  end loop;
end;
$$;

create function private.supply_source_payload(p_payload jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
begin
  if p_payload ? 'sourceSet' then
    raise exception 'reserved supply source field' using errcode='22023';
  end if;
  if not (p_payload ? 'sources') then return p_payload; end if;
  perform private.validate_supply_source_links(p_payload->'sources');
  if p_payload->'sources'='[]'::jsonb then return p_payload-'sources'; end if;
  return (p_payload-'sources') || jsonb_build_object(
    'sourceSet',encode(extensions.digest((p_payload->'sources')::text,'sha256'),'hex'));
end;
$$;

create function private.require_supply_sources(
  p_patient uuid,p_type text,p_payload jsonb,p_sources jsonb
) returns void language plpgsql set search_path = '' as $$
declare
  source_link jsonb;
  source public.operational_documents;
  eligible jsonb;
  material text;
begin
  if p_sources is null or p_sources='[]'::jsonb then return; end if;
  if p_type not in ('COM','ENT') or p_type='ENT' and p_payload->>'source' is distinct from 'FAMILY' then
    raise exception 'operational source not allowed for this kind' using errcode='22023';
  end if;
  for source_link in select value from jsonb_array_elements(p_sources) loop
    select * into source from public.operational_documents
      where id=(source_link->>'documentId')::uuid and care_recipient_id=p_patient;
    if not found or not coalesce(private.supply_source_candidate(source,p_type),false) then
      raise exception 'operational source unavailable' using errcode='42501';
    end if;
    if source_link->'productIds'='[]'::jsonb then continue; end if;
    eligible:=private.supply_source_materials(p_patient,source.id,source.type);
    for material in select value from jsonb_array_elements_text(source_link->'productIds') loop
      if not exists (
        select 1 from jsonb_array_elements(p_payload->'lines') line
        join jsonb_array_elements(eligible) item on item->>'productId'=material
        where line->>'productId'=material and (
          source.type='COM' or (line->'requisitionItemIds') ? (item->>'lineId')
        )
      ) then
        raise exception 'operational source material changed' using errcode='PT409';
      end if;
    end loop;
  end loop;
  insert into private.supply_source_sets(care_recipient_id,digest,sources)
    values(p_patient,p_payload->>'sourceSet',p_sources) on conflict do nothing;
end;
$$;

create function private.visible_supply_sources(p_patient uuid,p_digest text)
returns jsonb language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(
    entry || jsonb_build_object('type',d.type,'code',coalesce(d.code,d.protocol))
    order by d.created_at desc,d.id desc
  ),'[]'::jsonb)
  from private.supply_source_sets s
  cross join lateral jsonb_array_elements(s.sources) entry
  join public.operational_documents d on d.id=(entry->>'documentId')::uuid
    and d.care_recipient_id=s.care_recipient_id
  where s.care_recipient_id=p_patient and s.digest=p_digest
    and private.can(p_patient,lower(d.type)||'.read');
$$;

revoke all on function private.supply_source_candidate(public.operational_documents,text),
  private.supply_source_materials(uuid,uuid,text),private.validate_supply_source_links(jsonb),
  private.supply_source_payload(jsonb),private.require_supply_sources(uuid,text,jsonb,jsonb),
  private.visible_supply_sources(uuid,text) from public,anon,authenticated,service_role;

do $migration$
declare
  creation text := pg_get_functiondef('public.v3_create_supply_document(uuid,text,jsonb,uuid,boolean)'::regprocedure);
  revision text := pg_get_functiondef('public.v3_revise_supply_document(uuid,jsonb,uuid,integer,boolean)'::regprocedure);
  view_doc text := pg_get_functiondef('public.operational_document(uuid)'::regprocedure);
  draft text := pg_get_functiondef('private.validate_supply_draft(jsonb,text,uuid)'::regprocedure);
  draft_commit text := pg_get_functiondef('public.commit_supply_draft(uuid,integer,uuid,jsonb,uuid)'::regprocedure);
  submit text := pg_get_functiondef('public.audited_legacy_supply_command(uuid,text,jsonb,uuid,integer)'::regprocedure);
  create_read constant text := ' select * into d from public.operational_documents where created_by=auth.uid() and idempotency_key=p_key;';
  revise_read constant text := ' select * into e from public.document_events where actor_id=auth.uid() and idempotency_key=p_key;';
  create_write constant text := ' insert into public.patient_settings(care_recipient_id) values(p_patient) on conflict do nothing;';
  revise_write constant text := ' delete from public.document_request_links where document_line_id in(select id from public.document_lines where document_id=p_id);';
  view_return constant text := ' return to_jsonb(d)||';
  draft_keys constant text := $old$(p_content-array['form','links','materials','context'])$old$;
  draft_start constant text := $old$  f:=p_content->'form';c:=p_content->'context';$old$;
  context_keys constant text := $old$(c-array['documentId','documentVersion','requisitionId','recipientName'])<>'{}'::jsonb$old$;
  commit_create constant text := $old$  outcome:=public.create_supply_document(d.care_recipient_id,d.kind,p_body->'payload',p_key,false);$old$;
  commit_revise constant text := $old$  outcome:=public.revise_and_submit_supply_document(p_target,p_body->'payload',p_key,$old$;
  emit constant text := ' perform private.emit_document(p_id);';
  check_draft constant text := $new$  if coalesce(p_body#>'{payload,sources}','[]'::jsonb)
    is distinct from coalesce(d.content->'sources','[]'::jsonb) then
    raise exception 'supply origins differ from draft' using errcode='22023';
  end if;$new$;
  normalize constant text := ' p_payload:=private.supply_source_payload(p_payload);';
  validate_sources constant text := ' perform private.require_supply_sources(p_patient,p_type,p_payload,v_sources);';
begin
  if strpos(creation,create_read)=0 or strpos(creation,create_write)=0
    or strpos(revision,revise_read)=0 or strpos(revision,revise_write)=0
    or strpos(view_doc,view_return)=0 or strpos(draft,draft_keys)=0 or strpos(draft,draft_start)=0
    or strpos(draft,context_keys)=0 or strpos(draft_commit,commit_create)=0
    or strpos(draft_commit,commit_revise)=0 or strpos(submit,emit)=0 then
    raise exception 'Unexpected supply source entry points';
  end if;
  creation:=replace(creation,'declare d public.operational_documents;',
    'declare v_sources jsonb:=p_payload->''sources''; d public.operational_documents;');
  revision:=replace(revision,'declare d public.operational_documents;',
    'declare v_sources jsonb:=p_payload->''sources''; d public.operational_documents;');
  execute replace(replace(creation,create_read,normalize||E'\n'||create_read),create_write,validate_sources||E'\n'||create_write);
  execute replace(replace(revision,revise_read,normalize||E'\n'||revise_read),revise_write,validate_sources||E'\n'||revise_write);
  execute replace(view_doc,view_return,
    $new$ return to_jsonb(d)||case when d.payload ? 'sourceSet' then jsonb_build_object(
      'originDocuments',private.visible_supply_sources(d.care_recipient_id,d.payload->>'sourceSet')) else '{}'::jsonb end||$new$);
  execute replace(replace(draft_commit,commit_create,check_draft||E'\n'||commit_create),
    commit_revise,check_draft||E'\n'||commit_revise);
  execute replace(submit,emit,$new$ if d.payload ? 'sourceSet' then
   perform private.require_supply_sources(d.care_recipient_id,d.type,d.payload,(
     select sources from private.supply_source_sets
     where care_recipient_id=d.care_recipient_id and digest=d.payload->>'sourceSet'));
 end if;
$new$||emit);
  draft:=replace(draft,draft_keys,$new$(p_content-array['form','links','materials','context','sources','sourceImports','sourceSeeds'])$new$);
  draft:=replace(draft,context_keys,$new$(c-array['documentId','documentVersion','requisitionId','recipientName','purchaseId'])
    <>'{}'::jsonb or (c ? 'purchaseId' and not private.creation_draft_uuid(c->'purchaseId'))$new$);
  execute replace(draft,draft_start,draft_start||E'\n'||
    $new$  if p_content ? 'sources' then perform private.validate_supply_source_links(p_content->'sources'); end if;
  if p_content ? 'sourceImports' and (jsonb_typeof(p_content->'sourceImports') is distinct from 'object'
    or (select count(*) from jsonb_object_keys(p_content->'sourceImports'))>100
    or exists (select 1 from jsonb_each(p_content->'sourceImports') link
      where not private.creation_draft_uuid(to_jsonb(link.key)) or jsonb_typeof(link.value) is distinct from 'array'
        or jsonb_array_length(link.value)>1000
        or exists (select 1 from jsonb_array_elements(link.value) product where not private.creation_draft_text(product,120)))) then
    raise exception 'invalid imported draft sources' using errcode='22023';
  end if;
  if p_content ? 'sourceSeeds' and (jsonb_typeof(p_content->'sourceSeeds') is distinct from 'object'
    or (select count(*) from jsonb_object_keys(p_content->'sourceSeeds'))>1000
    or exists (select 1 from jsonb_each(p_content->'sourceSeeds') seed
      where length(seed.key) not between 1 and 120 or not private.creation_draft_text(seed.value,64))) then
    raise exception 'invalid imported draft quantities' using errcode='22023';
  end if;$new$);
end;
$migration$;
