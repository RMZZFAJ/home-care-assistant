CREATE OR REPLACE FUNCTION private.register_legacy_requisition(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.requisitions;begin
 select * into strict r from public.requisitions where id=p_id;
 if exists(select 1 from public.operational_documents where id=p_id) then return;end if;
 insert into public.operational_documents(id,care_recipient_id,type,code,protocol,status,created_by,idempotency_key,payload,workflow_data,created_at)
 values(r.id,r.care_recipient_id,'REQ',r.protocol,r.protocol,coalesce(r.status::text,'historical'),r.created_by,coalesce(r.idempotency_key,r.id),
 jsonb_build_object('patientName',r.recipient_name_snapshot,'requesterName',r.requester_name_snapshot,'legacyReconstructed',true,'sourceCreatedAt',r.created_at,
 'intent',jsonb_build_object('observations',coalesce((select jsonb_agg(body) from public.requisition_observations where requisition_id=p_id),'[]'))),
 jsonb_build_object('legacyReconstructed',true),coalesce(r.created_at,now()));
 perform private.record_document_event(p_id,'req.legacy_imported',jsonb_build_object('source','preserved_history'),gen_random_uuid());
end;$function$
