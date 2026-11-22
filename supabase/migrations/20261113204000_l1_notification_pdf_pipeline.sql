-- Automatic document attachments use the same immutable issuance/signature pipeline.
-- The principal is the validated leased notification, never a fabricated human session.
alter table private.pdf_issuances alter column requested_by drop not null;
alter table private.pdf_issuances alter column requested_session drop not null;
alter table private.pdf_issuances add column notification_id uuid unique references public.requisition_notifications(id);
alter table private.pdf_issuances add constraint pdf_principal check (
 (notification_id is null and requested_by is not null and requested_session is not null) or
 (notification_id is not null and requested_by is null and requested_session is null));
create table private.pdf_notification_authority (
 backend_pid integer not null, transaction_id bigint not null, notification_id uuid not null,
 document_id uuid not null, primary key(backend_pid,transaction_id)
);
alter table private.pdf_notification_authority enable row level security;
revoke all on private.pdf_notification_authority from public,anon,authenticated,service_role;
create function private.has_pdf_notification_authority(p_document uuid,p_notification uuid default null) returns boolean
language sql stable security definer set search_path='' as $$
 select auth.role()='service_role' and exists(select 1 from private.pdf_notification_authority a
 where a.backend_pid=pg_backend_pid() and a.transaction_id=txid_current() and a.document_id=p_document
 and (p_notification is null or a.notification_id=p_notification));
$$;
revoke all on function private.has_pdf_notification_authority(uuid,uuid) from public,anon,authenticated,service_role;
do $l1$
declare definition text;signature text;anchor text;
begin
 definition:=pg_get_functiondef('private.require_pdf_document(uuid)'::regprocedure);
 anchor:='perform private.require_cap(d.care_recipient_id,lower(d.type)||''.read'');';
 if position(anchor in definition)=0 then raise exception 'PDF document authority drift';end if;
 execute replace(definition,anchor,'if not private.has_pdf_notification_authority(d.id) then '||anchor||'end if;');
 definition:=pg_get_functiondef('private.require_pdf_issuance_access(private.pdf_issuances)'::regprocedure);
 anchor:='begin';
 execute replace(definition,anchor,anchor||' if r.notification_id is not null and private.has_pdf_notification_authority(r.document_id,r.notification_id) then return;end if;');
 foreach signature in array array['private.require_pdf_lease(uuid,text)','public.complete_pdf_issuance(uuid,text,text,integer,jsonb,text,text)'] loop
  definition:=pg_get_functiondef(signature::regprocedure);
  anchor:='requested_by=auth.uid()';
  if position(anchor in definition)=0 then raise exception 'PDF requester authority drift';end if;
  execute replace(definition,anchor,'(requested_by=auth.uid() or (notification_id is not null and private.has_pdf_notification_authority(document_id,notification_id)))');
 end loop;
 definition:=pg_get_functiondef('private.guard_pdf_issuance()'::regprocedure);
 execute replace(replace(definition,'if tg_op=','if new.notification_id is distinct from old.notification_id then raise exception ''immutable PDF principal'' using errcode=''42501'';end if; if tg_op='),'if TG_OP=','if new.notification_id is distinct from old.notification_id then raise exception ''immutable PDF principal'' using errcode=''42501'';end if; if TG_OP=');
end;$l1$;

create function public.notification_pdf(p_notification uuid,p_worker uuid,p_action text,p_args jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare n public.requisition_notifications;d public.operational_documents;e public.document_events;
 r private.pdf_issuances;result jsonb;new_id uuid:=gen_random_uuid();
begin
 if auth.role() is distinct from 'service_role' or not public.validate_notification_job(p_notification,p_worker)
 then raise exception 'valid notification worker required' using errcode='42501';end if;
 select * into strict n from public.requisition_notifications where id=p_notification;
 select * into d from public.operational_documents where id=coalesce(n.document_id,n.requisition_id);
 if not found or not n.include_pdf or d.protocol is null then raise exception 'issued notification document required' using errcode='22023';end if;
 insert into private.pdf_notification_authority values(pg_backend_pid(),txid_current(),n.id,d.id)
 on conflict(backend_pid,transaction_id) do update set notification_id=excluded.notification_id,document_id=excluded.document_id;
 if p_action='reserve' then
  if p_args<>'{}'::jsonb then raise exception 'invalid notification PDF intention' using errcode='22023';end if;
  perform pg_advisory_xact_lock(hashtextextended('notification-pdf:'||n.id,0));
  select * into r from private.pdf_issuances where notification_id=n.id;
  if not found then
   if n.document_event_id is not null then select * into e from public.document_events where id=n.document_event_id and document_id=d.id;
   else select * into e from public.document_events where document_id=d.id order by version limit 1;end if;
   if e.id is null or nullif(e.body->>'protocol','') is null then raise exception 'issued notification source required' using errcode='22023';end if;
   insert into private.pdf_issuances(id,document_id,version,care_recipient_id,requested_by,requested_name,requested_session,
    idempotency_key,request_hash,verification_code,renderer_revision,representation,source_hash,snapshot,object_path,notification_id)
   values(new_id,d.id,e.version,d.care_recipient_id,null,'Sistema · comunicação documental',null,n.id,
    encode(extensions.digest(jsonb_build_array('notification-pdf',n.id,d.id,e.version)::text,'sha256'),'hex'),
    upper(encode(extensions.gen_random_bytes(16),'hex')),16,
    case when e.version<>d.version or coalesce((e.body->>'isHistorical')::boolean,false) then 'derived' else 'operational' end,
    e.content_hash,e.body,'issuances/'||d.id||'/'||new_id||'.pdf',n.id) returning * into r;
  end if;
 elsif p_action in ('read','stage','complete') then
  select * into r from private.pdf_issuances where id=(p_args->>'p_id')::uuid and notification_id=n.id;
  if not found then raise exception 'notification PDF unavailable' using errcode='42501';end if;
 else raise exception 'invalid notification PDF action' using errcode='22023';end if;
 if p_action in ('reserve','read') then result:=public.pdf_issuance(r.id);
 elsif p_action='stage' then result:=public.pdf_issuance_stage(r.id,p_args->>'p_token',p_args->>'p_step',p_args->>'p_error');
 else result:=public.complete_pdf_issuance(r.id,p_args->>'p_token',p_args->>'p_hash',(p_args->>'p_size')::integer,p_args->'p_validation',p_args->>'p_key_version',p_args->>'p_trust_revision');end if;
 if not public.validate_notification_job(p_notification,p_worker) then raise exception 'notification authority changed' using errcode='42501';end if;
 delete from private.pdf_notification_authority where backend_pid=pg_backend_pid() and transaction_id=txid_current();
 return result;
end;$$;
revoke all on function public.notification_pdf(uuid,uuid,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.notification_pdf(uuid,uuid,text,jsonb) to service_role;
