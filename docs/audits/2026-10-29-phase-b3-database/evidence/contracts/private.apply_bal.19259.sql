CREATE OR REPLACE FUNCTION private.apply_bal(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare d public.operational_documents;l public.document_lines;delta numeric;begin
 select * into strict d from public.operational_documents where id=p_id;
 if d.status='approved' then return;end if;
 if private.team_revision(d.care_recipient_id)<>(d.workflow_data->>'referenceRevision')::bigint then raise exception 'inventory conflict: reference changed; recount' using errcode='P0001';end if;
 for l in select * from public.document_lines where document_id=p_id order by product_id loop
 delta:=l.quantity-private.stock_quantity(d.care_recipient_id,l.product_id,'CARE_TEAM');
 if delta<>0 then perform private.move_stock(d.care_recipient_id,l.product_id,abs(delta),case when delta<0 then 'CARE_TEAM' end,case when delta>0 then 'CARE_TEAM' end,
 'Reconciliação BAL','bal',d.id);end if;
 update public.document_lines set fully_checked=true,accepted_quantity=quantity where id=l.id;
 end loop;
 update public.operational_documents set status='approved',workflow_data=workflow_data||jsonb_build_object('appliedAt',now()) where id=p_id;
end;$function$
