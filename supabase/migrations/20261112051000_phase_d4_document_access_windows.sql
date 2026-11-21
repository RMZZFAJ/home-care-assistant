-- Access is an observed foreground display, never SCI, reading or receipt.
-- Preserve old opening rows/keys and coalesce new displays for the same actor,
-- document and version within twenty minutes of the first stored display.
insert into public.capability_definitions(code,default_roles,critical)
 values ('document.access.read',array['admin'],false);

create table private.document_access_windows (
 id uuid primary key default gen_random_uuid(),
 document_id uuid not null references public.operational_documents(id),
 actor_id uuid not null references public.profiles(id),
 actor_name text,
 reference_version integer not null check(reference_version>0),
 recorded_at timestamptz not null default clock_timestamp(),
 idempotency_key uuid not null,
 origin text not null default 'application_foreground_display_report'
  check(origin='application_foreground_display_report'),
 unique(actor_id,idempotency_key)
);
create index document_access_windows_cursor on private.document_access_windows(document_id,recorded_at desc,id desc);
-- Only aliases need a second row: replays of a grouped display retain their
-- original target after the twenty-minute window has expired.
create table private.document_access_aliases (
 actor_id uuid not null references public.profiles(id),
 idempotency_key uuid not null,
 opening_id uuid references public.requisition_openings(id),
 access_id uuid references private.document_access_windows(id),
 primary key(actor_id,idempotency_key),
 check(num_nonnulls(opening_id,access_id)=1)
);
create index document_access_aliases_opening on private.document_access_aliases(opening_id) where opening_id is not null;
create index document_access_aliases_access on private.document_access_aliases(access_id) where access_id is not null;
create index requisition_openings_window on public.requisition_openings(requisition_id,user_id,reference_version,recorded_at desc);
alter table private.document_access_windows enable row level security;
alter table private.document_access_aliases enable row level security;
revoke all on private.document_access_windows,private.document_access_aliases from public,anon,authenticated,service_role;
create trigger preserve_document_access_window before update or delete on private.document_access_windows
 for each row execute function private.keep_requisition_opening();
create trigger preserve_document_access_alias before update or delete on private.document_access_aliases
 for each row execute function private.keep_requisition_opening();

create function private.document_access_key(p_actor uuid,p_key uuid) returns jsonb
language plpgsql stable set search_path='' as $$
declare n integer;v jsonb;begin
 with targets as (
  select 'REQ' kind,to_jsonb(o) body from public.requisition_openings o where o.user_id=p_actor and o.opening_key=p_key
  union all select 'document',to_jsonb(w) from private.document_access_windows w where w.actor_id=p_actor and w.idempotency_key=p_key
  union all select 'REQ',to_jsonb(o) from private.document_access_aliases a join public.requisition_openings o on o.id=a.opening_id where a.actor_id=p_actor and a.idempotency_key=p_key
  union all select 'document',to_jsonb(w) from private.document_access_aliases a join private.document_access_windows w on w.id=a.access_id where a.actor_id=p_actor and a.idempotency_key=p_key
 ) select count(*),(jsonb_agg(jsonb_build_object('kind',kind,'body',body)))->0 into n,v from targets;
 if n>1 then raise exception 'ambiguous access key' using errcode='23505';end if;
 return v;
end;$$;
revoke all on function private.document_access_key(uuid,uuid) from public,anon,authenticated,service_role;

create or replace function public.record_requisition_opening(p_id uuid,p_material_identity text,p_version integer,p_key uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;r public.requisitions;opening public.requisition_openings;prior jsonb;grouped boolean:=false;
begin
 if p_id is null or p_key is null or p_version is null or p_version<1 or p_material_identity is null or p_material_identity !~ '^[0-9a-f]{64}$' then
  raise exception 'invalid opening reference' using errcode='22023';end if;
 if private.auth_session() is null then raise exception 'required permission' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('document-access-key:'||auth.uid()||':'||p_key,0));
 -- Retain the original lock contract; authority is checked after waiting.
 perform pg_advisory_xact_lock(hashtextextended('req-opening:'||auth.uid()||':'||p_key,0));
 perform pg_advisory_xact_lock(hashtextextended('document-access-window:'||auth.uid()||':'||p_id,0));
 select * into d from public.operational_documents where id=p_id and type='REQ';
 if not found or private.auth_session() is null or not coalesce(private.can(d.care_recipient_id,'req.read'),false) then
  raise exception 'required permission' using errcode='42501';end if;
 select * into strict r from public.requisitions where id=p_id;
 if r.material_identity is distinct from p_material_identity or p_version>d.version then
  raise exception 'stale document material' using errcode='PT409';end if;
 prior:=private.document_access_key(auth.uid(),p_key);
 if prior is not null then
  if prior->>'kind'<>'REQ' or prior#>>'{body,requisition_id}' is distinct from p_id::text
   or prior#>>'{body,material_identity}' is distinct from p_material_identity
   or (prior#>>'{body,reference_version}')::integer is distinct from p_version then
   raise exception 'idempotency conflict' using errcode='23505';end if;
  return (prior->'body')||jsonb_build_object('recovered',true,'windowReused',prior#>>'{body,opening_key}'<>p_key::text);
 end if;
 select * into opening from public.requisition_openings where requisition_id=p_id and user_id=auth.uid()
  and reference_version=p_version and material_identity=p_material_identity
  and recorded_at>clock_timestamp()-interval '20 minutes' order by recorded_at desc,id desc limit 1;
 if found then
  grouped:=true;
  insert into private.document_access_aliases(actor_id,idempotency_key,opening_id) values(auth.uid(),p_key,opening.id);
 else
  insert into public.requisition_openings(requisition_id,care_recipient_id,user_id,actor_name,material_identity,reference_version,opening_key)
   values(p_id,d.care_recipient_id,auth.uid(),(select full_name from public.profiles where id=auth.uid()),p_material_identity,p_version,p_key)
   returning * into opening;
 end if;
 return to_jsonb(opening)||jsonb_build_object('recovered',false,'windowReused',grouped);
end;$$;
revoke all on function public.record_requisition_opening(uuid,text,integer,uuid) from public,anon,authenticated,service_role;
grant execute on function public.record_requisition_opening(uuid,text,integer,uuid) to authenticated;

create function public.record_document_access(p_document uuid,p_version integer,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;w private.document_access_windows;prior jsonb;result jsonb;grouped boolean:=false;
begin
 if p_document is null or p_version is null or p_version<1 or p_key is null then raise exception 'invalid access reference' using errcode='22023';end if;
 if private.auth_session() is null then raise exception 'active identity required' using errcode='42501';end if;
 select * into d from public.operational_documents where id=p_document;
 if not found or not private.can(d.care_recipient_id,lower(d.type)||'.read') then raise exception 'document read required' using errcode='42501';end if;
 if d.type='REQ' then
  result:=public.record_requisition_opening(p_document,(select material_identity from public.requisitions where id=p_document),p_version,p_key);
  return jsonb_build_object('id',result->'id','documentId',p_document,'referenceVersion',result->'reference_version',
   'actorId',result->'user_id','actorName',result->'actor_name','recordedAt',result->'recorded_at','origin',result->'origin',
   'recovered',result->'recovered','windowReused',result->'windowReused');
 end if;
 perform pg_advisory_xact_lock(hashtextextended('document-access-key:'||auth.uid()||':'||p_key,0));
 perform pg_advisory_xact_lock(hashtextextended('document-access-window:'||auth.uid()||':'||p_document,0));
 select * into strict d from public.operational_documents where id=p_document;
 if private.auth_session() is null or not private.can(d.care_recipient_id,lower(d.type)||'.read') then raise exception 'document read required' using errcode='42501';end if;
 if d.protocol is null or p_version>d.version then raise exception 'issued document reference required' using errcode='PT409';end if;
 prior:=private.document_access_key(auth.uid(),p_key);
 if prior is not null then
  if prior->>'kind'<>'document' or prior#>>'{body,document_id}' is distinct from p_document::text
   or (prior#>>'{body,reference_version}')::integer is distinct from p_version then raise exception 'idempotency conflict' using errcode='23505';end if;
  select * into strict w from private.document_access_windows where id=(prior#>>'{body,id}')::uuid;
  grouped:=w.idempotency_key<>p_key;
 else
  select * into w from private.document_access_windows where document_id=p_document and actor_id=auth.uid()
   and reference_version=p_version and recorded_at>clock_timestamp()-interval '20 minutes' order by recorded_at desc,id desc limit 1;
  if found then
   grouped:=true;
   insert into private.document_access_aliases(actor_id,idempotency_key,access_id) values(auth.uid(),p_key,w.id);
  else
   insert into private.document_access_windows(document_id,actor_id,actor_name,reference_version,idempotency_key)
    values(p_document,auth.uid(),(select full_name from public.profiles where id=auth.uid()),p_version,p_key) returning * into w;
  end if;
 end if;
 return jsonb_build_object('id',w.id,'documentId',w.document_id,'referenceVersion',w.reference_version,'actorId',w.actor_id,
  'actorName',w.actor_name,'recordedAt',w.recorded_at,'origin',w.origin,'recovered',prior is not null,'windowReused',grouped);
end;$$;
revoke all on function public.record_document_access(uuid,integer,uuid) from public,anon,authenticated,service_role;
grant execute on function public.record_document_access(uuid,integer,uuid) to authenticated;

create function public.document_access_history(p_document uuid,p_before_at timestamptz default null,p_before_id uuid default null) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare d public.operational_documents;rows jsonb;page_rows jsonb;begin
 if private.auth_session() is null then raise exception 'active identity required' using errcode='42501';end if;
 select * into d from public.operational_documents where id=p_document;
 if not found or not private.can(d.care_recipient_id,lower(d.type)||'.read') then raise exception 'document read required' using errcode='42501';end if;
 perform private.require_cap(d.care_recipient_id,'document.access.read');
 if (p_before_at is null)<>(p_before_id is null) then raise exception 'complete access cursor required' using errcode='22023';end if;
 with reports as (
  select id,requisition_id document_id,reference_version,user_id actor_id,actor_name,recorded_at,origin,material_identity
   from public.requisition_openings where d.type='REQ' and requisition_id=p_document
  union all select id,document_id,reference_version,actor_id,actor_name,recorded_at,origin,null::text
   from private.document_access_windows where d.type<>'REQ' and document_id=p_document
 ), selected as (
  select * from reports where p_before_at is null or (recorded_at,id)<(p_before_at,p_before_id)
   order by recorded_at desc,id desc limit 21
 ) select coalesce(jsonb_agg(jsonb_build_object('id',id,'documentId',document_id,'referenceVersion',reference_version,
  'actorId',actor_id,'actorName',actor_name,'recordedAt',recorded_at,'origin',origin,'materialIdentity',material_identity) order by recorded_at desc,id desc),'[]') into rows from selected;
 select coalesce(jsonb_agg(value order by ord),'[]') into page_rows from jsonb_array_elements(rows) with ordinality x(value,ord) where ord<=20;
 return jsonb_build_object('documentId',p_document,'groupingMinutes',20,'data',page_rows,'next',
  case when jsonb_array_length(rows)>20 then jsonb_build_object('at',rows#>'{19,recordedAt}','id',rows#>'{19,id}') else null end);
end;$$;
revoke all on function public.document_access_history(uuid,timestamptz,uuid) from public,anon,authenticated,service_role;
grant execute on function public.document_access_history(uuid,timestamptz,uuid) to authenticated;

drop policy requisition_openings_read on public.requisition_openings;
create policy requisition_openings_read on public.requisition_openings for select to authenticated
 using(private.auth_session() is not null and private.can(care_recipient_id,'req.read') and private.can(care_recipient_id,'document.access.read'));
notify pgrst,'reload schema';
