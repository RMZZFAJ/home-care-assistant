-- L1: immutable publication audience and stable references to authorized Andamentos.
alter table private.document_progress_details
 add column visibility text not null default 'public' check(visibility in ('public','family')),
 add column mention_all boolean not null default false,
 add constraint progress_collective_public check(not mention_all or visibility='public');

create function private.progress_mentions_all(p_text text) returns boolean
language sql immutable set search_path='' as $$
 select coalesce(p_text ~* '(^|[^[:alnum:]_])@todos($|[^[:alnum:]_])',false);
$$;
revoke all on function private.progress_mentions_all(text) from public,anon,authenticated,service_role;

create function private.progress_note_readable(p private.document_progress_notes) returns boolean
language sql stable security definer set search_path='' as $$
 select p.id is not null and private.auth_session() is not null
 and exists(select 1 from public.operational_documents d where d.id=p.document_id
  and private.can(d.care_recipient_id,lower(d.type)||'.read'))
 and (not exists(select 1 from private.document_progress_details x where x.note_id=p.id and x.visibility='family')
  or exists(select 1 from public.care_recipient_memberships m where m.care_recipient_id=p.care_recipient_id
   and m.user_id=auth.uid() and m.status='active' and m.role::text in ('admin','family'))
  or exists(select 1 from private.document_progress_details x cross join lateral jsonb_array_elements(x.mentions) m
   where x.note_id=p.id and m->>'id'=auth.uid()::text));
$$;
revoke all on function private.progress_note_readable(private.document_progress_notes) from public,anon,authenticated,service_role;

create function private.progress_reference_view(p_id uuid,p_patient uuid) returns jsonb
language plpgsql stable set search_path='' as $$
declare d public.operational_documents;n private.document_progress_notes;
begin
 select * into d from public.operational_documents where id=p_id and care_recipient_id=p_patient;
 if found and private.can(p_patient,lower(d.type)||'.read') then
  return jsonb_build_object('id',d.id,'code',d.code,'type',d.type,'kind','document');
 end if;
 select * into n from private.document_progress_notes where id=p_id and care_recipient_id=p_patient;
 if not found or not private.progress_note_readable(n) then return null;end if;
 select * into d from public.operational_documents where id=n.document_id;
 return jsonb_build_object('id',n.id,'documentId',d.id,'code',d.code,'type',d.type,'kind','progress',
  'excerpt',left(n.body,140),'recordedAt',n.recorded_at);
end;$$;
revoke all on function private.progress_reference_view(uuid,uuid) from public,anon,authenticated,service_role;

create or replace function private.progress_note_view(p private.document_progress_notes) returns jsonb
language sql stable set search_path='' as $$
 select case when private.progress_note_readable(p) then
 jsonb_build_object('id',p.id,'source','manual','documentId',p.document_id,'recordedAt',p.recorded_at,
  'authorId',p.author_id,'authorName',p.author_name,'category',p.category,'stage',p.stage,'text',p.body,
  'references',coalesce((select jsonb_agg(v.body order by r.position)
   from unnest(p.reference_ids) with ordinality r(id,position)
   cross join lateral (select private.progress_reference_view(r.id,p.care_recipient_id) body) v
   where v.body is not null),'[]'::jsonb))
 ||coalesce((select jsonb_build_object('relevance',x.relevance,'mentions',x.mentions,
   'visibility',x.visibility,'mentionAll',x.mention_all) from private.document_progress_details x where x.note_id=p.id),'{}'::jsonb)
 end;
$$;

-- Tighten every existing read projection, including the frozen PDF expansion.
do $l1$
declare definition text;anchor text;
begin
 definition:=pg_get_functiondef('public.document_progress(uuid,text,integer,integer)'::regprocedure);
 anchor:='where document_id=p_document and p_filter<>''automatic''';
 if position(anchor in definition)=0 then raise exception 'L1 progress read contract drift';end if;
 execute replace(definition,anchor,anchor||' and private.progress_note_readable(document_progress_notes)');
 definition:=pg_get_functiondef('private.freeze_pdf_expansion()'::regprocedure);
 anchor:='n.document_id=new.document_id';
 if position(anchor in definition)=0 then raise exception 'L1 PDF progress contract drift';end if;
 execute replace(definition,anchor,anchor||' and private.progress_note_readable(n)');
 definition:=pg_get_functiondef('private.progress_publication_mentions(uuid,jsonb)'::regprocedure);
 anchor:='p_options-array[''relevance'',''mentions'']';
 if position(anchor in definition)=0 then raise exception 'L1 progress options contract drift';end if;
 execute replace(definition,anchor,'p_options-array[''relevance'',''mentions'',''visibility'',''mentionAll'']');
end;$l1$;

create function private.require_progress_audience(p_document uuid,p_body jsonb) returns void
language plpgsql stable set search_path='' as $$
declare d public.operational_documents;opts jsonb:=p_body->'publication';private_note boolean;
begin
 select * into d from public.operational_documents where id=p_document;
 if not found then raise exception 'document not found' using errcode='42501';end if;
 if opts is not null and (coalesce(opts->>'visibility','public') not in ('public','family')
  or opts ? 'mentionAll' and jsonb_typeof(opts->'mentionAll')<>'boolean') then
  raise exception 'invalid progress audience' using errcode='22023';end if;
 private_note:=coalesce(opts->>'visibility','public')='family';
 if private_note and not exists(select 1 from public.care_recipient_memberships m where m.care_recipient_id=d.care_recipient_id
  and m.user_id=auth.uid() and m.status='active' and m.role::text in ('admin','family')) then
  raise exception 'family audience requires family authority' using errcode='42501';end if;
 if private.progress_mentions_all(p_body->>'text') and private_note then
  raise exception 'collective mentions require public audience' using errcode='22023';end if;
 if opts ? 'mentionAll' and (opts->>'mentionAll')::boolean is distinct from private.progress_mentions_all(p_body->>'text') then
  raise exception 'collective mention does not match text' using errcode='22023';end if;
 if exists(select 1 from jsonb_array_elements(coalesce(opts->'mentions','[]'::jsonb)) m
   where not exists(select 1 from public.care_recipient_memberships cm join public.profiles p on p.id=cm.user_id
    where cm.care_recipient_id=d.care_recipient_id and cm.user_id=(m#>>'{}')::uuid and cm.status='active' and p.status='active'
    and private.member_can(d.care_recipient_id,p.id,lower(d.type)||'.read')
    and (d.type<>'COM' or cm.role::text in ('family','admin')))) then
  raise exception 'progress mention not authorized' using errcode='42501';end if;
 if exists(select 1 from jsonb_array_elements_text(p_body->'references') ref
  join private.document_progress_notes n on n.id=ref::uuid
  join private.document_progress_details x on x.note_id=n.id and x.visibility='family'
  where not private_note or exists(select 1 from jsonb_array_elements(coalesce(opts->'mentions','[]'::jsonb)) m
   where not exists(select 1 from jsonb_array_elements(x.mentions) target where target->>'id'=m#>>'{}')
    and not exists(select 1 from public.care_recipient_memberships cm where cm.care_recipient_id=d.care_recipient_id
     and cm.user_id=(m#>>'{}')::uuid and cm.status='active' and cm.role::text in ('admin','family')))) then
  raise exception 'reference audience is narrower than publication' using errcode='22023';end if;
end;$$;
revoke all on function private.require_progress_audience(uuid,jsonb) from public,anon,authenticated,service_role;

do $l1$
declare definition text;anchor text;
begin
 definition:=pg_get_functiondef('public.document_progress_publish(uuid,uuid,jsonb)'::regprocedure);
 anchor:='perform private.require_cap(d.care_recipient_id,''document.progress.create'');';
 if position(anchor in definition)=0 then raise exception 'L1 publication authority contract drift';end if;
 definition:=replace(definition,anchor,anchor||' perform private.require_progress_audience(p_document,v_original);');
 anchor:=$find$if not exists(select 1 from public.operational_documents r where r.id=ref and r.care_recipient_id=d.care_recipient_id
   and private.can(r.care_recipient_id,lower(r.type)||'.read')) then$find$;
 if position(anchor in definition)=0 then raise exception 'L1 publication references contract drift';end if;
 definition:=replace(definition,anchor,'if private.progress_reference_view(ref,d.care_recipient_id) is null then');
 anchor:='insert into private.document_progress_details(note_id,relevance,mentions) values(n.id,v_options->>''relevance'',v_mentions);';
 if position(anchor in definition)=0 then raise exception 'L1 publication details contract drift';end if;
 definition:=replace(definition,anchor,$replacement$insert into private.document_progress_details(note_id,relevance,mentions,visibility,mention_all)
  values(n.id,v_options->>'relevance',v_mentions,coalesce(v_options->>'visibility','public'),private.progress_mentions_all(n.body));$replacement$);
 anchor:='return jsonb_build_object(''note'',private.progress_note_view(n),''key'',p_key,''intentHash'',v_hash,''recovered'',true);';
 if position(anchor in definition)=0 then raise exception 'L1 publication recovery contract drift';end if;
 definition:=replace(definition,anchor,'if not private.progress_note_readable(n) then raise exception ''document not found'' using errcode=''42501'';end if;'||anchor);
 anchor:='return jsonb_build_object(''note'',private.progress_note_view(n),''key'',p_key,''intentHash'',v_hash,''recovered'',false);';
 if position(anchor in definition)=0 then raise exception 'L1 publication final check drift';end if;
 execute replace(definition,anchor,'perform private.require_progress_audience(p_document,v_original); perform private.require_cap(d.care_recipient_id,''document.progress.create'');'||anchor);
end;$l1$;

-- Audit capabilities do not grant the ability to discover a private note.
create function private.progress_audit_visible(p_entity uuid,p_metadata jsonb) returns boolean
language sql stable security definer set search_path='' as $$
 select not exists(select 1 from private.document_progress_notes n
  where (n.id=p_entity or n.id::text=p_metadata->>'resource_id') and not private.progress_note_readable(n));
$$;
revoke all on function private.progress_audit_visible(uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function private.progress_audit_visible(uuid,jsonb) to authenticated;
create policy progress_audit_audience on public.audit_events as restrictive for select to authenticated
 using(private.progress_audit_visible(entity_id,metadata));

create or replace function private.pdf_expansion_visible(p_patient uuid,p_options jsonb,p_snapshot jsonb) returns boolean
language sql stable set search_path='' as $$
 select p_options is null or (
  (p_options->>'mode'<>'audit' or private.can(p_patient,'audit.read'))
  and (not(p_options->'sections' ? 'access') or private.can(p_patient,'document.access.read'))
  and not exists(select 1 from jsonb_array_elements(coalesce(nullif(p_snapshot#>'{documentExpansion,progress}','null'::jsonb),'[]'::jsonb)) note
   where note->>'visibility'='family' and not exists(select 1 from private.document_progress_notes n
    where n.id=(note->>'id')::uuid and private.progress_note_readable(n)))
  and not exists(select 1 from jsonb_array_elements(coalesce(nullif(p_snapshot#>'{documentExpansion,progress}','null'::jsonb),'[]'::jsonb)) note
   cross join lateral jsonb_array_elements(coalesce(note->'references','[]'::jsonb)) ref
   where private.progress_reference_view((ref->>'id')::uuid,p_patient) is null)
 );
$$;

create function public.document_progress_references(p_document uuid,p_search text default '',p_page integer default 1) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare d public.operational_documents;rows jsonb;total bigint;
begin
 if private.auth_session() is null then raise exception 'active identity required' using errcode='42501';end if;
 select * into d from public.operational_documents where id=p_document;
 if not found or not private.can(d.care_recipient_id,lower(d.type)||'.read') then raise exception 'document not found' using errcode='42501';end if;
 if p_search is null or private.bal_comment_units(p_search)>100 or p_page is null or p_page<1 or p_page>1000000 then raise exception 'invalid reference search' using errcode='22023';end if;
 with eligible as materialized(
  select r.id,coalesce(r.code,r.id::text) label,private.progress_reference_view(r.id,d.care_recipient_id) body
   from public.operational_documents r where r.care_recipient_id=d.care_recipient_id and r.id<>p_document
   and private.can(d.care_recipient_id,lower(r.type)||'.read') and position(lower(p_search) in lower(coalesce(r.code,'')||' '||coalesce(r.protocol,'')))>0
  union all select n.id,n.recorded_at::text,private.progress_reference_view(n.id,d.care_recipient_id)
   from private.document_progress_notes n join public.operational_documents r on r.id=n.document_id
   where n.care_recipient_id=d.care_recipient_id and private.progress_note_readable(n)
   and position(lower(p_search) in lower(coalesce(r.code,'')||' '||n.body))>0
 ), selected as (select * from eligible where body is not null order by label,id limit 20 offset ((p_page::bigint-1)*20))
 select (select count(*) from eligible where body is not null),coalesce(jsonb_agg(s.body order by s.label,s.id),'[]'::jsonb) into total,rows from selected s;
 return jsonb_build_object('documentId',p_document,'careRecipientId',d.care_recipient_id,'search',p_search,'page',p_page,'size',20,'total',total,'data',rows);
end;$$;
revoke all on function public.document_progress_references(uuid,text,integer) from public,anon,authenticated,service_role;
grant execute on function public.document_progress_references(uuid,text,integer) to authenticated;

create function public.document_progress_location(p_document uuid,p_note uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare n private.document_progress_notes;position bigint;
begin
 select * into n from private.document_progress_notes where id=p_note and document_id=p_document;
 if not found or not private.progress_note_readable(n) then raise exception 'record not found' using errcode='42501';end if;
 select count(*) into position from (
  select f.recorded_at,f.id from private.document_progress_facts f where f.document_id=p_document
  union all select r.recorded_at,r.id from private.document_progress_notes r where r.document_id=p_document and private.progress_note_readable(r)
 ) entries where (recorded_at,id)<=(n.recorded_at,n.id);
 return jsonb_build_object('documentId',p_document,'recordId',p_note,'page',((position-1)/20)+1);
end;$$;
revoke all on function public.document_progress_location(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.document_progress_location(uuid,uuid) to authenticated;
