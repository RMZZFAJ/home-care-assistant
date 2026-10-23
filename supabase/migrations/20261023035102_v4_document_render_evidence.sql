-- Layout revisions are independent of immutable semantic document versions.
create table public.document_pdf_renders (
 document_id uuid not null references public.operational_documents(id),version integer not null,
 renderer integer not null check(renderer>=4),object_path text not null unique,
 sha256 text not null check(sha256~'^[a-f0-9]{64}$'),created_at timestamptz not null default now(),
 primary key(document_id,version,renderer)
);
alter table public.document_pdf_renders enable row level security;
revoke all on public.document_pdf_renders from public,anon,authenticated,service_role;
grant select on public.document_pdf_renders to authenticated;
create policy document_renders_read on public.document_pdf_renders for select to authenticated using(exists(select 1 from public.operational_documents where id=document_id));
create trigger immutable_pdf_render before update or delete on public.document_pdf_renders for each row execute function private.immutable_event();
create function public.register_document_render(p_document uuid,p_version integer,p_renderer integer,p_path text,p_hash text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare r public.document_pdf_renders;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'PDF worker required' using errcode='42501';end if;
 if p_path<>p_document::text||'/'||p_version||'/render-'||p_renderer||'.pdf' or not exists(select 1 from public.document_events where document_id=p_document and version=p_version)
 or not exists(select 1 from storage.objects where bucket_id='document-receipts' and name=p_path) then raise exception 'invalid PDF evidence';end if;
 insert into public.document_pdf_renders(document_id,version,renderer,object_path,sha256) values(p_document,p_version,p_renderer,p_path,p_hash) on conflict do nothing;
 select * into strict r from public.document_pdf_renders where document_id=p_document and version=p_version and renderer=p_renderer;
 if r.object_path<>p_path or r.sha256<>p_hash then raise exception 'immutable PDF artifact conflict';end if;
 return to_jsonb(r);
end;$$;
grant execute on function public.register_document_render(uuid,integer,integer,text,text) to service_role;

create function public.verify_document_integrity(p_id uuid,p_version integer,p_hash text) returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce(p_hash~'^[a-f0-9]{64}$' and exists(select 1 from public.document_events where document_id=p_id and version=p_version and content_hash=p_hash),false);
$$;
grant execute on function public.verify_document_integrity(uuid,integer,text) to anon,authenticated;

create or replace function private.science_snapshot() returns trigger language plpgsql security definer set search_path='' as $$
declare d public.operational_documents;begin
 select * into strict d from public.operational_documents where id=new.document_id;
 new.actor_name:=(select full_name from public.profiles where id=new.actor_id);
 new.authority_context:=case when new.actor_id is null then jsonb_build_object('mode','system') else coalesce(public.my_active_context(),(select jsonb_build_object('mode','verified_external','purpose',w.purpose) from private.worker_authority w where w.backend_pid=pg_backend_pid() and w.transaction_id=txid_current() and w.user_id=new.actor_id)) end;
 new.body:=new.body||jsonb_build_object('actorName',new.actor_name,'authority',new.authority_context,
 'history',coalesce((select jsonb_agg(jsonb_build_object('action',e.action,'actorName',coalesce(e.actor_name,e.body->>'actorName',case when e.actor_id is null then 'Sistema' else 'Identidade registrada no evento legado' end),'createdAt',e.created_at,'version',e.version) order by e.version) from public.document_events e where document_id=new.document_id),'[]')||jsonb_build_array(jsonb_build_object('action',new.action,'actorName',coalesce(new.actor_name,'Sistema'),'createdAt',new.created_at,'version',new.version)));
 if d.type='REQ' then
 if new.action='req.issued' then perform private.init_requisition_science(new.document_id);end if;
 new.body:=new.body||jsonb_build_object('sciencePolicy',(select to_jsonb(s) from public.requisition_lifecycle s where requisition_id=new.document_id),
 'scienceEvents',coalesce((select jsonb_agg(to_jsonb(e) order by e.created_at,e.id) from public.requisition_science_events e where requisition_id=new.document_id),'[]'),
 'fulfillmentLines',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'attended',exists(select 1 from public.document_request_links k join public.document_lines l on l.id=k.document_line_id join public.operational_documents x on x.id=l.document_id where k.requisition_item_id=i.id and x.type='ENT' and x.status<>'cancelled' and l.accepted_quantity>0))) from public.requisition_items i where i.requisition_id=d.id),'[]'));
 end if;
 new.content_hash:=encode(extensions.digest(new.body::text,'sha256'),'hex');
 update public.operational_documents set canonical_snapshot=new.body,content_hash=new.content_hash where id=new.document_id;
 return new;
end;$$;
