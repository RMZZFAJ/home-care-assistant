CREATE OR REPLACE FUNCTION public.v3_revise_supply_document(p_id uuid, p_payload jsonb, p_key uuid, p_version integer, p_recount boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d public.operational_documents;e public.document_events;x jsonb;p public.care_recipient_products;q numeric;l_id uuid;r_id uuid;p_patient uuid;p_type text;begin
 select * into strict d from public.operational_documents where id=p_id;
 p_patient:=d.care_recipient_id;p_type:=d.type;
 perform private.require_cap(p_patient,case d.type when 'BAL' then 'bal.count' else lower(d.type)||'.create' end);
 if d.created_by<>auth.uid() and not public.can_manage_recipient(p_patient) and not (d.type='BAL' and exists(select 1 from public.bal_cycles where document_id=p_id) and private.bal_count_context(p_patient,p_id,p_payload) is not null) then raise exception 'draft owner required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
 select * into strict d from public.operational_documents where id=p_id for update;
 select * into e from public.document_events where actor_id=auth.uid() and idempotency_key=p_key;
 if found then if e.document_id<>p_id or e.body->'event'<>p_payload then raise exception 'idempotency conflict' using errcode='23505';end if;return public.operational_document(p_id);end if;
 if p_key is null or p_version is null or d.version<>p_version then raise exception 'stale document version' using errcode='P0001';end if;
 if not(d.status='draft' or p_recount and d.type='BAL' and d.status='submitted') or d.type='REQ' then raise exception 'only drafts or pending BAL may be revised';end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or jsonb_typeof(p_payload->'lines') is distinct from 'array' or jsonb_array_length(p_payload->'lines') not between 1 and 1000 then raise exception 'invalid draft lines';end if;
 if d.type='ENT' and (not private.user_can(p_patient,(p_payload->>'recipientId')::uuid,'ent.receive') or (p_payload->>'recipientId')::uuid=d.created_by or coalesce(p_payload->>'source','') not in ('FAMILY','CARE_TEAM') or coalesce(p_payload->>'destination','') not in ('FAMILY','CARE_TEAM') or p_payload->>'source'=p_payload->>'destination') then raise exception 'invalid ENT recipient or custody';end if;
 delete from public.document_request_links where document_line_id in(select id from public.document_lines where document_id=p_id);
 delete from public.document_lines where document_id=p_id;
 for x in select value from jsonb_array_elements(p_payload->'lines') loop
 select * into p from public.care_recipient_products where care_recipient_id=p_patient and product_id=x->>'productId' and is_active;
 if not found then raise exception 'invalid patient catalogue product';end if;
 q:=(x->>'quantity')::numeric;
 if q is null or q<0 or (p_type<>'BAL' and q=0) or q>1000000000 or q<>round(q,p.quantity_decimals) then raise exception 'invalid product quantity';end if;
 insert into public.document_lines(document_id,care_recipient_id,product_id,name_snapshot,unit_snapshot,category_snapshot,quantity,approved_quantity,metadata)
 values(p_id,p_patient,p.product_id,p.name,p.unit,p.category::text,q,case when p_type='COM' and public.recipient_role(p_patient)='admin' then q else 0 end,
 case when p_type='BAL' then jsonb_build_object('expectedQuantity',private.stock_quantity(p_patient,p.product_id,'CARE_TEAM')) else coalesce(x->'metadata','{}') end) returning id into l_id;
 for r_id in select value::text::uuid from jsonb_array_elements_text(coalesce(x->'requisitionItemIds','[]')) loop
 if not exists(select 1 from public.requisition_items i join public.requisitions r on r.id=i.requisition_id where i.id=r_id and i.care_recipient_id=p_patient and private.effective_requisition_product(i.id)=p.product_id and r.status<>'cancelled') then raise exception 'invalid requisition line link';end if;
 insert into public.document_request_links values(l_id,r_id);
 end loop;
 end loop;
 if p_type='BAL' and (select count(*) from public.document_lines where document_id=p_id)<>(select count(*) from public.care_recipient_products where care_recipient_id=p_patient and is_active) then raise exception 'count every active catalogue product';end if;

 update public.operational_documents set payload=p_payload,recipient_id=case when type='ENT' then (p_payload->>'recipientId')::uuid else recipient_id end,version=version+1,
 workflow_data=case when type='BAL' then workflow_data||jsonb_build_object('referenceRevision',case when p_recount then private.team_revision(p_patient) else (workflow_data->>'referenceRevision')::bigint end,'countVersion',coalesce((workflow_data->>'countVersion')::integer,0)+1) else workflow_data end where id=p_id;
 perform private.record_document_event(p_id,lower(d.type)||case when p_recount then '.recount' else '.draft_updated' end,p_payload,p_key);
 return public.operational_document(p_id);
end;$function$
