CREATE OR REPLACE FUNCTION public.v3_create_supply_document(p_patient uuid, p_type text, p_payload jsonb, p_key uuid, p_draft boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d public.operational_documents;x jsonb;p public.care_recipient_products;q numeric;l_id uuid;r_id uuid;s jsonb;v_cap text;v_recipient uuid;
begin
 if p_type not in ('COM','ENT','BAL') or p_key is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'invalid document';end if;
 v_cap:=case p_type when 'COM' then 'com.create' when 'ENT' then 'ent.create' else 'bal.count' end;
 perform private.require_cap(p_patient,v_cap);
 perform pg_advisory_xact_lock(hashtextextended('stock:'||p_patient,0));
 perform pg_advisory_xact_lock(hashtextextended('document:'||auth.uid()||':'||p_key,0));
 select * into d from public.operational_documents where created_by=auth.uid() and idempotency_key=p_key;
 if found then
 if d.care_recipient_id<>p_patient or d.type<>p_type or d.payload<>p_payload then raise exception 'idempotency conflict' using errcode='23505';end if;
 return public.operational_document(d.id);end if;
 if jsonb_typeof(p_payload->'lines') is distinct from 'array' or jsonb_array_length(p_payload->'lines') not between 1 and 1000 then raise exception 'invalid lines';end if;
 if p_type='ENT' then
 if coalesce(p_payload->>'source','') not in ('FAMILY','CARE_TEAM') or coalesce(p_payload->>'destination','') not in ('FAMILY','CARE_TEAM') or p_payload->>'source'=p_payload->>'destination' then raise exception 'invalid custody';end if;
 v_recipient:=(p_payload->>'recipientId')::uuid;
 if v_recipient is null or not private.user_can(p_patient,v_recipient,'ent.receive') or v_recipient=auth.uid() or not exists(select 1 from public.care_recipient_memberships m join public.profiles a on a.id=m.user_id where m.care_recipient_id=p_patient and m.user_id=v_recipient and m.status='active' and a.status='active'
 and (m.role::text in (case when p_payload->>'destination'='FAMILY' then 'family' else 'professional' end,'admin') or p_payload->>'destination'='CARE_TEAM' and m.role::text='supervisor')) then raise exception 'invalid designated recipient';end if;
 end if;
 insert into public.patient_settings(care_recipient_id) values(p_patient) on conflict do nothing;
 select settings into s from public.patient_settings where care_recipient_id=p_patient;
 insert into public.operational_documents(care_recipient_id,type,created_by,recipient_id,idempotency_key,payload,status,workflow_data)
 values(p_patient,p_type,auth.uid(),v_recipient,p_key,p_payload,'draft',case when p_type='BAL' then jsonb_build_object('referenceRevision',private.team_revision(p_patient),'countVersion',1,'reviewPolicy',s) else '{}' end) returning * into d;
 for x in select value from jsonb_array_elements(p_payload->'lines') loop
 select * into p from public.care_recipient_products where care_recipient_id=p_patient and product_id=x->>'productId' and is_active;
 if not found then raise exception 'invalid patient catalogue product';end if;
 q:=(x->>'quantity')::numeric;
 if q is null or q<0 or (p_type<>'BAL' and q=0) or q>1000000000 or q<>round(q,p.quantity_decimals) then raise exception 'invalid product quantity';end if;
 insert into public.document_lines(document_id,care_recipient_id,product_id,name_snapshot,unit_snapshot,category_snapshot,quantity,approved_quantity,metadata)
 values(d.id,p_patient,p.product_id,p.name,p.unit,p.category::text,q,case when p_type='COM' and public.recipient_role(p_patient)='admin' then q else 0 end,
 case when p_type='BAL' then jsonb_build_object('expectedQuantity',private.stock_quantity(p_patient,p.product_id,'CARE_TEAM')) else coalesce(x->'metadata','{}') end) returning id into l_id;
 for r_id in select value::text::uuid from jsonb_array_elements_text(coalesce(x->'requisitionItemIds','[]')) loop
 if not exists(select 1 from public.requisition_items i join public.requisitions r on r.id=i.requisition_id where i.id=r_id and i.care_recipient_id=p_patient and private.effective_requisition_product(i.id)=p.product_id and r.status<>'cancelled') then raise exception 'invalid requisition line link';end if;
 insert into public.document_request_links values(l_id,r_id);
 end loop;
 end loop;
 if p_type='BAL' and (select count(*) from public.document_lines where document_id=d.id)<>(select count(*) from public.care_recipient_products where care_recipient_id=p_patient and is_active) then raise exception 'count every active catalogue product';end if;
 if not p_draft then
 perform private.emit_document(d.id);
 update public.operational_documents set status=case p_type when 'COM' then case when public.recipient_role(p_patient)='admin' then 'approved' else 'pending_approval' end when 'ENT' then 'pending_receipt' else 'submitted' end where id=d.id;
 if p_type='ENT' then for x in select to_jsonb(l) from public.document_lines l where document_id=d.id order by product_id loop
 perform private.move_stock(p_patient,x->>'product_id',(x->>'quantity')::numeric,p_payload->>'source','TRANSIT','Expedição ENT','document',d.id);end loop;end if;
 if p_type='BAL' and s->>'balReview'='optional' then perform private.apply_bal(d.id);end if;
 end if;
 perform private.record_document_event(d.id,lower(p_type)||case when p_draft then '.draft' else '.issued' end,p_payload,p_key);
 return public.operational_document(d.id);
end;$function$
