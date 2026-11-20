-- REQ and BAL material references are documentary records, independent of
-- operational supply sources and of stock, fulfillment, and approval commands.
create table private.material_document_reference_sets (
  document_id uuid not null references public.operational_documents(id),
  document_version integer not null check (document_version > 0),
  recorded_by uuid not null,
  recorded_at timestamptz not null default clock_timestamp(),
  links jsonb not null,
  primary key (document_id, document_version)
);
alter table private.material_document_reference_sets enable row level security;
revoke all on private.material_document_reference_sets from public, anon, authenticated, service_role;

create function private.validate_material_reference_shape(p_links jsonb)
returns void language plpgsql immutable set search_path='' as $$
begin
  if jsonb_typeof(p_links) is distinct from 'array' or jsonb_array_length(p_links)>100 then
    raise exception 'invalid material references' using errcode='22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(p_links) l
    where jsonb_typeof(l) is distinct from 'object'
      or (l-array['productId','documentId'])<>'{}'::jsonb
      or jsonb_typeof(l->'productId') is distinct from 'string'
      or length(l->>'productId') not between 1 and 120
      or private.creation_draft_uuid(l->'documentId') is not true
      or l->>'documentId'<>lower(l->>'documentId')
  ) or (select count(distinct l) from jsonb_array_elements(p_links) l) <> jsonb_array_length(p_links) then
    raise exception 'invalid material reference' using errcode='22023';
  end if;
end;
$$;

create function private.visible_material_reference(
  candidate public.operational_documents
) returns boolean language sql stable set search_path='' as $$
  select candidate.status<>'draft' and coalesce(candidate.code,candidate.protocol) is not null
    and private.can(candidate.care_recipient_id,lower(candidate.type::text)||'.read');
$$;

create function public.material_reference_options(
  p_patient uuid, p_target text, p_product text, p_filter text, p_search text,
  p_page integer, p_ids uuid[] default null
) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
  if p_target is null or p_target not in ('REQ','BAL')
    or p_product is null or length(p_product) not between 1 and 120
    or p_filter is null or p_filter not in ('','REQ','ENT','COM','BAL','DEV')
    or p_page is null or p_page not between 1 and 100000
    or coalesce(p_search,'') !~ '^[A-Za-z0-9-]{0,100}$' or cardinality(p_ids)>100 then
    raise exception 'invalid material reference filters' using errcode='22023';
  end if;
  perform private.require_cap(p_patient, case p_target when 'REQ' then 'req.create' else 'bal.count' end);
  return (with matching as (
    select d.id,d.type,d.kind,coalesce(d.code,d.protocol) as code,d.status,d.created_at
    from public.operational_documents d
    where d.care_recipient_id=p_patient and private.visible_material_reference(d)
      and (p_filter='' or p_filter=d.kind) and (p_ids is null or d.id=any(p_ids))
      and (coalesce(p_search,'')='' or coalesce(d.code,d.protocol) ilike '%'||p_search||'%')
      and exists (select 1 from private.document_material_lines(d.id,d.type::text) l where l.product_id=p_product)
  ), candidates as (
    select * from matching order by created_at desc,id desc
    offset case when p_ids is null then (p_page-1)*20 else 0 end
    limit case when p_ids is null then 20 else 100 end
  )
  select jsonb_build_object('patientId',p_patient,'target',p_target,'page',p_page,
    'total',(select count(*) from matching),
    'data',coalesce((select jsonb_agg(jsonb_build_object('id',id,'type',type,'kind',kind,
      'code',code,'status',status,'createdAt',created_at,'materials','[]'::jsonb)
      order by created_at desc,id desc) from candidates),'[]'::jsonb)));
end;
$$;

create function private.record_material_document_references(
  p_document uuid, p_patient uuid, p_lines jsonb, p_links jsonb
) returns void language plpgsql set search_path='' as $$
declare source_version integer;
begin
  if p_links is null then return; end if;
  perform private.validate_material_reference_shape(p_links);
  if exists (
    select 1 from jsonb_array_elements(p_links) l
    where (p_lines @> jsonb_build_array(jsonb_build_object('productId',l->>'productId'))) is not true
      or not exists (
        select 1 from public.operational_documents d
        where d.id=(l->>'documentId')::uuid and d.id<>p_document
          and d.care_recipient_id=p_patient and private.visible_material_reference(d)
          and exists (select 1 from private.document_material_lines(d.id,d.type::text) m
            where m.product_id=l->>'productId')
      )
  ) then
    raise exception 'material reference no longer available' using errcode='PT409';
  end if;
  if p_links='[]'::jsonb and not exists (
    select 1 from private.material_document_reference_sets r where r.document_id=p_document
  ) then return; end if;
  select d.version into strict source_version from public.operational_documents d
    where d.id=p_document and d.care_recipient_id=p_patient and d.type in ('REQ','BAL');
  insert into private.material_document_reference_sets(document_id,document_version,recorded_by,links)
    values(p_document,source_version,auth.uid(),p_links);
end;
$$;

create function private.visible_material_document_references(
  source public.operational_documents
) returns jsonb language sql stable set search_path='' as $$
  with latest as (
    select r.links from private.material_document_reference_sets r
    where r.document_id=source.id and r.document_version<=source.version
    order by r.document_version desc limit 1
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'lineId',m.line_id,'document',jsonb_build_object('id',d.id,'type',d.type,
      'kind',d.kind,'code',coalesce(d.code,d.protocol))
  ) order by m.line_id,d.created_at desc,d.id),'[]'::jsonb)
  from latest cross join lateral jsonb_array_elements(latest.links) l
  join public.operational_documents d on d.id=(l->>'documentId')::uuid
    and d.care_recipient_id=source.care_recipient_id and private.visible_material_reference(d)
  join private.document_material_lines(source.id,source.type::text) m on m.product_id=l->>'productId';
$$;

do $$
declare definition text;
  marker text;
begin
  definition:=pg_get_functiondef('private.validate_creation_draft(text,jsonb,uuid)'::regprocedure);
  marker:='if p_kind=''BAL'' and p_content ? ''previousObservations'' then';
  if position(marker in definition)=0 then raise exception 'material reference draft validator anchor missing'; end if;
  execute replace(definition,marker,$sql$
    if p_content ? 'materialReferences' then
      perform private.validate_material_reference_shape(p_content->'materialReferences');
      p_content:=p_content-'materialReferences';
    end if;
    if p_kind='BAL' and p_content ? 'previousObservations' then$sql$);

  definition:=pg_get_functiondef('public.commit_creation_draft(uuid,integer,uuid,jsonb,uuid)'::regprocedure);
  marker:='update private.creation_drafts set consumed_document_id=document_id';
  if position(marker in definition)=0 then raise exception 'material reference commit anchor missing'; end if;
  execute replace(definition,marker,$sql$
    perform private.record_material_document_references(document_id,d.care_recipient_id,
      case when d.kind='REQ' then p_body->'lines' else p_body#>'{payload,lines}' end,
      d.content->'materialReferences');
    update private.creation_drafts set consumed_document_id=document_id$sql$);

  definition:=pg_get_functiondef('private.document_material_overview(uuid,uuid,text,integer)'::regprocedure);
  marker:='return result||jsonb_build_object(''balances'',coalesce((';
  if position(marker in definition)=0 then raise exception 'material reference overview anchor missing'; end if;
  execute replace(definition,marker,$sql$
    return result||jsonb_build_object('references',private.visible_material_document_references(d))
      ||jsonb_build_object('balances',coalesce(($sql$);
end;
$$;

revoke all on function private.validate_material_reference_shape(jsonb),
  private.visible_material_reference(public.operational_documents),
  private.record_material_document_references(uuid,uuid,jsonb,jsonb),
  private.visible_material_document_references(public.operational_documents),
  public.material_reference_options(uuid,text,text,text,text,integer,uuid[])
  from public, anon, authenticated, service_role;
grant execute on function public.material_reference_options(uuid,text,text,text,text,integer,uuid[]) to authenticated;
