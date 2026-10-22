-- Upload retries use the same reservation and immutable object.
alter table public.attachments add column upload_key uuid;
create unique index attachment_upload_once on public.attachments(uploaded_by,upload_key) where upload_key is not null;
drop function public.reserve_attachment(uuid,uuid,uuid,text,text,bigint);
create function public.reserve_attachment(p_patient uuid,p_document uuid,p_movement uuid,p_filename text,p_mime text,p_bytes bigint,p_key uuid) returns jsonb
language plpgsql security definer set search_path='' as $$declare d public.operational_documents;v public.attachments;v_id uuid:=gen_random_uuid();begin
 if p_key is null then raise exception 'attachment key required';end if;
 if num_nonnulls(p_document,p_movement)<>1 or p_mime not in ('image/jpeg','image/png','image/webp','application/pdf') or p_bytes not between 1 and 10485760 or length(p_filename) not between 1 and 180 then raise exception 'invalid attachment';end if;
 if p_document is not null then
 select * into d from public.operational_documents where id=p_document and care_recipient_id=p_patient;
 if not found then raise exception 'document not found';end if;
 perform private.require_cap(p_patient,lower(d.type)||'.read');
 if not (d.created_by=auth.uid() or d.recipient_id=auth.uid() or public.can_manage_recipient(p_patient) or d.type='BAL' and private.can(p_patient,'bal.count')) then raise exception 'attachment write not authorized' using errcode='42501';end if;
 else
 perform private.require_cap(p_patient,'stock.family.manage');
 if not exists(select 1 from public.stock_movements where id=p_movement and care_recipient_id=p_patient and reference_type='family_manual') then raise exception 'invalid movement';end if;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('attachments:'||coalesce(p_document,p_movement),0));
 select * into v from public.attachments where uploaded_by=auth.uid() and upload_key=p_key;
 if found then
 if v.care_recipient_id<>p_patient or v.document_id is distinct from p_document or v.movement_id is distinct from p_movement or v.filename<>p_filename or v.mime_type<>p_mime or v.bytes<>p_bytes then raise exception 'attachment idempotency conflict' using errcode='23505';end if;return to_jsonb(v);
 end if;
 if (select count(*) from public.attachments where coalesce(document_id,movement_id)=coalesce(p_document,p_movement) and state<>'rejected')>=10 then raise exception 'attachment limit reached';end if;
 insert into public.attachments(id,care_recipient_id,document_id,movement_id,uploaded_by,filename,mime_type,bytes,object_path,upload_key)
 values(v_id,p_patient,p_document,p_movement,auth.uid(),p_filename,p_mime,p_bytes,p_patient||'/'||auth.uid()||'/'||v_id||'/original',p_key) returning * into v;return to_jsonb(v);
end;$$;
grant execute on function public.reserve_attachment(uuid,uuid,uuid,text,text,bigint,uuid) to authenticated;
create or replace function private.attachment_read(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.attachments a left join public.operational_documents d on d.id=a.document_id where a.id=p_id and
 case when d.id is not null then private.can(a.care_recipient_id,lower(d.type)||'.read') else private.can(a.care_recipient_id,'stock.family.read') end
 and (a.state='ready' or a.uploaded_by=auth.uid()));
$$;
create or replace function public.finalize_attachment(p_id uuid,p_actor uuid,p_hash text,p_mime text,p_bytes bigint,p_valid boolean) returns void
language plpgsql security definer set search_path='' as $$declare a public.attachments;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'server validation required' using errcode='42501';end if;
 select * into strict a from public.attachments where id=p_id for update;
 if not exists(select 1 from public.profiles where id=p_actor and status='active') or not (case when a.document_id is not null then private.user_can(a.care_recipient_id,p_actor,(select lower(type)||'.read' from public.operational_documents where id=a.document_id)) else private.user_can(a.care_recipient_id,p_actor,'stock.family.manage') end) then raise exception 'evidence permission revoked' using errcode='42501';end if;
 if p_hash is null or p_valid is null or a.uploaded_by<>p_actor or a.bytes<>p_bytes or a.mime_type<>p_mime or p_hash!~'^[a-f0-9]{64}$' then raise exception 'attachment integrity mismatch';end if;
 if a.state<>'quarantine' then if a.sha256<>p_hash then raise exception 'immutable attachment';end if;return;end if;
 update public.attachments set state=case when p_valid then 'ready' else 'rejected' end,sha256=p_hash,confirmed_at=now() where id=p_id;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(p_actor,case when p_valid then 'attachment.validated' else 'attachment.rejected' end,'attachment',p_id,jsonb_build_object('care_recipient_id',a.care_recipient_id,'document_id',a.document_id,'sha256',p_hash));
end;$$;
-- All official family operations, including global administration, use nonnegative ledger rules.
revoke execute on function public.extraordinary_stock_adjustment(uuid,text,integer,text,text,boolean,uuid) from authenticated,service_role;

