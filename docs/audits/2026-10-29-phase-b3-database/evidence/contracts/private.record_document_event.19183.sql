CREATE OR REPLACE FUNCTION private.record_document_event(p_id uuid, p_action text, p_body jsonb, p_key uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d public.operational_documents;s jsonb;h text;actors jsonb;begin
 select * into strict d from public.operational_documents where id=p_id for update;
 actors:=jsonb_build_object('issuer',coalesce(d.canonical_snapshot->'actors'->'issuer',(select jsonb_build_object('id',id,'name',full_name,'registration',professional_registration,'state',professional_state,'category',professional_category) from public.profiles where id=d.created_by)),
 'recipient',(select jsonb_build_object('id',id,'name',full_name,'registration',professional_registration,'state',professional_state,'category',professional_category) from public.profiles where id=d.recipient_id),
 'patient',coalesce(d.canonical_snapshot->'actors'->'patient',(select jsonb_build_object('id',id,'name',display_name) from public.care_recipients where id=d.care_recipient_id)));
 s:=jsonb_build_object('schemaVersion',2,'id',d.id,'careRecipientId',d.care_recipient_id,'type',d.type,'code',d.code,'protocol',d.protocol,'createdAt',d.created_at,
 'status',d.status,'createdBy',d.created_by,'recipientId',d.recipient_id,'actors',actors,'payload',d.payload,'workflow',d.workflow_data,
 'lines',case when d.type='REQ' then coalesce((select jsonb_agg(to_jsonb(i) order by i.id) from public.requisition_items i where requisition_id=d.id),'[]') else coalesce((select jsonb_agg(to_jsonb(l) order by l.product_id) from public.document_lines l where document_id=p_id),'[]') end,
 'approvals',coalesce((select jsonb_agg(to_jsonb(a)) from public.bal_approvals a where document_id=p_id),'[]'),
 'itemResolutions',coalesce((select jsonb_agg(to_jsonb(r) order by r.id) from public.requisition_item_resolutions r join public.requisition_items i on i.id=r.requisition_item_id where i.requisition_id=p_id),'[]'),
 'requestLinks',coalesce((select jsonb_agg(to_jsonb(k)) from public.document_request_links k join public.document_lines l on l.id=k.document_line_id where l.document_id=p_id),'[]'),
 'attachments',coalesce((select jsonb_agg(jsonb_build_object('id',id,'filename',filename,'sha256',sha256,'bytes',bytes)) from public.attachments where document_id=p_id and state='ready'),'[]'),
 'version',d.version,'action',p_action,'event',p_body,'previousHash',d.content_hash);
 h:=encode(extensions.digest(s::text,'sha256'),'hex');
 update public.operational_documents set canonical_snapshot=s,content_hash=h,updated_at=now() where id=p_id;
 insert into public.document_events(document_id,care_recipient_id,version,action,actor_id,body,content_hash,idempotency_key) values(p_id,d.care_recipient_id,d.version,p_action,auth.uid(),s,h,p_key);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),p_action,'document',p_id,jsonb_build_object('care_recipient_id',d.care_recipient_id,'type',d.type,'version',d.version));
end;$function$
