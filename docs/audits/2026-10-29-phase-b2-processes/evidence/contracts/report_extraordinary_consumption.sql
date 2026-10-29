CREATE OR REPLACE FUNCTION public.report_extraordinary_consumption(p_patient uuid, p_kind text, p_location text, p_text text, p_lines jsonb, p_key uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$declare v public.consumption_reports;x jsonb;canonical jsonb:='[]';c public.care_recipient_products;q numeric;begin
 perform private.require_cap(p_patient,'consumption.report');
 if p_kind not in ('consumption','shortage') or p_location not in ('FAMILY','CARE_TEAM') or length(trim(p_text)) not between 3 and 2000 or jsonb_typeof(p_lines)<>'array' or jsonb_array_length(p_lines)>100 or p_key is null then raise exception 'invalid consumption report';end if;
 if p_location='FAMILY' and public.recipient_role(p_patient) not in ('admin','family') then raise exception 'family scope required' using errcode='42501';end if;
 if jsonb_typeof(p_lines) is distinct from 'array' then raise exception 'invalid report lines';end if;
 if (select count(distinct z->>'productId') from jsonb_array_elements(p_lines) z)<>jsonb_array_length(p_lines) then raise exception 'duplicate report product';end if;
 for x in select value from jsonb_array_elements(p_lines) loop
 select * into c from public.care_recipient_products where care_recipient_id=p_patient and product_id=x->>'productId' and is_active;
 q:=(x->>'quantity')::numeric;
 if not found or q is null or q<=0 or q>1000000000 or q<>round(q,c.quantity_decimals) or x ? 'unit' and x->>'unit'<>c.unit then raise exception 'invalid structured consumption';end if;
 canonical:=canonical||jsonb_build_array(jsonb_build_object('productId',c.product_id,'quantity',q::text,'unit',c.unit));
 end loop;
 p_lines:=canonical;
 perform pg_advisory_xact_lock(hashtextextended('report:'||auth.uid()||p_key,0));
 select * into v from public.consumption_reports where reported_by=auth.uid() and idempotency_key=p_key;
 if found then if v.care_recipient_id<>p_patient or v.kind<>p_kind or v.location<>p_location or v.body<>p_text or v.lines<>p_lines then raise exception 'idempotency conflict' using errcode='23505';end if;return v.id;end if;
 insert into public.consumption_reports(care_recipient_id,reported_by,kind,location,body,lines,idempotency_key) values(p_patient,auth.uid(),p_kind,p_location,p_text,p_lines,p_key) returning * into v;
 return v.id;
end;$function$
