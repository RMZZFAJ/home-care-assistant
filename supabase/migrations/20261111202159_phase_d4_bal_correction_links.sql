-- Derive correction links from native recounts of this exact BAL and product.
-- No new write workflow, stock effect or retrospective edit is introduced.
create function private.bal_correction_facts(p_id uuid,p_version integer) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare d public.operational_documents;e public.document_events;by_product jsonb;
 review jsonb;item jsonb;source_line jsonb;acts jsonb;result jsonb:='[]'::jsonb;begin
 select * into strict d from public.operational_documents where id=p_id and type='BAL';
 perform private.require_cap(d.care_recipient_id,'bal.read');
 select * into e from public.document_events where document_id=p_id and version=p_version;
 if not found then return '[]'::jsonb;end if;
 with counts as materialized (
  select x.id,x.version,x.actor_id,x.actor_name,x.created_at,x.body,
   (x.body#>>'{workflow,countVersion}')::integer as count_no,
   private.bal_application_facts(p_id,(x.body#>>'{workflow,countVersion}')::integer,p_version,
    exists(select 1 from public.document_events applied where applied.document_id=p_id and applied.version<=p_version
     and applied.body#>>'{workflow,countVersion}'=x.body#>>'{workflow,countVersion}'
     and nullif(applied.body#>>'{workflow,appliedAt}','') is not null)) as application
  from public.document_events x where x.document_id=p_id and x.version<=p_version and x.action='bal.recount'
   and coalesce(x.body#>>'{workflow,countVersion}','')~'^[1-9][0-9]{0,8}$'
 ), counted as (
  select c.*,l.line,coalesce((select jsonb_object_agg(a->>'lineId',a)
   from jsonb_array_elements(c.application->'lines') a),'{}'::jsonb) as application_lines
  from counts c cross join lateral jsonb_array_elements(c.body->'lines') l(line)
 ), grouped as (
  select line->>'product_id' as product,jsonb_agg(jsonb_build_object(
   'eventId',id,'documentId',p_id,'version',version,'countVersion',count_no,
   'actorId',actor_id,'actorName',nullif(actor_name,''),'recordedAt',created_at,
   'line',jsonb_build_object('id',line->'id','name',line->'name_snapshot','unit',line->'unit_snapshot','quantity',line->>'quantity'),
   'application',case when application->>'state'<>'applied' then application
    when application_lines ? (line->>'id') then (application-'lines')||jsonb_build_object('lines',jsonb_build_array(application_lines->(line->>'id')))
    else jsonb_build_object('state','unavailable','lines','[]'::jsonb) end
  ) order by version) as acts from counted
  where coalesce(line->>'product_id','')~*'^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
  group by line->>'product_id'
 ) select coalesce(jsonb_object_agg(product,acts),'{}'::jsonb) into by_product from grouped;
 for review in select value from jsonb_array_elements(coalesce(e.body#>'{balanceReviews,reviews}','[]'::jsonb)) loop
  for item in select value from jsonb_array_elements(coalesce(review->'item_results','[]'::jsonb)) where value->>'result'='difference' loop
   select value into source_line from jsonb_array_elements(review#>'{reviewed_snapshot,lines}') where value->>'id'=item->>'lineId';
   if source_line is null or coalesce(source_line->>'product_id','')!~*'^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then
    result:=result||jsonb_build_array(jsonb_build_object('reviewId',review->'id','sourceLineId',item->'lineId','sourceState','unavailable','acts','[]'::jsonb));
   else
    select coalesce(jsonb_agg(value order by (value->>'version')::integer),'[]'::jsonb) into acts
     from jsonb_array_elements(coalesce(by_product->(source_line->>'product_id'),'[]'::jsonb))
     where (value->>'countVersion')::integer>(review->>'count_version')::integer
      and (value->>'version')::integer>(review->>'reviewed_document_version')::integer;
    result:=result||jsonb_build_array(jsonb_build_object('reviewId',review->'id','sourceLineId',item->'lineId','sourceState','known','acts',acts));
   end if;
  end loop;
 end loop;
 return result;
end;$$;
revoke all on function private.bal_correction_facts(uuid,integer) from public,anon,authenticated,service_role;

do $$declare definition text;needle text;begin
 definition:=pg_get_functiondef('private.bal_review_context(uuid)'::regprocedure);
 needle:='''application'',private.bal_application_facts(p_id,count_no,d.version,d.status=''approved''))';
 if position(needle in definition)=0 then raise exception 'BAL context application contract drift';end if;
 execute replace(definition,needle,'''application'',private.bal_application_facts(p_id,count_no,d.version,d.status=''approved''),''corrections'',private.bal_correction_facts(p_id,d.version))');
 definition:=pg_get_functiondef('private.freeze_pdf_source_facts()'::regprocedure);
 needle:='if new.renderer_revision not in (6,7,8,9,10,11) then';
 if position(needle in definition)=0 then raise exception 'PDF source revision drift';end if;
 execute replace(definition,needle,'if new.renderer_revision not in (6,7,8,9,10,11,12) then');
 definition:=pg_get_functiondef('private.freeze_pdf_fidelity_facts()'::regprocedure);
 needle:='if new.renderer_revision not in (7,8,9,10,11) then';
 if position(needle in definition)=0 then raise exception 'PDF fidelity revision drift';end if;
 execute replace(definition,needle,'if new.renderer_revision not in (7,8,9,10,11,12) then');
 definition:=pg_get_functiondef('private.freeze_pdf_balance_application()'::regprocedure);
 needle:='if new.renderer_revision<>11 then';
 if position(needle in definition)=0 then raise exception 'PDF balance revision drift';end if;
 execute replace(definition,needle,'if new.renderer_revision not in (11,12) then');
 definition:=pg_get_functiondef('public.reserve_pdf_issuance_v11(uuid,uuid,integer)'::regprocedure);
 definition:=replace(definition,'public.reserve_pdf_issuance_v11(','public.reserve_pdf_issuance_v12(');
 needle:='case when e.body->>''type''=''BAL'' then 11 else 10 end';
 if position(needle in definition)=0 then raise exception 'PDF correction selection drift';end if;
 execute replace(definition,needle,'case when e.body->>''type''=''BAL'' then 12 else 10 end');
 definition:=pg_get_functiondef('private.require_pdf_issuance_access(private.pdf_issuances)'::regprocedure);
 needle:='where l->>''state''=''known'') then';
 if position(needle in definition)=0 then raise exception 'PDF stock read contract drift';end if;
 execute replace(definition,needle,'where l->>''state''=''known'') or exists(select 1 from jsonb_array_elements(coalesce(r.snapshot->''balanceReviewCorrections'',''[]''::jsonb)) item cross join lateral jsonb_array_elements(item->''acts'') act cross join lateral jsonb_array_elements(act#>''{application,lines}'') line where line->>''state''=''known'') then');
end;$$;
revoke all on function public.reserve_pdf_issuance_v12(uuid,uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.reserve_pdf_issuance_v12(uuid,uuid,integer) to authenticated;

create function private.freeze_pdf_balance_corrections() returns trigger
language plpgsql security definer set search_path='' as $$
declare e public.document_events;begin
 if new.renderer_revision<>12 then return new;end if;
 select * into strict e from public.document_events where document_id=new.document_id and version=new.version;
 if e.body->>'type' is distinct from 'BAL' or new.source_hash is distinct from e.content_hash
  or new.snapshot-'sourceFacts'-'documentFacts'-'balanceApplication' is distinct from e.body then
  raise exception 'canonical BAL correction source required' using errcode='23514';end if;
 new.snapshot:=new.snapshot||jsonb_build_object('balanceReviewCorrections',private.bal_correction_facts(new.document_id,new.version));
 return new;
end;$$;
revoke all on function private.freeze_pdf_balance_corrections() from public,anon,authenticated,service_role;
create trigger zzzz_freeze_pdf_balance_corrections before insert on private.pdf_issuances
 for each row execute function private.freeze_pdf_balance_corrections();
notify pgrst,'reload schema';
