-- Complementary progress never changes a documentary version or its effects.
insert into public.capability_definitions(code,default_roles,critical)
values ('document.progress.create',array['admin','family','supervisor','professional'],false);

create table private.document_progress_notes (
 id uuid primary key default gen_random_uuid(),
 document_id uuid not null references public.operational_documents(id),
 care_recipient_id uuid not null references public.care_recipients(id),
 author_id uuid not null references public.profiles(id),
 author_name text not null check(length(btrim(author_name))>0),
 recorded_at timestamptz not null default clock_timestamp(),
 category text not null check(category in ('record','action','contact','pending')),
 stage text check(stage in ('issuance','family_science','fulfillment','completion','acquisition','dispatch','receipt','count','review')),
 body text not null check(length(btrim(body))>0 and private.bal_comment_units(body)<=2000),
 reference_ids uuid[] not null default '{}' check(cardinality(reference_ids)<=8 and array_position(reference_ids,null) is null),
 idempotency_key uuid not null,
 intent_hash text not null check(intent_hash ~ '^[0-9a-f]{64}$'),
 unique(author_id,idempotency_key)
);
create index document_progress_notes_document_order on private.document_progress_notes(document_id,recorded_at,id);
create index document_progress_notes_patient on private.document_progress_notes(care_recipient_id);
alter table private.document_progress_notes enable row level security;
create policy document_progress_notes_read on private.document_progress_notes for select to authenticated
 using (private.can(care_recipient_id,(select lower(type)||'.read' from public.operational_documents where id=document_id)));
revoke all on private.document_progress_notes from public,anon,authenticated,service_role;
create trigger document_progress_invalidation after insert on private.document_progress_notes
 for each row execute function private.invalidate_workspace();

create function private.preserve_document_progress_note() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'progress records are append only' using errcode='42501';end;$$;
revoke all on function private.preserve_document_progress_note() from public,anon,authenticated,service_role;
create trigger preserve_document_progress_note before update or delete on private.document_progress_notes
 for each row execute function private.preserve_document_progress_note();

create function private.progress_note_view(p private.document_progress_notes) returns jsonb
language sql stable set search_path='' as $$
 select jsonb_build_object('id',p.id,'source','manual','documentId',p.document_id,'recordedAt',p.recorded_at,
  'authorId',p.author_id,'authorName',p.author_name,'category',p.category,'stage',p.stage,'text',p.body,
  'references',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'code',d.code,'type',d.type) order by r.position)
   from unnest(p.reference_ids) with ordinality r(id,position) join public.operational_documents d on d.id=r.id
   where d.care_recipient_id=p.care_recipient_id and private.can(d.care_recipient_id,lower(d.type)||'.read')),'[]'::jsonb));
$$;
revoke all on function private.progress_note_view(private.document_progress_notes) from public,anon,authenticated,service_role;

create function public.document_progress_publish(p_document uuid,p_key uuid,p_body jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare d public.operational_documents; n private.document_progress_notes; v_hash text; v_name text; v_refs uuid[]; ref uuid;
begin
 if private.auth_session() is null then raise exception 'active identity required' using errcode='42501';end if;
 select * into d from public.operational_documents where id=p_document;
 if not found or not private.can(d.care_recipient_id,lower(d.type)||'.read') then
  raise exception 'document not found' using errcode='42501';end if;
 if p_key is null or coalesce(jsonb_typeof(p_body),'')<>'object'
  or p_body-array['category','stage','text','references']<>'{}'::jsonb
  or coalesce(jsonb_typeof(p_body->'category'),'')<>'string'
  or coalesce(p_body->>'category','') not in ('record','action','contact','pending')
  or coalesce(jsonb_typeof(p_body->'text'),'')<>'string' or length(btrim(p_body->>'text'))=0
  or private.bal_comment_units(p_body->>'text')>2000
  or coalesce(jsonb_typeof(p_body->'references'),'')<>'array'
  or jsonb_array_length(p_body->'references')>8
  or (p_body->'stage' is distinct from 'null'::jsonb and coalesce(jsonb_typeof(p_body->'stage'),'')<>'string') then
  raise exception 'invalid progress payload' using errcode='22023';end if;
 if p_body->>'stage' is not null and not (p_body->>'stage'=any(case d.type
   when 'REQ' then array['issuance','family_science','fulfillment','completion']
   when 'COM' then array['issuance','acquisition','receipt','completion']
   when 'ENT' then array['issuance','dispatch','receipt','completion']
   else array['issuance','count','review','completion'] end)) then
  raise exception 'invalid progress stage' using errcode='22023';end if;
 if exists(select 1 from jsonb_array_elements(p_body->'references') v where jsonb_typeof(v)<>'string'
  or (v#>>'{}') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$') then
  raise exception 'invalid progress references' using errcode='22023';end if;
 select coalesce(array_agg((v#>>'{}')::uuid order by pos),'{}'::uuid[]) into v_refs
 from jsonb_array_elements(p_body->'references') with ordinality x(v,pos);
 if (select count(distinct v) from unnest(v_refs) v)<>cardinality(v_refs) then
  raise exception 'duplicate progress references' using errcode='22023';end if;
 v_hash:=encode(extensions.digest(jsonb_build_object('documentId',p_document,'content',p_body)::text,'sha256'),'hex');
 perform pg_advisory_xact_lock(hashtextextended('document-progress:'||auth.uid()||':'||p_key,0));
 select * into n from private.document_progress_notes where author_id=auth.uid() and idempotency_key=p_key;
 if found then
  if n.intent_hash<>v_hash then raise exception 'idempotency content mismatch' using errcode='22023';end if;
  return jsonb_build_object('note',private.progress_note_view(n),'key',p_key,'intentHash',v_hash,'recovered',true);
 end if;
 perform private.require_cap(d.care_recipient_id,'document.progress.create');
 foreach ref in array v_refs loop
  if not exists(select 1 from public.operational_documents r where r.id=ref and r.care_recipient_id=d.care_recipient_id
   and private.can(r.care_recipient_id,lower(r.type)||'.read')) then
   raise exception 'progress reference not authorized' using errcode='42501';end if;
 end loop;
 select full_name into v_name from public.profiles where id=auth.uid() and status='active';
 if v_name is null or btrim(v_name)='' then raise exception 'active identity required' using errcode='42501';end if;
 insert into private.document_progress_notes(document_id,care_recipient_id,author_id,author_name,category,stage,body,reference_ids,idempotency_key,intent_hash)
 values(d.id,d.care_recipient_id,auth.uid(),v_name,p_body->>'category',p_body->>'stage',p_body->>'text',v_refs,p_key,v_hash) returning * into n;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
 values(auth.uid(),'document.progress.created','document_progress',n.id,
  jsonb_build_object('care_recipient_id',d.care_recipient_id,'document_id',d.id,'category',n.category,'stage',n.stage));
 return jsonb_build_object('note',private.progress_note_view(n),'key',p_key,'intentHash',v_hash,'recovered',false);
end;$$;
revoke all on function public.document_progress_publish(uuid,uuid,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.document_progress_publish(uuid,uuid,jsonb) to authenticated;

create function public.document_progress(p_document uuid,p_filter text default 'all',p_page integer default 1,p_size integer default 20) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare d public.operational_documents; v_total bigint; v_rows jsonb;
begin
 if private.auth_session() is null then raise exception 'active identity required' using errcode='42501';end if;
 select * into d from public.operational_documents where id=p_document;
 if not found or not private.can(d.care_recipient_id,lower(d.type)||'.read') then
  raise exception 'document not found' using errcode='42501';end if;
 if p_filter is null or p_filter not in ('all','automatic','manual') or p_page is null or p_page<1 or p_page>1000000
  or p_size is null or p_size<1 or p_size>50 then raise exception 'invalid progress page' using errcode='22023';end if;
 -- This explicit list contains documentary facts, not arbitrary audit logs,
 -- notification attempts, opening receipts or scheduler reminders.
 with facts as (
  select e.id,e.created_at recorded_at,'automatic'::text source,e.action,e.version,e.actor_id,e.actor_name
  from public.document_events e where e.document_id=p_document and e.action=any(array[
   'req.issued','req.legacy_imported','req.science_recorded','req.science_satisfied','req.item_resolved',
   'req.completed','req.fulfillment_updated','req.reopened','req.archived.manual','req.archived.automatic','req.remaining_need_declared',
   'com.draft','com.issued','com.submit','com.approve','com.purchase','com.receive','com.validate_receipt','com.reject_receipt','com.close_expectation',
   'ent.draft','ent.issued','ent.submit','ent.reassign','ent.receive','ent.resolve','ent.cancel','ent.consent_cancel','ent.refuse_cancellation',
   'ent.withdraw_cancellation','ent.propose_regularization','ent.record_regularization_finding','ent.review_regularization','ent.withdraw_regularization',
   'ent.transfer.declared','ent.transfer.agreed','ent.transfer.declined','ent.transfer.withdrawn',
   'bal.draft','bal.issued','bal.submit','bal.approve','bal.recount'])
 ), timeline as (
  select id,recorded_at,source,action,version,actor_id,actor_name from facts where p_filter<>'manual'
  union all select id,recorded_at,'manual',null,null,author_id,author_name from private.document_progress_notes where document_id=p_document and p_filter<>'automatic'
 ), selected as (select * from timeline order by recorded_at,id limit p_size offset ((p_page::bigint-1)*p_size))
 select (select count(*) from timeline),coalesce(jsonb_agg(case when s.source='manual' then private.progress_note_view(n)
  else jsonb_build_object('id',s.id,'source','automatic','documentId',p_document,'recordedAt',s.recorded_at,
   'action',s.action,'version',s.version,'authorId',s.actor_id,'authorName',s.actor_name) end order by s.recorded_at,s.id),'[]'::jsonb)
 into v_total,v_rows from selected s left join private.document_progress_notes n on s.source='manual' and n.id=s.id;
 return jsonb_build_object('documentId',p_document,'documentType',d.type,'filter',p_filter,'page',p_page,'size',p_size,'total',v_total,
  'canPublish',private.can(d.care_recipient_id,'document.progress.create') and exists(select 1 from public.care_recipients where id=d.care_recipient_id and is_active),'data',v_rows);
end;$$;
revoke all on function public.document_progress(uuid,text,integer,integer) from public,anon,authenticated,service_role;
grant execute on function public.document_progress(uuid,text,integer,integer) to authenticated;
