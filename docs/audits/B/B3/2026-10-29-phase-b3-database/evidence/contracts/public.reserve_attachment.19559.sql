CREATE OR REPLACE FUNCTION public.reserve_attachment(p_patient uuid, p_document uuid, p_movement uuid, p_filename text, p_mime text, p_bytes bigint, p_key uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare d public.operational_documents;v public.attachments;v_id uuid:=gen_random_uuid();begin
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
end;$function$
