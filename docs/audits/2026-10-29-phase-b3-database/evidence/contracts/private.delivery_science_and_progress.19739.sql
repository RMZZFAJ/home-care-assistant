CREATE OR REPLACE FUNCTION private.delivery_science_and_progress()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d public.operational_documents;r record;s public.requisition_lifecycle;begin
 select * into d from public.operational_documents where id=new.document_id;
 if d.type<>'ENT' then return new;end if;
 for r in select distinct i.requisition_id from public.document_request_links k join public.document_lines l on l.id=k.document_line_id join public.requisition_items i on i.id=k.requisition_item_id where l.document_id=d.id loop
 select * into s from public.requisition_lifecycle where requisition_id=r.requisition_id;
 if new.action in ('ent.issued','ent.submit') and coalesce((s.policy->>'scienceByDispatch')::boolean,true)
 and d.status='pending_receipt' and auth.uid()=d.created_by and auth.uid()=any(s.eligible_users) then
 perform private.record_science(r.requisition_id,auth.uid(),'dispatch',jsonb_build_object('deliveryId',d.id,'deliveryVersion',new.version,'sessionId',private.auth_session()));end if;
 perform private.refresh_requisition_lifecycle(r.requisition_id);
 end loop;return new;
end;$function$
