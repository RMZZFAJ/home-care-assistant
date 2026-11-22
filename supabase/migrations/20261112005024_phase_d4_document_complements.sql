-- Formal complements are dated links between issued documents, never edits to
-- materials or fulfillment links. Both histories advance; prior events survive.
create table private.document_complements (
 id uuid primary key default gen_random_uuid(),
 care_recipient_id uuid not null references public.care_recipients(id),
 source_id uuid not null, child_id uuid not null,
 source_version integer not null check(source_version>0), child_version integer not null check(child_version>0),
 source_hash text not null check(source_hash~'^[a-f0-9]{64}$'), child_hash text not null check(child_hash~'^[a-f0-9]{64}$'),
 reason text not null check(length(btrim(reason)) between 3 and 1000),
 actor_id uuid not null references public.profiles(id), actor_name text not null check(length(btrim(actor_name))>0),
 recorded_at timestamptz not null default clock_timestamp(),
 idempotency_key uuid not null, intent_hash text not null check(intent_hash~'^[a-f0-9]{64}$'),
 foreign key(source_id,care_recipient_id) references public.operational_documents(id,care_recipient_id),
 foreign key(child_id,care_recipient_id) references public.operational_documents(id,care_recipient_id),
 unique(source_id,child_id), unique(actor_id,idempotency_key), check(source_id<>child_id)
);
create index document_complements_source_order on private.document_complements(source_id,recorded_at,id);
create index document_complements_child on private.document_complements(child_id,care_recipient_id);
create index document_complements_patient on private.document_complements(care_recipient_id);
alter table private.document_complements enable row level security;
create policy document_complements_read on private.document_complements for select to authenticated using (
 private.can(care_recipient_id,(select lower(type)||'.read' from public.operational_documents where id=source_id))
 and private.can(care_recipient_id,(select lower(type)||'.read' from public.operational_documents where id=child_id)));
revoke all on private.document_complements from public,anon,authenticated,service_role;
create trigger immutable_document_complement before update or delete on private.document_complements
 for each row execute function private.immutable_event();

create function private.document_issued_at(p_id uuid) returns timestamptz
language sql stable security definer set search_path='' as $$
 select e.created_at from public.document_events e where e.document_id=p_id and e.body->>'protocol' is not null order by e.version limit 1;
$$;
create function private.may_link_complement(d public.operational_documents) returns boolean
language sql stable security definer set search_path='' as $$
 select private.can(d.care_recipient_id,case d.type when 'BAL' then 'bal.count' else lower(d.type)||'.create' end)
 and (d.created_by=auth.uid() or public.recipient_role(d.care_recipient_id)='admin')
 and exists(select 1 from public.care_recipients where id=d.care_recipient_id and is_active);
$$;
create function private.complement_reference(d public.operational_documents) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('id',d.id,'type',d.type,'code',d.code,'protocol',d.protocol,'version',d.version,
  'issuedAt',private.document_issued_at(d.id));
$$;
create function private.document_complement_view(r private.document_complements,p_document uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare peer public.operational_documents;v_role text;begin
 v_role:=case when r.source_id=p_document then 'supplement' else 'source' end;
 select * into strict peer from public.operational_documents where id=case when r.source_id=p_document then r.child_id else r.source_id end;
 if not private.can(peer.care_recipient_id,lower(peer.type)||'.read') then
  return jsonb_build_object('id',r.id,'role',v_role,'accessible',false);
 end if;
 return jsonb_build_object('id',r.id,'role',v_role,'accessible',true,'document',private.complement_reference(peer),
  'reason',r.reason,'actorName',r.actor_name,'recordedAt',r.recorded_at,
  'sourceVersion',r.source_version,'childVersion',r.child_version);
end;$$;
create function public.document_complements(p_id uuid,p_page integer default 1,p_size integer default 20) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare d public.operational_documents;v_rows jsonb;v_total bigint;v_types jsonb;begin
 perform public.operational_document(p_id);
 select * into strict d from public.operational_documents where id=p_id;
 if p_page is null or p_page<1 or p_page>1000000 or p_size is null or p_size<1 or p_size>50 then raise exception 'invalid complement page' using errcode='22023';end if;
 select count(*) into v_total from private.document_complements where source_id=p_id or child_id=p_id;
 select coalesce(jsonb_agg(private.document_complement_view(r,p_id) order by r.recorded_at,r.id),'[]') into v_rows
 from (select * from private.document_complements where source_id=p_id or child_id=p_id
  order by recorded_at,id limit p_size offset (p_page::bigint-1)*p_size) r;
 select coalesce(jsonb_agg(t.type order by t.type),'[]') into v_types from (values('REQ'),('COM'),('ENT'),('BAL')) t(type)
 where d.protocol is not null and private.document_issued_at(d.id) is not null
 and private.can(d.care_recipient_id,case t.type when 'BAL' then 'bal.count' else lower(t.type)||'.create' end)
 and exists(select 1 from public.care_recipients where id=d.care_recipient_id and is_active);
 return jsonb_build_object('document',private.complement_reference(d),'careRecipientId',d.care_recipient_id,
  'page',p_page,'size',p_size,'total',v_total,'links',v_rows,'creatableTypes',v_types);
end;$$;
create function public.document_complement_candidates(p_id uuid,p_type text,p_search text default '',p_page integer default 1,p_size integer default 20) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare d public.operational_documents;v_rows jsonb;v_total bigint;v_issued timestamptz;begin
 perform public.operational_document(p_id);
 select * into strict d from public.operational_documents where id=p_id;
 v_issued:=private.document_issued_at(p_id);
 if p_type is null or p_type not in ('REQ','COM','ENT','BAL') or p_search is null or length(p_search)>100
  or p_page is null or p_page<1 or p_page>1000000 or p_size is null or p_size<1 or p_size>50 then raise exception 'invalid complement candidates' using errcode='22023';end if;
 if d.protocol is null or v_issued is null then raise exception 'issued source required' using errcode='22023';end if;
 with eligible as (select c.* from public.operational_documents c where c.care_recipient_id=d.care_recipient_id and c.type=p_type
  and c.id<>p_id and c.protocol is not null and c.status not in ('draft','cancelled','rejected')
  and private.can(c.care_recipient_id,lower(c.type)||'.read') and private.may_link_complement(c)
  and private.document_issued_at(c.id)>v_issued
  and (p_search='' or position(lower(btrim(p_search)) in lower(c.code||' '||c.protocol))>0)
  and not exists(select 1 from private.document_complements r where r.source_id=p_id and r.child_id=c.id)),
 selected as (select * from eligible order by created_at,id limit p_size offset (p_page::bigint-1)*p_size)
 select (select count(*) from eligible),coalesce(jsonb_agg(private.complement_reference(s) order by s.created_at,s.id),'[]') into v_total,v_rows from selected s;
 return jsonb_build_object('sourceId',d.id,'sourceVersion',d.version,'type',p_type,'search',p_search,
  'page',p_page,'size',p_size,'total',v_total,'documents',v_rows);
end;$$;
create function public.link_document_complement(p_source uuid,p_child uuid,p_source_version integer,p_child_version integer,p_reason text,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare s public.operational_documents;c public.operational_documents;r private.document_complements;v_hash text;v_name text;begin
 perform public.operational_document(p_source);perform public.operational_document(p_child);
 select * into strict s from public.operational_documents where id=p_source;
 select * into strict c from public.operational_documents where id=p_child;
 if s.care_recipient_id<>c.care_recipient_id then raise exception 'same patient required' using errcode='42501';end if;
 if p_key is null or p_reason is null or length(btrim(p_reason)) not between 3 and 1000
  or p_source_version is null or p_source_version<1 or p_child_version is null or p_child_version<1 or p_source=p_child then
  raise exception 'invalid complement intention' using errcode='22023';end if;
 v_hash:=encode(extensions.digest(jsonb_build_object('source',p_source,'child',p_child,'sourceVersion',p_source_version,
  'childVersion',p_child_version,'reason',btrim(p_reason))::text,'sha256'),'hex');
 -- Keep the stock/workspace-before-document order used by native issuance/SCI.
 perform pg_advisory_xact_lock(hashtextextended('stock:'||s.care_recipient_id,0));
 perform pg_advisory_xact_lock(hashtextextended('document-complement:'||auth.uid()||':'||p_key,0));
 perform 1 from public.operational_documents where id in (p_source,p_child) order by id for update;
 perform public.operational_document(p_source);perform public.operational_document(p_child);
 select * into strict s from public.operational_documents where id=p_source;
 select * into strict c from public.operational_documents where id=p_child;
 select * into r from private.document_complements where actor_id=auth.uid() and idempotency_key=p_key;
 if found then
  if r.intent_hash<>v_hash then raise exception 'idempotency content mismatch' using errcode='23505';end if;
  return jsonb_build_object('link',private.document_complement_view(r,p_source),'key',p_key,'recovered',true);
 end if;
 if s.care_recipient_id<>c.care_recipient_id then raise exception 'same patient required' using errcode='42501';end if;
 if not private.may_link_complement(c) then raise exception 'complement issuer authority required' using errcode='42501';end if;
 if s.version<>p_source_version or c.version<>p_child_version then raise exception 'complement reference changed' using errcode='PT409';end if;
 if s.protocol is null or c.protocol is null or c.status in ('draft','cancelled','rejected')
  or private.document_issued_at(s.id) is null or private.document_issued_at(c.id) is null
  or private.document_issued_at(c.id)<=private.document_issued_at(s.id) then raise exception 'newer issued complement required' using errcode='22023';end if;
 if exists(select 1 from public.document_events where actor_id=auth.uid() and idempotency_key=p_key) then raise exception 'idempotency identity already used' using errcode='23505';end if;
 select full_name into v_name from public.profiles where id=auth.uid() and status='active';
 if v_name is null or btrim(v_name)='' then raise exception 'active identity required' using errcode='42501';end if;
 insert into private.document_complements(care_recipient_id,source_id,child_id,source_version,child_version,source_hash,child_hash,reason,actor_id,actor_name,idempotency_key,intent_hash)
 values(s.care_recipient_id,s.id,c.id,s.version,c.version,s.content_hash,c.content_hash,btrim(p_reason),auth.uid(),v_name,p_key,v_hash) returning * into r;
 update public.operational_documents set version=version+1 where id in (s.id,c.id);
 -- Opaque references keep financial/clinical peers out of the other's snapshot.
 perform private.record_document_event(c.id,lower(c.type)||'.complement_linked',jsonb_build_object('relationId',r.id),p_key);
 perform private.record_document_event(s.id,lower(s.type)||'.complement_added',jsonb_build_object('relationId',r.id),gen_random_uuid());
 perform public.operational_document(p_source);perform public.operational_document(p_child);
 if not private.may_link_complement(c) then raise exception 'complement authority changed' using errcode='42501';end if;
 return jsonb_build_object('link',private.document_complement_view(r,p_source),'key',p_key,'recovered',false);
end;$$;
revoke all on function private.document_issued_at(uuid) from public,anon,authenticated,service_role;
revoke all on function private.may_link_complement(public.operational_documents) from public,anon,authenticated,service_role;
revoke all on function private.complement_reference(public.operational_documents) from public,anon,authenticated,service_role;
revoke all on function private.document_complement_view(private.document_complements,uuid) from public,anon,authenticated,service_role;
revoke all on function public.document_complements(uuid,integer,integer) from public,anon,authenticated,service_role;
revoke all on function public.document_complement_candidates(uuid,text,text,integer,integer) from public,anon,authenticated,service_role;
revoke all on function public.link_document_complement(uuid,uuid,integer,integer,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.document_complements(uuid,integer,integer) to authenticated;
grant execute on function public.document_complement_candidates(uuid,text,text,integer,integer) to authenticated;
grant execute on function public.link_document_complement(uuid,uuid,integer,integer,text,uuid) to authenticated;
notify pgrst,'reload schema';
