create function private.pdf_archive_window(
  p_document uuid,p_version integer,p_earlier_than integer,p_before timestamptz,
  p_kind text,p_reference text,p_limit integer
) returns jsonb
language plpgsql set search_path='' as $$
declare result jsonb;
begin
  perform private.require_pdf_document(p_document);
  if p_limit is null or p_limit not between 1 and 50 or p_version<1 or p_earlier_than<1
    or ((p_before is null)::integer+(p_kind is null)::integer+(p_reference is null)::integer) not in (0,3)
    or p_kind<>'issuance' or length(p_reference)>96
  then raise exception 'invalid archive page' using errcode='22023'; end if;

  with page as materialized (
    select issuance,issuance.requested_at as at,issuance.id::text as reference,
      row_number() over(order by issuance.requested_at desc,issuance.id::text desc) as position
    from private.pdf_issuances issuance
    where issuance.document_id=p_document and issuance.renderer_revision in (16,17)
      and (p_version is null or issuance.version=p_version)
      and (p_earlier_than is null or issuance.version<p_earlier_than)
      and (p_before is null or (issuance.requested_at,issuance.id::text)<(p_before,p_reference))
      and private.pdf_expansion_visible(issuance.care_recipient_id,issuance.document_options,issuance.snapshot)
    order by issuance.requested_at desc,issuance.id::text desc limit p_limit+1
  )
  select jsonb_build_object(
    'data',coalesce((select jsonb_agg(jsonb_build_object('kind','issuance','at',at,
      'reference',reference,'issuance',private.pdf_issuance_receipt(issuance)) order by position)
      from page where position<=p_limit),'[]'::jsonb),
    'next',case when exists(select 1 from page where position=p_limit+1)
      then (select jsonb_build_object('at',at,'kind','issuance','reference',reference)
        from page where position=p_limit) end
  ) into result;
  perform private.require_pdf_document(p_document);
  return result;
end;
$$;

revoke all on function private.pdf_archive_window(uuid,integer,integer,timestamptz,text,text,integer)
  from public,anon,authenticated,service_role;

create or replace function public.pdf_archive(
  p_document uuid,p_version integer default null,p_before timestamptz default null,
  p_kind text default null,p_reference text default null,p_limit integer default 20
) returns jsonb language sql security definer set search_path='' as $$
  select private.pdf_archive_window(p_document,p_version,null,p_before,p_kind,p_reference,p_limit);
$$;

create function public.pdf_archive_by_revision(
  p_document uuid,p_filter text,p_basis integer default null,p_before timestamptz default null,
  p_kind text default null,p_reference text default null,p_limit integer default 20
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare revision integer;
begin
  revision:=(private.require_pdf_document(p_document)).version;
  if p_filter is null or p_filter not in ('current','previous') or (p_before is null)<>(p_basis is null)
    or p_basis<1 then raise exception 'invalid archive filter' using errcode='22023'; end if;
  if p_basis is not null and p_basis<>revision then
    raise exception 'archive revision changed' using errcode='PT409';
  end if;
  return private.pdf_archive_window(p_document,
    case when p_filter='current' then revision end,
    case when p_filter='previous' then revision end,
    p_before,p_kind,p_reference,p_limit)
    ||jsonb_build_object('basisVersion',revision,'filter',p_filter);
end;
$$;

revoke all on function public.pdf_archive_by_revision(uuid,text,integer,timestamptz,text,text,integer)
  from public,anon,authenticated,service_role;
grant execute on function public.pdf_archive_by_revision(uuid,text,integer,timestamptz,text,text,integer)
  to authenticated;
notify pgrst,'reload schema';
