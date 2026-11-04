CREATE OR REPLACE FUNCTION public.finalize_attachment(p_id uuid, p_actor uuid, p_hash text, p_mime text, p_bytes bigint, p_valid boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare a public.attachments;begin
 if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'server validation required' using errcode='42501';end if;
 select * into strict a from public.attachments where id=p_id for update;
 if not exists(select 1 from public.profiles where id=p_actor and status='active') or not (case when a.document_id is not null then private.user_can(a.care_recipient_id,p_actor,(select lower(type)||'.read' from public.operational_documents where id=a.document_id)) else private.user_can(a.care_recipient_id,p_actor,'stock.family.manage') end) then raise exception 'evidence permission revoked' using errcode='42501';end if;
 if p_hash is null or p_valid is null or a.uploaded_by<>p_actor or a.bytes<>p_bytes or a.mime_type<>p_mime or p_hash!~'^[a-f0-9]{64}$' then raise exception 'attachment integrity mismatch';end if;
 if a.state<>'quarantine' then if a.sha256<>p_hash then raise exception 'immutable attachment';end if;return;end if;
 update public.attachments set state=case when p_valid then 'ready' else 'rejected' end,sha256=p_hash,confirmed_at=now() where id=p_id;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(p_actor,case when p_valid then 'attachment.validated' else 'attachment.rejected' end,'attachment',p_id,jsonb_build_object('care_recipient_id',a.care_recipient_id,'document_id',a.document_id,'sha256',p_hash));
end;$function$
