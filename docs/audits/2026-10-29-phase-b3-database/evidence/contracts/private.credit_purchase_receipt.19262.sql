CREATE OR REPLACE FUNCTION private.credit_purchase_receipt(p_receipt uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare r public.purchase_receipts;d public.operational_documents;x jsonb;l public.document_lines;q numeric;begin
 select * into strict r from public.purchase_receipts where id=p_receipt for update;
 if r.state='approved' then return;end if;
 select * into strict d from public.operational_documents where id=r.document_id;
 for x in select value from jsonb_array_elements(r.lines) loop
 select * into strict l from public.document_lines where id=(x->>'lineId')::uuid and document_id=d.id;
 q:=(x->>'quantity')::numeric;
 if q<=0 or l.accepted_quantity+q>l.purchased_quantity then raise exception 'invalid receipt quantity';end if;
 perform private.move_stock(d.care_recipient_id,l.product_id,q,null,'FAMILY','Recebimento COM validado','purchase_receipt',r.id);
 update public.document_lines set accepted_quantity=accepted_quantity+q,fully_checked=accepted_quantity+q=approved_quantity where id=l.id;
 end loop;
 update public.purchase_receipts set state='approved',validated_by=auth.uid(),validated_at=now() where id=r.id;
 update public.operational_documents set status=case when not exists(select 1 from public.document_lines where document_id=d.id and accepted_quantity<approved_quantity) then 'received' else 'partially_received' end where id=d.id;
end;$function$
