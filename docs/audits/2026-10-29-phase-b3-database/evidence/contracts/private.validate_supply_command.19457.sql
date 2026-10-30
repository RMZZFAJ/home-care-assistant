CREATE OR REPLACE FUNCTION private.validate_supply_command(d operational_documents, p_action text, p_body jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare a jsonb;x jsonb;l public.document_lines;q numeric;precision_limit integer;begin
 if p_action is null or jsonb_typeof(p_body) is distinct from 'object' then raise exception 'invalid command body';end if;
 if p_action in ('purchase','consent_cancel') or d.type='COM' and p_action in ('approve','receive') then
 a:=p_body->'lines';
 if jsonb_typeof(a) is distinct from 'array' or jsonb_array_length(a) not between 1 and 1000 then raise exception 'invalid command lines';end if;
 if (select count(distinct z->>'lineId') from jsonb_array_elements(a) z)<>jsonb_array_length(a) then raise exception 'duplicate command lines';end if;
 elsif d.type='ENT' and p_action='receive' then
 a:=p_body->'divergences';
 if jsonb_typeof(a) is distinct from 'array' or jsonb_array_length(a)>1000 then raise exception 'invalid divergences';end if;
 if (select count(distinct z->>'lineId') from jsonb_array_elements(a) z)<>jsonb_array_length(a) then raise exception 'duplicate divergent lines';end if;
 elsif p_action='resolve' then a:=jsonb_build_array(p_body);
 end if;
 for x in select value from jsonb_array_elements(coalesce(a,'[]')) loop
 if jsonb_typeof(x) is distinct from 'object' or x->>'lineId' is null then raise exception 'invalid line';end if;
 select * into l from public.document_lines where document_id=d.id and id=(x->>'lineId')::uuid;
 if not found then raise exception 'line does not belong to document';end if;
 select quantity_decimals into strict precision_limit from public.care_recipient_products where care_recipient_id=d.care_recipient_id and product_id=l.product_id;
 if p_action='consent_cancel' then
 if not (x ?& array['returnQuantity','consumedQuantity']) or x->>'returnQuantity' is null or x->>'consumedQuantity' is null then raise exception 'cancellation quantities required';end if;
 if exists(select 1 from jsonb_each_text(x) z where z.key in ('returnQuantity','consumedQuantity') and (z.value !~ '^[0-9]+([.][0-9]{1,6})?$' or z.value::numeric<>round(z.value::numeric,precision_limit))) then raise exception 'invalid cancellation quantity';end if;
 else
 q:=case when d.type='ENT' and p_action='receive' then (x->>'acceptedQuantity')::numeric else (x->>'quantity')::numeric end;
 if q is null or q<0 or q>1000000000 or q<>round(q,precision_limit) then raise exception 'invalid product quantity';end if;
 end if;
 end loop;
 if p_action='validate_receipt' or p_action='reject_receipt' then if p_body->>'receiptId' is null then raise exception 'receipt required';end if;end if;
 if p_action='approve' and d.type='BAL' and coalesce(p_body->>'group','') not in ('family','supervisor') then raise exception 'review group required';end if;
 if p_action='resolve' and coalesce(p_body->>'resolution','') not in ('received','missing','returned') then raise exception 'resolution required';end if;
end;$function$
