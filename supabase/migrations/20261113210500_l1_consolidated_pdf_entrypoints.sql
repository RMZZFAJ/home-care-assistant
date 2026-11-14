-- One current operational contract. Historical rows/bytes are not rewritten.
do $l1$
declare definition text;p record;
begin
 definition:=pg_get_functiondef('public.reserve_pdf_issuance_v16(uuid,uuid,integer)'::regprocedure);
 execute replace(definition,'public.reserve_pdf_issuance_v16(','public.reserve_pdf_issuance(');
 for p in select oid from pg_proc where pronamespace='public'::regnamespace and proname ~ '^reserve_pdf_issuance_v[0-9]+$' loop
  execute format('revoke all on function %s from public,anon,authenticated,service_role',p.oid::regprocedure);
 end loop;
end;$l1$;
revoke all on function public.reserve_pdf_issuance(uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.reserve_pdf_issuance(uuid,uuid,integer) to authenticated;
revoke all on function public.legacy_pdf_public(text) from public,anon,authenticated,service_role;
revoke all on function public.verify_document_integrity(uuid,integer,text) from public,anon,authenticated,service_role;
create or replace function public.pdf_archive(p_document uuid,p_version integer default null,p_before timestamptz default null,p_kind text default null,p_reference text default null,p_limit integer default 20) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform private.require_pdf_document(p_document);
 if p_limit is null or p_limit<1 or p_limit>50 or p_version<1 or
 ((p_before is null)::integer+(p_kind is null)::integer+(p_reference is null)::integer) not in (0,3) or
 p_kind<>'issuance' or length(p_reference)>96 then raise exception 'invalid archive page' using errcode='22023';end if;
 with records as materialized(
  select r.requested_at at,'issuance'::text kind,r.id::text reference,
   jsonb_build_object('kind','issuance','at',r.requested_at,'reference',r.id,'issuance',private.pdf_issuance_receipt(r)) entry
  from private.pdf_issuances r where r.document_id=p_document and r.renderer_revision in (16,17)
  and (p_version is null or r.version=p_version) and private.pdf_expansion_visible(r.care_recipient_id,r.document_options,r.snapshot)
 ), page as materialized(select *,row_number() over(order by at desc,kind desc,reference desc) position from records
  where p_before is null or (at,kind,reference)<(p_before,p_kind,p_reference) order by at desc,kind desc,reference desc limit p_limit+1)
 select jsonb_build_object('data',coalesce((select jsonb_agg(entry order by at desc,kind desc,reference desc) from page where position<=p_limit),'[]'::jsonb),
 'next',case when exists(select 1 from page where position=p_limit+1) then(select jsonb_build_object('at',at,'kind',kind,'reference',reference) from page where position=p_limit) else null end) into result;
 perform private.require_pdf_document(p_document);return result;
end;$$;
revoke all on function public.pdf_archive(uuid,integer,timestamptz,text,text,integer) from public,anon,authenticated,service_role;
grant execute on function public.pdf_archive(uuid,integer,timestamptz,text,text,integer) to authenticated;
notify pgrst,'reload schema';
